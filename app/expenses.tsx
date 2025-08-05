
import { useState } from 'react';
import { useBudgetData } from '../hooks/useBudgetData';
import { router } from 'expo-router';
import { Text, View, ScrollView, TouchableOpacity, Alert, Animated, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { calculateMonthlyAmount } from '../utils/calculations';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { commonStyles } from '../styles/commonStyles';
import { useCurrency } from '../hooks/useCurrency';
import Icon from '../components/Icon';
import Toast from '../components/Toast';

export default function ExpensesScreen() {
  const { data, removeExpense, saving } = useBudgetData();
  const { currentColors } = useTheme();
  const { formatCurrency } = useCurrency();
  const [filter, setFilter] = useState<'all' | 'household' | 'personal'>('all');
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false,
    message: '',
    type: 'info'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'info' });
  };

  const handleRemoveExpense = (expenseId: string, description: string) => {
    console.log('ExpensesScreen: Attempting to remove expense:', expenseId, description);
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
              console.log('ExpensesScreen: Removing expense:', expenseId);
              const result = await removeExpense(expenseId);
              console.log('ExpensesScreen: Expense removed successfully');
              
              if (result.success) {
                showToast(`"${description}" has been removed.`, 'success');
              } else {
                showToast('Failed to remove expense. Please try again.', 'error');
              }
            } catch (error) {
              console.error('ExpensesScreen: Error removing expense:', error);
              showToast('Failed to remove expense. Please try again.', 'error');
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
          marginRight: 12,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 24,
        }
      ]}
      onPress={() => {
        setFilter(filterType);
        if (filterType !== 'personal') {
          setPersonFilter(null);
        }
      }}
      disabled={saving}
    >
      <Text style={[
        commonStyles.badgeText,
        { 
          color: filter === filterType ? '#FFFFFF' : currentColors.text,
          fontWeight: '600',
        }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderRightActions = (expenseId: string, description: string) => {
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
          disabled={saving}
        >
          {saving ? (
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
  
  if (filter === 'household') {
    filteredExpenses = filteredExpenses.filter(e => e.category === 'household');
  } else if (filter === 'personal') {
    filteredExpenses = filteredExpenses.filter(e => e.category === 'personal');
    
    if (personFilter) {
      filteredExpenses = filteredExpenses.filter(e => e.personId === personFilter);
    }
  }

  // Sort by date (newest first)
  filteredExpenses = filteredExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[commonStyles.container, { backgroundColor: currentColors.background }]}>
        <Toast
          message={toast.message}
          type={toast.type}
          visible={toast.visible}
          onHide={hideToast}
        />
        
        <View style={[commonStyles.header, { backgroundColor: currentColors.backgroundAlt, borderBottomColor: currentColors.border }]}>
          <View style={{ width: 24 }} />
          <Text style={[commonStyles.headerTitle, { color: currentColors.text }]}>Expenses</Text>
          <TouchableOpacity 
            onPress={() => router.push('/add-expense')} 
            disabled={saving}
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ paddingHorizontal: 4 }}>
              <FilterButton filterType="all" label="All Expenses" />
              <FilterButton filterType="household" label="Household" />
              <FilterButton filterType="personal" label="Personal" />
            </View>
          </ScrollView>
          
          {/* Person filter for personal expenses */}
          {filter === 'personal' && data.people.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ paddingHorizontal: 4 }}>
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
                  disabled={saving}
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
                    disabled={saving}
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
              
              return (
                <Swipeable
                  key={expense.id}
                  renderRightActions={() => renderRightActions(expense.id, expense.description)}
                  enabled={!saving}
                >
                  <TouchableOpacity
                    style={[
                      commonStyles.card,
                      { 
                        backgroundColor: currentColors.backgroundAlt, 
                        borderColor: currentColors.border,
                        marginBottom: 8,
                      }
                    ]}
                    onPress={() => handleEditExpense(expense)}
                    activeOpacity={0.7}
                    disabled={saving}
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
                        Swipe left to delete • Tap to edit
                      </Text>
                      
                      <Icon name="chevron-forward-outline" size={16} style={{ color: currentColors.textSecondary }} />
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
