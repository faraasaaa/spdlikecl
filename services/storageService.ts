import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export class StorageService {
  private static instance: StorageService;
  
  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // Save data persistently to device storage
  async saveData<T>(key: string, data: T): Promise<boolean> {
    try {
      const jsonData = JSON.stringify(data);
      
      if (Platform.OS === 'web') {
        // For web, use localStorage as persistent storage
        localStorage.setItem(`persistent_${key}`, jsonData);
      } else {
        // For mobile, use AsyncStorage for persistent storage
        await AsyncStorage.setItem(`persistent_${key}`, jsonData);
      }
      
      return true;
    } catch (error) {
      console.error('Error saving data to device storage:', error);
      return false;
    }
  }

  // Load data from device storage
  async loadData<T>(key: string): Promise<T | null> {
    try {
      let jsonData: string | null = null;
      
      if (Platform.OS === 'web') {
        // For web, use localStorage
        jsonData = localStorage.getItem(`persistent_${key}`);
      } else {
        // For mobile, use AsyncStorage
        jsonData = await AsyncStorage.getItem(`persistent_${key}`);
      }
      
      if (jsonData) {
        return JSON.parse(jsonData) as T;
      }
      
      return null;
    } catch (error) {
      console.error('Error loading data from device storage:', error);
      return null;
    }
  }

  // Remove data from device storage
  async removeData(key: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(`persistent_${key}`);
      } else {
        await AsyncStorage.removeItem(`persistent_${key}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error removing data from device storage:', error);
      return false;
    }
  }

  // Clear all app data from device storage
  async clearAllData(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // Remove all persistent items from localStorage
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('persistent_')) {
            localStorage.removeItem(key);
          }
        });
      } else {
        // Get all keys and remove persistent ones
        const keys = await AsyncStorage.getAllKeys();
        const persistentKeys = keys.filter(key => key.startsWith('persistent_'));
        if (persistentKeys.length > 0) {
          await AsyncStorage.multiRemove(persistentKeys);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing all data from device storage:', error);
      return false;
    }
  }

  // Save file to device storage (for downloaded songs)
  async saveFile(data: Blob | string, fileName: string, directory: string = 'music'): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // For web, we can't save files to device, return a placeholder
        return `web_file_${fileName}`;
      } else {
        // For mobile, use FileSystem
        const documentsDir = FileSystem.documentDirectory;
        const targetDir = `${documentsDir}${directory}/`;
        
        // Ensure directory exists
        const dirInfo = await FileSystem.getInfoAsync(targetDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
        }
        
        const filePath = `${targetDir}${fileName}`;
        
        if (typeof data === 'string') {
          // If data is a string (base64 or text), write it directly
          await FileSystem.writeAsStringAsync(filePath, data);
        } else {
          // If data is a Blob, convert to base64 first
          const reader = new FileReader();
          return new Promise((resolve, reject) => {
            reader.onload = async () => {
              try {
                const base64Data = (reader.result as string).split(',')[1];
                await FileSystem.writeAsStringAsync(filePath, base64Data, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                resolve(filePath);
              } catch (error) {
                reject(error);
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(data);
          });
        }
        
        return filePath;
      }
    } catch (error) {
      console.error('Error saving file to device storage:', error);
      return null;
    }
  }

  // Check if data exists in device storage
  async dataExists(key: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(`persistent_${key}`) !== null;
      } else {
        const data = await AsyncStorage.getItem(`persistent_${key}`);
        return data !== null;
      }
    } catch (error) {
      console.error('Error checking if data exists:', error);
      return false;
    }
  }

  // Get storage info (size, available space, etc.)
  async getStorageInfo(): Promise<{ used: number; available?: number } | null> {
    try {
      if (Platform.OS === 'web') {
        // For web, estimate localStorage usage
        let used = 0;
        for (let key in localStorage) {
          if (key.startsWith('persistent_')) {
            used += localStorage[key].length;
          }
        }
        return { used };
      } else {
        // For mobile, get file system info
        const documentsDir = FileSystem.documentDirectory;
        if (documentsDir) {
          const info = await FileSystem.getInfoAsync(documentsDir);
          return {
            used: info.size || 0,
            available: undefined // AsyncStorage doesn't provide available space info
          };
        }
        return null;
      }
    } catch (error) {
      console.error('Error getting storage info:', error);
      return null;
    }
  }
}

// Export singleton instance
export const storageService = StorageService.getInstance();