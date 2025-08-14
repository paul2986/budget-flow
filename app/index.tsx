
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
import PersonBreakdownChart from '../components/PersonBreakdownChart';
import RecurringWidget from '../components/RecurringWidget';
import { useBudgetLock } from '../hooks/useBudgetLock';
import { BlurView } from 'expo-blur';

export default function HomeScreen() {
  const { currentColors } = useTheme();
  const { formatCurrency } = useCurrency();
  const { themedStyles } = useThemedStyles();
  const { showToast } = useToast();
  const { data, loading } = useBudgetData();
  const { isLocked, authenticateForBudget } = useBudgetLock();
  
  const [authenticating, setAuthenticating] = useState(false);
  const appState = useRef(AppState.currentState);

  const activeBudget = useMemo(() => {
    return data.budgets.find(b => b.id === data.activeBudgetId) || data.budgets[0];
  }, [data.budgets, data.activeBudgetId]);

  const budgetLocked = useMemo(() => {
    return activeBudget ? isLocked(activeBudget) : false;
  }, [activeBudget, isLocked]);

  // Check lock status when app becomes active
  const handleAppStateChange = useCallback((nextAppState: string) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App became active - the lock status will be re-evaluated by useMemo
      console.log('HomeScreen: App became active, checking lock status');
    }
    appState.current = nextAppState;
  }, []);

  useFocusEffect(
    useCallback(() => {
      const subscription = AppState.addEventListener('change', handleAppStateChange);
      return () => subscription?.remove();
    }, [handleAppStateChange])
  );

  const calculations = useMemo(() => {
    if (!activeBudget) return null;

    const totalIncome = calculateTotalIncome(activeBudget.people);
    const totalExpenses = calculateTotalExpenses(activeBudget.expenses);
    const householdExpenses = calculateHouseholdExpenses(activeBudget.expenses);
    const personalExpenses = calculatePersonalExpenses(activeBudget.expenses);
    const remaining = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      householdExpenses,
      personalExpenses,
      remaining,
    };
  }, [activeBudget]);

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
        <StandardHeader title="Budget Flow" />
        <View style={[themedStyles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={themedStyles.textSecondary}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!activeBudget) {
    return (
      <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
        <StandardHeader title="Budget Flow" />
        <View style={[themedStyles.content, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
          <Icon name="wallet-outline" size={64} style={{ color: currentColors.textSecondary, marginBottom: 16 }} />
          <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 8 }]}>
            No Budget Found
          </Text>
          <Text style={[themedStyles.textSecondary, { textAlign: 'center', marginBottom: 24 }]}>
            Create your first budget to get started
          </Text>
          <TouchableOpacity
            style={[
              themedStyles.card,
              {
                backgroundColor: currentColors.primary,
                borderColor: currentColors.primary,
                borderWidth: 1,
                paddingHorizontal: 24,
                paddingVertical: 12,
              },
            ]}
            onPress={() => router.push('/budgets')}
          >
            <Text style={[themedStyles.text, { color: '#fff', fontWeight: '600' }]}>
              Go to Budgets
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show lock screen if budget is locked
  if (budgetLocked) {
    return (
      <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
        <StandardHeader title="Budget Flow" />
        
        {/* Blurred background content */}
        <View style={{ flex: 1, position: 'relative' }}>
          <View style={{ flex: 1, opacity: 0.3 }}>
            <ScrollView style={themedStyles.content} contentContainerStyle={{ padding: 16 }}>
              {/* Placeholder content that's blurred */}
              <View style={[themedStyles.card, { height: 120, marginBottom: 16 }]} />
              <View style={[themedStyles.card, { height: 80, marginBottom: 16 }]} />
              <View style={[themedStyles.card, { height: 200, marginBottom: 16 }]} />
              <View style={[themedStyles.card, { height: 100 }]} />
            </ScrollView>
          </View>

          {/* Lock overlay */}
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
              {/* Lock Icon */}
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

              {/* Title */}
              <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 8 }]}>
                This budget is locked
              </Text>

              {/* Budget name */}
              <Text style={[themedStyles.textSecondary, { textAlign: 'center', marginBottom: 24 }]}>
                "{activeBudget.name}" requires authentication to view
              </Text>

              {/* Buttons */}
              <View style={{ width: '100%', gap: 12 }}>
                {/* Unlock Button */}
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

                {/* Back to Budgets Button */}
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

  // Normal unlocked budget view
  return (
    <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
      <StandardHeader 
        title="Budget Flow" 
        rightIcon="wallet-outline"
        onRightPress={() => router.push('/budgets')}
      />

      <ScrollView style={themedStyles.content} contentContainerStyle={{ padding: 16 }}>
        {/* Budget Header */}
        <View style={[themedStyles.card, { marginBottom: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={[themedStyles.subtitle, { flex: 1 }]}>{activeBudget.name}</Text>
            <TouchableOpacity onPress={() => router.push('/budgets')}>
              <Icon name="chevron-forward" size={20} style={{ color: currentColors.textSecondary }} />
            </TouchableOpacity>
          </View>
          <Text style={themedStyles.textSecondary}>
            {activeBudget.people.length} people • {activeBudget.expenses.length} expenses
          </Text>
        </View>

        {calculations && (
          <>
            {/* Summary Cards */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={[themedStyles.card, { flex: 1 }]}>
                <Text style={[themedStyles.textSecondary, { fontSize: 12, marginBottom: 4 }]}>INCOME</Text>
                <Text style={[themedStyles.text, { fontSize: 18, fontWeight: '600', color: currentColors.success || '#4CAF50' }]}>
                  {formatCurrency(calculations.totalIncome)}
                </Text>
              </View>
              <View style={[themedStyles.card, { flex: 1 }]}>
                <Text style={[themedStyles.textSecondary, { fontSize: 12, marginBottom: 4 }]}>EXPENSES</Text>
                <Text style={[themedStyles.text, { fontSize: 18, fontWeight: '600', color: currentColors.error }]}>
                  {formatCurrency(calculations.totalExpenses)}
                </Text>
              </View>
            </View>

            {/* Remaining */}
            <View style={[themedStyles.card, { marginBottom: 16 }]}>
              <Text style={[themedStyles.textSecondary, { fontSize: 12, marginBottom: 4 }]}>REMAINING</Text>
              <Text style={[
                themedStyles.text, 
                { 
                  fontSize: 24, 
                  fontWeight: '700',
                  color: calculations.remaining >= 0 ? (currentColors.success || '#4CAF50') : currentColors.error
                }
              ]}>
                {formatCurrency(calculations.remaining)}
              </Text>
              {calculations.remaining < 0 && (
                <Text style={[themedStyles.textSecondary, { fontSize: 12, marginTop: 4 }]}>
                  Over budget by {formatCurrency(Math.abs(calculations.remaining))}
                </Text>
              )}
            </View>

            {/* Expense Breakdown */}
            <View style={[themedStyles.card, { marginBottom: 16 }]}>
              <Text style={[themedStyles.subtitle, { marginBottom: 12 }]}>Expense Breakdown</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[themedStyles.textSecondary, { fontSize: 12, marginBottom: 4 }]}>HOUSEHOLD</Text>
                  <Text style={[themedStyles.text, { fontSize: 16, fontWeight: '600' }]}>
                    {formatCurrency(calculations.householdExpenses)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[themedStyles.textSecondary, { fontSize: 12, marginBottom: 4 }]}>PERSONAL</Text>
                  <Text style={[themedStyles.text, { fontSize: 16, fontWeight: '600' }]}>
                    {formatCurrency(calculations.personalExpenses)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Person Breakdown Chart */}
            {activeBudget.people.length > 0 && (
              <PersonBreakdownChart budget={activeBudget} />
            )}

            {/* Recurring Widget */}
            <RecurringWidget budget={activeBudget} />

            {/* Quick Actions */}
            <View style={[themedStyles.card, { marginBottom: 16 }]}>
              <Text style={[themedStyles.subtitle, { marginBottom: 12 }]}>Quick Actions</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={[
                    themedStyles.card,
                    {
                      flex: 1,
                      backgroundColor: currentColors.primary,
                      borderColor: currentColors.primary,
                      borderWidth: 1,
                      alignItems: 'center',
                      paddingVertical: 16,
                      marginBottom: 0,
                    },
                  ]}
                  onPress={() => router.push('/add-expense')}
                >
                  <Icon name="add" size={20} style={{ color: '#fff', marginBottom: 4 }} />
                  <Text style={[themedStyles.text, { color: '#fff', fontSize: 12, fontWeight: '600' }]}>
                    Add Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    themedStyles.card,
                    {
                      flex: 1,
                      backgroundColor: currentColors.backgroundAlt,
                      borderColor: currentColors.border,
                      borderWidth: 1,
                      alignItems: 'center',
                      paddingVertical: 16,
                      marginBottom: 0,
                    },
                  ]}
                  onPress={() => router.push('/people')}
                >
                  <Icon name="people" size={20} style={{ color: currentColors.text, marginBottom: 4 }} />
                  <Text style={[themedStyles.text, { fontSize: 12, fontWeight: '600' }]}>
                    Manage People
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
