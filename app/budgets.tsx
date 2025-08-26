
import { useToast } from '../hooks/useToast';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useBudgetData } from '../hooks/useBudgetData';
import { router, useFocusEffect } from 'expo-router';
import { useBudgetLock } from '../hooks/useBudgetLock';
import StandardHeader from '../components/StandardHeader';
import { useCallback, useMemo, useState } from 'react';
import Button from '../components/Button';
import { useTheme } from '../hooks/useTheme';
import { Budget } from '../types/budget';
import { useThemedStyles } from '../hooks/useThemedStyles';
import Icon from '../components/Icon';

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function BudgetsScreen() {
  const { appData, activeBudget, addBudget, renameBudget, deleteBudget, duplicateBudget, setActiveBudget, refreshData } = useBudgetData();
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();
  const { showToast } = useToast();
  const { isLocked } = useBudgetLock();
  
  const [newBudgetName, setNewBudgetName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [dropdownBudgetId, setDropdownBudgetId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('BudgetsScreen: Screen focused, refreshing data');
      refreshData(true);
    }, [refreshData])
  );

  const budgets = useMemo(() => {
    return appData.budgets || [];
  }, [appData.budgets]);

  const handleCreateBudget = useCallback(async () => {
    if (!newBudgetName.trim()) {
      showToast('Please enter a budget name', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const result = await addBudget(newBudgetName.trim());
      if (result.success) {
        showToast('Budget created successfully', 'success');
        setNewBudgetName('');
        setShowCreateModal(false);
      } else {
        showToast(result.error?.message || 'Failed to create budget', 'error');
      }
    } catch (error) {
      console.error('Error creating budget:', error);
      showToast('Failed to create budget', 'error');
    } finally {
      setIsCreating(false);
    }
  }, [newBudgetName, addBudget, showToast]);

  const handleRenameBudget = useCallback(async (budgetId: string) => {
    if (!editingName.trim()) {
      showToast('Please enter a budget name', 'error');
      return;
    }

    try {
      const result = await renameBudget(budgetId, editingName.trim());
      if (result.success) {
        showToast('Budget renamed successfully', 'success');
        setEditingBudgetId(null);
        setEditingName('');
      } else {
        showToast(result.error?.message || 'Failed to rename budget', 'error');
      }
    } catch (error) {
      console.error('Error renaming budget:', error);
      showToast('Failed to rename budget', 'error');
    }
  }, [editingName, renameBudget, showToast]);

  const handleDeleteBudget = useCallback(async (budgetId: string, budgetName: string) => {
    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete "${budgetName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteBudget(budgetId);
              if (result.success) {
                showToast('Budget deleted successfully', 'success');
              } else {
                showToast(result.error?.message || 'Failed to delete budget', 'error');
              }
            } catch (error) {
              console.error('Error deleting budget:', error);
              showToast('Failed to delete budget', 'error');
            }
          },
        },
      ]
    );
  }, [deleteBudget, showToast]);

  const handleDuplicateBudget = useCallback(async (budgetId: string, budgetName: string) => {
    try {
      const result = await duplicateBudget(budgetId, `${budgetName} (Copy)`);
      if (result.success) {
        showToast('Budget duplicated successfully', 'success');
      } else {
        showToast(result.error?.message || 'Failed to duplicate budget', 'error');
      }
    } catch (error) {
      console.error('Error duplicating budget:', error);
      showToast('Failed to duplicate budget', 'error');
    }
  }, [duplicateBudget, showToast]);

  const handleSetActiveBudget = useCallback(async (budgetId: string) => {
    try {
      const result = await setActiveBudget(budgetId);
      if (result.success) {
        showToast('Active budget changed', 'success');
      } else {
        showToast(result.error?.message || 'Failed to set active budget', 'error');
      }
    } catch (error) {
      console.error('Error setting active budget:', error);
      showToast('Failed to set active budget', 'error');
    }
  }, [setActiveBudget, showToast]);

  const DropdownMenu = ({ budget }: { budget: Budget }) => {
    const isActive = activeBudget?.id === budget.id;
    
    return (
      <View style={[
        themedStyles.card,
        {
          position: 'absolute',
          top: 40,
          right: 0,
          zIndex: 1000,
          minWidth: 200,
          backgroundColor: currentColors.backgroundAlt,
          borderWidth: 1,
          borderColor: currentColors.border,
          shadowColor: currentColors.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
        }
      ]}>
        {!isActive && (
          <TouchableOpacity
            style={[themedStyles.dropdownItem]}
            onPress={() => {
              handleSetActiveBudget(budget.id);
              setDropdownBudgetId(null);
            }}
          >
            <Icon name="checkmark-circle" size={16} color={currentColors.success} />
            <Text style={[themedStyles.text, { marginLeft: 8 }]}>Set as Active</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[themedStyles.dropdownItem]}
          onPress={() => {
            setEditingBudgetId(budget.id);
            setEditingName(budget.name);
            setDropdownBudgetId(null);
          }}
        >
          <Icon name="create" size={16} color={currentColors.text} />
          <Text style={[themedStyles.text, { marginLeft: 8 }]}>Rename</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[themedStyles.dropdownItem]}
          onPress={() => {
            handleDuplicateBudget(budget.id, budget.name);
            setDropdownBudgetId(null);
          }}
        >
          <Icon name="copy" size={16} color={currentColors.text} />
          <Text style={[themedStyles.text, { marginLeft: 8 }]}>Duplicate</Text>
        </TouchableOpacity>
        
        {budgets.length > 1 && (
          <TouchableOpacity
            style={[themedStyles.dropdownItem]}
            onPress={() => {
              handleDeleteBudget(budget.id, budget.name);
              setDropdownBudgetId(null);
            }}
          >
            <Icon name="trash" size={16} color={currentColors.error} />
            <Text style={[themedStyles.text, { marginLeft: 8, color: currentColors.error }]}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderDropdownOverlay = () => {
    if (!dropdownBudgetId) return null;
    
    return (
      <Pressable
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
        }}
        onPress={() => setDropdownBudgetId(null)}
      />
    );
  };

  return (
    <View style={themedStyles.container}>
      <StandardHeader 
        title="Budgets" 
        showLeftIcon={false} 
        showRightIcon={true}
        rightIcon="add"
        onRightPress={() => setShowCreateModal(true)}
      />

      <ScrollView style={themedStyles.content} contentContainerStyle={themedStyles.scrollContent}>
        {/* Existing Budgets */}
        {budgets.length > 0 && (
          <View style={themedStyles.card}>
            <Text style={[themedStyles.subtitle, { marginBottom: 16 }]}>
              Your Budgets ({budgets.length})
            </Text>
            
            {budgets.map((budget) => {
              const isActive = activeBudget?.id === budget.id;
              const isEditing = editingBudgetId === budget.id;
              
              return (
                <View key={budget.id} style={{ position: 'relative' }}>
                  <View style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 16,
                      paddingHorizontal: 16,
                      marginBottom: 8,
                      backgroundColor: isActive ? currentColors.primary + '15' : currentColors.backgroundAlt,
                      borderRadius: 12,
                      borderWidth: isActive ? 1 : 0,
                      borderColor: isActive ? currentColors.primary : 'transparent',
                    }
                  ]}>
                    <View style={{ flex: 1 }}>
                      {isEditing ? (
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          <TextInput
                            style={[themedStyles.input, { flex: 1, marginBottom: 0 }]}
                            value={editingName}
                            onChangeText={setEditingName}
                            autoFocus
                            selectTextOnFocus
                          />
                          <TouchableOpacity
                            onPress={() => handleRenameBudget(budget.id)}
                            style={{ padding: 8 }}
                          >
                            <Icon name="checkmark" size={20} color={currentColors.success} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              setEditingBudgetId(null);
                              setEditingName('');
                            }}
                            style={{ padding: 8 }}
                          >
                            <Icon name="close" size={20} color={currentColors.error} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => !isActive && handleSetActiveBudget(budget.id)}
                          style={{ flex: 1 }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Text style={[
                              themedStyles.text,
                              { 
                                fontWeight: isActive ? '600' : '500', 
                                flex: 1,
                                fontSize: 16,
                                color: isActive ? currentColors.primary : currentColors.text
                              }
                            ]}>
                              {budget.name}
                            </Text>
                            {isActive && (
                              <View style={[
                                {
                                  backgroundColor: currentColors.success,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }
                              ]}>
                                <Text style={[
                                  {
                                    color: currentColors.background,
                                    fontSize: 12,
                                    fontWeight: '600'
                                  }
                                ]}>
                                  Active
                                </Text>
                              </View>
                            )}
                          </View>
                          
                          <View style={{ flexDirection: 'row', gap: 16 }}>
                            <Text style={[themedStyles.textSecondary, { fontSize: 13 }]}>
                              {budget.people?.length || 0} people
                            </Text>
                            <Text style={[themedStyles.textSecondary, { fontSize: 13 }]}>
                              {budget.expenses?.length || 0} expenses
                            </Text>
                            <Text style={[themedStyles.textSecondary, { fontSize: 13 }]}>
                              {formatDate(budget.modifiedAt)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {!isEditing && (
                      <TouchableOpacity
                        onPress={() => setDropdownBudgetId(dropdownBudgetId === budget.id ? null : budget.id)}
                        style={{ 
                          padding: 8, 
                          marginLeft: 8,
                          borderRadius: 6,
                          backgroundColor: currentColors.background + '50'
                        }}
                      >
                        <Icon name="help-circle" size={20} color={currentColors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {dropdownBudgetId === budget.id && <DropdownMenu budget={budget} />}
                </View>
              );
            })}
          </View>
        )}

        {budgets.length === 0 && (
          <View style={[themedStyles.card, themedStyles.centerContent]}>
            <Icon name="folder" size={48} color={currentColors.textSecondary} />
            <Text style={[themedStyles.text, { marginTop: 16, textAlign: 'center' }]}>
              No budgets yet
            </Text>
            <Text style={[themedStyles.textSecondary, { textAlign: 'center', marginTop: 8 }]}>
              Tap the + button to create your first budget
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create Budget Modal */}
      {showCreateModal && (
        <View style={themedStyles.modalOverlay}>
          <View style={themedStyles.modalContent}>
            <View style={[themedStyles.modalHeader, { marginBottom: 20 }]}>
              <Text style={themedStyles.modalTitle}>Create New Budget</Text>
              <TouchableOpacity onPress={() => {
                setShowCreateModal(false);
                setNewBudgetName('');
              }}>
                <Icon name="close" size={24} color={currentColors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
              Budget Name:
            </Text>
            
            <TextInput
              style={themedStyles.input}
              placeholder="Enter budget name"
              placeholderTextColor={currentColors.textSecondary}
              value={newBudgetName}
              onChangeText={setNewBudgetName}
              editable={!isCreating}
              autoFocus
            />
            
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <View style={{ flex: 1 }}>
                <Button
                  text="Cancel"
                  onPress={() => {
                    setShowCreateModal(false);
                    setNewBudgetName('');
                  }}
                  disabled={isCreating}
                  variant="outline"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  text={isCreating ? 'Creating...' : 'Create'}
                  onPress={handleCreateBudget}
                  disabled={!newBudgetName.trim() || isCreating}
                  variant="primary"
                />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Dropdown Overlay */}
      {renderDropdownOverlay()}
    </View>
  );
}
