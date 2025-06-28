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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Shuffle, 
  MoveHorizontal as MoreHorizontal,
  Plus 
} from 'lucide-react-native';
import { playlistService, type Playlist } from '../../../services/playlistService';
import { playbackService } from '../../../services/playbackService';
import { audioService, type PlaybackStatus } from '../../../services/audioService';
import { downloadService } from '../../../services/downloadService';
import { DraggablePlaylistSong } from '../../../components/DraggablePlaylistSong';
import { AddToPlaylistModal } from '../../../components/AddToPlaylistModal';
import { MiniPlayer } from '../../../components/MiniPlayer';
import { FullScreenPlayer } from '../../../components/FullScreenPlayer';
import { Toast } from '../../../components/Toast';
import { useToast } from '../../../hooks/useToast';
import type { DownloadedSong } from '../../../services/downloadService';

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>({
    isPlaying: false,
    currentSong: null,
    position: 0,
    duration: 0,
    isLoaded: false,
  });
  const [showAddSongsModal, setShowAddSongsModal] = useState(false);
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (id) {
      loadPlaylist();
    }
  }, [id]);

  useEffect(() => {
    const handleStatusUpdate = (status: PlaybackStatus) => {
      setPlaybackStatus(status);
    };

    const handlePlaylistChange = () => {
      if (id) {
        loadPlaylist();
      }
    };

    audioService.addListener(handleStatusUpdate);
    playlistService.addListener(handlePlaylistChange);

    return () => {
      audioService.removeListener(handleStatusUpdate);
      playlistService.removeListener(handlePlaylistChange);
    };
  }, [id]);

  const loadPlaylist = () => {
    if (!id) return;
    
    const playlistData = playlistService.getPlaylist(id);
    setPlaylist(playlistData || null);
  };

  const handlePlayPlaylist = async () => {
    if (!playlist || playlist.songs.length === 0) {
      showToast({
        message: 'This playlist is empty',
        type: 'info',
      });
      return;
    }

    const success = await playbackService.playPlaylist(playlist);
    if (success) {
      setShowFullPlayer(true);
    } else {
      showToast({
        message: 'Failed to play playlist',
        type: 'error',
      });
    }
  };

  const handlePlaySong = async (song: DownloadedSong, index: number) => {
    if (!playlist) return;

    if (playbackStatus.currentSong?.id === song.id) {
      // Same song - toggle play/pause
      if (playbackStatus.isPlaying) {
        await audioService.pause();
      } else {
        await audioService.resume();
      }
    } else {
      // Different song - play from this position in playlist
      const success = await playbackService.playPlaylist(playlist, index);
      if (success) {
        setShowFullPlayer(true);
      } else {
        showToast({
          message: 'Failed to play song',
          type: 'error',
        });
      }
    }
  };

  const handleRemoveSong = async (song: DownloadedSong) => {
    if (!playlist) return;

    Alert.alert(
      'Remove Song',
      `Remove "${song.name}" from this playlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const success = await playlistService.removeSongFromPlaylist(playlist.id, song.id);
            if (success) {
              showToast({
                message: 'Song removed from playlist',
                type: 'success',
              });
            } else {
              showToast({
                message: 'Failed to remove song',
                type: 'error',
              });
            }
          },
        },
      ]
    );
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnd = async (fromIndex: number, toIndex: number) => {
    setDraggedIndex(null);
    
    if (!playlist || fromIndex === toIndex) return;

    const newSongs = [...playlist.songs];
    const [movedSong] = newSongs.splice(fromIndex, 1);
    newSongs.splice(toIndex, 0, movedSong);

    const success = await playlistService.reorderPlaylistSongs(playlist.id, newSongs);
    if (!success) {
      showToast({
        message: 'Failed to reorder songs',
        type: 'error',
      });
    }
  };

  const formatDuration = (totalMs: number) => {
    const totalMinutes = Math.floor(totalMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getTotalDuration = () => {
    if (!playlist) return 0;
    return playlist.songs.reduce((total, song) => total + (song.duration || 0), 0);
  };

  const isCurrentlyPlaying = (song: DownloadedSong) => {
    return playbackStatus.currentSong?.id === song.id && playbackStatus.isPlaying;
  };

  if (!playlist) {
    return (
      <LinearGradient colors={['#1a1a1a', '#000']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Playlist</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Playlist not found</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1a1a', '#000']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Playlist</Text>
          <TouchableOpacity style={styles.moreButton}>
            <MoreHorizontal size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Playlist Info */}
          <View style={styles.playlistInfo}>
            <Image
              source={{ uri: playlist.coverUrl }}
              style={styles.playlistCover}
            />
            <Text style={styles.playlistName}>{playlist.name}</Text>
            {playlist.description && (
              <Text style={styles.playlistDescription}>{playlist.description}</Text>
            )}
            <Text style={styles.playlistStats}>
              {playlist.songs.length} song{playlist.songs.length !== 1 ? 's' : ''}
              {playlist.songs.length > 0 && (
                <> • {formatDuration(getTotalDuration())}</>
              )}
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.playButton, playlist.songs.length === 0 && styles.playButtonDisabled]}
              onPress={handlePlayPlaylist}
              disabled={playlist.songs.length === 0}
              activeOpacity={0.8}
            >
              <Play size={24} color={playlist.songs.length === 0 ? "#666" : "#000"} fill={playlist.songs.length === 0 ? "#666" : "#000"} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.shuffleButton} activeOpacity={0.7}>
              <Shuffle size={20} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.addSongsButton}
              onPress={() => setShowAddSongsModal(true)}
              activeOpacity={0.7}
            >
              <Plus size={20} color="#1DB954" />
              <Text style={styles.addSongsText}>Add Songs</Text>
            </TouchableOpacity>
          </View>

          {/* Songs List */}
          {playlist.songs.length === 0 ? (
            <View style={styles.emptyPlaylist}>
              <Text style={styles.emptyTitle}>No songs in this playlist</Text>
              <Text style={styles.emptySubtitle}>
                Add some downloaded songs to get started
              </Text>
            </View>
          ) : (
            <View style={styles.songsList}>
              {playlist.songs.map((song, index) => (
                <DraggablePlaylistSong
                  key={`${song.id}-${index}`}
                  song={song}
                  index={index}
                  isPlaying={isCurrentlyPlaying(song)}
                  onPress={() => handlePlaySong(song, index)}
                  onPlayPress={() => handlePlaySong(song, index)}
                  onRemove={() => handleRemoveSong(song)}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedIndex !== null}
                  draggedIndex={draggedIndex}
                />
              ))}
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        <MiniPlayer onPress={() => setShowFullPlayer(true)} />
        
        <FullScreenPlayer 
          visible={showFullPlayer} 
          onClose={() => setShowFullPlayer(false)} 
        />

        <AddToPlaylistModal
          visible={showAddSongsModal}
          song={null}
          onClose={() => setShowAddSongsModal(false)}
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
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  moreButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
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
  },
  playlistInfo: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  playlistCover: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  playlistName: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  playlistDescription: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  playlistStats: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playButtonDisabled: {
    backgroundColor: '#333',
  },
  shuffleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSongsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.3)',
  },
  addSongsText: {
    color: '#1DB954',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  songsList: {
    paddingBottom: 24,
  },
  emptyPlaylist: {
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
  bottomPadding: {
    height: 20,
  },
});