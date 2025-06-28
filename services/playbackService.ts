import { audioService } from './audioService';
import { playlistService, type Playlist } from './playlistService';
import type { DownloadedSong } from './downloadService';

export interface PlaybackQueue {
  songs: DownloadedSong[];
  currentIndex: number;
  isShuffled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  originalOrder?: DownloadedSong[];
}

class PlaybackService {
  private queue: PlaybackQueue = {
    songs: [],
    currentIndex: 0,
    isShuffled: false,
    repeatMode: 'off',
  };
  private listeners: Set<(queue: PlaybackQueue) => void> = new Set();
  private currentPlaylistId: string | null = null;

  constructor() {
    // Set up the song end callback to handle automatic progression
    audioService.setOnSongEndCallback(() => {
      this.handleSongEnd();
    });
  }

  addListener(callback: (queue: PlaybackQueue) => void) {
    this.listeners.add(callback);
    callback(this.queue);
  }

  removeListener(callback: (queue: PlaybackQueue) => void) {
    this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.queue));
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async playPlaylist(playlist: Playlist, startIndex: number = 0): Promise<boolean> {
    if (playlist.songs.length === 0) return false;

    this.currentPlaylistId = playlist.id;
    this.queue = {
      songs: [...playlist.songs],
      currentIndex: startIndex,
      isShuffled: false,
      repeatMode: 'off',
      originalOrder: [...playlist.songs],
    };

    this.notifyListeners();
    return await this.playCurrentSong();
  }

  async playSong(song: DownloadedSong): Promise<boolean> {
    this.currentPlaylistId = null; // Playing a single song, not a playlist
    this.queue = {
      songs: [song],
      currentIndex: 0,
      isShuffled: false,
      repeatMode: 'off',
    };

    this.notifyListeners();
    return await this.playCurrentSong();
  }

  async pause(): Promise<void> {
    await audioService.pause();
    this.notifyListeners();
  }

  async resume(): Promise<void> {
    await audioService.resume();
    this.notifyListeners();
  }

  async stop(): Promise<void> {
    await audioService.stop();
    this.currentPlaylistId = null;
    this.queue = { songs: [], currentIndex: 0, isShuffled: false, repeatMode: 'off' };
    this.notifyListeners();
  }

  async playNext(): Promise<boolean> {
    if (this.queue.songs.length === 0) return false;

    let nextIndex = this.queue.currentIndex + 1;

    if (nextIndex >= this.queue.songs.length) {
      if (this.queue.repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return false;
      }
    }

    this.queue.currentIndex = nextIndex;
    this.notifyListeners();
    return await this.playCurrentSong();
  }

  async playPrevious(): Promise<boolean> {
    if (this.queue.songs.length === 0) return false;

    // If we're more than 3 seconds into the song, restart it
    const currentPosition = audioService.getPosition();
    if (currentPosition > 3000) {
      await audioService.seekTo(0);
      return true;
    }

    let prevIndex = this.queue.currentIndex - 1;

    if (prevIndex < 0) {
      if (this.queue.repeatMode === 'all') {
        prevIndex = this.queue.songs.length - 1;
      } else {
        prevIndex = 0;
        // Just restart the current song if we can't go back
        await audioService.seekTo(0);
        return true;
      }
    }

    this.queue.currentIndex = prevIndex;
    this.notifyListeners();
    return await this.playCurrentSong();
  }

  private async playCurrentSong(): Promise<boolean> {
    const currentSong = this.queue.songs[this.queue.currentIndex];
    if (!currentSong) return false;

    return await audioService.playSong(currentSong);
  }

  private async handleSongEnd() {
    if (this.queue.repeatMode === 'one') {
      // Repeat current song
      await this.playCurrentSong();
    } else {
      // Try to play next song
      const hasNext = await this.playNext();
      if (!hasNext && this.queue.repeatMode === 'off') {
        // End of queue, stop playback
        await audioService.stop();
      }
    }
  }

  toggleShuffle(): boolean {
    if (this.queue.songs.length === 0) return false;

    this.queue.isShuffled = !this.queue.isShuffled;

    if (this.queue.isShuffled) {
      // Save original order if not already saved
      if (!this.queue.originalOrder) {
        this.queue.originalOrder = [...this.queue.songs];
      }

      // Get current song before shuffling
      const currentSong = this.queue.songs[this.queue.currentIndex];
      
      // Shuffle the songs
      this.queue.songs = this.shuffleArray(this.queue.songs);
      
      // Find the new index of the current song
      this.queue.currentIndex = this.queue.songs.findIndex(song => song.id === currentSong.id);
    } else {
      // Restore original order
      if (this.queue.originalOrder) {
        const currentSong = this.queue.songs[this.queue.currentIndex];
        this.queue.songs = [...this.queue.originalOrder];
        this.queue.currentIndex = this.queue.songs.findIndex(song => song.id === currentSong.id);
      }
    }

    this.notifyListeners();
    return this.queue.isShuffled;
  }

  setRepeatMode(mode: 'off' | 'all' | 'one'): void {
    this.queue.repeatMode = mode;
    this.notifyListeners();
  }

  toggleRepeat(): 'off' | 'all' | 'one' {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(this.queue.repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.queue.repeatMode = modes[nextIndex];
    this.notifyListeners();
    return this.queue.repeatMode;
  }

  getCurrentQueue(): PlaybackQueue {
    return this.queue;
  }

  getCurrentPlaylistId(): string | null {
    return this.currentPlaylistId;
  }

  hasNext(): boolean {
    if (this.queue.songs.length === 0) return false;
    return this.queue.currentIndex < this.queue.songs.length - 1 || this.queue.repeatMode === 'all';
  }

  hasPrevious(): boolean {
    if (this.queue.songs.length === 0) return false;
    return this.queue.currentIndex > 0 || this.queue.repeatMode === 'all';
  }

  clearQueue(): void {
    this.queue = {
      songs: [],
      currentIndex: 0,
      isShuffled: false,
      repeatMode: 'off',
    };
    this.currentPlaylistId = null;
    this.notifyListeners();
  }
}

export const playbackService = new PlaybackService();