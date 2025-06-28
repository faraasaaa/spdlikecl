import { storageService } from './storageService';
import axios from 'axios';

export interface User {
  username: string;
  registeredAt: number;
}

class UserService {
  private static instance: UserService;
  private currentUser: User | null = null;
  private listeners: Set<(user: User | null) => void> = new Set();

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  constructor() {
    this.loadUser();
  }

  addListener(callback: (user: User | null) => void) {
    this.listeners.add(callback);
    // Immediately call with current user
    callback(this.currentUser);
  }

  removeListener(callback: (user: User | null) => void) {
    this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.currentUser));
  }

  private async loadUser() {
    try {
      const savedUser = await storageService.loadData<User>('user');
      if (savedUser) {
        this.currentUser = savedUser;
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }

  async registerUser(username: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validate username
      if (!username.trim()) {
        return { success: false, message: 'Username cannot be empty.' };
      }

      if (username.trim().length < 3) {
        return { success: false, message: 'Username must be at least 3 characters long.' };
      }

      if (username.trim().length > 30) {
        return { success: false, message: 'Username must be less than 30 characters.' };
      }

      const usernameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!usernameRegex.test(username.trim())) {
        return { success: false, message: 'Username can only contain letters, numbers, underscores, and hyphens.' };
      }

      // Register with API
      const response = await axios.post(
        `https://faras1334.pythonanywhere.com/registerid?id=${encodeURIComponent(username.trim())}`
      );

      if (response.status === 201) {
        // Save user data
        const user: User = {
          username: username.trim(),
          registeredAt: Date.now(),
        };

        await storageService.saveData('user', user);
        await storageService.saveData('username', username.trim()); // Keep for backward compatibility
        
        this.currentUser = user;
        this.notifyListeners();

        return { success: true, message: 'User registered successfully.' };
      } else {
        return { success: false, message: 'Unexpected response from server.' };
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 400) {
          return { success: false, message: error.response.data.error || 'Invalid username provided.' };
        } else if (error.response.status === 409) {
          return { success: false, message: error.response.data.error || 'Username already exists. Please try another.' };
        } else {
          return { success: false, message: `Registration failed: ${error.response.status} - ${error.response.statusText}` };
        }
      } else {
        return { success: false, message: 'Network error or unexpected issue. Please try again.' };
      }
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getUsername(): string | null {
    return this.currentUser?.username || null;
  }

  async logout(): Promise<boolean> {
    try {
      await storageService.removeData('user');
      await storageService.removeData('username');
      this.currentUser = null;
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      return false;
    }
  }

  async checkUsernameExists(): Promise<boolean> {
    try {
      const savedUsername = await storageService.loadData<string>('username');
      const savedUser = await storageService.loadData<User>('user');
      return !!(savedUsername || savedUser);
    } catch (error) {
      console.error('Error checking username:', error);
      return false;
    }
  }
}

// Export singleton instance
export const userService = UserService.getInstance();