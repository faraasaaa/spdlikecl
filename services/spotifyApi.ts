import axios from 'axios';
import { Platform } from 'react-native';
import { storageService } from './storageService';
import { CacheService } from './cacheService';
import type { SpotifySearchResponse, SpotifyAuthToken } from '../types/spotify';

class SpotifyAPI {
  private baseURL = 'https://api.spotify.com/v1';
  private authURL = 'https://accounts.spotify.com/api/token';
  private clientId: string;
  private clientSecret: string;
  private cache: CacheService;

  constructor() {
    this.clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET || '';
    this.cache = new CacheService();
    
    // Log credentials for debugging (remove in production)
    console.log('Spotify Client ID:', this.clientId ? 'Set' : 'Missing');
    console.log('Spotify Client Secret:', this.clientSecret ? 'Set' : 'Missing');
  }

  private base64Encode(str: string): string {
    // Use btoa for all platforms - it's available in both web and React Native
    if (typeof btoa !== 'undefined') {
      return btoa(str);
    }
    
    // Fallback for environments where btoa might not be available
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    
    while (i < str.length) {
      const a = str.charCodeAt(i++);
      const b = i < str.length ? str.charCodeAt(i++) : 0;
      const c = i < str.length ? str.charCodeAt(i++) : 0;
      
      const bitmap = (a << 16) | (b << 8) | c;
      
      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '=';
    }
    
    return result;
  }

  private async getAccessToken(): Promise<string> {
    const cacheKey = 'spotify_access_token';
    // First check persistent storage for token
    let cachedToken = await storageService.loadData<SpotifyAuthToken>(cacheKey);
    
    // If not in persistent storage, check cache
    if (!cachedToken) {
      cachedToken = await this.cache.get<SpotifyAuthToken>(cacheKey);
    }

    if (cachedToken && cachedToken.expires_at > Date.now()) {
      return cachedToken.access_token;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Spotify Client ID and Secret are required. Please check your .env file.');
    }

    try {
      // Use consistent base64 encoding for all platforms
      const credentials = this.base64Encode(`${this.clientId}:${this.clientSecret}`);
      
      const response = await axios.post(
        this.authURL,
        new URLSearchParams({
          grant_type: 'client_credentials'
        }),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokenData: SpotifyAuthToken = {
        ...response.data,
        expires_at: Date.now() + (response.data.expires_in * 1000) - 60000, // 1 minute buffer
      };

      // Save to both persistent storage and cache
      await storageService.saveData(cacheKey, tokenData);
      await this.cache.set(cacheKey, tokenData, response.data.expires_in - 60);
      return tokenData.access_token;
    } catch (error) {
      console.error('Error fetching Spotify access token:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          throw new Error('Invalid Spotify credentials. Please check your Client ID and Secret in the .env file.');
        }
        throw new Error(`Spotify authentication failed: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw new Error('Failed to authenticate with Spotify');
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const cacheKey = `spotify_${endpoint}_${JSON.stringify(params)}`;
    const cachedData = await this.cache.get<T>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const token = await this.getAccessToken();
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        params,
      });

      // Cache for 5 minutes
      await this.cache.set(cacheKey, response.data, 300);
      return response.data;
    } catch (error) {
      console.error(`Error making Spotify API request to ${endpoint}:`, error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          // Clear both cached and persistent token and retry once
          await this.cache.delete('spotify_access_token');
          await storageService.removeData('spotify_access_token');
          throw new Error('Spotify authentication expired. Please try again.');
        }
        if (error.response?.status === 403) {
          throw new Error('Access forbidden. Please check your Spotify app permissions.');
        }
        if (error.response?.status === 404) {
          throw new Error('Spotify API endpoint not found. The service may be temporarily unavailable.');
        }
        throw new Error(`Spotify API error: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  async search(query: string, type: string = 'track,artist,playlist', limit: number = 20): Promise<SpotifySearchResponse> {
    if (!query.trim()) {
      return {};
    }

    return this.makeRequest<SpotifySearchResponse>('/search', {
      q: query,
      type,
      limit,
      market: 'US',
    });
  }

  async getFeaturedPlaylists(limit: number = 20) {
    return this.makeRequest('/browse/featured-playlists', {
      limit,
      country: 'US',
    });
  }

  async getNewReleases(limit: number = 20) {
    return this.makeRequest('/browse/new-releases', {
      limit,
      country: 'US',
    });
  }

  async getCategories(limit: number = 20) {
    return this.makeRequest('/browse/categories', {
      limit,
      country: 'US',
    });
  }

  async getTrack(id: string) {
    return this.makeRequest(`/tracks/${id}`);
  }

  async getArtist(id: string) {
    return this.makeRequest(`/artists/${id}`);
  }

  async getPlaylist(id: string) {
    return this.makeRequest(`/playlists/${id}`);
  }
}

export const spotifyApi = new SpotifyAPI();