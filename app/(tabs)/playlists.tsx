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
import { useRouter } from 'expo-router';
import { Plus, Music } from 'lucide-react-native';
import { playlistService, type Playlist } from '../../services/playlistService';
import { playbackService } from '../../services/playbackService';
import { audioService, type PlaybackStatus } from '../../services/audioService';
import { PlaylistCard } from '../../components/PlaylistCard';
import { CreatePlaylistModal } from '../../components/CreatePlaylistModal';
import { MiniPlayer } from '../../components/MiniPlayer';
import { FullScreenPlayer } from '../../components/FullScreenPlayer';
import { Toast } from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

export default function PlaylistsScreen() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>({
    isPlaying: false,
    currentSong: null,
    position: 0,
    duration: 0,
    isLoaded: false,
  });
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadPlaylists();

    const handlePlaylistChange = () => {
      loadPlaylists();
    };

    const handleStatusUpdate = (status: PlaybackStatus) => {
      setPlaybackStatus(status);
    };

    playlistService.addListener(handlePlaylistChange);
    audioService.addListener(handleStatusUpdate);
    
    return () => {
      playlistService.removeListener(handlePlaylistChange);
      audioService.removeListener(handleStatusUpdate);
    };
  }, []);

  const loadPlaylists = () => {
    const allPlaylists = playlistService.getAllPlaylists();
    setPlaylists(allPlaylists);
  };

  const handleOpenPlaylist = (playlist: Playlist) => {
    router.push(`/(tabs)/playlist/${playlist.id}`);
  };

  const handlePlayPlaylist = async (playlist: Playlist) => {
    if (playlist.songs.length === 0) {
      showToast({
        message: 'This playlist is empty',
        type: 'info',
      });
      return;
    }

    // Check if this playlist is currently playing
    if (currentPlaylistId === playlist.id && playbackStatus.isPlaying) {
      // If same playlist is playing, pause it
      await audioService.pause();
      setCurrentPlaylistId(null);
    } else {
      // Play the playlist
      const success = await playbackService.playPlaylist(playlist);
      if (success) {
        setCurrentPlaylistId(playlist.id);
        setShowFullPlayer(true);
      } else {
        showToast({
          message: 'Failed to play playlist',
          type: 'error',
        });
      }
    }
  };

  const handleDeletePlaylist = (playlist: Playlist) => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Stop playback if this playlist is currently playing
            if (currentPlaylistId === playlist.id) {
              await audioService.stop();
              setCurrentPlaylistId(null);
            }
            
            const success = await playlistService.deletePlaylist(playlist.id);
            if (success) {
              showToast({
                message: 'Playlist deleted',
                type: 'success',
              });
            } else {
              showToast({
                message: 'Failed to delete playlist',
                type: 'error',
              });
            }
          },
        },
      ]
    );
  };

  const handlePlaylistCreated = (playlistId: string) => {
    showToast({
      message: 'Playlist created successfully',
      type: 'success',
    });
  };

  const isPlaylistPlaying = (playlist: Playlist) => {
    return currentPlaylistId === playlist.id && playbackStatus.isPlaying;
  };

  return (
    <LinearGradient colors={['#1a1a1a', '#000']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Playlists</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.7}
          >
            <Plus size={24} color="#1DB954" />
          </TouchableOpacity>
        </View>

        {playlists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Music size={64} color="#333" />
            <Text style={styles.emptyTitle}>No Playlists Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first playlist to organize your downloaded music
            </Text>
            <TouchableOpacity
              style={styles.createFirstButton}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.7}
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.createFirstButtonText}>Create Playlist</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onPress={() => handleOpenPlaylist(playlist)}
                onPlayPress={() => handlePlayPlaylist(playlist)}
                onMorePress={() => handleDeletePlaylist(playlist)}
                isPlaying={isPlaylistPlaying(playlist)}
              />
            ))}
            <View style={styles.bottomPadding} />
          </ScrollView>
        )}

        <MiniPlayer onPress={() => setShowFullPlayer(true)} />
        
        <FullScreenPlayer 
          visible={showFullPlayer} 
          onClose={() => setShowFullPlayer(false)} 
        />

        <CreatePlaylistModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onPlaylistCreated={handlePlaylistCreated}
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
    paddingBottom: 70, // Space for mini player + tab bar
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
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
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
    marginBottom: 32,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1DB954',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 20,
  },
});