
import { useTheme } from '../hooks/useTheme';
import Button from '../components/Button';
import { Text, View, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { router } from 'expo-router';
import Icon from '../components/Icon';
import { useCurrency, CURRENCIES, Currency } from '../hooks/useCurrency';
import { useBudgetData } from '../hooks/useBudgetData';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useToast } from '../hooks/useToast';
import StandardHeader from '../components/StandardHeader';
import { useState, useMemo } from 'react';

export default function SettingsScreen() {
  const { currentColors, themeMode, setThemeMode } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const { appData, data, clearAllData } = useBudgetData();
  const { themedStyles } = useThemedStyles();
  const { showToast } = useToast();
  
  // Currency selection modal state
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');

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
              // Navigate back to home screen to show first-time user experience
              router.replace('/');
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

  // Filter currencies based on search query
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

  // Get currencies to display (max 10 at a time)
  const displayedCurrencies = useMemo(() => {
    return filteredCurrencies.slice(0, 10);
  }, [filteredCurrencies]);

  return (
    <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
      <StandardHeader 
        title="Settings" 
        showLeftIcon={false}
        showRightIcon={false}
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
            onPress={() => router.push('/manage-categories')}
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

      {/* Currency Selection Modal */}
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
          <StandardHeader 
            title="Select Currency" 
            showLeftIcon={true}
            leftIcon="close"
            onLeftPress={() => {
              setShowCurrencyModal(false);
              setCurrencySearchQuery('');
            }}
            showRightIcon={false}
          />

          <View style={themedStyles.content}>
            {/* Search Input */}
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

            {/* Currency List */}
            <ScrollView 
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={true}
            >
              <View style={[themedStyles.card, { marginBottom: 16 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Icon name="globe-outline" size={20} style={{ color: currentColors.primary, marginRight: 8 }} />
                  <Text style={[themedStyles.text, { fontWeight: '600' }]}>
                    {currencySearchQuery.trim() ? `Search Results (${displayedCurrencies.length})` : `All Currencies (showing ${displayedCurrencies.length} of ${CURRENCIES.length})`}
                  </Text>
                </View>
                
                {displayedCurrencies.length === 0 ? (
                  <View style={{ alignItems: 'center', padding: 20 }}>
                    <Icon name="search" size={32} style={{ color: currentColors.textSecondary, marginBottom: 8 }} />
                    <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
                      No currencies found matching "{currencySearchQuery}"
                    </Text>
                  </View>
                ) : (
                  displayedCurrencies.map((curr, index) => (
                    <TouchableOpacity
                      key={curr.code}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 12,
                        borderBottomWidth: index === displayedCurrencies.length - 1 ? 0 : 1,
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

                {filteredCurrencies.length > 10 && (
                  <View style={{ 
                    alignItems: 'center', 
                    padding: 16, 
                    borderTopWidth: 1, 
                    borderTopColor: currentColors.border,
                    marginTop: 8
                  }}>
                    <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
                      Showing first 10 of {filteredCurrencies.length} results.{'\n'}
                      Use search to find specific currencies.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
