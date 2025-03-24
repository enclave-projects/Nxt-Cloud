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
    
    return {
      files: contents.filter(item => !item.Key.endsWith('/')),
      folders: [...commonPrefixes, ...contents.filter(item => item.Key.endsWith('/'))]
    };
  } catch (error) {
    console.error('List files error:', error);
    throw error;
  }
};

export const deleteFile = async (key) => {
  try {
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
    const key = currentPath ? `${currentPath}${folderName}/` : `${uuidv4()}-${folderName}/`;
    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucket,
      Key: key,
      Body: '',
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
