
import { useState, useEffect } from 'react';
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
import { commonStyles, buttonStyles } from '../styles/commonStyles';
import { Person, Income } from '../types/budget';
import { useTheme } from '../hooks/useTheme';

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
  const params = useLocalSearchParams<{ personId: string }>();
  const personId = params.personId;
  
  const { data, updatePerson, addIncome, removeIncome, saving, refreshData } = useBudgetData();

  useEffect(() => {
    if (personId && data.people.length > 0) {
      const foundPerson = data.people.find(p => p.id === personId);
      console.log('EditPersonScreen: Found person:', foundPerson);
      setPerson(foundPerson || null);
    }
  }, [personId, data.people]);

  // Force refresh data when component mounts
  useEffect(() => {
    console.log('EditPersonScreen: Component mounted, refreshing data...');
    refreshData();
  }, []);

  const handleSavePerson = async () => {
    if (!person) return;

    try {
      const result = await updatePerson(person);
      if (result.success) {
        // Force refresh to ensure UI updates
        await refreshData();
        router.back();
      } else {
        Alert.alert('Error', 'Failed to update person. Please try again.');
      }
    } catch (error) {
      console.error('EditPersonScreen: Error updating person:', error);
      Alert.alert('Error', 'Failed to update person. Please try again.');
    }
  };

  const handleAddIncome = async () => {
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

      const result = await addIncome(person.id, income);
      if (result.success) {
        setNewIncome({ amount: '', label: '', frequency: 'monthly' });
        setShowAddIncome(false);
        // Force refresh to ensure UI updates
        await refreshData();
      } else {
        Alert.alert('Error', 'Failed to add income. Please try again.');
      }
    } catch (error) {
      console.error('EditPersonScreen: Error adding income:', error);
      Alert.alert('Error', 'Failed to add income. Please try again.');
    }
  };

  const handleRemoveIncome = (incomeId: string, incomeLabel: string) => {
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
              
              const result = await removeIncome(person.id, incomeId);
              if (result.success) {
                // Force refresh to ensure UI updates
                await refreshData();
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
  };

  const calculateRemainingIncome = () => {
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
  };

  const FrequencyPicker = ({ value, onChange }: { value: string, onChange: (value: string) => void }) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
      {['daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
        <TouchableOpacity
          key={freq}
          style={[
            commonStyles.badge,
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
            commonStyles.badgeText,
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
      <View style={[commonStyles.container, { backgroundColor: currentColors.background }]}>
        <View style={[commonStyles.header, { backgroundColor: currentColors.backgroundAlt, borderBottomColor: currentColors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="arrow-back" size={24} style={{ color: currentColors.text }} />
          </TouchableOpacity>
          <Text style={[commonStyles.headerTitle, { color: currentColors.text }]}>Edit Person</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={[commonStyles.centerContent, { flex: 1 }]}>
          <Text style={[commonStyles.text, { color: currentColors.textSecondary }]}>Person not found</Text>
        </View>
      </View>
    );
  }

  const totalIncome = calculatePersonIncome(person);
  const monthlyIncome = calculateMonthlyAmount(totalIncome, 'yearly');
  const remainingIncome = calculateRemainingIncome();
  const monthlyRemaining = calculateMonthlyAmount(remainingIncome, 'yearly');

  return (
    <View style={[commonStyles.container, { backgroundColor: currentColors.background }]}>
      <View style={[commonStyles.header, { backgroundColor: currentColors.backgroundAlt, borderBottomColor: currentColors.border }]}>
        <TouchableOpacity onPress={() => router.back()} disabled={saving}>
          <Icon name="arrow-back" size={24} style={{ color: currentColors.text }} />
        </TouchableOpacity>
        <Text style={[commonStyles.headerTitle, { color: currentColors.text }]}>Edit Person</Text>
        <TouchableOpacity onPress={handleSavePerson} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={currentColors.primary} />
          ) : (
            <Icon name="checkmark" size={24} style={{ color: currentColors.primary }} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={commonStyles.content} contentContainerStyle={commonStyles.scrollContent}>
        {/* Person Details */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { color: currentColors.text, marginBottom: 12 }]}>Person Details</Text>
          
          <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600', color: currentColors.text }]}>
            Name:
          </Text>
          <TextInput
            style={[commonStyles.input, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border, color: currentColors.text }]}
            value={person.name}
            onChangeText={(text) => setPerson({ ...person, name: text })}
            placeholder="Enter person's name"
            placeholderTextColor={currentColors.textSecondary}
            editable={!saving}
          />
        </View>

        {/* Income Summary */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { color: currentColors.text, marginBottom: 12 }]}>Income Summary</Text>
          
          <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
            <View style={[commonStyles.row, { marginBottom: 8 }]}>
              <Text style={[commonStyles.text, { color: currentColors.text }]}>Monthly Income:</Text>
              <Text style={[commonStyles.text, { color: currentColors.income, fontWeight: '600' }]}>
                {formatCurrency(monthlyIncome)}
              </Text>
            </View>

            <View style={[commonStyles.row]}>
              <Text style={[commonStyles.text, { fontWeight: '600', color: currentColors.text }]}>Remaining Income:</Text>
              <Text style={[
                commonStyles.text, 
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
          <View style={[commonStyles.card, { backgroundColor: currentColors.income + '10', borderColor: currentColors.border }]}>
            <Text style={[commonStyles.subtitle, { marginBottom: 12, color: currentColors.text }]}>
              Add Income for {person.name}
            </Text>
            
            <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600', color: currentColors.text }]}>
              Income Source:
            </Text>
            <TextInput
              style={[commonStyles.input, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border, color: currentColors.text }]}
              placeholder="e.g., Salary, Freelance, Side Job"
              placeholderTextColor={currentColors.textSecondary}
              value={newIncome.label}
              onChangeText={(text) => setNewIncome({ ...newIncome, label: text })}
              editable={!saving}
            />
            
            <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600', color: currentColors.text }]}>
              Amount:
            </Text>
            <TextInput
              style={[commonStyles.input, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border, color: currentColors.text }]}
              placeholder="0.00"
              placeholderTextColor={currentColors.textSecondary}
              value={newIncome.amount}
              onChangeText={(text) => setNewIncome({ ...newIncome, amount: text })}
              keyboardType="numeric"
              editable={!saving}
            />
            
            <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600', color: currentColors.text }]}>
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
                  style={[buttonStyles.outline, { marginTop: 0, borderColor: currentColors.income }]}
                  textStyle={{ color: currentColors.income }}
                  disabled={saving}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  text={saving ? 'Adding...' : 'Add Income'}
                  onPress={handleAddIncome}
                  style={[buttonStyles.primary, { marginTop: 0, backgroundColor: saving ? currentColors.textSecondary : currentColors.income }]}
                  disabled={saving}
                />
              </View>
            </View>
          </View>
        )}

        {/* Income Sources */}
        <View style={commonStyles.section}>
          <View style={[commonStyles.row, { marginBottom: 12 }]}>
            <Text style={[commonStyles.subtitle, { marginBottom: 0, color: currentColors.text }]}>Income Sources</Text>
            <TouchableOpacity 
              onPress={() => setShowAddIncome(true)}
              disabled={saving}
            >
              <Icon name="add-circle-outline" size={24} style={{ color: saving ? currentColors.textSecondary : currentColors.income }} />
            </TouchableOpacity>
          </View>
          
          {person.income.length === 0 ? (
            <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
              <Text style={[commonStyles.textSecondary, { color: currentColors.textSecondary, textAlign: 'center' }]}>
                No income sources added
              </Text>
            </View>
          ) : (
            person.income.map((income) => {
              const isDeletingIncome = deletingIncomeId === income.id;
              
              return (
                <View key={income.id} style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
                  <View style={[commonStyles.row, { marginBottom: 8 }]}>
                    <View style={commonStyles.flex1}>
                      <Text style={[commonStyles.text, { fontWeight: '600', color: currentColors.text }]}>{income.label}</Text>
                      <Text style={[commonStyles.textSecondary, { color: currentColors.textSecondary }]}>
                        {formatCurrency(income.amount)} • {income.frequency}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleRemoveIncome(income.id, income.label)}
                      disabled={saving || isDeletingIncome}
                    >
                      {isDeletingIncome ? (
                        <ActivityIndicator size="small" color={currentColors.error} />
                      ) : (
                        <Icon name="trash-outline" size={20} style={{ color: saving ? currentColors.textSecondary : currentColors.error }} />
                      )}
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={[commonStyles.textSecondary, { color: currentColors.textSecondary }]}>
                    Monthly: {formatCurrency(calculateMonthlyAmount(income.amount, income.frequency))}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
