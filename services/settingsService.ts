import axios from 'axios';
import { storageService } from './storageService';
import type { DownloadedSong } from './downloadService';

export interface FixSongReport {
  id: string;
  name: string;
  artists: string;
  album: string;
  downloadedAt: number;
  reportedAt: number;
  status: 'pending' | 'approved';
}

export interface AddSongRequest {
  add_id: string;
  song_url: string;
  requestedAt: number;
  status: 'pending' | 'approved';
}

export interface FixSongResponse {
  message: string;
  report: {
    id: string;
    name: string;
    artists: string;
    album: string;
    downloadedAt: string;
    reportedAt: string;
  };
}

export interface AddSongResponse {
  message: string;
  song: {
    add_id: string;
    song_url: string;
    addedAt: string;
  };
}

class SettingsService {
  private static instance: SettingsService;
  private baseUrl = 'https://faras1334.pythonanywhere.com';
  private listeners: Set<() => void> = new Set();

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  constructor() {
    this.initializeStatusChecking();
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

  private generateReportId(): string {
    return `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAddId(): string {
    return `add_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initialize periodic status checking
  private initializeStatusChecking() {
    // Check status every 30 seconds
    setInterval(() => {
      this.checkAllStatuses();
    }, 30000);

    // Initial check after 5 seconds
    setTimeout(() => {
      this.checkAllStatuses();
    }, 5000);
  }

  async reportFixSong(song: DownloadedSong): Promise<{ success: boolean; message: string; report?: FixSongReport }> {
    try {
      const reportId = this.generateReportId();
      
      // Prepare API parameters
      const params = new URLSearchParams({
        id: reportId,
        name: song.name,
        artists: song.artists,
        album: song.album,
        downloadedAt: new Date(song.downloadedAt).toISOString(),
      });

      // Send to API
      const response = await axios.post(`${this.baseUrl}/fixsong?${params.toString()}`, {}, {
        timeout: 10000,
      });

      if (response.status === 201) {
        // Create local report
        const report: FixSongReport = {
          id: reportId,
          name: song.name,
          artists: song.artists,
          album: song.album,
          downloadedAt: song.downloadedAt,
          reportedAt: Date.now(),
          status: 'pending',
        };

        // Save locally
        await this.saveFixReport(report);
        this.notifyListeners();

        return {
          success: true,
          message: 'Song reported for fixing successfully',
          report,
        };
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error reporting fix song:', error);
      
      let errorMessage = 'Failed to report song for fixing';
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          errorMessage = 'Missing required information';
        } else if (error.response?.status === 409) {
          errorMessage = 'This song has already been reported';
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'Request timed out. Please try again.';
        } else if (!error.response) {
          errorMessage = 'Network error. Please check your connection.';
        }
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  async addSongRequest(spotifyUrl: string): Promise<{ success: boolean; message: string; request?: AddSongRequest }> {
    try {
      // Validate Spotify URL
      if (!this.isValidSpotifyUrl(spotifyUrl)) {
        return {
          success: false,
          message: 'Please enter a valid Spotify track URL',
        };
      }

      const addId = this.generateAddId();
      
      // Prepare API parameters
      const params = new URLSearchParams({
        song_url: spotifyUrl,
        add_id: addId,
      });

      // Send to API
      const response = await axios.post(`${this.baseUrl}/addsong?${params.toString()}`, {}, {
        timeout: 10000,
      });

      if (response.status === 201) {
        // Create local request
        const request: AddSongRequest = {
          add_id: addId,
          song_url: spotifyUrl,
          requestedAt: Date.now(),
          status: 'pending',
        };

        // Save locally
        await this.saveAddRequest(request);
        this.notifyListeners();

        return {
          success: true,
          message: 'Song addition request submitted successfully',
          request,
        };
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error adding song request:', error);
      
      let errorMessage = 'Failed to submit song addition request';
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          errorMessage = 'Invalid request parameters';
        } else if (error.response?.status === 409) {
          errorMessage = 'This song has already been requested';
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'Request timed out. Please try again.';
        } else if (!error.response) {
          errorMessage = 'Network error. Please check your connection.';
        }
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  private isValidSpotifyUrl(url: string): boolean {
    const spotifyUrlPattern = /^https:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+(\?.*)?$/;
    return spotifyUrlPattern.test(url);
  }

  private async saveFixReport(report: FixSongReport): Promise<void> {
    try {
      const existingReports = await this.getAllFixReports();
      const updatedReports = [...existingReports, report];
      await storageService.saveData('fix_reports', updatedReports);
    } catch (error) {
      console.error('Error saving fix report:', error);
    }
  }

  private async saveAddRequest(request: AddSongRequest): Promise<void> {
    try {
      const existingRequests = await this.getAllAddRequests();
      const updatedRequests = [...existingRequests, request];
      await storageService.saveData('add_requests', updatedRequests);
    } catch (error) {
      console.error('Error saving add request:', error);
    }
  }

  async getAllFixReports(): Promise<FixSongReport[]> {
    try {
      const reports = await storageService.loadData<FixSongReport[]>('fix_reports');
      return reports || [];
    } catch (error) {
      console.error('Error loading fix reports:', error);
      return [];
    }
  }

  async getAllAddRequests(): Promise<AddSongRequest[]> {
    try {
      const requests = await storageService.loadData<AddSongRequest[]>('add_requests');
      return requests || [];
    } catch (error) {
      console.error('Error loading add requests:', error);
      return [];
    }
  }

  // Check status of all reports and requests
  private async checkAllStatuses(): Promise<void> {
    try {
      await Promise.all([
        this.checkFixReportsStatus(),
        this.checkAddRequestsStatus(),
      ]);
    } catch (error) {
      console.error('Error checking statuses:', error);
    }
  }

  private async checkFixReportsStatus(): Promise<void> {
    try {
      const reports = await this.getAllFixReports();
      const pendingReports = reports.filter(report => report.status === 'pending');
      
      if (pendingReports.length === 0) return;

      // Check fixed songs from API
      const response = await axios.get(`${this.baseUrl}/showfixed`, { timeout: 5000 });
      
      if (response.status === 200) {
        const fixedSongs = response.data.fixed_songs || [];
        const fixedIds = new Set(fixedSongs.map((song: any) => song.id));
        
        let hasUpdates = false;
        const updatedReports = reports.map(report => {
          if (report.status === 'pending' && fixedIds.has(report.id)) {
            hasUpdates = true;
            return { ...report, status: 'approved' as const };
          }
          return report;
        });

        if (hasUpdates) {
          await storageService.saveData('fix_reports', updatedReports);
          this.notifyListeners();
        }
      }
    } catch (error) {
      // Silently fail status checks to avoid spamming errors
      console.log('Status check failed for fix reports');
    }
  }

  private async checkAddRequestsStatus(): Promise<void> {
    try {
      const requests = await this.getAllAddRequests();
      const pendingRequests = requests.filter(request => request.status === 'pending');
      
      if (pendingRequests.length === 0) return;

      // Check added songs from API
      const response = await axios.get(`${this.baseUrl}/showadded`, { timeout: 5000 });
      
      if (response.status === 200) {
        const addedSongs = response.data.added_songs || [];
        const addedIds = new Set(addedSongs.map((song: any) => song.add_id));
        
        let hasUpdates = false;
        const updatedRequests = requests.map(request => {
          if (request.status === 'pending' && addedIds.has(request.add_id)) {
            hasUpdates = true;
            return { ...request, status: 'approved' as const };
          }
          return request;
        });

        if (hasUpdates) {
          await storageService.saveData('add_requests', updatedRequests);
          this.notifyListeners();
        }
      }
    } catch (error) {
      // Silently fail status checks to avoid spamming errors
      console.log('Status check failed for add requests');
    }
  }

  // Manual status refresh
  async refreshStatuses(): Promise<void> {
    await this.checkAllStatuses();
  }
}

// Export singleton instance
export const settingsService = SettingsService.getInstance();