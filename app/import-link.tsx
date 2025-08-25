
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useBudgetData } from '../hooks/useBudgetData';
import { useTheme } from '../hooks/useTheme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useToast } from '../hooks/useToast';
import { Budget } from '../types/budget';
import { fetchSharedBudget } from '../utils/shareLink';
import { loadAppData, saveAppData } from '../utils/storage';
import * as Clipboard from 'expo-clipboard';
import Icon from '../components/Icon';
import StandardHeader from '../components/StandardHeader';
import Button from '../components/Button';

// Dynamic import for barcode scanner (only available on mobile)
type ScannerModule = {
  BarCodeScanner: any;
  requestPermissionsAsync: () => Promise<{ status: string }>;
};

export default function ImportLinkScreen() {
  const { addBudget, setActiveBudget } = useBudgetData();
  const { currentColors } = useTheme();
  const { themedStyles, themedButtonStyles } = useThemedStyles();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ link?: string }>();
  
  const [inputValue, setInputValue] = useState(params.link || '');
  const [isImporting, setIsImporting] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const scannerRef = useRef<ScannerModule | null>(null);

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

  const handleImport = useCallback(async (data: string) => {
    if (!data.trim()) {
      showToast('Please enter a link or QR code data', 'error');
      return;
    }

    setIsImporting(true);

    try {
      console.log('Importing budget from:', data);
      const result = await fetchSharedBudget(data.trim());
      
      console.log('Fetched budget:', result);
      
      // Create a new budget with the imported data
      const budgetName = result.budget.name || 'Imported Budget';
      const addResult = await addBudget(budgetName);
      
      if (!addResult.success) {
        throw new Error('Failed to create budget');
      }

      // Get the newly created budget ID and update it with the imported data
      const appData = await loadAppData();
      const newBudget = appData.budgets.find(b => b.name === budgetName);
      
      if (!newBudget) {
        throw new Error('Failed to find newly created budget');
      }

      // Update the budget with imported data
      const updatedBudget: Budget = {
        ...newBudget,
        people: result.budget.people,
        expenses: result.budget.expenses,
        householdSettings: result.budget.householdSettings,
      };

      // Save the updated budget
      const updatedAppData = {
        ...appData,
        budgets: appData.budgets.map(b => b.id === newBudget.id ? updatedBudget : b),
      };

      await saveAppData(updatedAppData);

      // Set as active budget
      await setActiveBudget(newBudget.id);

      showToast(`Budget "${budgetName}" imported successfully!`, 'success');
      router.replace('/');
      
    } catch (error) {
      console.error('Import error:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to import budget',
        'error'
      );
    } finally {
      setIsImporting(false);
    }
  }, [addBudget, setActiveBudget, showToast]);

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
            style={[themedButtonStyles.outline, { borderWidth: 0 }]}
            textStyle={{ color: currentColors.primary }}
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
            style={[themedButtonStyles.outline, { borderWidth: 0 }]}
            textStyle={{ color: currentColors.primary }}
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

      <ScrollView style={themedStyles.content} contentContainerStyle={[themedStyles.scrollContent, { paddingHorizontal: 0, paddingTop: 16 }]}>
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
                style={[themedButtonStyles.outline, { borderWidth: 0 }]}
                textStyle={{ color: currentColors.primary }}
              />
            </View>
            
            {Platform.OS !== 'web' && (
              <View style={{ flex: 1 }}>
                <Button
                  text="Scan QR Code"
                  onPress={() => setScanMode(true)}
                  disabled={isImporting}
                  style={[themedButtonStyles.outline, { borderWidth: 0 }]}
                  textStyle={{ color: currentColors.primary }}
                />
              </View>
            )}
          </View>

          <Button
            text={isImporting ? 'Importing...' : 'Import Budget'}
            onPress={() => handleImport(inputValue)}
            disabled={!inputValue.trim() || isImporting}
            style={[themedButtonStyles.primary, { borderWidth: 0 }]}
          />
        </View>

        <View style={themedStyles.card}>
          <Text style={[themedStyles.subtitle, { marginBottom: 8 }]}>
            How to Import
          </Text>
          <Text style={[themedStyles.textSecondary, { marginBottom: 12 }]}>
            To import a budget:
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
            4. The budget will be created and set as your active budget
          </Text>
          
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
