import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Play, MoveHorizontal as MoreHorizontal } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { Playlist } from '../services/playlistService';

interface PlaylistCardProps {
  playlist: Playlist;
  onPress?: () => void;
  onPlayPress?: () => void;
  onMorePress?: () => void;
  size?: 'small' | 'large';
}

export function PlaylistCard({ 
  playlist, 
  onPress, 
  onPlayPress, 
  onMorePress,
  size = 'large' 
}: PlaylistCardProps) {
  const router = useRouter();
  const isSmall = size === 'small';

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Navigate to playlist detail screen
      router.push(`/(tabs)/playlist/${playlist.id}`);
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
    return playlist.songs.reduce((total, song) => total + (song.duration || 0), 0);
  };

  return (
    <TouchableOpacity
      style={[styles.container, isSmall && styles.smallContainer]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.coverContainer}>
        <Image
          source={{ uri: playlist.coverUrl }}
          style={[styles.cover, isSmall && styles.smallCover]}
        />
        {playlist.songs.length > 0 && (
          <TouchableOpacity
            style={styles.playButton}
            onPress={(e) => {
              e.stopPropagation();
              onPlayPress?.();
            }}
            activeOpacity={0.8}
          >
            <Play size={isSmall ? 16 : 20} color="#000" fill="#000" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.info}>
        <Text style={[styles.name, isSmall && styles.smallName]} numberOfLines={2}>
          {playlist.name}
        </Text>
        
        {playlist.description && !isSmall && (
          <Text style={styles.description} numberOfLines={2}>
            {playlist.description}
          </Text>
        )}
        
        <View style={styles.stats}>
          <Text style={[styles.statsText, isSmall && styles.smallStatsText]}>
            {playlist.songs.length} song{playlist.songs.length !== 1 ? 's' : ''}
          </Text>
          {playlist.songs.length > 0 && !isSmall && (
            <>
              <Text style={styles.statsSeparator}> • </Text>
              <Text style={styles.statsText}>
                {formatDuration(getTotalDuration())}
              </Text>
            </>
          )}
        </View>
      </View>

      {!isSmall && (
        <TouchableOpacity
          style={styles.moreButton}
          onPress={(e) => {
            e.stopPropagation();
            onMorePress?.();
          }}
          activeOpacity={0.7}
        >
          <MoreHorizontal size={20} color="#888" />
        </TouchableOpacity>
      )}
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
  smallContainer: {
    width: 160,
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginRight: 16,
    padding: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  coverContainer: {
    position: 'relative',
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: 4,
    marginRight: 12,
  },
  smallCover: {
    width: '100%',
    height: 144,
    marginRight: 0,
    marginBottom: 12,
  },
  playButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  info: {
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
    lineHeight: 20,
  },
  smallName: {
    fontSize: 14,
    lineHeight: 18,
  },
  description: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    lineHeight: 16,
    marginBottom: 4,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  smallStatsText: {
    fontSize: 11,
  },
  statsSeparator: {
    color: '#888',
    fontSize: 12,
  },
  moreButton: {
    padding: 8,
    marginLeft: 8,
  },
});