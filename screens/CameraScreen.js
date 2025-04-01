import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Alert, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { uploadFile } from '../utils/fileOperations';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/theme';

/**
 * Implementation using ImagePicker for photos and videos
 */
const CameraScreen = ({ route }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [capturedMedia, setCapturedMedia] = useState(null);
  const [uploadController, setUploadController] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaType, setMediaType] = useState('photo'); // 'photo' or 'video'
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef(null);
  const navigation = useNavigation();
  const { currentPath } = route.params || { currentPath: '/' };

  useEffect(() => {
    requestPermissions();
    
    // Cleanup function to abort any ongoing uploads when component unmounts
    return () => {
      if (uploadController) {
        uploadController.abort();
      }
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, []);

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const microphonePermission = await ImagePicker.requestMicrophonePermissionsAsync();
    
    if (cameraPermission.status !== 'granted' || microphonePermission.status !== 'granted') {
      Alert.alert('Permission required', 'Camera and microphone permissions are required to use this feature');
      navigation.goBack();
    }
  };

  const takePicture = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCapturedMedia({
          ...result.assets[0],
          type: 'photo'
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture photo: ' + error.message);
    }
  };

  const startVideoRecording = async () => {
    try {
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      setRecordingDuration(0);
      
      // Start a timer to update the recording duration
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartTime) / 1000));
      }, 1000);
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        videoMaxDuration: 60, // Limit to 60 seconds
        quality: 0.5, // Lower quality to reduce file size
        videoQuality: '720p',
      });

      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      
      setIsRecording(false);
      setRecordingDuration(0);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCapturedMedia({
          ...result.assets[0],
          type: 'video'
        });
      }
    } catch (error) {
      setIsRecording(false);
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      Alert.alert('Error', 'Failed to record video: ' + error.message);
    }
  };

  const uploadMedia = async () => {
    if (!capturedMedia) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Generate a unique filename with timestamp
      const timestamp = new Date().getTime();
      const uri = capturedMedia.uri;
      const extension = capturedMedia.type === 'photo' ? '.jpg' : '.mp4';
      const prefix = capturedMedia.type === 'photo' ? 'IMG_' : 'VID_';
      const filename = `${prefix}${timestamp}${extension}`;
      
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      // Create a new AbortController
      const controller = new AbortController();
      setUploadController(controller);
      
      // Upload file to cloud storage
      await uploadFile(
        uri,
        currentPath + filename,
        (progress) => {
          setUploadProgress(progress);
        },
        controller
      );
      
      setIsUploading(false);
      setUploadController(null);
      setCapturedMedia(null);
      Alert.alert('Success', `${capturedMedia.type === 'photo' ? 'Photo' : 'Video'} uploaded successfully!`);
      navigation.goBack();
    } catch (error) {
      setIsUploading(false);
      setUploadController(null);
      Alert.alert('Upload Failed', error.message);
    }
  };

  const cancelUpload = () => {
    if (uploadController) {
      uploadController.abort();
      setIsUploading(false);
      setUploadProgress(0);
      setUploadController(null);
      Alert.alert('Upload Cancelled', 'Upload was cancelled');
    }
  };

  const retakeMedia = () => {
    setCapturedMedia(null);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {capturedMedia ? (
        // Show captured media preview
        <View style={styles.previewContainer}>
          {capturedMedia.type === 'photo' ? (
            <Image
              source={{ uri: capturedMedia.uri }}
              style={styles.previewImage}
            />
          ) : (
            <View style={styles.videoPreviewContainer}>
              <Image 
                source={{ uri: capturedMedia.uri }}
                style={styles.previewImage}
              />
              <View style={styles.videoIndicator}>
                <MaterialIcons name="videocam" size={24} color="white" />
                <Text style={styles.videoText}>Video</Text>
              </View>
            </View>
          )}
          
          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.actionButton} onPress={retakeMedia}>
              <MaterialIcons name="refresh" size={24} color="white" />
              <Text style={styles.actionText}>Retake</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.uploadButton]} 
              onPress={isUploading ? cancelUpload : uploadMedia}
              disabled={false}
            >
              {isUploading ? (
                <>
                  <MaterialIcons name="cancel" size={24} color="white" />
                  <Text style={styles.actionText}>Cancel</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="cloud-upload" size={24} color="white" />
                  <Text style={styles.actionText}>Upload</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          {isUploading && (
            <View style={styles.uploadingContainer}>
              <Text style={styles.uploadingText}>Uploading: {Math.round(uploadProgress * 100)}%</Text>
            </View>
          )}
        </View>
      ) : (
        // Show camera interface
        <View style={styles.cameraContainer}>
          <View style={styles.cameraPlaceholder}>
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>
                  {formatDuration(recordingDuration)}
                </Text>
              </View>
            )}
            
            {mediaType === 'photo' ? (
              <TouchableOpacity 
                style={styles.captureButton} 
                onPress={takePicture}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[
                  styles.captureButton, 
                  isRecording && styles.recordingButton
                ]} 
                onPress={startVideoRecording}
              >
                {isRecording ? (
                  <View style={styles.stopButtonInner} />
                ) : (
                  <View style={styles.videoButtonInner} />
                )}
              </TouchableOpacity>
            )}
            
            <Text style={styles.instructionText}>
              Tap to {mediaType === 'photo' ? 'Take Photo' : 'Record Video'}
            </Text>
            
            <View style={styles.mediaSwitchContainer}>
              <TouchableOpacity
                style={[
                  styles.mediaSwitchButton,
                  mediaType === 'photo' && styles.activeMediaButton
                ]}
                onPress={() => setMediaType('photo')}
              >
                <MaterialIcons 
                  name="photo-camera" 
                  size={24} 
                  color={mediaType === 'photo' ? COLORS.primary : 'white'} 
                />
                <Text style={[
                  styles.mediaSwitchText,
                  mediaType === 'photo' && styles.activeMediaText
                ]}>Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.mediaSwitchButton,
                  mediaType === 'video' && styles.activeMediaButton
                ]}
                onPress={() => setMediaType('video')}
              >
                <MaterialIcons 
                  name="videocam" 
                  size={24} 
                  color={mediaType === 'video' ? COLORS.primary : 'white'} 
                />
                <Text style={[
                  styles.mediaSwitchText,
                  mediaType === 'video' && styles.activeMediaText
                ]}>Video</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  videoButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'red',
  },
  stopButtonInner: {
    width: 30,
    height: 30,
    backgroundColor: 'red',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 120,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    borderRadius: 20,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'red',
    marginRight: 8,
  },
  recordingText: {
    color: 'white',
    fontWeight: 'bold',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 30,
  },
  mediaSwitchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '80%',
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
  },
  mediaSwitchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: '50%',
    justifyContent: 'center',
  },
  activeMediaButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  mediaSwitchText: {
    color: 'white',
    marginLeft: 5,
  },
  activeMediaText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '80%',
    resizeMode: 'contain',
  },
  videoPreviewContainer: {
    width: '100%',
    height: '80%',
    position: 'relative',
  },
  videoIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    padding: 20,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    borderRadius: 10,
    width: 120,
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
  },
  actionText: {
    color: 'white',
    marginTop: 5,
  },
  uploadingContainer: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  uploadingText: {
    color: 'white',
    fontSize: 16,
  },
});

export default CameraScreen;
