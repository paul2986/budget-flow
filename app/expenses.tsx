
import { Text, View, ScrollView, TouchableOpacity, Alert, Animated } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { commonStyles, colors } from '../styles/commonStyles';
import { useBudgetData } from '../hooks/useBudgetData';
import { calculateMonthlyAmount } from '../utils/calculations';
import Icon from '../components/Icon';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

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
    console.log('Editing expense:', expense);
    router.push({
      pathname: '/add-expense',
      params: { 
        editMode: 'true',
        expenseId: expense.id,
        amount: expense.amount.toString(),
        description: expense.description,
        category: expense.category,
        frequency: expense.frequency,
        personId: expense.personId || '',
      }
    });
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
        <TouchableOpacity onPress={() => router.push('/')}>
          <Icon name="home" size={24} style={{ color: colors.text }} />
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

        {/* Instructions */}
        {sortedExpenses.length > 0 && (
          <View style={[commonStyles.card, { backgroundColor: colors.primary + '10', marginBottom: 16 }]}>
            <Text style={[commonStyles.text, { textAlign: 'center', fontSize: 14 }]}>
              💡 <Text style={{ fontWeight: '600' }}>Tap</Text> an expense to edit • <Text style={{ fontWeight: '600' }}>Swipe left</Text> to delete
            </Text>
          </View>
        )}

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
          <GestureHandlerRootView>
            {sortedExpenses.map((expense) => {
              const person = data.people.find(p => p.id === expense.personId);
              const monthlyAmount = calculateMonthlyAmount(expense.amount, expense.frequency);
              
              const renderRightActions = () => (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 20,
                }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.error,
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: 80,
                      height: '100%',
                      borderRadius: 12,
                      marginLeft: 10,
                    }}
                    onPress={() => handleRemoveExpense(expense.id, expense.description)}
                  >
                    <Icon name="trash" size={24} style={{ color: 'white' }} />
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              );
              
              return (
                <Swipeable
                  key={expense.id}
                  renderRightActions={renderRightActions}
                  rightThreshold={40}
                >
                  <TouchableOpacity
                    style={[commonStyles.card, { marginBottom: 12 }]}
                    onPress={() => handleEditExpense(expense)}
                    activeOpacity={0.7}
                  >
                    <View style={[commonStyles.row, { marginBottom: 8 }]}>
                      <View style={commonStyles.flex1}>
                        <Text style={[commonStyles.text, { fontWeight: '600', fontSize: 16 }]}>
                          {expense.description}
                        </Text>
                      </View>
                      <Icon name="chevron-forward" size={16} style={{ color: colors.textSecondary }} />
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
                  </TouchableOpacity>
                </Swipeable>
              );
            })}
          </GestureHandlerRootView>
        )}
      </ScrollView>
    </View>
  );
}
