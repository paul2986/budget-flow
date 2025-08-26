
import { useToast } from '../hooks/useToast';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Pressable, Modal, Share, KeyboardAvoidingView, Platform } from 'react-native';
import { useBudgetData } from '../hooks/useBudgetData';
import { router, useFocusEffect } from 'expo-router';
import { useBudgetLock } from '../hooks/useBudgetLock';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import StandardHeader from '../components/StandardHeader';
import { useCallback, useMemo, useState, useEffect } from 'react';
import Button from '../components/Button';
import { buildOfflinePayload, createShareLink } from '../utils/shareLink';
import { useTheme } from '../hooks/useTheme';
import { Budget } from '../types/budget';
import { loadAppData, saveAppData } from '../utils/storage';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { createBackup, shareBackupFile, cleanupOldBackups } from '../utils/backup';
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
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalBudget, setShareModalBudget] = useState<Budget | null>(null);
  const [shareLink, setShareLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [dropdownBudgetId, setDropdownBudgetId] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);

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

  const handleShareBudget = useCallback(async (budget: Budget) => {
    setShareModalBudget(budget);
    setIsGeneratingLink(true);
    setShowShareModal(true);

    try {
      const payload = buildOfflinePayload(budget);
      const link = createShareLink(payload);
      setShareLink(link);
    } catch (error) {
      console.error('Error generating share link:', error);
      showToast('Failed to generate share link', 'error');
      setShowShareModal(false);
    } finally {
      setIsGeneratingLink(false);
    }
  }, [showToast]);

  // Handle backup creation
  const handleCreateBackup = useCallback(async (budgetId?: string) => {
    setIsBackingUp(true);
    try {
      const result = await createBackup(budgetId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create backup');
      }
      
      if (result.filePath) {
        // Share the backup file
        const shareResult = await shareBackupFile(result.filePath);
        
        if (shareResult.success) {
          const budgetName = budgetId 
            ? budgets.find(b => b.id === budgetId)?.name || 'Unknown'
            : 'All Budgets';
          showToast(`Backup created for ${budgetName}`, 'success');
          
          // Clean up old backup files in the background
          cleanupOldBackups().catch(error => {
            console.warn('Failed to cleanup old backups:', error);
          });
        } else {
          throw new Error(shareResult.error || 'Failed to share backup file');
        }
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to create backup',
        'error'
      );
    } finally {
      setIsBackingUp(false);
    }
  }, [budgets, showToast]);

  const renderShareModalContent = () => {
    if (!shareModalBudget) return null;

    return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[themedStyles.modalContent, { maxHeight: '90%' }]}>
          <View style={[themedStyles.modalHeader, { marginBottom: 20 }]}>
            <Text style={themedStyles.modalTitle}>Share Budget</Text>
            <TouchableOpacity onPress={() => setShowShareModal(false)}>
              <Icon name="close" size={24} color={currentColors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[themedStyles.subtitle, { marginBottom: 8 }]}>
              {shareModalBudget.name}
            </Text>
            <Text style={[themedStyles.textSecondary, { marginBottom: 20 }]}>
              Share this budget with others by showing them the QR code or sending the link.
            </Text>

            {isGeneratingLink ? (
              <View style={[themedStyles.centerContent, { height: 200 }]}>
                <ActivityIndicator size="large" color={currentColors.primary} />
                <Text style={[themedStyles.textSecondary, { marginTop: 16 }]}>
                  Generating share link...
                </Text>
              </View>
            ) : (
              <View style={[themedStyles.card, { alignItems: 'center', marginBottom: 20 }]}>
                <QRCode
                  value={shareLink}
                  size={200}
                  color={currentColors.text}
                  backgroundColor={currentColors.background}
                />
              </View>
            )}

            <View style={{ gap: 12 }}>
              <Button
                text="Copy Link"
                onPress={async () => {
                  await Clipboard.setStringAsync(shareLink);
                  showToast('Link copied to clipboard', 'success');
                }}
                disabled={isGeneratingLink}
                variant="outline"
              />
              
              <Button
                text="Share Link"
                onPress={async () => {
                  try {
                    await Share.share({
                      message: `Check out my budget: ${shareLink}`,
                      title: 'Budget Share',
                    });
                  } catch (error) {
                    console.error('Error sharing:', error);
                  }
                }}
                disabled={isGeneratingLink}
                variant="primary"
              />
            </View>

            <View style={[themedStyles.card, { backgroundColor: currentColors.primary + '10', marginTop: 20 }]}>
              <Text style={[themedStyles.text, { fontWeight: '600', marginBottom: 4 }]}>
                Fully Offline
              </Text>
              <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>
                This QR code contains all your budget data. No internet connection is required for sharing or importing.
              </Text>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    );
  };

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
            <Icon name="check-circle" size={16} color={currentColors.success} />
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
          <Icon name="edit" size={16} color={currentColors.text} />
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
        
        <TouchableOpacity
          style={[themedStyles.dropdownItem]}
          onPress={() => {
            handleShareBudget(budget);
            setDropdownBudgetId(null);
          }}
        >
          <Icon name="share" size={16} color={currentColors.text} />
          <Text style={[themedStyles.text, { marginLeft: 8 }]}>Share QR Code</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[themedStyles.dropdownItem]}
          onPress={() => {
            handleCreateBackup(budget.id);
            setDropdownBudgetId(null);
          }}
          disabled={isBackingUp}
        >
          <Icon name="download" size={16} color={currentColors.text} />
          <Text style={[themedStyles.text, { marginLeft: 8 }]}>
            {isBackingUp ? 'Creating Backup...' : 'Create Backup'}
          </Text>
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

  // Check if the active budget is locked (only show lock screen if there's an active budget that's locked)
  const activeBudgetLocked = activeBudget ? isLocked(activeBudget) : false;
  
  if (activeBudgetLocked) {
    return (
      <View style={themedStyles.container}>
        <StandardHeader title="Budgets" showLeftIcon={false} showRightIcon={false} />
        <View style={[themedStyles.centerContent, { flex: 1 }]}>
          <Icon name="lock" size={48} color={currentColors.textSecondary} />
          <Text style={[themedStyles.text, { marginTop: 16, textAlign: 'center' }]}>
            Budget is locked
          </Text>
          <Text style={[themedStyles.textSecondary, { textAlign: 'center', marginTop: 8 }]}>
            Unlock to view and manage your budgets
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={themedStyles.container}>
      <StandardHeader 
        title="Budgets" 
        showLeftIcon={false} 
        showRightIcon={false}
      />

      <ScrollView style={themedStyles.content} contentContainerStyle={themedStyles.scrollContent}>
        {/* Create New Budget */}
        <View style={themedStyles.card}>
          <Text style={[themedStyles.subtitle, { marginBottom: 16 }]}>
            Create New Budget
          </Text>
          
          <TextInput
            style={themedStyles.input}
            placeholder="Budget name"
            placeholderTextColor={currentColors.textSecondary}
            value={newBudgetName}
            onChangeText={setNewBudgetName}
            editable={!isCreating}
          />
          
          <Button
            text={isCreating ? 'Creating...' : 'Create Budget'}
            onPress={handleCreateBudget}
            disabled={!newBudgetName.trim() || isCreating}
            variant="primary"
          />
        </View>

        {/* Import Budget */}
        <View style={themedStyles.card}>
          <Text style={[themedStyles.subtitle, { marginBottom: 8 }]}>
            Import Budget
          </Text>
          <Text style={[themedStyles.textSecondary, { marginBottom: 16 }]}>
            Import a budget from QR code or backup file.
          </Text>
          
          <Button
            text="Import Budget"
            onPress={() => router.push('/import-budget')}
            variant="outline"
          />
        </View>

        {/* Backup All Budgets */}
        {budgets.length > 0 && (
          <View style={themedStyles.card}>
            <Text style={[themedStyles.subtitle, { marginBottom: 8 }]}>
              Backup All Budgets
            </Text>
            <Text style={[themedStyles.textSecondary, { marginBottom: 16 }]}>
              Create a backup file containing all your budgets.
            </Text>
            
            <Button
              text={isBackingUp ? 'Creating Backup...' : 'Create Full Backup'}
              onPress={() => handleCreateBackup()}
              disabled={isBackingUp}
              variant="outline"
            />
          </View>
        )}

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
                    themedStyles.listItem,
                    isActive && { backgroundColor: currentColors.primary + '10', borderColor: currentColors.primary }
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
                            <Icon name="check" size={20} color={currentColors.success} />
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
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={[
                              themedStyles.text,
                              { fontWeight: isActive ? '600' : '400', flex: 1 }
                            ]}>
                              {budget.name}
                            </Text>
                            {isActive && (
                              <View style={[themedStyles.badge, { backgroundColor: currentColors.success }]}>
                                <Text style={[themedStyles.badgeText, { color: currentColors.background }]}>
                                  Active
                                </Text>
                              </View>
                            )}
                          </View>
                          
                          <View style={{ flexDirection: 'row', gap: 16 }}>
                            <Text style={themedStyles.textSecondary}>
                              {budget.people?.length || 0} people
                            </Text>
                            <Text style={themedStyles.textSecondary}>
                              {budget.expenses?.length || 0} expenses
                            </Text>
                            <Text style={themedStyles.textSecondary}>
                              {formatDate(budget.modifiedAt)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {!isEditing && (
                      <TouchableOpacity
                        onPress={() => setDropdownBudgetId(dropdownBudgetId === budget.id ? null : budget.id)}
                        style={{ padding: 8, marginLeft: 8 }}
                      >
                        <Icon name="more-vertical" size={20} color={currentColors.textSecondary} />
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
              Create your first budget or import one from a friend
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={themedStyles.modalOverlay}>
          {renderShareModalContent()}
        </View>
      </Modal>

      {/* Dropdown Overlay */}
      {renderDropdownOverlay()}
    </View>
  );
}
