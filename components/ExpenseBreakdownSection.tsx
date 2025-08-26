
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../hooks/useCurrency';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { calculateMonthlyAmount } from '../utils/calculations';
import Icon from './Icon';
import { Expense, DEFAULT_CATEGORIES } from '../types/budget';
import { router } from 'expo-router';

interface ExpenseBreakdownSectionProps {
  expenses: Expense[];
}

interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

interface TypeBreakdown {
  type: 'household' | 'personal';
  amount: number;
  count: number;
  percentage: number;
  categories: CategoryBreakdown[];
}

export default function ExpenseBreakdownSection({ expenses }: ExpenseBreakdownSectionProps) {
  const { currentColors } = useTheme();
  const { formatCurrency } = useCurrency();
  const { themedStyles } = useThemedStyles();

  console.log('ExpenseBreakdownSection: Component rendered with expenses:', {
    expensesLength: expenses?.length || 0,
    expensesArray: Array.isArray(expenses),
    firstExpense: expenses?.[0]
  });

  // Calculate breakdown data
  const breakdownData = useMemo(() => {
    console.log('ExpenseBreakdownSection: Processing expenses:', {
      expensesLength: expenses?.length || 0,
      expensesArray: Array.isArray(expenses),
      firstExpense: expenses?.[0]
    });

    if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
      console.log('ExpenseBreakdownSection: No expenses found');
      return { household: null, personal: null, totalAmount: 0 };
    }

    const activeExpenses = expenses.filter(expense => {
      if (!expense) return false;
      return true;
    });

    console.log('ExpenseBreakdownSection: Active expenses:', {
      activeExpensesLength: activeExpenses.length,
      sampleExpenses: activeExpenses.slice(0, 3).map(e => ({
        id: e.id,
        category: e.category,
        categoryTag: e.categoryTag,
        amount: e.amount,
        frequency: e.frequency
      }))
    });

    const totalAmount = activeExpenses.reduce((sum, expense) => {
      return sum + calculateMonthlyAmount(expense.amount, expense.frequency);
    }, 0);

    console.log('ExpenseBreakdownSection: Total amount calculated:', totalAmount);

    if (totalAmount === 0) {
      console.log('ExpenseBreakdownSection: Total amount is 0');
      return { household: null, personal: null, totalAmount: 0 };
    }

    const groupByType = (type: 'household' | 'personal'): TypeBreakdown | null => {
      const typeExpenses = activeExpenses.filter(expense => expense.category === type);
      
      console.log(`ExpenseBreakdownSection: ${type} expenses:`, {
        count: typeExpenses.length,
        sampleExpenses: typeExpenses.slice(0, 3).map(e => ({
          id: e.id,
          category: e.category,
          categoryTag: e.categoryTag,
          amount: e.amount
        }))
      });

      if (typeExpenses.length === 0) return null;

      const typeAmount = typeExpenses.reduce((sum, expense) => {
        return sum + calculateMonthlyAmount(expense.amount, expense.frequency);
      }, 0);

      // Group by category tag
      const categoryMap = new Map<string, { amount: number; count: number }>();
      
      typeExpenses.forEach(expense => {
        const category = expense.categoryTag || 'Misc';
        const monthlyAmount = calculateMonthlyAmount(expense.amount, expense.frequency);
        
        if (categoryMap.has(category)) {
          const existing = categoryMap.get(category)!;
          categoryMap.set(category, {
            amount: existing.amount + monthlyAmount,
            count: existing.count + 1,
          });
        } else {
          categoryMap.set(category, {
            amount: monthlyAmount,
            count: 1,
          });
        }
      });

      const categories: CategoryBreakdown[] = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          count: data.count,
          percentage: typeAmount > 0 ? (data.amount / typeAmount) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      console.log(`ExpenseBreakdownSection: ${type} breakdown:`, {
        typeAmount,
        categoriesCount: categories.length,
        categories: categories.map(c => ({ category: c.category, amount: c.amount, count: c.count }))
      });

      return {
        type,
        amount: typeAmount,
        count: typeExpenses.length,
        percentage: totalAmount > 0 ? (typeAmount / totalAmount) * 100 : 0,
        categories,
      };
    };

    const household = groupByType('household');
    const personal = groupByType('personal');

    console.log('ExpenseBreakdownSection: Final breakdown data:', {
      totalAmount,
      hasHousehold: !!household,
      hasPersonal: !!personal,
      householdAmount: household?.amount || 0,
      personalAmount: personal?.amount || 0
    });

    return {
      household,
      personal,
      totalAmount,
    };
  }, [expenses]);

  // Navigation handler for category taps
  const handleCategoryPress = (expenseType: 'household' | 'personal', categoryName: string) => {
    console.log('ExpenseBreakdownSection: Navigating to expenses with filters:', {
      expenseType,
      categoryName
    });
    
    // Navigate to expenses page with pre-applied filters
    router.push({
      pathname: '/expenses',
      params: {
        filter: expenseType,
        category: categoryName,
        fromDashboard: 'true'
      }
    });
  };

  if (!breakdownData.household && !breakdownData.personal) {
    console.log('ExpenseBreakdownSection: Rendering empty state');
    return (
      <View style={[themedStyles.card, { marginBottom: 0 }]}>
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Icon name="pie-chart-outline" size={48} style={{ color: currentColors.textSecondary, marginBottom: 12 }} />
          <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
            No expenses to analyze yet. Add some expenses to see the breakdown.
          </Text>
        </View>
      </View>
    );
  }

  console.log('ExpenseBreakdownSection: Rendering breakdown with data');

  // Type breakdown component without animations
  const TypeBreakdownComponent = ({ breakdown }: { breakdown: TypeBreakdown }) => {
    const isHousehold = breakdown.type === 'household';
    const typeColor = isHousehold ? currentColors.household : currentColors.personal;
    const typeIcon = isHousehold ? 'home' : 'person';

    return (
      <View
        key={breakdown.type}
        style={[
          themedStyles.card,
          {
            backgroundColor: typeColor + '10',
            borderColor: typeColor + '30',
            borderWidth: 2,
            marginBottom: 16,
          },
        ]}
      >
        {/* Type Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: typeColor + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
          }}>
            <Icon name={typeIcon} size={24} style={{ color: typeColor }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[themedStyles.subtitle, { fontSize: 20, fontWeight: '700', marginBottom: 4 }]}>
              {isHousehold ? 'Household Expenses' : 'Personal Expenses'}
            </Text>
            <Text style={[themedStyles.textSecondary, { fontSize: 14 }]}>
              {breakdown.count} {breakdown.count === 1 ? 'expense' : 'expenses'} • {breakdown.percentage.toFixed(1)}% of total
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[
              themedStyles.text,
              { fontSize: 18, fontWeight: '700', color: typeColor }
            ]}>
              {formatCurrency(breakdown.amount)}
            </Text>
            <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>
              per month
            </Text>
          </View>
        </View>

        {/* Categories - Interactive */}
        <View style={{ gap: 12 }}>
          {breakdown.categories.map((category, categoryIndex) => (
            <TouchableOpacity
              key={`${breakdown.type}-${category.category}-${categoryIndex}`}
              onPress={() => handleCategoryPress(breakdown.type, category.category)}
              activeOpacity={0.7}
              style={{
                backgroundColor: currentColors.backgroundAlt,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: currentColors.border,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Text style={[themedStyles.text, { fontSize: 16, fontWeight: '600', flex: 1 }]}>
                    {category.category}
                  </Text>
                  <Icon 
                    name="chevron-forward" 
                    size={16} 
                    style={{ color: currentColors.textSecondary, marginLeft: 8 }} 
                  />
                </View>
                <Text style={[themedStyles.text, { fontSize: 14, fontWeight: '700', color: typeColor, marginLeft: 12 }]}>
                  {formatCurrency(category.amount)}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>
                  {category.count} {category.count === 1 ? 'expense' : 'expenses'}
                </Text>
                <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>
                  {category.percentage.toFixed(1)}% of {breakdown.type}
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={{
                height: 6,
                backgroundColor: currentColors.border,
                borderRadius: 3,
                overflow: 'hidden',
              }}>
                <View
                  style={{
                    height: '100%',
                    backgroundColor: typeColor,
                    borderRadius: 3,
                    width: `${category.percentage}%`,
                  }}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View>
      {/* Type Breakdowns */}
      <View>
        {breakdownData.household && <TypeBreakdownComponent breakdown={breakdownData.household} />}
        {breakdownData.personal && <TypeBreakdownComponent breakdown={breakdownData.personal} />}
      </View>
    </View>
  );
}
