import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Play, Pause, GripVertical, X } from 'lucide-react-native';
import type { DownloadedSong } from '../services/downloadService';

const { width } = Dimensions.get('window');

interface DraggablePlaylistSongProps {
  song: DownloadedSong;
  index: number;
  isPlaying?: boolean;
  onPress?: () => void;
  onPlayPress?: () => void;
  onRemove?: () => void;
  onDragStart?: (index: number) => void;
  onDragEnd?: (fromIndex: number, toIndex: number) => void;
  isDragging?: boolean;
  draggedIndex?: number | null;
}

export function DraggablePlaylistSong({
  song,
  index,
  isPlaying = false,
  onPress,
  onPlayPress,
  onRemove,
  onDragStart,
  onDragEnd,
  isDragging = false,
  draggedIndex,
}: DraggablePlaylistSongProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [isDraggingThis, setIsDraggingThis] = useState(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Only start dragging if we're moving vertically more than horizontally
      return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
    },
    onPanResponderGrant: () => {
      setIsDraggingThis(true);
      onDragStart?.(index);
      
      // Animate the item to show it's being dragged
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.05,
          useNativeDriver: true,
        }),
        Animated.spring(opacity, {
          toValue: 0.9,
          useNativeDriver: true,
        }),
      ]).start();
    },
    onPanResponderMove: (_, gestureState) => {
      // Update the position
      pan.setValue({ x: 0, y: gestureState.dy });
    },
    onPanResponderRelease: (_, gestureState) => {
      setIsDraggingThis(false);
      
      // Calculate which position to move to
      const itemHeight = 80; // Approximate height of each song item
      const moveThreshold = itemHeight / 2;
      const moveDistance = Math.round(gestureState.dy / itemHeight);
      const newIndex = Math.max(0, Math.min(index + moveDistance, 100)); // Assuming max 100 items

      // Only trigger reorder if we moved significantly and to a different position
      if (Math.abs(gestureState.dy) > moveThreshold && newIndex !== index) {
        onDragEnd?.(index, newIndex);
      }

      // Reset animations
      Animated.parallel([
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(opacity, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    },
  });

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const animatedStyle = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      { scale },
    ],
    opacity,
    zIndex: isDraggingThis ? 1000 : 1,
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.content}>
        {/* Drag Handle */}
        <View style={styles.dragHandle} {...panResponder.panHandlers}>
          <GripVertical size={16} color="#666" />
        </View>

        {/* Song Content */}
        <TouchableOpacity
          style={styles.songContent}
          onPress={onPress}
          activeOpacity={0.7}
          disabled={isDraggingThis}
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
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onPlayPress}
            activeOpacity={0.7}
            disabled={isDraggingThis}
          >
            {isPlaying ? (
              <Pause size={20} color="#1DB954" fill="#1DB954" />
            ) : (
              <Play size={20} color="#fff" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onRemove}
            activeOpacity={0.7}
            disabled={isDraggingThis}
          >
            <X size={18} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
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
    paddingHorizontal: 8,
    minHeight: 80,
  },
  dragHandle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
    gap: 8,
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