import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, Check, Music, ChevronUp, ChevronDown } from 'lucide-react-native';
import { playlistService, type Playlist } from '../services/playlistService';
import { downloadService } from '../services/downloadService';
import type { DownloadedSong } from '../services/downloadService';

interface AddToPlaylistModalProps {
  visible: boolean;
  song: DownloadedSong | null;
  playlistId?: string; // If provided, we're in "Add Songs" mode for this playlist
  onClose: () => void;
  onCreatePlaylist?: () => void;
}

export function AddToPlaylistModal({ visible, song, playlistId, onClose, onCreatePlaylist }: AddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsContainingSong, setPlaylistsContainingSong] = useState<Set<string>>(new Set());
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(false);

  // Determine if we're in "Add Songs" mode (showing songs from a specific playlist)
  const isAddSongsMode = !!playlistId;

  useEffect(() => {
    if (visible) {
      if (isAddSongsMode && playlistId) {
        // Load the specific playlist for "Add Songs" mode
        const playlist = playlistService.getPlaylist(playlistId);
        setCurrentPlaylist(playlist || null);
      } else {
        // Load all playlists for regular mode
        loadPlaylists();
      }
    }
  }, [visible, song, playlistId, isAddSongsMode]);

  const loadPlaylists = () => {
    const allPlaylists = playlistService.getAllPlaylists();
    setPlaylists(allPlaylists);

    if (song) {
      const containingSong = playlistService.getPlaylistsContainingSong(song.id);
      setPlaylistsContainingSong(new Set(containingSong.map(p => p.id)));
    }
  };

  const handleAddToPlaylist = async (playlist: Playlist, songToAdd: DownloadedSong) => {
    setLoading(true);
    try {
      const success = await playlistService.addSongToPlaylist(playlist.id, songToAdd);
      if (success) {
        if (song) {
          setPlaylistsContainingSong(prev => new Set([...prev, playlist.id]));
        }
        if (isAddSongsMode && playlistId) {
          // Reload the current playlist to show updated songs
          const updatedPlaylist = playlistService.getPlaylist(playlistId);
          setCurrentPlaylist(updatedPlaylist || null);
        }
        Alert.alert('Success', `Added to "${playlist.name}"`);
      } else {
        Alert.alert('Info', 'Song is already in this playlist');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add song to playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromPlaylist = async (playlist: Playlist, songToRemove: DownloadedSong) => {
    setLoading(true);
    try {
      const success = await playlistService.removeSongFromPlaylist(playlist.id, songToRemove.id);
      if (success) {
        if (song) {
          setPlaylistsContainingSong(prev => {
            const newSet = new Set(prev);
            newSet.delete(playlist.id);
            return newSet;
          });
        }
        if (isAddSongsMode && playlistId) {
          // Reload the current playlist to show updated songs
          const updatedPlaylist = playlistService.getPlaylist(playlistId);
          setCurrentPlaylist(updatedPlaylist || null);
        }
        Alert.alert('Success', `Removed from "${playlist.name}"`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to remove song from playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveSongUp = async (index: number) => {
    if (!currentPlaylist || index <= 0) return;

    const newSongs = [...currentPlaylist.songs];
    const [movedSong] = newSongs.splice(index, 1);
    newSongs.splice(index - 1, 0, movedSong);

    const success = await playlistService.reorderPlaylistSongs(currentPlaylist.id, newSongs);
    if (success) {
      // Reload the playlist to show the new order
      const updatedPlaylist = playlistService.getPlaylist(currentPlaylist.id);
      setCurrentPlaylist(updatedPlaylist || null);
    } else {
      Alert.alert('Error', 'Failed to reorder songs');
    }
  };

  const handleMoveSongDown = async (index: number) => {
    if (!currentPlaylist || index >= currentPlaylist.songs.length - 1) return;

    const newSongs = [...currentPlaylist.songs];
    const [movedSong] = newSongs.splice(index, 1);
    newSongs.splice(index + 1, 0, movedSong);

    const success = await playlistService.reorderPlaylistSongs(currentPlaylist.id, newSongs);
    if (success) {
      // Reload the playlist to show the new order
      const updatedPlaylist = playlistService.getPlaylist(currentPlaylist.id);
      setCurrentPlaylist(updatedPlaylist || null);
    } else {
      Alert.alert('Error', 'Failed to reorder songs');
    }
  };

  const renderPlaylistItem = (playlist: Playlist) => {
    const isInPlaylist = playlistsContainingSong.has(playlist.id);

    return (
      <TouchableOpacity
        key={playlist.id}
        style={styles.playlistItem}
        onPress={() => isInPlaylist ? handleRemoveFromPlaylist(playlist, song!) : handleAddToPlaylist(playlist, song!)}
        disabled={loading}
        activeOpacity={0.7}
      >
        <View style={styles.playlistInfo}>
          <Text style={styles.playlistName} numberOfLines={1}>
            {playlist.name}
          </Text>
          <Text style={styles.playlistStats}>
            {playlist.songs.length} song{playlist.songs.length !== 1 ? 's' : ''}
          </Text>
        </View>
        
        <View style={[styles.checkButton, isInPlaylist && styles.checkButtonActive]}>
          {isInPlaylist && <Check size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderPlaylistSong = (song: DownloadedSong, index: number) => {
    const canMoveUp = index > 0;
    const canMoveDown = currentPlaylist && index < currentPlaylist.songs.length - 1;

    const formatDuration = (ms: number) => {
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
      <View key={`${song.id}-${index}`} style={styles.songItem}>
        <View style={styles.songContent}>
          <Image
            source={{ uri: song.coverUrl }}
            style={styles.songAlbumArt}
          />
          
          <View style={styles.songInfo}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {song.name}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {song.artists}
            </Text>
          </View>

          <Text style={styles.songDuration}>
            {song.duration ? formatDuration(song.duration) : '--:--'}
          </Text>
        </View>

        {/* Controls with up/down arrows */}
        <View style={styles.songControls}>
          {/* Move Up/Down Arrows */}
          <View style={styles.moveControls}>
            <TouchableOpacity
              style={[styles.moveButton, !canMoveUp && styles.moveButtonDisabled]}
              onPress={() => handleMoveSongUp(index)}
              activeOpacity={0.7}
              disabled={!canMoveUp || loading}
            >
              <ChevronUp size={16} color={canMoveUp ? "#1DB954" : "#333"} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.moveButton, !canMoveDown && styles.moveButtonDisabled]}
              onPress={() => handleMoveSongDown(index)}
              activeOpacity={0.7}
              disabled={!canMoveDown || loading}
            >
              <ChevronDown size={16} color={canMoveDown ? "#1DB954" : "#333"} />
            </TouchableOpacity>
          </View>

          {/* Remove Button */}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => currentPlaylist && handleRemoveFromPlaylist(currentPlaylist, song)}
            activeOpacity={0.7}
            disabled={loading}
          >
            <X size={18} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAddSongsMode = () => {
    if (!currentPlaylist) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Playlist not found</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.playlistsList} showsVerticalScrollIndicator={false}>
        <View style={styles.playlistHeader}>
          <Text style={styles.playlistHeaderTitle}>{currentPlaylist.name}</Text>
          <Text style={styles.playlistHeaderSubtitle}>
            {currentPlaylist.songs.length} song{currentPlaylist.songs.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {currentPlaylist.songs.length === 0 ? (
          <View style={styles.emptyPlaylistContainer}>
            <Music size={48} color="#333" />
            <Text style={styles.emptyPlaylistTitle}>No songs in this playlist</Text>
            <Text style={styles.emptyPlaylistSubtitle}>
              Add some downloaded songs to get started
            </Text>
          </View>
        ) : (
          currentPlaylist.songs.map((song, index) => renderPlaylistSong(song, index))
        )}
      </ScrollView>
    );
  };

  const renderRegularMode = () => {
    return (
      <ScrollView style={styles.playlistsList} showsVerticalScrollIndicator={false}>
        {playlists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Music size={48} color="#333" />
            <Text style={styles.emptyTitle}>No Playlists Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first playlist to organize your music
            </Text>
          </View>
        ) : (
          playlists.map(renderPlaylistItem)
        )}
      </ScrollView>
    );
  };

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
            <Text style={styles.title}>
              {isAddSongsMode ? 'Manage Playlist' : song ? 'Add to Playlist' : 'Manage Playlists'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* Song Info (only in regular mode with specific song) */}
          {song && !isAddSongsMode && (
            <View style={styles.songInfoHeader}>
              <Text style={styles.songNameHeader} numberOfLines={1}>
                {song.name}
              </Text>
              <Text style={styles.artistNameHeader} numberOfLines={1}>
                {song.artists}
              </Text>
            </View>
          )}

          {/* Create New Playlist (only in regular mode) */}
          {!isAddSongsMode && (
            <TouchableOpacity
              style={styles.createPlaylistButton}
              onPress={() => {
                onClose();
                onCreatePlaylist?.();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.createPlaylistIcon}>
                <Plus size={20} color="#1DB954" />
              </View>
              <Text style={styles.createPlaylistText}>Create New Playlist</Text>
            </TouchableOpacity>
          )}

          {/* Content */}
          {isAddSongsMode ? renderAddSongsMode() : renderRegularMode()}
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
  songInfoHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  songNameHeader: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  artistNameHeader: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  createPlaylistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  createPlaylistIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  createPlaylistText: {
    color: '#1DB954',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  playlistsList: {
    flex: 1,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  playlistStats: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  checkButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkButtonActive: {
    backgroundColor: '#1DB954',
    borderColor: '#1DB954',
  },
  playlistHeader: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  playlistHeaderTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  playlistHeaderSubtitle: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  songItem: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  songContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  songAlbumArt: {
    width: 48,
    height: 48,
    borderRadius: 4,
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  songArtist: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  songDuration: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginRight: 12,
    minWidth: 40,
    textAlign: 'right',
  },
  songControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  moveControls: {
    flexDirection: 'row',
    gap: 4,
  },
  moveButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.3)',
  },
  moveButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: '#333',
  },
  removeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
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
  emptyPlaylistContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyPlaylistTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyPlaylistSubtitle: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});