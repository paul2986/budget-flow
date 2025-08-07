
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useThemedStyles } from '../hooks/useThemedStyles';
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
import StandardHeader from '../components/StandardHeader';

export default function PeopleScreen() {
  const { data, addPerson, removePerson, addIncome, removeIncome, updateIncome, saving, refreshData } = useBudgetData();
  const { currentColors } = useTheme();
  const { themedStyles, themedButtonStyles } = useThemedStyles();
  const { formatCurrency } = useCurrency();
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [deletingPersonId, setDeletingPersonId] = useState<string | null>(null);
  const [deletingIncomeId, setDeletingIncomeId] = useState<string | null>(null);
  const [newIncome, setNewIncome] = useState({
    amount: '',
    label: '',
    frequency: 'monthly' as const,
  });

  // Force refresh data when component mounts
  useEffect(() => {
    console.log('PeopleScreen: Component mounted, refreshing data...');
    refreshData();
  }, [refreshData]);

  // Refresh data when screen becomes focused (e.g., after editing a person)
  useFocusEffect(
    useCallback(() => {
      console.log('PeopleScreen: Screen focused, refreshing data...');
      refreshData();
    }, [refreshData])
  );

  const handleAddPerson = useCallback(async () => {
    console.log('PeopleScreen: Add person button pressed');
    console.log('PeopleScreen: New person name:', newPersonName);
    
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

      console.log('PeopleScreen: Adding new person:', person);
      const result = await addPerson(person);
      console.log('PeopleScreen: Person added result:', result);
      
      if (result.success) {
        setNewPersonName('');
        setShowAddPerson(false);
        console.log('PeopleScreen: Person added successfully, staying on people screen');
        
        // Just refresh the data to show the new person, don't navigate away
        await refreshData(true);
      } else {
        Alert.alert('Error', 'Failed to add person. Please try again.');
      }
    } catch (error) {
      console.error('PeopleScreen: Error adding person:', error);
      Alert.alert('Error', 'Failed to add person. Please try again.');
    }
  }, [newPersonName, addPerson, refreshData]);

  const handleRemovePerson = useCallback((person: Person) => {
    console.log('PeopleScreen: Attempting to remove person:', person);
    
    // Prevent multiple deletion attempts
    if (deletingPersonId === person.id || saving) {
      console.log('PeopleScreen: Deletion already in progress, ignoring');
      return;
    }

    Alert.alert(
      'Remove Person',
      `Are you sure you want to remove ${person.name}? This will also remove all their income and personal expenses.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('PeopleScreen: Starting person removal process');
              setDeletingPersonId(person.id);
              
              const result = await removePerson(person.id);
              console.log('PeopleScreen: Person removal result:', result);
              
              if (result.success) {
                console.log('PeopleScreen: Person removed successfully');
              } else {
                console.error('PeopleScreen: Person removal failed:', result.error);
                Alert.alert('Error', 'Failed to remove person. Please try again.');
              }
            } catch (error) {
              console.error('PeopleScreen: Error removing person:', error);
              Alert.alert('Error', 'Failed to remove person. Please try again.');
            } finally {
              setDeletingPersonId(null);
            }
          }
        },
      ]
    );
  }, [deletingPersonId, saving, removePerson]);

  const handleEditPerson = useCallback((person: Person) => {
    console.log('PeopleScreen: Navigating to edit person:', person);
    
    // Verify the person exists in current data before navigating
    const personExists = data.people.find(p => p.id === person.id);
    if (!personExists) {
      console.error('PeopleScreen: Person not found in current data, refreshing...');
      Alert.alert('Error', 'Person not found. Please try again.');
      refreshData(true);
      return;
    }
    
    router.push({
      pathname: '/edit-person',
      params: { personId: person.id, origin: 'people' }
    });
  }, [data.people, refreshData]);

  const handleAddIncome = useCallback(async () => {
    console.log('PeopleScreen: Add income button pressed');
    console.log('PeopleScreen: New income data:', newIncome);
    
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

      console.log('PeopleScreen: Adding new income:', income);
      const result = await addIncome(selectedPersonId, income);
      console.log('PeopleScreen: Income added result:', result);
      
      if (result.success) {
        setNewIncome({ amount: '', label: '', frequency: 'monthly' });
        setShowAddIncome(false);
        setSelectedPersonId(null);
        console.log('PeopleScreen: Income added successfully');
      } else {
        Alert.alert('Error', 'Failed to add income. Please try again.');
      }
    } catch (error) {
      console.error('PeopleScreen: Error adding income:', error);
      Alert.alert('Error', 'Failed to add income. Please try again.');
    }
  }, [selectedPersonId, newIncome, addIncome]);

  const handleRemoveIncome = useCallback((personId: string, incomeId: string, incomeLabel: string) => {
    console.log('PeopleScreen: Attempting to remove income:', { personId, incomeId, incomeLabel });
    
    // Prevent multiple deletion attempts
    if (deletingIncomeId === incomeId || saving) {
      console.log('PeopleScreen: Income deletion already in progress, ignoring');
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
              console.log('PeopleScreen: Starting income removal process');
              setDeletingIncomeId(incomeId);
              
              const result = await removeIncome(personId, incomeId);
              console.log('PeopleScreen: Income removal result:', result);
              
              if (result.success) {
                console.log('PeopleScreen: Income removed successfully');
              } else {
                console.error('PeopleScreen: Income removal failed:', result.error);
                Alert.alert('Error', 'Failed to remove income. Please try again.');
              }
            } catch (error) {
              console.error('PeopleScreen: Error removing income:', error);
              Alert.alert('Error', 'Failed to remove income. Please try again.');
            } finally {
              setDeletingIncomeId(null);
            }
          }
        },
      ]
    );
  }, [deletingIncomeId, saving, removeIncome]);

  const calculateRemainingIncome = useCallback((person: Person) => {
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
  }, [data.expenses, data.people, data.householdSettings.distributionMethod]);

  const handleNavigateToAddPerson = useCallback(() => {
    setShowAddPerson(true);
  }, []);

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

  return (
    <View style={themedStyles.container}>
      <StandardHeader
        title="People"
        showLeftIcon={false}
        onRightPress={handleNavigateToAddPerson}
        loading={saving}
      />

      <ScrollView style={themedStyles.content} contentContainerStyle={themedStyles.scrollContent}>
        {/* Prominent Add Person Button - Only show when no people exist */}
        {data.people.length === 0 && !showAddPerson && (
          <View style={themedStyles.card}>
            <View style={themedStyles.centerContent}>
              <Icon name="people-outline" size={48} style={{ color: currentColors.primary, marginBottom: 12 }} />
              <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 8 }]}>
                No People Added Yet
              </Text>
              <Text style={[themedStyles.textSecondary, { textAlign: 'center', marginBottom: 16 }]}>
                Add people to track personal expenses and income
              </Text>
              <Button
                text="Add Your First Person"
                onPress={() => setShowAddPerson(true)}
                style={[themedButtonStyles.primary, { backgroundColor: currentColors.primary }]}
                disabled={saving}
              />
            </View>
          </View>
        )}

        {/* Add Person Form */}
        {showAddPerson && (
          <View style={[themedStyles.card, { backgroundColor: currentColors.primary + '10' }]}>
            <Text style={[themedStyles.subtitle, { marginBottom: 12 }]}>Add New Person</Text>
            
            <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
              Name:
            </Text>
            <TextInput
              style={themedStyles.input}
              placeholder="Enter person's name"
              placeholderTextColor={currentColors.textSecondary}
              value={newPersonName}
              onChangeText={setNewPersonName}
              autoFocus
              editable={!saving}
            />
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Button
                  text="Cancel"
                  onPress={() => {
                    setShowAddPerson(false);
                    setNewPersonName('');
                  }}
                  style={[themedButtonStyles.outline, { marginTop: 0, borderColor: currentColors.primary }]}
                  textStyle={{ color: currentColors.primary }}
                  disabled={saving}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  text={saving ? 'Adding...' : 'Add Person'}
                  onPress={handleAddPerson}
                  style={[themedButtonStyles.primary, { marginTop: 0, backgroundColor: saving ? currentColors.textSecondary : currentColors.primary }]}
                  disabled={saving}
                />
              </View>
            </View>
          </View>
        )}

        {/* Add Income Form */}
        {showAddIncome && selectedPersonId && (
          <View style={[themedStyles.card, { backgroundColor: currentColors.income + '10' }]}>
            <Text style={[themedStyles.subtitle, { marginBottom: 12 }]}>
              Add Income for {data.people.find(p => p.id === selectedPersonId)?.name}
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
                    setSelectedPersonId(null);
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

        {/* People List */}
        {data.people.length > 0 && (
          data.people.map((person) => {
            const totalIncome = calculatePersonIncome(person);
            const monthlyIncome = calculateMonthlyAmount(totalIncome, 'yearly');
            const remainingIncome = calculateRemainingIncome(person);
            const monthlyRemaining = calculateMonthlyAmount(remainingIncome, 'yearly');
            const isDeleting = deletingPersonId === person.id;
            
            return (
              <TouchableOpacity
                key={person.id}
                style={[
                  themedStyles.card, 
                  { 
                    opacity: isDeleting ? 0.6 : 1,
                  }
                ]}
                onPress={() => handleEditPerson(person)}
                activeOpacity={0.7}
                disabled={saving || isDeleting}
              >
                <View style={[themedStyles.row, { marginBottom: 12 }]}>
                  <Text style={[themedStyles.subtitle, { marginBottom: 0 }]}>
                    {person.name}
                  </Text>
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation(); // Prevent triggering the edit action
                      console.log('PeopleScreen: Delete button pressed for person:', person.id, person.name);
                      handleRemovePerson(person);
                    }}
                    disabled={saving || isDeleting}
                    style={{
                      padding: 4,
                      borderRadius: 12,
                      backgroundColor: currentColors.error + '20',
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
                      <Icon name="trash-outline" size={16} style={{ color: saving ? currentColors.textSecondary : currentColors.error }} />
                    )}
                  </TouchableOpacity>
                </View>
                
                <View style={[themedStyles.row, { marginBottom: 8 }]}>
                  <Text style={themedStyles.text}>Monthly Income:</Text>
                  <Text style={[themedStyles.text, { color: currentColors.income, fontWeight: '600' }]}>
                    {formatCurrency(monthlyIncome)}
                  </Text>
                </View>

                <View style={[themedStyles.row, { marginBottom: 12 }]}>
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
                
                {/* Income Sources */}
                <View style={{ marginBottom: 12 }}>
                  <View style={[themedStyles.row, { marginBottom: 8 }]}>
                    <Text style={[themedStyles.text, { fontWeight: '600' }]}>Income Sources:</Text>
                    <TouchableOpacity 
                      onPress={(e) => {
                        e.stopPropagation(); // Prevent triggering the edit action
                        setSelectedPersonId(person.id);
                        setShowAddIncome(true);
                      }}
                      disabled={saving || isDeleting}
                    >
                      <Icon name="add-circle-outline" size={20} style={{ color: saving || isDeleting ? currentColors.textSecondary : currentColors.income }} />
                    </TouchableOpacity>
                  </View>
                  
                  {person.income.length === 0 ? (
                    <Text style={themedStyles.textSecondary}>No income sources added</Text>
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
                            style={[themedStyles.row, { marginBottom: 4, paddingVertical: 4 }]}
                            onPress={(e) => {
                              e.stopPropagation(); // Prevent triggering the edit person action
                              router.push({
                                pathname: '/edit-income',
                                params: { personId: person.id, incomeId: income.id }
                              });
                            }}
                            disabled={saving || isDeletingIncome}
                            activeOpacity={0.7}
                          >
                            <View style={themedStyles.flex1}>
                              <Text style={themedStyles.text}>{income.label}</Text>
                              <Text style={themedStyles.textSecondary}>
                                {formatCurrency(income.amount)} • {income.frequency}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Icon name="pencil-outline" size={16} style={{ color: saving || isDeletingIncome ? currentColors.textSecondary : currentColors.primary }} />
                              <TouchableOpacity 
                                onPress={(e) => {
                                  e.stopPropagation(); // Prevent triggering the edit action
                                  console.log('PeopleScreen: Delete income button pressed:', income.id, income.label);
                                  handleRemoveIncome(person.id, income.id, income.label);
                                }}
                                disabled={saving || isDeletingIncome}
                                style={{
                                  padding: 2,
                                  borderRadius: 8,
                                  backgroundColor: currentColors.error + '20',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minWidth: 20,
                                  minHeight: 20,
                                }}
                                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                              >
                                {isDeletingIncome ? (
                                  <ActivityIndicator size="small" color={currentColors.error} />
                                ) : (
                                  <Icon name="close-circle-outline" size={14} style={{ color: saving ? currentColors.textSecondary : currentColors.error }} />
                                )}
                              </TouchableOpacity>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>

                <View style={[themedStyles.row, { borderTopWidth: 1, borderTopColor: currentColors.border, paddingTop: 8 }]}>
                  <Text style={themedStyles.textSecondary}>
                    {isDeleting ? 'Deleting...' : 'Tap to edit this person'}
                  </Text>
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={currentColors.textSecondary} />
                  ) : (
                    <Icon name="chevron-forward-outline" size={16} style={{ color: currentColors.textSecondary }} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
