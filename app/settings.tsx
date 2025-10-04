
import { useTheme } from '../hooks/useTheme';
import Button from '../components/Button';
import { Text, View, ScrollView, TouchableOpacity, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import Icon from '../components/Icon';
import { useCurrency, CURRENCIES, Currency } from '../hooks/useCurrency';
import { useBudgetData } from '../hooks/useBudgetData';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useToast } from '../hooks/useToast';
import StandardHeader from '../components/StandardHeader';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { DEFAULT_CATEGORIES } from '../types/budget';
import { getCustomExpenseCategories, saveCustomExpenseCategories, normalizeCategoryName, renameCustomExpenseCategory } from '../utils/storage';

export default function SettingsScreen() {
  const { currentColors, themeMode, setThemeMode } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const { appData, data, clearAllData, refreshData } = useBudgetData();
  const { themedStyles } = useThemedStyles();
  const { showToast } = useToast();
  
  // Currency selection modal state
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');

  // Manage categories modal state
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [customs, setCustoms] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [categoryToRename, setCategoryToRename] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [renaming, setRenaming] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const handleDistributionMethodChange = (method: 'even' | 'income-based') => {
    // This would need to be implemented in useBudgetData if needed
    console.log('Distribution method change:', method);
    showToast(`Distribution method changed to ${method}`, 'success');
  };

  const handleThemeChange = (newTheme: 'system' | 'light' | 'dark') => {
    setThemeMode(newTheme);
    showToast(`Theme changed to ${newTheme}`, 'success');
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your budgets, people, and expenses. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              showToast('All data cleared successfully', 'success');
              // Longer delay to ensure data state has fully updated and propagated
              setTimeout(() => {
                console.log('Settings: Navigating to home after clearing data');
                router.replace('/');
              }, 200);
            } catch (error) {
              console.error('Settings: Clear data error:', error);
              showToast('Failed to clear data', 'error');
            }
          },
        },
      ]
    );
  };

  const handleCurrencyChange = (curr: Currency) => {
    setCurrency(curr);
    setShowCurrencyModal(false);
    setCurrencySearchQuery('');
    showToast(`Currency changed to ${curr.name}`, 'success');
  };

  // Categories management functions
  const refreshCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const list = await getCustomExpenseCategories();
      setCustoms(list);
    } catch (e) {
      console.log('Failed to load custom categories', e);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const handleManageCategoriesPress = () => {
    setShowCategoriesModal(true);
    refreshCategories();
  };

  const isInUse = (category: string): boolean => {
    if (!data?.expenses) return false;
    const normalized = normalizeCategoryName(category);
    return data.expenses.some((e) => normalizeCategoryName((e as any).categoryTag || 'Misc') === normalized);
  };

  const handleDeleteCategory = (category: string) => {
    if (isInUse(category)) {
      Alert.alert('Cannot delete', 'This category is currently in use by one or more expenses.');
      return;
    }
    Alert.alert('Delete Category', `Are you sure you want to delete "${category}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const next = customs.filter((c) => c !== category);
            await saveCustomExpenseCategories(next);
            setCustoms(next);
          } catch (e) {
            console.log('Failed to delete custom category', e);
            Alert.alert('Error', 'Failed to delete category. Please try again.');
          }
        },
      },
    ]);
  };

  const handleRenameCategory = (category: string) => {
    setCategoryToRename(category);
    setNewCategoryName(category);
    setRenameModalVisible(true);
  };

  const handleRenameSubmit = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Category name cannot be empty.');
      return;
    }

    if (newCategoryName.trim() === categoryToRename) {
      setRenameModalVisible(false);
      return;
    }

    setRenaming(true);
    try {
      const result = await renameCustomExpenseCategory(categoryToRename, newCategoryName.trim());
      
      if (result.success) {
        await refreshCategories();
        await refreshData(); // Refresh budget data to reflect changes in expenses
        setRenameModalVisible(false);
        setCategoryToRename('');
        setNewCategoryName('');
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to rename category. Please try again.');
      }
    } catch (e) {
      console.log('Failed to rename custom category', e);
      Alert.alert('Error', 'Failed to rename category. Please try again.');
    } finally {
      setRenaming(false);
    }
  };

  const handleRenameCancel = () => {
    setRenameModalVisible(false);
    setCategoryToRename('');
    setNewCategoryName('');
  };

  const handleCreateCategory = () => {
    setNewCategoryInput('');
    setCreateModalVisible(true);
  };

  const handleCreateSubmit = async () => {
    const trimmedName = newCategoryInput.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Category name cannot be empty.');
      return;
    }

    const normalized = normalizeCategoryName(trimmedName);
    
    // Check if it conflicts with default categories
    if (DEFAULT_CATEGORIES.includes(normalized)) {
      Alert.alert('Error', 'This category name conflicts with a default category.');
      return;
    }

    // Check if it already exists in custom categories
    if (customs.includes(normalized)) {
      Alert.alert('Error', 'A category with this name already exists.');
      return;
    }

    setCreating(true);
    try {
      const updatedCategories = [...customs, normalized];
      await saveCustomExpenseCategories(updatedCategories);
      setCustoms(updatedCategories);
      setCreateModalVisible(false);
      setNewCategoryInput('');
    } catch (e) {
      console.log('Failed to create custom category', e);
      Alert.alert('Error', 'Failed to create category. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateCancel = () => {
    setCreateModalVisible(false);
    setNewCategoryInput('');
  };

  // Filter currencies based on search query - show ALL results, not just 10
  const filteredCurrencies = useMemo(() => {
    if (!currencySearchQuery.trim()) {
      return CURRENCIES;
    }
    
    const query = currencySearchQuery.toLowerCase().trim();
    return CURRENCIES.filter(curr => 
      curr.name.toLowerCase().includes(query) ||
      curr.code.toLowerCase().includes(query) ||
      curr.symbol.toLowerCase().includes(query)
    );
  }, [currencySearchQuery]);

  return (
    <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
      <StandardHeader 
        title="Settings" 
        showLeftIcon={false}
        showRightIcon={false}
        backgroundColor={currentColors.backgroundAlt}
      />

      <ScrollView style={themedStyles.content} contentContainerStyle={[themedStyles.scrollContent, { paddingHorizontal: 0, paddingTop: 16 }]}>
        {/* App Info */}
        <View style={[themedStyles.card, { marginBottom: 24 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Icon name="wallet-outline" size={24} style={{ color: currentColors.primary, marginRight: 12 }} />
            <Text style={[themedStyles.subtitle, { flex: 1 }]}>Budget Flow</Text>
          </View>
          <Text style={themedStyles.textSecondary}>
            Offline-first budget tracking app
          </Text>
        </View>

        {/* Budgets */}
        <View style={[themedStyles.card, { marginBottom: 16 }]}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 44,
            }}
            onPress={() => router.push('/budgets')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Icon name="folder-outline" size={20} style={{ color: currentColors.text, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[themedStyles.text, { fontWeight: '600' }]}>Manage Budgets</Text>
                <Text style={themedStyles.textSecondary}>
                  {appData?.budgets?.length || 0} budget{(appData?.budgets?.length || 0) !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} style={{ color: currentColors.textSecondary }} />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={[themedStyles.card, { marginBottom: 16 }]}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 44,
            }}
            onPress={handleManageCategoriesPress}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Icon name="pricetags-outline" size={20} style={{ color: currentColors.text, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[themedStyles.text, { fontWeight: '600' }]}>Manage Categories</Text>
                <Text style={themedStyles.textSecondary}>
                  Customize expense categories
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} style={{ color: currentColors.textSecondary }} />
          </TouchableOpacity>
        </View>

        {/* Currency */}
        <View style={[themedStyles.card, { marginBottom: 16 }]}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 44,
            }}
            onPress={() => setShowCurrencyModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Icon name="card-outline" size={20} style={{ color: currentColors.text, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[themedStyles.text, { fontWeight: '600' }]}>Currency</Text>
                <Text style={themedStyles.textSecondary}>
                  {currency.symbol} {currency.name} ({currency.code})
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} style={{ color: currentColors.textSecondary }} />
          </TouchableOpacity>
        </View>

        {/* Theme */}
        <View style={[themedStyles.card, { marginBottom: 16 }]}>
          <Text style={[themedStyles.text, { fontWeight: '600', marginBottom: 12 }]}>Theme</Text>
          {[
            { key: 'system', label: 'System' },
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
          ].map((theme) => (
            <TouchableOpacity
              key={theme.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomWidth: theme.key === 'dark' ? 0 : 1,
                borderBottomColor: currentColors.border,
              }}
              onPress={() => handleThemeChange(theme.key as any)}
            >
              <Text style={themedStyles.text}>{theme.label}</Text>
              {themeMode === theme.key && (
                <Icon name="checkmark" size={20} style={{ color: currentColors.primary }} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tools */}
        <View style={[themedStyles.card, { marginBottom: 16 }]}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 44,
            }}
            onPress={() => router.push('/tools')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Icon name="calculator-outline" size={20} style={{ color: currentColors.text, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[themedStyles.text, { fontWeight: '600' }]}>Financial Tools</Text>
                <Text style={themedStyles.textSecondary}>
                  Credit card payoff calculator
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} style={{ color: currentColors.textSecondary }} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={[
          themedStyles.card, 
          { 
            marginBottom: 24,
            borderColor: currentColors.error + '40',
            borderWidth: 2,
            backgroundColor: currentColors.error + '08'
          }
        ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Icon name="warning" size={24} style={{ color: currentColors.error, marginRight: 12 }} />
            <Text style={[themedStyles.text, { fontWeight: '700', color: currentColors.error, fontSize: 18 }]}>
              Danger Zone
            </Text>
          </View>
          
          <Text style={[themedStyles.textSecondary, { marginBottom: 16, lineHeight: 20 }]}>
            This action will permanently delete all your data. This cannot be undone.
          </Text>
          
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: currentColors.error,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: currentColors.error,
            }}
            onPress={handleClearAllData}
          >
            <Icon name="trash" size={20} style={{ color: currentColors.background, marginRight: 8 }} />
            <Text style={[themedStyles.text, { color: currentColors.background, fontWeight: '700' }]}>
              Clear All Data
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={[themedStyles.card, { backgroundColor: currentColors.backgroundAlt }]}>
          <Text style={[themedStyles.textSecondary, { fontSize: 12, textAlign: 'center', lineHeight: 18 }]}>
            Budget Flow v1.0.0{'\n'}
            Offline-first budget tracking{'\n'}
            No accounts required
          </Text>
        </View>
      </ScrollView>

      {/* Currency Selection Modal - Fixed structure */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowCurrencyModal(false);
          setCurrencySearchQuery('');
        }}
      >
        <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
          {/* Fixed Header */}
          <StandardHeader 
            title="Select Currency" 
            showLeftIcon={true}
            leftIcon="close"
            onLeftPress={() => {
              setShowCurrencyModal(false);
              setCurrencySearchQuery('');
            }}
            showRightIcon={false}
            backgroundColor={currentColors.backgroundAlt}
          />

          {/* Fixed Content Container */}
          <View style={[themedStyles.content, { flex: 1, paddingHorizontal: 16, paddingTop: 16 }]}>
            {/* Fixed Search Section */}
            <View style={[themedStyles.card, { marginBottom: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Icon name="search" size={20} style={{ color: currentColors.textSecondary, marginRight: 8 }} />
                <Text style={[themedStyles.text, { fontWeight: '600' }]}>Search Currencies</Text>
              </View>
              <TextInput
                style={[
                  themedStyles.input,
                  {
                    marginBottom: 0,
                    borderColor: currentColors.border,
                  }
                ]}
                value={currencySearchQuery}
                onChangeText={setCurrencySearchQuery}
                placeholder="Search by name, code, or symbol..."
                placeholderTextColor={currentColors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Fixed Results Header */}
            <View style={[themedStyles.card, { marginBottom: 16, paddingBottom: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="globe-outline" size={20} style={{ color: currentColors.primary, marginRight: 8 }} />
                <Text style={[themedStyles.text, { fontWeight: '600' }]}>
                  {currencySearchQuery.trim() 
                    ? `Search Results (${filteredCurrencies.length})` 
                    : `All Currencies (${CURRENCIES.length})`
                  }
                </Text>
              </View>
            </View>

            {/* Scrollable Currency List Container - This stays in place */}
            <View style={[
              themedStyles.card, 
              { 
                flex: 1, 
                padding: 0, 
                overflow: 'hidden' // Ensure rounded corners are maintained
              }
            ]}>
              <ScrollView 
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16 }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {filteredCurrencies.length === 0 ? (
                  <View style={{ alignItems: 'center', padding: 20 }}>
                    <Icon name="search" size={32} style={{ color: currentColors.textSecondary, marginBottom: 8 }} />
                    <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
                      No currencies found matching "{currencySearchQuery}"
                    </Text>
                  </View>
                ) : (
                  filteredCurrencies.map((curr, index) => (
                    <TouchableOpacity
                      key={curr.code}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 12,
                        borderBottomWidth: index === filteredCurrencies.length - 1 ? 0 : 1,
                        borderBottomColor: currentColors.border,
                      }}
                      onPress={() => handleCurrencyChange(curr)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[themedStyles.text, { fontWeight: '600', marginBottom: 2 }]}>
                          {curr.name}
                        </Text>
                        <Text style={themedStyles.textSecondary}>
                          {curr.symbol} • {curr.code}
                        </Text>
                      </View>
                      {currency.code === curr.code && (
                        <Icon name="checkmark-circle" size={24} style={{ color: currentColors.primary }} />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage Categories Modal */}
      <Modal
        visible={showCategoriesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoriesModal(false)}
      >
        <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
          <StandardHeader 
            title="Manage Categories" 
            showLeftIcon={true}
            leftIcon="close"
            onLeftPress={() => setShowCategoriesModal(false)}
            showRightIcon={false}
            backgroundColor={currentColors.backgroundAlt}
          />

          <ScrollView style={[themedStyles.content, { flex: 1, paddingHorizontal: 16, paddingTop: 16 }]} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Default Categories Section */}
            <View style={[themedStyles.card, { marginBottom: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Icon name="shield-checkmark-outline" size={20} style={{ color: currentColors.primary, marginRight: 8 }} />
                <Text style={[themedStyles.text, { fontWeight: '600' }]}>Default Categories</Text>
              </View>
              <Text style={[themedStyles.textSecondary, { marginBottom: 12, fontSize: 14 }]}>
                These categories cannot be deleted.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {DEFAULT_CATEGORIES.map((c) => (
                  <View
                    key={c}
                    style={[
                      themedStyles.badge,
                      {
                        backgroundColor: currentColors.border,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        marginRight: 8,
                        marginBottom: 8,
                      },
                    ]}
                  >
                    <Text style={[themedStyles.badgeText, { color: currentColors.text, fontSize: 12 }]}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Custom Categories Section */}
            <View style={[themedStyles.card, { flex: 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="pricetags-outline" size={20} style={{ color: currentColors.primary, marginRight: 8 }} />
                  <Text style={[themedStyles.text, { fontWeight: '600' }]}>Custom Categories</Text>
                </View>
                <TouchableOpacity
                  onPress={handleCreateCategory}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: currentColors.primary,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                  }}
                  accessibilityLabel="Add new category"
                  accessibilityRole="button"
                >
                  <Icon name="add" size={16} style={{ color: 'white', marginRight: 4 }} />
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Add New</Text>
                </TouchableOpacity>
              </View>

              {categoriesLoading ? (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <ActivityIndicator size="small" color={currentColors.primary} />
                  <Text style={[themedStyles.textSecondary, { marginTop: 8 }]}>Loading...</Text>
                </View>
              ) : customs.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Text style={[themedStyles.textSecondary, { textAlign: 'center', marginBottom: 16 }]}>
                    No custom categories yet.
                  </Text>
                  <TouchableOpacity
                    onPress={handleCreateCategory}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: currentColors.primary + '15',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: currentColors.primary + '30',
                    }}
                  >
                    <Icon name="add" size={20} style={{ color: currentColors.primary, marginRight: 8 }} />
                    <Text style={{ color: currentColors.primary, fontSize: 14, fontWeight: '600' }}>Create Your First Category</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                customs.map((c) => {
                  const used = isInUse(c);
                  return (
                    <View
                      key={c}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 12,
                        borderBottomWidth: customs.indexOf(c) === customs.length - 1 ? 0 : 1,
                        borderBottomColor: currentColors.border,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View
                          style={[
                            themedStyles.badge,
                            {
                              backgroundColor: currentColors.secondary + '20',
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 16,
                              marginRight: 12,
                              borderWidth: 1,
                              borderColor: currentColors.secondary,
                            },
                          ]}
                        >
                          <Text style={[themedStyles.text, { color: currentColors.secondary, fontSize: 12, fontWeight: '700' }]}>{c}</Text>
                        </View>
                        {used && <Text style={[themedStyles.textSecondary, { color: currentColors.warning }]}>In use</Text>}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                          onPress={() => handleRenameCategory(c)}
                          style={{
                            padding: 10,
                            borderRadius: 8,
                            backgroundColor: currentColors.primary + '15',
                            marginRight: 8,
                          }}
                          accessibilityLabel={`Rename ${c}`}
                          accessibilityRole="button"
                        >
                          <Icon name="pencil-outline" size={20} style={{ color: currentColors.primary }} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteCategory(c)}
                          disabled={used}
                          style={{
                            padding: 10,
                            borderRadius: 8,
                            backgroundColor: used ? currentColors.border : currentColors.error + '15',
                          }}
                          accessibilityLabel={`Delete ${c}`}
                          accessibilityRole="button"
                        >
                          <Icon 
                            name="trash-outline" 
                            size={20} 
                            style={{ color: used ? currentColors.textSecondary : currentColors.error }} 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Rename Category Modal */}
      <Modal
        visible={renameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleRenameCancel}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
          }}>
            <View style={[
              themedStyles.card,
              {
                width: '100%',
                maxWidth: 400,
                padding: 24,
                borderRadius: 16,
                backgroundColor: currentColors.background,
              }
            ]}>
              <Text style={[
                themedStyles.title, 
                { 
                  marginBottom: 8, 
                  textAlign: 'center',
                  color: currentColors.text,
                  fontSize: 20,
                  fontWeight: '700'
                }
              ]}>
                Rename Category
              </Text>
              <Text style={[
                themedStyles.textSecondary, 
                { 
                  marginBottom: 20, 
                  textAlign: 'center',
                  color: currentColors.textSecondary,
                  fontSize: 14
                }
              ]}>
                Enter a new name for "{categoryToRename}"
              </Text>

              <View style={{ marginBottom: 24 }}>
                <Text style={[
                  themedStyles.label, 
                  { 
                    marginBottom: 8,
                    color: currentColors.text,
                    fontSize: 16,
                    fontWeight: '600'
                  }
                ]}>
                  Category Name
                </Text>
                <TextInput
                  style={[
                    themedStyles.input,
                    {
                      borderColor: currentColors.border,
                      borderWidth: 1,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: currentColors.text,
                      backgroundColor: currentColors.background,
                    }
                  ]}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="Enter category name"
                  placeholderTextColor={currentColors.textSecondary}
                  maxLength={20}
                  autoFocus={true}
                  selectTextOnFocus={true}
                />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <Button
                  text="Cancel"
                  onPress={handleRenameCancel}
                  variant="outline"
                  style={{ flex: 1 }}
                />
                <Button
                  text={renaming ? "Renaming..." : "Rename"}
                  onPress={handleRenameSubmit}
                  disabled={!newCategoryName.trim() || newCategoryName.trim() === categoryToRename || renaming}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Category Modal */}
      <Modal
        visible={createModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCreateCancel}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
          }}>
            <View style={[
              themedStyles.card,
              {
                width: '100%',
                maxWidth: 400,
                padding: 24,
                borderRadius: 16,
                backgroundColor: currentColors.background,
              }
            ]}>
              <Text style={[
                themedStyles.title, 
                { 
                  marginBottom: 8, 
                  textAlign: 'center',
                  color: currentColors.text,
                  fontSize: 20,
                  fontWeight: '700'
                }
              ]}>
                Create New Category
              </Text>
              <Text style={[
                themedStyles.textSecondary, 
                { 
                  marginBottom: 20, 
                  textAlign: 'center',
                  color: currentColors.textSecondary,
                  fontSize: 14
                }
              ]}>
                Enter a name for your new custom category
              </Text>

              <View style={{ marginBottom: 24 }}>
                <Text style={[
                  themedStyles.label, 
                  { 
                    marginBottom: 8,
                    color: currentColors.text,
                    fontSize: 16,
                    fontWeight: '600'
                  }
                ]}>
                  Category Name
                </Text>
                <TextInput
                  style={[
                    themedStyles.input,
                    {
                      borderColor: currentColors.border,
                      borderWidth: 1,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: currentColors.text,
                      backgroundColor: currentColors.background,
                    }
                  ]}
                  value={newCategoryInput}
                  onChangeText={setNewCategoryInput}
                  placeholder="Enter category name"
                  placeholderTextColor={currentColors.textSecondary}
                  maxLength={20}
                  autoFocus={true}
                />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <Button
                  text="Cancel"
                  onPress={handleCreateCancel}
                  variant="outline"
                  style={{ flex: 1 }}
                />
                <Button
                  text={creating ? "Creating..." : "Create"}
                  onPress={handleCreateSubmit}
                  disabled={!newCategoryInput.trim() || creating}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
