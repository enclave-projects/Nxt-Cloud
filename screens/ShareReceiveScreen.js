import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  Image, 
  FlatList,
  ActivityIndicator
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';
import { uploadFile, listFiles } from '../utils/fileOperations';
import { ProgressBar } from '../components/ProgressBar';
import { showNotification } from '../utils/notifications';

export default function ShareReceiveScreen({ navigation, route }) {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [folderStack, setFolderStack] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUpload, setCurrentUpload] = useState(null);
  const [uploadController, setUploadController] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sharedFiles, setSharedFiles] = useState([]);

  const getDisplayFileName = (key) => {
    if (!key) return 'Unknown file';
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;
    return key.replace(uuidPattern, '');
  };

  useEffect(() => {
    fetchFolders();
    processSharedContent();
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [currentPath]);

  const processSharedContent = async () => {
    try {
      if (route.params?.sharedFiles) {
        setSharedFiles(route.params.sharedFiles);
      }
    } catch (error) {
      console.error('Error processing shared content:', error);
      Alert.alert('Error', 'Could not process shared content');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFolders = async () => {
    setIsLoading(true);
    try {
      const { folders: foldersList } = await listFiles(currentPath);

      const processedFolders = foldersList
        .filter(folder => folder.id)
        .map(folder => ({
          id: folder.id,
          name: getDisplayFileName(folder.id.replace(currentPath, '')),
          fileCount: folder.fileCount,
          totalSize: folder.totalSize,
          lastModified: folder.lastModified,
          isFolder: true,
        }));

      setFolders(processedFolders);
    } catch (error) {
      console.error('Error fetching folders:', error);
      Alert.alert('Error', 'Failed to fetch folders');
    } finally {
      setIsLoading(false);
    }
  };

  const enterFolder = (folderId) => {
    setFolderStack(prevStack => [...prevStack, folderId]);
    setCurrentPath(folderId);
  };

  const goBackFolder = () => {
    if (folderStack.length > 0) {
      const newStack = folderStack.slice(0, -1);
      setFolderStack(newStack);
      setCurrentPath(newStack.length > 0 ? newStack[newStack.length - 1] : '');
    }
  };

  const uploadSharedFiles = async () => {
    if (sharedFiles.length === 0) {
      Alert.alert('No files', 'There are no files to upload');
      return;
    }

    setIsUploading(true);

    for (let i = 0; i < sharedFiles.length; i++) {
      const fileUri = sharedFiles[i].uri;
      try {
        setCurrentUpload(sharedFiles[i].name || `File ${i+1}`);
        setUploadProgress(0);

        // Create a new AbortController
        const controller = new AbortController();
        setUploadController(controller);

        // Get file info
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists) {
          throw new Error('File does not exist');
        }

        // Upload the file
        await uploadFile(
          fileUri,
          currentPath + (sharedFiles[i].name || `File_${new Date().getTime()}`),
          (progress) => setUploadProgress(progress),
          controller
        );

        await showNotification(
          'Upload Success',
          `${sharedFiles[i].name || 'File'} uploaded successfully!`
        );
      } catch (error) {
        if (error.name === 'AbortError') {
          Alert.alert('Upload Cancelled', 'The upload was cancelled');
        } else {
          console.error('Upload error:', error);
          Alert.alert('Upload Failed', error.message);
        }
        break;
      }
    }

    setIsUploading(false);
    setCurrentUpload(null);
    setUploadProgress(0);
    setUploadController(null);
    
    // Navigate to home screen after uploads complete
    Alert.alert(
      'Upload Complete',
      'All files have been uploaded successfully',
      [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
    );
  };

  const cancelUpload = () => {
    if (uploadController) {
      uploadController.abort();
      setIsUploading(false);
      setCurrentUpload(null);
      setUploadProgress(0);
      setUploadController(null);
    }
  };

  const renderFilePreview = (file) => {
    if (file.mimeType?.startsWith('image/') && file.uri) {
      return <Image source={{ uri: file.uri }} style={styles.filePreviewImage} />;
    }
    
    return (
      <View style={styles.filePreviewPlaceholder}>
        <MaterialIcons 
          name={
            file.mimeType?.startsWith('video/') 
              ? 'videocam' 
              : 'insert-drive-file'
          } 
          size={36} 
          color={COLORS.primary} 
        />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Processing shared content...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select destination folder</Text>
      </View>

      <View style={styles.filesContainer}>
        <Text style={styles.sectionTitle}>Files to upload:</Text>
        <FlatList
          data={sharedFiles}
          keyExtractor={(item, index) => `shared-${index}`}
          renderItem={({ item }) => (
            <View style={styles.sharedFileItem}>
              {renderFilePreview(item)}
              <View style={styles.fileDetails}>
                <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                  {item.name || 'Unknown file'}
                </Text>
                <Text style={styles.fileInfo}>
                  {item.mimeType || 'Unknown type'}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <MaterialIcons name="info" size={24} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No files were shared</Text>
            </View>
          }
        />
      </View>

      <View style={styles.folderContainer}>
        <View style={styles.pathHeader}>
          <Text style={styles.sectionTitle}>Current path:</Text>
          <TouchableOpacity 
            style={styles.pathButton}
            onPress={goBackFolder}
            disabled={folderStack.length === 0}
          >
            <Text style={[
              styles.pathButtonText, 
              folderStack.length === 0 && styles.disabledText
            ]}>
              Go back
            </Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.currentPath}>
          {currentPath || 'Root'}
        </Text>

        <FlatList
          data={folders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.folderItem}
              onPress={() => enterFolder(item.id)}
            >
              <MaterialIcons name="folder" size={24} color={COLORS.primary} style={styles.folderIcon} />
              <View style={styles.folderDetails}>
                <Text style={styles.folderName}>{item.name}</Text>
                <Text style={styles.folderInfo}>
                  {item.fileCount} files
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <MaterialIcons name="folder" size={24} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No folders found</Text>
            </View>
          }
        />
      </View>

      {isUploading && currentUpload && (
        <View style={styles.uploadProgressContainer}>
          <ProgressBar progress={uploadProgress} fileName={currentUpload} />
          <TouchableOpacity style={styles.cancelButton} onPress={cancelUpload}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.primaryButton,
            (sharedFiles.length === 0 || isUploading) && styles.disabledButton
          ]} 
          onPress={uploadSharedFiles}
          disabled={sharedFiles.length === 0 || isUploading}
        >
          <Text style={styles.primaryButtonText}>
            {isUploading ? 'Uploading...' : 'Upload to this folder'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    padding: 16,
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  filesContainer: {
    padding: 16,
    maxHeight: '30%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  sharedFileItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  filePreviewImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
  },
  filePreviewPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  fileInfo: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  folderContainer: {
    flex: 1,
    padding: 16,
    paddingTop: 8,
  },
  pathHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pathButton: {
    padding: 8,
  },
  pathButtonText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  currentPath: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  folderItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  folderIcon: {
    marginRight: 12,
  },
  folderDetails: {
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  folderInfo: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyList: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 8,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
  },
  primaryButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  primaryButtonText: {
    color: COLORS.surface,
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: COLORS.textSecondary,
  },
  disabledText: {
    color: COLORS.textSecondary,
  },
  uploadProgressContainer: {
    padding: 16,
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
  },
  cancelButton: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.surface,
    fontWeight: '500',
  },
});
