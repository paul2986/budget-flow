
import { useState, useEffect } from 'react';
import { Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { commonStyles } from '../styles/commonStyles';
import { useBudgetData } from '../hooks/useBudgetData';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../hooks/useCurrency';
import { 
  calculateTotalIncome, 
  calculateTotalExpenses, 
  calculateHouseholdExpenses,
  calculatePersonalExpenses,
  calculateMonthlyAmount 
} from '../utils/calculations';
import Icon from '../components/Icon';

export default function HomeScreen() {
  const { data } = useBudgetData();
  const { currentColors } = useTheme();
  const { formatCurrency } = useCurrency();

  const handleEditExpense = (expenseId: string) => {
    console.log('HomeScreen: Navigating to edit expense:', expenseId);
    router.push({
      pathname: '/add-expense',
      params: { id: expenseId }
    });
  };

  const totalIncome = calculateTotalIncome(data.people);
  const totalExpenses = calculateTotalExpenses(data.expenses);
  const householdExpenses = calculateHouseholdExpenses(data.expenses);
  const personalExpenses = totalExpenses - householdExpenses;
  const remainingBudget = totalIncome - totalExpenses;

  const monthlyIncome = calculateMonthlyAmount(totalIncome, 'yearly');
  const monthlyExpenses = calculateMonthlyAmount(totalExpenses, 'yearly');
  const monthlyRemaining = calculateMonthlyAmount(remainingBudget, 'yearly');

  // Get recent expenses (last 5)
  const recentExpenses = data.expenses
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <View style={[commonStyles.container, { backgroundColor: currentColors.background }]}>
      <View style={[commonStyles.header, { backgroundColor: currentColors.backgroundAlt, borderBottomColor: currentColors.border }]}>
        <View style={{ width: 24 }} />
        <Text style={[commonStyles.headerTitle, { color: currentColors.text }]}>Budget Overview</Text>
        <TouchableOpacity onPress={() => router.push('/add-expense')}>
          <Icon name="add-circle" size={28} style={{ color: currentColors.primary }} />
        </TouchableOpacity>
      </View>

      <ScrollView style={commonStyles.content} contentContainerStyle={commonStyles.scrollContent}>
        {/* Budget Summary Cards */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { color: currentColors.text, marginBottom: 20 }]}>Monthly Summary</Text>
          
          {/* Income Card */}
          <View style={[
            commonStyles.card, 
            { 
              backgroundColor: currentColors.income + '15', 
              borderColor: currentColors.income + '30',
              borderWidth: 2,
            }
          ]}>
            <View style={[commonStyles.row, { marginBottom: 8 }]}>
              <View style={commonStyles.rowStart}>
                <Icon name="trending-up" size={24} style={{ color: currentColors.income, marginRight: 12 }} />
                <Text style={[commonStyles.text, { fontWeight: '700', color: currentColors.text }]}>Total Income</Text>
              </View>
              <Text style={[commonStyles.text, { fontWeight: '800', color: currentColors.income, fontSize: 20 }]}>
                {formatCurrency(monthlyIncome)}
              </Text>
            </View>
            <Text style={[commonStyles.textSecondary, { color: currentColors.textSecondary }]}>
              From {data.people.length} {data.people.length === 1 ? 'person' : 'people'}
            </Text>
          </View>

          {/* Expenses Card */}
          <View style={[
            commonStyles.card, 
            { 
              backgroundColor: currentColors.expense + '15', 
              borderColor: currentColors.expense + '30',
              borderWidth: 2,
            }
          ]}>
            <View style={[commonStyles.row, { marginBottom: 8 }]}>
              <View style={commonStyles.rowStart}>
                <Icon name="trending-down" size={24} style={{ color: currentColors.expense, marginRight: 12 }} />
                <Text style={[commonStyles.text, { fontWeight: '700', color: currentColors.text }]}>Total Expenses</Text>
              </View>
              <Text style={[commonStyles.text, { fontWeight: '800', color: currentColors.expense, fontSize: 20 }]}>
                {formatCurrency(monthlyExpenses)}
              </Text>
            </View>
            <Text style={[commonStyles.textSecondary, { color: currentColors.textSecondary }]}>
              {data.expenses.length} {data.expenses.length === 1 ? 'expense' : 'expenses'} tracked
            </Text>
          </View>

          {/* Remaining Budget Card */}
          <View style={[
            commonStyles.card, 
            { 
              backgroundColor: monthlyRemaining >= 0 ? currentColors.success + '15' : currentColors.error + '15',
              borderColor: monthlyRemaining >= 0 ? currentColors.success + '30' : currentColors.error + '30',
              borderWidth: 2,
            }
          ]}>
            <View style={[commonStyles.row, { marginBottom: 8 }]}>
              <View style={commonStyles.rowStart}>
                <Icon 
                  name={monthlyRemaining >= 0 ? "checkmark-circle" : "alert-circle"} 
                  size={24} 
                  style={{ 
                    color: monthlyRemaining >= 0 ? currentColors.success : currentColors.error, 
                    marginRight: 12 
                  }} 
                />
                <Text style={[commonStyles.text, { fontWeight: '700', color: currentColors.text }]}>
                  {monthlyRemaining >= 0 ? 'Remaining Budget' : 'Over Budget'}
                </Text>
              </View>
              <Text style={[
                commonStyles.text, 
                { 
                  fontWeight: '800', 
                  color: monthlyRemaining >= 0 ? currentColors.success : currentColors.error,
                  fontSize: 20,
                }
              ]}>
                {formatCurrency(Math.abs(monthlyRemaining))}
              </Text>
            </View>
            <Text style={[commonStyles.textSecondary, { color: currentColors.textSecondary }]}>
              {monthlyRemaining >= 0 
                ? 'You\'re within budget this month' 
                : 'Consider reducing expenses'
              }
            </Text>
          </View>
        </View>

        {/* Expense Breakdown */}
        {data.expenses.length > 0 && (
          <View style={commonStyles.section}>
            <Text style={[commonStyles.subtitle, { color: currentColors.text, marginBottom: 20 }]}>Expense Breakdown</Text>
            
            <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
              <View style={[commonStyles.row, { marginBottom: 16 }]}>
                <View style={commonStyles.rowStart}>
                  <Icon name="home" size={20} style={{ color: currentColors.household, marginRight: 8 }} />
                  <Text style={[commonStyles.text, { color: currentColors.text }]}>Household</Text>
                </View>
                <Text style={[commonStyles.text, { fontWeight: '700', color: currentColors.household }]}>
                  {formatCurrency(calculateMonthlyAmount(householdExpenses, 'yearly'))}
                </Text>
              </View>
              
              <View style={[commonStyles.row, { borderTopWidth: 1, borderTopColor: currentColors.border, paddingTop: 16 }]}>
                <View style={commonStyles.rowStart}>
                  <Icon name="person" size={20} style={{ color: currentColors.personal, marginRight: 8 }} />
                  <Text style={[commonStyles.text, { color: currentColors.text }]}>Personal</Text>
                </View>
                <Text style={[commonStyles.text, { fontWeight: '700', color: currentColors.personal }]}>
                  {formatCurrency(calculateMonthlyAmount(personalExpenses, 'yearly'))}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Recent Expenses */}
        {recentExpenses.length > 0 && (
          <View style={commonStyles.section}>
            <View style={[commonStyles.row, { marginBottom: 20 }]}>
              <Text style={[commonStyles.subtitle, { color: currentColors.text, marginBottom: 0 }]}>Recent Expenses</Text>
              <TouchableOpacity onPress={() => router.push('/expenses')}>
                <Text style={[commonStyles.text, { color: currentColors.primary, fontWeight: '600' }]}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {recentExpenses.map((expense) => {
              const person = expense.personId ? data.people.find(p => p.id === expense.personId) : null;
              const monthlyAmount = calculateMonthlyAmount(expense.amount, expense.frequency);
              
              return (
                <TouchableOpacity
                  key={expense.id}
                  style={[
                    commonStyles.card,
                    { 
                      backgroundColor: currentColors.backgroundAlt, 
                      borderColor: currentColors.border,
                      marginBottom: 12,
                    }
                  ]}
                  onPress={() => handleEditExpense(expense.id)}
                  activeOpacity={0.7}
                >
                  <View style={[commonStyles.row, { marginBottom: 8 }]}>
                    <View style={commonStyles.flex1}>
                      <Text style={[commonStyles.text, { fontWeight: '700', color: currentColors.text }]}>
                        {expense.description}
                      </Text>
                      <Text style={[commonStyles.textSecondary, { color: currentColors.textSecondary, marginTop: 2 }]}>
                        {expense.category === 'personal' && person ? `${person.name} • ` : ''}
                        {expense.frequency} • {new Date(expense.date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[
                        commonStyles.text, 
                        { 
                          fontWeight: '700', 
                          color: expense.category === 'household' ? currentColors.household : currentColors.personal 
                        }
                      ]}>
                        {formatCurrency(expense.amount)}
                      </Text>
                      <Text style={[commonStyles.textSecondary, { color: currentColors.textSecondary }]}>
                        {formatCurrency(monthlyAmount)}/mo
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[commonStyles.row, { alignItems: 'center' }]}>
                    <View style={[
                      commonStyles.badge,
                      { 
                        backgroundColor: expense.category === 'household' ? currentColors.household : currentColors.personal,
                        marginRight: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }
                    ]}>
                      <Text style={[
                        commonStyles.badgeText,
                        { color: '#FFFFFF', fontSize: 11, fontWeight: '700' }
                      ]}>
                        {expense.category.toUpperCase()}
                      </Text>
                    </View>
                    
                    <Text style={[commonStyles.textSecondary, { flex: 1, color: currentColors.textSecondary }]}>
                      Tap to edit
                    </Text>
                    
                    <Icon name="chevron-forward-outline" size={16} style={{ color: currentColors.textSecondary }} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Quick Actions */}
        {data.expenses.length === 0 && data.people.length === 0 && (
          <View style={commonStyles.section}>
            <Text style={[commonStyles.subtitle, { color: currentColors.text, marginBottom: 20 }]}>Get Started</Text>
            
            <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
              <View style={commonStyles.centerContent}>
                <Icon name="rocket-outline" size={48} style={{ color: currentColors.primary, marginBottom: 16 }} />
                <Text style={[commonStyles.subtitle, { textAlign: 'center', marginBottom: 12, color: currentColors.text }]}>
                  Welcome to Budget Tracker!
                </Text>
                <Text style={[commonStyles.textSecondary, { textAlign: 'center', marginBottom: 20, color: currentColors.textSecondary }]}>
                  Start by adding people and their income, then track your expenses.
                </Text>
                
                <View style={{ width: '100%', gap: 12 }}>
                  <TouchableOpacity
                    style={[
                      commonStyles.card,
                      { 
                        backgroundColor: currentColors.primary + '15',
                        borderColor: currentColors.primary + '30',
                        borderWidth: 2,
                        marginBottom: 0,
                        padding: 16,
                      }
                    ]}
                    onPress={() => router.push('/people')}
                  >
                    <View style={[commonStyles.row, { alignItems: 'center' }]}>
                      <Icon name="people" size={24} style={{ color: currentColors.primary, marginRight: 12 }} />
                      <View style={commonStyles.flex1}>
                        <Text style={[commonStyles.text, { fontWeight: '700', color: currentColors.text }]}>Add People</Text>
                        <Text style={[commonStyles.textSecondary, { color: currentColors.textSecondary }]}>
                          Set up household members and income
                        </Text>
                      </View>
                      <Icon name="chevron-forward" size={20} style={{ color: currentColors.primary }} />
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      commonStyles.card,
                      { 
                        backgroundColor: currentColors.secondary + '15',
                        borderColor: currentColors.secondary + '30',
                        borderWidth: 2,
                        marginBottom: 0,
                        padding: 16,
                      }
                    ]}
                    onPress={() => router.push('/add-expense')}
                  >
                    <View style={[commonStyles.row, { alignItems: 'center' }]}>
                      <Icon name="receipt" size={24} style={{ color: currentColors.secondary, marginRight: 12 }} />
                      <View style={commonStyles.flex1}>
                        <Text style={[commonStyles.text, { fontWeight: '700', color: currentColors.text }]}>Add Expense</Text>
                        <Text style={[commonStyles.textSecondary, { color: currentColors.textSecondary }]}>
                          Track your first expense
                        </Text>
                      </View>
                      <Icon name="chevron-forward" size={20} style={{ color: currentColors.secondary }} />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
