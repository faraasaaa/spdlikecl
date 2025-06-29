import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { DownloadButton } from './DownloadButton';
import { useToast } from '../hooks/useToast';
import type { SpotifyTrack } from '../types/spotify';

interface TrackCardProps {
  track: SpotifyTrack;
  onPress?: () => void;
  onPlayPress?: () => void;
  onAddToPlaylistPress?: () => void;
  showImage?: boolean;
  showDownload?: boolean;
  showAddToPlaylist?: boolean;
  isSearchResult?: boolean;
}

export function TrackCard({ 
  track, 
  onPress, 
  onPlayPress, 
  onAddToPlaylistPress,
  showImage = true, 
  showDownload = true,
  showAddToPlaylist = false,
  isSearchResult = false 
}: TrackCardProps) {
  const imageUrl = track.album.images[0]?.url;
  const artistNames = track.artists.map(artist => artist.name).join(', ');
  const { showToast } = useToast();

  const handleDownloadComplete = (success: boolean, message: string) => {
    showToast({
      message,
      type: success ? 'success' : 'info', // Changed error to info for "not available" messages
    });
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {showImage && (
        <Image
          source={{ uri: imageUrl || 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=300' }}
          style={styles.albumArt}
        />
      )}
      
      <View style={styles.trackInfo}>
        <Text style={styles.trackName} numberOfLines={1}>
          {track.name}
        </Text>
        <Text style={styles.artistName} numberOfLines={1}>
          {artistNames}
        </Text>
      </View>

      <View style={styles.actions}>
        {/* Show add to playlist button for downloaded songs */}
        {showAddToPlaylist && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onAddToPlaylistPress}
            activeOpacity={0.7}
          >
            <Plus size={16} color="#1DB954" />
          </TouchableOpacity>
        )}

        {/* Only show download button for search results */}
        {showDownload && isSearchResult && (
          <DownloadButton 
            trackId={track.id} 
            size={16}
            onDownloadComplete={handleDownloadComplete}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'transparent',
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 4,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  artistName: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
});