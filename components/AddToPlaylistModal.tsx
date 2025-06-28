import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, Check, Music } from 'lucide-react-native';
import { playlistService, type Playlist } from '../services/playlistService';
import { downloadService } from '../services/downloadService';
import type { DownloadedSong } from '../services/downloadService';

interface AddToPlaylistModalProps {
  visible: boolean;
  song: DownloadedSong | null;
  onClose: () => void;
  onCreatePlaylist?: () => void;
}

export function AddToPlaylistModal({ visible, song, onClose, onCreatePlaylist }: AddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsContainingSong, setPlaylistsContainingSong] = useState<Set<string>>(new Set());
  const [downloadedSongs, setDownloadedSongs] = useState<DownloadedSong[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPlaylists();
      loadDownloadedSongs();
    }
  }, [visible, song]);

  const loadPlaylists = () => {
    const allPlaylists = playlistService.getAllPlaylists();
    setPlaylists(allPlaylists);

    if (song) {
      const containingSong = playlistService.getPlaylistsContainingSong(song.id);
      setPlaylistsContainingSong(new Set(containingSong.map(p => p.id)));
    }
  };

  const loadDownloadedSongs = () => {
    const songs = downloadService.getAllDownloadedSongs();
    setDownloadedSongs(songs);
  };

  const handleAddToPlaylist = async (playlist: Playlist, songToAdd: DownloadedSong) => {
    setLoading(true);
    try {
      const success = await playlistService.addSongToPlaylist(playlist.id, songToAdd);
      if (success) {
        if (song) {
          // If adding a specific song, update the containing playlists
          setPlaylistsContainingSong(prev => new Set([...prev, playlist.id]));
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
          // If removing a specific song, update the containing playlists
          setPlaylistsContainingSong(prev => {
            const newSet = new Set(prev);
            newSet.delete(playlist.id);
            return newSet;
          });
        }
        Alert.alert('Success', `Removed from "${playlist.name}"`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to remove song from playlist');
    } finally {
      setLoading(false);
    }
  };

  const renderPlaylistItem = (playlist: Playlist) => {
    if (song) {
      // If a specific song is selected, show add/remove for that song
      const isInPlaylist = playlistsContainingSong.has(playlist.id);

      return (
        <TouchableOpacity
          key={playlist.id}
          style={styles.playlistItem}
          onPress={() => isInPlaylist ? handleRemoveFromPlaylist(playlist, song) : handleAddToPlaylist(playlist, song)}
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
    } else {
      // If no specific song, show the playlist for browsing downloaded songs
      return (
        <View key={playlist.id} style={styles.playlistSection}>
          <Text style={styles.playlistSectionTitle}>{playlist.name}</Text>
          <Text style={styles.playlistSectionSubtitle}>
            {playlist.songs.length} song{playlist.songs.length !== 1 ? 's' : ''}
          </Text>
          
          {downloadedSongs.length === 0 ? (
            <Text style={styles.noSongsText}>No downloaded songs available</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.songsScroll}>
              {downloadedSongs.map((downloadedSong) => {
                const isInPlaylist = playlist.songs.some(s => s.id === downloadedSong.id);
                
                return (
                  <TouchableOpacity
                    key={downloadedSong.id}
                    style={[styles.songItem, isInPlaylist && styles.songItemInPlaylist]}
                    onPress={() => isInPlaylist ? handleRemoveFromPlaylist(playlist, downloadedSong) : handleAddToPlaylist(playlist, downloadedSong)}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.songName} numberOfLines={1}>
                      {downloadedSong.name}
                    </Text>
                    <Text style={styles.songArtist} numberOfLines={1}>
                      {downloadedSong.artists}
                    </Text>
                    <View style={[styles.songCheckButton, isInPlaylist && styles.songCheckButtonActive]}>
                      {isInPlaylist && <Check size={12} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      );
    }
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
              {song ? 'Add to Playlist' : 'Manage Playlists'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* Song Info */}
          {song && (
            <View style={styles.songInfo}>
              <Text style={styles.songName} numberOfLines={1}>
                {song.name}
              </Text>
              <Text style={styles.artistName} numberOfLines={1}>
                {song.artists}
              </Text>
            </View>
          )}

          {/* Create New Playlist */}
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

          {/* Playlists List */}
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
  songInfo: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  songName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  artistName: {
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
  playlistSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  playlistSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  playlistSectionSubtitle: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  noSongsText: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
  },
  songsScroll: {
    marginTop: 8,
  },
  songItem: {
    width: 120,
    padding: 8,
    marginRight: 8,
    backgroundColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  songItemInPlaylist: {
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    borderColor: '#1DB954',
  },
  songCheckButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  songCheckButtonActive: {
    backgroundColor: '#1DB954',
    borderColor: '#1DB954',
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
});