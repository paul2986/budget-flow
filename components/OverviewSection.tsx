
import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../hooks/useCurrency';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { calculateMonthlyAmount } from '../utils/calculations';
import Icon from './Icon';
import { Person, Expense, HouseholdSettings } from '../types/budget';

interface OverviewSectionProps {
  calculations: {
    totalIncome: number;
    totalExpenses: number;
    householdExpenses: number;
    personalExpenses: number;
    remaining: number;
  };
  people: Person[];
  expenses: Expense[];
  householdSettings?: HouseholdSettings;
}

type ViewMode = 'monthly' | 'yearly';

export default function OverviewSection({ 
  calculations, 
  people, 
  expenses, 
  householdSettings 
}: OverviewSectionProps) {
  const { currentColors } = useTheme();
  const { formatCurrency } = useCurrency();
  const { themedStyles } = useThemedStyles();
  
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');

  const displayValues = useMemo(() => {
    if (viewMode === 'monthly') {
      return {
        totalIncome: calculateMonthlyAmount(calculations.totalIncome, 'yearly'),
        totalExpenses: calculateMonthlyAmount(calculations.totalExpenses, 'yearly'),
        householdExpenses: calculateMonthlyAmount(calculations.householdExpenses, 'yearly'),
        personalExpenses: calculateMonthlyAmount(calculations.personalExpenses, 'yearly'),
        remaining: calculateMonthlyAmount(calculations.remaining, 'yearly'),
      };
    }
    return calculations;
  }, [calculations, viewMode]);

  const TabButton = ({ mode, label }: { mode: ViewMode; label: string }) => (
    <TouchableOpacity
      onPress={() => setViewMode(mode)}
      style={[
        {
          flex: 1,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: viewMode === mode ? currentColors.primary : 'transparent',
          borderWidth: 1,
          borderColor: viewMode === mode ? currentColors.primary : currentColors.border,
          alignItems: 'center',
        },
      ]}
    >
      <Text
        style={[
          themedStyles.text,
          {
            color: viewMode === mode ? '#fff' : currentColors.text,
            fontWeight: '600',
            fontSize: 14,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[themedStyles.card, { marginBottom: 0 }]}>
      {/* Tabs */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        <TabButton mode="monthly" label="Monthly" />
        <TabButton mode="yearly" label="Yearly" />
      </View>

      {/* Income and Expenses Cards */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <View style={[
          themedStyles.card, 
          { 
            flex: 1, 
            backgroundColor: currentColors.success + '10',
            borderColor: currentColors.success + '30',
            borderWidth: 1,
            marginBottom: 0,
          }
        ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Icon name="trending-up" size={16} style={{ color: currentColors.success, marginRight: 6 }} />
            <Text style={[themedStyles.textSecondary, { fontSize: 12, fontWeight: '600' }]}>
              {viewMode.toUpperCase()} INCOME
            </Text>
          </View>
          <Text style={[
            themedStyles.text, 
            { 
              fontSize: 20, 
              fontWeight: '700', 
              color: currentColors.success 
            }
          ]}>
            {formatCurrency(displayValues.totalIncome)}
          </Text>
        </View>

        <View style={[
          themedStyles.card, 
          { 
            flex: 1, 
            backgroundColor: currentColors.error + '10',
            borderColor: currentColors.error + '30',
            borderWidth: 1,
            marginBottom: 0,
          }
        ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Icon name="trending-down" size={16} style={{ color: currentColors.error, marginRight: 6 }} />
            <Text style={[themedStyles.textSecondary, { fontSize: 12, fontWeight: '600' }]}>
              {viewMode.toUpperCase()} EXPENSES
            </Text>
          </View>
          <Text style={[
            themedStyles.text, 
            { 
              fontSize: 20, 
              fontWeight: '700', 
              color: currentColors.error 
            }
          ]}>
            {formatCurrency(displayValues.totalExpenses)}
          </Text>
        </View>
      </View>

      {/* Remaining Balance */}
      <View style={[
        themedStyles.card,
        {
          backgroundColor: displayValues.remaining >= 0 
            ? currentColors.success + '15' 
            : currentColors.error + '15',
          borderColor: displayValues.remaining >= 0 
            ? currentColors.success + '40' 
            : currentColors.error + '40',
          borderWidth: 2,
          marginBottom: 16,
        }
      ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Icon 
            name={displayValues.remaining >= 0 ? "checkmark-circle" : "alert-circle"} 
            size={20} 
            style={{ 
              color: displayValues.remaining >= 0 ? currentColors.success : currentColors.error, 
              marginRight: 8 
            }} 
          />
          <Text style={[themedStyles.textSecondary, { fontSize: 12, fontWeight: '600' }]}>
            {viewMode.toUpperCase()} REMAINING
          </Text>
        </View>
        <Text style={[
          themedStyles.text, 
          { 
            fontSize: 28, 
            fontWeight: '800',
            color: displayValues.remaining >= 0 ? currentColors.success : currentColors.error
          }
        ]}>
          {formatCurrency(displayValues.remaining)}
        </Text>
        {displayValues.remaining < 0 && (
          <Text style={[themedStyles.textSecondary, { fontSize: 12, marginTop: 4 }]}>
            Over budget by {formatCurrency(Math.abs(displayValues.remaining))}
          </Text>
        )}
      </View>

      {/* Expense Breakdown */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[
          themedStyles.card, 
          { 
            flex: 1, 
            backgroundColor: currentColors.household + '10',
            borderColor: currentColors.household + '30',
            borderWidth: 1,
            marginBottom: 0,
          }
        ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Icon name="home" size={14} style={{ color: currentColors.household, marginRight: 6 }} />
            <Text style={[themedStyles.textSecondary, { fontSize: 11, fontWeight: '600' }]}>
              HOUSEHOLD
            </Text>
          </View>
          <Text style={[
            themedStyles.text, 
            { 
              fontSize: 16, 
              fontWeight: '700', 
              color: currentColors.household 
            }
          ]}>
            {formatCurrency(displayValues.householdExpenses)}
          </Text>
        </View>

        <View style={[
          themedStyles.card, 
          { 
            flex: 1, 
            backgroundColor: currentColors.personal + '10',
            borderColor: currentColors.personal + '30',
            borderWidth: 1,
            marginBottom: 0,
          }
        ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Icon name="person" size={14} style={{ color: currentColors.personal, marginRight: 6 }} />
            <Text style={[themedStyles.textSecondary, { fontSize: 11, fontWeight: '600' }]}>
              PERSONAL
            </Text>
          </View>
          <Text style={[
            themedStyles.text, 
            { 
              fontSize: 16, 
              fontWeight: '700', 
              color: currentColors.personal 
            }
          ]}>
            {formatCurrency(displayValues.personalExpenses)}
          </Text>
        </View>
      </View>
    </View>
  );
}
