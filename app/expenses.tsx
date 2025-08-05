
import { Text, View, ScrollView, TouchableOpacity, Alert, Animated } from 'react-native';
import { useState } from 'react';
import { commonStyles } from '../styles/commonStyles';
import { router } from 'expo-router';
import { useBudgetData } from '../hooks/useBudgetData';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../hooks/useCurrency';
import { calculateMonthlyAmount } from '../utils/calculations';
import Icon from '../components/Icon';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

export default function ExpensesScreen() {
  const { data, removeExpense } = useBudgetData();
  const { currentColors } = useTheme();
  const { formatCurrency } = useCurrency();
  const [filter, setFilter] = useState<'all' | 'household' | 'personal'>('all');

  const handleRemoveExpense = (expenseId: string, description: string) => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete "${description}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => removeExpense(expenseId)
        },
      ]
    );
  };

  const handleEditExpense = (expense: any) => {
    router.push({
      pathname: '/add-expense',
      params: { id: expense.id }
    });
  };

  const filteredExpenses = data.expenses.filter(expense => {
    if (filter === 'all') return true;
    return expense.category === filter;
  });

  const FilterButton = ({ filterType, label }: { filterType: typeof filter, label: string }) => (
    <TouchableOpacity
      style={[
        commonStyles.badge,
        { 
          backgroundColor: filter === filterType ? currentColors.primary : currentColors.border,
          marginRight: 8,
          paddingHorizontal: 16,
          paddingVertical: 8,
        }
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text style={[
        commonStyles.badgeText,
        { color: filter === filterType ? currentColors.backgroundAlt : currentColors.text }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderRightActions = (expenseId: string, description: string) => {
    return (
      <View style={{
        backgroundColor: currentColors.error,
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        borderRadius: 12,
        marginBottom: 12,
      }}>
        <TouchableOpacity
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%',
          }}
          onPress={() => handleRemoveExpense(expenseId, description)}
        >
          <Icon name="trash-outline" size={24} style={{ color: currentColors.backgroundAlt }} />
          <Text style={{ color: currentColors.backgroundAlt, fontSize: 12, fontWeight: '600' }}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[commonStyles.container, { backgroundColor: currentColors.background }]}>
        <View style={[commonStyles.header, { backgroundColor: currentColors.backgroundAlt, borderBottomColor: currentColors.border }]}>
          <View style={{ width: 24 }} />
          <Text style={[commonStyles.headerTitle, { color: currentColors.text }]}>Expenses</Text>
          <TouchableOpacity onPress={() => router.push('/add-expense')}>
            <Icon name="add" size={24} style={{ color: currentColors.text }} />
          </TouchableOpacity>
        </View>

        <ScrollView style={commonStyles.content} contentContainerStyle={commonStyles.scrollContent}>
          {/* Filter Buttons */}
          <View style={[commonStyles.section, { marginBottom: 16 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', paddingHorizontal: 4 }}>
                <FilterButton filterType="all" label="All Expenses" />
                <FilterButton filterType="household" label="Household" />
                <FilterButton filterType="personal" label="Personal" />
              </View>
            </ScrollView>
          </View>

          {/* Expenses List */}
          {filteredExpenses.length === 0 ? (
            <View style={commonStyles.emptyState}>
              <Icon name="receipt-outline" size={48} style={{ color: currentColors.textSecondary }} />
              <Text style={[commonStyles.emptyStateText, { color: currentColors.textSecondary }]}>
                {filter === 'all' 
                  ? 'No expenses yet.\nTap the + button to add your first expense!'
                  : `No ${filter} expenses found.\nTry changing the filter or add a new expense.`
                }
              </Text>
            </View>
          ) : (
            <View>
              <Text style={[commonStyles.textSecondary, { marginBottom: 12, color: currentColors.textSecondary }]}>
                Swipe left to delete • Tap to edit
              </Text>
              
              {filteredExpenses.map((expense) => {
                const person = data.people.find(p => p.id === expense.personId);
                const monthlyAmount = calculateMonthlyAmount(expense.amount, expense.frequency);
                
                return (
                  <Swipeable
                    key={expense.id}
                    renderRightActions={() => renderRightActions(expense.id, expense.description)}
                  >
                    <TouchableOpacity
                      style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}
                      onPress={() => handleEditExpense(expense)}
                      activeOpacity={0.7}
                    >
                      <View style={[commonStyles.row, { marginBottom: 8 }]}>
                        <View style={commonStyles.flex1}>
                          <Text style={[commonStyles.text, { fontWeight: '600', color: currentColors.text }]}>
                            {expense.description}
                          </Text>
                          <Text style={[commonStyles.textSecondary, { color: currentColors.textSecondary }]}>
                            {expense.category === 'household' ? 'Household' : person?.name || 'Personal'}
                            {' • '}
                            {expense.frequency}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[
                            commonStyles.text, 
                            { 
                              color: currentColors.expense, 
                              fontWeight: '600',
                              fontSize: 16 
                            }
                          ]}>
                            {formatCurrency(expense.amount)}
                          </Text>
                          {expense.frequency !== 'monthly' && (
                            <Text style={[commonStyles.textSecondary, { color: currentColors.textSecondary, fontSize: 12 }]}>
                              {formatCurrency(monthlyAmount)}/month
                            </Text>
                          )}
                        </View>
                      </View>
                      
                      <View style={[commonStyles.row, { alignItems: 'center' }]}>
                        <View style={[
                          commonStyles.badge, 
                          { 
                            backgroundColor: expense.category === 'household' 
                              ? currentColors.household 
                              : currentColors.personal 
                          }
                        ]}>
                          <Text style={[commonStyles.badgeText, { color: currentColors.backgroundAlt }]}>
                            {expense.category === 'household' ? 'Household' : 'Personal'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }} />
                        <Icon name="chevron-forward-outline" size={16} style={{ color: currentColors.textSecondary }} />
                      </View>
                    </TouchableOpacity>
                  </Swipeable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
}
