
import { useState, useEffect, useCallback } from 'react';
import { 
  calculatePersonIncome, 
  calculateMonthlyAmount, 
  calculatePersonalExpenses,
  calculateHouseholdShare,
  calculateHouseholdExpenses 
} from '../utils/calculations';
import { useBudgetData } from '../hooks/useBudgetData';
import Button from '../components/Button';
import { router, useLocalSearchParams } from 'expo-router';
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
  
  const { formatCurrency } = useCurrency();
  const { currentColors } = useTheme();
  const { themedStyles, themedButtonStyles } = useThemedStyles();
  const params = useLocalSearchParams<{ personId: string }>();
  const personId = params.personId;
  
  const { data, updatePerson, addIncome, removeIncome, updateIncome, saving, refreshData } = useBudgetData();

  // Update person state whenever data changes - FIXED: Removed 'person' from dependencies
  useEffect(() => {
    console.log('EditPersonScreen: useEffect triggered');
    console.log('EditPersonScreen: personId:', personId);
    console.log('EditPersonScreen: data.people:', data.people);
    
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
      console.log('EditPersonScreen: No personId or empty people array');
      setPerson(null);
    }
  }, [personId, data.people]); // FIXED: Removed data.expenses and person from dependencies

  // Force refresh data when component mounts
  useEffect(() => {
    console.log('EditPersonScreen: Component mounted, refreshing data...');
    refreshData();
  }, [refreshData]);

  const handleSavePerson = useCallback(async () => {
    if (!person) return;

    try {
      console.log('EditPersonScreen: Saving person:', person);
      const result = await updatePerson(person);
      if (result.success) {
        console.log('EditPersonScreen: Person saved successfully, navigating to people page');
        router.replace('/people');
      } else {
        Alert.alert('Error', 'Failed to update person. Please try again.');
      }
    } catch (error) {
      console.error('EditPersonScreen: Error updating person:', error);
      Alert.alert('Error', 'Failed to update person. Please try again.');
    }
  }, [person, updatePerson]);

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

  if (!person) {
    return (
      <View style={themedStyles.container}>
        <StandardHeader
          title="Edit Person"
          onLeftPress={handleGoBack}
          showRightIcon={false}
        />
        <View style={[themedStyles.centerContent, { flex: 1 }]}>
          <Text style={themedStyles.textSecondary}>Person not found</Text>
          <Text style={[themedStyles.textSecondary, { marginTop: 8, textAlign: 'center' }]}>
            The person you're trying to edit could not be found. They may have been deleted.
          </Text>
          <TouchableOpacity 
            style={[themedButtonStyles.primary, { backgroundColor: currentColors.primary, marginTop: 16 }]}
            onPress={() => router.replace('/people')}
          >
            <Text style={[themedStyles.text, { color: currentColors.backgroundAlt }]}>
              Go Back to People
            </Text>
          </TouchableOpacity>
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
        loading={saving}
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
            editable={!saving}
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
              editable={!saving}
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
              editable={!saving}
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
                  disabled={saving}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  text={saving ? 'Adding...' : 'Add Income'}
                  onPress={handleAddIncome}
                  style={[themedButtonStyles.primary, { marginTop: 0, backgroundColor: saving ? currentColors.textSecondary : currentColors.income }]}
                  disabled={saving}
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
              disabled={saving}
            >
              <Icon name="add-circle-outline" size={24} style={{ color: saving ? currentColors.textSecondary : currentColors.income }} />
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
                    disabled={saving || isDeletingIncome}
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
                        <Icon name="pencil-outline" size={20} style={{ color: saving || isDeletingIncome ? currentColors.textSecondary : currentColors.primary }} />
                        <TouchableOpacity 
                          onPress={(e) => {
                            e.stopPropagation(); // Prevent triggering the edit action
                            handleRemoveIncome(income.id, income.label);
                          }}
                          disabled={saving || isDeletingIncome}
                        >
                          {isDeletingIncome ? (
                            <ActivityIndicator size="small" color={currentColors.error} />
                          ) : (
                            <Icon name="trash-outline" size={20} style={{ color: saving ? currentColors.textSecondary : currentColors.error }} />
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
      </ScrollView>
    </View>
  );
}
