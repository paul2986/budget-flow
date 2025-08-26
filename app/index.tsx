
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
import { Text, View, ScrollView, TouchableOpacity, AppState, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
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
  const { data, loading, activeBudget, appData, refreshTrigger, refreshData, addBudget } = useBudgetData();
  const { isLocked, authenticateForBudget } = useBudgetLock();
  
  const [authenticating, setAuthenticating] = useState(false);
  const [showBudgetNaming, setShowBudgetNaming] = useState(false);
  const [showBudgetReady, setShowBudgetReady] = useState(false);
  const [budgetName, setBudgetName] = useState('');
  const [creatingBudget, setCreatingBudget] = useState(false);
  const appState = useRef(AppState.currentState);
  const scrollViewRef = useRef<ScrollView>(null);

  const budgetLocked = useMemo(() => {
    // Can't be locked if no budgets exist or no active budget
    if (!appData || !appData.budgets || appData.budgets.length === 0 || !activeBudget) return false;
    return isLocked(activeBudget);
  }, [appData, activeBudget, isLocked]);

  // Check if this is a first-time user (no budgets exist) or if they need guidance
  const isFirstTimeUser = useMemo(() => {
    // First check if no budgets exist at all (true first-time user)
    if (!appData || !appData.budgets || appData.budgets.length === 0) {
      return true;
    }
    
    // If budget exists but no active budget, still first-time user
    if (!activeBudget || !data) return true;
    
    const people = data && data.people && Array.isArray(data.people) ? data.people : [];
    const expenses = data && data.expenses && Array.isArray(data.expenses) ? data.expenses : [];
    
    // First time if no people and no expenses
    return people.length === 0 && expenses.length === 0;
  }, [appData, activeBudget, data]);

  const shouldShowFullDashboard = useMemo(() => {
    // Can't show dashboard if no budgets exist or no active budget
    if (!appData || !appData.budgets || appData.budgets.length === 0 || !activeBudget || !data) return false;
    
    const people = data && data.people && Array.isArray(data.people) ? data.people : [];
    const expenses = data && data.expenses && Array.isArray(data.expenses) ? data.expenses : [];
    
    // Show full dashboard only if both people and expenses exist
    return people.length > 0 && expenses.length > 0;
  }, [appData, activeBudget, data]);

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
    // Can't calculate if no budgets exist or no active budget
    if (!appData || !appData.budgets || appData.budgets.length === 0 || !activeBudget || !data) {
      console.log('HomeScreen: Missing appData, budgets, activeBudget or data for calculations:', { 
        hasAppData: !!appData, 
        budgetsCount: appData?.budgets?.length || 0,
        activeBudget: !!activeBudget, 
        data: !!data 
      });
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
  }, [appData, activeBudget, data, refreshTrigger]);

  const handleUnlock = useCallback(async () => {
    if (!appData || !appData.budgets || appData.budgets.length === 0 || !activeBudget) return;
    
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
  }, [appData, activeBudget, authenticateForBudget, showToast]);

  const handleBackToBudgets = useCallback(() => {
    router.push('/budgets');
  }, []);

  const handleCreateFirstBudget = useCallback(() => {
    setShowBudgetNaming(true);
    setBudgetName('My Budget');
  }, []);

  const handleCreateBudget = useCallback(async () => {
    if (!budgetName.trim()) {
      showToast('Please enter a budget name', 'error');
      return;
    }

    setCreatingBudget(true);
    try {
      const result = await addBudget(budgetName.trim());
      if (result.success) {
        showToast('Budget created successfully!', 'success');
        setShowBudgetNaming(false);
        setBudgetName('');
        // The useBudgetData hook will automatically refresh and set the new budget as active
        // No need to show intermediate "Budget Ready" screen
      } else {
        showToast('Failed to create budget', 'error');
      }
    } catch (error) {
      console.error('HomeScreen: Error creating budget:', error);
      showToast('Error creating budget', 'error');
    } finally {
      setCreatingBudget(false);
    }
  }, [budgetName, addBudget, showToast]);

  const handleCancelBudgetNaming = useCallback(() => {
    setShowBudgetNaming(false);
    setBudgetName('');
  }, []);

  const handleContinueFromBudgetReady = useCallback(() => {
    setShowBudgetReady(false);
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

  // Step 1: Budget naming interface (first-time user: No budgets exist or explicitly showing naming)
  if ((!appData || !appData.budgets || appData.budgets.length === 0) || showBudgetNaming) {
    return (
      <KeyboardAvoidingView 
        style={[themedStyles.container, { backgroundColor: currentColors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Hide header for true first-time users (no budgets exist), show for explicit naming */}
        {showBudgetNaming && appData && appData.budgets && appData.budgets.length > 0 && (
          <StandardHeader 
            title="Budget Flow" 
            showLeftIcon={false}
            showRightIcon={false}
          />
        )}
        
        <ScrollView 
          ref={scrollViewRef}
          style={[themedStyles.content, { flex: 1 }]} 
          contentContainerStyle={[
            themedStyles.scrollContent,
            {
              paddingHorizontal: 16, // Reduced from 24 to match other pages
              paddingTop: showBudgetNaming && appData && appData.budgets && appData.budgets.length > 0 ? 20 : 20, // Reduced top padding for first-time users
              paddingBottom: 120, // Ensure bottom content is visible above nav bar
              justifyContent: 'flex-start',
              flexGrow: 1,
            }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', marginBottom: 32, marginTop: 20 }}>
            <Icon name="wallet-outline" size={80} style={{ color: currentColors.primary, marginBottom: 24 }} />
            <Text style={[themedStyles.title, { textAlign: 'center', marginBottom: 12 }]}>
              Welcome to Budget Flow!
            </Text>
            <Text style={[themedStyles.textSecondary, { textAlign: 'center', fontSize: 18, lineHeight: 26 }]}>
              Let's start by creating your first budget
            </Text>
          </View>

          <View style={[
            themedStyles.card,
            {
              backgroundColor: currentColors.backgroundAlt,
              borderColor: currentColors.primary + '30',
              borderWidth: 2,
              padding: 32,
              marginBottom: 24,
            }
          ]}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <Icon name="create-outline" size={32} style={{ color: currentColors.primary, marginBottom: 12 }} />
              <Text style={[themedStyles.subtitle, { textAlign: 'center', fontSize: 20 }]}>
                Name Your Budget
              </Text>
              <Text style={[themedStyles.textSecondary, { textAlign: 'center', marginTop: 8 }]}>
                Give your budget a name that makes sense to you
              </Text>
            </View>

            <TextInput
              style={[
                themedStyles.input,
                {
                  borderColor: currentColors.primary,
                  borderWidth: 2,
                  fontSize: 18,
                  fontWeight: '600',
                  textAlign: 'center',
                  marginBottom: 24,
                }
              ]}
              value={budgetName}
              onChangeText={setBudgetName}
              placeholder="Enter budget name..."
              placeholderTextColor={currentColors.textSecondary}
              autoFocus={false}
              selectTextOnFocus={true}
              maxLength={50}
              onFocus={() => {
                // Scroll up when keyboard appears
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ y: 100, animated: true });
                }, 300);
              }}
            />

            <View style={{ gap: 12 }}>
              <Button
                text={creatingBudget ? "Creating Budget..." : "Create Budget"}
                onPress={handleCreateBudget}
                variant="primary"
                disabled={creatingBudget || !budgetName.trim()}
              />
              
              {showBudgetNaming && (
                <Button
                  text="Cancel"
                  onPress={handleCancelBudgetNaming}
                  variant="outline"
                  disabled={creatingBudget}
                />
              )}
            </View>
          </View>

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
            <Icon name="information-circle" size={20} style={{ color: currentColors.info, marginBottom: 8 }} />
            <Text style={[themedStyles.textSecondary, { textAlign: 'center', fontSize: 14 }]}>
              After creating your budget, you'll be guided through adding people and expenses
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Step 2: "Your Budget is Ready" page
  if (showBudgetReady) {
    return (
      <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
        <StandardHeader 
          title="Budget Flow" 
          showLeftIcon={false}
          showRightIcon={false}
        />
        
        <ScrollView 
          style={themedStyles.content} 
          contentContainerStyle={[
            themedStyles.scrollContent,
            {
              paddingHorizontal: 16, // Reduced from 24 to match other pages
              paddingTop: 20,
              paddingBottom: 120, // Ensure bottom content is visible above nav bar
              flexGrow: 1,
            }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Section - Celebration */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: currentColors.success + '20',
              borderWidth: 3,
              borderColor: currentColors.success,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}>
              <Icon name="checkmark-circle" size={60} style={{ color: currentColors.success }} />
            </View>
            
            <Text style={[themedStyles.title, { textAlign: 'center', marginBottom: 12, fontSize: 32 }]}>
              Your Budget is Ready!
            </Text>
            <Text style={[themedStyles.textSecondary, { textAlign: 'center', fontSize: 18, lineHeight: 26 }]}>
              "{activeBudget?.name || 'Your budget'}" has been created successfully
            </Text>
          </View>

          {/* Middle Section - Next Steps */}
          <View style={[
            themedStyles.card,
            {
              backgroundColor: currentColors.primary + '10',
              borderColor: currentColors.primary + '30',
              borderWidth: 2,
              padding: 32,
              marginBottom: 32,
            }
          ]}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <Icon name="rocket-outline" size={40} style={{ color: currentColors.primary, marginBottom: 16 }} />
              <Text style={[themedStyles.subtitle, { textAlign: 'center', fontSize: 22, marginBottom: 8 }]}>
                What's Next?
              </Text>
              <Text style={[themedStyles.textSecondary, { textAlign: 'center', fontSize: 16, lineHeight: 24 }]}>
                Let's set up your budget with people and expenses
              </Text>
            </View>

            <View style={{ gap: 16 }}>
              <View style={[
                themedStyles.card,
                {
                  backgroundColor: currentColors.backgroundAlt,
                  borderColor: currentColors.border,
                  borderWidth: 1,
                  padding: 20,
                  marginBottom: 0,
                }
              ]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: currentColors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>1</Text>
                  </View>
                  <Text style={[themedStyles.subtitle, { fontSize: 18, fontWeight: '700', marginBottom: 0 }]}>
                    Add People & Income
                  </Text>
                </View>
                <Text style={[themedStyles.textSecondary, { marginLeft: 44, lineHeight: 20 }]}>
                  Add yourself and anyone else who shares expenses
                </Text>
              </View>

              <View style={[
                themedStyles.card,
                {
                  backgroundColor: currentColors.backgroundAlt,
                  borderColor: currentColors.border,
                  borderWidth: 1,
                  padding: 20,
                  marginBottom: 0,
                }
              ]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: currentColors.secondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>2</Text>
                  </View>
                  <Text style={[themedStyles.subtitle, { fontSize: 18, fontWeight: '700', marginBottom: 0 }]}>
                    Track Expenses
                  </Text>
                </View>
                <Text style={[themedStyles.textSecondary, { marginLeft: 44, lineHeight: 20 }]}>
                  Add household and personal expenses with frequencies
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Section - Action Button */}
          <View style={{ gap: 16 }}>
            <Button
              text="Continue to Setup"
              onPress={handleContinueFromBudgetReady}
              variant="primary"
            />

            <View style={[
              themedStyles.card,
              {
                backgroundColor: currentColors.info + '10',
                borderColor: currentColors.info + '30',
                borderWidth: 1,
                padding: 20,
                alignItems: 'center',
                marginBottom: 0,
              }
            ]}>
              <Icon name="lightbulb-outline" size={20} style={{ color: currentColors.info, marginBottom: 8 }} />
              <Text style={[themedStyles.textSecondary, { textAlign: 'center', fontSize: 14, lineHeight: 20 }]}>
                You can always access your budget settings and add more budgets later from the budgets page
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Show lock screen if budget is locked
  if (budgetLocked) {
    return (
      <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
        <StandardHeader title={activeBudget?.name || 'Budget'} />
        
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
                "{activeBudget?.name || 'This budget'}" requires authentication to view
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
          title={activeBudget?.name || 'Budget'}
          rightIcon="wallet-outline"
          onRightPress={() => router.push('/budgets')}
        />

        <ScrollView 
          style={themedStyles.content} 
          contentContainerStyle={[
            themedStyles.scrollContent,
            {
              paddingHorizontal: 16, // Reduced from 24 to match other pages
              paddingTop: 20, // Reduced from 40 to bring content to top
              paddingBottom: 120, // Ensure bottom content is visible above nav bar
              justifyContent: 'flex-start', // Changed from center to flex-start to align to top
              flexGrow: 1,
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
          title={activeBudget?.name || 'Budget'}
          rightIcon="wallet-outline"
          onRightPress={() => router.push('/budgets')}
        />

        <ScrollView 
          style={themedStyles.content} 
          contentContainerStyle={[
            themedStyles.scrollContent,
            {
              paddingHorizontal: 16, // Reduced from 24 to match other pages
              paddingTop: 32,
              paddingBottom: 120, // Ensure bottom content is visible above nav bar
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
                <Text style={[themedStyles.subtitle, { fontSize: 18, fontWeight: '700', marginBottom: 0 }]}>
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
            paddingBottom: 120, // Ensure bottom content is visible above nav bar
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
            <View style={{ marginBottom: 100 }}>
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
