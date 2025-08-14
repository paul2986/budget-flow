
import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useTheme } from '../hooks/useTheme';
import { useBiometricLock } from '../hooks/useBiometricLock';
import Icon from './Icon';

interface BiometricEnableModalProps {
  visible: boolean;
  onEnable: () => void;
  onNotNow: () => void;
}

export default function BiometricEnableModal({ visible, onEnable, onNotNow }: BiometricEnableModalProps) {
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();
  const { capabilities } = useBiometricLock();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onNotNow}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}
      >
        <View
          style={[
            themedStyles.card,
            {
              backgroundColor: currentColors.backgroundAlt,
              borderColor: currentColors.border,
              borderWidth: 1,
              width: '100%',
              maxWidth: 320,
              padding: 24,
            },
          ]}
        >
          {/* Icon */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: currentColors.primary + '20',
                borderWidth: 2,
                borderColor: currentColors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Icon
                name={
                  capabilities.biometricType === 'Face ID'
                    ? 'scan-outline'
                    : capabilities.biometricType === 'Touch ID'
                    ? 'finger-print-outline'
                    : 'shield-checkmark-outline'
                }
                size={32}
                style={{ color: currentColors.primary }}
              />
            </View>
          </View>

          {/* Title */}
          <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 12 }]}>
            Enable {capabilities.biometricType}?
          </Text>

          {/* Description */}
          <Text style={[themedStyles.textSecondary, { textAlign: 'center', marginBottom: 24, lineHeight: 20 }]}>
            Secure your budgets with {capabilities.biometricType}. You'll be able to quickly unlock the app without entering your password.
          </Text>

          {/* Buttons */}
          <View style={{ gap: 12 }}>
            {/* Enable Button */}
            <TouchableOpacity
              style={[
                themedStyles.card,
                {
                  backgroundColor: currentColors.primary,
                  borderColor: currentColors.primary,
                  borderWidth: 2,
                  minHeight: 50,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 0,
                },
              ]}
              onPress={onEnable}
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
                Enable {capabilities.biometricType}
              </Text>
            </TouchableOpacity>

            {/* Not Now Button */}
            <TouchableOpacity
              style={[
                themedStyles.card,
                {
                  backgroundColor: 'transparent',
                  borderColor: currentColors.border,
                  borderWidth: 2,
                  minHeight: 50,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 0,
                },
              ]}
              onPress={onNotNow}
            >
              <Text style={[themedStyles.text, { fontSize: 16, fontWeight: '600' }]}>
                Not Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
