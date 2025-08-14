
import React, { useState, useEffect, useCallback } from 'react';
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
  const { capabilities, authenticate, markUnlocked } = useBiometricLock();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authAttempts, setAuthAttempts] = useState(0);

  // Auto-trigger authentication when screen loads
  useEffect(() => {
    const triggerAuth = async () => {
      if (!isAuthenticating && authAttempts < 3) {
        await handleAuthenticate();
      }
    };

    // Trigger immediately
    triggerAuth();

    // Also trigger when app becomes active
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && !isAuthenticating && authAttempts < 3) {
        triggerAuth();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [authAttempts, isAuthenticating]);

  const handleAuthenticate = useCallback(async () => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    console.log('LockScreen: Starting authentication');

    try {
      const result = await authenticate();
      
      if (result.success) {
        console.log('LockScreen: Authentication successful, navigating to home');
        // Navigate back to the app
        router.replace('/');
      } else {
        console.log('LockScreen: Authentication failed:', result.message);
        setAuthAttempts(prev => prev + 1);
        
        // Show error for user-cancelled attempts
        if (result.message !== 'User canceled authentication') {
          Alert.alert('Authentication Failed', result.message);
        }
      }
    } catch (error) {
      console.error('LockScreen: Authentication error:', error);
      setAuthAttempts(prev => prev + 1);
      Alert.alert('Error', 'An unexpected error occurred during authentication');
    } finally {
      setIsAuthenticating(false);
    }
  }, [authenticate, isAuthenticating]);

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
    setAuthAttempts(0);
    handleAuthenticate();
  }, [handleAuthenticate]);

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
              backgroundColor: currentColors.primary + '20',
              borderWidth: 3,
              borderColor: currentColors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            {isAuthenticating ? (
              <ActivityIndicator size="large" color={currentColors.primary} />
            ) : (
              <Icon
                name={
                  capabilities.biometricType === 'Face ID'
                    ? 'scan-outline'
                    : capabilities.biometricType === 'Touch ID'
                    ? 'finger-print-outline'
                    : 'shield-checkmark-outline'
                }
                size={48}
                style={{ color: currentColors.primary }}
              />
            )}
          </View>

          <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 8 }]}>
            {isAuthenticating ? 'Authenticating...' : `Unlock with ${capabilities.biometricType}`}
          </Text>

          <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
            {isAuthenticating
              ? 'Please complete the authentication'
              : authAttempts > 0
              ? `Authentication failed. Tap to try again.`
              : 'Tap the button below to authenticate'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={{ width: '100%', maxWidth: 320 }}>
          {/* Authenticate Button */}
          {!isAuthenticating && (
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

        {/* Help Text */}
        {authAttempts >= 3 && (
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <Text style={[themedStyles.textSecondary, { textAlign: 'center', fontSize: 14 }]}>
              Having trouble? You can sign out and sign back in, or check your device's biometric settings.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
