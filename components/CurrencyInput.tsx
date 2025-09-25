
import React, { useState, useEffect, useRef } from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { useCurrency } from '../hooks/useCurrency';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useTheme } from '../hooks/useTheme';

interface CurrencyInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  error?: string;
  showLabel?: boolean;
  containerStyle?: any;
  inputStyle?: any;
}

export default function CurrencyInput({
  value,
  onChangeText,
  label,
  error,
  showLabel = true,
  containerStyle,
  inputStyle,
  placeholder = "0.00",
  editable = true,
  ...props
}: CurrencyInputProps) {
  const { currency } = useCurrency();
  const { themedStyles } = useThemedStyles();
  const { currentColors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Parse the numeric value from the input string
  const parseNumericValue = (text: string): number | null => {
    if (!text || text.trim() === '') return null;
    // Remove currency symbols, commas, and other non-numeric characters except decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  // Format the display value based on focus state
  useEffect(() => {
    const numericValue = parseNumericValue(value);
    
    if (isFocused) {
      // When focused, show the raw value for easy editing
      setDisplayValue(value);
    } else {
      // When not focused, show formatted number
      if (numericValue === null || numericValue === 0) {
        setDisplayValue('');
      } else {
        // Format number with commas and decimals
        setDisplayValue(numericValue.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }));
      }
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    // Show the raw value when focused for easy editing
    setDisplayValue(value);
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // Clean up the input value and update parent
    const cleaned = value.replace(/[^0-9.]/g, '');
    
    // Handle multiple decimal points - keep only the first one
    const parts = cleaned.split('.');
    let cleanedValue = parts[0];
    if (parts.length > 1) {
      cleanedValue += '.' + parts.slice(1).join('');
    }
    
    const numericValue = parseFloat(cleanedValue);
    
    if (!isNaN(numericValue) && numericValue > 0) {
      // Update the parent with the cleaned numeric string value
      onChangeText(numericValue.toString());
      // Format number with commas and decimals for display
      setDisplayValue(numericValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }));
    } else {
      onChangeText('');
      setDisplayValue('');
    }
  };

  const handleChangeText = (text: string) => {
    // When focused, allow direct input including decimals
    if (isFocused) {
      // Allow numbers, decimal point, and basic cleanup
      const cleaned = text.replace(/[^0-9.]/g, '');
      
      // Prevent multiple decimal points
      const parts = cleaned.split('.');
      let finalValue = parts[0];
      if (parts.length > 1) {
        finalValue += '.' + parts[1]; // Only keep first decimal part
      }
      
      setDisplayValue(finalValue);
      onChangeText(finalValue);
    }
  };

  return (
    <View style={containerStyle}>
      {showLabel && label && (
        <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
          {label}
        </Text>
      )}
      
      <TextInput
        ref={inputRef}
        style={[
          themedStyles.input,
          {
            fontSize: 16,
            fontWeight: '500',
            lineHeight: 20,
            textAlignVertical: 'center',
            includeFontPadding: false,
          },
          error ? { borderColor: currentColors.error } : null,
          inputStyle,
        ]}
        value={displayValue}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor={currentColors.textSecondary}
        keyboardType="decimal-pad"
        editable={editable}
        {...props}
      />
      
      {error && (
        <Text style={[
          themedStyles.textSecondary, 
          { 
            color: currentColors.error, 
            marginTop: 4,
            fontSize: 12,
          }
        ]}>
          {error}
        </Text>
      )}
    </View>
  );
}
