
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

  return (
    <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
      <StandardHeader 
        title="Budget Flow" 
        rightIcon="wallet-outline"
        onRightPress={() => router.push('/budgets')}
      />

      <ScrollView 
        style={themedStyles.content} 
        contentContainerStyle={{ 
          padding: 16,
          paddingBottom: 120 // Extra padding to ensure Quick Actions are visible above nav bar
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Budget Header */}
        <View style={[themedStyles.card, { marginBottom: 24 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={[themedStyles.subtitle, { flex: 1 }]}>{activeBudget.name}</Text>
            <TouchableOpacity onPress={() => router.push('/budgets')}>
              <Icon name="chevron-forward" size={20} style={{ color: currentColors.textSecondary }} />
            </TouchableOpacity>
          </View>
          <Text style={themedStyles.textSecondary}>
            {people.length} people • {expenses.length} expenses
          </Text>
        </View>

        {calculations && (
          <>
            {/* 1. Overview Section */}
            <OverviewSection 
              calculations={calculations}
              people={people}
              expenses={expenses}
              householdSettings={data.householdSettings}
            />

            {/* 2. Individual Breakdowns Section */}
            <IndividualBreakdownsSection 
              people={people}
              expenses={expenses}
              householdSettings={data.householdSettings}
              totalHouseholdExpenses={calculations.householdExpenses}
            />

            {/* 3. Ending/Expiring Section */}
            <ExpiringSection expenses={expenses} />

            {/* 4. Quick Actions Section */}
            <QuickActionsSection />
          </>
        )}
      </ScrollView>
    </View>
  );
}
