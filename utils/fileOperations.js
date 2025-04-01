import 'react-native-get-random-values';
import { PutObjectCommand, ListObjectsCommand, DeleteObjectCommand, GetObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { r2Client } from './r2Client';
import { R2_CONFIG } from '../config/r2Config';
import { v4 as uuidv4 } from 'uuid';
import * as FileSystem from 'expo-file-system';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const uploadFile = async (fileUri, fileName, onProgress, controller) => {
  try {
    const key = `${uuidv4()}-${fileName}`;
    const mimeType = fileName.endsWith('.pdf')
      ? 'application/pdf'
      : fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')
      ? 'image/jpeg'
      : fileName.endsWith('.png')
      ? 'image/png'
      : 'application/octet-stream';

    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucket,
      Key: key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

    const options = {
      httpMethod: "PUT",
      headers: {
        "Content-Type": mimeType,
      },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      onUploadProgress: (data) => {
        const progress = (data.totalBytesSent / data.totalBytesExpectedToSend) * 100;
        onProgress(progress);
      },
      signal: controller.signal, // Use the AbortController signal
    };

    const response = await FileSystem.uploadAsync(uploadUrl, fileUri, options);
    if (response.status !== 200) {
      throw new Error(`Upload failed, status: ${response.status}`);
    }
    onProgress(100);
    return key;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

export const listFiles = async (prefix = '') => {
  try {
    const command = new ListObjectsCommand({
      Bucket: R2_CONFIG.bucket,
      Prefix: prefix,
      Delimiter: '/',
    });

    const response = await r2Client.send(command);
    const contents = response.Contents || [];
    const commonPrefixes = response.CommonPrefixes || [];

    const folders = await Promise.all(
      commonPrefixes.map(async (item) => {
        const folderPrefix = item.Prefix;
        const { files: folderFiles } = await listFiles(folderPrefix); // Recursively list files in the folder
        const totalSize = folderFiles.reduce((sum, file) => sum + (file.Size || 0), 0);
        return {
          id: folderPrefix,
          name: folderPrefix.split('/').slice(-2, -1)[0], // Extract folder name
          fileCount: folderFiles.length,
          totalSize,
          lastModified: folderFiles.length > 0 ? folderFiles[0].LastModified : null, // Use the first file's LastModified as a proxy
        };
      })
    );

    return {
      files: contents
        .filter(item => item.Key && !item.Key.endsWith('/')) // Ensure valid keys and exclude folders
        .map(item => ({ Key: item.Key, Size: item.Size, LastModified: item.LastModified })),
      folders,
    };
  } catch (error) {
    console.error('List files error:', error);
    throw error;
  }
};

export const deleteFile = async (key) => {
  try {
    if (!key) {
      throw new Error('Key is undefined or empty');
    }

    // Check if the key represents a folder (ends with '/')
    if (key.endsWith('/')) {
      // List all objects within the folder
      const { files, folders } = await listFiles(key);

      // Recursively delete all files and subfolders
      for (const file of files) {
        await deleteFile(file.Key);
      }
      for (const folder of folders) {
        await deleteFile(folder.id);
      }
    }

    // Delete the folder or file itself
    const command = new DeleteObjectCommand({
      Bucket: R2_CONFIG.bucket,
      Key: key,
    });

    await r2Client.send(command);
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
};

export const downloadFile = async (key, fileName) => {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_CONFIG.bucket,
      Key: key,
    });
    
    const response = await r2Client.send(command);
    const blob = await response.Body.blob();
    
    const localUri = FileSystem.documentDirectory + fileName;
    const base64 = await blob.text();
    await FileSystem.writeAsStringAsync(localUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    return localUri;
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

export const getPreSignedUrl = async (key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_CONFIG.bucket,
      Key: key,
    });
    
    // Generate URL that expires in 1 hour
    const preSignedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600,
    });
    
    return preSignedUrl;
  } catch (error) {
    console.error('Failed to generate preview URL:', error);
    throw error;
  }
};

export const createFolder = async (folderName, currentPath = '') => {
  try {
    if (!folderName.trim()) {
      throw new Error('Folder name cannot be empty');
    }

    const key = currentPath ? `${currentPath}${folderName}/` : `${folderName}/`;
    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucket,
      Key: key,
      Body: '', // Empty body to create a folder
    });
    await r2Client.send(command);
    return key;
  } catch (error) {
    console.error('Create folder error:', error);
    throw error;
  }
};

export const moveFile = async (sourceKey, targetFolder) => {
  try {
    const fileName = sourceKey.split('-').slice(1).join('-');
    const newKey = `${targetFolder}${fileName}`;
    
    // Copy to new location
    const copyCommand = new CopyObjectCommand({
      Bucket: R2_CONFIG.bucket,
      CopySource: `${R2_CONFIG.bucket}/${sourceKey}`,
      Key: newKey,
    });
    await r2Client.send(copyCommand);

    // Delete from old location
    await deleteFile(sourceKey);
    return newKey;
  } catch (error) {
    console.error('Move file error:', error);
    throw error;
  }
};

export const renameFileOrFolder = async (oldKey, newKey) => {
  try {
    if (oldKey.endsWith('/')) {
      // If it's a folder, recursively rename all files and subfolders
      const { files, folders } = await listFiles(oldKey);

      // Rename all files in the folder
      for (const file of files) {
        const newFileKey = file.Key.replace(oldKey, newKey);
        await renameFileOrFolder(file.Key, newFileKey);
      }

      // Rename all subfolders
      for (const folder of folders) {
        const newFolderKey = folder.id.replace(oldKey, newKey);
        await renameFileOrFolder(folder.id, newFolderKey);
      }
    }

    // Rename the folder or file itself
    const copyCommand = new CopyObjectCommand({
      Bucket: R2_CONFIG.bucket,
      CopySource: `${R2_CONFIG.bucket}/${oldKey}`,
      Key: newKey,
    });
    await r2Client.send(copyCommand);

    // Delete the old key
    await deleteFile(oldKey);
  } catch (error) {
    console.error('Rename error:', error);
    throw error;
  }
};

/**
 * Processes content received from other apps via sharing
 * @param {string} uri The shared content URI
 * @returns {Promise<Object>} File information
 */
export const processSharedContent = async (uri) => {
  try {
    if (!uri) {
      throw new Error('No content URI provided');
    }

    // Get file information from the URI
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    // Try to extract a file name from the URI
    const uriParts = uri.split('/');
    const fileName = uriParts[uriParts.length - 1];
    
    // Get the file size
    const { size } = fileInfo;
    
    return {
      uri,
      name: fileName,
      size,
      type: getMimeTypeFromUri(uri),
    };
  } catch (error) {
    console.error('Error processing shared content:', error);
    throw error;
  }
};

/**
 * Get MIME type from URI or file extension
 * @param {string} uri The file URI
 * @returns {string} The MIME type
 */
export const getMimeTypeFromUri = (uri) => {
  if (!uri) return 'application/octet-stream';
  
  const extension = uri.split('.').pop().toLowerCase();
  
  const mimeTypes = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    
    // Videos
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    webm: 'video/webm',
    
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Text
    txt: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    json: 'application/json',
    xml: 'application/xml',
    
    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
};
