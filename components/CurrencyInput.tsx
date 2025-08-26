
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
      // When focused, show plain number for easy editing
      if (numericValue === null || numericValue === 0) {
        setDisplayValue('');
      } else {
        setDisplayValue(numericValue.toString());
      }
    } else {
      // When not focused, show formatted number without currency symbol (since we have overlay)
      if (numericValue === null || numericValue === 0) {
        setDisplayValue('');
      } else {
        // Format number with commas and decimals but without currency symbol
        setDisplayValue(numericValue.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }));
      }
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    const numericValue = parseNumericValue(value);
    if (numericValue !== null && numericValue !== 0) {
      setDisplayValue(numericValue.toString());
    } else {
      setDisplayValue('');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const numericValue = parseNumericValue(displayValue);
    if (numericValue !== null && numericValue > 0) {
      // Update the parent with the numeric string value
      onChangeText(numericValue.toString());
      // Format number with commas and decimals but without currency symbol (since we have overlay)
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
    setDisplayValue(text);
    // When focused, immediately update parent with the raw input
    if (isFocused) {
      onChangeText(text);
    }
  };

  return (
    <View style={containerStyle}>
      {showLabel && label && (
        <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
          {label}
        </Text>
      )}
      
      <View style={{ position: 'relative' }}>
        {/* Currency symbol overlay - positioned to align with text baseline */}
        <View style={{
          position: 'absolute',
          left: 16,
          top: 0,
          bottom: 0,
          justifyContent: 'center', // Center vertically within the input height
          zIndex: 1,
          pointerEvents: 'none',
        }}>
          <Text style={[
            themedStyles.text,
            { 
              color: displayValue === '' ? currentColors.textSecondary : currentColors.text,
              fontSize: 16,
              fontWeight: '500',
              lineHeight: 24, // Match the text input's line height for proper alignment
            }
          ]}>
            {currency.symbol}
          </Text>
        </View>
        
        <TextInput
          ref={inputRef}
          style={[
            themedStyles.input,
            {
              paddingLeft: 40, // Always make room for currency symbol
              lineHeight: 24, // Ensure consistent line height
              textAlignVertical: 'center', // Center text vertically on Android
              includeFontPadding: false, // Remove extra font padding on Android
            },
            error ? { borderColor: currentColors.error } : null,
            inputStyle,
          ]}
          value={displayValue}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder} // Remove currency symbol from placeholder to avoid duplication
          placeholderTextColor={currentColors.textSecondary}
          keyboardType="numeric"
          editable={editable}
          {...props}
        />
      </View>
      
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
