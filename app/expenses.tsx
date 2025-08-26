
import { useState, useCallback, useRef, useEffect } from 'react';
import { useBudgetData } from '../hooks/useBudgetData';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, AccessibilityInfo } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { calculateMonthlyAmount } from '../utils/calculations';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useCurrency } from '../hooks/useCurrency';
import { useToast } from '../hooks/useToast';
import Icon from '../components/Icon';
import StandardHeader from '../components/StandardHeader';
import ExpenseFilterModal from '../components/ExpenseFilterModal';
import { DEFAULT_CATEGORIES } from '../types/budget';
import { getCustomExpenseCategories, getExpensesFilters, saveExpensesFilters, normalizeCategoryName } from '../utils/storage';

type SortOption = 'date' | 'highest' | 'lowest';

export default function ExpensesScreen() {
  const { data, removeExpense, saving, refreshData } = useBudgetData();
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();
  const { formatCurrency } = useCurrency();
  const toast = useToast();
  const params = useLocalSearchParams<{ 
    showRecurring?: string;
    filter?: string;
    category?: string;
    fromDashboard?: string;
    personId?: string;
  }>();

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Ownership filter (existing)
  const [filter, setFilter] = useState<'all' | 'household' | 'personal'>('all');
  const [personFilter, setPersonFilter] = useState<string | null>(null);

  // New: Category + Search filters (persisted)
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>(''); // debounced

  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date');

  // Use ref to track if we've already refreshed on this focus
  const hasRefreshedOnFocus = useRef(false);

  // Wrap announceFilter in useCallback to fix exhaustive deps warning
  const announceFilter = useCallback((msg: string) => {
    try {
      AccessibilityInfo.announceForAccessibility?.(msg);
    } catch (e) {
      console.log('Accessibility announce failed', e);
    }
  }, []);

  // Load custom categories and persisted filters
  useEffect(() => {
    (async () => {
      const [customs, filters] = await Promise.all([getCustomExpenseCategories(), getExpensesFilters()]);
      console.log('ExpensesScreen: Loaded custom categories:', customs);
      setCustomCategories(customs);
      
      // Check if we have URL parameters from dashboard navigation
      if (params.fromDashboard === 'true') {
        console.log('ExpensesScreen: Applying filters from dashboard navigation:', {
          filter: params.filter,
          category: params.category,
          personId: params.personId
        });
        
        // Apply filters from URL parameters
        if (params.filter && (params.filter === 'household' || params.filter === 'personal')) {
          setFilter(params.filter);
        }
        if (params.category) {
          setCategoryFilter(params.category);
        }
        if (params.personId) {
          setPersonFilter(params.personId);
        }
        
        // Clear the search query when coming from dashboard
        setSearchQuery('');
        setSearchTerm('');
        
        // Announce the applied filters for accessibility
        const filterMessages = [];
        if (params.filter) {
          filterMessages.push(`${params.filter} expenses`);
        }
        if (params.category) {
          filterMessages.push(`${params.category} category`);
        }
        if (params.personId) {
          const person = data.people.find(p => p.id === params.personId);
          if (person) {
            filterMessages.push(`${person.name}'s expenses`);
          }
        }
        if (filterMessages.length > 0) {
          announceFilter(`Filtered by ${filterMessages.join(' and ')}`);
        }
      } else {
        // Use persisted filters if not coming from dashboard
        setCategoryFilter(filters.category || null);
        setSearchQuery(filters.search || '');
        setSearchTerm(filters.search || '');
      }
    })();
  }, [params.filter, params.category, params.fromDashboard, params.personId, announceFilter, data.people]);

  // Reload custom categories when data changes (e.g., after clearing all data)
  useEffect(() => {
    (async () => {
      const customs = await getCustomExpenseCategories();
      console.log('ExpensesScreen: Reloaded custom categories after data change:', customs);
      setCustomCategories(customs);
      // If current category filter is no longer valid, clear it
      if (categoryFilter && !customs.includes(categoryFilter) && !DEFAULT_CATEGORIES.includes(categoryFilter)) {
        console.log('ExpensesScreen: Clearing invalid category filter:', categoryFilter);
        setCategoryFilter(null);
      }
    })();
  }, [data.people.length, data.expenses.length, categoryFilter]); // Reload when core data changes

  // Persist category + search with debounce (but not when coming from dashboard)
  useEffect(() => {
    if (params.fromDashboard !== 'true') {
      const t = setTimeout(() => {
        saveExpensesFilters({ category: categoryFilter, search: searchQuery });
      }, 300);
      return () => clearTimeout(t);
    }
  }, [categoryFilter, searchQuery, params.fromDashboard]);

  // Debounce search for filtering perf
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Refresh data when screen comes into focus, but only once per focus
  useFocusEffect(
    useCallback(() => {
      if (!hasRefreshedOnFocus.current) {
        hasRefreshedOnFocus.current = true;
        refreshData(true);
        // Also refresh custom categories (in case new one added)
        getCustomExpenseCategories().then(setCustomCategories).catch((e) => console.log('Failed to refresh custom categories', e));
      }
      return () => {
        hasRefreshedOnFocus.current = false;
      };
    }, [refreshData])
  );

  const handleRemoveExpense = useCallback(
    async (expenseId: string, description: string) => {
      if (deletingExpenseId === expenseId || saving) return;
      try {
        setDeletingExpenseId(expenseId);
        const result = await removeExpense(expenseId);
        if (!result.success) {
          Alert.alert('Error', 'Failed to remove expense. Please try again.');
        }
      } catch (error) {
        console.error('ExpensesScreen: Error removing expense:', error);
        Alert.alert('Error', 'Failed to remove expense. Please try again.');
      } finally {
        setDeletingExpenseId(null);
      }
    },
    [deletingExpenseId, saving, removeExpense]
  );

  const handleDeletePress = useCallback(
    (expenseId: string, description: string) => {
      Alert.alert('Delete Expense', `Are you sure you want to delete "${description}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            handleRemoveExpense(expenseId, description);
          },
        },
      ]);
    },
    [handleRemoveExpense]
  );

  const handleEditExpense = useCallback((expense: any) => {
    router.push({
      pathname: '/add-expense',
      params: { id: expense.id, origin: 'expenses' },
    });
  }, []);

  const handleNavigateToAddExpense = useCallback(() => {
    router.push('/add-expense');
  }, []);

  const handleClearFilters = useCallback(() => {
    setCategoryFilter(null);
    setSearchQuery('');
    setFilter('all');
    setPersonFilter(null);
    announceFilter('All filters cleared');
  }, [announceFilter]);

  const SortButton = useCallback(
    ({ sortType, label, icon }: { sortType: SortOption; label: string; icon: string }) => (
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
          },
        ]}
        onPress={() => setSortBy(sortType)}
        disabled={saving || deletingExpenseId !== null}
      >
        <Icon name={icon as any} size={14} style={{ color: sortBy === sortType ? '#FFFFFF' : currentColors.text, marginRight: 4 }} />
        <Text
          style={[
            themedStyles.badgeText,
            {
              color: sortBy === sortType ? '#FFFFFF' : currentColors.text,
              fontWeight: '600',
              fontSize: 12,
            },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    ),
    [sortBy, currentColors, saving, deletingExpenseId, themedStyles]
  );

  // Apply filters
  let filteredExpenses = data.expenses;

  console.log('ExpensesScreen: All expenses before filtering:', data.expenses.map(e => ({ 
    id: e.id, 
    description: e.description, 
    category: e.category, 
    amount: e.amount,
    personId: e.personId 
  })));

  if (filter === 'household') {
    filteredExpenses = filteredExpenses.filter((e) => e.category === 'household');
    console.log('ExpensesScreen: Household expenses after filtering:', filteredExpenses.length);
  } else if (filter === 'personal') {
    filteredExpenses = filteredExpenses.filter((e) => e.category === 'personal');
    console.log('ExpensesScreen: Personal expenses after filtering:', filteredExpenses.length);
  }

  // Apply person filter - FIXED: Handle household expenses without personId correctly
  if (personFilter) {
    filteredExpenses = filteredExpenses.filter((e) => {
      // For household expenses, only filter if they have a personId assigned
      if (e.category === 'household') {
        return e.personId === personFilter;
      }
      // For personal expenses, always filter by personId
      return e.personId === personFilter;
    });
    console.log('ExpensesScreen: Expenses after person filter:', filteredExpenses.length);
  }

  if (categoryFilter) {
    const selected = normalizeCategoryName(categoryFilter);
    filteredExpenses = filteredExpenses.filter((e) => normalizeCategoryName((e as any).categoryTag || 'Misc') === selected);
  }

  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    filteredExpenses = filteredExpenses.filter((e) => e.description.toLowerCase().includes(q));
  }

  // Sort
  filteredExpenses = filteredExpenses.sort((a, b) => {
    switch (sortBy) {
      case 'highest':
        return b.amount - a.amount;
      case 'lowest':
        return a.amount - b.amount;
      case 'date':
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  const hasActiveFilters = !!categoryFilter || !!searchTerm || (filter !== 'all') || !!personFilter;

  // Header buttons - filter button on left, clear filter button (if filters active), add button on right
  const leftButtons = [
    {
      icon: 'funnel-outline',
      onPress: () => setShowFilterModal(true),
      backgroundColor: hasActiveFilters ? currentColors.secondary : currentColors.border + '80',
      iconColor: hasActiveFilters ? '#FFFFFF' : currentColors.text,
    },
    // Add clear filter button next to filter button when filters are active
    ...(hasActiveFilters ? [{
      icon: 'close',
      onPress: handleClearFilters,
      backgroundColor: currentColors.error,
      iconColor: '#FFFFFF',
    }] : []),
  ];

  const rightButtons = [
    {
      icon: 'add',
      onPress: handleNavigateToAddExpense,
      backgroundColor: currentColors.primary,
      iconColor: '#FFFFFF',
    },
  ];

  return (
    <View style={themedStyles.container}>
      <StandardHeader 
        title="Expenses" 
        showLeftIcon={false} 
        showRightIcon={false}
        leftButtons={leftButtons}
        rightButtons={rightButtons}
        loading={saving || deletingExpenseId !== null} 
      />

      {/* Sort options - now more prominent */}
      <View style={[themedStyles.section, { paddingBottom: 0, paddingTop: 12, paddingHorizontal: 16 }]}>
        <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>Sort by</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 4, flexDirection: 'row' }}>
            <SortButton sortType="date" label="Date" icon="calendar-outline" />
            <SortButton sortType="highest" label="Highest Cost" icon="trending-up-outline" />
            <SortButton sortType="lowest" label="Lowest Cost" icon="trending-down-outline" />
          </View>
        </ScrollView>
      </View>

      {/* Active filters summary - compact */}
      {hasActiveFilters && (
        <View style={[themedStyles.section, { paddingTop: 8, paddingHorizontal: 16 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[themedStyles.textSecondary, { marginRight: 8, fontSize: 12 }]}>Filtered:</Text>
              {!!categoryFilter && (
                <View
                  style={[
                    themedStyles.badge,
                    {
                      backgroundColor: currentColors.secondary + '20',
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      marginRight: 6,
                      borderWidth: 1,
                      borderColor: currentColors.secondary,
                    },
                  ]}
                >
                  <Text style={[themedStyles.text, { color: currentColors.secondary, fontSize: 10 }]}>{categoryFilter}</Text>
                </View>
              )}
              {!!searchTerm && (
                <View
                  style={[
                    themedStyles.badge,
                    {
                      backgroundColor: currentColors.primary + '20',
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      marginRight: 6,
                      borderWidth: 1,
                      borderColor: currentColors.primary,
                    },
                  ]}
                >
                  <Text style={[themedStyles.text, { color: currentColors.primary, fontSize: 10 }]}>"{searchTerm}"</Text>
                </View>
              )}
              {filter !== 'all' && (
                <View
                  style={[
                    themedStyles.badge,
                    {
                      backgroundColor: currentColors.household + '20',
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      marginRight: 6,
                      borderWidth: 1,
                      borderColor: currentColors.household,
                    },
                  ]}
                >
                  <Text style={[themedStyles.text, { color: currentColors.household, fontSize: 10 }]}>
                    {filter === 'household' ? 'Household' : 'Personal'}
                  </Text>
                </View>
              )}
              {personFilter && (
                <View
                  style={[
                    themedStyles.badge,
                    {
                      backgroundColor: currentColors.personal + '20',
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      marginRight: 6,
                      borderWidth: 1,
                      borderColor: currentColors.personal,
                    },
                  ]}
                >
                  <Text style={[themedStyles.text, { color: currentColors.personal, fontSize: 10 }]}>
                    {data.people.find(p => p.id === personFilter)?.name || 'Unknown'}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      )}

      <ScrollView style={themedStyles.content} contentContainerStyle={[themedStyles.scrollContent, { paddingHorizontal: 0 }]}>
        {filteredExpenses.length === 0 ? (
          <View style={themedStyles.card}>
            <View style={themedStyles.centerContent}>
              <Icon name="receipt-outline" size={64} style={{ color: currentColors.textSecondary, marginBottom: 16 }} />
              <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 12 }]}>No Expenses Found</Text>
              <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
                {hasActiveFilters
                  ? 'No expenses match your filters. Try adjusting your filters.'
                  : 'Add your first expense to get started'}
              </Text>
            </View>
          </View>
        ) : (
          filteredExpenses.map((expense) => {
            console.log('ExpensesScreen: Rendering expense:', { 
              id: expense.id, 
              description: expense.description, 
              category: expense.category,
              personId: expense.personId 
            });
            const person = expense.personId ? data.people.find((p) => p.id === expense.personId) : null;
            const monthlyAmount = calculateMonthlyAmount(expense.amount, expense.frequency);
            const isDeleting = deletingExpenseId === expense.id;
            const tag = normalizeCategoryName((expense as any).categoryTag || 'Misc');

            return (
              <View key={expense.id} style={[themedStyles.card, { marginBottom: 6, padding: 12, opacity: isDeleting ? 0.6 : 1 }]}>
                <TouchableOpacity onPress={() => handleEditExpense(expense)} activeOpacity={0.7} disabled={saving || isDeleting} style={{ flex: 1 }}>
                  {/* Title and amount */}
                  <View style={[themedStyles.row, { marginBottom: 6, alignItems: 'flex-start', paddingRight: 50 }]}>
                    <View style={themedStyles.flex1}>
                      <Text style={[themedStyles.text, { fontWeight: '700', fontSize: 16 }]}>{expense.description}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          themedStyles.text,
                          {
                            fontWeight: '800',
                            color: expense.category === 'household' ? currentColors.household : currentColors.personal,
                            fontSize: 16,
                          },
                        ]}
                      >
                        {formatCurrency(expense.amount)}
                      </Text>
                      <Text style={[themedStyles.textSecondary, { fontSize: 11 }]}>{formatCurrency(monthlyAmount)}/mo</Text>
                    </View>
                  </View>

                  {/* Meta row with ownership badge + date + category tag */}
                  <View style={[themedStyles.row, { alignItems: 'center', paddingRight: 50, flexWrap: 'wrap' }]}>
                    <View
                      style={[
                        themedStyles.badge,
                        {
                          backgroundColor: expense.category === 'household' ? currentColors.household : currentColors.personal,
                          marginRight: 8,
                          marginBottom: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 12,
                        },
                      ]}
                    >
                      <Text style={[themedStyles.badgeText, { color: '#FFFFFF', fontSize: 10, fontWeight: '700' }]}>{expense.category.toUpperCase()}</Text>
                    </View>

                    <View
                      style={[
                        themedStyles.badge,
                        {
                          backgroundColor: currentColors.secondary + '20',
                          marginRight: 8,
                          marginBottom: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: currentColors.secondary,
                        },
                      ]}
                    >
                      <Text style={[themedStyles.text, { color: currentColors.secondary, fontSize: 10, fontWeight: '700' }]}>{tag}</Text>
                    </View>

                    <Text style={[themedStyles.textSecondary, { flex: 1, fontSize: 12 }]}>
                      {expense.category === 'household' && !expense.personId 
                        ? 'Household • ' 
                        : person 
                          ? `${person.name} • ` 
                          : expense.category === 'household'
                            ? 'Household • '
                            : 'Unknown Person • '
                      }
                      {expense.frequency} • {new Date(expense.date).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Delete button */}
                <View style={{ position: 'absolute', top: 8, right: 8, zIndex: 100 }}>
                  <TouchableOpacity
                    onPress={() => handleDeletePress(expense.id, expense.description)}
                    disabled={saving || isDeleting}
                    style={{
                      padding: 8,
                      borderRadius: 20,
                      backgroundColor: currentColors.error + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 36,
                      minHeight: 36,
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {isDeleting ? <ActivityIndicator size="small" color={currentColors.error} /> : <Icon name="trash-outline" size={18} style={{ color: currentColors.error }} />}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Filter Modal */}
      <ExpenseFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filter={filter}
        setFilter={setFilter}
        personFilter={personFilter}
        setPersonFilter={setPersonFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        people={data.people}
        expenses={data.expenses}
        customCategories={customCategories}
        onClearFilters={handleClearFilters}
        announceFilter={announceFilter}
      />
    </View>
  );
}
