
import { useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Pressable, Modal, Share } from 'react-native';
import { router } from 'expo-router';
import { useBudgetData } from '../hooks/useBudgetData';
import { useTheme } from '../hooks/useTheme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useToast } from '../hooks/useToast';
import { useBudgetLock } from '../hooks/useBudgetLock';
import { Budget } from '../types/budget';
import { buildOfflinePayload, createShareLink } from '../utils/shareLink';
import { loadAppData, saveAppData } from '../utils/storage';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import Icon from '../components/Icon';
import StandardHeader from '../components/StandardHeader';
import Button from '../components/Button';

// Helper function to format dates nicely
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  }
};

export default function BudgetsScreen() {
  const { appData, activeBudget, addBudget, renameBudget, deleteBudget, duplicateBudget, setActiveBudget, loading, saving } = useBudgetData();
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();
  const { showToast } = useToast();
  const { isLocked } = useBudgetLock();
  
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showAddBudgetOptions, setShowAddBudgetOptions] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState('');
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingBudgetName, setEditingBudgetName] = useState('');
  const [openBudgetId, setOpenBudgetId] = useState<string | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareModalBudget, setShareModalBudget] = useState<Budget | null>(null);
  const [shareData, setShareData] = useState<{ url: string; code?: string; expiresAt?: string } | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);

  const budgets = useMemo(() => appData.budgets || [], [appData.budgets]);

  const handleAddBudget = useCallback(async () => {
    if (!newBudgetName.trim()) {
      Alert.alert('Error', 'Please enter a budget name');
      return;
    }

    try {
      const result = await addBudget(newBudgetName.trim());
      if (result.success) {
        setNewBudgetName('');
        setShowAddBudget(false);
        showToast('Budget created successfully', 'success');
      } else {
        Alert.alert('Error', 'Failed to create budget. Please try again.');
      }
    } catch (error) {
      console.error('Error creating budget:', error);
      Alert.alert('Error', 'Failed to create budget. Please try again.');
    }
  }, [newBudgetName, addBudget, showToast]);

  const handleRenameBudget = useCallback(async (budgetId: string) => {
    if (!editingBudgetName.trim()) {
      Alert.alert('Error', 'Please enter a budget name');
      return;
    }

    try {
      const result = await renameBudget(budgetId, editingBudgetName.trim());
      if (result.success) {
        setEditingBudgetId(null);
        setEditingBudgetName('');
        setOpenBudgetId(null);
        showToast('Budget renamed successfully', 'success');
      } else {
        Alert.alert('Error', 'Failed to rename budget. Please try again.');
      }
    } catch (error) {
      console.error('Error renaming budget:', error);
      Alert.alert('Error', 'Failed to rename budget. Please try again.');
    }
  }, [editingBudgetName, renameBudget, showToast]);

  const handleDeleteBudget = useCallback((budget: Budget) => {
    if (budgets.length <= 1) {
      Alert.alert('Cannot Delete', 'You must have at least one budget.');
      return;
    }

    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete "${budget.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setOpenBudgetId(null); // Close menu
              const result = await deleteBudget(budget.id);
              if (result.success) {
                showToast('Budget deleted successfully', 'success');
              } else {
                Alert.alert('Error', 'Failed to delete budget. Please try again.');
              }
            } catch (error) {
              console.error('Error deleting budget:', error);
              Alert.alert('Error', 'Failed to delete budget. Please try again.');
            }
          },
        },
      ]
    );
  }, [budgets.length, deleteBudget, showToast]);

  const handleDuplicateBudget = useCallback(async (budget: Budget) => {
    try {
      setOpenBudgetId(null); // Close menu
      const result = await duplicateBudget(budget.id);
      if (result.success) {
        showToast('Budget duplicated successfully', 'success');
      } else {
        Alert.alert('Error', 'Failed to duplicate budget. Please try again.');
      }
    } catch (error) {
      console.error('Error duplicating budget:', error);
      Alert.alert('Error', 'Failed to duplicate budget. Please try again.');
    }
  }, [duplicateBudget, showToast]);

  const handleSetActiveBudget = useCallback(async (budgetId: string) => {
    if (budgetId === activeBudget?.id) return;

    try {
      setOpenBudgetId(null); // Close menu
      const result = await setActiveBudget(budgetId);
      if (result.success) {
        showToast('Budget switched successfully', 'success');
        router.replace('/');
      } else {
        Alert.alert('Error', 'Failed to switch budget. Please try again.');
      }
    } catch (error) {
      console.error('Error switching budget:', error);
      Alert.alert('Error', 'Failed to switch budget. Please try again.');
    }
  }, [activeBudget?.id, setActiveBudget, showToast]);

  const handleShareBudget = useCallback(async (budget: Budget) => {
    setOpenBudgetId(null); // Close menu
    setShareModalBudget(budget);
    setShareModalVisible(true);
    setIsGeneratingShare(true);
    setShareData(null);

    try {
      const result = await createShareLink(budget);
      setShareData(result);
    } catch (error) {
      console.error('Error creating share link:', error);
      showToast('Failed to create share link', 'error');
      setShareModalVisible(false);
    } finally {
      setIsGeneratingShare(false);
    }
  }, [showToast]);

  const handleCopyShareData = useCallback(async () => {
    if (!shareData) return;

    try {
      await Clipboard.setStringAsync(shareData.url);
      showToast('Share data copied to clipboard', 'success');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      showToast('Failed to copy to clipboard', 'error');
    }
  }, [shareData, showToast]);

  const handleNativeShare = useCallback(async () => {
    if (!shareData || !shareModalBudget) return;

    try {
      await Share.share({
        message: `Check out my budget "${shareModalBudget.name}"! Import this QR code data into your budget app: ${shareData.url}`,
        title: `Budget: ${shareModalBudget.name}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
      showToast('Failed to share', 'error');
    }
  }, [shareData, shareModalBudget, showToast]);

  const renderShareModalContent = () => {
    if (!shareModalBudget) return null;

    return (
      <View style={[themedStyles.card, { margin: 20, maxHeight: '80%' }]}>
        <View style={[themedStyles.row, { marginBottom: 16 }]}>
          <Text style={[themedStyles.subtitle, { marginBottom: 0 }]}>
            Share "{shareModalBudget.name}"
          </Text>
          <TouchableOpacity onPress={() => setShareModalVisible(false)}>
            <Icon name="close" size={24} style={{ color: currentColors.text }} />
          </TouchableOpacity>
        </View>

        {isGeneratingShare ? (
          <View style={[themedStyles.centerContent, { paddingVertical: 40 }]}>
            <ActivityIndicator size="large" color={currentColors.primary} />
            <Text style={[themedStyles.textSecondary, { marginTop: 16 }]}>
              Generating QR code...
            </Text>
          </View>
        ) : shareData ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[themedStyles.centerContent, { marginBottom: 20 }]}>
              <View style={{ 
                backgroundColor: 'white', 
                padding: 16, 
                borderRadius: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}>
                <QRCode
                  value={shareData.url}
                  size={200}
                  backgroundColor="white"
                  color="black"
                />
              </View>
            </View>

            <Text style={[themedStyles.text, { textAlign: 'center', marginBottom: 16 }]}>
              Scan this QR code to import the budget into another device
            </Text>

            <Text style={[themedStyles.textSecondary, { fontSize: 12, textAlign: 'center', marginBottom: 20 }]}>
              This app is fully offline - no internet connection required for sharing!
            </Text>

            <View style={{ gap: 12 }}>
              <Button
                text="Copy QR Data"
                onPress={handleCopyShareData}
                style={{ backgroundColor: currentColors.primary }}
              />

              <Button
                text="Share via Apps"
                onPress={handleNativeShare}
                style={{ 
                  backgroundColor: 'transparent',
                  borderWidth: 2,
                  borderColor: currentColors.primary,
                }}
                textStyle={{ color: currentColors.primary }}
              />
            </View>
          </ScrollView>
        ) : (
          <View style={[themedStyles.centerContent, { paddingVertical: 40 }]}>
            <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
              Failed to generate share data
            </Text>
          </View>
        )}
      </View>
    );
  };

  const DropdownMenu = ({ budget }: { budget: Budget }) => {
    const isActive = budget.id === activeBudget?.id;
    const isMenuOpen = openBudgetId === budget.id;

    const handleMenuToggle = () => {
      if (isMenuOpen) {
        setOpenBudgetId(null);
      } else {
        setOpenBudgetId(budget.id);
      }
    };

    return (
      <View style={{ position: 'relative' }}>
        <TouchableOpacity
          onPress={handleMenuToggle}
          style={{
            padding: 8,
            borderRadius: 8,
            backgroundColor: isMenuOpen ? currentColors.primary + '20' : currentColors.border + '40',
          }}
          disabled={saving}
        >
          <Icon name="ellipsis-vertical" size={16} style={{ color: currentColors.text }} />
        </TouchableOpacity>

        {isMenuOpen && (
          <View
            style={{
              position: 'absolute',
              top: 36,
              right: 0,
              backgroundColor: currentColors.backgroundAlt,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: currentColors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
              zIndex: 2,
              minWidth: 150,
            }}
          >
            {!isActive && (
              <TouchableOpacity
                style={{
                  padding: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: currentColors.border,
                }}
                onPress={() => handleSetActiveBudget(budget.id)}
                disabled={saving}
              >
                <Text style={[themedStyles.text, { fontSize: 14 }]}>Set as Active</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{
                padding: 12,
                borderBottomWidth: 1,
                borderBottomColor: currentColors.border,
              }}
              onPress={() => {
                setOpenBudgetId(null);
                setEditingBudgetId(budget.id);
                setEditingBudgetName(budget.name);
              }}
              disabled={saving}
            >
              <Text style={[themedStyles.text, { fontSize: 14 }]}>Rename</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                padding: 12,
                borderBottomWidth: 1,
                borderBottomColor: currentColors.border,
              }}
              onPress={() => handleDuplicateBudget(budget)}
              disabled={saving}
            >
              <Text style={[themedStyles.text, { fontSize: 14 }]}>Duplicate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                padding: 12,
                borderBottomWidth: 1,
                borderBottomColor: currentColors.border,
              }}
              onPress={() => handleShareBudget(budget)}
              disabled={saving}
            >
              <Text style={[themedStyles.text, { fontSize: 14 }]}>Share</Text>
            </TouchableOpacity>

            {budgets.length > 1 && (
              <TouchableOpacity
                style={{ padding: 12 }}
                onPress={() => handleDeleteBudget(budget)}
                disabled={saving}
              >
                <Text style={[themedStyles.text, { fontSize: 14, color: currentColors.error }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={themedStyles.container}>
        <StandardHeader title="Budgets" showLeftIcon={false} showRightIcon={false} />
        <View style={[themedStyles.centerContent, { flex: 1 }]}>
          <ActivityIndicator size="large" color={currentColors.primary} />
          <Text style={[themedStyles.textSecondary, { marginTop: 16 }]}>Loading budgets...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={themedStyles.container}>
      <StandardHeader
        title="Budgets"
        showLeftIcon={false}
        rightIcon="add"
        onRightPress={() => setShowAddBudgetOptions(true)}
        loading={saving}
      />

      <ScrollView style={themedStyles.content} contentContainerStyle={[themedStyles.scrollContent, { paddingHorizontal: 0, paddingTop: 16 }]}>
        {/* Add Budget Form */}
        {showAddBudget && (
          <View style={[themedStyles.card, { backgroundColor: currentColors.primary + '10' }]}>
            <Text style={[themedStyles.subtitle, { marginBottom: 12 }]}>Create New Budget</Text>
            
            <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
              Budget Name:
            </Text>
            <TextInput
              style={themedStyles.input}
              placeholder="Enter budget name"
              placeholderTextColor={currentColors.textSecondary}
              value={newBudgetName}
              onChangeText={setNewBudgetName}
              autoFocus
              editable={!saving}
            />
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Button
                  text="Cancel"
                  onPress={() => {
                    setShowAddBudget(false);
                    setNewBudgetName('');
                  }}
                  disabled={saving}
                  style={{ 
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderColor: currentColors.primary,
                  }}
                  textStyle={{ color: currentColors.primary }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  text={saving ? 'Creating...' : 'Create'}
                  onPress={handleAddBudget}
                  disabled={saving}
                  style={{ backgroundColor: saving ? currentColors.textSecondary : currentColors.primary }}
                />
              </View>
            </View>
          </View>
        )}

        {/* Budgets List */}
        {budgets.length === 0 ? (
          <View style={themedStyles.card}>
            <View style={themedStyles.centerContent}>
              <Icon name="folder-outline" size={48} style={{ color: currentColors.primary, marginBottom: 12 }} />
              <Text style={[themedStyles.subtitle, { textAlign: 'center', marginBottom: 8 }]}>
                No Budgets Yet
              </Text>
              <Text style={[themedStyles.textSecondary, { textAlign: 'center', marginBottom: 16 }]}>
                Create your first budget to get started
              </Text>
              <Button
                text="Create First Budget"
                onPress={() => setShowAddBudgetOptions(true)}
                disabled={saving}
                style={{ backgroundColor: currentColors.primary }}
              />
            </View>
          </View>
        ) : (
          budgets.map((budget) => {
            const isActive = budget.id === activeBudget?.id;
            const isEditing = editingBudgetId === budget.id;

            return (
              <View
                key={budget.id}
                style={[
                  themedStyles.card,
                  isActive && {
                    borderColor: currentColors.primary,
                    borderWidth: 2,
                    backgroundColor: currentColors.primary + '10',
                  },
                ]}
              >
                {isEditing ? (
                  <View>
                    <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
                      Budget Name:
                    </Text>
                    <TextInput
                      style={themedStyles.input}
                      value={editingBudgetName}
                      onChangeText={setEditingBudgetName}
                      autoFocus
                      editable={!saving}
                    />
                    
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Button
                          text="Cancel"
                          onPress={() => {
                            setEditingBudgetId(null);
                            setEditingBudgetName('');
                            setOpenBudgetId(null);
                          }}
                          disabled={saving}
                          style={{ 
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            borderColor: currentColors.textSecondary,
                          }}
                          textStyle={{ color: currentColors.textSecondary }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          text={saving ? 'Saving...' : 'Save'}
                          onPress={() => handleRenameBudget(budget.id)}
                          disabled={saving}
                          style={{ backgroundColor: saving ? currentColors.textSecondary : currentColors.primary }}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={[themedStyles.row, { marginBottom: 8 }]}>
                      <View style={[themedStyles.flex1, { flexDirection: 'row', alignItems: 'center' }]}>
                        {isActive && (
                          <View style={[
                            themedStyles.badge, 
                            { 
                              backgroundColor: currentColors.primary, 
                              marginRight: 12,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 12,
                            }
                          ]}>
                            <Text style={[themedStyles.badgeText, { color: currentColors.backgroundAlt, fontSize: 12 }]}>
                              Active
                            </Text>
                          </View>
                        )}
                        <Text style={[themedStyles.subtitle, { marginBottom: 0 }]}>
                          {budget.name}
                        </Text>
                      </View>
                      <DropdownMenu budget={budget} />
                    </View>

                    {/* Date Information */}
                    <View style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>
                          Created: {formatDate(budget.createdAt)}
                        </Text>
                        <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>
                          Modified: {formatDate(budget.modifiedAt)}
                        </Text>
                      </View>
                    </View>

                    {!isActive && (
                      <Button
                        text="Activate"
                        onPress={() => handleSetActiveBudget(budget.id)}
                        disabled={saving}
                        style={{ 
                          backgroundColor: 'transparent',
                          borderWidth: 2,
                          borderColor: currentColors.primary,
                          marginTop: 8,
                        }}
                        textStyle={{ color: currentColors.primary }}
                      />
                    )}
                  </>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Tap-away modal for closing menus */}
      {openBudgetId && (
        <Modal
          visible={true}
          transparent
          animationType="none"
          onRequestClose={() => setOpenBudgetId(null)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'transparent',
            }}
            onPress={() => setOpenBudgetId(null)}
          />
        </Modal>
      )}

      {/* Add Budget Options Modal */}
      <Modal
        visible={showAddBudgetOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddBudgetOptions(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={[themedStyles.card, { margin: 20, maxWidth: 300 }]}>
            <View style={[themedStyles.row, { marginBottom: 16 }]}>
              <Text style={[themedStyles.subtitle, { marginBottom: 0 }]}>
                Add Budget
              </Text>
              <TouchableOpacity onPress={() => setShowAddBudgetOptions(false)}>
                <Icon name="close" size={24} style={{ color: currentColors.text }} />
              </TouchableOpacity>
            </View>

            <Text style={[themedStyles.textSecondary, { marginBottom: 20, textAlign: 'center' }]}>
              Choose how you'd like to add a new budget
            </Text>

            <View style={{ gap: 12 }}>
              <Button
                text="Create New Budget"
                onPress={() => {
                  setShowAddBudgetOptions(false);
                  setShowAddBudget(true);
                }}
                style={{ backgroundColor: currentColors.primary }}
              />

              <Button
                text="Import Budget"
                onPress={() => {
                  setShowAddBudgetOptions(false);
                  router.push('/import-link');
                }}
                style={{ 
                  backgroundColor: 'transparent',
                  borderWidth: 2,
                  borderColor: currentColors.primary,
                }}
                textStyle={{ color: currentColors.primary }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Share Modal */}
      <Modal
        visible={shareModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {renderShareModalContent()}
        </View>
      </Modal>
    </View>
  );
}
