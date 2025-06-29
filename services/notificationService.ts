import axios from 'axios';
import { CacheService } from './cacheService';
import { settingsService } from './settingsService';

export interface Notification {
  id: number;
  title: string;
  img_url: string;
  content: string;
  display_date: string;
  timestamp: string;
  author: string;
}

export interface NotificationResponse {
  notifications: Notification[];
}

export interface NotificationResult {
  success: boolean;
  notifications: Notification[];
  message: string;
}

class NotificationService {
  private static instance: NotificationService;
  private baseUrl = 'https://faras1334.pythonanywhere.com';
  private cache: CacheService;
  private listeners: Set<() => void> = new Set();

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  constructor() {
    this.cache = new CacheService();
    this.initializeStatusNotifications();
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

  // Initialize status notifications checking
  private initializeStatusNotifications() {
    // Listen to settings service for status changes
    settingsService.addListener(() => {
      this.checkForApprovedItems();
    });
  }

  private async checkForApprovedItems() {
    try {
      const fixReports = await settingsService.getAllFixReports();
      const addRequests = await settingsService.getAllAddRequests();
      
      // Check for newly approved items and create notifications
      const approvedFixes = fixReports.filter(report => report.status === 'approved');
      const approvedAdds = addRequests.filter(request => request.status === 'approved');
      
      // Create notifications for approved items
      for (const fix of approvedFixes) {
        await this.createApprovalNotification('fix', fix.name, fix.id);
      }
      
      for (const add of approvedAdds) {
        await this.createApprovalNotification('add', 'Song Addition Request', add.add_id);
      }
    } catch (error) {
      console.error('Error checking for approved items:', error);
    }
  }

  private async createApprovalNotification(type: 'fix' | 'add', songName: string, id: string) {
    try {
      // Check if we already created a notification for this item
      const notificationKey = `notification_${type}_${id}`;
      const alreadyNotified = await this.cache.get(notificationKey);
      
      if (alreadyNotified) {
        return; // Already created notification for this item
      }

      const title = type === 'fix' 
        ? `Song Fixed: ${songName}` 
        : `Song Added: Request Approved`;
      
      const content = type === 'fix'
        ? `Your reported song "${songName}" has been fixed and is now available for download.`
        : `Your song addition request has been approved and the song is now available in our database.`;

      // Create notification via API
      await this.createNotification({
        title,
        content,
        author: 'TuneIn System',
        img_url: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=300',
      });

      // Mark as notified
      await this.cache.set(notificationKey, true, 86400); // Cache for 24 hours
    } catch (error) {
      console.error('Error creating approval notification:', error);
    }
  }

  async getAllNotifications(forceRefresh = false): Promise<NotificationResult> {
    const cacheKey = 'all_notifications';
    
    try {
      // Try to get from cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedData = await this.cache.get<Notification[]>(cacheKey);
        if (cachedData) {
          return {
            success: true,
            notifications: cachedData,
            message: 'Notifications loaded from cache'
          };
        }
      }

      // Fetch from API
      const response = await axios.get<NotificationResponse>(`${this.baseUrl}/allnotification`, {
        timeout: 10000, // 10 second timeout
      });

      if (response.status === 200) {
        const notifications = response.data.notifications || [];
        
        // Sort notifications by timestamp (newest first)
        const sortedNotifications = notifications.sort((a, b) => {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });

        // Cache the notifications for 5 minutes
        await this.cache.set(cacheKey, sortedNotifications, 300);
        
        // Notify listeners
        this.notifyListeners();

        return {
          success: true,
          notifications: sortedNotifications,
          message: 'Notifications loaded successfully'
        };
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      
      // Try to return cached data as fallback
      const cachedData = await this.cache.get<Notification[]>(cacheKey);
      if (cachedData) {
        return {
          success: true,
          notifications: cachedData,
          message: 'Using cached notifications (network error)'
        };
      }

      // Return error if no cache available
      let errorMessage = 'Failed to load notifications';
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          errorMessage = 'Request timed out. Please check your connection.';
        } else if (error.response?.status === 404) {
          errorMessage = 'Notifications service not found.';
        } else if (error.response?.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (!error.response) {
          errorMessage = 'Network error. Please check your connection.';
        }
      }

      return {
        success: false,
        notifications: [],
        message: errorMessage
      };
    }
  }

  async refreshNotifications(): Promise<NotificationResult> {
    return this.getAllNotifications(true);
  }

  async clearCache(): Promise<void> {
    try {
      await this.cache.remove('all_notifications');
      this.notifyListeners();
    } catch (error) {
      console.error('Error clearing notifications cache:', error);
    }
  }

  // Method to create a new notification (for future use)
  async createNotification(data: {
    title: string;
    content: string;
    author: string;
    img_url?: string;
    date?: string;
  }): Promise<{ success: boolean; message: string; notification?: Notification }> {
    try {
      const params = new URLSearchParams({
        title: data.title,
        content: data.content,
        author: data.author,
      });

      if (data.img_url) {
        params.append('img_url', data.img_url);
      }

      if (data.date) {
        params.append('date', data.date);
      }

      const response = await axios.post(
        `${this.baseUrl}/setnotification?${params.toString()}`,
        {},
        { timeout: 10000 }
      );

      if (response.status === 201) {
        // Clear cache to force refresh
        await this.clearCache();
        
        return {
          success: true,
          message: 'Notification created successfully',
          notification: response.data.notification
        };
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      
      let errorMessage = 'Failed to create notification';
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          errorMessage = error.response.data.error || 'Invalid notification data';
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'Request timed out. Please try again.';
        } else if (!error.response) {
          errorMessage = 'Network error. Please check your connection.';
        }
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();