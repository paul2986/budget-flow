
import { useTheme } from '../hooks/useTheme';
import { colors } from '../styles/commonStyles';
import { Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';

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
    marginTop: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function Button({ text, onPress, style, textStyle, disabled }: ButtonProps) {
  const { currentColors } = useTheme();
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        style,
        disabled && { opacity: 0.6 }
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <Text style={[
        styles.text,
        { color: currentColors.backgroundAlt },
        textStyle,
        disabled && { color: currentColors.textSecondary }
      ]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}
