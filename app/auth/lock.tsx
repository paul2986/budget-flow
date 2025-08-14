
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, AppState } from 'react-native';
import { router } from 'expo-router';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useBiometricLock } from '../../hooks/useBiometricLock';
import Icon from '../../components/Icon';
import { BlurView } from 'expo-blur';

export default function LockScreen() {
  const { currentColors, isDarkMode } = useTheme();
  const { themedStyles } = useThemedStyles();
  const { signOut } = useAuth();
  const { capabilities, authenticate, markUnlocked, isBiometricConfigured, testBiometricAuth, simpleAuthenticate } = useBiometricLock();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authAttempts, setAuthAttempts] = useState(0);
  const [lastAuthAttempt, setLastAuthAttempt] = useState<number>(0);
  const [showManualUnlock, setShowManualUnlock] = useState(false);
  const [hasTriggeredInitialAuth, setHasTriggeredInitialAuth] = useState(false);
  const [faceIdConfigurationError, setFaceIdConfigurationError] = useState(false);
  const authTimeoutRef = useRef<NodeJS.Timeout>();

  const handleAuthenticate = useCallback(async () => {
    if (isAuthenticating) {
      console.log('LockScreen: Already authenticating, skipping');
      return;
    }

    const now = Date.now();
    
    // Prevent rapid-fire attempts with cooldown
    if (now - lastAuthAttempt < 2000) {
      console.log('LockScreen: Skipping auth - too soon since last attempt');
      return;
    }

    // Don't auto-trigger if we've had too many failures
    if (authAttempts >= 3) {
      console.log('LockScreen: Too many failed attempts, showing manual unlock');
      setShowManualUnlock(true);
      return;
    }

    console.log('LockScreen: Starting authentication attempt', authAttempts + 1);
    console.log('LockScreen: Current biometric configuration:', {
      isAvailable: capabilities.isAvailable,
      isEnrolled: capabilities.isEnrolled,
      biometricType: capabilities.biometricType,
      isBiometricConfigured: isBiometricConfigured()
    });

    setIsAuthenticating(true);
    setLastAuthAttempt(now);

    try {
      console.log('LockScreen: Calling authenticate()...');
      const result = await authenticate();
      console.log('LockScreen: Authentication result received:', result);
      
      if (result.success) {
        console.log('LockScreen: Authentication successful, navigating to home');
        // Reset attempts on success
        setAuthAttempts(0);
        setShowManualUnlock(false);
        setFaceIdConfigurationError(false);
        // Navigate back to the app
        router.replace('/');
      } else {
        console.log('LockScreen: Authentication failed:', result.message, 'userCancelled:', result.userCancelled);
        
        // Check for Face ID configuration issues
        if (result.message && result.message.includes('FaceID is available but has not been configured')) {
          console.log('LockScreen: Face ID configuration error detected');
          setFaceIdConfigurationError(true);
          setShowManualUnlock(true);
        }
        
        // Don't count user cancellations as failed attempts
        if (!result.userCancelled) {
          const newAttempts = authAttempts + 1;
          console.log('LockScreen: Incrementing failed attempts to:', newAttempts);
          setAuthAttempts(newAttempts);
          
          // Show manual unlock option after 3 failed attempts
          if (newAttempts >= 3) {
            console.log('LockScreen: Reached max attempts, showing manual unlock');
            setShowManualUnlock(true);
          }
        } else {
          console.log('LockScreen: User cancelled, not incrementing attempts');
        }
        
        // Only show error alerts for certain types of failures
        if (result.message && 
            !result.message.includes('cancelled') && 
            !result.message.includes('system_cancel') &&
            !result.message.includes('user_cancel') &&
            !result.userCancelled &&
            !result.message.includes('FaceID is available but has not been configured')) {
          console.log('LockScreen: Showing error alert:', result.message);
          Alert.alert('Authentication Failed', result.message);
        }
      }
    } catch (error) {
      console.error('LockScreen: Authentication error:', error);
      setAuthAttempts(prev => {
        const newAttempts = prev + 1;
        console.log('LockScreen: Error occurred, incrementing attempts to:', newAttempts);
        return newAttempts;
      });
      setShowManualUnlock(true);
      Alert.alert('Error', 'An unexpected error occurred during authentication');
    } finally {
      setIsAuthenticating(false);
      console.log('LockScreen: Authentication attempt completed');
    }
  }, [authenticate, isAuthenticating, lastAuthAttempt, authAttempts, capabilities, isBiometricConfigured]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, []);

  // Auto-trigger authentication when screen loads, but only once
  useEffect(() => {
    const triggerInitialAuth = async () => {
      // Only trigger once per screen load
      if (hasTriggeredInitialAuth) {
        console.log('LockScreen: Initial auth already triggered, skipping');
        return;
      }

      console.log('LockScreen: Checking biometric configuration...');
      console.log('LockScreen: Capabilities:', {
        isAvailable: capabilities.isAvailable,
        isEnrolled: capabilities.isEnrolled,
        supportedTypes: capabilities.supportedTypes,
        biometricType: capabilities.biometricType
      });

      // Don't auto-trigger if biometrics aren't properly configured
      if (!isBiometricConfigured()) {
        console.log('LockScreen: Biometrics not configured, showing manual unlock');
        setShowManualUnlock(true);
        setHasTriggeredInitialAuth(true);
        return;
      }

      console.log('LockScreen: Biometrics configured, triggering initial authentication');
      setHasTriggeredInitialAuth(true);
      
      // Longer delay to ensure Face ID is ready
      authTimeoutRef.current = setTimeout(() => {
        handleAuthenticate();
      }, 1500); // Reduced delay for better UX
    };

    triggerInitialAuth();
  }, [hasTriggeredInitialAuth, isBiometricConfigured, capabilities, handleAuthenticate]);

  // Handle app state changes - only trigger auth when coming back from background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      console.log('LockScreen: App state changed to:', nextAppState);
      
      // When app becomes active from background, trigger auth if configured
      if (nextAppState === 'active' && hasTriggeredInitialAuth && isBiometricConfigured()) {
        const now = Date.now();
        
        // Only trigger if enough time has passed since last attempt
        if (now - lastAuthAttempt > 3000 && !isAuthenticating && authAttempts < 3) {
          console.log('LockScreen: App became active, triggering authentication');
          authTimeoutRef.current = setTimeout(() => {
            handleAuthenticate();
          }, 500); // Shorter delay for app state changes
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove();
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, [hasTriggeredInitialAuth, lastAuthAttempt, isAuthenticating, authAttempts, isBiometricConfigured, handleAuthenticate]);

  const handleManualUnlock = useCallback(async () => {
    console.log('LockScreen: Manual unlock - marking as unlocked');
    try {
      await markUnlocked();
      setAuthAttempts(0);
      setShowManualUnlock(false);
      setFaceIdConfigurationError(false);
      router.replace('/');
    } catch (error) {
      console.error('LockScreen: Manual unlock error:', error);
      Alert.alert('Error', 'Failed to unlock manually');
    }
  }, [markUnlocked]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You will need to sign in again to access your budgets.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            console.log('LockScreen: Signing out');
            await signOut();
            router.replace('/auth');
          },
        },
      ]
    );
  }, [signOut]);

  const handleRetry = useCallback(() => {
    console.log('LockScreen: Retry button pressed');
    setAuthAttempts(0);
    setShowManualUnlock(false);
    setFaceIdConfigurationError(false);
    setLastAuthAttempt(0);
    handleAuthenticate();
  }, [handleAuthenticate]);

  // Check if biometrics are properly configured
  const biometricsConfigured = isBiometricConfigured();

  return (
    <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
      {/* Blurred background overlay */}
      <BlurView
        intensity={80}
        tint={isDarkMode ? 'dark' : 'light'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      {/* Content */}
      <View style={[themedStyles.content, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }]}>
        {/* App Logo/Title */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Icon name="wallet-outline" size={80} style={{ color: currentColors.primary, marginBottom: 16 }} />
          <Text style={[themedStyles.title, { textAlign: 'center', fontSize: 32, fontWeight: '700' }]}>
            Budget Flow
          </Text>
          <Text style={[themedStyles.textSecondary, { textAlign: 'center', fontSize: 16, marginTop: 8 }]}>
            Your budgets are protected
          </Text>
        </View>

        {/* Biometric Icon */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: faceIdConfigurationError ? currentColors.error + '20' : currentColors.primary + '20',
              borderWidth: 3,
              borderColor: faceIdConfigurationError ? currentColors.error : currentColors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            {isAuthenticating ? (
              <ActivityIndicator size="large" color={faceIdConfigurationError ? currentColors.error : currentColors.primary} />
            ) : (
              <Icon
                name={
                  faceIdConfigurationError
                    ? 'warning-outline'
                    : capabilities.biometricType === 'Face ID'
                    ? 'scan-outline'
                    : capabilities.biometricType === 'Touch ID'
                    ? 'finger-print-outline'
                    : 'shield-checkmark-outline'
                }
                size={48}
                style={{ color: faceIdConfigurationError ? currentColors.error : currentColors.primary }}
              />
            )}
          </View>

          <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 8 }]}>
            {faceIdConfigurationError
              ? 'Face ID Configuration Issue'
              : !biometricsConfigured
              ? 'Biometric Authentication Unavailable'
              : isAuthenticating
              ? 'Authenticating...'
              : showManualUnlock
              ? 'Authentication Required'
              : `Unlock with ${capabilities.biometricType}`}
          </Text>

          <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
            {faceIdConfigurationError
              ? 'Face ID is available but not properly configured. Please rebuild the app or use manual unlock.'
              : !biometricsConfigured
              ? 'Please set up biometric authentication in your device settings'
              : isAuthenticating
              ? 'Please complete the authentication'
              : showManualUnlock
              ? 'Use the buttons below to unlock or sign out'
              : authAttempts > 0
              ? `Authentication failed. Tap to try again.`
              : 'Tap the button below to authenticate'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={{ width: '100%', maxWidth: 320 }}>
          {/* Authenticate Button - only show if biometrics are configured and no Face ID error */}
          {biometricsConfigured && !isAuthenticating && !faceIdConfigurationError && (
            <TouchableOpacity
              style={[
                themedStyles.card,
                {
                  backgroundColor: currentColors.primary,
                  borderColor: currentColors.primary,
                  borderWidth: 2,
                  marginBottom: 16,
                  minHeight: 50,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
              onPress={handleRetry}
            >
              <Icon
                name={
                  capabilities.biometricType === 'Face ID'
                    ? 'scan'
                    : capabilities.biometricType === 'Touch ID'
                    ? 'finger-print'
                    : 'shield-checkmark'
                }
                size={20}
                style={{ color: '#fff', marginRight: 12 }}
              />
              <Text style={[themedStyles.text, { color: '#fff', fontSize: 16, fontWeight: '600' }]}>
                {authAttempts > 0 ? 'Try Again' : `Use ${capabilities.biometricType}`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Force Authenticate Button - debug only */}
          {__DEV__ && biometricsConfigured && !isAuthenticating && (
            <TouchableOpacity
              style={[
                themedStyles.card,
                {
                  backgroundColor: 'transparent',
                  borderColor: currentColors.primary,
                  borderWidth: 1,
                  marginBottom: 8,
                  minHeight: 40,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
              onPress={() => {
                console.log('LockScreen: Force authenticate button pressed');
                handleAuthenticate();
              }}
            >
              <Text style={[themedStyles.text, { color: currentColors.primary, fontSize: 14, fontWeight: '500' }]}>
                Force Authenticate (Debug)
              </Text>
            </TouchableOpacity>
          )}

          {/* Test Biometric Button - debug only */}
          {__DEV__ && biometricsConfigured && !isAuthenticating && (
            <TouchableOpacity
              style={[
                themedStyles.card,
                {
                  backgroundColor: 'transparent',
                  borderColor: currentColors.secondary,
                  borderWidth: 1,
                  marginBottom: 8,
                  minHeight: 40,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
              onPress={async () => {
                console.log('LockScreen: Test biometric button pressed');
                const result = await testBiometricAuth();
                Alert.alert(
                  'Test Result',
                  `Success: ${result.success}\nMessage: ${result.message}\n\nDetails: ${JSON.stringify(result.details, null, 2)}`
                );
              }}
            >
              <Text style={[themedStyles.text, { color: currentColors.secondary, fontSize: 14, fontWeight: '500' }]}>
                Test Biometric (Debug)
              </Text>
            </TouchableOpacity>
          )}

          {/* Simple Authenticate Button - debug only */}
          {__DEV__ && biometricsConfigured && !isAuthenticating && (
            <TouchableOpacity
              style={[
                themedStyles.card,
                {
                  backgroundColor: 'transparent',
                  borderColor: currentColors.success || '#4CAF50',
                  borderWidth: 1,
                  marginBottom: 16,
                  minHeight: 40,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
              onPress={async () => {
                console.log('LockScreen: Simple authenticate button pressed');
                const result = await simpleAuthenticate();
                if (result.success) {
                  router.replace('/');
                } else {
                  Alert.alert('Simple Auth Failed', result.message);
                }
              }}
            >
              <Text style={[themedStyles.text, { color: currentColors.success || '#4CAF50', fontSize: 14, fontWeight: '500' }]}>
                Simple Auth (Debug)
              </Text>
            </TouchableOpacity>
          )}

          {/* Manual Unlock Button - show if biometrics failed or not configured */}
          {(showManualUnlock || !biometricsConfigured || faceIdConfigurationError) && (
            <TouchableOpacity
              style={[
                themedStyles.card,
                {
                  backgroundColor: currentColors.secondary,
                  borderColor: currentColors.secondary,
                  borderWidth: 2,
                  marginBottom: 16,
                  minHeight: 50,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
              onPress={handleManualUnlock}
              disabled={isAuthenticating}
            >
              <Icon name="key-outline" size={20} style={{ color: '#fff', marginRight: 12 }} />
              <Text style={[themedStyles.text, { color: '#fff', fontSize: 16, fontWeight: '600' }]}>
                Unlock Manually
              </Text>
            </TouchableOpacity>
          )}

          {/* Sign Out Button */}
          <TouchableOpacity
            style={[
              themedStyles.card,
              {
                backgroundColor: 'transparent',
                borderColor: currentColors.error,
                borderWidth: 2,
                minHeight: 50,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
            onPress={handleSignOut}
            disabled={isAuthenticating}
          >
            <Icon name="log-out-outline" size={20} style={{ color: currentColors.error, marginRight: 12 }} />
            <Text style={[themedStyles.text, { color: currentColors.error, fontSize: 16, fontWeight: '600' }]}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

        {/* Debug Info */}
        {__DEV__ && (
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <TouchableOpacity
              style={[
                themedStyles.card,
                {
                  backgroundColor: 'transparent',
                  borderColor: currentColors.textSecondary,
                  borderWidth: 1,
                  padding: 8,
                  marginBottom: 16,
                },
              ]}
              onPress={() => {
                Alert.alert(
                  'Debug Info',
                  `Capabilities:
- Available: ${capabilities.isAvailable}
- Enrolled: ${capabilities.isEnrolled}
- Type: ${capabilities.biometricType}
- Supported: ${capabilities.supportedTypes.join(', ')}

State:
- Auth Attempts: ${authAttempts}
- Show Manual: ${showManualUnlock}
- Is Authenticating: ${isAuthenticating}
- Configured: ${biometricsConfigured}
- Face ID Error: ${faceIdConfigurationError}`
                );
              }}
            >
              <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>Debug Info</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Help Text */}
        {(authAttempts >= 3 || !biometricsConfigured || faceIdConfigurationError) && (
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <Text style={[themedStyles.textSecondary, { textAlign: 'center', fontSize: 14 }]}>
              {faceIdConfigurationError
                ? 'Face ID configuration issue detected. This usually happens when the app needs to be rebuilt with proper Face ID permissions. You can use manual unlock or sign out and sign back in.'
                : !biometricsConfigured
                ? 'To use biometric authentication, please enable Face ID or Touch ID in your device settings and restart the app.'
                : 'Having trouble? You can unlock manually, sign out and sign back in, or check your device\'s biometric settings.'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
