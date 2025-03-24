import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notifications for immediate delivery with sound
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.HIGH,
    sound: 'notification_sound.wav', // Updated file name with underscore
  }),
});

// Initialize notifications with permissions
const initializeNotifications = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
      sound: 'notification_sound.wav', // Updated file name with underscore
    });
  }
};

// Call initialization
initializeNotifications();

export const showNotification = async (title, body) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'notification.wav', // iOS needs this in content
        priority: 'high',
        data: { type: 'default' },
      },
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
};
