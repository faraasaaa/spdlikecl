import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import type { DownloadedSong } from './downloadService';

export interface PlaybackStatus {
  isPlaying: boolean;
  currentSong: DownloadedSong | null;
  position: number;
  duration: number;
  isLoaded: boolean;
}

class AudioService {
  private sound: Audio.Sound | null = null;
  private currentSong: DownloadedSong | null = null;
  private isPlaying: boolean = false;
  private position: number = 0;
  private duration: number = 0;
  private listeners: Set<(status: PlaybackStatus) => void> = new Set();
  private positionUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeAudio();
  }

  private async initializeAudio() {
    try {
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      }
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }

  addListener(callback: (status: PlaybackStatus) => void) {
    this.listeners.add(callback);
    // Immediately call with current status
    callback(this.getPlaybackStatus());
  }

  removeListener(callback: (status: PlaybackStatus) => void) {
    this.listeners.delete(callback);
  }

  private notifyListeners() {
    const status = this.getPlaybackStatus();
    this.listeners.forEach(callback => callback(status));
  }

  private getPlaybackStatus(): PlaybackStatus {
    return {
      isPlaying: this.isPlaying,
      currentSong: this.currentSong,
      position: this.position,
      duration: this.duration,
      isLoaded: this.sound !== null,
    };
  }

  private startPositionUpdates() {
    if (this.positionUpdateInterval) {
      clearInterval(this.positionUpdateInterval);
    }

    // Update every 100ms for smooth progress bar
    this.positionUpdateInterval = setInterval(async () => {
      if (this.sound && this.isPlaying) {
        try {
          const status = await this.sound.getStatusAsync();
          if (status.isLoaded) {
            this.position = status.positionMillis || 0;
            this.duration = status.durationMillis || 0;
            this.notifyListeners();

            // Check if song finished
            if (status.didJustFinish) {
              this.isPlaying = false;
              this.position = 0;
              this.notifyListeners();
            }
          }
        } catch (error) {
          console.error('Error getting playback status:', error);
        }
      }
    }, 100); // Update every 100ms for smooth animation
  }

  private stopPositionUpdates() {
    if (this.positionUpdateInterval) {
      clearInterval(this.positionUpdateInterval);
      this.positionUpdateInterval = null;
    }
  }

  async playSong(song: DownloadedSong): Promise<boolean> {
    try {
      // Stop current song if playing
      await this.stop();

      // For web platform, handle differently
      if (Platform.OS === 'web') {
        if (song.localPath.startsWith('web_download_')) {
          // For web downloads, we can't actually play the file
          console.log('Web playback not supported for downloaded files');
          return false;
        }
      }

      // Load and play the audio file
      const { sound } = await Audio.Sound.createAsync(
        { uri: song.localPath },
        { shouldPlay: true },
        this.onPlaybackStatusUpdate.bind(this)
      );

      this.sound = sound;
      this.currentSong = song;
      this.isPlaying = true;
      this.position = 0;
      
      // Get initial duration
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        this.duration = status.durationMillis || 0;
      }

      this.startPositionUpdates();
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('Error playing song:', error);
      return false;
    }
  }

  async pause(): Promise<void> {
    try {
      if (this.sound && this.isPlaying) {
        await this.sound.pauseAsync();
        this.isPlaying = false;
        this.stopPositionUpdates();
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error pausing song:', error);
    }
  }

  async resume(): Promise<void> {
    try {
      if (this.sound && !this.isPlaying) {
        await this.sound.playAsync();
        this.isPlaying = true;
        this.startPositionUpdates();
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error resuming song:', error);
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
        this.currentSong = null;
        this.isPlaying = false;
        this.position = 0;
        this.duration = 0;
        this.stopPositionUpdates();
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error stopping song:', error);
    }
  }

  async seekTo(position: number): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.setPositionAsync(position);
        this.position = position;
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }

  async skipToNext(): Promise<void> {
    // This will be handled by the playback service
    // For now, just stop the current song
    await this.stop();
  }

  async skipToPrevious(): Promise<void> {
    // This will be handled by the playback service
    // For now, restart the current song
    if (this.currentSong) {
      await this.seekTo(0);
    }
  }

  private onPlaybackStatusUpdate(status: any) {
    if (status.isLoaded) {
      this.position = status.positionMillis || 0;
      this.duration = status.durationMillis || 0;
      
      if (status.didJustFinish) {
        this.isPlaying = false;
        this.position = 0;
        this.stopPositionUpdates();
        this.notifyListeners();
      }
    }
    
    // Handle playback errors
    if (status.error) {
      console.error('Playback error occurred:', status.error);
      this.stop();
    }
  }

  getCurrentSong(): DownloadedSong | null {
    return this.currentSong;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getPosition(): number {
    return this.position;
  }

  getDuration(): number {
    return this.duration;
  }
}

export const audioService = new AudioService();