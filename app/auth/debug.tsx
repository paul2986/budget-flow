
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useBiometricLock } from '../../hooks/useBiometricLock';
import Icon from '../../components/Icon';
import StandardHeader from '../../components/StandardHeader';
import * as LocalAuthentication from 'expo-local-authentication';

export default function AuthDebugScreen() {
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();
  const { session, user } = useAuth();
  const { capabilities, settings, testBiometricAuth, simpleAuthenticate, resetBiometricSetup } = useBiometricLock();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadDebugInfo = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current authentication capabilities
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
      
      const info = {
        session: {
          exists: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          emailConfirmed: session?.user?.email_confirmed_at,
          expiresAt: session?.expires_at,
        },
        user: {
          exists: !!user,
          id: user?.id,
          email: user?.email,
          emailConfirmed: user?.email_confirmed_at,
        },
        biometric: {
          capabilities,
          settings,
          realTime: {
            isAvailable,
            isEnrolled,
            supportedTypes,
            securityLevel,
          },
        },
        timestamp: new Date().toISOString(),
      };
      
      setDebugInfo(info);
    } catch (error) {
      console.error('Debug: Error loading info:', error);
      Alert.alert('Error', 'Failed to load debug information');
    } finally {
      setLoading(false);
    }
  }, [session, user, capabilities, settings]);

  useEffect(() => {
    loadDebugInfo();
  }, [loadDebugInfo]);

  const runBiometricTest = async () => {
    try {
      setLoading(true);
      const result = await testBiometricAuth();
      
      Alert.alert(
        'Biometric Test Result',
        `Success: ${result.success}\n\nMessage: ${result.message}\n\nDetails:\n${JSON.stringify(result.details, null, 2)}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Test Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const runSimpleAuth = async () => {
    try {
      setLoading(true);
      const result = await simpleAuthenticate();
      
      Alert.alert(
        'Simple Auth Result',
        `Success: ${result.success}\n\nMessage: ${result.message}`,
        [
          { text: 'OK' },
          ...(result.success ? [{ text: 'Go to Home', onPress: () => router.replace('/') }] : [])
        ]
      );
    } catch (error) {
      Alert.alert('Auth Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetBiometric = async () => {
    Alert.alert(
      'Reset Biometric Setup',
      'This will reset all biometric settings. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await resetBiometricSetup();
              Alert.alert('Reset Result', result.message);
              await loadDebugInfo();
            } catch (error) {
              Alert.alert('Reset Error', (error as Error).message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
      <StandardHeader title="Auth Debug" showBack />
      
      <ScrollView style={themedStyles.content} contentContainerStyle={{ padding: 16 }}>
        {/* Refresh Button */}
        <TouchableOpacity
          style={[
            themedStyles.card,
            {
              backgroundColor: currentColors.primary,
              marginBottom: 16,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
          onPress={loadDebugInfo}
          disabled={loading}
        >
          <Icon name="refresh" size={20} style={{ color: '#fff', marginRight: 8 }} />
          <Text style={[themedStyles.text, { color: '#fff', fontWeight: '600' }]}>
            Refresh Debug Info
          </Text>
        </TouchableOpacity>

        {/* Test Buttons */}
        <View style={{ marginBottom: 24 }}>
          <Text style={[themedStyles.subtitle, { marginBottom: 12 }]}>Test Functions</Text>
          
          <TouchableOpacity
            style={[
              themedStyles.card,
              {
                backgroundColor: currentColors.secondary,
                marginBottom: 8,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
            onPress={runBiometricTest}
            disabled={loading}
          >
            <Icon name="finger-print" size={16} style={{ color: '#fff', marginRight: 8 }} />
            <Text style={[themedStyles.text, { color: '#fff' }]}>Test Biometric Auth</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              themedStyles.card,
              {
                backgroundColor: currentColors.success || '#4CAF50',
                marginBottom: 8,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
            onPress={runSimpleAuth}
            disabled={loading}
          >
            <Icon name="scan" size={16} style={{ color: '#fff', marginRight: 8 }} />
            <Text style={[themedStyles.text, { color: '#fff' }]}>Simple Auth Test</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              themedStyles.card,
              {
                backgroundColor: currentColors.error,
                marginBottom: 8,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
            onPress={resetBiometric}
            disabled={loading}
          >
            <Icon name="trash" size={16} style={{ color: '#fff', marginRight: 8 }} />
            <Text style={[themedStyles.text, { color: '#fff' }]}>Reset Biometric Setup</Text>
          </TouchableOpacity>
        </View>

        {/* Debug Information */}
        {debugInfo && (
          <View style={[themedStyles.card, { padding: 16 }]}>
            <Text style={[themedStyles.subtitle, { marginBottom: 12 }]}>Debug Information</Text>
            
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={[themedStyles.text, { fontFamily: 'monospace', fontSize: 12 }]}>
                {JSON.stringify(debugInfo, null, 2)}
              </Text>
            </ScrollView>
          </View>
        )}

        {loading && (
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <Text style={themedStyles.textSecondary}>Loading...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
