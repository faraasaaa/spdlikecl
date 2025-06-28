import { storageService } from './storageService';
import type { DownloadedSong } from './downloadService';

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  songs: DownloadedSong[];
  createdAt: number;
  updatedAt: number;
}

export interface CreatePlaylistData {
  name: string;
  description?: string;
  coverUrl?: string;
}

class PlaylistService {
  private playlists: Map<string, Playlist> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadPlaylists();
  }

  addListener(callback: () => void) {
    this.listeners.add(callback);
  }

  removeListener(callback: () => void) {
    this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback());
  }

  private async loadPlaylists() {
    try {
      const saved = await storageService.loadData<Playlist[]>('playlists');
      if (saved) {
        saved.forEach(playlist => {
          this.playlists.set(playlist.id, playlist);
        });
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error loading playlists:', error);
    }
  }

  private async savePlaylists() {
    try {
      const playlists = Array.from(this.playlists.values());
      await storageService.saveData('playlists', playlists);
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving playlists:', error);
    }
  }

  private generateId(): string {
    return `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async createPlaylist(data: CreatePlaylistData): Promise<Playlist> {
    const playlist: Playlist = {
      id: this.generateId(),
      name: data.name,
      description: data.description,
      coverUrl: data.coverUrl || 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=300',
      songs: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.playlists.set(playlist.id, playlist);
    await this.savePlaylists();
    return playlist;
  }

  async updatePlaylist(id: string, updates: Partial<CreatePlaylistData>): Promise<boolean> {
    const playlist = this.playlists.get(id);
    if (!playlist) return false;

    const updatedPlaylist = {
      ...playlist,
      ...updates,
      updatedAt: Date.now(),
    };

    this.playlists.set(id, updatedPlaylist);
    await this.savePlaylists();
    return true;
  }

  async deletePlaylist(id: string): Promise<boolean> {
    const deleted = this.playlists.delete(id);
    if (deleted) {
      await this.savePlaylists();
    }
    return deleted;
  }

  async addSongToPlaylist(playlistId: string, song: DownloadedSong): Promise<boolean> {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) return false;

    // Check if song is already in playlist
    const songExists = playlist.songs.some(s => s.id === song.id);
    if (songExists) return false;

    playlist.songs.push(song);
    playlist.updatedAt = Date.now();
    
    this.playlists.set(playlistId, playlist);
    await this.savePlaylists();
    return true;
  }

  async removeSongFromPlaylist(playlistId: string, songId: string): Promise<boolean> {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) return false;

    const initialLength = playlist.songs.length;
    playlist.songs = playlist.songs.filter(song => song.id !== songId);
    
    if (playlist.songs.length === initialLength) return false;

    playlist.updatedAt = Date.now();
    this.playlists.set(playlistId, playlist);
    await this.savePlaylists();
    return true;
  }

  async reorderPlaylistSongs(playlistId: string, newOrder: DownloadedSong[]): Promise<boolean> {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) return false;

    playlist.songs = newOrder;
    playlist.updatedAt = Date.now();
    
    this.playlists.set(playlistId, playlist);
    await this.savePlaylists();
    return true;
  }

  getPlaylist(id: string): Playlist | undefined {
    return this.playlists.get(id);
  }

  getAllPlaylists(): Playlist[] {
    return Array.from(this.playlists.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getPlaylistsContainingSong(songId: string): Playlist[] {
    return Array.from(this.playlists.values()).filter(playlist =>
      playlist.songs.some(song => song.id === songId)
    );
  }

  async duplicatePlaylist(id: string, newName?: string): Promise<Playlist | null> {
    const originalPlaylist = this.playlists.get(id);
    if (!originalPlaylist) return null;

    const duplicatedPlaylist: Playlist = {
      ...originalPlaylist,
      id: this.generateId(),
      name: newName || `${originalPlaylist.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.playlists.set(duplicatedPlaylist.id, duplicatedPlaylist);
    await this.savePlaylists();
    return duplicatedPlaylist;
  }

  getPlaylistStats(id: string): { totalSongs: number; totalDuration: number } | null {
    const playlist = this.playlists.get(id);
    if (!playlist) return null;

    const totalSongs = playlist.songs.length;
    const totalDuration = playlist.songs.reduce((total, song) => total + (song.duration || 0), 0);

    return { totalSongs, totalDuration };
  }
}

export const playlistService = new PlaylistService();