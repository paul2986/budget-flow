
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import StandardHeader from '../../components/StandardHeader';

export default function VerifyEmailScreen() {
  const { currentColors } = useTheme();
  const { themedStyles, themedButtonStyles } = useThemedStyles();
  const { showToast } = useToast();
  const { user, resendVerification, refreshSession } = useAuth();
  
  const [loading, setLoading] = useState<string | null>(null);
  const [pollingCount, setPollingCount] = useState(0);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Start polling for verification status
  useEffect(() => {
    if (pollingCount < 6) { // Poll for 30 seconds (6 * 5s)
      pollingInterval.current = setTimeout(() => {
        refreshSession();
        setPollingCount(prev => prev + 1);
      }, 5000);
    }

    return () => {
      if (pollingInterval.current) {
        clearTimeout(pollingInterval.current);
      }
    };
  }, [pollingCount, refreshSession]);

  // Check if user is verified and redirect
  useEffect(() => {
    if (user?.email_confirmed_at) {
      console.log('Verify: User is verified, redirecting to home');
      router.replace('/');
    }
  }, [user?.email_confirmed_at]);

  const handleResendVerification = async () => {
    setLoading('resend');
    try {
      const result = await resendVerification();
      if (result.success) {
        showToast(result.message, 'success');
        setPollingCount(0); // Restart polling
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      console.error('Verify: Resend error:', error);
      showToast('Failed to resend verification email', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleOpenEmailApp = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('message://');
    } else {
      // Android - try to open default email app
      Linking.openURL('mailto:');
    }
  };

  const handleRefreshStatus = async () => {
    setLoading('refresh');
    try {
      await refreshSession();
      if (user?.email_confirmed_at) {
        showToast('Email verified successfully!', 'success');
        router.replace('/');
      } else {
        showToast('Email not yet verified. Please check your inbox.', 'info');
      }
    } catch (error) {
      console.error('Verify: Refresh error:', error);
      showToast('Failed to check verification status', 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
      <StandardHeader 
        title="Verify Email" 
        showLeftIcon={false}
        showRightIcon={false}
      />

      <View style={[themedStyles.content, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }]}>
        {/* Icon */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={[
            {
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: currentColors.primary + '20',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }
          ]}>
            <Icon name="mail-outline" size={40} style={{ color: currentColors.primary }} />
          </View>
          <Text style={[themedStyles.title, { textAlign: 'center', fontSize: 24, fontWeight: '700' }]}>
            Check Your Email
          </Text>
        </View>

        {/* Message */}
        <View style={{ marginBottom: 32 }}>
          <Text style={[themedStyles.text, { textAlign: 'center', fontSize: 16, lineHeight: 24, marginBottom: 16 }]}>
            We've sent a verification link to:
          </Text>
          <Text style={[themedStyles.text, { textAlign: 'center', fontSize: 16, fontWeight: '600', color: currentColors.primary, marginBottom: 16 }]}>
            {user?.email}
          </Text>
          <Text style={[themedStyles.textSecondary, { textAlign: 'center', fontSize: 14, lineHeight: 20 }]}>
            Click the link in your email to verify your account. You won't be able to access your budgets until your email is verified.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={{ width: '100%', maxWidth: 320 }}>
          {/* Open Email App */}
          <Button
            text="Open Email App"
            onPress={handleOpenEmailApp}
            style={[themedButtonStyles.primary, { marginBottom: 12, minHeight: 50 }]}
            icon={<Icon name="mail-open-outline" size={20} style={{ color: '#fff' }} />}
          />

          {/* Resend Verification */}
          <TouchableOpacity
            style={[
              themedButtonStyles.secondary,
              {
                backgroundColor: currentColors.backgroundAlt,
                borderColor: currentColors.border,
                borderWidth: 1,
                marginBottom: 12,
                minHeight: 50,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
            onPress={handleResendVerification}
            disabled={loading !== null}
          >
            {loading === 'resend' ? (
              <ActivityIndicator color={currentColors.text} size="small" />
            ) : (
              <>
                <Icon name="refresh-outline" size={20} style={{ color: currentColors.text, marginRight: 8 }} />
                <Text style={[themedButtonStyles.secondaryText, { fontSize: 16, fontWeight: '600' }]}>
                  Resend Verification
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* I've Verified */}
          <TouchableOpacity
            style={[
              themedButtonStyles.secondary,
              {
                backgroundColor: currentColors.backgroundAlt,
                borderColor: currentColors.border,
                borderWidth: 1,
                marginBottom: 24,
                minHeight: 50,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
            onPress={handleRefreshStatus}
            disabled={loading !== null}
          >
            {loading === 'refresh' ? (
              <ActivityIndicator color={currentColors.text} size="small" />
            ) : (
              <>
                <Icon name="checkmark-circle-outline" size={20} style={{ color: currentColors.text, marginRight: 8 }} />
                <Text style={[themedButtonStyles.secondaryText, { fontSize: 16, fontWeight: '600' }]}>
                  I've Verified
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Help Text */}
        <View style={[themedStyles.card, { backgroundColor: currentColors.backgroundAlt }]}>
          <Text style={[themedStyles.textSecondary, { fontSize: 12, textAlign: 'center', lineHeight: 18 }]}>
            Didn't receive the email? Check your spam folder or try resending the verification email.
          </Text>
        </View>
      </View>
    </View>
  );
}
