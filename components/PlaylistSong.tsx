import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Play, Pause, X, ChevronUp, ChevronDown } from 'lucide-react-native';
import type { DownloadedSong } from '../services/downloadService';

interface PlaylistSongProps {
  song: DownloadedSong;
  index: number;
  totalSongs: number;
  isPlaying?: boolean;
  onPress?: () => void;
  onPlayPress?: () => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function PlaylistSong({
  song,
  index,
  totalSongs,
  isPlaying = false,
  onPress,
  onPlayPress,
  onRemove,
  onMoveUp,
  onMoveDown,
}: PlaylistSongProps) {
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const canMoveUp = index > 0;
  const canMoveDown = index < totalSongs - 1;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.content}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: song.coverUrl }}
          style={styles.albumArt}
        />
        
        <View style={styles.songInfo}>
          <Text style={[styles.songName, isPlaying && styles.playingText]} numberOfLines={1}>
            {song.name}
          </Text>
          <Text style={styles.artistName} numberOfLines={1}>
            {song.artists}
          </Text>
        </View>

        {/* Duration */}
        <Text style={styles.duration}>
          {song.duration ? formatDuration(song.duration) : '--:--'}
        </Text>
      </TouchableOpacity>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Move Up/Down Arrows */}
        <View style={styles.moveControls}>
          <TouchableOpacity
            style={[styles.moveButton, !canMoveUp && styles.moveButtonDisabled]}
            onPress={onMoveUp}
            activeOpacity={0.7}
            disabled={!canMoveUp}
          >
            <ChevronUp size={16} color={canMoveUp ? "#1DB954" : "#333"} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.moveButton, !canMoveDown && styles.moveButtonDisabled]}
            onPress={onMoveDown}
            activeOpacity={0.7}
            disabled={!canMoveDown}
          >
            <ChevronDown size={16} color={canMoveDown ? "#1DB954" : "#333"} />
          </TouchableOpacity>
        </View>

        {/* Play/Pause Button */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={onPlayPress}
          activeOpacity={0.7}
        >
          {isPlaying ? (
            <Pause size={20} color="#1DB954" fill="#1DB954" />
          ) : (
            <Play size={20} color="#fff" />
          )}
        </TouchableOpacity>
        
        {/* Remove Button */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={onRemove}
          activeOpacity={0.7}
        >
          <X size={18} color="#ff6b6b" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  albumArt: {
    width: 48,
    height: 48,
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
  playingText: {
    color: '#1DB954',
  },
  artistName: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  duration: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginRight: 12,
    minWidth: 40,
    textAlign: 'right',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
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
  controlButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});