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

export interface NewAPIDownloadResponse {
  data: {
    message: string;
    track_info: {
      album: string;
      artist: string;
      title: string;
    };
    upload_url: string;
  };
  status: string;
}

class DownloadService {
  private downloadedSongs: Map<string, DownloadedSong> = new Map();
  private listeners: Set<() => void> = new Set();
  private baseUrl = 'https://conventional-malena-noneoool-355b1774.koyeb.app';

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

      // Get detailed track info from Spotify API
      const spotifyTrack = await spotifyApi.getTrack(trackId);
      if (!spotifyTrack) {
        return {
          success: false,
          message: 'Failed to get track details from Spotify'
        };
      }

      // Construct Spotify URL for the new API
      const spotifyUrl = spotifyTrack.external_urls.spotify;

      // Get download URL from the new API
      const downloadData = await this.getDownloadUrlFromNewAPI(spotifyUrl);
      if (!downloadData || downloadData.status !== 'success') {
        return {
          success: false,
          message: 'Failed to get download URL'
        };
      }

      // Wait 4 seconds as required by the API
      await new Promise(resolve => setTimeout(resolve, 4000));

      // For web platform, we'll simulate the download
      let localPath: string;
      if (Platform.OS === 'web') {
        // Trigger browser download
        const link = document.createElement('a');
        link.href = downloadData.data.upload_url;
        link.download = `${downloadData.data.track_info.title}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Use a placeholder path for web
        localPath = `web_download_${trackId}`;
      } else {
        // Download the file for mobile
        const downloadedPath = await this.downloadFile(
          downloadData.data.upload_url,
          `${downloadData.data.track_info.title}.mp3`,
          trackId
        );

        if (!downloadedPath) {
          return {
            success: false,
            message: 'Failed to download file'
          };
        }
        localPath = downloadedPath;
      }

      // Download cover image from Spotify data
      const coverUrl = spotifyTrack.album.images[0]?.url;
      const coverPath = await this.downloadCoverImage(coverUrl, trackId);

      // Create song metadata using Spotify details
      const song: DownloadedSong = {
        id: trackId,
        name: spotifyTrack.name,
        artists: spotifyTrack.artists.map(artist => artist.name).join(', '),
        album: spotifyTrack.album.name,
        coverUrl: coverPath || coverUrl,
        localPath,
        downloadedAt: Date.now(),
        duration: spotifyTrack.duration_ms,
      };

      // Save to local storage
      this.downloadedSongs.set(trackId, song);
      await this.saveDownloadedSongs();

      return {
        success: true,
        message: 'Song downloaded successfully',
        song
      };
    } catch (error) {
      console.error('Error downloading song:', error);
      return {
        success: false,
        message: 'Download failed: ' + (error as Error).message
      };
    }
  }

  private async getDownloadUrlFromNewAPI(spotifyUrl: string): Promise<NewAPIDownloadResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spotify_url: spotifyUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting download URL from new API:', error);
      return null;
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
      await this.cache.remove('downloaded_songs');
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('Error clearing downloads:', error);
      return false;
    }
  }
}

export const downloadService = new DownloadService();