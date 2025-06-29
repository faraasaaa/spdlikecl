import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { storageService } from './storageService';
import { spotifyApi } from './spotifyApi';

export interface DownloadedSong {
  id: string;
  name: string;
  artists: string;
  album: string;
  coverUrl: string;
  localPath: string;
  downloadedAt: number;
  duration?: number;
  fileSize?: number;
}

export interface DownloadResponse {
  album: string;
  artist: string;
  chat_id: number;
  download_link: string;
  expires_in_seconds: number;
  file_id: string;
  file_type: string;
  file_unique_id: string;
  message_id: number;
  spotify_cover_url: string;
  spotify_track_id: string;
  title: string;
}

export interface DownloadErrorResponse {
  error: string;
}

class DownloadService {
  private downloadedSongs: Map<string, DownloadedSong> = new Map();
  private listeners: Set<() => void> = new Set();
  private baseUrl = 'https://conventional-malena-noneoool-355b1774.koyeb.app';
  private needSongsUrl = 'https://faras1334.pythonanywhere.com';
  private currentlyDownloading: Set<string> = new Set(); // Track songs being downloaded

  constructor() {
    this.loadDownloadedSongs();
  }

  // Add listener for download state changes
  addListener(callback: () => void) {
    this.listeners.add(callback);
  }

  removeListener(callback: () => void) {
    this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback());
  }

  private async loadDownloadedSongs() {
    try {
      const saved = await storageService.loadData<DownloadedSong[]>('downloaded_songs');
      if (saved) {
        saved.forEach(song => {
          this.downloadedSongs.set(song.id, song);
        });
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error loading downloaded songs:', error);
    }
  }

  private async saveDownloadedSongs() {
    try {
      const songs = Array.from(this.downloadedSongs.values());
      await storageService.saveData('downloaded_songs', songs);
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving downloaded songs:', error);
    }
  }

  async downloadSong(trackId: string): Promise<{ success: boolean; message: string; song?: DownloadedSong }> {
    try {
      // Check if already downloaded
      if (this.downloadedSongs.has(trackId)) {
        return {
          success: false,
          message: 'Song already downloaded',
          song: this.downloadedSongs.get(trackId)
        };
      }

      // Check if currently downloading
      if (this.currentlyDownloading.has(trackId)) {
        return {
          success: false,
          message: 'Song is already being downloaded'
        };
      }

      // Check if any other song is currently downloading
      if (this.currentlyDownloading.size > 0) {
        return {
          success: false,
          message: 'Another song is currently downloading. Please wait for it to complete.'
        };
      }

      // Mark as downloading
      this.currentlyDownloading.add(trackId);
      this.notifyListeners();

      // Get download information from the new API
      const downloadData = await this.getDownloadInfo(trackId);
      
      if (!downloadData) {
        // Song not found, send to needs songs API
        await this.sendToNeedSongs(trackId);
        this.currentlyDownloading.delete(trackId);
        this.notifyListeners();
        return {
          success: false,
          message: 'Song not available yet. We\'ll add it to our database soon!'
        };
      }

      // For web platform, we'll simulate the download
      let localPath: string;
      if (Platform.OS === 'web') {
        // Trigger browser download
        const link = document.createElement('a');
        link.href = downloadData.download_link;
        link.download = `${downloadData.title}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Use a placeholder path for web
        localPath = `web_download_${trackId}`;
      } else {
        // Download the file for mobile
        const downloadedPath = await this.downloadFile(
          downloadData.download_link,
          `${downloadData.title}.mp3`,
          trackId
        );

        if (!downloadedPath) {
          this.currentlyDownloading.delete(trackId);
          this.notifyListeners();
          return {
            success: false,
            message: 'Failed to download file'
          };
        }
        localPath = downloadedPath;
      }

      // Download cover image
      const coverPath = await this.downloadCoverImage(downloadData.spotify_cover_url, trackId);

      // Create song metadata using API response
      const song: DownloadedSong = {
        id: trackId,
        name: downloadData.title,
        artists: downloadData.artist,
        album: downloadData.album,
        coverUrl: coverPath || downloadData.spotify_cover_url,
        localPath,
        downloadedAt: Date.now(),
      };

      // Save to local storage
      this.downloadedSongs.set(trackId, song);
      await this.saveDownloadedSongs();

      // Remove from downloading set
      this.currentlyDownloading.delete(trackId);
      this.notifyListeners();

      return {
        success: true,
        message: 'Song downloaded successfully',
        song
      };
    } catch (error) {
      console.error('Error downloading song:', error);
      // Make sure to remove from downloading set on error
      this.currentlyDownloading.delete(trackId);
      this.notifyListeners();
      return {
        success: false,
        message: 'Download failed: ' + (error as Error).message
      };
    }
  }

  private async getDownloadInfo(trackId: string): Promise<DownloadResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/download?id=${trackId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Track not found
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if response contains error
      if (data.error) {
        if (data.error === 'Track with the specified Spotify ID not found.') {
          return null;
        }
        throw new Error(data.error);
      }

      return data as DownloadResponse;
    } catch (error) {
      console.error('Error getting download info:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  private async sendToNeedSongs(trackId: string): Promise<void> {
    try {
      const response = await fetch(`${this.needSongsUrl}/needsongs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spotify: trackId
        }),
      });

      if (response.ok) {
        console.log(`Successfully sent track ${trackId} to needs songs API`);
      } else {
        console.warn(`Failed to send track ${trackId} to needs songs API: ${response.status}`);
      }
    } catch (error) {
      console.error('Error sending to needs songs API:', error);
      // Don't throw error here as it's not critical for the user experience
    }
  }

  private async downloadFile(url: string, filename: string, trackId: string): Promise<string | null> {
    try {
      const documentsDir = FileSystem.documentDirectory;
      const musicDir = `${documentsDir}music/`;
      
      // Ensure music directory exists
      const dirInfo = await FileSystem.getInfoAsync(musicDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(musicDir, { intermediates: true });
      }

      // Sanitize filename
      const sanitizedFilename = filename.replace(/[^a-z0-9\.\-_]/gi, '_');
      const localPath = `${musicDir}${sanitizedFilename}`;
      const downloadResult = await FileSystem.downloadAsync(url, localPath);
      
      // Check if download was successful
      if (downloadResult.status !== 200) {
        console.error('Download failed with status:', downloadResult.status);
        // Clean up partial download if it exists
        try {
          await FileSystem.deleteAsync(localPath);
        } catch (cleanupError) {
          console.error('Error cleaning up failed download:', cleanupError);
        }
        return null;
      }
      
      return downloadResult.uri;
    } catch (error) {
      console.error('Error downloading file:', error);
      return null;
    }
  }

  private async downloadCoverImage(url: string, trackId: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // For web, just return the original URL
        return url;
      } else {
        const documentsDir = FileSystem.documentDirectory;
        const coversDir = `${documentsDir}covers/`;
        
        // Ensure covers directory exists
        const dirInfo = await FileSystem.getInfoAsync(coversDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(coversDir, { intermediates: true });
        }

        const localPath = `${coversDir}${trackId}.jpg`;
        const downloadResult = await FileSystem.downloadAsync(url, localPath);
        
        // Check if download was successful
        if (downloadResult.status !== 200) {
          console.error('Cover image download failed with status:', downloadResult.status);
          // Clean up partial download if it exists
          try {
            await FileSystem.deleteAsync(localPath);
          } catch (cleanupError) {
            console.error('Error cleaning up failed cover download:', cleanupError);
          }
          return null;
        }
        
        return downloadResult.uri;
      }
    } catch (error) {
      console.error('Error downloading cover image:', error);
      return null;
    }
  }

  isDownloaded(trackId: string): boolean {
    return this.downloadedSongs.has(trackId);
  }

  isDownloading(trackId: string): boolean {
    return this.currentlyDownloading.has(trackId);
  }

  getDownloadedSong(trackId: string): DownloadedSong | undefined {
    return this.downloadedSongs.get(trackId);
  }

  getAllDownloadedSongs(): DownloadedSong[] {
    return Array.from(this.downloadedSongs.values()).sort((a, b) => b.downloadedAt - a.downloadedAt);
  }

  async deleteSong(trackId: string): Promise<boolean> {
    try {
      const song = this.downloadedSongs.get(trackId);
      if (!song) return false;

      // Delete files on mobile
      if (Platform.OS !== 'web' && song.localPath.startsWith('file://')) {
        try {
          await FileSystem.deleteAsync(song.localPath);
          if (song.coverUrl.startsWith('file://')) {
            await FileSystem.deleteAsync(song.coverUrl);
          }
        } catch (error) {
          console.error('Error deleting files:', error);
        }
      }

      // Remove from memory and storage
      this.downloadedSongs.delete(trackId);
      await this.saveDownloadedSongs();

      return true;
    } catch (error) {
      console.error('Error deleting song:', error);
      return false;
    }
  }

  async clearAllDownloads(): Promise<boolean> {
    try {
      // Delete all files on mobile
      if (Platform.OS !== 'web') {
        const documentsDir = FileSystem.documentDirectory;
        const musicDir = `${documentsDir}music/`;
        const coversDir = `${documentsDir}covers/`;

        try {
          await FileSystem.deleteAsync(musicDir);
          await FileSystem.deleteAsync(coversDir);
        } catch (error) {
          console.error('Error deleting directories:', error);
        }
      }

      // Clear memory and storage
      this.downloadedSongs.clear();
      await storageService.removeData('downloaded_songs');
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('Error clearing downloads:', error);
      return false;
    }
  }
}

export const downloadService = new DownloadService();