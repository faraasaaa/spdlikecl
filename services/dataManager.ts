import { storageService } from './storageService';
import { CacheService } from './cacheService';

/**
 * DataManager handles migration and management of app data
 * between cache and persistent storage
 */
export class DataManager {
  private static instance: DataManager;
  private cache: CacheService;
  
  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  constructor() {
    this.cache = new CacheService();
  }

  /**
   * Migrate data from cache to persistent storage
   * This should be called on app startup to ensure data persistence
   */
  async migrateDataToPersistentStorage(): Promise<void> {
    try {
      console.log('Starting data migration to persistent storage...');
      
      // Check if migration has already been done
      const migrationComplete = await storageService.loadData<boolean>('migration_complete');
      if (migrationComplete) {
        console.log('Data migration already completed.');
        return;
      }

      // Migrate playlists
      const cachedPlaylists = await this.cache.get('playlists');
      if (cachedPlaylists && !(await storageService.dataExists('playlists'))) {
        await storageService.saveData('playlists', cachedPlaylists);
        console.log('Migrated playlists to persistent storage');
      }

      // Migrate downloaded songs
      const cachedSongs = await this.cache.get('downloaded_songs');
      if (cachedSongs && !(await storageService.dataExists('downloaded_songs'))) {
        await storageService.saveData('downloaded_songs', cachedSongs);
        console.log('Migrated downloaded songs to persistent storage');
      }

      // Migrate Spotify token
      const cachedToken = await this.cache.get('spotify_access_token');
      if (cachedToken && !(await storageService.dataExists('spotify_access_token'))) {
        await storageService.saveData('spotify_access_token', cachedToken);
        console.log('Migrated Spotify token to persistent storage');
      }

      // Mark migration as complete
      await storageService.saveData('migration_complete', true);
      console.log('Data migration completed successfully');
      
    } catch (error) {
      console.error('Error during data migration:', error);
    }
  }

  /**
   * Clear all app data (both cache and persistent storage)
   * Useful for reset functionality
   */
  async clearAllAppData(): Promise<boolean> {
    try {
      console.log('Clearing all app data...');
      
      // Clear persistent storage
      await storageService.clearAllData();
      
      // Clear cache
      await this.cache.clear();
      
      console.log('All app data cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing app data:', error);
      return false;
    }
  }

  /**
   * Get storage usage information
   */
  async getStorageInfo(): Promise<{
    persistent: { used: number; available?: number } | null;
    cache: { itemCount: number };
  }> {
    try {
      const persistentInfo = await storageService.getStorageInfo();
      
      // Get cache info (approximate)
      const cacheInfo = {
        itemCount: 0 // We can't easily get cache size without exposing internal methods
      };
      
      return {
        persistent: persistentInfo,
        cache: cacheInfo
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        persistent: null,
        cache: { itemCount: 0 }
      };
    }
  }

  /**
   * Backup app data to a JSON object
   */
  async backupAppData(): Promise<any> {
    try {
      const playlists = await storageService.loadData('playlists');
      const downloadedSongs = await storageService.loadData('downloaded_songs');
      
      return {
        playlists,
        downloadedSongs,
        backupDate: new Date().toISOString(),
        version: '1.0'
      };
    } catch (error) {
      console.error('Error creating backup:', error);
      return null;
    }
  }

  /**
   * Restore app data from backup
   */
  async restoreAppData(backupData: any): Promise<boolean> {
    try {
      if (!backupData || !backupData.version) {
        throw new Error('Invalid backup data');
      }

      if (backupData.playlists) {
        await storageService.saveData('playlists', backupData.playlists);
      }

      if (backupData.downloadedSongs) {
        await storageService.saveData('downloaded_songs', backupData.downloadedSongs);
      }

      console.log('App data restored successfully');
      return true;
    } catch (error) {
      console.error('Error restoring backup:', error);
      return false;
    }
  }

  /**
   * Verify data integrity
   */
  async verifyDataIntegrity(): Promise<{
    playlists: boolean;
    downloadedSongs: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    let playlistsOk = true;
    let songsOk = true;

    try {
      // Check playlists
      const playlists = await storageService.loadData('playlists');
      if (playlists && Array.isArray(playlists)) {
        for (const playlist of playlists) {
          if (!playlist.id || !playlist.name || !Array.isArray(playlist.songs)) {
            issues.push(`Invalid playlist structure: ${playlist.id || 'unknown'}`);
            playlistsOk = false;
          }
        }
      }

      // Check downloaded songs
      const songs = await storageService.loadData('downloaded_songs');
      if (songs && Array.isArray(songs)) {
        for (const song of songs) {
          if (!song.id || !song.name || !song.localPath) {
            issues.push(`Invalid song structure: ${song.id || 'unknown'}`);
            songsOk = false;
          }
        }
      }

    } catch (error) {
      issues.push(`Error during integrity check: ${error}`);
      playlistsOk = false;
      songsOk = false;
    }

    return {
      playlists: playlistsOk,
      downloadedSongs: songsOk,
      issues
    };
  }
}

// Export singleton instance
export const dataManager = DataManager.getInstance();