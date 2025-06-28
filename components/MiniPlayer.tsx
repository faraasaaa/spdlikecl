import React, { useState, useEffect } from 'react';
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
  const [slideAnim] = useState(new Animated.Value(100));
  const [isLiked, setIsLiked] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const handleStatusUpdate = (status: PlaybackStatus) => {
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
    };

    audioService.addListener(handleStatusUpdate);
    return () => audioService.removeListener(handleStatusUpdate);
  }, [slideAnim]);

  const handlePlayPause = async (e: any) => {
    e.stopPropagation();
    if (playbackStatus.isPlaying) {
      await audioService.pause();
    } else {
      await audioService.resume();
    }
  };

  const handleNext = async (e: any) => {
    e.stopPropagation();
    await audioService.skipToNext();
  };

  const toggleLike = (e: any) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  const getProgressPercentage = () => {
    if (!playbackStatus.duration) return 0;
    return (playbackStatus.position / playbackStatus.duration) * 100;
  };

  // Create pan responder for swipe gestures
  const panResponder = PanResponder.create({
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
  });

  if (!playbackStatus.currentSong) {
    return null;
  }

  const song = playbackStatus.currentSong;

  // Calculate bottom position to sit exactly on top of tab bar
  const tabBarHeight = Platform.OS === 'ios' ? 90 : 60;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: tabBarHeight,
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
    zIndex: 100,
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