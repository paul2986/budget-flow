
import { 
  calculateTotalIncome, 
  calculateTotalExpenses, 
  calculateHouseholdExpenses,
  calculatePersonalExpenses,
  calculateMonthlyAmount,
  calculatePersonIncome,
  calculateHouseholdShare,
} from '../utils/calculations';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../hooks/useCurrency';
import { router, useFocusEffect } from 'expo-router';
import Icon from '../components/Icon';
import { Text, View, ScrollView, TouchableOpacity, AppState } from 'react-native';
import { useBudgetData } from '../hooks/useBudgetData';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useToast } from '../hooks/useToast';
import StandardHeader from '../components/StandardHeader';
import { useBudgetLock } from '../hooks/useBudgetLock';
import { BlurView } from 'expo-blur';
import OverviewSection from '../components/OverviewSection';
import IndividualBreakdownsSection from '../components/IndividualBreakdownsSection';
import ExpiringSection from '../components/ExpiringSection';
import QuickActionsSection from '../components/QuickActionsSection';
import Button from '../components/Button';

export default function HomeScreen() {
  const { currentColors } = useTheme();
  const { formatCurrency } = useCurrency();
  const { themedStyles } = useThemedStyles();
  const { showToast } = useToast();
  const { data, loading, activeBudget, refreshTrigger, refreshData } = useBudgetData();
  const { isLocked, authenticateForBudget } = useBudgetLock();
  
  const [authenticating, setAuthenticating] = useState(false);
  const appState = useRef(AppState.currentState);

  const budgetLocked = useMemo(() => {
    return activeBudget ? isLocked(activeBudget) : false;
  }, [activeBudget, isLocked]);

  // Check if this is a first-time user or if they need guidance
  const isFirstTimeUser = useMemo(() => {
    if (!activeBudget || !data) return true;
    
    const people = data && data.people && Array.isArray(data.people) ? data.people : [];
    const expenses = data && data.expenses && Array.isArray(data.expenses) ? data.expenses : [];
    
    // First time if no people and no expenses
    return people.length === 0 && expenses.length === 0;
  }, [activeBudget, data]);

  const shouldShowFullDashboard = useMemo(() => {
    if (!activeBudget || !data) return false;
    
    const people = data && data.people && Array.isArray(data.people) ? data.people : [];
    const expenses = data && data.expenses && Array.isArray(data.expenses) ? data.expenses : [];
    
    // Show full dashboard only if both people and expenses exist
    return people.length > 0 && expenses.length > 0;
  }, [activeBudget, data]);

  // Check lock status when app becomes active
  const handleAppStateChange = useCallback((nextAppState: string) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('HomeScreen: App became active, checking lock status');
    }
    appState.current = nextAppState;
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('HomeScreen: Screen focused, refreshing data');
      refreshData(true);
      
      const subscription = AppState.addEventListener('change', handleAppStateChange);
      return () => subscription?.remove();
    }, [handleAppStateChange, refreshData])
  );

  const calculations = useMemo(() => {
    if (!activeBudget || !data) {
      console.log('HomeScreen: Missing activeBudget or data for calculations:', { activeBudget: !!activeBudget, data: !!data });
      return null;
    }

    const people = data && data.people && Array.isArray(data.people) ? data.people : [];
    const expenses = data && data.expenses && Array.isArray(data.expenses) ? data.expenses : [];

    console.log('HomeScreen: Calculating with data:', { 
      refreshTrigger,
      activeBudgetId: activeBudget.id,
      activeBudgetName: activeBudget.name,
      peopleCount: people.length, 
      expensesCount: expenses.length,
      peopleIds: people.map(p => p && p.id).filter(Boolean),
      expenseIds: expenses.map(e => e && e.id).filter(Boolean)
    });

    const totalIncome = calculateTotalIncome(people);
    const totalExpenses = calculateTotalExpenses(expenses);
    const householdExpenses = calculateHouseholdExpenses(expenses);
    const personalExpenses = calculatePersonalExpenses(expenses);
    const remaining = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      householdExpenses,
      personalExpenses,
      remaining,
    };
  }, [activeBudget, data, refreshTrigger]);

  const handleUnlock = useCallback(async () => {
    if (!activeBudget) return;
    
    setAuthenticating(true);
    try {
      const success = await authenticateForBudget(activeBudget.id);
      if (!success) {
        showToast('Authentication failed', 'error');
      }
    } catch (error) {
      console.error('HomeScreen: Authentication error:', error);
      showToast('Authentication error', 'error');
    } finally {
      setAuthenticating(false);
    }
  }, [activeBudget, authenticateForBudget, showToast]);

  const handleBackToBudgets = useCallback(() => {
    router.push('/budgets');
  }, []);

  if (loading) {
    return (
      <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
        <StandardHeader title="Loading..." />
        <View style={[themedStyles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={themedStyles.textSecondary}>Loading...</Text>
        </View>
      </View>
    );
  }

  // First-time user: No budget found - redirect to budget creation
  if (!activeBudget) {
    return (
      <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
        <StandardHeader title="Budget Flow" />
        <View style={[themedStyles.content, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
          <Icon name="wallet-outline" size={64} style={{ color: currentColors.textSecondary, marginBottom: 16 }} />
          <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 8 }]}>
            Welcome to Budget Flow!
          </Text>
          <Text style={[themedStyles.textSecondary, { textAlign: 'center', marginBottom: 24 }]}>
            Let's get started by creating your first budget
          </Text>
          <Button
            text="Create Your First Budget"
            onPress={() => router.push('/budgets')}
            variant="primary"
          />
        </View>
      </View>
    );
  }

  // Show lock screen if budget is locked
  if (budgetLocked) {
    return (
      <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
        <StandardHeader title={activeBudget.name} />
        
        <View style={{ flex: 1, position: 'relative' }}>
          <View style={{ flex: 1, opacity: 0.3 }}>
            <ScrollView style={themedStyles.content} contentContainerStyle={{ padding: 16 }}>
              <View style={[themedStyles.card, { height: 120, marginBottom: 16 }]} />
              <View style={[themedStyles.card, { height: 80, marginBottom: 16 }]} />
              <View style={[themedStyles.card, { height: 200, marginBottom: 16 }]} />
              <View style={[themedStyles.card, { height: 100 }]} />
            </ScrollView>
          </View>

          <BlurView
            intensity={20}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24,
            }}
          >
            <View
              style={[
                themedStyles.card,
                {
                  backgroundColor: currentColors.backgroundAlt,
                  borderColor: currentColors.border,
                  borderWidth: 1,
                  padding: 32,
                  alignItems: 'center',
                  maxWidth: 320,
                  width: '100%',
                },
              ]}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: currentColors.error + '20',
                  borderWidth: 2,
                  borderColor: currentColors.error,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                }}
              >
                <Icon name="lock-closed" size={32} style={{ color: currentColors.error }} />
              </View>

              <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 8 }]}>
                This budget is locked
              </Text>

              <Text style={[themedStyles.textSecondary, { textAlign: 'center', marginBottom: 24 }]}>
                "{activeBudget.name}" requires authentication to view
              </Text>

              <View style={{ width: '100%', gap: 12 }}>
                <TouchableOpacity
                  style={[
                    themedStyles.card,
                    {
                      backgroundColor: currentColors.primary,
                      borderColor: currentColors.primary,
                      borderWidth: 2,
                      minHeight: 50,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 0,
                    },
                  ]}
                  onPress={handleUnlock}
                  disabled={authenticating}
                >
                  {authenticating ? (
                    <Text style={[themedStyles.text, { color: '#fff', fontSize: 16, fontWeight: '600' }]}>
                      Authenticating...
                    </Text>
                  ) : (
                    <>
                      <Icon name="lock-open" size={20} style={{ color: '#fff', marginRight: 12 }} />
                      <Text style={[themedStyles.text, { color: '#fff', fontSize: 16, fontWeight: '600' }]}>
                        Unlock to view
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    themedStyles.card,
                    {
                      backgroundColor: 'transparent',
                      borderColor: currentColors.border,
                      borderWidth: 2,
                      minHeight: 50,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 0,
                    },
                  ]}
                  onPress={handleBackToBudgets}
                  disabled={authenticating}
                >
                  <Text style={[themedStyles.text, { fontSize: 16, fontWeight: '600' }]}>
                    Back to Budgets
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </View>
    );
  }

  const people = data && data.people && Array.isArray(data.people) ? data.people : [];
  const expenses = data && data.expenses && Array.isArray(data.expenses) ? data.expenses : [];

  // First-time user guidance: Budget exists but no people/expenses
  if (isFirstTimeUser) {
    return (
      <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
        <StandardHeader 
          title={activeBudget.name}
          rightIcon="wallet-outline"
          onRightPress={() => router.push('/budgets')}
        />

        <ScrollView 
          style={themedStyles.content} 
          contentContainerStyle={[
            themedStyles.scrollContent,
            {
              paddingHorizontal: 24,
              paddingTop: 32,
              justifyContent: 'center',
              flex: 1,
            }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Icon name="rocket-outline" size={64} style={{ color: currentColors.primary, marginBottom: 16 }} />
            <Text style={[themedStyles.title, { textAlign: 'center', marginBottom: 8 }]}>
              Great! Your budget is ready
            </Text>
            <Text style={[themedStyles.textSecondary, { textAlign: 'center', fontSize: 16, lineHeight: 24 }]}>
              Now let's add some people and expenses to get started with tracking your finances
            </Text>
          </View>

          <View style={{ gap: 16, marginBottom: 32 }}>
            <View style={[
              themedStyles.card,
              {
                backgroundColor: currentColors.primary + '10',
                borderColor: currentColors.primary + '30',
                borderWidth: 1,
                padding: 20,
              }
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Icon name="people" size={24} style={{ color: currentColors.primary, marginRight: 12 }} />
                <Text style={[themedStyles.subtitle, { fontSize: 18, fontWeight: '700' }]}>
                  Step 1: Add People
                </Text>
              </View>
              <Text style={[themedStyles.textSecondary, { marginBottom: 16, lineHeight: 20 }]}>
                Add yourself and anyone else who shares expenses. Each person can have their own income sources.
              </Text>
              <Button
                text="Add People & Income"
                onPress={() => router.push('/people')}
                variant="primary"
              />
            </View>

            <View style={[
              themedStyles.card,
              {
                backgroundColor: currentColors.secondary + '10',
                borderColor: currentColors.secondary + '30',
                borderWidth: 1,
                padding: 20,
              }
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Icon name="card" size={24} style={{ color: currentColors.secondary, marginRight: 12 }} />
                <Text style={[themedStyles.subtitle, { fontSize: 18, fontWeight: '700' }]}>
                  Step 2: Add Expenses
                </Text>
              </View>
              <Text style={[themedStyles.textSecondary, { marginBottom: 16, lineHeight: 20 }]}>
                Track your spending by adding household and personal expenses. Set frequencies and categories.
              </Text>
              <Button
                text="Add Expenses"
                onPress={() => router.push('/add-expense')}
                variant="secondary"
              />
            </View>
          </View>

          <View style={[
            themedStyles.card,
            {
              backgroundColor: currentColors.backgroundAlt,
              borderColor: currentColors.border,
              borderWidth: 1,
              padding: 20,
              alignItems: 'center',
            }
          ]}>
            <Icon name="information-circle" size={20} style={{ color: currentColors.info, marginBottom: 8 }} />
            <Text style={[themedStyles.textSecondary, { textAlign: 'center', fontSize: 14 }]}>
              Once you add at least one person and one expense, you'll see detailed breakdowns and analytics
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Partial setup: Show guidance if missing people OR expenses
  if (!shouldShowFullDashboard) {
    const hasPeople = people.length > 0;
    const hasExpenses = expenses.length > 0;

    return (
      <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
        <StandardHeader 
          title={activeBudget.name}
          rightIcon="wallet-outline"
          onRightPress={() => router.push('/budgets')}
        />

        <ScrollView 
          style={themedStyles.content} 
          contentContainerStyle={[
            themedStyles.scrollContent,
            {
              paddingHorizontal: 24,
              paddingTop: 24,
            }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Icon name="checkmark-circle" size={48} style={{ color: currentColors.success, marginBottom: 12 }} />
            <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 8 }]}>
              You're almost ready!
            </Text>
            <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
              Complete the setup to see your full dashboard
            </Text>
          </View>

          <View style={{ gap: 16, marginBottom: 24 }}>
            {/* People Status */}
            <View style={[
              themedStyles.card,
              {
                backgroundColor: hasPeople ? currentColors.success + '10' : currentColors.warning + '10',
                borderColor: hasPeople ? currentColors.success + '30' : currentColors.warning + '30',
                borderWidth: 1,
                padding: 20,
              }
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Icon 
                  name={hasPeople ? "checkmark-circle" : "people"} 
                  size={24} 
                  style={{ 
                    color: hasPeople ? currentColors.success : currentColors.warning, 
                    marginRight: 12 
                  }} 
                />
                <Text style={[themedStyles.subtitle, { fontSize: 18, fontWeight: '700' }]}>
                  People & Income {hasPeople ? '✓' : ''}
                </Text>
              </View>
              <Text style={[themedStyles.textSecondary, { marginBottom: 16, lineHeight: 20 }]}>
                {hasPeople 
                  ? `Great! You have ${people.length} ${people.length === 1 ? 'person' : 'people'} added.`
                  : 'Add people and their income sources to track individual spending.'
                }
              </Text>
              {!hasPeople && (
                <Button
                  text="Add People & Income"
                  onPress={() => router.push('/people')}
                  variant="primary"
                />
              )}
            </View>

            {/* Expenses Status */}
            <View style={[
              themedStyles.card,
              {
                backgroundColor: hasExpenses ? currentColors.success + '10' : currentColors.warning + '10',
                borderColor: hasExpenses ? currentColors.success + '30' : currentColors.warning + '30',
                borderWidth: 1,
                padding: 20,
              }
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Icon 
                  name={hasExpenses ? "checkmark-circle" : "card"} 
                  size={24} 
                  style={{ 
                    color: hasExpenses ? currentColors.success : currentColors.warning, 
                    marginRight: 12 
                  }} 
                />
                <Text style={[themedStyles.subtitle, { fontSize: 18, fontWeight: '700' }]}>
                  Expenses {hasExpenses ? '✓' : ''}
                </Text>
              </View>
              <Text style={[themedStyles.textSecondary, { marginBottom: 16, lineHeight: 20 }]}>
                {hasExpenses 
                  ? `Perfect! You have ${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'} tracked.`
                  : 'Add your household and personal expenses to see spending breakdowns.'
                }
              </Text>
              {!hasExpenses && (
                <Button
                  text="Add Expenses"
                  onPress={() => router.push('/add-expense')}
                  variant="secondary"
                />
              )}
            </View>
          </View>

          {/* Quick Actions for partial setup */}
          <View style={{ marginBottom: 24 }}>
            <Text style={[themedStyles.subtitle, { fontSize: 18, fontWeight: '700', marginBottom: 16 }]}>
              Quick Actions
            </Text>
            <QuickActionsSection />
          </View>

          {hasPeople && hasExpenses && (
            <View style={[
              themedStyles.card,
              {
                backgroundColor: currentColors.info + '10',
                borderColor: currentColors.info + '30',
                borderWidth: 1,
                padding: 20,
                alignItems: 'center',
              }
            ]}>
              <Icon name="analytics" size={24} style={{ color: currentColors.info, marginBottom: 8 }} />
              <Text style={[themedStyles.textSecondary, { textAlign: 'center', fontSize: 14 }]}>
                Refresh the page to see your complete dashboard with analytics and breakdowns!
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // Full dashboard: Show everything when both people and expenses exist
  return (
    <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
      <StandardHeader 
        title={activeBudget.name}
        rightIcon="wallet-outline"
        onRightPress={() => router.push('/budgets')}
      />

      <ScrollView 
        style={themedStyles.content} 
        contentContainerStyle={[
          themedStyles.scrollContent,
          {
            paddingHorizontal: 0,
            paddingTop: 16,
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {calculations && (
          <>
            {/* 1. Overview Section */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginBottom: 16,
                minHeight: 32,
              }}>
                <Icon 
                  name="analytics-outline" 
                  size={24} 
                  style={{ 
                    color: currentColors.primary, 
                    marginRight: 12,
                    marginTop: -2,
                  }} 
                />
                <Text style={[themedStyles.subtitle, { fontSize: 22, fontWeight: '700', marginBottom: 0 }]}>
                  Overview
                </Text>
              </View>
              <View style={[
                themedStyles.card,
                {
                  marginBottom: 0,
                }
              ]}>
                <OverviewSection 
                  calculations={calculations}
                  people={people}
                  expenses={expenses}
                  householdSettings={data.householdSettings}
                />
              </View>
            </View>

            {/* 2. Individual Breakdowns Section */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginBottom: 16,
                minHeight: 32,
              }}>
                <Icon 
                  name="people-outline" 
                  size={24} 
                  style={{ 
                    color: currentColors.primary, 
                    marginRight: 12,
                    marginTop: -2,
                  }} 
                />
                <Text style={[themedStyles.subtitle, { fontSize: 22, fontWeight: '700', marginBottom: 0 }]}>
                  Individual Breakdowns
                </Text>
              </View>
              <IndividualBreakdownsSection 
                people={people}
                expenses={expenses}
                householdSettings={data.householdSettings}
                totalHouseholdExpenses={calculations.householdExpenses}
              />
            </View>

            {/* 3. Ending/Expiring Section */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginBottom: 16,
                minHeight: 32,
              }}>
                <Icon 
                  name="time-outline" 
                  size={24} 
                  style={{ 
                    color: currentColors.primary, 
                    marginRight: 12,
                    marginTop: -2,
                  }} 
                />
                <Text style={[themedStyles.subtitle, { fontSize: 22, fontWeight: '700', marginBottom: 0 }]}>
                  Ending & Expired
                </Text>
              </View>
              <View style={[
                themedStyles.card,
                {
                  marginBottom: 0,
                }
              ]}>
                <ExpiringSection expenses={expenses} />
              </View>
            </View>

            {/* 4. Quick Actions Section */}
            <View style={{ marginBottom: 0 }}>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginBottom: 16,
                minHeight: 32,
              }}>
                <Icon 
                  name="flash-outline" 
                  size={24} 
                  style={{ 
                    color: currentColors.primary, 
                    marginRight: 12,
                    marginTop: -2,
                  }} 
                />
                <Text style={[themedStyles.subtitle, { fontSize: 22, fontWeight: '700', marginBottom: 0 }]}>
                  Quick Actions
                </Text>
              </View>
              <QuickActionsSection />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
