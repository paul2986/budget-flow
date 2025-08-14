
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import Icon from '../../components/Icon';

export default function AuthWelcomeScreen() {
  const { currentColors } = useTheme();
  const { themedStyles, themedButtonStyles } = useThemedStyles();
  const { showToast } = useToast();
  const { signInWithApple, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleAppleSignIn = async () => {
    console.log('AuthWelcome: Apple sign in pressed - START');
    setLoading('apple');
    try {
      console.log('AuthWelcome: About to call signInWithApple');
      const result = await signInWithApple();
      console.log('AuthWelcome: Apple sign in result:', result);
      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      console.error('Auth: Apple sign in error:', error);
      showToast('Failed to sign in with Apple', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleGoogleSignIn = async () => {
    console.log('AuthWelcome: Google sign in pressed - START');
    setLoading('google');
    try {
      console.log('AuthWelcome: About to call signInWithGoogle');
      const result = await signInWithGoogle();
      console.log('AuthWelcome: Google sign in result:', result);
      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      console.error('Auth: Google sign in error:', error);
      showToast('Failed to sign in with Google', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleEmailSignIn = () => {
    console.log('AuthWelcome: Email sign in pressed - START');
    try {
      console.log('AuthWelcome: About to call router.push');
      router.push('/auth/email');
      console.log('AuthWelcome: Navigation to /auth/email initiated - SUCCESS');
    } catch (error) {
      console.error('AuthWelcome: Navigation error:', error);
      showToast('Navigation error occurred', 'error');
    }
  };

  const openTerms = () => {
    Linking.openURL('https://natively.dev/terms');
  };

  const openPrivacy = () => {
    Linking.openURL('https://natively.dev/privacy');
  };

  console.log('AuthWelcome: Rendering with loading state:', loading);

  return (
    <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
      <View style={[themedStyles.content, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }]}>
        {/* Logo/Title */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Icon name="wallet-outline" size={80} style={{ color: currentColors.primary, marginBottom: 16 }} />
          <Text style={[themedStyles.title, { textAlign: 'center', fontSize: 32, fontWeight: '700' }]}>
            Budget Flow
          </Text>
          <Text style={[themedStyles.textSecondary, { textAlign: 'center', fontSize: 16, marginTop: 8 }]}>
            Track expenses, manage budgets, and take control of your finances
          </Text>
        </View>

        {/* Sign In Options */}
        <View style={{ width: '100%', maxWidth: 320 }}>
          {/* Apple Sign In */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              onPress={handleAppleSignIn}
              disabled={loading !== null}
              style={[
                {
                  backgroundColor: '#000',
                  borderColor: '#000',
                  borderWidth: 2,
                  marginBottom: 12,
                  minHeight: 50,
                  paddingHorizontal: 24,
                  paddingVertical: 16,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  elevation: 2,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                },
              ]}
              activeOpacity={0.8}
            >
              {loading === 'apple' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Icon name="logo-apple" size={20} style={{ color: '#fff', marginRight: 8 }} />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }}>
                    Continue with Apple
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Google Sign In */}
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={loading !== null}
            style={[
              {
                backgroundColor: '#fff',
                borderColor: '#dadce0',
                borderWidth: 2,
                marginBottom: 12,
                minHeight: 50,
                paddingHorizontal: 24,
                paddingVertical: 16,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                elevation: 2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              },
            ]}
            activeOpacity={0.8}
          >
            {loading === 'google' ? (
              <ActivityIndicator color="#1f1f1f" size="small" />
            ) : (
              <>
                <Icon name="logo-google" size={20} style={{ color: '#4285f4', marginRight: 8 }} />
                <Text style={{ color: '#1f1f1f', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Email Sign In */}
          <TouchableOpacity
            onPress={handleEmailSignIn}
            disabled={loading !== null}
            style={[
              {
                backgroundColor: currentColors.backgroundAlt,
                borderColor: currentColors.border,
                borderWidth: 2,
                marginBottom: 24,
                minHeight: 50,
                paddingHorizontal: 24,
                paddingVertical: 16,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                elevation: 2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              },
            ]}
            activeOpacity={0.8}
          >
            <Icon name="mail-outline" size={20} style={{ color: currentColors.text, marginRight: 8 }} />
            <Text style={{ color: currentColors.text, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }}>
              Continue with Email
            </Text>
          </TouchableOpacity>
        </View>

        {/* Terms and Privacy */}
        <View style={{ alignItems: 'center' }}>
          <Text style={[themedStyles.textSecondary, { fontSize: 12, textAlign: 'center', lineHeight: 18 }]}>
            By continuing, you agree to our{' '}
            <Text style={{ color: currentColors.primary, textDecorationLine: 'underline' }} onPress={openTerms}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text style={{ color: currentColors.primary, textDecorationLine: 'underline' }} onPress={openPrivacy}>
              Privacy Policy
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
}
