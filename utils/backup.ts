
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { Budget, AppDataV2 } from '../types/budget';
import { loadAppData, saveAppData, getActiveBudget, backupData, restoreData } from './storage';

export interface BackupData {
  version: string;
  timestamp: number;
  budgets: Budget[];
  metadata: {
    appVersion: string;
    platform: string;
    totalBudgets: number;
  };
}

// Create a backup of a specific budget or all budgets
export const createBackup = async (budgetId?: string): Promise<{ success: boolean; filePath?: string; error?: string }> => {
  try {
    console.log('backup: Creating backup for budgetId:', budgetId);
    
    const appData = await loadAppData();
    
    let budgetsToBackup: Budget[];
    let fileName: string;
    
    if (budgetId) {
      // Backup specific budget
      const budget = appData.budgets.find(b => b.id === budgetId);
      if (!budget) {
        return { success: false, error: 'Budget not found' };
      }
      budgetsToBackup = [budget];
      fileName = `budget_${budget.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
    } else {
      // Backup all budgets
      budgetsToBackup = appData.budgets;
      fileName = `all_budgets_${Date.now()}.json`;
    }
    
    const backupData: BackupData = {
      version: '2.0',
      timestamp: Date.now(),
      budgets: budgetsToBackup,
      metadata: {
        appVersion: '1.0.0',
        platform: Platform.OS,
        totalBudgets: budgetsToBackup.length,
      },
    };
    
    const jsonString = JSON.stringify(backupData, null, 2);
    
    // Create backup file in the document directory
    const documentsDir = FileSystem.documentDirectory;
    if (!documentsDir) {
      return { success: false, error: 'Document directory not available' };
    }
    
    const filePath = `${documentsDir}${fileName}`;
    
    await FileSystem.writeAsStringAsync(filePath, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    console.log('backup: Backup created successfully at:', filePath);
    
    return { success: true, filePath };
  } catch (error) {
    console.error('backup: Error creating backup:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

// Import a backup from a file
export const importBackup = async (filePath: string): Promise<{ success: boolean; importedBudgets?: Budget[]; error?: string }> => {
  try {
    console.log('backup: Importing backup from:', filePath);
    
    // Read the file content
    const fileContent = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    // Parse the backup data
    const backupData: BackupData = JSON.parse(fileContent);
    
    // Validate backup data structure
    if (!backupData.budgets || !Array.isArray(backupData.budgets)) {
      return { success: false, error: 'Invalid backup file format - missing or invalid budgets array' };
    }
    
    if (backupData.budgets.length === 0) {
      return { success: false, error: 'Backup file contains no budgets' };
    }
    
    // Validate each budget has required fields
    for (let i = 0; i < backupData.budgets.length; i++) {
      const budget = backupData.budgets[i];
      if (!budget || typeof budget !== 'object') {
        return { success: false, error: `Invalid budget data at index ${i}` };
      }
      
      if (!budget.name || typeof budget.name !== 'string') {
        return { success: false, error: `Budget at index ${i} missing valid name` };
      }
      
      if (!Array.isArray(budget.people)) {
        return { success: false, error: `Budget "${budget.name}" missing valid people array` };
      }
      
      if (!Array.isArray(budget.expenses)) {
        return { success: false, error: `Budget "${budget.name}" missing valid expenses array` };
      }
      
      if (!budget.householdSettings || typeof budget.householdSettings !== 'object') {
        return { success: false, error: `Budget "${budget.name}" missing valid household settings` };
      }
    }
    
    // Get current app data
    const currentAppData = await loadAppData();
    
    // Generate new IDs for imported budgets to avoid conflicts
    const importedBudgets: Budget[] = backupData.budgets.map(budget => {
      const now = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      
      // Generate new IDs for people and their income
      const newPeople = budget.people.map(person => {
        const newPersonId = `person_${now}_${Math.random().toString(36).substr(2, 9)}`;
        const newIncome = person.income.map(income => ({
          ...income,
          id: `income_${now}_${Math.random().toString(36).substr(2, 9)}`,
          personId: newPersonId,
        }));
        
        return {
          ...person,
          id: newPersonId,
          income: newIncome,
        };
      });
      
      // Generate new IDs for expenses and update personId references
      const newExpenses = budget.expenses.map(expense => {
        let newPersonId = expense.personId;
        
        // Update personId if it's a personal expense
        if (expense.category === 'personal' && expense.personId) {
          const originalPersonIndex = budget.people.findIndex(p => p.id === expense.personId);
          if (originalPersonIndex !== -1 && newPeople[originalPersonIndex]) {
            newPersonId = newPeople[originalPersonIndex].id;
          } else {
            // Assign to first person if original not found
            newPersonId = newPeople.length > 0 ? newPeople[0].id : undefined;
          }
        } else if (expense.category === 'household' && expense.personId) {
          // For household expenses, update personId if it exists
          const originalPersonIndex = budget.people.findIndex(p => p.id === expense.personId);
          if (originalPersonIndex !== -1 && newPeople[originalPersonIndex]) {
            newPersonId = newPeople[originalPersonIndex].id;
          } else {
            // Clear personId for household expense if original person not found
            newPersonId = undefined;
          }
        }
        
        return {
          ...expense,
          id: `expense_${now}_${Math.random().toString(36).substr(2, 9)}`,
          personId: newPersonId,
        };
      });
      
      return {
        ...budget,
        id: `budget_${now}_${randomId}`,
        name: `${budget.name} (Imported)`,
        people: newPeople,
        expenses: newExpenses,
        createdAt: now,
        modifiedAt: now,
      };
    });
    
    // Add imported budgets to current app data
    const newAppData: AppDataV2 = {
      ...currentAppData,
      budgets: [...currentAppData.budgets, ...importedBudgets],
    };
    
    // Save the updated app data
    const saveResult = await saveAppData(newAppData);
    
    if (!saveResult.success) {
      return { 
        success: false, 
        error: `Failed to save imported budgets: ${saveResult.error?.message || 'Unknown error'}` 
      };
    }
    
    console.log('backup: Import completed successfully, imported budgets:', importedBudgets.length);
    
    return { 
      success: true, 
      importedBudgets 
    };
  } catch (error) {
    console.error('backup: Error importing backup:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

// Pick a file for import using document picker
export const pickBackupFile = async (): Promise<{ success: boolean; filePath?: string; error?: string }> => {
  try {
    console.log('backup: Opening document picker for backup file');
    
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    
    if (result.canceled) {
      return { success: false, error: 'File selection cancelled' };
    }
    
    if (!result.assets || result.assets.length === 0) {
      return { success: false, error: 'No file selected' };
    }
    
    const file = result.assets[0];
    
    if (!file.uri) {
      return { success: false, error: 'Invalid file selected' };
    }
    
    console.log('backup: File selected:', file.name, file.uri);
    
    return { success: true, filePath: file.uri };
  } catch (error) {
    console.error('backup: Error picking backup file:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

// Share a backup file (for saving to device)
export const shareBackupFile = async (filePath: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('backup: Sharing backup file:', filePath);
    
    if (Platform.OS === 'web') {
      // For web, we'll download the file
      const fileContent = await FileSystem.readAsStringAsync(filePath);
      const blob = new Blob([fileContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filePath.split('/').pop() || 'backup.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return { success: true };
    } else {
      // For mobile, use the sharing API
      const Share = require('react-native').Share;
      
      await Share.share({
        url: filePath,
        title: 'Budget Backup',
        message: 'Budget backup file',
      });
      
      return { success: true };
    }
  } catch (error) {
    console.error('backup: Error sharing backup file:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

// Get backup file info
export const getBackupInfo = async (filePath: string): Promise<{ success: boolean; info?: any; error?: string }> => {
  try {
    const fileContent = await FileSystem.readAsStringAsync(filePath);
    const backupData: BackupData = JSON.parse(fileContent);
    
    return {
      success: true,
      info: {
        version: backupData.version,
        timestamp: backupData.timestamp,
        budgetCount: backupData.budgets.length,
        budgetNames: backupData.budgets.map(b => b.name),
        metadata: backupData.metadata,
      },
    };
  } catch (error) {
    console.error('backup: Error getting backup info:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

// Clean up old backup files (keep only the last 5 backups)
export const cleanupOldBackups = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('backup: Cleaning up old backup files');
    
    const documentsDir = FileSystem.documentDirectory;
    if (!documentsDir) {
      return { success: false, error: 'Document directory not available' };
    }
    
    // Get all files in the documents directory
    const files = await FileSystem.readDirectoryAsync(documentsDir);
    
    // Filter for backup files (JSON files with backup naming pattern)
    const backupFiles = files.filter(file => 
      file.endsWith('.json') && 
      (file.includes('budget_') || file.includes('all_budgets_'))
    );
    
    if (backupFiles.length <= 5) {
      console.log('backup: No cleanup needed, only', backupFiles.length, 'backup files');
      return { success: true };
    }
    
    // Get file info for sorting by creation time
    const fileInfos = await Promise.all(
      backupFiles.map(async (fileName) => {
        const filePath = `${documentsDir}${fileName}`;
        try {
          const info = await FileSystem.getInfoAsync(filePath);
          return {
            fileName,
            filePath,
            modificationTime: info.modificationTime || 0,
          };
        } catch (error) {
          console.warn('backup: Error getting file info for', fileName, error);
          return null;
        }
      })
    );
    
    // Filter out null entries and sort by modification time (newest first)
    const validFiles = fileInfos
      .filter((info): info is NonNullable<typeof info> => info !== null)
      .sort((a, b) => b.modificationTime - a.modificationTime);
    
    // Keep only the 5 newest files, delete the rest
    const filesToDelete = validFiles.slice(5);
    
    for (const fileInfo of filesToDelete) {
      try {
        await FileSystem.deleteAsync(fileInfo.filePath);
        console.log('backup: Deleted old backup file:', fileInfo.fileName);
      } catch (error) {
        console.warn('backup: Error deleting old backup file:', fileInfo.fileName, error);
      }
    }
    
    console.log('backup: Cleanup complete, deleted', filesToDelete.length, 'old backup files');
    return { success: true };
  } catch (error) {
    console.error('backup: Error during cleanup:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};
