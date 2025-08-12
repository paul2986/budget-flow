
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import StandardHeader from '../components/StandardHeader';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../hooks/useCurrency';
import { router } from 'expo-router';
import Icon from '../components/Icon';
import Button from '../components/Button';
import * as Clipboard from 'expo-clipboard';
import { computeCreditCardPayoff } from '../utils/calculations';
import { CreditCardPayoffResult } from '../types/budget';
import { useToast } from '../hooks/useToast';

export default function ToolsScreen() {
  const { themedStyles } = useThemedStyles();
  const { currentColors } = useTheme();
  const { formatCurrency, currency } = useCurrency();
  const toast = useToast();

  const [balanceInput, setBalanceInput] = useState<string>('');
  const [aprInput, setAprInput] = useState<string>('');
  const [paymentInput, setPaymentInput] = useState<string>('');

  const [errors, setErrors] = useState<{ balance?: string; apr?: string; payment?: string }>({});
  const [result, setResult] = useState<CreditCardPayoffResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const balanceRef = useRef<TextInput>(null);
  const aprRef = useRef<TextInput>(null);
  const paymentRef = useRef<TextInput>(null);

  const parseNumber = (val: string): number | null => {
    if (typeof val !== 'string') return null;
    const cleaned = val.replace(/[^0-9.]/g, '');
    if (cleaned.trim() === '') return null;
    const num = Number(cleaned);
    if (Number.isNaN(num)) return null;
    return num;
  };

  const validate = useCallback(() => {
    const newErrors: { balance?: string; apr?: string; payment?: string } = {};
    const b = parseNumber(balanceInput);
    const a = aprInput.trim() === '' ? null : parseNumber(aprInput);
    const p = parseNumber(paymentInput);

    if (b === null || b <= 0) {
      newErrors.balance = 'Enter a positive balance.';
    }
    if (a === null || a < 0) {
      newErrors.apr = 'Enter APR as 0 or a positive percent.';
    }
    if (p === null || p <= 0) {
      newErrors.payment = 'Enter a positive monthly payment.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [balanceInput, aprInput, paymentInput]);

  const canCalculate = useMemo(() => {
    const b = parseNumber(balanceInput);
    const a = aprInput.trim() === '' ? null : parseNumber(aprInput);
    const p = parseNumber(paymentInput);
    return b !== null && b > 0 && a !== null && a >= 0 && p !== null && p > 0 && Object.keys(errors).length === 0;
  }, [balanceInput, aprInput, paymentInput, errors]);

  const onBlurCurrency = (field: 'balance' | 'payment') => {
    const value = field === 'balance' ? balanceInput : paymentInput;
    const num = parseNumber(value);
    if (num === null || num < 0) {
      // leave as-is, error will show via validate
      return;
    }
    const formatted = formatCurrency(num);
    if (field === 'balance') {
      setBalanceInput(formatted);
    } else {
      setPaymentInput(formatted);
    }
  };

  const onFocusCurrency = (field: 'balance' | 'payment') => {
    const value = field === 'balance' ? balanceInput : paymentInput;
    const num = parseNumber(value);
    if (num === null) {
      if (field === 'balance') setBalanceInput('');
      else setPaymentInput('');
      return;
    }
    const plain = num.toString();
    if (field === 'balance') setBalanceInput(plain);
    else setPaymentInput(plain);
  };

  const onBlurApr = () => {
    const num = parseNumber(aprInput);
    if (num === null || num < 0) return;
    setAprInput(num.toString());
  };

  const handleCalculate = () => {
    if (!validate()) return;

    const b = parseNumber(balanceInput) || 0;
    const a = parseNumber(aprInput) || 0;
    const p = parseNumber(paymentInput) || 0;

    const r = computeCreditCardPayoff(b, a, p);
    setResult(r);
    setShowResults(true);
    setCollapsed(false);
  };

  const handleReset = () => {
    setBalanceInput('');
    setAprInput('');
    setPaymentInput('');
    setErrors({});
    setResult(null);
    setShowResults(false);
    setCollapsed(false);
  };

  const copyResultsText = useMemo(() => {
    if (!result) return '';
    if (result.neverRepaid) {
      return `Credit Card Payoff — Never Repaid
Balance: ${formatCurrency(result.inputs.balance)}
APR: ${result.inputs.apr}%
Monthly Payment: ${formatCurrency(result.inputs.monthlyPayment)}
Only covers interest — balance will never be repaid.`;
    }
    const header = `Credit Card Payoff Results
Balance: ${formatCurrency(result.inputs.balance)}
APR: ${result.inputs.apr}%
Monthly Payment: ${formatCurrency(result.inputs.monthlyPayment)}
Months to Payoff: ${result.months}
Total Interest Paid: ${formatCurrency(result.totalInterest)}`;
    const scheduleLines = result.schedule.map((row) => {
      return `Month ${row.month}: Payment ${formatCurrency(row.payment)}, Interest ${formatCurrency(row.interest)}, Principal ${formatCurrency(row.principal)}, Remaining ${formatCurrency(row.remaining)}`;
    });
    return [header, '', 'First 3 Months:', ...scheduleLines].join('\n');
  }, [result, formatCurrency]);

  const handleCopy = async () => {
    if (!result) return;
    try {
      await Clipboard.setStringAsync(copyResultsText);
      toast.show('Results copied to clipboard', { type: 'success' });
    } catch (e) {
      console.log('Copy error', e);
      toast.show('Failed to copy', { type: 'error' });
    }
  };

  const renderCalculatorCard = () => (
    <View style={themedStyles.card}>
      <View style={[styles.labelRow, { marginBottom: 8 }]}>
        <Text style={[themedStyles.text, styles.labelText]}>Balance</Text>
        <TouchableOpacity
          onPress={() => balanceRef.current?.focus()}
          style={{ display: 'contents' as any }}
          accessibilityLabel="Focus balance input"
        >
          <Icon name="create-outline" size={16} style={{ color: currentColors.textSecondary }} />
        </TouchableOpacity>
      </View>
      <TextInput
        ref={balanceRef}
        value={balanceInput}
        onChangeText={(t) => {
          setBalanceInput(t);
        }}
        onFocus={() => onFocusCurrency('balance')}
        onBlur={() => {
          onBlurCurrency('balance');
          validate();
        }}
        keyboardType={Platform.select({ ios: 'decimal-pad', android: 'decimal-pad', default: 'numeric' })}
        placeholder={`${currency.symbol}0.00`}
        placeholderTextColor={currentColors.textSecondary}
        style={[
          themedStyles.input,
          errors.balance ? { borderColor: currentColors.error } : null,
        ]}
        accessibilityLabel="Balance amount"
      />
      {!!errors.balance && <Text style={[themedStyles.textSecondary, { color: currentColors.error, marginTop: -10, marginBottom: 8 }]}>{errors.balance}</Text>}

      <View style={[styles.labelRow, { marginBottom: 8 }]}>
        <Text style={[themedStyles.text, styles.labelText]}>APR %</Text>
        <TouchableOpacity
          onPress={() => aprRef.current?.focus()}
          style={{ display: 'contents' as any }}
          accessibilityLabel="Focus APR input"
        >
          <Icon name="create-outline" size={16} style={{ color: currentColors.textSecondary }} />
        </TouchableOpacity>
      </View>
      <TextInput
        ref={aprRef}
        value={aprInput}
        onChangeText={(t) => setAprInput(t.replace(/,/g, '.'))}
        onBlur={() => {
          onBlurApr();
          validate();
        }}
        keyboardType={Platform.select({ ios: 'decimal-pad', android: 'decimal-pad', default: 'numeric' })}
        placeholder="18.99"
        placeholderTextColor={currentColors.textSecondary}
        style={[
          themedStyles.input,
          errors.apr ? { borderColor: currentColors.error } : null,
        ]}
        accessibilityLabel="APR percent"
      />
      {!!errors.apr && <Text style={[themedStyles.textSecondary, { color: currentColors.error, marginTop: -10, marginBottom: 8 }]}>{errors.apr}</Text>}

      <View style={[styles.labelRow, { marginBottom: 8 }]}>
        <Text style={[themedStyles.text, styles.labelText]}>Monthly Payment</Text>
        <TouchableOpacity
          onPress={() => paymentRef.current?.focus()}
          style={{ display: 'contents' as any }}
          accessibilityLabel="Focus monthly payment input"
        >
          <Icon name="create-outline" size={16} style={{ color: currentColors.textSecondary }} />
        </TouchableOpacity>
      </View>
      <TextInput
        ref={paymentRef}
        value={paymentInput}
        onChangeText={(t) => setPaymentInput(t)}
        onFocus={() => onFocusCurrency('payment')}
        onBlur={() => {
          onBlurCurrency('payment');
          validate();
        }}
        keyboardType={Platform.select({ ios: 'decimal-pad', android: 'decimal-pad', default: 'numeric' })}
        placeholder={`${currency.symbol}0.00`}
        placeholderTextColor={currentColors.textSecondary}
        style={[
          themedStyles.input,
          errors.payment ? { borderColor: currentColors.error } : null,
        ]}
        accessibilityLabel="Monthly payment amount"
      />
      {!!errors.payment && <Text style={[themedStyles.textSecondary, { color: currentColors.error, marginTop: -10, marginBottom: 8 }]}>{errors.payment}</Text>}

      <Button text="Calculate" onPress={handleCalculate} disabled={!canCalculate} />
    </View>
  );

  const renderResults = () => {
    if (!showResults) return null;

    const never = result?.neverRepaid;

    return (
      <View style={themedStyles.card}>
        <TouchableOpacity
          onPress={() => setCollapsed((c) => !c)}
          style={[styles.resultsHeader, { minHeight: 44 }]}
          accessibilityLabel="Toggle results panel"
        >
          <View style={{ display: 'contents' as any }}>
            <Text style={[themedStyles.text, { fontWeight: '700' }]}>Results</Text>
          </View>
          <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size={20} style={{ color: currentColors.textSecondary }} />
        </TouchableOpacity>

        {!collapsed && (
          <>
            {never && (
              <View
                style={{
                  backgroundColor: currentColors.warning + '20',
                  borderColor: currentColors.warning,
                  borderWidth: 2,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="warning" size={20} style={{ color: currentColors.warning, marginRight: 8 }} />
                  <Text style={[themedStyles.text, { color: currentColors.warning, fontWeight: '700' }]}>
                    Only covers interest — balance will never be repaid.
                  </Text>
                </View>
              </View>
            )}

            {!never && result && (
              <>
                <View style={{ marginBottom: 12 }}>
                  <View style={[themedStyles.row, { marginBottom: 6 }]}>
                    <Text style={themedStyles.text}>Months to Payoff</Text>
                    <Text style={[themedStyles.text, { fontWeight: '700' }]}>{result.months}</Text>
                  </View>
                  <View style={themedStyles.row}>
                    <Text style={themedStyles.text}>Total Interest Paid</Text>
                    <Text style={[themedStyles.text, { fontWeight: '700' }]}>{formatCurrency(result.totalInterest)}</Text>
                  </View>
                </View>

                <View style={{ borderTopColor: currentColors.border, borderTopWidth: 1, paddingTop: 12 }}>
                  <Text style={[themedStyles.text, { fontWeight: '700', marginBottom: 8 }]}>First 3 Months</Text>
                  <View style={[styles.tableHeader, { borderBottomColor: currentColors.border }]}>
                    <Text style={[styles.th, themedStyles.textSecondary]}>Month</Text>
                    <Text style={[styles.th, themedStyles.textSecondary]}>Payment</Text>
                    <Text style={[styles.th, themedStyles.textSecondary]}>Interest</Text>
                    <Text style={[styles.th, themedStyles.textSecondary]}>Principal</Text>
                    <Text style={[styles.th, themedStyles.textSecondary]}>Remaining</Text>
                  </View>
                  {result.schedule.map((row) => (
                    <View key={row.month} style={[styles.tableRow, { borderBottomColor: currentColors.border }]}>
                      <Text style={[styles.td, themedStyles.text]}>{row.month}</Text>
                      <Text style={[styles.td, themedStyles.text]}>{formatCurrency(row.payment)}</Text>
                      <Text style={[styles.td, themedStyles.text]}>{formatCurrency(row.interest)}</Text>
                      <Text style={[styles.td, themedStyles.text]}>{formatCurrency(row.principal)}</Text>
                      <Text style={[styles.td, themedStyles.text]}>{formatCurrency(row.remaining)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <View style={{ marginTop: 16, flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={handleReset}
                  style={[
                    themedStyles.card,
                    {
                      backgroundColor: currentColors.border + '20',
                      borderColor: currentColors.border,
                      borderWidth: 2,
                      minHeight: 44,
                      paddingVertical: 10,
                    },
                  ]}
                  accessibilityLabel="Reset calculator"
                >
                  <Text style={[themedStyles.text, { textAlign: 'center', fontWeight: '700' }]}>Reset</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={handleCopy}
                  disabled={!result}
                  style={[
                    themedStyles.card,
                    {
                      backgroundColor: result ? currentColors.secondary : currentColors.textSecondary,
                      borderColor: result ? currentColors.secondary : currentColors.textSecondary,
                      borderWidth: 2,
                      minHeight: 44,
                      paddingVertical: 10,
                    },
                  ]}
                  accessibilityLabel="Copy results"
                >
                  <Text style={[themedStyles.text, { textAlign: 'center', fontWeight: '700', color: '#FFFFFF' }]}>Copy Results</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <View style={themedStyles.container}>
      <StandardHeader
        title="Tools"
        showLeftIcon={false}
        showRightIcon={false}
      />
      <ScrollView style={themedStyles.content} contentContainerStyle={themedStyles.scrollContent}>
        <View style={themedStyles.section}>
          <View
            style={[
              themedStyles.card,
              {
                backgroundColor: currentColors.primary + '12',
                borderColor: currentColors.primary + '35',
                borderWidth: 2,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Icon name="calculator" size={22} style={{ color: currentColors.primary, marginRight: 8 }} />
              <Text style={[themedStyles.text, { fontWeight: '800' }]}>Credit Card Payoff Calculator</Text>
            </View>

            {renderCalculatorCard()}
          </View>
        </View>

        {renderResults()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelText: {
    fontWeight: '700',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  th: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  td: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
});
