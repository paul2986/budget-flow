
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
  const params = useLocalSearchParams<{ showRecurring?: string }>();

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

  // Load custom categories and persisted filters
  useEffect(() => {
    (async () => {
      const [customs, filters] = await Promise.all([getCustomExpenseCategories(), getExpensesFilters()]);
      setCustomCategories(customs);
      setCategoryFilter(filters.category || null);
      setSearchQuery(filters.search || '');
      setSearchTerm(filters.search || '');
    })();
  }, []);

  // Persist category + search with debounce
  useEffect(() => {
    const t = setTimeout(() => {
      saveExpensesFilters({ category: categoryFilter, search: searchQuery });
    }, 300);
    return () => clearTimeout(t);
  }, [categoryFilter, searchQuery]);

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

  const announceFilter = (msg: string) => {
    try {
      AccessibilityInfo.announceForAccessibility?.(msg);
    } catch (e) {
      console.log('Accessibility announce failed', e);
    }
  };

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

  if (filter === 'household') {
    filteredExpenses = filteredExpenses.filter((e) => e.category === 'household');
  } else if (filter === 'personal') {
    filteredExpenses = filteredExpenses.filter((e) => e.category === 'personal');
  }

  // Apply person filter to all expenses (both household and personal)
  if (personFilter) {
    filteredExpenses = filteredExpenses.filter((e) => e.personId === personFilter);
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

  // Header buttons - filter button on left, add button on right
  const leftButtons = [
    {
      icon: 'funnel-outline',
      onPress: () => setShowFilterModal(true),
      backgroundColor: hasActiveFilters ? currentColors.secondary : currentColors.border + '80',
      iconColor: hasActiveFilters ? '#FFFFFF' : currentColors.text,
    },
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

      {/* Clear filters button - only show when filters are active */}
      {hasActiveFilters && (
        <View style={[themedStyles.section, { paddingTop: 8, paddingBottom: 0, paddingHorizontal: 16 }]}>
          <TouchableOpacity
            onPress={handleClearFilters}
            style={{
              backgroundColor: currentColors.error + '15',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Icon name="close-circle-outline" size={16} style={{ color: currentColors.error, marginRight: 6 }} />
            <Text style={[themedStyles.text, { color: currentColors.error, fontSize: 13, fontWeight: '600' }]}>
              Clear All Filters
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sort options - now more prominent */}
      <View style={[themedStyles.section, { paddingBottom: 0, paddingTop: hasActiveFilters ? 8 : 12, paddingHorizontal: 16 }]}>
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
        <View style={[themedStyles.section, { paddingTop: 0, paddingHorizontal: 16 }]}>
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
                      {person ? `${person.name} • ` : 'Unknown Person • '}
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
