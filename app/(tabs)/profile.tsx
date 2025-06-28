import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Settings,
  Bell,
  ChevronRight,
  Database,
  Trash2,
  Download,
  Upload,
  Info,
  LogOut,
  User as UserIcon,
} from 'lucide-react-native';
import { dataManager } from '../../services/dataManager';
import { userService, type User } from '../../services/userService';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';

interface ProfileOption {
  id: string;
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
}

export default function ProfileScreen() {
  const { toast, showToast, hideToast } = useToast();
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadStorageInfo();
    
    // Listen for user changes
    const handleUserChange = (user: User | null) => {
      setCurrentUser(user);
    };

    userService.addListener(handleUserChange);
    return () => userService.removeListener(handleUserChange);
  }, []);

  const loadStorageInfo = async () => {
    try {
      const info = await dataManager.getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Error loading storage info:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? You will need to register again to use the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            const success = await userService.logout();
            if (success) {
              showToast({
                message: 'Logged out successfully',
                type: 'success',
              });
              // Navigate back to registration
              router.replace('/register');
            } else {
              showToast({
                message: 'Failed to logout',
                type: 'error',
              });
            }
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your playlists, downloaded songs, and app data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            const success = await dataManager.clearAllAppData();
            if (success) {
              showToast({
                message: 'All data cleared successfully',
                type: 'success',
              });
              await loadStorageInfo();
            } else {
              showToast({
                message: 'Failed to clear data',
                type: 'error',
              });
            }
          },
        },
      ]
    );
  };

  const handleBackupData = async () => {
    try {
      const backup = await dataManager.backupAppData();
      if (backup) {
        // In a real app, you would save this to a file or cloud storage
        console.log('Backup created:', backup);
        showToast({
          message: 'Backup created successfully',
          type: 'success',
        });
      } else {
        showToast({
          message: 'Failed to create backup',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      showToast({
        message: 'Failed to create backup',
        type: 'error',
      });
    }
  };

  const handleVerifyData = async () => {
    try {
      const integrity = await dataManager.verifyDataIntegrity();
      const issues = integrity.issues.length;

      if (issues === 0) {
        showToast({
          message: 'Data integrity check passed',
          type: 'success',
        });
      } else {
        Alert.alert(
          'Data Integrity Issues',
          `Found ${issues} issue(s):\n${integrity.issues.join('\n')}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error verifying data:', error);
      showToast({
        message: 'Failed to verify data integrity',
        type: 'error',
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const profileOptions: ProfileOption[] = [
    {
      id: '1',
      title: 'Settings',
      icon: <Settings size={20} color="#888" />,
      onPress: () => console.log('Open settings'),
    },
    {
      id: '2',
      title: 'Notifications',
      icon: <Bell size={20} color="#888" />,
      onPress: () => console.log('Open notifications'),
    },
  ];

  const storageOptions: ProfileOption[] = [
    {
      id: 'storage-info',
      title: `Storage Used: ${
        storageInfo?.persistent?.used
          ? formatBytes(storageInfo.persistent.used)
          : 'Unknown'
      }`,
      icon: <Database size={20} color="#1DB954" />,
      onPress: loadStorageInfo,
    },
    {
      id: 'verify-data',
      title: 'Verify Data Integrity',
      icon: <Info size={20} color="#888" />,
      onPress: handleVerifyData,
    },
    {
      id: 'backup-data',
      title: 'Backup Data',
      icon: <Upload size={20} color="#888" />,
      onPress: handleBackupData,
    },
    {
      id: 'clear-data',
      title: 'Clear All Data',
      icon: <Trash2 size={20} color="#ff4444" />,
      onPress: handleClearAllData,
    },
  ];

  const accountOptions: ProfileOption[] = [
    {
      id: 'logout',
      title: 'Logout',
      icon: <LogOut size={20} color="#ff4444" />,
      onPress: handleLogout,
    },
  ];

  const renderOption = (option: ProfileOption) => (
    <TouchableOpacity
      key={option.id}
      style={styles.option}
      onPress={option.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.optionLeft}>
        {option.icon}
        <Text style={styles.optionText}>{option.title}</Text>
      </View>
      <ChevronRight size={16} color="#888" />
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#1DB954', '#1a1a1a', '#000']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(100, insets.bottom + 80) }}
        >
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <UserIcon size={48} color="#fff" strokeWidth={1.5} />
            </View>
            <Text style={styles.name}>
              {currentUser?.username || 'Music Lover'}
            </Text>
            {currentUser && (
              <Text style={styles.memberSince}>
                Member since {formatDate(currentUser.registeredAt)}
              </Text>
            )}
          </View>

          <View style={styles.optionsContainer}>
            {profileOptions.map(renderOption)}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Data Management</Text>
          </View>

          <View style={styles.optionsContainer}>
            {storageOptions.map(renderOption)}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account</Text>
          </View>

          <View style={styles.optionsContainer}>
            {accountOptions.map(renderOption)}
          </View>

          <View style={styles.bottomInfo}>
            <Text style={styles.appName}>Bolt Music</Text>
            <Text style={styles.version}>Version 1.0.0</Text>
            <Text style={styles.madeWith}>Made with ❤️ using Expo</Text>
          </View>
        </ScrollView>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            visible={toast.visible}
            onHide={hideToast}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 32,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  name: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  memberSince: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    opacity: 0.8,
  },
  optionsContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 32,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginLeft: 16,
  },
  bottomInfo: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 16,
    marginBottom: 40,
  },
  appName: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  version: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  madeWith: {
    color: '#888',
    fontSize: 11,
    fontFamily: 'Inter-Regular',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
});