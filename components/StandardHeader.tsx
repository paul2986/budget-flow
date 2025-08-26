
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import Icon from './Icon';

interface HeaderButton {
  icon: string;
  onPress: () => void;
  backgroundColor?: string;
  iconColor?: string;
}

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
  rightButtons?: HeaderButton[]; // Optional multiple right buttons
  leftButtons?: HeaderButton[]; // Optional multiple left buttons
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
  rightButtons,
  leftButtons,
}: StandardHeaderProps) {
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();

  const defaultRightIconColor = rightIconColor || '#FFFFFF';
  const defaultLeftIconColor = leftIconColor || currentColors.text;

  // Calculate the width needed for left and right button areas to ensure title centering
  const leftButtonsCount = leftButtons?.length || (showLeftIcon && onLeftPress ? 1 : 0);
  const rightButtonsCount = rightButtons?.length || (showRightIcon && onRightPress ? 1 : 0);
  
  // Each button is 44px wide with 8px margin between them
  const leftButtonsWidth = leftButtonsCount > 0 ? (leftButtonsCount * 44) + ((leftButtonsCount - 1) * 8) : 44;
  const rightButtonsWidth = rightButtonsCount > 0 ? (rightButtonsCount * 44) + ((rightButtonsCount - 1) * 8) : 44;
  
  // Use the larger of the two widths to ensure symmetry
  const sideWidth = Math.max(leftButtonsWidth, rightButtonsWidth);

  return (
    <View style={[themedStyles.header, { height: subtitle ? 76 : 64, boxShadow: '0px 1px 2px rgba(0,0,0,0.10)' }]}>
      {/* Left side - supports multiple left buttons */}
      <View style={{ width: sideWidth, height: 44, justifyContent: 'center', alignItems: 'flex-start', flexDirection: 'row' }}>
        {leftButtons && leftButtons.length > 0 ? (
          leftButtons.map((btn, idx) => (
            <TouchableOpacity
              key={`hlb_${idx}`}
              onPress={btn.onPress}
              disabled={loading}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: btn.backgroundColor || currentColors.border + '40',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: idx < leftButtons.length - 1 ? 8 : 0,
                boxShadow: '0px 2px 4px rgba(0,0,0,0.15)',
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={btn.iconColor || currentColors.text} />
              ) : (
                <Icon name={btn.icon as any} size={22} style={{ color: btn.iconColor || currentColors.text }} />
              )}
            </TouchableOpacity>
          ))
        ) : showLeftIcon && onLeftPress ? (
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
            <Icon name={leftIcon as any} size={24} style={{ color: defaultLeftIconColor }} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Center title + optional subtitle - now properly centered */}
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

      {/* Right side - supports multiple header buttons */}
      <View style={{ width: sideWidth, height: 44, justifyContent: 'center', alignItems: 'flex-end', flexDirection: 'row' }}>
        {rightButtons && rightButtons.length > 0 ? (
          rightButtons.map((btn, idx) => (
            <TouchableOpacity
              key={`hrb_${idx}`}
              onPress={btn.onPress}
              disabled={loading}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: btn.backgroundColor || currentColors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: idx > 0 ? 8 : 0,
                boxShadow: '0px 2px 4px rgba(0,0,0,0.20)',
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={btn.iconColor || '#FFFFFF'} />
              ) : (
                <Icon name={btn.icon as any} size={22} style={{ color: btn.iconColor || '#FFFFFF' }} />
              )}
            </TouchableOpacity>
          ))
        ) : showRightIcon && onRightPress ? (
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
                name={rightIcon as any}
                size={24}
                style={{ color: rightIcon === 'checkmark' ? '#FFFFFF' : defaultRightIconColor }}
              />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
