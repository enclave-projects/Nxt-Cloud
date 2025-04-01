import 'react-native-get-random-values';
import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, StatusBar, AppState, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenCapture from 'expo-screen-capture';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import CameraScreen from './screens/CameraScreen';
import ShareReceiveScreen from './screens/ShareReceiveScreen';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { COLORS } from './constants/theme';

const Stack = createNativeStackNavigator();

function MainNavigator() {
  const { isAuthenticated } = useContext(AuthContext);
  const [initialRoute, setInitialRoute] = useState(isAuthenticated ? "Home" : "Login");
  const [sharedFiles, setSharedFiles] = useState([]);
  const [isHandlingShare, setIsHandlingShare] = useState(false);

  useEffect(() => {
    // Function to handle deep links
    const handleDeepLink = async (event) => {
      const url = event.url;
      if (!url) return;
      
      // Process the deep link URL if needed
      console.log('Received deep link:', url);
    };

    // Handle incoming links
    Linking.addEventListener('url', handleDeepLink);
    
    // Get the initial URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Handle shared content on app launch or when app was in background
    if (Platform.OS === 'android') {
      const getSharedContent = async () => {
        try {
          const content = await Linking.getInitialURL();
          if (content) {
            processSharedContent(content);
          }
        } catch (error) {
          console.error('Error getting shared content:', error);
        }
      };
      getSharedContent();
    }

    return () => {
      // Clean up event listener
      Linking.removeAllListeners('url');
    };
  }, []);

  const processSharedContent = async (content) => {
    // This is a simplified implementation. In reality, you'd need
    // to parse the shared content depending on what was shared
    if (content) {
      setSharedFiles([{ uri: content, name: 'Shared file' }]);
      if (isAuthenticated) {
        setInitialRoute("ShareReceive");
      }
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          contentStyle: styles.screen,
          headerStyle: {
            backgroundColor: COLORS.surface,
          },
          headerShadowVisible: false,
          headerTitleStyle: {
            color: COLORS.text,
            fontSize: 18,
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: true }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true }} />
        <Stack.Screen 
          name="Camera" 
          component={CameraScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="ShareReceive" 
          component={ShareReceiveScreen}
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
          initialParams={{ sharedFiles }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  // Global effect to apply App Protection setting on app launch and on foreground events
  useEffect(() => {
    const setScreenCaptureSetting = async () => {
      const savedSetting = await AsyncStorage.getItem('appProtectionEnabled');
      if (savedSetting === 'true') {
        await ScreenCapture.preventScreenCaptureAsync();
      } else {
        await ScreenCapture.allowScreenCaptureAsync();
      }
    };

    // Check setting when app comes to foreground
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        setScreenCaptureSetting();
      }
    });
    
    // Initial call
    setScreenCaptureSetting();

    return () => subscription.remove();
  }, []);

  return (
    <AuthProvider>
      <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />
      <MainNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
