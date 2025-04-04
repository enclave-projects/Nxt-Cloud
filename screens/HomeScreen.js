import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet, Alert, Modal } from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import * as DocumentPicker from 'expo-document-picker';
import { uploadFile, listFiles, deleteFile, downloadFile, getPreSignedUrl, createFolder, moveFile, renameFileOrFolder } from '../utils/fileOperations';
import { ProgressBar } from '../components/ProgressBar';
import { FileActionMenu } from '../components/FileActionMenu';
import { FilePreview } from '../components/FilePreview';
import * as FileSystem from 'expo-file-system';
import { showNotification } from '../utils/notifications';
import { MaterialIcons } from '@expo/vector-icons';

const getDisplayFileName = (key) => {
  if (!key) return 'Unknown file';
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;
  return key.replace(uuidPattern, '');
};

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function HomeScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState([]);
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
  const [isLoading, setIsLoading] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortOption, setSortOption] = useState('nameAsc');

  const currentPath = folderStack.length ? folderStack[folderStack.length - 1] : '';

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true
      });

      if (!result.canceled && result.assets) {
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
        const controller = new AbortController();
        setCurrentUploadController(controller);

        await uploadFile(
          file.uri,
          file.name,
          (progress) => {
            setUploadProgress(progress);
          },
          controller
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
    fetchFiles(currentPath);
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

  const fetchFiles = useCallback(async (path) => {
    setIsLoading(true);
    try {
      const { files: filesList, folders: foldersList } = await listFiles(path);

      const processedFiles = filesList
        .filter(file => file.Key)
        .map(file => ({
          id: file.Key,
          name: getDisplayFileName(file.Key.replace(path, '')),
          size: file.Size,
          lastModified: file.LastModified,
          isFolder: false,
        }));

      const processedFolders = foldersList
        .filter(folder => folder.id)
        .map(folder => ({
          id: folder.id,
          name: getDisplayFileName(folder.id.replace(path, '')),
          fileCount: folder.fileCount,
          totalSize: folder.totalSize,
          lastModified: folder.lastModified,
          isFolder: true,
        }));

      setFolders(processedFolders);
      setFiles(processedFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      alert('Failed to fetch files');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLongPress = (file) => {
    setSelectedFile(file);
    setMenuVisible(true);
  };

  const handleDelete = async () => {
    try {
      await deleteFile(selectedFile.id);
      await fetchFiles(currentPath);
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
      await fetchFiles(currentPath);
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
        await fetchFiles(currentPath);
        setMenuVisible(false);
        await showNotification('Success', 'File moved successfully');
      } catch (error) {
        alert('Failed to move file');
      }
    }
  };

  const handleRename = async () => {
    if (!renameInput.trim()) {
      alert('Please enter a valid name');
      return;
    }

    try {
      const newKey = `${currentPath}${renameInput}${selectedFile.isFolder ? '/' : ''}`;
      await renameFileOrFolder(selectedFile.id, newKey);
      await fetchFiles(currentPath);
      setRenameModalVisible(false);
      setSelectedFile(null);
      alert('Renamed successfully');
    } catch (error) {
      console.error('Rename error:', error);
      alert('Failed to rename');
    }
  };

  const handleSort = (option) => {
    setSortOption(option);
    setSortModalVisible(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFiles(currentPath);
    setRefreshing(false);
  }, [currentPath, fetchFiles]);

  const enterFolder = (folderId) => {
    setFolderStack(prevStack => [...prevStack, folderId]);
  };

  const goBackFolder = () => {
    setFolderStack(prevStack => prevStack.slice(0, -1));
  };

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath, fetchFiles]);

  const filteredData = useMemo(() => {
    const searchTerm = searchQuery.toLowerCase().trim();
    let filteredItems = [];

    if (!searchTerm) {
      filteredItems = [...folders, ...files];
    } else {
      const matchingFolders = folders.filter(folder => 
        folder.name.toLowerCase().includes(searchTerm)
      );
      const matchingFiles = files.filter(file => 
        file.name.toLowerCase().includes(searchTerm)
      );
      filteredItems = [...matchingFolders, ...matchingFiles];
    }

    return filteredItems.sort((a, b) => {
      switch (sortOption) {
        case 'nameAsc':
          return a.name.localeCompare(b.name);
        case 'nameDesc':
          return b.name.localeCompare(a.name);
        case 'dateNewest':
          return new Date(b.lastModified || 0) - new Date(a.lastModified || 0);
        case 'dateOldest':
          return new Date(a.lastModified || 0) - new Date(b.lastModified || 0);
        case 'sizeSmallest':
          const aSize = a.isFolder ? (a.totalSize || 0) : (a.size || 0);
          const bSize = b.isFolder ? (b.totalSize || 0) : (b.size || 0);
          return aSize - bSize;
        case 'sizeLargest':
          const aSizeDesc = a.isFolder ? (a.totalSize || 0) : (a.size || 0);
          const bSizeDesc = b.isFolder ? (b.totalSize || 0) : (b.size || 0);
          return bSizeDesc - aSizeDesc;
        case 'typeFolderFirst':
          return (b.isFolder ? 1 : 0) - (a.isFolder ? 1 : 0);
        case 'typeFileFirst':
          return (a.isFolder ? 1 : 0) - (b.isFolder ? 1 : 0);
        default:
          return 0;
      }
    });
  }, [folders, files, searchQuery, sortOption]);

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
      </View>

      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, uploadProgress !== null && styles.uploadButtonDisabled]} 
          onPress={handleUpload}
          disabled={uploadProgress !== null}
        >
          <MaterialIcons name="file-upload" size={24} color={COLORS.surface} />
          <Text style={styles.actionButtonText}>Upload</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleCreateFolder}
        >
          <MaterialIcons name="create-new-folder" size={24} color={COLORS.surface} />
          <Text style={styles.actionButtonText}>New Folder</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => setSortModalVisible(true)}
        >
          <MaterialIcons name="sort" size={24} color={COLORS.surface} />
          <Text style={styles.actionButtonText}>Sort</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => navigation.navigate('Settings')}
        >
          <MaterialIcons name="settings" size={24} color={COLORS.surface} />
          <Text style={styles.actionButtonText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
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
                {item.isFolder ? (
                  <Text style={styles.fileInfo}>
                    {item.fileCount} files • {formatBytes(item.totalSize)} •{' '}
                    {item.lastModified ? new Date(item.lastModified).toLocaleDateString() : 'Unknown Date'}
                  </Text>
                ) : (
                  <Text style={styles.fileInfo}>
                    Size: {formatBytes(item.size)} • {new Date(item.lastModified).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      )}
      
      <FileActionMenu
        isVisible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onDelete={handleDelete}
        onDownload={handleDownload}
        onPreview={handlePreview}
        onMove={handleMove}
        onRename={() => {
          setRenameInput(selectedFile.name);
          setRenameModalVisible(true);
          setMenuVisible(false);
        }}
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

      <Modal
        visible={renameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={folderStyles.modalOverlay}>
          <View style={folderStyles.modalContainer}>
            <Text style={folderStyles.modalTitle}>Rename</Text>
            <TextInput
              style={folderStyles.modalInput}
              placeholder="Enter new name"
              placeholderTextColor={COLORS.textSecondary}
              value={renameInput}
              onChangeText={setRenameInput}
            />
            <View style={folderStyles.modalButtons}>
              <TouchableOpacity onPress={() => setRenameModalVisible(false)} style={folderStyles.modalButton}>
                <Text style={folderStyles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRename} style={folderStyles.modalButton}>
                <Text style={folderStyles.modalButtonText}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={sortModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <View style={folderStyles.modalOverlay}>
          <View style={[folderStyles.modalContainer, styles.sortModalContainer]}>
            <Text style={folderStyles.modalTitle}>Sort Files</Text>
            
            <TouchableOpacity 
              style={[styles.sortOption, sortOption === 'nameAsc' && styles.selectedSortOption]} 
              onPress={() => handleSort('nameAsc')}
            >
              <MaterialIcons 
                name="sort-by-alpha" 
                size={20} 
                color={sortOption === 'nameAsc' ? COLORS.primary : COLORS.text} 
              />
              <Text style={[styles.sortOptionText, sortOption === 'nameAsc' && styles.selectedSortOptionText]}>
                Name (A to Z)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sortOption, sortOption === 'nameDesc' && styles.selectedSortOption]} 
              onPress={() => handleSort('nameDesc')}
            >
              <MaterialIcons 
                name="sort-by-alpha" 
                size={20} 
                color={sortOption === 'nameDesc' ? COLORS.primary : COLORS.text} 
                style={{transform: [{rotateX: '180deg'}]}}
              />
              <Text style={[styles.sortOptionText, sortOption === 'nameDesc' && styles.selectedSortOptionText]}>
                Name (Z to A)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sortOption, sortOption === 'dateNewest' && styles.selectedSortOption]} 
              onPress={() => handleSort('dateNewest')}
            >
              <MaterialIcons 
                name="access-time" 
                size={20} 
                color={sortOption === 'dateNewest' ? COLORS.primary : COLORS.text} 
              />
              <Text style={[styles.sortOptionText, sortOption === 'dateNewest' && styles.selectedSortOptionText]}>
                Date (Newest first)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sortOption, sortOption === 'dateOldest' && styles.selectedSortOption]} 
              onPress={() => handleSort('dateOldest')}
            >
              <MaterialIcons 
                name="access-time" 
                size={20} 
                color={sortOption === 'dateOldest' ? COLORS.primary : COLORS.text} 
              />
              <Text style={[styles.sortOptionText, sortOption === 'dateOldest' && styles.selectedSortOptionText]}>
                Date (Oldest first)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sortOption, sortOption === 'sizeLargest' && styles.selectedSortOption]} 
              onPress={() => handleSort('sizeLargest')}
            >
              <MaterialIcons 
                name="format-size" 
                size={20} 
                color={sortOption === 'sizeLargest' ? COLORS.primary : COLORS.text} 
              />
              <Text style={[styles.sortOptionText, sortOption === 'sizeLargest' && styles.selectedSortOptionText]}>
                Size (Largest first)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sortOption, sortOption === 'sizeSmallest' && styles.selectedSortOption]} 
              onPress={() => handleSort('sizeSmallest')}
            >
              <MaterialIcons 
                name="format-size" 
                size={20} 
                color={sortOption === 'sizeSmallest' ? COLORS.primary : COLORS.text} 
                style={{transform: [{scale: 0.8}]}}
              />
              <Text style={[styles.sortOptionText, sortOption === 'sizeSmallest' && styles.selectedSortOptionText]}>
                Size (Smallest first)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sortOption, sortOption === 'typeFolderFirst' && styles.selectedSortOption]} 
              onPress={() => handleSort('typeFolderFirst')}
            >
              <MaterialIcons 
                name="folder" 
                size={20} 
                color={sortOption === 'typeFolderFirst' ? COLORS.primary : COLORS.text}
              />
              <Text style={[styles.sortOptionText, sortOption === 'typeFolderFirst' && styles.selectedSortOptionText]}>
                Type (Folders first)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sortOption, sortOption === 'typeFileFirst' && styles.selectedSortOption]} 
              onPress={() => handleSort('typeFileFirst')}
            >
              <MaterialIcons 
                name="insert-drive-file" 
                size={20} 
                color={sortOption === 'typeFileFirst' ? COLORS.primary : COLORS.text}
              />
              <Text style={[styles.sortOptionText, sortOption === 'typeFileFirst' && styles.selectedSortOptionText]}>
                Type (Files first)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.closeSortButton} 
              onPress={() => setSortModalVisible(false)}
            >
              <Text style={styles.closeSortButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.cameraButton}
        onPress={() => navigation.navigate('Camera', { currentPath })}
      >
        <MaterialIcons name="camera-alt" size={24} color="white" />
      </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingBottom: 8,
    paddingTop: 6,
    justifyContent: 'space-evenly',
    ...SHADOWS.small,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    height: 44,
    width: '22%',
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  actionButtonText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  sortModalContainer: {
    maxHeight: '80%',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginVertical: 2,
  },
  selectedSortOption: {
    backgroundColor: `${COLORS.primary}20`,
  },
  sortOptionText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 12,
  },
  selectedSortOptionText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  closeSortButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  closeSortButtonText: {
    color: COLORS.surface,
    fontWeight: '600',
    fontSize: 14,
  },
});
