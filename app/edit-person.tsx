
import { useState, useCallback } from 'react';
import { 
  calculatePersonIncome, 
  calculateMonthlyAmount, 
  calculatePersonalExpenses,
  calculateHouseholdShare,
  calculateHouseholdExpenses 
} from '../utils/calculations';
import { useBudgetData } from '../hooks/useBudgetData';
import Button from '../components/Button';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCurrency } from '../hooks/useCurrency';
import Icon from '../components/Icon';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Person, Income } from '../types/budget';
import { useTheme } from '../hooks/useTheme';
import StandardHeader from '../components/StandardHeader';

export default function EditPersonScreen() {
  const [person, setPerson] = useState<Person | null>(null);
  const [newIncome, setNewIncome] = useState({
    amount: '',
    label: '',
    frequency: 'monthly' as const,
  });
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [deletingIncomeId, setDeletingIncomeId] = useState<string | null>(null);
  const [isLoadingPerson, setIsLoadingPerson] = useState(true);
  const [isDeletingPerson, setIsDeletingPerson] = useState(false);
  
  const { formatCurrency } = useCurrency();
  const { currentColors } = useTheme();
  const { themedStyles, themedButtonStyles } = useThemedStyles();
  const params = useLocalSearchParams<{ personId: string; origin?: string }>();
  const personId = params.personId;
  const origin = params.origin || 'people'; // Default to people if no origin specified
  
  const { data, updatePerson, addIncome, removeIncome, removePerson, saving, refreshData } = useBudgetData();

  // Refresh data when screen becomes focused and find the person
  useFocusEffect(
    useCallback(() => {
      console.log('EditPersonScreen: Screen focused, refreshing data...');
      setIsLoadingPerson(true);
      
      const loadPersonData = async () => {
        try {
          await refreshData(true);
          
          if (personId && data.people.length > 0) {
            const foundPerson = data.people.find(p => p.id === personId);
            console.log('EditPersonScreen: Found person:', foundPerson);
            
            if (foundPerson) {
              console.log('EditPersonScreen: Setting person state to:', foundPerson);
              setPerson(foundPerson);
            } else {
              console.log('EditPersonScreen: Person not found in data.people array');
              console.log('EditPersonScreen: Available person IDs:', data.people.map(p => p.id));
              setPerson(null);
            }
          } else {
            console.log('EditPersonScreen: No personId provided or no people in data');
            setPerson(null);
          }
        } catch (error) {
          console.error('EditPersonScreen: Error loading person data:', error);
          setPerson(null);
        } finally {
          setIsLoadingPerson(false);
        }
      };
      
      loadPersonData();
    }, [personId, refreshData, data.people])
  );

  const navigateToOrigin = useCallback(() => {
    console.log('EditPersonScreen: Navigating back to origin:', origin);
    
    // Small delay to ensure state is updated before navigation
    setTimeout(() => {
      if (origin === 'home') {
        router.replace('/');
      } else {
        router.replace('/people');
      }
    }, 100);
  }, [origin]);

  const handleSavePerson = useCallback(async () => {
    if (!person) return;

    try {
      console.log('EditPersonScreen: Saving person:', person);
      const result = await updatePerson(person);
      if (result.success) {
        console.log('EditPersonScreen: Person saved successfully, navigating back to origin');
        navigateToOrigin();
      } else {
        Alert.alert('Error', 'Failed to update person. Please try again.');
      }
    } catch (error) {
      console.error('EditPersonScreen: Error updating person:', error);
      Alert.alert('Error', 'Failed to update person. Please try again.');
    }
  }, [person, updatePerson, navigateToOrigin]);

  const handleDeletePerson = useCallback(() => {
    if (!person) return;
    
    // Prevent multiple deletion attempts
    if (isDeletingPerson || saving) {
      console.log('EditPersonScreen: Person deletion already in progress, ignoring');
      return;
    }

    Alert.alert(
      'Delete Person',
      `Are you sure you want to delete ${person.name}? This will also remove all their income sources and personal expenses. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeletingPerson(true);
              console.log('EditPersonScreen: Deleting person:', person.id);
              
              const result = await removePerson(person.id);
              if (result.success) {
                console.log('EditPersonScreen: Person deleted successfully, navigating back');
                navigateToOrigin();
              } else {
                Alert.alert('Error', 'Failed to delete person. Please try again.');
              }
            } catch (error) {
              console.error('EditPersonScreen: Error deleting person:', error);
              Alert.alert('Error', 'Failed to delete person. Please try again.');
            } finally {
              setIsDeletingPerson(false);
            }
          }
        },
      ]
    );
  }, [person, isDeletingPerson, saving, removePerson, navigateToOrigin]);

  const handleGoBack = useCallback(() => {
    router.back();
  }, []);

  const handleAddIncome = useCallback(async () => {
    if (!person || !newIncome.amount || !newIncome.label.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const amount = parseFloat(newIncome.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const income: Income = {
        id: `income_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: amount,
        label: newIncome.label.trim(),
        frequency: newIncome.frequency,
        personId: person.id,
      };

      console.log('EditPersonScreen: Adding income:', income);
      const result = await addIncome(person.id, income);
      if (result.success) {
        setNewIncome({ amount: '', label: '', frequency: 'monthly' });
        setShowAddIncome(false);
        console.log('EditPersonScreen: Income added successfully');
        
        // Update local person state to reflect the new income
        setPerson(prev => prev ? {
          ...prev,
          income: [...prev.income, income]
        } : null);
      } else {
        Alert.alert('Error', 'Failed to add income. Please try again.');
      }
    } catch (error) {
      console.error('EditPersonScreen: Error adding income:', error);
      Alert.alert('Error', 'Failed to add income. Please try again.');
    }
  }, [person, newIncome, addIncome]);

  const handleRemoveIncome = useCallback((incomeId: string, incomeLabel: string) => {
    if (!person) return;
    
    // Prevent multiple deletion attempts
    if (deletingIncomeId === incomeId || saving) {
      console.log('EditPersonScreen: Income deletion already in progress, ignoring');
      return;
    }

    Alert.alert(
      'Remove Income',
      `Are you sure you want to remove "${incomeLabel}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingIncomeId(incomeId);
              console.log('EditPersonScreen: Removing income:', incomeId);
              
              const result = await removeIncome(person.id, incomeId);
              if (result.success) {
                console.log('EditPersonScreen: Income removed successfully');
                
                // Update local person state to reflect the removed income
                setPerson(prev => prev ? {
                  ...prev,
                  income: prev.income.filter(i => i.id !== incomeId)
                } : null);
              } else {
                Alert.alert('Error', 'Failed to remove income. Please try again.');
              }
            } catch (error) {
              console.error('EditPersonScreen: Error removing income:', error);
              Alert.alert('Error', 'Failed to remove income. Please try again.');
            } finally {
              setDeletingIncomeId(null);
            }
          }
        },
      ]
    );
  }, [person, deletingIncomeId, saving, removeIncome]);

  const calculateRemainingIncome = useCallback(() => {
    if (!person) return 0;
    
    const totalIncome = calculatePersonIncome(person);
    const personalExpenses = calculatePersonalExpenses(data.expenses, person.id);
    const householdExpenses = calculateHouseholdExpenses(data.expenses);
    const householdShare = calculateHouseholdShare(
      householdExpenses,
      data.people,
      data.householdSettings.distributionMethod,
      person.id
    );
    
    return totalIncome - personalExpenses - householdShare;
  }, [person, data.expenses, data.people, data.householdSettings.distributionMethod]);

  const FrequencyPicker = ({ value, onChange }: { value: string, onChange: (value: string) => void }) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
      {['daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
        <TouchableOpacity
          key={freq}
          style={[
            themedStyles.badge,
            { 
              backgroundColor: value === freq ? currentColors.primary : currentColors.border,
              marginRight: 8,
              marginBottom: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }
          ]}
          onPress={() => onChange(freq)}
          disabled={saving}
        >
          <Text style={[
            themedStyles.badgeText,
            { color: value === freq ? currentColors.backgroundAlt : currentColors.text }
          ]}>
            {freq.charAt(0).toUpperCase() + freq.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Show loading state while we're waiting for data
  if (isLoadingPerson) {
    return (
      <View style={themedStyles.container}>
        <StandardHeader
          title="Edit Person"
          onLeftPress={handleGoBack}
          showRightIcon={false}
        />
        <View style={[themedStyles.centerContent, { flex: 1 }]}>
          <ActivityIndicator size="large" color={currentColors.primary} />
          <Text style={[themedStyles.textSecondary, { marginTop: 16 }]}>Loading person...</Text>
        </View>
      </View>
    );
  }

  // Show error state if person not found after loading
  if (!person) {
    return (
      <View style={themedStyles.container}>
        <StandardHeader
          title="Edit Person"
          onLeftPress={handleGoBack}
          showRightIcon={false}
        />
        <View style={[themedStyles.centerContent, { flex: 1 }]}>
          <Icon name="person-outline" size={48} style={{ color: currentColors.textSecondary, marginBottom: 16 }} />
          <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 8 }]}>Person not found</Text>
          <Text style={[themedStyles.textSecondary, { marginBottom: 24, textAlign: 'center' }]}>
            The person you're trying to edit could not be found. They may have been deleted or there was an error loading the data.
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              text="Refresh Data"
              onPress={() => {
                setIsLoadingPerson(true);
                refreshData(true);
              }}
              style={[themedButtonStyles.outline, { borderColor: currentColors.primary, marginTop: 0 }]}
              textStyle={{ color: currentColors.primary }}
            />
            <Button
              text="Go Back"
              onPress={navigateToOrigin}
              style={[themedButtonStyles.primary, { backgroundColor: currentColors.primary, marginTop: 0 }]}
            />
          </View>
        </View>
      </View>
    );
  }

  const totalIncome = calculatePersonIncome(person);
  const monthlyIncome = calculateMonthlyAmount(totalIncome, 'yearly');
  const remainingIncome = calculateRemainingIncome();
  const monthlyRemaining = calculateMonthlyAmount(remainingIncome, 'yearly');

  return (
    <View style={themedStyles.container}>
      <StandardHeader
        title="Edit Person"
        onLeftPress={handleGoBack}
        rightIcon="checkmark"
        onRightPress={handleSavePerson}
        loading={saving || isDeletingPerson}
      />

      <ScrollView style={themedStyles.content} contentContainerStyle={themedStyles.scrollContent}>
        {/* Person Details */}
        <View style={themedStyles.section}>
          <Text style={[themedStyles.subtitle, { marginBottom: 12 }]}>Person Details</Text>
          
          <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
            Name:
          </Text>
          <TextInput
            style={themedStyles.input}
            value={person.name}
            onChangeText={(text) => setPerson({ ...person, name: text })}
            placeholder="Enter person's name"
            placeholderTextColor={currentColors.textSecondary}
            editable={!saving && !isDeletingPerson}
          />
        </View>

        {/* Income Summary */}
        <View style={themedStyles.section}>
          <Text style={[themedStyles.subtitle, { marginBottom: 12 }]}>Income Summary</Text>
          
          <View style={themedStyles.card}>
            <View style={[themedStyles.row, { marginBottom: 8 }]}>
              <Text style={themedStyles.text}>Monthly Income:</Text>
              <Text style={[themedStyles.text, { color: currentColors.income, fontWeight: '600' }]}>
                {formatCurrency(monthlyIncome)}
              </Text>
            </View>

            <View style={themedStyles.row}>
              <Text style={[themedStyles.text, { fontWeight: '600' }]}>Remaining Income:</Text>
              <Text style={[
                themedStyles.text, 
                { 
                  color: monthlyRemaining >= 0 ? currentColors.success : currentColors.error, 
                  fontWeight: '700' 
                }
              ]}>
                {formatCurrency(monthlyRemaining)}
              </Text>
            </View>
          </View>
        </View>

        {/* Add Income Form */}
        {showAddIncome && (
          <View style={[themedStyles.card, { backgroundColor: currentColors.income + '10' }]}>
            <Text style={[themedStyles.subtitle, { marginBottom: 12 }]}>
              Add Income for {person.name}
            </Text>
            
            <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
              Income Source:
            </Text>
            <TextInput
              style={themedStyles.input}
              placeholder="e.g., Salary, Freelance, Side Job"
              placeholderTextColor={currentColors.textSecondary}
              value={newIncome.label}
              onChangeText={(text) => setNewIncome({ ...newIncome, label: text })}
              editable={!saving && !isDeletingPerson}
            />
            
            <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
              Amount:
            </Text>
            <TextInput
              style={themedStyles.input}
              placeholder="0.00"
              placeholderTextColor={currentColors.textSecondary}
              value={newIncome.amount}
              onChangeText={(text) => setNewIncome({ ...newIncome, amount: text })}
              keyboardType="numeric"
              editable={!saving && !isDeletingPerson}
            />
            
            <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
              Frequency:
            </Text>
            <FrequencyPicker
              value={newIncome.frequency}
              onChange={(freq) => setNewIncome({ ...newIncome, frequency: freq as any })}
            />
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Button
                  text="Cancel"
                  onPress={() => {
                    setShowAddIncome(false);
                    setNewIncome({ amount: '', label: '', frequency: 'monthly' });
                  }}
                  style={[themedButtonStyles.outline, { marginTop: 0, borderColor: currentColors.income }]}
                  textStyle={{ color: currentColors.income }}
                  disabled={saving || isDeletingPerson}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  text={saving ? 'Adding...' : 'Add Income'}
                  onPress={handleAddIncome}
                  style={[themedButtonStyles.primary, { marginTop: 0, backgroundColor: (saving || isDeletingPerson) ? currentColors.textSecondary : currentColors.income }]}
                  disabled={saving || isDeletingPerson}
                />
              </View>
            </View>
          </View>
        )}

        {/* Income Sources */}
        <View style={themedStyles.section}>
          <View style={[themedStyles.row, { marginBottom: 12 }]}>
            <Text style={[themedStyles.subtitle, { marginBottom: 0 }]}>Income Sources</Text>
            <TouchableOpacity 
              onPress={() => setShowAddIncome(true)}
              disabled={saving || isDeletingPerson}
            >
              <Icon name="add-circle-outline" size={24} style={{ color: (saving || isDeletingPerson) ? currentColors.textSecondary : currentColors.income }} />
            </TouchableOpacity>
          </View>
          
          {person.income.length === 0 ? (
            <View style={themedStyles.card}>
              <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
                No income sources added
              </Text>
            </View>
          ) : (
            <View>
              <Text style={[themedStyles.textSecondary, { fontSize: 12, marginBottom: 8 }]}>
                Tap any income source to edit it
              </Text>
              {person.income.map((income) => {
                const isDeletingIncome = deletingIncomeId === income.id;
                
                return (
                  <TouchableOpacity
                    key={income.id}
                    style={themedStyles.card}
                    onPress={() => {
                      router.push({
                        pathname: '/edit-income',
                        params: { personId: person.id, incomeId: income.id }
                      });
                    }}
                    disabled={saving || isDeletingIncome || isDeletingPerson}
                    activeOpacity={0.7}
                  >
                    <View style={[themedStyles.row, { marginBottom: 8 }]}>
                      <View style={themedStyles.flex1}>
                        <Text style={[themedStyles.text, { fontWeight: '600' }]}>{income.label}</Text>
                        <Text style={themedStyles.textSecondary}>
                          {formatCurrency(income.amount)} • {income.frequency}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Icon name="pencil-outline" size={20} style={{ color: (saving || isDeletingIncome || isDeletingPerson) ? currentColors.textSecondary : currentColors.primary }} />
                        <TouchableOpacity 
                          onPress={(e) => {
                            e.stopPropagation(); // Prevent triggering the edit action
                            handleRemoveIncome(income.id, income.label);
                          }}
                          disabled={saving || isDeletingIncome || isDeletingPerson}
                        >
                          {isDeletingIncome ? (
                            <ActivityIndicator size="small" color={currentColors.error} />
                          ) : (
                            <Icon name="trash-outline" size={20} style={{ color: (saving || isDeletingPerson) ? currentColors.textSecondary : currentColors.error }} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={[themedStyles.row, { borderTopWidth: 1, borderTopColor: currentColors.border, paddingTop: 8 }]}>
                      <Text style={themedStyles.textSecondary}>
                        Monthly: {formatCurrency(calculateMonthlyAmount(income.amount, income.frequency))}
                      </Text>
                      <Text style={themedStyles.textSecondary}>
                        Tap to edit
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Delete Person Section */}
        <View style={themedStyles.section}>
          <Text style={[themedStyles.subtitle, { marginBottom: 12, color: currentColors.error }]}>
            Danger Zone
          </Text>
          
          <View style={[themedStyles.card, { backgroundColor: currentColors.error + '10', borderColor: currentColors.error + '30', borderWidth: 1 }]}>
            <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
              Delete Person
            </Text>
            <Text style={[themedStyles.textSecondary, { marginBottom: 16 }]}>
              This will permanently delete {person.name} and all their income sources and personal expenses. This action cannot be undone.
            </Text>
            
            <Button
              text={isDeletingPerson ? 'Deleting...' : 'Delete Person'}
              onPress={handleDeletePerson}
              style={[
                themedButtonStyles.primary, 
                { 
                  backgroundColor: (saving || isDeletingPerson) ? currentColors.textSecondary : currentColors.error,
                  borderColor: (saving || isDeletingPerson) ? currentColors.textSecondary : currentColors.error,
                  marginTop: 0 
                }
              ]}
              disabled={saving || isDeletingPerson}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
