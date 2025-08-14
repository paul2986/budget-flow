
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import Icon from '../../components/Icon';
import Button from '../../components/Button';

export default function AuthWelcomeScreen() {
  const { currentColors } = useTheme();
  const { themedStyles, themedButtonStyles } = useThemedStyles();
  const { showToast } = useToast();
  const { signInWithApple, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleAppleSignIn = async () => {
    console.log('AuthWelcome: Apple sign in pressed');
    setLoading('apple');
    try {
      const result = await signInWithApple();
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
    console.log('AuthWelcome: Google sign in pressed');
    setLoading('google');
    try {
      const result = await signInWithGoogle();
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
    console.log('AuthWelcome: Email sign in pressed');
    try {
      router.push('/auth/email');
      console.log('AuthWelcome: Navigation to /auth/email initiated');
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
            <Button
              text={loading === 'apple' ? '' : 'Continue with Apple'}
              onPress={handleAppleSignIn}
              disabled={loading !== null}
              style={[
                {
                  backgroundColor: '#000',
                  borderColor: '#000',
                  marginBottom: 12,
                  minHeight: 50,
                },
              ]}
              textStyle={{ color: '#fff', fontSize: 16, fontWeight: '600' }}
              icon={loading === 'apple' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Icon name="logo-apple" size={20} style={{ color: '#fff' }} />
              )}
            />
          )}

          {/* Google Sign In */}
          <Button
            text={loading === 'google' ? '' : 'Continue with Google'}
            onPress={handleGoogleSignIn}
            disabled={loading !== null}
            style={[
              {
                backgroundColor: '#fff',
                borderColor: '#dadce0',
                borderWidth: 1,
                marginBottom: 12,
                minHeight: 50,
              },
            ]}
            textStyle={{ color: '#1f1f1f', fontSize: 16, fontWeight: '600' }}
            icon={loading === 'google' ? (
              <ActivityIndicator color="#1f1f1f" size="small" />
            ) : (
              <Icon name="logo-google" size={20} style={{ color: '#4285f4' }} />
            )}
          />

          {/* Email Sign In */}
          <Button
            text="Continue with Email"
            onPress={handleEmailSignIn}
            disabled={loading !== null}
            style={[
              {
                backgroundColor: currentColors.backgroundAlt,
                borderColor: currentColors.border,
                borderWidth: 1,
                marginBottom: 24,
                minHeight: 50,
              },
            ]}
            textStyle={{ color: currentColors.text, fontSize: 16, fontWeight: '600' }}
            icon={<Icon name="mail-outline" size={20} style={{ color: currentColors.text }} />}
          />
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
