import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Wrench, Plus, ChevronRight, Clock, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { settingsService, type FixSongReport, type AddSongRequest } from '@/services/settingsService';
import { FixSongModal } from '@/components/FixSongModal';
import { AddSongModal } from '@/components/AddSongModal';
import { Toast } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

export default function SettingsScreen() {
  const router = useRouter();
  const [showFixSongModal, setShowFixSongModal] = useState(false);
  const [showAddSongModal, setShowAddSongModal] = useState(false);
  const [fixReports, setFixReports] = useState<FixSongReport[]>([]);
  const [addRequests, setAddRequests] = useState<AddSongRequest[]>([]);
  const { toast, showToast, hideToast } = useToast();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadReportsAndRequests();

    const handleDataChange = () => {
      loadReportsAndRequests();
    };

    settingsService.addListener(handleDataChange);
    return () => settingsService.removeListener(handleDataChange);
  }, []);

  const loadReportsAndRequests = () => {
    const reports = settingsService.getAllFixReports();
    const requests = settingsService.getAllAddRequests();
    setFixReports(reports);
    setAddRequests(requests);
  };

  const handleFixSongSuccess = (report: FixSongReport) => {
    showToast({
      message: 'Song reported for fixing successfully',
      type: 'success',
    });
    setShowFixSongModal(false);
  };

  const handleAddSongSuccess = (request: AddSongRequest) => {
    showToast({
      message: 'Song addition request submitted successfully',
      type: 'success',
    });
    setShowAddSongModal(false);
  };

  const getStatusIcon = (status: 'pending' | 'approved') => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} color="#1DB954" />;
      case 'pending':
        return <Clock size={16} color="#ffa500" />;
      default:
        return <AlertCircle size={16} color="#888" />;
    }
  };

  const getStatusColor = (status: 'pending' | 'approved') => {
    switch (status) {
      case 'approved':
        return '#1DB954';
      case 'pending':
        return '#ffa500';
      default:
        return '#888';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderFixReport = (report: FixSongReport) => (
    <View key={report.id} style={styles.reportItem}>
      <View style={styles.reportHeader}>
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle} numberOfLines={1}>
            {report.name}
          </Text>
          <Text style={styles.reportArtist} numberOfLines={1}>
            {report.artists}
          </Text>
          <Text style={styles.reportDate}>
            Reported: {formatDate(report.reportedAt)}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          {getStatusIcon(report.status)}
          <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
          </Text>
        </View>
      </View>
      <Text style={styles.reportId}>Report ID: {report.id}</Text>
    </View>
  );

  const renderAddRequest = (request: AddSongRequest) => (
    <View key={request.add_id} style={styles.reportItem}>
      <View style={styles.reportHeader}>
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle} numberOfLines={1}>
            Song Addition Request
          </Text>
          <Text style={styles.reportArtist} numberOfLines={1}>
            {request.song_url}
          </Text>
          <Text style={styles.reportDate}>
            Requested: {formatDate(request.requestedAt)}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          {getStatusIcon(request.status)}
          <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </Text>
        </View>
      </View>
      <Text style={styles.reportId}>Request ID: {request.add_id}</Text>
    </View>
  );

  return (
    <LinearGradient colors={['#1a1a1a', '#000']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(100, insets.bottom + 80) }}
        >
          {/* Main Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Song Management</Text>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowFixSongModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Wrench size={24} color="#ff6b6b" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Fix Song</Text>
                <Text style={styles.actionSubtitle}>
                  Report a downloaded song that needs fixing
                </Text>
              </View>
              <ChevronRight size={20} color="#888" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowAddSongModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Plus size={24} color="#1DB954" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Add Song</Text>
                <Text style={styles.actionSubtitle}>
                  Request a new song to be added to the database
                </Text>
              </View>
              <ChevronRight size={20} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Fix Reports */}
          {fixReports.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fix Reports ({fixReports.length})</Text>
              {fixReports.map(renderFixReport)}
            </View>
          )}

          {/* Add Requests */}
          {addRequests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add Requests ({addRequests.length})</Text>
              {addRequests.map(renderAddRequest)}
            </View>
          )}

          {/* Empty State */}
          {fixReports.length === 0 && addRequests.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No Reports or Requests</Text>
              <Text style={styles.emptySubtitle}>
                Use the options above to report song issues or request new songs
              </Text>
            </View>
          )}
        </ScrollView>

        <FixSongModal
          visible={showFixSongModal}
          onClose={() => setShowFixSongModal(false)}
          onSuccess={handleFixSongSuccess}
        />

        <AddSongModal
          visible={showAddSongModal}
          onClose={() => setShowAddSongModal(false)}
          onSuccess={handleAddSongSuccess}
        />

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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  actionSubtitle: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  reportItem: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reportInfo: {
    flex: 1,
    marginRight: 12,
  },
  reportTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  reportArtist: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  reportDate: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  reportId: {
    color: '#666',
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
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