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
import {
  Settings,
  Bell,
  ChevronRight,
  Database,
  Trash2,
  Download,
  Upload,
  Info,
} from 'lucide-react-native';
import { dataManager } from '../../services/dataManager';
import { useToast } from '../../hooks/useToast';

interface ProfileOption {
  id: string;
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
}

export default function ProfileScreen() {
  const { showToast } = useToast();
  const [storageInfo, setStorageInfo] = useState<any>(null);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      const info = await dataManager.getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Error loading storage info:', error);
    }
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
        >
          <View style={styles.header}>
            <Image
              source={{
                uri: 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=300',
              }}
              style={styles.avatar}
            />
            <Text style={styles.name}>Music Lover</Text>
            <Text style={styles.email}>musiclover@example.com</Text>
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

          <View style={styles.bottomInfo}>
            <Text style={styles.appName}>Spotify Clone</Text>
            <Text style={styles.version}>Version 1.0.0</Text>
            <Text style={styles.madeWith}>Made with ❤️ using Expo</Text>
          </View>
        </ScrollView>
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
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  name: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  email: {
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