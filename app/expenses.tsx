
import { useState, useCallback } from 'react';
import { useBudgetData } from '../hooks/useBudgetData';
import { router, useFocusEffect } from 'expo-router';
import { Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { calculateMonthlyAmount } from '../utils/calculations';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useCurrency } from '../hooks/useCurrency';
import Icon from '../components/Icon';

type SortOption = 'date' | 'highest' | 'lowest';

export default function ExpensesScreen() {
  const { data, removeExpense, saving, refreshData } = useBudgetData();
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();
  const { formatCurrency } = useCurrency();
  const [filter, setFilter] = useState<'all' | 'household' | 'personal'>('all');
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date');

  // Refresh data when screen comes into focus (e.g., after adding an expense)
  useFocusEffect(
    useCallback(() => {
      console.log('ExpensesScreen: Screen focused, refreshing data...');
      refreshData();
    }, [refreshData])
  );

  const handleRemoveExpense = useCallback(async (expenseId: string, description: string) => {
    console.log('ExpensesScreen: Attempting to remove expense:', expenseId, description);
    
    // Prevent multiple deletion attempts
    if (deletingExpenseId === expenseId || saving) {
      console.log('ExpensesScreen: Deletion already in progress, ignoring');
      return;
    }

    try {
      console.log('ExpensesScreen: Starting expense removal process');
      setDeletingExpenseId(expenseId);
      
      const result = await removeExpense(expenseId);
      console.log('ExpensesScreen: Expense removal result:', result);
      
      if (result.success) {
        console.log('ExpensesScreen: Expense removed successfully');
        // Refresh data to ensure UI is updated
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
  }, [deletingExpenseId, saving, removeExpense, refreshData]);

  const handleDeletePress = useCallback((expenseId: string, description: string) => {
    console.log('ExpensesScreen: Delete button pressed for expense:', expenseId, description);
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete "${description}"?`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('ExpensesScreen: Delete cancelled')
        },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            console.log('ExpensesScreen: Delete confirmed');
            handleRemoveExpense(expenseId, description);
          }
        },
      ]
    );
  }, [handleRemoveExpense]);

  const handleEditExpense = useCallback((expense: any) => {
    console.log('ExpensesScreen: Navigating to edit expense:', expense);
    router.push({
      pathname: '/add-expense',
      params: { id: expense.id }
    });
  }, []);

  const handleNavigateToAddExpense = useCallback(() => {
    router.push('/add-expense');
  }, []);

  const FilterButton = useCallback(({ filterType, label }: { filterType: typeof filter, label: string }) => (
    <TouchableOpacity
      style={[
        themedStyles.badge,
        { 
          backgroundColor: filter === filterType ? currentColors.primary : currentColors.border,
          flex: 1,
          marginHorizontal: 4,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 20,
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
        themedStyles.badgeText,
        { 
          color: filter === filterType ? '#FFFFFF' : currentColors.text,
          fontWeight: '600',
          textAlign: 'center',
          fontSize: 13,
        }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  ), [filter, currentColors, saving, deletingExpenseId, themedStyles]);

  const SortButton = useCallback(({ sortType, label, icon }: { sortType: SortOption, label: string, icon: string }) => (
    <TouchableOpacity
      style={[
        themedStyles.badge,
        { 
          backgroundColor: sortBy === sortType ? currentColors.secondary : currentColors.border,
          marginRight: 8,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
          flexDirection: 'row',
          alignItems: 'center',
        }
      ]}
      onPress={() => setSortBy(sortType)}
      disabled={saving || deletingExpenseId !== null}
    >
      <Icon 
        name={icon} 
        size={14} 
        style={{ 
          color: sortBy === sortType ? '#FFFFFF' : currentColors.text,
          marginRight: 4,
        }} 
      />
      <Text style={[
        themedStyles.badgeText,
        { 
          color: sortBy === sortType ? '#FFFFFF' : currentColors.text,
          fontWeight: '600',
          fontSize: 12,
        }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  ), [sortBy, currentColors, saving, deletingExpenseId, themedStyles]);

  // Filter expenses
  let filteredExpenses = data.expenses;
  
  console.log('ExpensesScreen: Total expenses:', data.expenses.length);
  
  if (filter === 'household') {
    filteredExpenses = filteredExpenses.filter(e => e.category === 'household');
  } else if (filter === 'personal') {
    filteredExpenses = filteredExpenses.filter(e => e.category === 'personal');
    
    if (personFilter) {
      filteredExpenses = filteredExpenses.filter(e => e.personId === personFilter);
    }
  }

  console.log('ExpensesScreen: Filtered expenses:', filteredExpenses.length);

  // Sort expenses based on selected sort option
  filteredExpenses = filteredExpenses.sort((a, b) => {
    switch (sortBy) {
      case 'highest':
        return b.amount - a.amount; // Highest to lowest
      case 'lowest':
        return a.amount - b.amount; // Lowest to highest
      case 'date':
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime(); // Newest first
    }
  });

  return (
    <View style={themedStyles.container}>
      <View style={themedStyles.header}>
        <View style={{ width: 24 }} />
        <Text style={themedStyles.headerTitle}>Expenses</Text>
        <TouchableOpacity 
          onPress={handleNavigateToAddExpense} 
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
      <View style={[themedStyles.section, { paddingBottom: 0, paddingTop: 12, paddingHorizontal: 12 }]}>
        {/* Main filter buttons - distributed horizontally */}
        <View style={{ 
          flexDirection: 'row', 
          marginBottom: 12, 
        }}>
          <FilterButton filterType="all" label="All Expenses" />
          <FilterButton filterType="household" label="Household" />
          <FilterButton filterType="personal" label="Personal" />
        </View>
        
        {/* Person filter for personal expenses */}
        {filter === 'personal' && data.people.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ paddingHorizontal: 4, flexDirection: 'row' }}>
              <TouchableOpacity
                style={[
                  themedStyles.badge,
                  { 
                    backgroundColor: personFilter === null ? currentColors.secondary : currentColors.border,
                    marginRight: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                  }
                ]}
                onPress={() => setPersonFilter(null)}
                disabled={saving || deletingExpenseId !== null}
              >
                <Text style={[
                  themedStyles.badgeText,
                  { 
                    color: personFilter === null ? '#FFFFFF' : currentColors.text,
                    fontWeight: '600',
                    fontSize: 12,
                  }
                ]}>
                  All People
                </Text>
              </TouchableOpacity>
              
              {data.people.map((person) => (
                <TouchableOpacity
                  key={person.id}
                  style={[
                    themedStyles.badge,
                    { 
                      backgroundColor: personFilter === person.id ? currentColors.secondary : currentColors.border,
                      marginRight: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                    }
                  ]}
                  onPress={() => setPersonFilter(person.id)}
                  disabled={saving || deletingExpenseId !== null}
                >
                  <Text style={[
                    themedStyles.badgeText,
                    { 
                      color: personFilter === person.id ? '#FFFFFF' : currentColors.text,
                      fontWeight: '600',
                      fontSize: 12,
                    }
                  ]}>
                    {person.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Sort options */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 4, flexDirection: 'row' }}>
            <SortButton sortType="date" label="Date" icon="calendar-outline" />
            <SortButton sortType="highest" label="Highest Cost" icon="trending-up-outline" />
            <SortButton sortType="lowest" label="Lowest Cost" icon="trending-down-outline" />
          </View>
        </ScrollView>
      </View>

      <ScrollView style={themedStyles.content} contentContainerStyle={[themedStyles.scrollContent, { paddingHorizontal: 12 }]}>
        {filteredExpenses.length === 0 ? (
          <View style={themedStyles.card}>
            <View style={themedStyles.centerContent}>
              <Icon name="receipt-outline" size={64} style={{ color: currentColors.textSecondary, marginBottom: 16 }} />
              <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 12 }]}>
                No Expenses Found
              </Text>
              <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
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
              <View
                key={expense.id}
                style={[
                  themedStyles.card,
                  { 
                    marginBottom: 6,
                    padding: 12,
                    opacity: isDeleting ? 0.6 : 1,
                  }
                ]}
              >
                {/* Main content area - clickable for editing */}
                <TouchableOpacity
                  onPress={() => handleEditExpense(expense)}
                  activeOpacity={0.7}
                  disabled={saving || isDeleting}
                  style={{ flex: 1 }}
                >
                  {/* Top row with title and amount */}
                  <View style={[themedStyles.row, { marginBottom: 6, alignItems: 'flex-start', paddingRight: 50 }]}>
                    <View style={themedStyles.flex1}>
                      <Text style={[themedStyles.text, { fontWeight: '700', fontSize: 16 }]}>
                        {expense.description}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[
                        themedStyles.text, 
                        { 
                          fontWeight: '800', 
                          color: expense.category === 'household' ? currentColors.household : currentColors.personal,
                          fontSize: 16,
                        }
                      ]}>
                        {formatCurrency(expense.amount)}
                      </Text>
                      <Text style={[themedStyles.textSecondary, { fontSize: 11 }]}>
                        {formatCurrency(monthlyAmount)}/mo
                      </Text>
                    </View>
                  </View>
                  
                  {/* Bottom row with metadata and category badge */}
                  <View style={[themedStyles.row, { alignItems: 'center', paddingRight: 50 }]}>
                    <View style={[
                      themedStyles.badge,
                      { 
                        backgroundColor: expense.category === 'household' ? currentColors.household : currentColors.personal,
                        marginRight: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 12,
                      }
                    ]}>
                      <Text style={[
                        themedStyles.badgeText,
                        { color: '#FFFFFF', fontSize: 10, fontWeight: '700' }
                      ]}>
                        {expense.category.toUpperCase()}
                      </Text>
                    </View>
                    
                    <Text style={[themedStyles.textSecondary, { flex: 1, fontSize: 12 }]}>
                      {expense.category === 'personal' && person ? `${person.name} • ` : ''}
                      {expense.frequency} • {new Date(expense.date).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Delete button - positioned absolutely in top right, outside the edit touch area */}
                <View style={{ 
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 100,
                }}>
                  <TouchableOpacity
                    onPress={() => {
                      console.log('ExpensesScreen: Bin icon pressed for expense:', expense.id, expense.description);
                      handleDeletePress(expense.id, expense.description);
                    }}
                    disabled={saving || isDeleting}
                    style={{
                      padding: 6,
                      borderRadius: 16,
                      backgroundColor: currentColors.error + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 32,
                      minHeight: 32,
                      // Add shadow for better visibility
                      shadowColor: '#000',
                      shadowOffset: {
                        width: 0,
                        height: 2,
                      },
                      shadowOpacity: 0.1,
                      shadowRadius: 3.84,
                      elevation: 5,
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={currentColors.error} />
                    ) : (
                      <Icon name="trash-outline" size={16} style={{ color: currentColors.error }} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
