
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/supabase';
import Icon from '../../components/Icon';

export default function AuthCallbackScreen() {
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();
  const { showToast } = useToast();
  const { user, refreshSession } = useAuth();
  const params = useLocalSearchParams();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('AuthCallback: Processing callback with params:', params);

        // Handle OAuth callback
        if (params.access_token || params.code) {
          console.log('AuthCallback: OAuth callback detected');
          
          // Let Supabase handle the session from URL
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('AuthCallback: Session error:', error);
            showToast('Authentication failed', 'error');
            router.replace('/auth');
            return;
          }

          if (data.session?.user) {
            console.log('AuthCallback: User authenticated:', data.session.user.email);
            
            // Check if email is confirmed
            if (data.session.user.email_confirmed_at) {
              console.log('AuthCallback: Email confirmed, redirecting to home');
              showToast('Successfully signed in!', 'success');
              router.replace('/');
            } else {
              console.log('AuthCallback: Email not confirmed, redirecting to verify');
              showToast('Please verify your email address', 'info');
              router.replace('/auth/verify');
            }
          } else {
            console.log('AuthCallback: No user session found');
            showToast('Authentication failed', 'error');
            router.replace('/auth');
          }
        } else {
          console.log('AuthCallback: No auth params found, redirecting to auth');
          router.replace('/auth');
        }
      } catch (error) {
        console.error('AuthCallback: Error processing callback:', error);
        showToast('Authentication error occurred', 'error');
        router.replace('/auth');
      } finally {
        setProcessing(false);
      }
    };

    handleAuthCallback();
  }, [params, showToast]);

  // Also check current user state
  useEffect(() => {
    if (!processing && user) {
      if (user.email_confirmed_at) {
        console.log('AuthCallback: User verified, redirecting to home');
        router.replace('/');
      } else {
        console.log('AuthCallback: User not verified, redirecting to verify');
        router.replace('/auth/verify');
      }
    }
  }, [processing, user]);

  return (
    <View style={[themedStyles.container, { backgroundColor: currentColors.background, justifyContent: 'center', alignItems: 'center' }]}>
      <View style={{ alignItems: 'center' }}>
        <ActivityIndicator size="large" color={currentColors.primary} style={{ marginBottom: 16 }} />
        <Text style={[themedStyles.text, { fontSize: 16, textAlign: 'center' }]}>
          Processing authentication...
        </Text>
      </View>
    </View>
  );
}
