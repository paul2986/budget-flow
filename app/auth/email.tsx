
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import StandardHeader from '../../components/StandardHeader';

type TabType = 'signup' | 'signin';

export default function EmailAuthScreen() {
  const { currentColors } = useTheme();
  const { themedStyles, themedButtonStyles } = useThemedStyles();
  const { showToast } = useToast();
  const { signUpWithEmail, signInWithEmail } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    if (!email.trim()) {
      showToast('Please enter your email address', 'error');
      return false;
    }

    if (!validateEmail(email)) {
      showToast('Please enter a valid email address', 'error');
      return false;
    }

    if (!password.trim()) {
      showToast('Please enter your password', 'error');
      return false;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return false;
    }

    if (activeTab === 'signup') {
      if (!confirmPassword.trim()) {
        showToast('Please confirm your password', 'error');
        return false;
      }

      if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      let result;
      
      if (activeTab === 'signup') {
        result = await signUpWithEmail(email.trim(), password);
        if (result.success) {
          showToast(result.message, 'success');
          router.replace('/auth/verify');
        } else {
          showToast(result.message, 'error');
        }
      } else {
        result = await signInWithEmail(email.trim(), password);
        if (result.success) {
          showToast(result.message, 'success');
          router.replace('/');
        } else {
          showToast(result.message, 'error');
          // If email not confirmed, redirect to verify screen
          if (result.message.toLowerCase().includes('email') && result.message.toLowerCase().includes('confirm')) {
            router.replace('/auth/verify');
          }
        }
      }
    } catch (error) {
      console.error('Auth: Email auth error:', error);
      showToast('An unexpected error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
      <StandardHeader 
        title="Email Authentication" 
        showLeftIcon={true} 
        leftIcon="arrow-back" 
        onLeftPress={() => router.back()}
        showRightIcon={false}
      />

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={themedStyles.content} contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
            {/* Tab Selector */}
            <View style={[
              themedStyles.row,
              {
                backgroundColor: currentColors.backgroundAlt,
                borderRadius: 12,
                padding: 4,
                marginBottom: 32,
              }
            ]}>
              <TouchableOpacity
                style={[
                  {
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  },
                  activeTab === 'signup' && {
                    backgroundColor: currentColors.primary,
                  }
                ]}
                onPress={() => setActiveTab('signup')}
              >
                <Text style={[
                  themedStyles.text,
                  { fontWeight: '600' },
                  activeTab === 'signup' && { color: '#fff' }
                ]}>
                  Sign Up
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  {
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  },
                  activeTab === 'signin' && {
                    backgroundColor: currentColors.primary,
                  }
                ]}
                onPress={() => setActiveTab('signin')}
              >
                <Text style={[
                  themedStyles.text,
                  { fontWeight: '600' },
                  activeTab === 'signin' && { color: '#fff' }
                ]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={{ marginBottom: 32 }}>
              {/* Email Input */}
              <View style={{ marginBottom: 16 }}>
                <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
                  Email Address
                </Text>
                <View style={[
                  themedStyles.card,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: currentColors.border,
                  }
                ]}>
                  <Icon name="mail-outline" size={20} style={{ color: currentColors.textSecondary, marginRight: 12 }} />
                  <TextInput
                    style={[
                      themedStyles.text,
                      { flex: 1, fontSize: 16 }
                    ]}
                    placeholder="Enter your email"
                    placeholderTextColor={currentColors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={{ marginBottom: activeTab === 'signup' ? 16 : 0 }}>
                <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
                  Password
                </Text>
                <View style={[
                  themedStyles.card,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: currentColors.border,
                  }
                ]}>
                  <Icon name="lock-closed-outline" size={20} style={{ color: currentColors.textSecondary, marginRight: 12 }} />
                  <TextInput
                    style={[
                      themedStyles.text,
                      { flex: 1, fontSize: 16 }
                    ]}
                    placeholder="Enter your password"
                    placeholderTextColor={currentColors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Icon 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      style={{ color: currentColors.textSecondary }} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Input (Sign Up only) */}
              {activeTab === 'signup' && (
                <View style={{ marginBottom: 0 }}>
                  <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
                    Confirm Password
                  </Text>
                  <View style={[
                    themedStyles.card,
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderWidth: 1,
                      borderColor: currentColors.border,
                    }
                  ]}>
                    <Icon name="lock-closed-outline" size={20} style={{ color: currentColors.textSecondary, marginRight: 12 }} />
                    <TextInput
                      style={[
                        themedStyles.text,
                        { flex: 1, fontSize: 16 }
                      ]}
                      placeholder="Confirm your password"
                      placeholderTextColor={currentColors.textSecondary}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Icon 
                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        style={{ color: currentColors.textSecondary }} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Submit Button */}
            <Button
              text={loading ? '' : (activeTab === 'signup' ? 'Create Account' : 'Sign In')}
              onPress={handleSubmit}
              disabled={loading}
              style={[
                themedButtonStyles.primary,
                { minHeight: 50, marginBottom: 16 }
              ]}
              icon={loading ? <ActivityIndicator color="#fff" size="small" /> : undefined}
            />

            {/* Info Text */}
            {activeTab === 'signup' && (
              <View style={[themedStyles.card, { backgroundColor: currentColors.backgroundAlt, marginBottom: 16 }]}>
                <View style={themedStyles.rowStart}>
                  <Icon name="information-circle-outline" size={20} style={{ color: currentColors.primary, marginRight: 8 }} />
                  <Text style={[themedStyles.textSecondary, { flex: 1, fontSize: 14 }]}>
                    You'll need to verify your email address before you can access your budgets.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
