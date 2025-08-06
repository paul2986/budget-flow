
import { useState, useEffect } from 'react';
import { useBudgetData } from '../hooks/useBudgetData';
import { router } from 'expo-router';
import { Text, View, ScrollView, TouchableOpacity, Alert, Animated, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { calculateMonthlyAmount } from '../utils/calculations';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { commonStyles } from '../styles/commonStyles';
import { useCurrency } from '../hooks/useCurrency';
import Icon from '../components/Icon';

export default function ExpensesScreen() {
  const { data, removeExpense, saving, refreshData } = useBudgetData();
  const { currentColors } = useTheme();
  const { formatCurrency } = useCurrency();
  const [filter, setFilter] = useState<'all' | 'household' | 'personal'>('all');
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // Force refresh data when component mounts
  useEffect(() => {
    console.log('ExpensesScreen: Component mounted, refreshing data...');
    refreshData();
  }, []);

  const handleRemoveExpense = (expenseId: string, description: string) => {
    console.log('ExpensesScreen: Attempting to remove expense:', expenseId, description);
    
    // Prevent multiple deletion attempts
    if (deletingExpenseId === expenseId || saving) {
      console.log('ExpensesScreen: Deletion already in progress, ignoring');
      return;
    }

    Alert.alert(
      'Remove Expense',
      `Are you sure you want to remove "${description}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('ExpensesScreen: Starting expense removal process');
              setDeletingExpenseId(expenseId);
              
              const result = await removeExpense(expenseId);
              console.log('ExpensesScreen: Expense removal result:', result);
              
              if (result.success) {
                // Force refresh to ensure UI updates
                await refreshData();
              } else {
                console.error('ExpensesScreen: Expense removal failed:', result.error);
                Alert.alert('Error', 'Failed to remove expense. Please try again.');
              }
            } catch (error) {
              console.error('ExpensesScreen: Error removing expense:', error);
              Alert.alert('Error', 'Failed to remove expense. Please try again.');
            } finally {
              setDeletingExpenseId(null);
            }
          }
        },
      ]
    );
  };

  const handleEditExpense = (expense: any) => {
    console.log('ExpensesScreen: Navigating to edit expense:', expense);
    router.push({
      pathname: '/add-expense',
      params: { id: expense.id }
    });
  };

  const FilterButton = ({ filterType, label }: { filterType: typeof filter, label: string }) => (
    <TouchableOpacity
      style={[
        commonStyles.badge,
        { 
          backgroundColor: filter === filterType ? currentColors.primary : currentColors.border,
          flex: 1,
          marginHorizontal: 4,
          paddingHorizontal: 12,
          paddingVertical: 12,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
        }
      ]}
      onPress={() => {
        setFilter(filterType);
        if (filterType !== 'personal') {
          setPersonFilter(null);
        }
      }}
      disabled={saving || deletingExpenseId !== null}
    >
      <Text style={[
        commonStyles.badgeText,
        { 
          color: filter === filterType ? '#FFFFFF' : currentColors.text,
          fontWeight: '600',
          textAlign: 'center',
        }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderRightActions = (expenseId: string, description: string) => {
    const isDeleting = deletingExpenseId === expenseId;
    
    return (
      <Animated.View style={{
        flex: 1,
        backgroundColor: currentColors.error,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginVertical: 8,
        borderRadius: 16,
        marginLeft: 8,
      }}>
        <TouchableOpacity
          onPress={() => handleRemoveExpense(expenseId, description)}
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            width: 80,
            height: '100%',
          }}
          disabled={saving || isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Icon name="trash-outline" size={24} style={{ color: 'white' }} />
              <Text style={{ color: 'white', fontSize: 12, marginTop: 4, fontWeight: '600' }}>Delete</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Filter expenses
  let filteredExpenses = data.expenses;
  
  console.log('ExpensesScreen: Total expenses:', data.expenses.length);
  console.log('ExpensesScreen: All expenses:', data.expenses);
  
  if (filter === 'household') {
    filteredExpenses = filteredExpenses.filter(e => e.category === 'household');
  } else if (filter === 'personal') {
    filteredExpenses = filteredExpenses.filter(e => e.category === 'personal');
    
    if (personFilter) {
      filteredExpenses = filteredExpenses.filter(e => e.personId === personFilter);
    }
  }

  console.log('ExpensesScreen: Filtered expenses:', filteredExpenses.length);

  // Sort by date (newest first)
  filteredExpenses = filteredExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[commonStyles.container, { backgroundColor: currentColors.background }]}>
        <View style={[commonStyles.header, { backgroundColor: currentColors.backgroundAlt, borderBottomColor: currentColors.border }]}>
          <View style={{ width: 24 }} />
          <Text style={[commonStyles.headerTitle, { color: currentColors.text }]}>Expenses</Text>
          <TouchableOpacity 
            onPress={() => router.push('/add-expense')} 
            disabled={saving || deletingExpenseId !== null}
            style={{
              backgroundColor: currentColors.primary,
              borderRadius: 20,
              padding: 8,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon name="add" size={20} style={{ color: '#FFFFFF' }} />
            )}
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={[commonStyles.section, { paddingBottom: 0, paddingTop: 16 }]}>
          {/* Main filter buttons - distributed horizontally */}
          <View style={{ 
            flexDirection: 'row', 
            marginBottom: 16, 
            paddingHorizontal: 16,
          }}>
            <FilterButton filterType="all" label="All Expenses" />
            <FilterButton filterType="household" label="Household" />
            <FilterButton filterType="personal" label="Personal" />
          </View>
          
          {/* Person filter for personal expenses */}
          {filter === 'personal' && data.people.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ paddingHorizontal: 4, flexDirection: 'row' }}>
                <TouchableOpacity
                  style={[
                    commonStyles.badge,
                    { 
                      backgroundColor: personFilter === null ? currentColors.secondary : currentColors.border,
                      marginRight: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 24,
                    }
                  ]}
                  onPress={() => setPersonFilter(null)}
                  disabled={saving || deletingExpenseId !== null}
                >
                  <Text style={[
                    commonStyles.badgeText,
                    { 
                      color: personFilter === null ? '#FFFFFF' : currentColors.text,
                      fontWeight: '600',
                    }
                  ]}>
                    All People
                  </Text>
                </TouchableOpacity>
                
                {data.people.map((person) => (
                  <TouchableOpacity
                    key={person.id}
                    style={[
                      commonStyles.badge,
                      { 
                        backgroundColor: personFilter === person.id ? currentColors.secondary : currentColors.border,
                        marginRight: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 24,
                      }
                    ]}
                    onPress={() => setPersonFilter(person.id)}
                    disabled={saving || deletingExpenseId !== null}
                  >
                    <Text style={[
                      commonStyles.badgeText,
                      { 
                        color: personFilter === person.id ? '#FFFFFF' : currentColors.text,
                        fontWeight: '600',
                      }
                    ]}>
                      {person.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        <ScrollView style={commonStyles.content} contentContainerStyle={commonStyles.scrollContent}>
          {filteredExpenses.length === 0 ? (
            <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
              <View style={commonStyles.centerContent}>
                <Icon name="receipt-outline" size={64} style={{ color: currentColors.textSecondary, marginBottom: 16 }} />
                <Text style={[commonStyles.subtitle, { textAlign: 'center', marginBottom: 12, color: currentColors.text }]}>
                  No Expenses Found
                </Text>
                <Text style={[commonStyles.textSecondary, { textAlign: 'center', color: currentColors.textSecondary }]}>
                  {filter === 'all' 
                    ? 'Add your first expense to get started'
                    : `No ${filter} expenses found`
                  }
                </Text>
              </View>
            </View>
          ) : (
            filteredExpenses.map((expense) => {
              const person = expense.personId ? data.people.find(p => p.id === expense.personId) : null;
              const monthlyAmount = calculateMonthlyAmount(expense.amount, expense.frequency);
              const isDeleting = deletingExpenseId === expense.id;
              
              return (
                <Swipeable
                  key={expense.id}
                  renderRightActions={() => renderRightActions(expense.id, expense.description)}
                  enabled={!saving && !isDeleting}
                >
                  <TouchableOpacity
                    style={[
                      commonStyles.card,
                      { 
                        backgroundColor: currentColors.backgroundAlt, 
                        borderColor: currentColors.border,
                        marginBottom: 8,
                        opacity: isDeleting ? 0.6 : 1,
                      }
                    ]}
                    onPress={() => handleEditExpense(expense)}
                    activeOpacity={0.7}
                    disabled={saving || isDeleting}
                  >
                    <View style={[commonStyles.row, { marginBottom: 12 }]}>
                      <View style={commonStyles.flex1}>
                        <Text style={[commonStyles.text, { fontWeight: '700', color: currentColors.text, fontSize: 18 }]}>
                          {expense.description}
                        </Text>
                        <Text style={[commonStyles.textSecondary, { color: currentColors.textSecondary, marginTop: 4 }]}>
                          {expense.category === 'personal' && person ? `${person.name} • ` : ''}
                          {expense.frequency} • {new Date(expense.date).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[
                          commonStyles.text, 
                          { 
                            fontWeight: '800', 
                            color: expense.category === 'household' ? currentColors.household : currentColors.personal,
                            fontSize: 18,
                          }
                        ]}>
                          {formatCurrency(expense.amount)}
                        </Text>
                        <Text style={[commonStyles.textSecondary, { color: currentColors.textSecondary, marginTop: 2 }]}>
                          {formatCurrency(monthlyAmount)}/mo
                        </Text>
                      </View>
                    </View>
                    
                    <View style={[commonStyles.row, { alignItems: 'center' }]}>
                      <View style={[
                        commonStyles.badge,
                        { 
                          backgroundColor: expense.category === 'household' ? currentColors.household : currentColors.personal,
                          marginRight: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 16,
                        }
                      ]}>
                        <Text style={[
                          commonStyles.badgeText,
                          { color: '#FFFFFF', fontSize: 12, fontWeight: '700' }
                        ]}>
                          {expense.category.toUpperCase()}
                        </Text>
                      </View>
                      
                      <Text style={[commonStyles.textSecondary, { flex: 1, color: currentColors.textSecondary }]}>
                        {isDeleting ? 'Deleting...' : 'Swipe left to delete • Tap to edit'}
                      </Text>
                      
                      {isDeleting ? (
                        <ActivityIndicator size="small" color={currentColors.textSecondary} />
                      ) : (
                        <Icon name="chevron-forward-outline" size={16} style={{ color: currentColors.textSecondary }} />
                      )}
                    </View>
                  </TouchableOpacity>
                </Swipeable>
              );
            })
          )}
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
}
