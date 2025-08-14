
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../hooks/useTheme';
import { router } from 'expo-router';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Pressable, Modal, Share } from 'react-native';
import Icon from '../components/Icon';
import { loadAppData, saveAppData } from '../utils/storage';
import { useBudgetData } from '../hooks/useBudgetData';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { buildOfflinePayload, createShareLink } from '../utils/shareLink';
import { useToast } from '../hooks/useToast';
import StandardHeader from '../components/StandardHeader';
import QRCode from 'react-native-qrcode-svg';
import { Budget } from '../types/budget';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useBudgetLock } from '../hooks/useBudgetLock';

export default function BudgetsScreen() {
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();
  const { showToast } = useToast();
  const { data, loading, setActiveBudget, addBudget, renameBudget, deleteBudget } = useBudgetData();
  const { isLocked, authenticateForBudget, toggleBudgetLock } = useBudgetLock();
  
  const [newBudgetName, setNewBudgetName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [authenticating, setAuthenticating] = useState<string | null>(null);

  const sortedBudgets = useMemo(() => {
    return [...data.budgets].sort((a, b) => {
      // Active budget first
      if (a.id === data.activeBudgetId) return -1;
      if (b.id === data.activeBudgetId) return 1;
      // Then by creation date (newest first)
      return b.createdAt - a.createdAt;
    });
  }, [data.budgets, data.activeBudgetId]);

  const handleCreateBudget = useCallback(async () => {
    if (!newBudgetName.trim()) {
      showToast('Please enter a budget name', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const result = await addBudget(newBudgetName.trim());
      if (result.success) {
        setNewBudgetName('');
        showToast('Budget created successfully', 'success');
      } else {
        showToast(result.error?.message || 'Failed to create budget', 'error');
      }
    } catch (error) {
      console.error('Budgets: Create error:', error);
      showToast('Failed to create budget', 'error');
    } finally {
      setIsCreating(false);
    }
  }, [newBudgetName, addBudget, showToast]);

  const handleSelectBudget = useCallback(async (budget: Budget) => {
    if (isLocked(budget)) {
      console.log('Budgets: Budget is locked, authenticating:', budget.name);
      setAuthenticating(budget.id);
      try {
        const success = await authenticateForBudget(budget.id);
        if (success) {
          console.log('Budgets: Authentication successful, setting active budget');
          await setActiveBudget(budget.id);
          router.push('/');
        } else {
          console.log('Budgets: Authentication failed');
          showToast('Authentication failed', 'error');
        }
      } catch (error) {
        console.error('Budgets: Authentication error:', error);
        showToast('Authentication error', 'error');
      } finally {
        setAuthenticating(null);
      }
    } else {
      console.log('Budgets: Budget is unlocked, setting active budget:', budget.name);
      await setActiveBudget(budget.id);
      router.push('/');
    }
  }, [isLocked, authenticateForBudget, setActiveBudget, showToast]);

  const handleToggleLock = useCallback(async (budget: Budget) => {
    const newLockState = !budget.lock?.locked;
    try {
      const result = await toggleBudgetLock(budget.id, newLockState);
      if (result.success) {
        showToast(newLockState ? 'Budget locked' : 'Budget unlocked', 'success');
      } else {
        showToast(result.error?.message || 'Failed to update lock', 'error');
      }
    } catch (error) {
      console.error('Budgets: Toggle lock error:', error);
      showToast('Failed to update lock', 'error');
    }
  }, [toggleBudgetLock, showToast]);

  const renderShareModalContent = () => {
    if (!selectedBudget) return null;

    const shareUrl = createShareLink(selectedBudget);
    const offlinePayload = buildOfflinePayload(selectedBudget);

    return (
      <View style={{ padding: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text style={[themedStyles.subtitle, { flex: 1 }]}>Share Budget</Text>
          <TouchableOpacity onPress={() => setShareModalVisible(false)}>
            <Icon name="close" size={24} style={{ color: currentColors.text }} />
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <QRCode value={shareUrl} size={200} backgroundColor="white" color="black" />
        </View>

        <View style={{ gap: 12 }}>
          <TouchableOpacity
            style={[themedStyles.card, { backgroundColor: currentColors.primary, borderColor: currentColors.primary, borderWidth: 1 }]}
            onPress={async () => {
              try {
                await Share.share({ message: shareUrl });
              } catch (error) {
                console.error('Share error:', error);
              }
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44 }}>
              <Icon name="share-outline" size={20} style={{ color: '#fff', marginRight: 8 }} />
              <Text style={[themedStyles.text, { color: '#fff', fontWeight: '600' }]}>Share Link</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[themedStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border, borderWidth: 1 }]}
            onPress={async () => {
              await Clipboard.setStringAsync(shareUrl);
              showToast('Link copied to clipboard', 'success');
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44 }}>
              <Icon name="copy-outline" size={20} style={{ color: currentColors.text, marginRight: 8 }} />
              <Text style={[themedStyles.text, { fontWeight: '600' }]}>Copy Link</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[themedStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border, borderWidth: 1 }]}
            onPress={async () => {
              await Clipboard.setStringAsync(offlinePayload);
              showToast('Offline data copied to clipboard', 'success');
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44 }}>
              <Icon name="download-outline" size={20} style={{ color: currentColors.text, marginRight: 8 }} />
              <Text style={[themedStyles.text, { fontWeight: '600' }]}>Copy Offline Data</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const DropdownMenu = ({ budget }: { budget: Budget }) => {
    const [visible, setVisible] = useState(false);

    return (
      <View style={{ position: 'relative' }}>
        <TouchableOpacity
          onPress={() => setVisible(!visible)}
          style={{
            padding: 8,
            borderRadius: 8,
            backgroundColor: visible ? currentColors.backgroundAlt : 'transparent',
          }}
        >
          <Icon name="ellipsis-vertical" size={20} style={{ color: currentColors.text }} />
        </TouchableOpacity>

        {visible && (
          <>
            <Pressable
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1,
              }}
              onPress={() => setVisible(false)}
            />
            <View
              style={{
                position: 'absolute',
                top: 40,
                right: 0,
                backgroundColor: currentColors.backgroundAlt,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: currentColors.border,
                minWidth: 160,
                zIndex: 2,
                elevation: 5,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
              }}
            >
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: currentColors.border,
                }}
                onPress={() => {
                  setVisible(false);
                  router.push({ pathname: '/budget-lock', params: { budgetId: budget.id } });
                }}
              >
                <Icon name="settings-outline" size={16} style={{ color: currentColors.text, marginRight: 8 }} />
                <Text style={themedStyles.text}>Lock settings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: currentColors.border,
                }}
                onPress={() => {
                  setVisible(false);
                  handleToggleLock(budget);
                }}
              >
                <Icon 
                  name={budget.lock?.locked ? "lock-open-outline" : "lock-closed-outline"} 
                  size={16} 
                  style={{ color: currentColors.text, marginRight: 8 }} 
                />
                <Text style={themedStyles.text}>
                  {budget.lock?.locked ? 'Unlock' : 'Lock'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: currentColors.border,
                }}
                onPress={() => {
                  setVisible(false);
                  setSelectedBudget(budget);
                  setShareModalVisible(true);
                }}
              >
                <Icon name="share-outline" size={16} style={{ color: currentColors.text, marginRight: 8 }} />
                <Text style={themedStyles.text}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: currentColors.border,
                }}
                onPress={() => {
                  setVisible(false);
                  Alert.prompt(
                    'Rename Budget',
                    'Enter a new name for this budget:',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Rename',
                        onPress: async (newName) => {
                          if (newName && newName.trim()) {
                            const result = await renameBudget(budget.id, newName.trim());
                            if (result.success) {
                              showToast('Budget renamed successfully', 'success');
                            } else {
                              showToast(result.error?.message || 'Failed to rename budget', 'error');
                            }
                          }
                        },
                      },
                    ],
                    'plain-text',
                    budget.name
                  );
                }}
              >
                <Icon name="pencil-outline" size={16} style={{ color: currentColors.text, marginRight: 8 }} />
                <Text style={themedStyles.text}>Rename</Text>
              </TouchableOpacity>

              {data.budgets.length > 1 && (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                  }}
                  onPress={() => {
                    setVisible(false);
                    Alert.alert(
                      'Delete Budget',
                      `Are you sure you want to delete "${budget.name}"? This action cannot be undone.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            const result = await deleteBudget(budget.id);
                            if (result.success) {
                              showToast('Budget deleted successfully', 'success');
                            } else {
                              showToast(result.error?.message || 'Failed to delete budget', 'error');
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Icon name="trash-outline" size={16} style={{ color: currentColors.error, marginRight: 8 }} />
                  <Text style={[themedStyles.text, { color: currentColors.error }]}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
        <StandardHeader title="Budgets" />
        <View style={[themedStyles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={currentColors.primary} />
          <Text style={[themedStyles.textSecondary, { marginTop: 16 }]}>Loading budgets...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
      <StandardHeader title="Budgets" />

      <ScrollView style={themedStyles.content} contentContainerStyle={{ padding: 16 }}>
        {/* Create New Budget */}
        <View style={[themedStyles.card, { marginBottom: 24 }]}>
          <Text style={[themedStyles.subtitle, { marginBottom: 12 }]}>Create New Budget</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TextInput
              style={[
                themedStyles.textInput,
                {
                  flex: 1,
                  backgroundColor: currentColors.background,
                  borderColor: currentColors.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  color: currentColors.text,
                },
              ]}
              placeholder="Budget name"
              placeholderTextColor={currentColors.textSecondary}
              value={newBudgetName}
              onChangeText={setNewBudgetName}
              onSubmitEditing={handleCreateBudget}
              editable={!isCreating}
            />
            <TouchableOpacity
              style={[
                themedStyles.card,
                {
                  backgroundColor: currentColors.primary,
                  borderColor: currentColors.primary,
                  borderWidth: 1,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginBottom: 0,
                  minHeight: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
              onPress={handleCreateBudget}
              disabled={isCreating || !newBudgetName.trim()}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Icon name="add" size={20} style={{ color: '#fff' }} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Budget List */}
        <View style={{ gap: 12 }}>
          {sortedBudgets.map((budget) => {
            const isActive = budget.id === data.activeBudgetId;
            const budgetLocked = isLocked(budget);
            const isAuthenticatingThis = authenticating === budget.id;

            return (
              <TouchableOpacity
                key={budget.id}
                style={[
                  themedStyles.card,
                  {
                    borderColor: isActive ? currentColors.primary : currentColors.border,
                    borderWidth: isActive ? 2 : 1,
                    backgroundColor: isActive ? currentColors.primary + '10' : currentColors.backgroundAlt,
                  },
                ]}
                onPress={() => handleSelectBudget(budget)}
                disabled={isAuthenticatingThis}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[themedStyles.text, { fontWeight: '600', marginRight: 8 }]}>
                          {budget.name}
                        </Text>
                        {isActive && (
                          <View
                            style={{
                              backgroundColor: currentColors.primary,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>ACTIVE</Text>
                          </View>
                        )}
                        {budgetLocked && (
                          <View style={{ marginLeft: 8 }}>
                            <Icon name="lock-closed" size={16} style={{ color: currentColors.error }} />
                          </View>
                        )}
                      </View>
                      <Text style={themedStyles.textSecondary}>
                        {budget.people.length} people • {budget.expenses.length} expenses
                      </Text>
                    </View>

                    {isAuthenticatingThis && (
                      <ActivityIndicator color={currentColors.primary} size="small" style={{ marginRight: 12 }} />
                    )}
                  </View>

                  <DropdownMenu budget={budget} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Import Link */}
        <TouchableOpacity
          style={[
            themedStyles.card,
            {
              backgroundColor: currentColors.backgroundAlt,
              borderColor: currentColors.border,
              borderWidth: 1,
              borderStyle: 'dashed',
              marginTop: 24,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 60,
            },
          ]}
          onPress={() => router.push('/import-link')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="download-outline" size={20} style={{ color: currentColors.primary, marginRight: 8 }} />
            <Text style={[themedStyles.text, { color: currentColors.primary, fontWeight: '600' }]}>
              Import Budget from Link
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Share Modal */}
      <Modal visible={shareModalVisible} transparent animationType="slide" onRequestClose={() => setShareModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: currentColors.backgroundAlt,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '80%',
            }}
          >
            <ScrollView>{renderShareModalContent()}</ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
