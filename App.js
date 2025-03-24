import 'react-native-get-random-values';
import React, { useContext, useEffect } from 'react';
import { StyleSheet, StatusBar, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenCapture from 'expo-screen-capture';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { COLORS } from './constants/theme';

const Stack = createNativeStackNavigator();

function MainNavigator() {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? "Home" : "Login"}
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
