import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, RefreshCw, CircleAlert as AlertCircle, Calendar, User as UserIcon } from 'lucide-react-native';
import { notificationService, type Notification } from '../../services/notificationService';
import { Toast } from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadNotifications();

    // Listen for notification updates
    const handleNotificationUpdate = () => {
      loadNotifications(false);
    };

    notificationService.addListener(handleNotificationUpdate);
    return () => notificationService.removeListener(handleNotificationUpdate);
  }, []);

  const loadNotifications = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const result = await notificationService.getAllNotifications();
      
      if (result.success) {
        setNotifications(result.notifications);
      } else {
        setError(result.message);
        showToast({
          message: result.message,
          type: 'error',
        });
      }
    } catch (err) {
      const errorMessage = 'Failed to load notifications';
      setError(errorMessage);
      showToast({
        message: errorMessage,
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications(false);
  }, [loadNotifications]);

  const handleRetry = useCallback(() => {
    loadNotifications();
  }, [loadNotifications]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown time';
    }
  };

  const renderNotificationItem = (notification: Notification) => (
    <TouchableOpacity
      key={notification.id}
      style={styles.notificationItem}
      activeOpacity={0.7}
      onPress={() => {
        // Handle notification tap - could open a detail view
        console.log('Notification tapped:', notification.title);
      }}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationImageContainer}>
          {notification.img_url ? (
            <Image
              source={{ uri: notification.img_url }}
              style={styles.notificationImage}
              defaultSource={{ uri: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=300' }}
            />
          ) : (
            <View style={styles.notificationImagePlaceholder}>
              <Bell size={24} color="#1DB954" />
            </View>
          )}
        </View>

        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle} numberOfLines={2}>
            {notification.title}
          </Text>
          
          <View style={styles.notificationMeta}>
            <View style={styles.metaItem}>
              <UserIcon size={12} color="#888" />
              <Text style={styles.metaText}>{notification.author}</Text>
            </View>
            
            <View style={styles.metaItem}>
              <Calendar size={12} color="#888" />
              <Text style={styles.metaText}>{formatDate(notification.display_date)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.timestampContainer}>
          <Text style={styles.timestamp}>
            {formatTimestamp(notification.timestamp)}
          </Text>
        </View>
      </View>

      <Text style={styles.notificationBody} numberOfLines={3}>
        {notification.content}
      </Text>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1DB954" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      );
    }

    if (error && notifications.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <AlertCircle size={64} color="#ff6b6b" />
          <Text style={styles.errorTitle}>Failed to Load Notifications</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <RefreshCw size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (notifications.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Bell size={64} color="#333" />
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptySubtitle}>
            You're all caught up! New notifications will appear here.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#1DB954"
            colors={['#1DB954']}
          />
        }
      >
        <View style={styles.notificationsList}>
          {notifications.map(renderNotificationItem)}
        </View>
      </ScrollView>
    );
  };

  return (
    <LinearGradient colors={['#1a1a1a', '#000']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
            activeOpacity={0.7}
          >
            <RefreshCw 
              size={24} 
              color={refreshing ? "#666" : "#1DB954"} 
              style={refreshing ? styles.spinning : undefined}
            />
          </TouchableOpacity>
        </View>

        {notifications.length > 0 && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {renderContent()}

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'Inter-Bold',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinning: {
    transform: [{ rotate: '180deg' }],
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  statsText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  scrollView: {
    flex: 1,
  },
  notificationsList: {
    paddingBottom: 20,
  },
  notificationItem: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  notificationHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  notificationImageContainer: {
    marginRight: 12,
  },
  notificationImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  notificationImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
    lineHeight: 22,
  },
  notificationMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  timestampContainer: {
    alignItems: 'flex-end',
  },
  timestamp: {
    color: '#666',
    fontSize: 11,
    fontFamily: 'Inter-Regular',
  },
  notificationBody: {
    color: '#ccc',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginTop: 16,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1DB954',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});