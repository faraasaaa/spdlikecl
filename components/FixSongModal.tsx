import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Wrench, Music } from 'lucide-react-native';
import { downloadService, type DownloadedSong } from '../services/downloadService';
import { settingsService, type FixSongReport } from '../services/settingsService';
import { TrackCard } from './TrackCard';

interface FixSongModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (report: FixSongReport) => void;
}

export function FixSongModal({ visible, onClose, onSuccess }: FixSongModalProps) {
  const [downloadedSongs, setDownloadedSongs] = useState<DownloadedSong[]>([]);
  const [selectedSong, setSelectedSong] = useState<DownloadedSong | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadDownloadedSongs();
    } else {
      // Reset state when modal closes
      setSelectedSong(null);
      setIsSubmitting(false);
    }
  }, [visible]);

  const loadDownloadedSongs = () => {
    try {
      setLoading(true);
      const songs = downloadService.getAllDownloadedSongs();
      setDownloadedSongs(songs);
    } catch (error) {
      console.error('Error loading downloaded songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSongSelect = (song: DownloadedSong) => {
    setSelectedSong(song);
  };

  const handleSubmitReport = async () => {
    if (!selectedSong) return;

    setIsSubmitting(true);
    try {
      const result = await settingsService.reportFixSong(selectedSong);
      
      if (result.success && result.report) {
        onSuccess(result.report);
      } else {
        // Handle error - you might want to show an error toast here
        console.error('Failed to submit report:', result.message);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSongItem = (song: DownloadedSong) => (
    <TouchableOpacity
      key={song.id}
      style={[
        styles.songItem,
        selectedSong?.id === song.id && styles.selectedSongItem
      ]}
      onPress={() => handleSongSelect(song)}
      activeOpacity={0.7}
    >
      <TrackCard
        track={{
          id: song.id,
          name: song.name,
          artists: [{ id: '', name: song.artists }],
          album: {
            id: '',
            name: song.album,
            images: [{ url: song.coverUrl, height: 300, width: 300 }]
          },
          duration_ms: song.duration || 0,
          preview_url: null,
          external_urls: { spotify: '' }
        }}
        showDownload={false}
        showAddToPlaylist={false}
        isSearchResult={false}
      />
      {selectedSong?.id === song.id && (
        <View style={styles.selectedIndicator}>
          <Text style={styles.selectedText}>Selected</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient colors={['#1a1a1a', '#000']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Fix Song</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Wrench size={32} color="#ff6b6b" />
            <Text style={styles.instructionsTitle}>Report a Song Issue</Text>
            <Text style={styles.instructionsText}>
              Select a downloaded song that has issues and needs to be fixed. 
              We'll create a report and notify you when it's resolved.
            </Text>
          </View>

          {/* Song Selection */}
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1DB954" />
                <Text style={styles.loadingText}>Loading your downloads...</Text>
              </View>
            ) : downloadedSongs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Music size={64} color="#333" />
                <Text style={styles.emptyTitle}>No Downloaded Songs</Text>
                <Text style={styles.emptySubtitle}>
                  You need to download some songs first before you can report issues
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>
                  Select a song to report ({downloadedSongs.length} available)
                </Text>
                <ScrollView 
                  style={styles.songsList} 
                  showsVerticalScrollIndicator={false}
                >
                  {downloadedSongs.map(renderSongItem)}
                </ScrollView>
              </>
            )}
          </View>

          {/* Submit Button */}
          {downloadedSongs.length > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!selectedSong || isSubmitting) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmitReport}
                disabled={!selectedSong || isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <View style={styles.submitButtonContent}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>
                    {selectedSong ? 'Submit Report' : 'Select a Song'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>
    </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  placeholder: {
    width: 44,
  },
  instructions: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  instructionsTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionsText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  songsList: {
    flex: 1,
  },
  songItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  selectedSongItem: {
    borderColor: '#1DB954',
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#1DB954',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  submitButton: {
    backgroundColor: '#1DB954',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#333',
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});