import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Image,
  Dimensions
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Video } from 'expo-av';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';

export const FilePreview = ({ isVisible, onClose, fileUrl, fileName }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoStatus, setVideoStatus] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Reset state when modal is opened
  useEffect(() => {
    if (isVisible) {
      setIsLoading(true);
      setError(null);
    }
  }, [isVisible]);

  // Determine file type based on file name extension
  const getFileType = () => {
    if (!fileName) return 'unknown';
    const extension = fileName.split('.').pop().toLowerCase();
    
    // Image types
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) {
      return 'image';
    }
    
    // Video types
    if (['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'].includes(extension)) {
      return 'video';
    }
    
    // PDF
    if (extension === 'pdf') {
      return 'pdf';
    }
    
    // Text/code files
    if (['txt', 'md', 'js', 'html', 'css', 'json', 'xml', 'csv'].includes(extension)) {
      return 'text';
    }
    
    // Other document types
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
      return 'document';
    }
    
    return 'unknown';
  };

  const fileType = getFileType();

  const renderPreviewContent = () => {
    if (isLoading && fileType !== 'video') {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading preview...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>Failed to load preview</Text>
          <Text style={styles.errorSubText}>{error}</Text>
        </View>
      );
    }

    switch (fileType) {
      case 'image':
        return (
          <Image
            source={{ uri: fileUrl }}
            style={styles.imagePreview}
            resizeMode="contain"
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setError('Could not load image');
              setIsLoading(false);
            }}
          />
        );

      case 'video':
        return (
          <View style={[styles.videoContainer, isFullscreen && styles.fullscreenVideo]}>
            <Video
              source={{ uri: fileUrl }}
              rate={1.0}
              volume={1.0}
              isMuted={false}
              resizeMode={isFullscreen ? "cover" : "contain"}
              shouldPlay={true}
              isLooping={false}
              style={isFullscreen ? styles.fullscreenVideoPlayer : styles.videoPlayer}
              onPlaybackStatusUpdate={status => setVideoStatus(status)}
              onLoadStart={() => setIsLoading(true)}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setError('Could not load video');
                setIsLoading(false);
              }}
              useNativeControls
            />
            {isLoading && (
              <View style={styles.videoLoadingOverlay}>
                <ActivityIndicator size="large" color="white" />
              </View>
            )}
            <TouchableOpacity 
              style={styles.fullscreenButton}
              onPress={() => setIsFullscreen(!isFullscreen)}
            >
              <MaterialIcons 
                name={isFullscreen ? "fullscreen-exit" : "fullscreen"} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>
          </View>
        );

      case 'pdf':
        return (
          <WebView
            source={{ uri: fileUrl }}
            style={styles.webView}
            onLoadStart={() => setIsLoading(true)}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setError('Could not load PDF document');
              setIsLoading(false);
            }}
          />
        );

      case 'text':
        return (
          <WebView
            source={{ uri: fileUrl }}
            style={styles.webView}
            onLoadStart={() => setIsLoading(true)}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setError('Could not load text file');
              setIsLoading(false);
            }}
          />
        );

      case 'document':
        return (
          <View style={styles.unsupportedContainer}>
            <MaterialIcons name="description" size={64} color={COLORS.primary} />
            <Text style={styles.unsupportedText}>
              Document preview not available
            </Text>
            <Text style={styles.unsupportedSubText}>
              Please download the file to view it
            </Text>
          </View>
        );

      default:
        return (
          <View style={styles.unsupportedContainer}>
            <MaterialIcons name="insert-drive-file" size={64} color={COLORS.primary} />
            <Text style={styles.unsupportedText}>
              Preview not available for this file type
            </Text>
          </View>
        );
    }
  };

  const handleClose = () => {
    setIsFullscreen(false);
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <BlurView intensity={80} style={StyleSheet.absoluteFill} />
        
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle} numberOfLines={1} ellipsizeMode="middle">
              {fileName}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.previewContent}>
            {renderPreviewContent()}
          </View>
          
          {!isFullscreen && (
            <View style={styles.previewFooter}>
              <Text style={styles.footerText}>
                {fileType === 'video' && videoStatus.isLoaded && !isLoading ? 
                  `Duration: ${Math.floor(videoStatus.durationMillis / 60000)}:${(Math.floor(videoStatus.durationMillis / 1000) % 60).toString().padStart(2, '0')}` : 
                  `File type: ${fileType.toUpperCase()}`
                }
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  previewContainer: {
    width: '90%',
    height: '80%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  previewTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  previewContent: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  previewFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  imagePreview: {
    flex: 1,
    backgroundColor: '#000',
  },
  webView: {
    flex: 1,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  fullscreenVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: 'black',
    width: width,
    height: height,
  },
  fullscreenVideoPlayer: {
    width: width,
    height: height,
  },
  videoLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  fullscreenButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
    marginTop: 16,
  },
  errorSubText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  unsupportedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unsupportedText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    textAlign: 'center',
  },
  unsupportedSubText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
