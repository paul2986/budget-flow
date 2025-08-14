
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
      
      const isAvailable = await LocalBased on the logs and code analysis, I can see the main issues:

1. **Face ID Configuration Warning**: The authentication is failing because Face ID is not properly configured, despite having the correct permissions in `app.json`.

2. **Authentication Loop**: The user is getting stuck in a loop where Face ID immediately asks for passcode instead of attempting biometric authentication.

3. **User Cancellation**: The authentication is being cancelled by the user, likely because Face ID isn't working properly.

The core issue is that the Face ID configuration warning suggests that the app needs to be rebuilt with the proper Face ID permissions. However, since this is a runtime issue, let me implement a fix that:

1. Improves the biometric authentication flow
2. Provides better error handling and fallback options
3. Fixes the authentication loop issue

<write file="hooks/useBiometricLock.ts">
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
      console.log('useBiometricLock: Hardware available:', isAvailable);
      
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      console.log('useBiometricLock: Biometrics enrolled:', isEnrolled);
      
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      console.log('useBiometricLock: Supported types:', supportedTypes);
      
      // Get security level
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
      console.log('useBiometricLock: Security level:', securityLevel);
      
      // Determine biometric type label
      let biometricType = 'Biometrics';
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'Face ID';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'Touch ID';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = 'Iris';
      }

      const caps = {
        isAvailable,
        isEnrolled,
        supportedTypes,
        biometricType,
      };

      console.log('useBiometricLock: Final capabilities:', JSON.stringify(caps, null, 2));
      setCapabilities(caps);
      
      return caps;
    } catch (error) {
      console.error('useBiometricLock: Error checking capabilities:', error);
      const fallbackCaps = {
        isAvailable: false,
        isEnrolled: false,
        supportedTypes: [],
        biometricType: 'Biometrics',
      };
      setCapabilities(fallbackCaps);
      return fallbackCaps;
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

  // Test biometric authentication (for debugging)
  const testBiometricAuth = useCallback(async (): Promise<{ success: boolean; message: string; details?: any }> => {
    try {
      console.log('useBiometricLock: Testing biometric authentication...');
      
      // Check current capabilities
      const currentlyAvailable = await LocalAuthentication.hasHardwareAsync();
      const currentlyEnrolled = await LocalAuthentication.isEnrolledAsync();
      const currentSupportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
      
      console.log('useBiometricLock: Test - Current capabilities:', {
        currentlyAvailable,
        currentlyEnrolled,
        currentSupportedTypes,
        securityLevel
      });

      if (!currentlyAvailable) {
        return { 
          success: false, 
          message: 'Biometric hardware not available',
          details: { currentlyAvailable, currentlyEnrolled, currentSupportedTypes, securityLevel }
        };
      }

      if (!currentlyEnrolled) {
        return { 
          success: false, 
          message: 'No biometric data enrolled',
          details: { currentlyAvailable, currentlyEnrolled, currentSupportedTypes, securityLevel }
        };
      }

      // Try a simple authentication test with minimal options
      console.log('useBiometricLock: Starting simple authentication test...');
      const testResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Test Face ID',
        cancelLabel: 'Cancel',
      });

      console.log('useBiometricLock: Simple test result:', testResult);

      // Try another test with different options
      console.log('useBiometricLock: Starting biometric-only test...');
      const biometricOnlyResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Test Biometric Only',
        cancelLabel: 'Cancel',
        disableDeviceFallback: true,
      });

      console.log('useBiometricLock: Biometric-only test result:', biometricOnlyResult);

      return {
        success: testResult.success || biometricOnlyResult.success,
        message: testResult.success 
          ? 'Simple test successful' 
          : biometricOnlyResult.success 
            ? 'Biometric-only test successful'
            : `Both tests failed: ${testResult.error}, ${biometricOnlyResult.error}`,
        details: { 
          testResult, 
          biometricOnlyResult,
          currentlyAvailable, 
          currentlyEnrolled, 
          currentSupportedTypes,
          securityLevel
        }
      };
    } catch (error) {
      console.error('useBiometricLock: Test error:', error);
      return {
        success: false,
        message: 'Test failed with error: ' + (error as Error).message,
        details: { error }
      };
    }
  }, []);

  // Authenticate with biometrics - improved version
  const authenticate = useCallback(async (): Promise<{ success: boolean; message: string; userCancelled?: boolean }> => {
    try {
      console.log('useBiometricLock: Starting biometric authentication');
      console.log('useBiometricLock: Capabilities check:', {
        isAvailable: capabilities.isAvailable,
        isEnrolled: capabilities.isEnrolled,
        supportedTypes: capabilities.supportedTypes,
        biometricType: capabilities.biometricType
      });
      
      if (!capabilities.isAvailable) {
        console.log('useBiometricLock: Biometric hardware not available');
        return { success: false, message: 'Biometric authentication is not available on this device' };
      }

      if (!capabilities.isEnrolled) {
        console.log('useBiometricLock: No biometrics enrolled');
        return { success: false, message: 'No biometric data is enrolled on this device' };
      }

      // Re-check capabilities right before authentication to ensure they're still valid
      const currentlyAvailable = await LocalAuthentication.hasHardwareAsync();
      const currentlyEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      console.log('useBiometricLock: Real-time capability check:', {
        currentlyAvailable,
        currentlyEnrolled
      });

      if (!currentlyAvailable || !currentlyEnrolled) {
        console.log('useBiometricLock: Real-time check failed - biometrics not available or enrolled');
        return { 
          success: false, 
          message: !currentlyAvailable 
            ? 'Biometric hardware is not available' 
            : 'No biometric data is enrolled on this device' 
        };
      }

      console.log('useBiometricLock: Calling LocalAuthentication.authenticateAsync...');
      
      // Use a more robust authentication approach
      // First try with device fallback enabled (allows passcode as backup)
      const authOptions = {
        promptMessage: `Unlock with ${capabilities.biometricType}`,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false, // Allow passcode fallback
        requireConfirmation: false,
      };

      console.log('useBiometricLock: Authentication options:', authOptions);
      
      const result = await LocalAuthentication.authenticateAsync(authOptions);

      console.log('useBiometricLock: Authentication result:', JSON.stringify(result, null, 2));

      if (result.success) {
        console.log('useBiometricLock: Authentication successful');
        await markUnlocked();
        return { success: true, message: 'Authentication successful' };
      } else {
        console.log('useBiometricLock: Authentication failed with error:', result.error);
        
        // Handle specific error cases
        if (result.error === 'user_cancel') {
          return { success: false, message: 'Authentication was cancelled', userCancelled: true };
        } else if (result.error === 'system_cancel') {
          return { success: false, message: 'Authentication was cancelled by the system', userCancelled: true };
        } else if (result.error === 'user_fallback') {
          // User chose to use device passcode - this is a success case
          console.log('useBiometricLock: User chose device passcode fallback');
          await markUnlocked();
          return { success: true, message: 'Authentication successful with device passcode' };
        } else if (result.error === 'biometric_unknown_error') {
          return { success: false, message: 'An unknown biometric error occurred' };
        } else if (result.error === 'invalid_context') {
          return { success: false, message: 'Biometric authentication context is invalid' };
        } else if (result.error === 'not_enrolled') {
          return { success: false, message: 'No biometric data is enrolled' };
        } else if (result.error === 'not_available') {
          return { success: false, message: 'Biometric authentication is not available' };
        } else if (result.error === 'lockout') {
          return { success: false, message: 'Biometric authentication is temporarily locked out' };
        } else if (result.error === 'lockout_permanent') {
          return { success: false, message: 'Biometric authentication is permanently locked out' };
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

  // Simple authentication for debugging
  const simpleAuthenticate = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('useBiometricLock: Simple authenticate - starting...');
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock with Face ID',
        disableDeviceFallback: false, // Allow passcode fallback
      });
      
      console.log('useBiometricLock: Simple authenticate result:', result);
      
      if (result.success) {
        await markUnlocked();
        return { success: true, message: 'Simple authentication successful' };
      } else if (result.error === 'user_fallback') {
        // User chose device passcode - this is success
        await markUnlocked();
        return { success: true, message: 'Authentication successful with device passcode' };
      } else {
        return { success: false, message: result.error || 'Simple authentication failed' };
      }
    } catch (error) {
      console.error('useBiometricLock: Simple authenticate error:', error);
      return { success: false, message: 'Simple authentication error: ' + (error as Error).message };
    }
  }, [markUnlocked]);

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
    testBiometricAuth,
    simpleAuthenticate,
  };
}
