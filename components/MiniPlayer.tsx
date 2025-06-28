import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Play, Pause, SkipForward, Heart } from 'lucide-react-native';
import { audioService, type PlaybackStatus } from '../services/audioService';
import { playbackService } from '../services/playbackService';

interface MiniPlayerProps {
  onPress?: () => void;
}

export function MiniPlayer({ onPress }: MiniPlayerProps) {
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>({
    isPlaying: false,
    currentSong: null,
    position: 0,
    duration: 0,
    isLoaded: false,
  });
  const [isLiked, setIsLiked] = useState(false);
  const insets = useSafeAreaInsets();

  // Memoize the slide animation to prevent recreation
  const slideAnim = useMemo(() => new Animated.Value(100), []);

  // Stable callback for status updates
  const handleStatusUpdate = useCallback((status: PlaybackStatus) => {
    setPlaybackStatus(status);
    
    // Animate mini player in/out
    if (status.currentSong) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 100,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [slideAnim]);

  useEffect(() => {
    audioService.addListener(handleStatusUpdate);
    return () => audioService.removeListener(handleStatusUpdate);
  }, [handleStatusUpdate]);

  const handlePlayPause = useCallback(async (e: any) => {
    e.stopPropagation();
    if (playbackStatus.isPlaying) {
      await audioService.pause();
    } else {
      await audioService.resume();
    }
  }, [playbackStatus.isPlaying]);

  const handleNext = useCallback(async (e: any) => {
    e.stopPropagation();
    await playbackService.playNext();
  }, []);

  const toggleLike = useCallback((e: any) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  }, [isLiked]);

  const getProgressPercentage = useCallback(() => {
    if (!playbackStatus.duration) return 0;
    return (playbackStatus.position / playbackStatus.duration) * 100;
  }, [playbackStatus.position, playbackStatus.duration]);

  // Memoize pan responder to prevent recreation
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 20 && gestureState.dy < 0;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy < 0) {
        slideAnim.setValue(Math.abs(gestureState.dy));
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (Math.abs(gestureState.dy) > 50) {
        onPress?.();
      }
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    },
  }), [slideAnim, onPress]);

  if (!playbackStatus.currentSong) {
    return null;
  }

  const song = playbackStatus.currentSong;

  // Calculate the bottom position to be above the tab bar
  const tabBarHeight = Platform.OS === 'ios' ? 90 : 60;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: tabBarHeight, // Position above tab bar
          transform: [{ translateY: slideAnim }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Progress bar at the top */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${getProgressPercentage()}%` }
            ]} 
          />
        </View>
      </View>

      <TouchableOpacity 
        style={styles.content} 
        onPress={onPress}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: song.coverUrl }}
          style={styles.albumArt}
        />
        
        <View style={styles.songInfo}>
          <Text style={styles.songName} numberOfLines={1}>
            {song.name}
          </Text>
          <Text style={styles.artistName} numberOfLines={1}>
            {song.artists}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={toggleLike}
            style={styles.controlButton}
            activeOpacity={0.7}
          >
            <Heart 
              size={20} 
              color={isLiked ? "#1DB954" : "#fff"} 
              fill={isLiked ? "#1DB954" : "transparent"}
              strokeWidth={1.5}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handlePlayPause}
            activeOpacity={0.7}
          >
            {playbackStatus.isPlaying ? (
              <Pause size={24} color="#fff" fill="#fff" />
            ) : (
              <Play size={24} color="#fff" fill="#fff" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={handleNext}
            activeOpacity={0.7}
          >
            <SkipForward size={20} color="#fff" strokeWidth={1.5} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000, // Ensure it's above everything else
  },
  progressContainer: {
    height: 2,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressFill: {
    height: 2,
    backgroundColor: '#1DB954',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
  },
  songName: {
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
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});