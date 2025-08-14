
import { useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// SecureStore keys
const BIO_ENABLED = 'BIO_ENABLED';
const BIO_LOCK_TIMEOUT_MIN = 'BIO_LOCK_TIMEOUT_MIN';
const BIO_DEVICE_ID = 'BIO_DEVICE_ID';
const BIO_LAST_UNLOCK_AT = 'BIO_LAST_UNLOCK_AT';

// AsyncStorage key for prompt tracking
const BIO_PROMPT_AT = 'BIO_PROMPT_AT';

export interface BiometricCapabilities {
  isAvailable: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  biometricType: string;
}

export interface BiometricSettings {
  enabled: boolean;
  timeoutMinutes: number;
  deviceId: string | null;
  lastUnlockAt: string | null;
}

export function useBiometricLock() {
  const [capabilities, setCapabilities] = useState<BiometricCapabilities>({
    isAvailable: false,
    isEnrolled: false,
    supportedTypes: [],
    biometricType: 'Biometrics',
  });
  
  const [settings, setSettings] = useState<BiometricSettings>({
    enabled: false,
    timeoutMinutes: 0,
    deviceId: null,
    lastUnlockAt: null,
  });

  const [loading, setLoading] = useState(true);

  // Check hardware capabilities
  const checkCapabilities = useCallback(async () => {
    try {
      console.log('useBiometricLock: Checking biometric capabilities');
      
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      // Determine biometric type label
      let biometricType = 'Biometrics';
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'Face ID';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'Touch ID';
      }

      const caps = {
        isAvailable,
        isEnrolled,
        supportedTypes,
        biometricType,
      };

      console.log('useBiometricLock: Capabilities:', caps);
      setCapabilities(caps);
      
      return caps;
    } catch (error) {
      console.error('useBiometricLock: Error checking capabilities:', error);
      return {
        isAvailable: false,
        isEnrolled: false,
        supportedTypes: [],
        biometricType: 'Biometrics',
      };
    }
  }, []);

  // Load settings from SecureStore
  const loadSettings = useCallback(async () => {
    try {
      console.log('useBiometricLock: Loading settings');
      
      const [enabled, timeoutMinutes, deviceId, lastUnlockAt] = await Promise.all([
        SecureStore.getItemAsync(BIO_ENABLED),
        SecureStore.getItemAsync(BIO_LOCK_TIMEOUT_MIN),
        SecureStore.getItemAsync(BIO_DEVICE_ID),
        SecureStore.getItemAsync(BIO_LAST_UNLOCK_AT),
      ]);

      const loadedSettings = {
        enabled: enabled === 'true',
        timeoutMinutes: timeoutMinutes ? parseInt(timeoutMinutes, 10) : 0,
        deviceId,
        lastUnlockAt,
      };

      console.log('useBiometricLock: Loaded settings:', loadedSettings);
      setSettings(loadedSettings);
      
      return loadedSettings;
    } catch (error) {
      console.error('useBiometricLock: Error loading settings:', error);
      return {
        enabled: false,
        timeoutMinutes: 0,
        deviceId: null,
        lastUnlockAt: null,
      };
    }
  }, []);

  // Initialize
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await Promise.all([checkCapabilities(), loadSettings()]);
      setLoading(false);
    };

    initialize();
  }, [checkCapabilities, loadSettings]);

  // Generate a random device ID
  const generateDeviceId = useCallback(() => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }, []);

  // Enable biometric lock
  const enableBiometricLock = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('useBiometricLock: Enabling biometric lock');
      
      if (!capabilities.isAvailable || !capabilities.isEnrolled) {
        return { success: false, message: 'Biometric authentication is not available or not enrolled' };
      }

      const deviceId = generateDeviceId();
      
      await Promise.all([
        SecureStore.setItemAsync(BIO_ENABLED, 'true'),
        SecureStore.setItemAsync(BIO_LOCK_TIMEOUT_MIN, '0'),
        SecureStore.setItemAsync(BIO_DEVICE_ID, deviceId),
        SecureStore.setItemAsync(BIO_LAST_UNLOCK_AT, new Date().toISOString()),
      ]);

      const newSettings = {
        enabled: true,
        timeoutMinutes: 0,
        deviceId,
        lastUnlockAt: new Date().toISOString(),
      };

      setSettings(newSettings);
      console.log('useBiometricLock: Biometric lock enabled');
      
      return { success: true, message: `${capabilities.biometricType} unlock enabled` };
    } catch (error) {
      console.error('useBiometricLock: Error enabling biometric lock:', error);
      return { success: false, message: 'Failed to enable biometric lock' };
    }
  }, [capabilities, generateDeviceId]);

  // Disable biometric lock
  const disableBiometricLock = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('useBiometricLock: Disabling biometric lock');
      
      await Promise.all([
        SecureStore.setItemAsync(BIO_ENABLED, 'false'),
        SecureStore.deleteItemAsync(BIO_LOCK_TIMEOUT_MIN),
        SecureStore.deleteItemAsync(BIO_DEVICE_ID),
        SecureStore.deleteItemAsync(BIO_LAST_UNLOCK_AT),
      ]);

      const newSettings = {
        enabled: false,
        timeoutMinutes: 0,
        deviceId: null,
        lastUnlockAt: null,
      };

      setSettings(newSettings);
      console.log('useBiometricLock: Biometric lock disabled');
      
      return { success: true, message: 'Biometric unlock disabled' };
    } catch (error) {
      console.error('useBiometricLock: Error disabling biometric lock:', error);
      return { success: false, message: 'Failed to disable biometric lock' };
    }
  }, []);

  // Set timeout
  const setLockTimeout = useCallback(async (timeoutMinutes: number): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('useBiometricLock: Setting lock timeout:', timeoutMinutes);
      
      await SecureStore.setItemAsync(BIO_LOCK_TIMEOUT_MIN, timeoutMinutes.toString());
      
      setSettings(prev => ({ ...prev, timeoutMinutes }));
      
      return { success: true, message: 'Lock timeout updated' };
    } catch (error) {
      console.error('useBiometricLock: Error setting timeout:', error);
      return { success: false, message: 'Failed to update lock timeout' };
    }
  }, []);

  // Reset biometric setup
  const resetBiometricSetup = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('useBiometricLock: Resetting biometric setup');
      
      await Promise.all([
        SecureStore.deleteItemAsync(BIO_ENABLED),
        SecureStore.deleteItemAsync(BIO_LOCK_TIMEOUT_MIN),
        SecureStore.deleteItemAsync(BIO_DEVICE_ID),
        SecureStore.deleteItemAsync(BIO_LAST_UNLOCK_AT),
        AsyncStorage.removeItem(BIO_PROMPT_AT),
      ]);

      const newSettings = {
        enabled: false,
        timeoutMinutes: 0,
        deviceId: null,
        lastUnlockAt: null,
      };

      setSettings(newSettings);
      console.log('useBiometricLock: Biometric setup reset');
      
      return { success: true, message: 'Biometric setup reset successfully' };
    } catch (error) {
      console.error('useBiometricLock: Error resetting setup:', error);
      return { success: false, message: 'Failed to reset biometric setup' };
    }
  }, []);

  // Check if app should be locked
  const shouldLock = useCallback((): boolean => {
    if (!settings.enabled) {
      return false;
    }

    // If biometrics are not available or enrolled, don't lock
    if (!capabilities.isAvailable || !capabilities.isEnrolled) {
      console.log('useBiometricLock: Should not lock - biometrics not available or enrolled');
      return false;
    }

    // If timeout is 0 (immediately), always lock
    if (settings.timeoutMinutes === 0) {
      console.log('useBiometricLock: Should lock - immediate timeout');
      return true;
    }

    // If no last unlock time, lock
    if (!settings.lastUnlockAt) {
      console.log('useBiometricLock: Should lock - no last unlock time');
      return true;
    }

    // Check if timeout has expired
    const lastUnlock = new Date(settings.lastUnlockAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUnlock.getTime()) / (1000 * 60);
    
    const shouldLockResult = diffMinutes >= settings.timeoutMinutes;
    console.log('useBiometricLock: Should lock check:', {
      lastUnlock: lastUnlock.toISOString(),
      now: now.toISOString(),
      diffMinutes,
      timeoutMinutes: settings.timeoutMinutes,
      shouldLock: shouldLockResult,
    });
    
    return shouldLockResult;
  }, [settings, capabilities]);

  // Mark as unlocked
  const markUnlocked = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      const now = new Date().toISOString();
      console.log('useBiometricLock: Marking as unlocked at:', now);
      
      await SecureStore.setItemAsync(BIO_LAST_UNLOCK_AT, now);
      
      setSettings(prev => ({ ...prev, lastUnlockAt: now }));
      
      return { success: true, message: 'Unlocked successfully' };
    } catch (error) {
      console.error('useBiometricLock: Error marking unlocked:', error);
      return { success: false, message: 'Failed to update unlock time' };
    }
  }, []);

  // Check if biometric authentication is properly configured
  const isBiometricConfigured = useCallback((): boolean => {
    return capabilities.isAvailable && capabilities.isEnrolled;
  }, [capabilities]);

  // Authenticate with biometrics
  const authenticate = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('useBiometricLock: Starting biometric authentication');
      
      if (!capabilities.isAvailable) {
        console.log('useBiometricLock: Biometric hardware not available');
        return { success: false, message: 'Biometric authentication is not available on this device' };
      }

      if (!capabilities.isEnrolled) {
        console.log('useBiometricLock: No biometrics enrolled');
        return { success: false, message: 'No biometric data is enrolled on this device' };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Budget Flow',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use device passcode',
        disableDeviceFallback: false,
      });

      console.log('useBiometricLock: Authentication result:', result);

      if (result.success) {
        await markUnlocked();
        return { success: true, message: 'Authentication successful' };
      } else {
        // Handle specific error cases
        if (result.error === 'user_cancel') {
          return { success: false, message: 'Authentication was cancelled' };
        } else if (result.error === 'system_cancel') {
          return { success: false, message: 'Authentication was cancelled by the system' };
        } else if (result.error === 'user_fallback') {
          return { success: false, message: 'User chose to use device passcode' };
        } else if (result.error === 'biometric_unknown_error') {
          return { success: false, message: 'An unknown biometric error occurred' };
        } else if (result.error === 'invalid_context') {
          return { success: false, message: 'Biometric authentication context is invalid' };
        } else if (result.error === 'not_enrolled') {
          return { success: false, message: 'No biometric data is enrolled' };
        } else if (result.error === 'not_available') {
          return { success: false, message: 'Biometric authentication is not available' };
        } else {
          return { success: false, message: result.error || 'Authentication failed' };
        }
      }
    } catch (error) {
      console.error('useBiometricLock: Authentication error:', error);
      return { success: false, message: 'Authentication failed due to an unexpected error' };
    }
  }, [capabilities, markUnlocked]);

  // Check if we should show the enable prompt
  const shouldShowEnablePrompt = useCallback(async (): Promise<boolean> => {
    try {
      // Don't show if biometrics not available or already enabled
      if (!capabilities.isAvailable || !capabilities.isEnrolled || settings.enabled) {
        return false;
      }

      // Check when we last prompted
      const lastPromptAt = await AsyncStorage.getItem(BIO_PROMPT_AT);
      if (lastPromptAt) {
        const lastPrompt = new Date(lastPromptAt);
        const now = new Date();
        const daysSincePrompt = (now.getTime() - lastPrompt.getTime()) / (1000 * 60 * 60 * 24);
        
        // Don't prompt again if less than 7 days
        if (daysSincePrompt < 7) {
          console.log('useBiometricLock: Not showing prompt - last prompted', daysSincePrompt, 'days ago');
          return false;
        }
      }

      console.log('useBiometricLock: Should show enable prompt');
      return true;
    } catch (error) {
      console.error('useBiometricLock: Error checking prompt status:', error);
      return false;
    }
  }, [capabilities, settings.enabled]);

  // Mark that we've shown the prompt
  const markPromptShown = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(BIO_PROMPT_AT, new Date().toISOString());
      console.log('useBiometricLock: Marked prompt as shown');
    } catch (error) {
      console.error('useBiometricLock: Error marking prompt shown:', error);
    }
  }, []);

  return {
    capabilities,
    settings,
    loading,
    enableBiometricLock,
    disableBiometricLock,
    setLockTimeout,
    resetBiometricSetup,
    shouldLock,
    markUnlocked,
    authenticate,
    shouldShowEnablePrompt,
    markPromptShown,
    checkCapabilities,
    loadSettings,
    isBiometricConfigured,
  };
}
