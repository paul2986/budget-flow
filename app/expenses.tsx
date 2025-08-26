
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

type SortOption = 'date' | 'alphabetical' | 'cost';
type SortOrder = 'asc' | 'desc';

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
  
  // Enhanced sorting state
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc'); // Default: newest first

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

  // Helper function to format expiration date
  const formatExpirationDate = useCallback((endDate: string) => {
    const date = new Date(endDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    };
    const formattedDate = date.toLocaleDateString('en-US', options);
    
    if (diffDays < 0) {
      return { text: `Expired ${formattedDate}`, isExpired: true, isExpiringSoon: false };
    } else if (diffDays === 0) {
      return { text: `Expires today`, isExpired: false, isExpiringSoon: true };
    } else if (diffDays === 1) {
      return { text: `Expires tomorrow`, isExpired: false, isExpiringSoon: true };
    } else if (diffDays <= 7) {
      return { text: `Expires in ${diffDays} days`, isExpired: false, isExpiringSoon: true };
    } else if (diffDays <= 30) {
      return { text: `Expires ${formattedDate}`, isExpired: false, isExpiringSoon: false };
    } else {
      return { text: `Expires ${formattedDate}`, isExpired: false, isExpiringSoon: false };
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

  // Enhanced sort button handler
  const handleSortPress = useCallback((sortType: SortOption) => {
    if (sortBy === sortType) {
      // Toggle order if same sort type
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort type with appropriate default order
      setSortBy(sortType);
      if (sortType === 'date') {
        setSortOrder('desc'); // Newest first for date
      } else {
        setSortOrder('asc'); // A-Z for alphabetical, lowest first for cost
      }
    }
  }, [sortBy, sortOrder]);

  const getSortIcon = useCallback((sortType: SortOption) => {
    if (sortBy !== sortType) {
      return 'swap-vertical-outline';
    }
    
    return sortOrder === 'desc' ? 'arrow-down' : 'arrow-up';
  }, [sortBy, sortOrder]);

  const getSortLabel = useCallback((sortType: SortOption) => {
    switch (sortType) {
      case 'date': return 'Date';
      case 'alphabetical': return 'Name';
      case 'cost': return 'Amount';
      default: return 'Date';
    }
  }, []);

  const SortButton = useCallback(
    ({ sortType }: { sortType: SortOption }) => (
      <TouchableOpacity
        style={[
          {
            backgroundColor: sortBy === sortType ? currentColors.primary : currentColors.backgroundAlt,
            marginRight: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: sortBy === sortType ? currentColors.primary : currentColors.border,
            minHeight: 40,
          },
        ]}
        onPress={() => handleSortPress(sortType)}
        disabled={saving || deletingExpenseId !== null}
      >
        <Text
          style={[
            {
              color: sortBy === sortType ? '#FFFFFF' : currentColors.text,
              fontWeight: '600',
              fontSize: 14,
              marginRight: 6,
            },
          ]}
        >
          {getSortLabel(sortType)}
        </Text>
        <Icon 
          name={getSortIcon(sortType) as any} 
          size={14} 
          style={{ 
            color: sortBy === sortType ? '#FFFFFF' : currentColors.textSecondary,
          }} 
        />
      </TouchableOpacity>
    ),
    [sortBy, sortOrder, currentColors, saving, deletingExpenseId, handleSortPress, getSortIcon, getSortLabel]
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

  // Enhanced sorting logic
  filteredExpenses = filteredExpenses.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'alphabetical':
        comparison = a.description.toLowerCase().localeCompare(b.description.toLowerCase());
        break;
      case 'cost':
        comparison = a.amount - b.amount;
        break;
      default:
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const hasActiveFilters = !!categoryFilter || !!searchTerm || (filter !== 'all') || !!personFilter;

  // Header buttons - filter button on left, add button on right
  const leftButtons = [
    {
      icon: 'options-outline',
      onPress: () => setShowFilterModal(true),
      backgroundColor: hasActiveFilters ? currentColors.primary : currentColors.backgroundAlt,
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

      {/* Sort controls - simplified and cleaner */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: currentColors.backgroundAlt, borderBottomWidth: 1, borderBottomColor: currentColors.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <SortButton sortType="date" />
            <SortButton sortType="alphabetical" />
            <SortButton sortType="cost" />
          </View>
        </ScrollView>
      </View>

      {/* Active filters summary - more prominent when active */}
      {hasActiveFilters && (
        <View style={{ 
          paddingHorizontal: 20, 
          paddingVertical: 12, 
          backgroundColor: currentColors.primary + '10',
          borderBottomWidth: 1,
          borderBottomColor: currentColors.primary + '20'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Icon name="funnel" size={16} style={{ color: currentColors.primary, marginRight: 8 }} />
              <Text style={[themedStyles.text, { color: currentColors.primary, fontWeight: '600', fontSize: 14 }]}>
                {filteredExpenses.length} of {data.expenses.length} expenses
              </Text>
            </View>
            <TouchableOpacity 
              onPress={handleClearFilters}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: currentColors.primary,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={themedStyles.content} contentContainerStyle={themedStyles.scrollContent}>
        {filteredExpenses.length === 0 ? (
          <View style={[themedStyles.card, { alignItems: 'center', paddingVertical: 60, marginHorizontal: 20 }]}>
            <Icon name="receipt-outline" size={64} style={{ color: currentColors.textSecondary, marginBottom: 20 }} />
            <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 8, color: currentColors.textSecondary }]}>
              {hasActiveFilters ? 'No matching expenses' : 'No expenses yet'}
            </Text>
            <Text style={[themedStyles.textSecondary, { textAlign: 'center', lineHeight: 22 }]}>
              {hasActiveFilters
                ? 'Try adjusting your filters to see more expenses'
                : 'Add your first expense to get started tracking your spending'}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {filteredExpenses.map((expense) => {
              console.log('ExpensesScreen: Rendering expense:', { 
                id: expense.id, 
                description: expense.description, 
                category: expense.category,
                personId: expense.personId,
                frequency: expense.frequency,
                endDate: expense.endDate
              });
              const person = expense.personId ? data.people.find((p) => p.id === expense.personId) : null;
              const monthlyAmount = calculateMonthlyAmount(expense.amount, expense.frequency);
              const isDeleting = deletingExpenseId === expense.id;
              const tag = normalizeCategoryName((expense as any).categoryTag || 'Misc');
              const isHousehold = expense.category === 'household';
              
              // Only show monthly value if the expense was not added as monthly
              const shouldShowMonthlyValue = expense.frequency !== 'monthly';

              // Check if expense has expiration date
              const hasExpirationDate = expense.endDate && expense.frequency !== 'one-time';
              const expirationInfo = hasExpirationDate ? formatExpirationDate(expense.endDate) : null;

              return (
                <TouchableOpacity 
                  key={expense.id} 
                  onPress={() => handleEditExpense(expense)} 
                  activeOpacity={0.7} 
                  disabled={saving || isDeleting}
                  style={[
                    themedStyles.card, 
                    { 
                      padding: 16,
                      opacity: isDeleting ? 0.6 : 1,
                      borderLeftWidth: 3,
                      borderLeftColor: isHousehold ? currentColors.household : currentColors.personal,
                      marginBottom: 8,
                      // Add subtle border for expired/expiring expenses
                      ...(expirationInfo?.isExpired && {
                        borderWidth: 1,
                        borderColor: currentColors.error + '40',
                      }),
                      ...(expirationInfo?.isExpiringSoon && !expirationInfo?.isExpired && {
                        borderWidth: 1,
                        borderColor: '#FF9500' + '40',
                      }),
                    }
                  ]}
                >
                  {/* Main content row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Left side - expense info */}
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={[themedStyles.text, { fontWeight: '600', fontSize: 16, lineHeight: 20, flex: 1 }]}>
                          {expense.description}
                        </Text>
                      </View>
                      
                      {/* Category and person info in one line */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <View style={{
                          backgroundColor: isHousehold ? currentColors.household + '15' : currentColors.personal + '15',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                          marginRight: 6,
                        }}>
                          <Text style={{
                            color: isHousehold ? currentColors.household : currentColors.personal,
                            fontSize: 10,
                            fontWeight: '600',
                            textTransform: 'uppercase',
                          }}>
                            {expense.category}
                          </Text>
                        </View>
                        
                        <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>
                          {tag}
                        </Text>
                      </View>

                      {/* Person and frequency - conditionally show person for household expenses */}
                      <Text style={[themedStyles.textSecondary, { fontSize: 11, lineHeight: 14 }]}>
                        {isHousehold && !person ? '' : (person ? person.name : 'Unassigned')}
                        {isHousehold && !person ? expense.frequency : ` • ${expense.frequency}`}
                      </Text>

                      {/* Expiration date display - MOVED TIMER ICON TO THE LEFT */}
                      {hasExpirationDate && expirationInfo && (
                        <View style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          marginTop: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          backgroundColor: expirationInfo.isExpired 
                            ? currentColors.error + '15' 
                            : expirationInfo.isExpiringSoon 
                              ? '#FF9500' + '15' 
                              : currentColors.textSecondary + '15',
                          borderRadius: 8,
                          alignSelf: 'flex-start',
                        }}>
                          <Icon 
                            name={expirationInfo?.isExpired ? "time" : "timer-outline"} 
                            size={12} 
                            style={{ 
                              color: expirationInfo?.isExpired 
                                ? currentColors.error 
                                : expirationInfo?.isExpiringSoon 
                                  ? '#FF9500' 
                                  : currentColors.textSecondary,
                              marginRight: 6
                            }} 
                          />
                          <Text style={{
                            fontSize: 11,
                            fontWeight: '600',
                            color: expirationInfo.isExpired 
                              ? currentColors.error 
                              : expirationInfo.isExpiringSoon 
                                ? '#FF9500' 
                                : currentColors.textSecondary,
                          }}>
                            {expirationInfo.text}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Right side - amount and delete */}
                    <View style={{ alignItems: 'flex-end', flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                        <Text style={[
                          themedStyles.text,
                          {
                            fontWeight: '700',
                            fontSize: 16,
                            color: isHousehold ? currentColors.household : currentColors.personal,
                            marginBottom: shouldShowMonthlyValue ? 2 : 0,
                          },
                        ]}>
                          {formatCurrency(expense.amount)}
                        </Text>
                        {shouldShowMonthlyValue && (
                          <Text style={[themedStyles.textSecondary, { fontSize: 10 }]}>
                            {formatCurrency(monthlyAmount)}/mo
                          </Text>
                        )}
                      </View>
                      
                      {/* Delete button */}
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeletePress(expense.id, expense.description);
                        }}
                        disabled={saving || isDeleting}
                        style={{
                          padding: 6,
                          borderRadius: 12,
                          backgroundColor: currentColors.error + '15',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 28,
                          minHeight: 28,
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color={currentColors.error} />
                        ) : (
                          <Icon name="trash-outline" size={14} style={{ color: currentColors.error }} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
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
