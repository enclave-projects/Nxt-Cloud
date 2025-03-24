import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [useDeviceAuth, setUseDeviceAuth] = useState(false);

  useEffect(() => {
    checkDeviceAuth();
  }, []);

  const checkDeviceAuth = async () => {
    try {
      const savedSetting = await AsyncStorage.getItem('useDeviceAuth');
      setUseDeviceAuth(savedSetting === 'true');
    } catch (error) {
      console.error('Failed to load device auth setting:', error);
    }
  };

  const authenticateWithDevice = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        throw new Error('Device authentication not available');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access NXT Cloud',
        fallbackLabel: 'Use device password',
      });

      if (result.success) {
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  };

  const login = async (username, password) => {
    if (useDeviceAuth) {
      return authenticateWithDevice();
    }

    if (username === 'admin' && password === '123456') {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      login, 
      logout,
      useDeviceAuth,
      setUseDeviceAuth 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
