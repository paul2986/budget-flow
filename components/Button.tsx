
import { Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../styles/commonStyles';
import { useTheme } from '../hooks/useTheme';

interface ButtonProps {
  text: string;
  onPress: () => void;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
  disabled?: boolean;
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.backgroundAlt,
  },
  disabled: {
    opacity: 0.6,
  },
});

export default function Button({ text, onPress, style, textStyle, disabled }: ButtonProps) {
  const { currentColors } = useTheme();
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: currentColors.primary },
        style,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.text,
        { color: currentColors.backgroundAlt },
        textStyle,
      ]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}
