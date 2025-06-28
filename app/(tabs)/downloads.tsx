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
import { Trash2, Play, Music, Pause } from 'lucide-react-native';
import { downloadService, type DownloadedSong } from '../../services/downloadService';
import { audioService, type PlaybackStatus } from '../../services/audioService';
import { playbackService } from '../../services/playbackService';
import { MiniPlayer } from '../../components/MiniPlayer';
import { FullScreenPlayer } from '../../components/FullScreenPlayer';
import { Toast } from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

export default function DownloadsScreen() {
  const [downloadedSongs, setDownloadedSongs] = useState<DownloadedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>({
    isPlaying: false,
    currentSong: null,
    position: 0,
    duration: 0,
    isLoaded: false,
  });
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadDownloadedSongs();
    
    const handleStatusUpdate = (status: PlaybackStatus) => {
      setPlaybackStatus(status);
    };

    const handleDownloadChange = () => {
      loadDownloadedSongs();
    };

    audioService.addListener(handleStatusUpdate);
    downloadService.addListener(handleDownloadChange);
    
    return () => {
      audioService.removeListener(handleStatusUpdate);
      downloadService.removeListener(handleDownloadChange);
    };
  }, []);

  const loadDownloadedSongs = () => {
    try {
      const songs = downloadService.getAllDownloadedSongs();
      setDownloadedSongs(songs);
    } catch (error) {
      console.error('Error loading downloaded songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSong = (song: DownloadedSong) => {
    Alert.alert(
      'Delete Song',
      `Are you sure you want to delete "${song.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Stop playback if this song is currently playing
            if (playbackStatus.currentSong?.id === song.id) {
              await audioService.stop();
            }
            
            const success = await downloadService.deleteSong(song.id);
            if (success) {
              loadDownloadedSongs();
              showToast({
                message: 'Song deleted successfully',
                type: 'success',
              });
            } else {
              showToast({
                message: 'Failed to delete song',
                type: 'error',
              });
            }
          },
        },
      ]
    );
  };

  const handlePlaySong = async (song: DownloadedSong) => {
    if (playbackStatus.currentSong?.id === song.id) {
      // Same song - toggle play/pause
      if (playbackStatus.isPlaying) {
        await audioService.pause();
      } else {
        await audioService.resume();
      }
    } else {
      // Different song - play new song
      const success = await playbackService.playSong(song);
      if (success) {
        setShowFullPlayer(true);
      } else {
        showToast({
          message: 'Unable to play this song. The file may be corrupted or in an unsupported format.',
          type: 'error',
        });
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const isCurrentlyPlaying = (song: DownloadedSong) => {
    return playbackStatus.currentSong?.id === song.id && playbackStatus.isPlaying;
  };

  const isCurrentSong = (song: DownloadedSong) => {
    return playbackStatus.currentSong?.id === song.id;
  };

  const renderSongItem = (song: DownloadedSong) => (
    <View key={song.id} style={[
      styles.songItem,
      isCurrentSong(song) && styles.currentSongItem
    ]}>
      <Image
        source={{ uri: song.coverUrl }}
        style={styles.albumArt}
      />
      
      <View style={styles.songInfo}>
        <Text style={[
          styles.songName,
          isCurrentSong(song) && styles.currentSongText
        ]} numberOfLines={1}>
          {song.name}
        </Text>
        <Text style={styles.artistName} numberOfLines={1}>
          {song.artists}
        </Text>
        <Text style={styles.albumName} numberOfLines={1}>
          {song.album}
        </Text>
        <Text style={styles.downloadDate}>
          Downloaded {formatDate(song.downloadedAt)}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.playButton,
            isCurrentSong(song) && styles.currentPlayButton
          ]}
          onPress={() => handlePlaySong(song)}
          activeOpacity={0.7}
        >
          {isCurrentlyPlaying(song) ? (
            <Pause size={20} color="#fff" fill="#fff" />
          ) : (
            <Play size={20} color={isCurrentSong(song) ? "#fff" : "#1DB954"} fill={isCurrentSong(song) ? "#fff" : "#1DB954"} />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteSong(song)}
          activeOpacity={0.7}
        >
          <Trash2 size={18} color="#ff6b6b" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#1a1a1a', '#000']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading downloads...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1a1a', '#000']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Downloads</Text>
        </View>

        {downloadedSongs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Music size={64} color="#333" />
            <Text style={styles.emptyTitle}>No Downloaded Songs</Text>
            <Text style={styles.emptySubtitle}>
              Search for songs and tap the download button to save them for offline listening
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.statsContainer}>
              <Text style={styles.statsText}>
                {downloadedSongs.length} song{downloadedSongs.length !== 1 ? 's' : ''} downloaded
              </Text>
            </View>

            <ScrollView 
              style={styles.scrollView} 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {downloadedSongs.map(renderSongItem)}
            </ScrollView>
          </>
        )}

        <MiniPlayer onPress={() => setShowFullPlayer(true)} />
        
        <FullScreenPlayer 
          visible={showFullPlayer} 
          onClose={() => setShowFullPlayer(false)} 
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
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
  scrollContent: {
    paddingBottom: 160, // Space for mini player + tab bar
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#1a1a1a',
    borderBottomWidth: 1,
  },
  currentSongItem: {
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    borderBottomColor: 'rgba(29, 185, 84, 0.2)',
  },
  albumArt: {
    width: 56,
    height: 56,
    borderRadius: 4,
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
  },
  songName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  currentSongText: {
    color: '#1DB954',
  },
  artistName: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 2,
  },
  albumName: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  downloadDate: {
    color: '#555',
    fontSize: 11,
    fontFamily: 'Inter-Regular',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
  },
  currentPlayButton: {
    backgroundColor: '#1DB954',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
});