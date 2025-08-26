
import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, View, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface ButtonProps {
  text?: string;
  title?: string; // For backward compatibility
  onPress: () => void;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
}

export default function Button({ 
  text, 
  title,
  onPress, 
  style, 
  textStyle, 
  disabled, 
  loading,
  icon, 
  variant = 'primary' 
}: ButtonProps) {
  const { currentColors, isDarkMode } = useTheme();

  // Use text prop first, then title for backward compatibility
  const buttonText = text || title || '';

  console.log('Button: Rendering button with text:', buttonText, 'disabled:', disabled, 'loading:', loading, 'variant:', variant);

  const handlePress = () => {
    console.log('Button: Button pressed:', buttonText, 'disabled:', disabled, 'loading:', loading);
    if (!disabled && !loading && onPress) {
      console.log('Button: Calling onPress for:', buttonText);
      onPress();
    } else {
      console.log('Button: onPress not called - disabled:', disabled, 'loading:', loading, 'onPress exists:', !!onPress);
    }
  };

  // Get button colors based on variant and theme
  const getButtonColors = () => {
    if (disabled || loading) {
      return {
        backgroundColor: currentColors.textSecondary + '40',
        borderColor: currentColors.textSecondary + '40',
        textColor: currentColors.textSecondary,
      };
    }

    switch (variant) {
      case 'primary':
        return {
          backgroundColor: currentColors.primary,
          borderColor: currentColors.primary,
          textColor: '#FFFFFF',
        };
      case 'secondary':
        return {
          backgroundColor: currentColors.secondary,
          borderColor: currentColors.secondary,
          textColor: '#FFFFFF',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: currentColors.primary,
          textColor: currentColors.primary,
        };
      case 'danger':
        return {
          backgroundColor: currentColors.error,
          borderColor: currentColors.error,
          textColor: '#FFFFFF',
        };
      default:
        return {
          backgroundColor: currentColors.primary,
          borderColor: currentColors.primary,
          textColor: '#FFFFFF',
        };
    }
  };

  const buttonColors = getButtonColors();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { 
          backgroundColor: buttonColors.backgroundColor,
          borderColor: buttonColors.borderColor,
          opacity: (disabled || loading) ? 0.6 : 1,
        },
        style
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={buttonText}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color={buttonColors.textColor} 
            style={buttonText ? styles.loadingWithText : undefined}
          />
        ) : (
          icon && (
            <View style={styles.iconContainer}>
              {icon}
            </View>
          )
        )}
        {buttonText ? (
          <Text 
            style={[
              styles.text, 
              { 
                color: buttonColors.textColor,
              },
              textStyle
            ]}
          >
            {buttonText}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  loadingWithText: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
