
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useBudgetData } from '../hooks/useBudgetData';
import { useTheme } from '../hooks/useTheme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useToast } from '../hooks/useToast';
import { Budget } from '../types/budget';
import { fetchSharedBudget } from '../utils/shareLink';
import { pickBackupFile, importBackup, getBackupInfo } from '../utils/backup';
import * as Clipboard from 'expo-clipboard';
import Icon from '../components/Icon';
import StandardHeader from '../components/StandardHeader';
import Button from '../components/Button';

// Dynamic import for barcode scanner (only available on mobile)
type ScannerModule = {
  BarCodeScanner: any;
  requestPermissionsAsync: () => Promise<{ status: string }>;
};

export default function ImportBudgetScreen() {
  const { addBudget, setActiveBudget, refreshData } = useBudgetData();
  const { currentColors } = useTheme();
  const { themedStyles } = useThemedStyles();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ link?: string }>();
  
  const [inputValue, setInputValue] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [importMode, setImportMode] = useState<'qr' | 'file'>('qr');
  const scannerRef = useRef<ScannerModule | null>(null);
  const hasInitialized = useRef(false);

  // Reset function to clear all import screen state
  const resetImportScreen = useCallback(() => {
    console.log('ImportBudgetScreen: Resetting screen state');
    setInputValue('');
    setScannedData(null);
    setScanMode(false);
    setIsImporting(false);
    setSelectedFile(null);
    setFileInfo(null);
    setImportMode('qr');
  }, []);

  // Initialize the screen with link parameter if provided
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      if (params.link) {
        console.log('ImportBudgetScreen: Initializing with link parameter:', params.link);
        setInputValue(params.link);
        setImportMode('qr');
      } else {
        console.log('ImportBudgetScreen: Initializing without link parameter');
        resetImportScreen();
      }
    }
  }, [params.link, resetImportScreen]);

  // Reset the screen when it comes into focus (unless there's a link parameter)
  useFocusEffect(
    useCallback(() => {
      console.log('ImportBudgetScreen: Screen focused');
      // Only reset if there's no link parameter and we've already initialized
      if (!params.link && hasInitialized.current) {
        console.log('ImportBudgetScreen: No link parameter, resetting screen');
        resetImportScreen();
      }
    }, [params.link, resetImportScreen])
  );

  // Load scanner module dynamically
  useEffect(() => {
    if (scanMode && Platform.OS !== 'web') {
      import('expo-barcode-scanner').then((module) => {
        scannerRef.current = module as ScannerModule;
        
        // Request camera permissions
        module.requestPermissionsAsync().then(({ status }) => {
          setHasPermission(status === 'granted');
        });
      }).catch((error) => {
        console.error('Failed to load barcode scanner:', error);
        showToast('Camera not available on this device', 'error');
        setScanMode(false);
      });
    }
  }, [scanMode, showToast]);

  // Handle QR code/link import
  const handleQRImport = useCallback(async (data: string) => {
    if (!data.trim()) {
      showToast('Please enter a link or QR code data', 'error');
      return;
    }

    setIsImporting(true);

    try {
      console.log('Importing budget from QR/link:', data);
      const result = await fetchSharedBudget(data.trim());
      
      console.log('Fetched budget:', result);
      
      // Create a new budget with the imported data
      const budgetName = result.budget.name || 'Imported Budget';
      console.log('ImportBudgetScreen: Creating budget with name:', budgetName);
      
      const addResult = await addBudget(budgetName);
      console.log('ImportBudgetScreen: Add budget result:', addResult);
      
      if (!addResult.success) {
        throw new Error(`Failed to create budget: ${addResult.error?.message || 'Unknown error'}`);
      }

      // Get the newly created budget from the add result
      const newBudget = addResult.budget;
      
      if (!newBudget) {
        throw new Error('Failed to get newly created budget from add result');
      }

      console.log('ImportBudgetScreen: New budget created:', {
        id: newBudget.id,
        name: newBudget.name
      });

      // Update the budget with imported data
      const { loadAppData, saveAppData } = await import('../utils/storage');
      const appData = await loadAppData();
      
      const updatedBudget: Budget = {
        ...newBudget,
        people: result.budget.people || [],
        expenses: result.budget.expenses || [],
        householdSettings: result.budget.householdSettings || { distributionMethod: 'even' },
        modifiedAt: Date.now(),
      };

      console.log('ImportBudgetScreen: Updating budget with imported data:', {
        peopleCount: updatedBudget.people.length,
        expensesCount: updatedBudget.expenses.length
      });

      // Save the updated budget using the storage API
      const updateResult = await saveAppData({
        version: 2,
        budgets: appData.budgets.map(b => b.id === newBudget.id ? updatedBudget : b),
        activeBudgetId: newBudget.id
      });

      if (!updateResult.success) {
        throw new Error(`Failed to save imported budget data: ${updateResult.error?.message || 'Unknown error'}`);
      }

      console.log('ImportBudgetScreen: Budget data saved successfully');

      // Set as active budget
      const setActiveResult = await setActiveBudget(newBudget.id);
      console.log('ImportBudgetScreen: Set active budget result:', setActiveResult);
      
      if (!setActiveResult.success) {
        console.warn('ImportBudgetScreen: Failed to set as active budget, but import was successful');
      }

      showToast(`Budget "${budgetName}" imported successfully!`, 'success');
      
      // Reset the import screen state
      resetImportScreen();
      
      // Navigate to budgets screen
      setTimeout(() => {
        router.replace('/budgets');
      }, 100);
      
    } catch (error) {
      console.error('QR Import error:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to import budget',
        'error'
      );
    } finally {
      setIsImporting(false);
    }
  }, [showToast, resetImportScreen]);

  // Handle file import
  const handleFileImport = useCallback(async () => {
    if (!selectedFile) {
      showToast('Please select a backup file first', 'error');
      return;
    }

    setIsImporting(true);

    try {
      console.log('Importing budget from file:', selectedFile);
      
      const result = await importBackup(selectedFile);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to import backup file');
      }
      
      const importedCount = result.importedBudgets?.length || 0;
      
      showToast(
        `Successfully imported ${importedCount} budget${importedCount !== 1 ? 's' : ''}!`,
        'success'
      );
      
      // Refresh data to show imported budgets
      await refreshData(true);
      
      // Reset the import screen state
      resetImportScreen();
      
      // Navigate to budgets screen
      setTimeout(() => {
        router.replace('/budgets');
      }, 100);
      
    } catch (error) {
      console.error('File Import error:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to import backup file',
        'error'
      );
    } finally {
      setIsImporting(false);
    }
  }, [selectedFile, showToast, resetImportScreen, refreshData]);

  // Handle file selection
  const handleSelectFile = useCallback(async () => {
    try {
      const result = await pickBackupFile();
      
      if (!result.success) {
        if (result.error !== 'File selection cancelled') {
          showToast(result.error || 'Failed to select file', 'error');
        }
        return;
      }
      
      if (result.filePath) {
        setSelectedFile(result.filePath);
        
        // Get file info
        const infoResult = await getBackupInfo(result.filePath);
        if (infoResult.success) {
          setFileInfo(infoResult.info);
        }
        
        showToast('Backup file selected successfully', 'success');
      }
    } catch (error) {
      console.error('File selection error:', error);
      showToast('Failed to select backup file', 'error');
    }
  }, [showToast]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent) {
        setInputValue(clipboardContent);
        showToast('Pasted from clipboard', 'success');
      } else {
        showToast('Clipboard is empty', 'error');
      }
    } catch (error) {
      console.error('Clipboard error:', error);
      showToast('Failed to read clipboard', 'error');
    }
  }, [showToast]);

  const handleBarCodeScanned = useCallback(({ data }: { data: string }) => {
    setScannedData(data);
    setInputValue(data);
    setScanMode(false);
    showToast('QR code scanned successfully', 'success');
  }, [showToast]);

  const renderScanner = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={[themedStyles.card, { backgroundColor: currentColors.error + '10' }]}>
          <Text style={[themedStyles.text, { textAlign: 'center', color: currentColors.error }]}>
            Camera scanning is not available on web. Please paste the QR code data manually.
          </Text>
        </View>
      );
    }

    if (hasPermission === null) {
      return (
        <View style={[themedStyles.centerContent, { flex: 1 }]}>
          <ActivityIndicator size="large" color={currentColors.primary} />
          <Text style={[themedStyles.textSecondary, { marginTop: 16 }]}>
            Requesting camera permission...
          </Text>
        </View>
      );
    }

    if (hasPermission === false) {
      return (
        <View style={[themedStyles.card, { backgroundColor: currentColors.error + '10' }]}>
          <Text style={[themedStyles.text, { textAlign: 'center', color: currentColors.error, marginBottom: 16 }]}>
            Camera permission is required to scan QR codes.
          </Text>
          <Button
            text="Use Manual Input"
            onPress={() => setScanMode(false)}
            variant="outline"
          />
        </View>
      );
    }

    if (!scannerRef.current) {
      return (
        <View style={[themedStyles.centerContent, { flex: 1 }]}>
          <ActivityIndicator size="large" color={currentColors.primary} />
          <Text style={[themedStyles.textSecondary, { marginTop: 16 }]}>
            Loading camera...
          </Text>
        </View>
      );
    }

    const { BarCodeScanner } = scannerRef.current;

    return (
      <View style={{ flex: 1 }}>
        <BarCodeScanner
          onBarCodeScanned={scannedData ? undefined : handleBarCodeScanned}
          style={{ flex: 1 }}
        />
        
        <View style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          backgroundColor: currentColors.backgroundAlt + 'E6',
          borderRadius: 12,
          padding: 16,
        }}>
          <Text style={[themedStyles.text, { textAlign: 'center', marginBottom: 12 }]}>
            Point your camera at a QR code to scan
          </Text>
          <Button
            text="Cancel Scanning"
            onPress={() => setScanMode(false)}
            variant="outline"
          />
        </View>
      </View>
    );
  };

  if (scanMode) {
    return (
      <View style={themedStyles.container}>
        <StandardHeader
          title="Scan QR Code"
          onLeftPress={() => setScanMode(false)}
          showRightIcon={false}
        />
        {renderScanner()}
      </View>
    );
  }

  return (
    <View style={themedStyles.container}>
      <StandardHeader
        title="Import Budget"
        onLeftPress={() => router.back()}
        showRightIcon={false}
      />

      <ScrollView style={themedStyles.content} contentContainerStyle={themedStyles.scrollContent}>
        {/* Import Mode Selection */}
        <View style={themedStyles.card}>
          <Text style={[themedStyles.subtitle, { marginBottom: 16 }]}>
            Import Method
          </Text>
          
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <TouchableOpacity
              style={[
                themedStyles.button,
                {
                  flex: 1,
                  backgroundColor: importMode === 'qr' ? currentColors.primary : currentColors.backgroundAlt,
                  borderWidth: 1,
                  borderColor: importMode === 'qr' ? currentColors.primary : currentColors.border,
                },
              ]}
              onPress={() => setImportMode('qr')}
              disabled={isImporting}
            >
              <Text style={[
                themedStyles.buttonText,
                { color: importMode === 'qr' ? currentColors.background : currentColors.text }
              ]}>
                QR Code / Link
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                themedStyles.button,
                {
                  flex: 1,
                  backgroundColor: importMode === 'file' ? currentColors.primary : currentColors.backgroundAlt,
                  borderWidth: 1,
                  borderColor: importMode === 'file' ? currentColors.primary : currentColors.border,
                },
              ]}
              onPress={() => setImportMode('file')}
              disabled={isImporting}
            >
              <Text style={[
                themedStyles.buttonText,
                { color: importMode === 'file' ? currentColors.background : currentColors.text }
              ]}>
                Backup File
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* QR Code / Link Import */}
        {importMode === 'qr' && (
          <View style={themedStyles.card}>
            <Text style={[themedStyles.subtitle, { marginBottom: 8 }]}>
              Import from QR Code or Link
            </Text>
            <Text style={[themedStyles.textSecondary, { marginBottom: 16 }]}>
              Scan a QR code or paste the budget data to import a shared budget.
            </Text>

            <Text style={[themedStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
              QR Code Data or Link:
            </Text>
            
            <TextInput
              style={[themedStyles.input, { minHeight: 80 }]}
              placeholder="Paste QR code data or link here..."
              placeholderTextColor={currentColors.textSecondary}
              value={inputValue}
              onChangeText={setInputValue}
              multiline
              textAlignVertical="top"
              editable={!isImporting}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Button
                  text="Paste from Clipboard"
                  onPress={handlePasteFromClipboard}
                  disabled={isImporting}
                  variant="outline"
                />
              </View>
              
              {Platform.OS !== 'web' && (
                <View style={{ flex: 1 }}>
                  <Button
                    text="Scan QR Code"
                    onPress={() => setScanMode(true)}
                    disabled={isImporting}
                    variant="outline"
                  />
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Button
                  text="Clear"
                  onPress={() => setInputValue('')}
                  disabled={isImporting}
                  variant="outline"
                />
              </View>
              <View style={{ flex: 2 }}>
                <Button
                  text={isImporting ? 'Importing...' : 'Import Budget'}
                  onPress={() => handleQRImport(inputValue)}
                  disabled={!inputValue.trim() || isImporting}
                  variant="primary"
                />
              </View>
            </View>
          </View>
        )}

        {/* File Import */}
        {importMode === 'file' && (
          <View style={themedStyles.card}>
            <Text style={[themedStyles.subtitle, { marginBottom: 8 }]}>
              Import from Backup File
            </Text>
            <Text style={[themedStyles.textSecondary, { marginBottom: 16 }]}>
              Select a backup file (.json) to import one or more budgets.
            </Text>

            {!selectedFile ? (
              <Button
                text="Select Backup File"
                onPress={handleSelectFile}
                disabled={isImporting}
                variant="outline"
              />
            ) : (
              <View>
                <View style={[themedStyles.card, { backgroundColor: currentColors.success + '10', marginBottom: 16 }]}>
                  <Text style={[themedStyles.text, { fontWeight: '600', marginBottom: 4 }]}>
                    File Selected
                  </Text>
                  <Text style={[themedStyles.textSecondary, { fontSize: 12, marginBottom: 8 }]}>
                    {selectedFile.split('/').pop()}
                  </Text>
                  
                  {fileInfo && (
                    <View>
                      <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>
                        • {fileInfo.budgetCount} budget{fileInfo.budgetCount !== 1 ? 's' : ''}
                      </Text>
                      <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>
                        • Created: {new Date(fileInfo.timestamp).toLocaleDateString()}
                      </Text>
                      {fileInfo.budgetNames && fileInfo.budgetNames.length > 0 && (
                        <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>
                          • Budgets: {fileInfo.budgetNames.join(', ')}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
                
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      text="Select Different File"
                      onPress={handleSelectFile}
                      disabled={isImporting}
                      variant="outline"
                    />
                  </View>
                  <View style={{ flex: 2 }}>
                    <Button
                      text={isImporting ? 'Importing...' : 'Import Backup'}
                      onPress={handleFileImport}
                      disabled={isImporting}
                      variant="primary"
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Help Section */}
        <View style={themedStyles.card}>
          <Text style={[themedStyles.subtitle, { marginBottom: 8 }]}>
            How to Import
          </Text>
          
          {importMode === 'qr' ? (
            <View>
              <Text style={[themedStyles.textSecondary, { marginBottom: 12 }]}>
                To import from QR code or link:
              </Text>
              <Text style={[themedStyles.textSecondary, { marginBottom: 8 }]}>
                1. Get a QR code from someone sharing their budget
              </Text>
              <Text style={[themedStyles.textSecondary, { marginBottom: 8 }]}>
                2. Either scan the QR code with your camera or copy the QR data text
              </Text>
              <Text style={[themedStyles.textSecondary, { marginBottom: 8 }]}>
                3. Paste the data in the field above and tap "Import Budget"
              </Text>
              <Text style={[themedStyles.textSecondary, { marginBottom: 8 }]}>
                4. The budget will be created and added to your budgets list
              </Text>
            </View>
          ) : (
            <View>
              <Text style={[themedStyles.textSecondary, { marginBottom: 12 }]}>
                To import from backup file:
              </Text>
              <Text style={[themedStyles.textSecondary, { marginBottom: 8 }]}>
                1. Tap "Select Backup File" to choose a .json backup file
              </Text>
              <Text style={[themedStyles.textSecondary, { marginBottom: 8 }]}>
                2. Review the file information to confirm it's the right backup
              </Text>
              <Text style={[themedStyles.textSecondary, { marginBottom: 8 }]}>
                3. Tap "Import Backup" to import all budgets from the file
              </Text>
              <Text style={[themedStyles.textSecondary, { marginBottom: 8 }]}>
                4. All budgets will be added to your budgets list with "(Imported)" suffix
              </Text>
            </View>
          )}
          
          <View style={[themedStyles.card, { backgroundColor: currentColors.primary + '10', marginTop: 12 }]}>
            <Text style={[themedStyles.text, { fontWeight: '600', marginBottom: 4 }]}>
              Fully Offline
            </Text>
            <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>
              This app is completely self-contained. No internet connection is required for importing or sharing budgets.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
