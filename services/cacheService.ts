import { Platform } from 'react-native';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class CacheService {
  private memoryCache = new Map<string, CacheItem<any>>();

  async get<T>(key: string): Promise<T | null> {
    try {
      // Try memory cache first
      const memoryData = this.memoryCache.get(key);
      if (memoryData && memoryData.expiresAt > Date.now()) {
        return memoryData.data;
      }

      // For web, use localStorage
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem(`cache_${key}`);
        if (cached) {
          const parsed: CacheItem<T> = JSON.parse(cached);
          if (parsed.expiresAt > Date.now()) {
            // Also store in memory cache for faster access
            this.memoryCache.set(key, parsed);
            return parsed.data;
          } else {
            localStorage.removeItem(`cache_${key}`);
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  async set<T>(key: string, data: T, expirationSeconds: number = 300): Promise<void> {
    try {
      const expiresAt = Date.now() + (expirationSeconds * 1000);
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresAt,
      };

      // Store in memory cache
      this.memoryCache.set(key, cacheItem);

      // For web, also store in localStorage
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
      }
    } catch (error) {
      console.error('Error setting cached data:', error);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(`cache_${key}`);
      }
    } catch (error) {
      console.error('Error removing cached data:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        // Remove all cache items
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('cache_')) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Clean expired items
  async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      
      // Clean memory cache
      for (const [key, item] of this.memoryCache.entries()) {
        if (item.expiresAt <= now) {
          this.memoryCache.delete(key);
        }
      }

      // Clean localStorage on web
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('cache_')) {
            const cached = localStorage.getItem(key);
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                if (parsed.expiresAt <= now) {
                  localStorage.removeItem(key);
                }
              } catch {
                localStorage.removeItem(key);
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }
}