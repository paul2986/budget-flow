
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { commonStyles, buttonStyles } from '../styles/commonStyles';
import { useBudgetData } from '../hooks/useBudgetData';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../hooks/useCurrency';
import { Person, Income } from '../types/budget';
import { 
  calculatePersonIncome, 
  calculateMonthlyAmount, 
  calculatePersonalExpenses,
  calculateHouseholdShare,
  calculateHouseholdExpenses 
} from '../utils/calculations';
import Button from '../components/Button';
import Icon from '../components/Icon';

export default function EditPersonScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { data, updatePerson, addIncome, removeIncome } = useBudgetData();
  const { currentColors } = useTheme();
  const { formatCurrency } = useCurrency();
  
  const [person, setPerson] = useState<Person | null>(null);
  const [personName, setPersonName] = useState('');
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [newIncome, setNewIncome] = useState({
    amount: '',
    label: '',
    frequency: 'monthly' as const,
  });

  useEffect(() => {
    console.log('EditPersonScreen: Looking for person with ID:', personId);
    console.log('EditPersonScreen: Available people:', data.people);
    
    const foundPerson = data.people.find(p => p.id === personId);
    if (foundPerson) {
      console.log('EditPersonScreen: Found person:', foundPerson);
      setPerson(foundPerson);
      setPersonName(foundPerson.name);
    } else {
      console.log('EditPersonScreen: Person not found');
      Alert.alert('Error', 'Person not found');
      router.back();
    }
  }, [personId, data.people]);

  const handleSavePerson = async () => {
    console.log('EditPersonScreen: Saving person...');
    
    if (!person || !personName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    try {
      const updatedPerson: Person = {
        ...person,
        name: personName.trim(),
      };

      console.log('EditPersonScreen: Updating person:', updatedPerson);
      await updatePerson(updatedPerson);
      console.log('EditPersonScreen: Person updated successfully');
      
      Alert.alert('Success', 'Person updated successfully!');
      router.back();
    } catch (error) {
      console.error('EditPersonScreen: Error updating person:', error);
      Alert.alert('Error', 'Failed to update person. Please try again.');
    }
  };

  const handleAddIncome = async () => {
    console.log('EditPersonScreen: Adding income...');
    
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
      await addIncome(person.id, income);
      
      setNewIncome({ amount: '', label: '', frequency: 'monthly' });
      setShowAddIncome(false);
      
      console.log('EditPersonScreen: Income added successfully');
      Alert.alert('Success', 'Income source added successfully!');
    } catch (error) {
      console.error('EditPersonScreen: Error adding income:', error);
      Alert.alert('Error', 'Failed to add income. Please try again.');
    }
  };

  const handleRemoveIncome = (incomeId: string, incomeLabel: string) => {
    if (!person) return;
    
    console.log('EditPersonScreen: Removing income:', incomeId, incomeLabel);
    
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
              console.log('EditPersonScreen: Calling removeIncome with:', person.id, incomeId);
              await removeIncome(person.id, incomeId);
              console.log('EditPersonScreen: Income removed successfully');
            } catch (error) {
              console.error('EditPersonScreen: Error removing income:', error);
              Alert.alert('Error', 'Failed to remove income. Please try again.');
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
      <View style={[commonStyles.container, commonStyles.centerContent, { backgroundColor: currentColors.background }]}>
        <Text style={[commonStyles.text, { color: currentColors.text }]}>Loading...</Text>
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
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} style={{ color: currentColors.text }} />
        </TouchableOpacity>
        <Text style={[commonStyles.headerTitle, { color: currentColors.text }]}>Edit Person</Text>
        <TouchableOpacity onPress={handleSavePerson}>
          <Icon name="checkmark" size={24} style={{ color: currentColors.primary }} />
        </TouchableOpacity>
      </View>

      <ScrollView style={commonStyles.content} contentContainerStyle={commonStyles.scrollContent}>
        {/* Person Details */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { color: currentColors.text }]}>Person Details</Text>
          
          <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
            <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600', color: currentColors.text }]}>
              Name:
            </Text>
            <TextInput
              style={[commonStyles.input, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border, color: currentColors.text }]}
              placeholder="Enter person's name"
              placeholderTextColor={currentColors.textSecondary}
              value={personName}
              onChangeText={setPersonName}
            />
          </View>
        </View>

        {/* Income Summary */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { color: currentColors.text }]}>Income Summary</Text>
          
          <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
            <View style={[commonStyles.row, { marginBottom: 8 }]}>
              <Text style={[commonStyles.text, { color: currentColors.text }]}>Monthly Income:</Text>
              <Text style={[commonStyles.text, { color: currentColors.income, fontWeight: '600' }]}>
                {formatCurrency(monthlyIncome)}
              </Text>
            </View>

            <View style={[commonStyles.row, { borderTopWidth: 1, borderTopColor: currentColors.border, paddingTop: 8 }]}>
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
              Add Income Source
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
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  text="Add Income"
                  onPress={handleAddIncome}
                  style={[buttonStyles.primary, { marginTop: 0, backgroundColor: currentColors.income }]}
                />
              </View>
            </View>
          </View>
        )}

        {/* Income Sources */}
        <View style={commonStyles.section}>
          <View style={[commonStyles.row, { marginBottom: 12 }]}>
            <Text style={[commonStyles.subtitle, { marginBottom: 0, color: currentColors.text }]}>Income Sources</Text>
            <TouchableOpacity onPress={() => setShowAddIncome(true)}>
              <Icon name="add-circle-outline" size={24} style={{ color: currentColors.income }} />
            </TouchableOpacity>
          </View>
          
          {person.income.length === 0 ? (
            <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
              <View style={commonStyles.centerContent}>
                <Icon name="wallet-outline" size={48} style={{ color: currentColors.textSecondary, marginBottom: 12 }} />
                <Text style={[commonStyles.textSecondary, { textAlign: 'center', color: currentColors.textSecondary }]}>
                  No income sources added yet.{'\n'}Tap the + button to add one.
                </Text>
              </View>
            </View>
          ) : (
            person.income.map((income) => (
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
                  >
                    <Icon name="trash-outline" size={20} style={{ color: currentColors.error }} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
