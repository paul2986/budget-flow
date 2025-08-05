
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import { useBudgetData } from '../hooks/useBudgetData';
import { Person, Income } from '../types/budget';
import { calculatePersonIncome, calculateMonthlyAmount } from '../utils/calculations';
import Button from '../components/Button';
import Icon from '../components/Icon';

export default function PeopleScreen() {
  const { data, addPerson, removePerson, addIncome, removeIncome } = useBudgetData();
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [newIncome, setNewIncome] = useState({
    amount: '',
    label: '',
    frequency: 'monthly' as const,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleAddPerson = async () => {
    console.log('Add person button pressed');
    console.log('New person name:', newPersonName);
    
    if (!newPersonName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    try {
      const person: Person = {
        id: `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newPersonName.trim(),
        income: [],
      };

      console.log('Adding new person:', person);
      await addPerson(person);
      console.log('Person added successfully');
      
      setNewPersonName('');
      setShowAddPerson(false);
      
      Alert.alert('Success', `${person.name} has been added successfully!`);
    } catch (error) {
      console.error('Error adding person:', error);
      Alert.alert('Error', 'Failed to add person. Please try again.');
    }
  };

  const handleRemovePerson = (person: Person) => {
    Alert.alert(
      'Remove Person',
      `Are you sure you want to remove ${person.name}? This will also remove all their income and personal expenses.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => removePerson(person.id)
        },
      ]
    );
  };

  const handleAddIncome = async () => {
    console.log('Add income button pressed');
    console.log('New income data:', newIncome);
    
    if (!selectedPersonId || !newIncome.amount || !newIncome.label.trim()) {
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
        personId: selectedPersonId,
      };

      console.log('Adding new income:', income);
      await addIncome(selectedPersonId, income);
      console.log('Income added successfully');
      
      setNewIncome({ amount: '', label: '', frequency: 'monthly' });
      setShowAddIncome(false);
      setSelectedPersonId(null);
      
      Alert.alert('Success', 'Income source added successfully!');
    } catch (error) {
      console.error('Error adding income:', error);
      Alert.alert('Error', 'Failed to add income. Please try again.');
    }
  };

  const handleRemoveIncome = (personId: string, incomeId: string, incomeLabel: string) => {
    Alert.alert(
      'Remove Income',
      `Are you sure you want to remove "${incomeLabel}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => removeIncome(personId, incomeId)
        },
      ]
    );
  };

  const FrequencyPicker = ({ value, onChange }: { value: string, onChange: (value: string) => void }) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
      {['daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
        <TouchableOpacity
          key={freq}
          style={[
            commonStyles.badge,
            { 
              backgroundColor: value === freq ? colors.primary : colors.border,
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
            { color: value === freq ? colors.backgroundAlt : colors.text }
          ]}>
            {freq.charAt(0).toUpperCase() + freq.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} style={{ color: colors.text }} />
        </TouchableOpacity>
        <Text style={commonStyles.headerTitle}>Manage People</Text>
        <TouchableOpacity onPress={() => setShowAddPerson(true)}>
          <Icon name="add" size={24} style={{ color: colors.text }} />
        </TouchableOpacity>
      </View>

      <ScrollView style={commonStyles.content} contentContainerStyle={commonStyles.scrollContent}>
        {/* Prominent Add Person Button */}
        {data.people.length === 0 && !showAddPerson && (
          <View style={commonStyles.card}>
            <View style={commonStyles.centerContent}>
              <Icon name="people-outline" size={48} style={{ color: colors.primary, marginBottom: 12 }} />
              <Text style={[commonStyles.subtitle, { textAlign: 'center', marginBottom: 8 }]}>
                No People Added Yet
              </Text>
              <Text style={[commonStyles.textSecondary, { textAlign: 'center', marginBottom: 16 }]}>
                Add people to track personal expenses and income
              </Text>
              <Button
                text="Add Your First Person"
                onPress={() => setShowAddPerson(true)}
                style={[buttonStyles.primary, { backgroundColor: colors.primary }]}
              />
            </View>
          </View>
        )}

        {/* Quick Add Person Button for existing users */}
        {data.people.length > 0 && !showAddPerson && (
          <View style={[commonStyles.card, { backgroundColor: colors.primary + '10' }]}>
            <View style={[commonStyles.row, { alignItems: 'center' }]}>
              <View style={commonStyles.flex1}>
                <Text style={[commonStyles.text, { fontWeight: '600' }]}>
                  Add Another Person
                </Text>
                <Text style={commonStyles.textSecondary}>
                  Track expenses for family members or roommates
                </Text>
              </View>
              <Button
                text="Add Person"
                onPress={() => setShowAddPerson(true)}
                style={[buttonStyles.primary, { backgroundColor: colors.primary, marginTop: 0 }]}
              />
            </View>
          </View>
        )}

        {/* Add Person Form */}
        {showAddPerson && (
          <View style={[commonStyles.card, { backgroundColor: colors.primary + '10' }]}>
            <Text style={[commonStyles.subtitle, { marginBottom: 12 }]}>Add New Person</Text>
            
            <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
              Name:
            </Text>
            <TextInput
              style={commonStyles.input}
              placeholder="Enter person's name"
              value={newPersonName}
              onChangeText={setNewPersonName}
              autoFocus
            />
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Button
                  text="Cancel"
                  onPress={() => {
                    setShowAddPerson(false);
                    setNewPersonName('');
                  }}
                  style={[buttonStyles.outline, { marginTop: 0 }]}
                  textStyle={{ color: colors.primary }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  text="Add Person"
                  onPress={handleAddPerson}
                  style={[buttonStyles.primary, { marginTop: 0 }]}
                />
              </View>
            </View>
          </View>
        )}

        {/* Add Income Form */}
        {showAddIncome && selectedPersonId && (
          <View style={[commonStyles.card, { backgroundColor: colors.income + '10' }]}>
            <Text style={[commonStyles.subtitle, { marginBottom: 12 }]}>
              Add Income for {data.people.find(p => p.id === selectedPersonId)?.name}
            </Text>
            
            <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
              Income Source:
            </Text>
            <TextInput
              style={commonStyles.input}
              placeholder="e.g., Salary, Freelance, Side Job"
              value={newIncome.label}
              onChangeText={(text) => setNewIncome({ ...newIncome, label: text })}
            />
            
            <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
              Amount:
            </Text>
            <TextInput
              style={commonStyles.input}
              placeholder="0.00"
              value={newIncome.amount}
              onChangeText={(text) => setNewIncome({ ...newIncome, amount: text })}
              keyboardType="numeric"
            />
            
            <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
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
                    setSelectedPersonId(null);
                    setNewIncome({ amount: '', label: '', frequency: 'monthly' });
                  }}
                  style={[buttonStyles.outline, { marginTop: 0 }]}
                  textStyle={{ color: colors.income }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  text="Add Income"
                  onPress={handleAddIncome}
                  style={[buttonStyles.primary, { marginTop: 0, backgroundColor: colors.income }]}
                />
              </View>
            </View>
          </View>
        )}

        {/* People List */}
        {data.people.length > 0 && (
          data.people.map((person) => {
            const totalIncome = calculatePersonIncome(person);
            const monthlyIncome = calculateMonthlyAmount(totalIncome, 'yearly');
            
            return (
              <View key={person.id} style={commonStyles.card}>
                <View style={[commonStyles.row, { marginBottom: 12 }]}>
                  <Text style={[commonStyles.subtitle, { marginBottom: 0 }]}>
                    {person.name}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemovePerson(person)}>
                    <Icon name="trash-outline" size={20} style={{ color: colors.error }} />
                  </TouchableOpacity>
                </View>
                
                <View style={[commonStyles.row, { marginBottom: 12 }]}>
                  <Text style={commonStyles.text}>Monthly Income:</Text>
                  <Text style={[commonStyles.text, { color: colors.income, fontWeight: '600' }]}>
                    {formatCurrency(monthlyIncome)}
                  </Text>
                </View>
                
                {/* Income Sources */}
                <View style={{ marginBottom: 12 }}>
                  <View style={[commonStyles.row, { marginBottom: 8 }]}>
                    <Text style={[commonStyles.text, { fontWeight: '600' }]}>Income Sources:</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        setSelectedPersonId(person.id);
                        setShowAddIncome(true);
                      }}
                    >
                      <Icon name="add-circle-outline" size={20} style={{ color: colors.income }} />
                    </TouchableOpacity>
                  </View>
                  
                  {person.income.length === 0 ? (
                    <Text style={commonStyles.textSecondary}>No income sources added</Text>
                  ) : (
                    person.income.map((income) => (
                      <View key={income.id} style={[commonStyles.row, { marginBottom: 4 }]}>
                        <View style={commonStyles.flex1}>
                          <Text style={commonStyles.text}>{income.label}</Text>
                          <Text style={commonStyles.textSecondary}>
                            {formatCurrency(income.amount)} • {income.frequency}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          onPress={() => handleRemoveIncome(person.id, income.id, income.label)}
                        >
                          <Icon name="close-circle-outline" size={16} style={{ color: colors.error }} />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
