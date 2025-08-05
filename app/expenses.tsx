
import { Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { commonStyles, colors } from '../styles/commonStyles';
import { useBudgetData } from '../hooks/useBudgetData';
import { calculateMonthlyAmount } from '../utils/calculations';
import Icon from '../components/Icon';

export default function ExpensesScreen() {
  const { data, removeExpense } = useBudgetData();
  const [filter, setFilter] = useState<'all' | 'household' | 'personal'>('all');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleRemoveExpense = (expenseId: string, description: string) => {
    Alert.alert(
      'Remove Expense',
      `Are you sure you want to remove "${description}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => removeExpense(expenseId)
        },
      ]
    );
  };

  const filteredExpenses = data.expenses.filter(expense => {
    if (filter === 'all') return true;
    return expense.category === filter;
  });

  const sortedExpenses = filteredExpenses.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const FilterButton = ({ filterType, label }: { filterType: typeof filter, label: string }) => (
    <TouchableOpacity
      style={[
        commonStyles.badge,
        { 
          backgroundColor: filter === filterType ? colors.primary : colors.border,
          marginRight: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text style={[
        commonStyles.badgeText,
        { color: filter === filterType ? colors.backgroundAlt : colors.text }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const totalExpenses = filteredExpenses.reduce((sum, expense) => 
    sum + calculateMonthlyAmount(expense.amount, expense.frequency), 0
  );

  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} style={{ color: colors.text }} />
        </TouchableOpacity>
        <Text style={commonStyles.headerTitle}>Expenses</Text>
        <TouchableOpacity onPress={() => router.push('/add-expense')}>
          <Icon name="add" size={24} style={{ color: colors.text }} />
        </TouchableOpacity>
      </View>

      <ScrollView style={commonStyles.content} contentContainerStyle={commonStyles.scrollContent}>
        {/* Filter Buttons */}
        <View style={[commonStyles.section, { marginBottom: 16 }]}>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <FilterButton filterType="all" label="All" />
            <FilterButton filterType="household" label="Household" />
            <FilterButton filterType="personal" label="Personal" />
          </View>
          
          <View style={commonStyles.card}>
            <View style={commonStyles.row}>
              <Text style={[commonStyles.text, { fontWeight: '600' }]}>
                Total Monthly ({filter === 'all' ? 'All' : filter === 'household' ? 'Household' : 'Personal'}):
              </Text>
              <Text style={[
                commonStyles.text, 
                { color: colors.expense, fontWeight: '700', fontSize: 16 }
              ]}>
                {formatCurrency(totalExpenses)}
              </Text>
            </View>
          </View>
        </View>

        {/* Expenses List */}
        {sortedExpenses.length === 0 ? (
          <View style={commonStyles.emptyState}>
            <Icon name="receipt-outline" size={48} style={{ color: colors.textSecondary }} />
            <Text style={commonStyles.emptyStateText}>
              {filter === 'all' 
                ? 'No expenses yet.\nTap the + button to add one!'
                : `No ${filter} expenses yet.`
              }
            </Text>
          </View>
        ) : (
          sortedExpenses.map((expense) => {
            const person = data.people.find(p => p.id === expense.personId);
            const monthlyAmount = calculateMonthlyAmount(expense.amount, expense.frequency);
            
            return (
              <View key={expense.id} style={commonStyles.card}>
                <View style={[commonStyles.row, { marginBottom: 8 }]}>
                  <View style={commonStyles.flex1}>
                    <Text style={[commonStyles.text, { fontWeight: '600', fontSize: 16 }]}>
                      {expense.description}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => handleRemoveExpense(expense.id, expense.description)}
                  >
                    <Icon name="trash-outline" size={20} style={{ color: colors.error }} />
                  </TouchableOpacity>
                </View>
                
                <View style={[commonStyles.row, { marginBottom: 8 }]}>
                  <View style={commonStyles.rowStart}>
                    <View style={[
                      commonStyles.badge,
                      { 
                        backgroundColor: expense.category === 'household' ? colors.household : colors.personal,
                        marginRight: 8,
                      }
                    ]}>
                      <Text style={commonStyles.badgeText}>
                        {expense.category === 'household' ? 'Household' : 'Personal'}
                      </Text>
                    </View>
                    {expense.category === 'personal' && person && (
                      <Text style={commonStyles.textSecondary}>{person.name}</Text>
                    )}
                  </View>
                  <Text style={[
                    commonStyles.text, 
                    { color: colors.expense, fontWeight: '600', fontSize: 16 }
                  ]}>
                    {formatCurrency(expense.amount)}
                  </Text>
                </View>
                
                <View style={commonStyles.row}>
                  <Text style={commonStyles.textSecondary}>
                    {expense.frequency} • {new Date(expense.date).toLocaleDateString()}
                  </Text>
                  <Text style={[commonStyles.textSecondary, { fontWeight: '600' }]}>
                    {formatCurrency(monthlyAmount)}/month
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
