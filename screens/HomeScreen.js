import React, { useState, useCallback, useMemo } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet, Alert, Modal } from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import * as DocumentPicker from 'expo-document-picker';
import { uploadFile, listFiles, deleteFile, downloadFile, getPreSignedUrl, createFolder, moveFile } from '../utils/fileOperations';
import { ProgressBar } from '../components/ProgressBar';
import { FileActionMenu } from '../components/FileActionMenu';
import { FilePreview } from '../components/FilePreview';
import * as FileSystem from 'expo-file-system';
import { showNotification } from '../utils/notifications';
import { MaterialIcons } from '@expo/vector-icons';

const getDisplayFileName = (key) => {
  if (!key) return 'Unknown file';
  // Check if the key contains a UUID pattern (8-4-4-4-12 format)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;
  return key.replace(uuidPattern, '');
};

export default function HomeScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState([]);  // Will be populated from R2 storage
  const [uploadProgress, setUploadProgress] = useState(null);
  const [currentUpload, setCurrentUpload] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [folderStack, setFolderStack] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentUploadController, setCurrentUploadController] = useState(null);

  const currentPath = folderStack.length ? folderStack[folderStack.length - 1] : '';

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true // Enable multiple file selection
      });

      if (!result.canceled && result.assets) {
        // Filter out files larger than 100MB
        const validFiles = result.assets.filter(file => file.size <= 100 * 1024 * 1024);
        const tooLargeFiles = result.assets.length - validFiles.length;

        if (tooLargeFiles > 0) {
          alert(`${tooLargeFiles} file(s) exceeded the 100MB limit and will be skipped.`);
        }

        setUploadQueue(validFiles);
        if (!isUploading) {
          await processUploadQueue(validFiles);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error.message}`);
    }
  };

  const processUploadQueue = async (files) => {
    setIsUploading(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        setCurrentUpload(file.name);
        setUploadProgress(0);
        // Create AbortController so we can cancel this upload
        const controller = new AbortController();
        setCurrentUploadController(controller);

        await uploadFile(
          file.uri,
          file.name,
          (progress) => {
            setUploadProgress(progress);
          },
          controller  // Pass the controller to uploadFile
        );

        await showNotification(
          'Upload Success',
          `${file.name} uploaded successfully!`
        );
      } catch (error) {
        if (error.name === 'AbortError') {
          alert(`${file.name} upload cancelled`);
        } else {
          console.error(`Failed to upload ${file.name}:`, error);
          await showNotification(
            'Upload Failed',
            `Failed to upload ${file.name}`
          );
        }
      }
    }
    setIsUploading(false);
    setCurrentUpload(null);
    setUploadProgress(null);
    setUploadQueue([]);
    setCurrentUploadController(null);
    fetchFiles();
  };

  const cancelUpload = async () => {
    if (currentUploadController) {
      currentUploadController.abort();
      setIsUploading(false);
      setCurrentUpload(null);
      setUploadProgress(null);
      setUploadQueue([]);
      setCurrentUploadController(null);
      alert('Upload cancelled');
    }
  };

  const fetchFiles = async () => {
    try {
      const { files: filesList, folders: foldersList } = await listFiles(currentPath);
      
      const processedFiles = filesList.map(file => ({
        id: file.Key,
        name: getDisplayFileName(file.Key.replace(currentPath, '')),
        size: file.Size,
        lastModified: file.LastModified,
        isFolder: false
      }));

      const processedFolders = foldersList.map(folder => ({
        id: folder.Prefix || folder.Key,
        name: getDisplayFileName((folder.Prefix || folder.Key).replace(currentPath, '')),
        lastModified: folder.LastModified,
        isFolder: true
      }));

      setFolders(processedFolders);
      setFiles(processedFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      alert('Failed to fetch files');
    }
  };

  const handleLongPress = (file) => {
    setSelectedFile(file);
    setMenuVisible(true);
  };

  const handleDelete = async () => {
    try {
      await deleteFile(selectedFile.id);
      await fetchFiles();
      setMenuVisible(false);
      alert('File deleted successfully');
    } catch (error) {
      alert('Failed to delete file');
    }
  };

  const handleDownload = async () => {
    try {
      const localUri = await downloadFile(selectedFile.id, selectedFile.name);
      setMenuVisible(false);
      alert(`File downloaded to: ${localUri}`);
    } catch (error) {
      alert('Failed to download file');
    }
  };

  const handlePreview = async () => {
    try {
      const url = await getPreSignedUrl(selectedFile.id);
      setPreviewUrl(url);
      setPreviewVisible(true);
      setMenuVisible(false);
    } catch (error) {
      console.error('Preview error:', error);
      alert('Failed to load preview');
    }
  };

  const handleCreateFolder = () => {
    setFolderModalVisible(true);
  };

  const submitFolderCreation = async () => {
    if (!newFolderName.trim()) {
      alert('Please enter a folder name');
      return;
    }
    try {
      await createFolder(newFolderName.trim(), currentPath);
      await fetchFiles();
      await showNotification('Success', 'Folder created successfully');
      setFolderModalVisible(false);
      setNewFolderName('');
    } catch (error) {
      console.error('Create folder error:', error);
      alert('Failed to create folder');
    }
  };

  const handleMove = async () => {
    const targetFolder = await new Promise((resolve) => {
      Alert.alert(
        "Move File",
        "Select destination:",
        [
          { text: "Root", onPress: () => resolve('') },
          ...folders.map(folder => ({
            text: folder.name,
            onPress: () => resolve(folder.id)
          })),
          { text: "Cancel", style: "cancel" }
        ]
      );
    });

    if (targetFolder !== undefined) {
      try {
        await moveFile(selectedFile.id, targetFolder);
        await fetchFiles();
        setMenuVisible(false);
        await showNotification('Success', 'File moved successfully');
      } catch (error) {
        alert('Failed to move file');
      }
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFiles();
    setRefreshing(false);
  }, []);

  const enterFolder = (folderId) => {
    setFolderStack(prevStack => [...prevStack, folderId]);
    fetchFiles();
  };

  const goBackFolder = () => {
    setFolderStack(prevStack => prevStack.slice(0, -1));
    fetchFiles();
  };

  React.useEffect(() => {
    fetchFiles();
  }, [folderStack]);

  // Add filtered data using useMemo
  const filteredData = useMemo(() => {
    const searchTerm = searchQuery.toLowerCase().trim();
    if (!searchTerm) return [...folders, ...files];

    const matchingFolders = folders.filter(folder => 
      folder.name.toLowerCase().includes(searchTerm)
    );

    const matchingFiles = files.filter(file => 
      file.name.toLowerCase().includes(searchTerm)
    );

    return [...matchingFolders, ...matchingFiles];
  }, [folders, files, searchQuery]);

  // Update the searchbar section in the header
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {folderStack.length > 0 && (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={goBackFolder}
          >
            <MaterialIcons name="arrow-back" size={24} color={COLORS.surface} />
          </TouchableOpacity>
        )}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons 
              name="search" 
              size={20} 
              color={COLORS.textSecondary} 
              style={styles.searchIcon} 
            />
            <TextInput
              style={styles.searchBar}
              placeholder="Search files..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons 
                  name="close" 
                  size={20} 
                  color={COLORS.textSecondary} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.headerButton, uploadProgress !== null && styles.uploadButtonDisabled]} 
          onPress={handleUpload}
          disabled={uploadProgress !== null}
        >
          <MaterialIcons name="file-upload" size={24} color={COLORS.surface} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={handleCreateFolder}
        >
          <MaterialIcons name="create-new-folder" size={24} color={COLORS.surface} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={() => navigation.navigate('Settings')}
        >
          <MaterialIcons name="settings" size={24} color={COLORS.surface} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredData}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.fileItem}
            onPress={() => {
              if (item.isFolder) {
                enterFolder(item.id);
              }
            }}
            onLongPress={() => handleLongPress(item)}
            delayLongPress={500}
          >
            <View style={styles.fileDetails}>
              <View style={styles.fileNameContainer}>
                <MaterialIcons 
                  name={item.isFolder ? "folder" : "insert-drive-file"} 
                  size={24} 
                  color={item.isFolder ? COLORS.primary : COLORS.textSecondary} 
                  style={styles.fileIcon}
                />
                <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                  {item.name}
                </Text>
              </View>
              <Text style={styles.fileInfo}>
                {!item.isFolder && `Size: ${(item.size / 1024).toFixed(2)} KB • `}
                {new Date(item.lastModified).toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        onRefresh={onRefresh} // <-- Added pull-to-refresh callback
        refreshing={refreshing} // <-- Added refreshing state
      />
      
      <FileActionMenu
        isVisible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onDelete={handleDelete}
        onDownload={handleDownload}
        onPreview={handlePreview}
        onMove={handleMove}
        fileName={selectedFile?.name}
      />
      
      <FilePreview
        isVisible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        fileUrl={previewUrl}
        fileName={selectedFile?.name || ''}
      />
      
      {uploadProgress !== null && currentUpload && (
        <>
          <ProgressBar 
            progress={uploadProgress} 
            fileName={`${currentUpload} (${uploadQueue.indexOf(currentUpload) + 1}/${uploadQueue.length})`}
          />
          <TouchableOpacity style={styles.cancelButton} onPress={cancelUpload}>
            <Text style={styles.cancelButtonText}>Cancel Upload</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Folder Creation Modal */}
      <Modal
        visible={folderModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFolderModalVisible(false)}
      >
        <View style={folderStyles.modalOverlay}>
          <View style={folderStyles.modalContainer}>
            <Text style={folderStyles.modalTitle}>Create New Folder</Text>
            <TextInput
              style={folderStyles.modalInput}
              placeholder="Folder name"
              placeholderTextColor={COLORS.textSecondary}
              value={newFolderName}
              onChangeText={setNewFolderName}
            />
            <View style={folderStyles.modalButtons}>
              <TouchableOpacity onPress={() => setFolderModalVisible(false)} style={folderStyles.modalButton}>
                <Text style={folderStyles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitFolderCreation} style={folderStyles.modalButton}>
                <Text style={folderStyles.modalButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const folderStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    ...SHADOWS.medium,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalInput: {
    height: 44,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
    color: COLORS.text,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  modalButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.small,
  },
  searchContainer: {
    flex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: COLORS.text,
  },
  listContent: {
    padding: 16,
  },
  fileItem: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  fileDetails: {
    flex: 1,
  },
  fileNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fileIcon: {
    marginRight: 8,
  },
  fileName: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  fileInfo: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  headerButton: {
    height: 44,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  buttonText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    elevation: 0,
  },
  cancelButton: {
    backgroundColor: COLORS.error,
    padding: 12,
    borderRadius: 8,
    alignSelf: 'center',
    marginVertical: 12,
    ...SHADOWS.small,
  },
  cancelButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
