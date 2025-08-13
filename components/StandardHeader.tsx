
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import Icon from './Icon';

interface StandardHeaderProps {
  title: string;
  subtitle?: string;
  leftIcon?: string;
  rightIcon?: string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  loading?: boolean;
  rightIconColor?: string;
  leftIconColor?: string;
  showRightIcon?: boolean;
  showLeftIcon?: boolean;
}

export default function StandardHeader({
  title,
  subtitle,
  leftIcon = 'arrow-back',
  rightIcon = 'add',
  onLeftPress,
  onRightPress,
  loading = false,
  rightIconColor,
  leftIconColor,
  showRightIcon = true,
  showLeftIcon = true,
}: StandardHeaderProps) {
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();

  const defaultRightIconColor = rightIconColor || '#FFFFFF';
  const defaultLeftIconColor = leftIconColor || currentColors.text;

  return (
    <View style={[themedStyles.header, { height: subtitle ? 76 : 64, boxShadow: '0px 1px 2px rgba(0,0,0,0.10)' }]}>
      {/* Left side */}
      <View style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' }}>
        {showLeftIcon && onLeftPress ? (
          <TouchableOpacity
            onPress={onLeftPress}
            disabled={loading}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: currentColors.border + '40',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Icon name={leftIcon} size={24} style={{ color: defaultLeftIconColor }} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* Center title + optional subtitle */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={[themedStyles.headerTitle, { textAlign: 'center', lineHeight: 22 }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[themedStyles.textSecondary, { marginTop: 2, fontSize: 12 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right side */}
      <View style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-end' }}>
        {showRightIcon && onRightPress ? (
          <TouchableOpacity
            onPress={onRightPress}
            disabled={loading}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: rightIcon === 'checkmark' ? '#22C55E' : currentColors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0px 2px 4px rgba(0,0,0,0.20)',
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={rightIcon === 'checkmark' ? '#FFFFFF' : defaultRightIconColor} />
            ) : (
              <Icon 
                name={rightIcon} 
                size={24} 
                style={{ color: rightIcon === 'checkmark' ? '#FFFFFF' : defaultRightIconColor }} 
              />
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>
    </View>
  );
}
