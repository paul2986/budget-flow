
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useBudgetData } from '../hooks/useBudgetData';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../hooks/useCurrency';
import { 
  calculateTotalIncome, 
  calculateTotalExpenses, 
  calculateHouseholdExpenses,
  calculatePersonalExpenses,
  calculateMonthlyAmount,
  calculatePersonIncome,
  calculateHouseholdShare,
} from '../utils/calculations';
import Icon from '../components/Icon';
import PersonBreakdownChart from '../components/PersonBreakdownChart';
import StandardHeader from '../components/StandardHeader';
import { useToast } from '../hooks/useToast';
import RecurringWidget from '../components/RecurringWidget';

export default function HomeScreen() {
  const { data, loading, refreshData, activeBudget } = useBudgetData();
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();
  const { formatCurrency, loading: currencyLoading } = useCurrency();
  const toast = useToast();

  // Use ref to track if we've already refreshed on this focus
  const hasRefreshedOnFocus = useRef(false);

  // Only refresh data when screen comes into focus, but only once per focus
  useFocusEffect(
    useCallback(() => {
      console.log('HomeScreen: Screen focused');
      
      // Only refresh if we haven't already refreshed on this focus
      if (!hasRefreshedOnFocus.current) {
        console.log('HomeScreen: Refreshing data on focus');
        hasRefreshedOnFocus.current = true;
        refreshData();
      }
      
      // Reset the flag when the screen loses focus
      return () => {
        console.log('HomeScreen: Screen lost focus, resetting refresh flag');
        hasRefreshedOnFocus.current = false;
      };
    }, [refreshData])
  );

  // Memoize calculations to ensure they update when data changes
  const calculations = useMemo(() => {
    console.log('HomeScreen: Recalculating budget data...');
    
    const totalIncome = calculateTotalIncome(data.people);
    const totalExpenses = calculateTotalExpenses(data.expenses);
    const householdExpenses = calculateHouseholdExpenses(data.expenses);
    const personalExpenses = totalExpenses - householdExpenses;
    const remainingBudget = totalIncome - totalExpenses;

    const monthlyIncome = calculateMonthlyAmount(totalIncome, 'yearly');
    const monthlyExpenses = calculateMonthlyAmount(totalExpenses, 'yearly');
    const monthlyRemaining = calculateMonthlyAmount(remainingBudget, 'yearly');

    console.log('HomeScreen: Calculated values:', {
      totalIncome,
      totalExpenses,
      householdExpenses,
      personalExpenses,
      remainingBudget,
      monthlyIncome,
      monthlyExpenses,
      monthlyRemaining
    });

    return {
      totalIncome,
      totalExpenses,
      householdExpenses,
      personalExpenses,
      remainingBudget,
      monthlyIncome,
      monthlyExpenses,
      monthlyRemaining
    };
  }, [data.people, data.expenses]);

  // Memoize recent expenses
  const recentExpenses = useMemo(() => {
    return data.expenses
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [data.expenses]);

  // Memoize person breakdowns
  const personBreakdowns = useMemo(() => {
    console.log('HomeScreen: Recalculating person breakdowns...');
    
    return data.people.map((person) => {
      const personIncome = calculatePersonIncome(person);
      const personPersonalExpenses = calculatePersonalExpenses(data.expenses, person.id);
      const personHouseholdShare = calculateHouseholdShare(
        calculations.householdExpenses,
        data.people,
        data.householdSettings.distributionMethod,
        person.id
      );
      const totalPersonExpenses = personPersonalExpenses + personHouseholdShare;
      const remainingIncome = personIncome - totalPersonExpenses;

      const monthlyPersonIncome = calculateMonthlyAmount(personIncome, 'yearly');
      const monthlyPersonalExpenses = calculateMonthlyAmount(personPersonalExpenses, 'yearly');
      const monthlyHouseholdShare = calculateMonthlyAmount(personHouseholdShare, 'yearly');
      const monthlyRemaining = calculateMonthlyAmount(remainingIncome, 'yearly');

      return {
        person,
        personIncome,
        personPersonalExpenses,
        personHouseholdShare,
        totalPersonExpenses,
        remainingIncome,
        monthlyPersonIncome,
        monthlyPersonalExpenses,
        monthlyHouseholdShare,
        monthlyRemaining
      };
    });
  }, [data.people, data.expenses, data.householdSettings.distributionMethod, calculations.householdExpenses]);

  const handleEditExpense = useCallback((expenseId: string) => {
    console.log('HomeScreen: Navigating to edit expense:', expenseId);
    router.push({
      pathname: '/add-expense',
      params: { id: expenseId, origin: 'home' }
    });
  }, []);

  const handleNavigateToAddExpense = useCallback(() => {
    router.push('/add-expense');
  }, []);

  const handleNavigateToPeople = useCallback(() => {
    router.push('/people');
  }, []);

  const handleNavigateToExpenses = useCallback(() => {
    router.push('/expenses');
  }, []);

  const handleNavigateToBudgets = useCallback(() => {
    router.push('/budgets');
  }, []);

  const handleNavigateToEditPerson = useCallback((personId: string) => {
    console.log('HomeScreen: Navigating to edit person with origin:', personId);
    router.push({
      pathname: '/edit-person',
      params: { personId: personId, origin: 'home' }
    });
  }, []);

  // Show loading state if data is still loading
  if (loading || currencyLoading) {
    return (
      <View style={themedStyles.container}>
        <StandardHeader
          title="Budget Overview"
          showLeftIcon={false}
          showRightIcon={false}
        />
        <View style={[themedStyles.centerContent, { flex: 1 }]}>
          <Text style={themedStyles.textSecondary}>Loading...</Text>
        </View>
      </View>
    );
  }

  const isCompletelyEmpty = data.expenses.length === 0 && data.people.length === 0;

  return (
    <View style={themedStyles.container}>
      <StandardHeader
        title={`Overview • ${activeBudget?.name || 'No Active Budget'}`}
        showLeftIcon={false}
        rightIcon="swap-horizontal"
        onRightPress={handleNavigateToBudgets}
      />

      {/* Quick switch pill */}
      <View style={[themedStyles.section, { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 0 }]}>
        <TouchableOpacity
          onPress={handleNavigateToBudgets}
          style={[
            themedStyles.card,
            { 
              marginBottom: 0,
              padding: 12,
              backgroundColor: currentColors.border + '20',
              borderColor: currentColors.border,
              borderWidth: 2,
              minHeight: 44
            }
          ]}
        >
          <View style={[themedStyles.rowStart]}>
            <Icon name="albums-outline" size={18} style={{ color: currentColors.textSecondary, marginRight: 8 }} />
            <Text style={[themedStyles.textSecondary]}>
              Active Budget: 
              <Text style={{ color: currentColors.text, fontWeight: '700' }}> {activeBudget?.name || 'None'}</Text>
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* If no active budget (edge case), show CTA */}
      {!activeBudget && (
        <ScrollView style={themedStyles.content} contentContainerStyle={themedStyles.scrollContent}>
          <View style={themedStyles.section}>
            <View style={themedStyles.card}>
              <View style={themedStyles.centerContent}>
                <Icon name="albums-outline" size={56} style={{ color: currentColors.textSecondary, marginBottom: 12 }} />
                <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 8 }]}>
                  No Active Budget
                </Text>
                <Text style={[themedStyles.textSecondary, { textAlign: 'center', marginBottom: 16 }]}>
                  Create or select a budget to get started.
                </Text>
                <TouchableOpacity
                  style={[
                    themedStyles.card,
                    { backgroundColor: currentColors.primary, borderColor: currentColors.primary, borderWidth: 2, minHeight: 44 }
                  ]}
                  onPress={handleNavigateToBudgets}
                >
                  <Text style={[themedStyles.text, { color: '#FFFFFF', textAlign: 'center', fontWeight: '700' }]}>
                    Create a budget
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {activeBudget && (
        <ScrollView style={themedStyles.content} contentContainerStyle={themedStyles.scrollContent}>
          {/* Only show Get Started when completely empty */}
          {isCompletelyEmpty ? (
            <View style={themedStyles.section}>
              <Text style={[themedStyles.subtitle, { marginBottom: 20 }]}>Get Started</Text>
              
              <View style={themedStyles.card}>
                <View style={themedStyles.centerContent}>
                  <Icon name="rocket-outline" size={48} style={{ color: currentColors.primary, marginBottom: 16 }} />
                  <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 12 }]}>
                    Welcome to Budget Tracker!
                  </Text>
                  <Text style={[themedStyles.textSecondary, { textAlign: 'center', marginBottom: 20 }]}>
                    Start by adding people and their income, then track your expenses.
                  </Text>
                  
                  <View style={{ width: '100%', gap: 12 }}>
                    <TouchableOpacity
                      style={[
                        themedStyles.card,
                        { 
                          backgroundColor: currentColors.primary + '15',
                          borderColor: currentColors.primary + '30',
                          borderWidth: 2,
                          marginBottom: 0,
                          padding: 16,
                        }
                      ]}
                      onPress={handleNavigateToPeople}
                    >
                      <View style={[themedStyles.row, { alignItems: 'center' }]}>
                        <Icon name="people" size={24} style={{ color: currentColors.primary, marginRight: 12 }} />
                        <View style={themedStyles.flex1}>
                          <Text style={[themedStyles.text, { fontWeight: '700' }]}>Add People</Text>
                          <Text style={themedStyles.textSecondary}>
                            Set up household members and income
                          </Text>
                        </View>
                        <Icon name="chevron-forward" size={20} style={{ color: currentColors.primary }} />
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        themedStyles.card,
                        { 
                          backgroundColor: currentColors.secondary + '15',
                          borderColor: currentColors.secondary + '30',
                          borderWidth: 2,
                          marginBottom: 0,
                          padding: 16,
                        }
                      ]}
                      onPress={handleNavigateToAddExpense}
                    >
                      <View style={[themedStyles.row, { alignItems: 'center' }]}>
                        <Icon name="receipt" size={24} style={{ color: currentColors.secondary, marginRight: 12 }} />
                        <View style={themedStyles.flex1}>
                          <Text style={[themedStyles.text, { fontWeight: '700' }]}>Add Expense</Text>
                          <Text style={themedStyles.textSecondary}>
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
          ) : (
            <>
              {/* Budget Summary Cards */}
              <View style={themedStyles.section}>
                <Text style={[themedStyles.subtitle, { marginBottom: 20 }]}>Monthly Summary</Text>
                
                {/* Income Card */}
                <View style={[
                  themedStyles.card, 
                  { 
                    backgroundColor: currentColors.income + '15', 
                    borderColor: currentColors.income + '30',
                    borderWidth: 2,
                  }
                ]}>
                  <View style={[themedStyles.row, { marginBottom: 8 }]}>
                    <View style={themedStyles.rowStart}>
                      <Icon name="trending-up" size={24} style={{ color: currentColors.income, marginRight: 12 }} />
                      <Text style={[themedStyles.text, { fontWeight: '700' }]}>Total Income</Text>
                    </View>
                    <Text style={[themedStyles.text, { fontWeight: '800', color: currentColors.income, fontSize: 20 }]}>
                      {formatCurrency(calculations.monthlyIncome)}
                    </Text>
                  </View>
                  <Text style={themedStyles.textSecondary}>
                    From {data.people.length} {data.people.length === 1 ? 'person' : 'people'}
                  </Text>
                </View>

                {/* Expenses Card */}
                <View style={[
                  themedStyles.card, 
                  { 
                    backgroundColor: currentColors.expense + '15', 
                    borderColor: currentColors.expense + '30',
                    borderWidth: 2,
                  }
                ]}>
                  <View style={[themedStyles.row, { marginBottom: 8 }]}>
                    <View style={themedStyles.rowStart}>
                      <Icon name="trending-down" size={24} style={{ color: currentColors.expense, marginRight: 12 }} />
                      <Text style={[themedStyles.text, { fontWeight: '700' }]}>Total Expenses</Text>
                    </View>
                    <Text style={[themedStyles.text, { fontWeight: '800', color: currentColors.expense, fontSize: 20 }]}>
                      {formatCurrency(calculations.monthlyExpenses)}
                    </Text>
                  </View>
                  <Text style={themedStyles.textSecondary}>
                    {data.expenses.length} {data.expenses.length === 1 ? 'expense' : 'expenses'} tracked
                  </Text>
                </View>

                {/* Remaining Budget Card */}
                <View style={[
                  themedStyles.card, 
                  { 
                    backgroundColor: calculations.monthlyRemaining >= 0 ? currentColors.success + '15' : currentColors.error + '15',
                    borderColor: calculations.monthlyRemaining >= 0 ? currentColors.success + '30' : currentColors.error + '30',
                    borderWidth: 2,
                  }
                ]}>
                  <View style={[themedStyles.row, { marginBottom: 8 }]}>
                    <View style={themedStyles.rowStart}>
                      <Icon 
                        name={calculations.monthlyRemaining >= 0 ? "checkmark-circle" : "alert-circle"} 
                        size={24} 
                        style={{ 
                          color: calculations.monthlyRemaining >= 0 ? currentColors.success : currentColors.error, 
                          marginRight: 12 
                        }} 
                      />
                      <Text style={[themedStyles.text, { fontWeight: '700' }]}>
                        {calculations.monthlyRemaining >= 0 ? 'Remaining Budget' : 'Over Budget'}
                      </Text>
                    </View>
                    <Text style={[
                      themedStyles.text, 
                      { 
                        fontWeight: '800', 
                        color: calculations.monthlyRemaining >= 0 ? currentColors.success : currentColors.error,
                        fontSize: 20,
                      }
                    ]}>
                      {formatCurrency(Math.abs(calculations.monthlyRemaining))}
                    </Text>
                  </View>
                  <Text style={themedStyles.textSecondary}>
                    {calculations.monthlyRemaining >= 0 
                      ? 'You\'re within budget this month' 
                      : 'Consider reducing expenses'
                    }
                  </Text>
                </View>
              </View>

              {/* Individual Person Breakdowns */}
              {data.people.length > 0 && (
                <View style={themedStyles.section}>
                  <Text style={[themedStyles.subtitle, { marginBottom: 20 }]}>
                    Individual Breakdowns
                  </Text>
                  
                  {personBreakdowns.map((breakdown) => {
                    const { person, monthlyPersonIncome, monthlyPersonalExpenses, monthlyHouseholdShare, monthlyRemaining } = breakdown;

                    return (
                      <View 
                        key={person.id} 
                        style={[
                          themedStyles.card, 
                          { 
                            marginBottom: 20,
                          }
                        ]}
                      >
                        {/* Person Header */}
                        <View style={[themedStyles.row, { marginBottom: 20 }]}>
                          <View style={themedStyles.rowStart}>
                            <Icon name="person-circle" size={32} style={{ color: currentColors.primary, marginRight: 12 }} />
                            <View>
                              <Text style={[themedStyles.text, { fontWeight: '700', fontSize: 18 }]}>
                                {person.name}
                              </Text>
                              <Text style={themedStyles.textSecondary}>
                                Monthly Income: {formatCurrency(monthlyPersonIncome)}
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity onPress={() => handleNavigateToEditPerson(person.id)}>
                            <Icon name="create-outline" size={24} style={{ color: currentColors.primary }} />
                          </TouchableOpacity>
                        </View>

                        {/* Visual Breakdown Chart */}
                        <PersonBreakdownChart
                          income={monthlyPersonIncome}
                          personalExpenses={monthlyPersonalExpenses}
                          householdShare={monthlyHouseholdShare}
                          remaining={monthlyRemaining}
                        />

                        {/* Detailed Breakdown */}
                        <View style={{ marginTop: 20 }}>
                          {/* Income Row */}
                          <View style={[themedStyles.row, { marginBottom: 12 }]}>
                            <View style={themedStyles.rowStart}>
                              <View style={{
                                width: 12,
                                height: 12,
                                borderRadius: 6,
                                backgroundColor: currentColors.income,
                                marginRight: 8,
                              }} />
                              <Text style={themedStyles.text}>Total Income</Text>
                            </View>
                            <Text style={[themedStyles.text, { fontWeight: '700', color: currentColors.income }]}>
                              {formatCurrency(monthlyPersonIncome)}
                            </Text>
                          </View>

                          {/* Personal Expenses Row */}
                          <View style={[themedStyles.row, { marginBottom: 12 }]}>
                            <View style={themedStyles.rowStart}>
                              <View style={{
                                width: 12,
                                height: 12,
                                borderRadius: 6,
                                backgroundColor: currentColors.personal,
                                marginRight: 8,
                              }} />
                              <Text style={themedStyles.text}>Personal Expenses</Text>
                            </View>
                            <Text style={[themedStyles.text, { fontWeight: '700', color: currentColors.personal }]}>
                              {formatCurrency(monthlyPersonalExpenses)}
                            </Text>
                          </View>

                          {/* Household Share Row */}
                          <View style={[themedStyles.row, { marginBottom: 12 }]}>
                            <View style={themedStyles.rowStart}>
                              <View style={{
                                width: 12,
                                height: 12,
                                borderRadius: 6,
                                backgroundColor: currentColors.household,
                                marginRight: 8,
                              }} />
                              <Text style={themedStyles.text}>
                                Household Share ({data.householdSettings.distributionMethod === 'even' ? 'Even' : 'Income-based'})
                              </Text>
                            </View>
                            <Text style={[themedStyles.text, { fontWeight: '700', color: currentColors.household }]}>
                              {formatCurrency(monthlyHouseholdShare)}
                            </Text>
                          </View>

                          {/* Remaining Income Row */}
                          <View style={[
                            themedStyles.row, 
                            { 
                              borderTopWidth: 1, 
                              borderTopColor: currentColors.border, 
                              paddingTop: 12,
                              marginTop: 8,
                            }
                          ]}>
                            <View style={themedStyles.rowStart}>
                              <View style={{
                                width: 12,
                                height: 12,
                                borderRadius: 6,
                                backgroundColor: monthlyRemaining >= 0 ? currentColors.success : currentColors.error,
                                marginRight: 8,
                              }} />
                              <Text style={[themedStyles.text, { fontWeight: '600' }]}>
                                {monthlyRemaining >= 0 ? 'Remaining' : 'Over Budget'}
                              </Text>
                            </View>
                            <Text style={[
                              themedStyles.text, 
                              { 
                                fontWeight: '700', 
                                color: monthlyRemaining >= 0 ? currentColors.success : currentColors.error,
                                fontSize: 18,
                              }
                            ]}>
                              {formatCurrency(Math.abs(monthlyRemaining))}
                            </Text>
                          </View>

                          {/* Budget Status */}
                          <View style={{ marginTop: 12 }}>
                            <Text style={[
                              themedStyles.textSecondary, 
                              { 
                                textAlign: 'center',
                                fontStyle: 'italic',
                              }
                            ]}>
                              {monthlyRemaining >= 0 
                                ? `${((monthlyRemaining / monthlyPersonIncome) * 100).toFixed(1)}% of income remaining`
                                : `${((Math.abs(monthlyRemaining) / monthlyPersonIncome) * 100).toFixed(1)}% over budget`
                              }
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Recurring ending/ended widget - moved below Individual Breakdowns and above Recent Expenses */}
              <View style={themedStyles.section}>
                <RecurringWidget />
              </View>

              {/* Overall Expense Breakdown */}
              {data.expenses.length > 0 && (
                <View style={themedStyles.section}>
                  <Text style={[themedStyles.subtitle, { marginBottom: 20 }]}>
                    Overall Expense Breakdown
                  </Text>
                  
                  <View style={themedStyles.card}>
                    <View style={[themedStyles.row, { marginBottom: 16 }]}>
                      <View style={themedStyles.rowStart}>
                        <Icon name="home" size={20} style={{ color: currentColors.household, marginRight: 8 }} />
                        <Text style={themedStyles.text}>Household Expenses</Text>
                      </View>
                      <Text style={[themedStyles.text, { fontWeight: '700', color: currentColors.household }]}>
                        {formatCurrency(calculateMonthlyAmount(calculations.householdExpenses, 'yearly'))}
                      </Text>
                    </View>
                    
                    <View style={[themedStyles.row, { borderTopWidth: 1, borderTopColor: currentColors.border, paddingTop: 16 }]}>
                      <View style={themedStyles.rowStart}>
                        <Icon name="person" size={20} style={{ color: currentColors.personal, marginRight: 8 }} />
                        <Text style={themedStyles.text}>Personal Expenses</Text>
                      </View>
                      <Text style={[themedStyles.text, { fontWeight: '700', color: currentColors.personal }]}>
                        {formatCurrency(calculateMonthlyAmount(calculations.personalExpenses, 'yearly'))}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Recent Expenses */}
              {recentExpenses.length > 0 && (
                <View style={themedStyles.section}>
                  <View style={[themedStyles.row, { marginBottom: 20 }]}>
                    <Text style={[themedStyles.subtitle, { marginBottom: 0 }]}>Recent Expenses</Text>
                    <TouchableOpacity onPress={handleNavigateToExpenses}>
                      <Text style={[themedStyles.text, { color: currentColors.primary, fontWeight: '600' }]}>View All</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {recentExpenses.map((expense) => {
                    const person = expense.personId ? data.people.find(p => p.id === expense.personId) : null;
                    const monthlyAmount = calculateMonthlyAmount(expense.amount, expense.frequency);
                    
                    return (
                      <TouchableOpacity
                        key={expense.id}
                        style={[
                          themedStyles.card,
                          { 
                            marginBottom: 12,
                          }
                        ]}
                        onPress={() => handleEditExpense(expense.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[themedStyles.row, { marginBottom: 8 }]}>
                          <View style={themedStyles.flex1}>
                            <Text style={[themedStyles.text, { fontWeight: '700' }]}>
                              {expense.description}
                            </Text>
                            <Text style={[themedStyles.textSecondary, { marginTop: 2 }]}>
                              {expense.category === 'personal' && person ? `${person.name} • ` : ''}
                              {expense.frequency} • {new Date(expense.date).toLocaleDateString()}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[
                              themedStyles.text, 
                              { 
                                fontWeight: '700', 
                                color: expense.category === 'household' ? currentColors.household : currentColors.personal 
                              }
                            ]}>
                              {formatCurrency(expense.amount)}
                            </Text>
                            <Text style={themedStyles.textSecondary}>
                              {formatCurrency(monthlyAmount)}/mo
                            </Text>
                          </View>
                        </View>
                        
                        <View style={[themedStyles.row, { alignItems: 'center' }]}>
                          <View style={[
                            themedStyles.badge,
                            { 
                              backgroundColor: expense.category === 'household' ? currentColors.household : currentColors.personal,
                              marginRight: 8,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 12,
                            }
                          ]}>
                            <Text style={[
                              themedStyles.badgeText,
                              { color: '#FFFFFF', fontSize: 11, fontWeight: '700' }
                            ]}>
                              {expense.category.toUpperCase()}
                            </Text>
                          </View>
                          
                          <Text style={[themedStyles.textSecondary, { flex: 1 }]}>
                            Tap to edit
                          </Text>
                          
                          <Icon name="chevron-forward-outline" size={16} style={{ color: currentColors.textSecondary }} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Encourage adding people when there are expenses but no people */}
              {data.expenses.length > 0 && data.people.length === 0 && (
                <View style={themedStyles.section}>
                  <View style={[themedStyles.card, { backgroundColor: currentColors.warning + '15', borderColor: currentColors.warning + '30', borderWidth: 2 }]}>
                    <View style={themedStyles.centerContent}>
                      <Icon name="people-outline" size={32} style={{ color: currentColors.warning, marginBottom: 12 }} />
                      <Text style={[themedStyles.text, { fontWeight: '700', textAlign: 'center', marginBottom: 8 }]}>
                        Add People for Better Insights
                      </Text>
                      <Text style={[themedStyles.textSecondary, { textAlign: 'center', marginBottom: 16 }]}>
                        Add household members and their income to see detailed breakdowns and track personal vs household expenses.
                      </Text>
                      <TouchableOpacity
                        style={[
                          themedStyles.card,
                          { 
                            backgroundColor: currentColors.primary + '15',
                            borderColor: currentColors.primary + '30',
                            borderWidth: 2,
                            marginBottom: 0,
                            padding: 12,
                            width: '100%',
                          }
                        ]}
                        onPress={handleNavigateToPeople}
                      >
                        <View style={[themedStyles.row, { alignItems: 'center', justifyContent: 'center' }]}>
                          <Icon name="people" size={20} style={{ color: currentColors.primary, marginRight: 8 }} />
                          <Text style={[themedStyles.text, { fontWeight: '700', color: currentColors.primary }]}>Add People</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* Encourage adding expenses when there are people but no expenses */}
              {data.people.length > 0 && data.expenses.length === 0 && (
                <View style={themedStyles.section}>
                  <View style={[themedStyles.card, { backgroundColor: currentColors.secondary + '15', borderColor: currentColors.secondary + '30', borderWidth: 2 }]}>
                    <View style={themedStyles.centerContent}>
                      <Icon name="receipt-outline" size={32} style={{ color: currentColors.secondary, marginBottom: 12 }} />
                      <Text style={[themedStyles.text, { fontWeight: '700', textAlign: 'center', marginBottom: 8 }]}>
                        Start Tracking Expenses
                      </Text>
                      <Text style={[themedStyles.textSecondary, { textAlign: 'center', marginBottom: 16 }]}>
                        You have {data.people.length} {data.people.length === 1 ? 'person' : 'people'} set up. Now start adding expenses to see your budget breakdown.
                      </Text>
                      <TouchableOpacity
                        style={[
                          themedStyles.card,
                          { 
                            backgroundColor: currentColors.secondary + '15',
                            borderColor: currentColors.secondary + '30',
                            borderWidth: 2,
                            marginBottom: 0,
                            padding: 12,
                            width: '100%',
                          }
                        ]}
                        onPress={handleNavigateToAddExpense}
                      >
                        <View style={[themedStyles.row, { alignItems: 'center', justifyContent: 'center' }]}>
                          <Icon name="add-circle" size={20} style={{ color: currentColors.secondary, marginRight: 8 }} />
                          <Text style={[themedStyles.text, { fontWeight: '700', color: currentColors.secondary }]}>Add Expense</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
