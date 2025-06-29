import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, MoveHorizontal as MoreHorizontal, Heart, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Volume2, Share, List } from 'lucide-react-native';
import { audioService, type PlaybackStatus } from '../services/audioService';
import { playbackService } from '../services/playbackService';

const { width, height } = Dimensions.get('window');

interface FullScreenPlayerProps {
  visible: boolean;
  onClose: () => void;
}

export function FullScreenPlayer({ visible, onClose }: FullScreenPlayerProps) {
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>({
    isPlaying: false,
    currentSong: null,
    position: 0,
    duration: 0,
    isLoaded: false,
  });
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);

  // Memoize the slide animation to prevent recreation
  const slideAnim = useMemo(() => new Animated.Value(height), [height]);

  // Stable callback for status updates
  const handleStatusUpdate = useCallback((status: PlaybackStatus) => {
    setPlaybackStatus(status);
  }, []);

  // Effect for audio service listener
  useEffect(() => {
    audioService.addListener(handleStatusUpdate);
    return () => audioService.removeListener(handleStatusUpdate);
  }, [handleStatusUpdate]);

  // Effect for visibility animation
  useEffect(() => {
    if (visible) {
      StatusBar.setHidden(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      StatusBar.setHidden(false);
      Animated.spring(slideAnim, {
        toValue: height,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [visible, slideAnim, height]);

  // Memoize pan responder to prevent recreation
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 20 && gestureState.dy > 0;
    },
    onPanResponderGrant: () => {
      // User started dragging
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        slideAnim.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100 || gestureState.vy > 0.5) {
        // Close the player
        handleClose();
      } else {
        // Snap back to open position
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    },
  }), [slideAnim]);

  // Memoize progress pan responder
  const progressPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      setIsDragging(true);
      const { locationX } = event.nativeEvent;
      const progressBarWidth = width - 48;
      const percentage = Math.max(0, Math.min(1, locationX / progressBarWidth));
      setDragPosition(percentage * playbackStatus.duration);
    },
    onPanResponderMove: (event) => {
      const { locationX } = event.nativeEvent;
      const progressBarWidth = width - 48;
      const percentage = Math.max(0, Math.min(1, locationX / progressBarWidth));
      setDragPosition(percentage * playbackStatus.duration);
    },
    onPanResponderRelease: async () => {
      setIsDragging(false);
      await audioService.seekTo(dragPosition);
    },
  }), [playbackStatus.duration, dragPosition]);

  const handleClose = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: height,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(() => {
      onClose();
    });
  }, [slideAnim, onClose, height]);

  const handlePlayPause = useCallback(async () => {
    if (playbackStatus.isPlaying) {
      await audioService.pause();
    } else {
      await audioService.resume();
    }
  }, [playbackStatus.isPlaying]);

  const handleNext = useCallback(async () => {
    await playbackService.playNext();
  }, []);

  const handlePrevious = useCallback(async () => {
    await playbackService.playPrevious();
  }, []);

  const toggleLike = useCallback(() => {
    setIsLiked(!isLiked);
  }, [isLiked]);

  const toggleShuffle = useCallback(() => {
    const newShuffleState = playbackService.toggleShuffle();
    setIsShuffled(newShuffleState);
  }, []);

  const toggleRepeat = useCallback(() => {
    const newRepeatMode = playbackService.toggleRepeat();
    setRepeatMode(newRepeatMode);
  }, []);

  const formatTime = useCallback((milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const getProgressPercentage = useCallback(() => {
    if (!playbackStatus.duration) return 0;
    const position = isDragging ? dragPosition : playbackStatus.position;
    return (position / playbackStatus.duration) * 100;
  }, [playbackStatus.duration, playbackStatus.position, isDragging, dragPosition]);

  if (!visible || !playbackStatus.currentSong) {
    return null;
  }

  const song = playbackStatus.currentSong;
  const currentPosition = isDragging ? dragPosition : playbackStatus.position;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={['#8B0000', '#4A0000', '#000']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View {...panResponder.panHandlers} style={styles.dragArea}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
                <ChevronDown size={28} color="#fff" strokeWidth={2} />
              </TouchableOpacity>
              
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>PLAYING FROM DOWNLOADS</Text>
                <Text style={styles.headerSubtitle}>{song.album}</Text>
              </View>
              
              <TouchableOpacity style={styles.headerButton}>
                <MoreHorizontal size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Album Art */}
            <View style={styles.albumArtContainer}>
              <View style={styles.albumArtShadow}>
                <Image
                  source={{ uri: song.coverUrl }}
                  style={styles.albumArt}
                />
              </View>
            </View>

            {/* Song Info */}
            <View style={styles.songInfo}>
              <View style={styles.songTitleContainer}>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {song.name}
                </Text>
                <TouchableOpacity onPress={toggleLike} style={styles.likeButton}>
                  <Heart 
                    size={24} 
                    color={isLiked ? "#1DB954" : "#fff"} 
                    fill={isLiked ? "#1DB954" : "transparent"}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.artistName} numberOfLines={1}>
                {song.artists}
              </Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View 
                style={styles.progressBar}
                {...progressPanResponder.panHandlers}
              >
                <View style={styles.progressTrack}>
                  <Animated.View 
                    style={[
                      styles.progressFill, 
                      { width: `${getProgressPercentage()}%` }
                    ]} 
                  />
                  <Animated.View 
                    style={[
                      styles.progressThumb, 
                      { 
                        left: `${getProgressPercentage()}%`,
                        transform: [{ scale: isDragging ? 1.2 : 1 }]
                      }
                    ]} 
                  />
                </View>
              </View>
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>
                  {formatTime(currentPosition)}
                </Text>
                <Text style={styles.timeText}>
                  -{formatTime(playbackStatus.duration - currentPosition)}
                </Text>
              </View>
            </View>

            {/* Controls */}
            <View style={styles.controlsContainer}>
              <View style={styles.secondaryControls}>
                <TouchableOpacity onPress={toggleShuffle} style={styles.secondaryButton}>
                  <Shuffle 
                    size={20} 
                    color={isShuffled ? "#1DB954" : "#fff"} 
                    strokeWidth={2}
                  />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.secondaryButton} onPress={handlePrevious}>
                  <SkipBack size={24} color="#fff" strokeWidth={2} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.playButton} 
                  onPress={handlePlayPause}
                  activeOpacity={0.8}
                >
                  {playbackStatus.isPlaying ? (
                    <Pause size={32} color="#000" fill="#000" />
                  ) : (
                    <Play size={32} color="#000" fill="#000" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.secondaryButton} onPress={handleNext}>
                  <SkipForward size={24} color="#fff" strokeWidth={2} />
                </TouchableOpacity>
                
                <TouchableOpacity onPress={toggleRepeat} style={styles.secondaryButton}>
                  <Repeat 
                    size={20} 
                    color={repeatMode !== 'off' ? "#1DB954" : "#fff"} 
                    strokeWidth={2}
                  />
                  {repeatMode === 'one' && (
                    <View style={styles.repeatOneDot} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
              <TouchableOpacity style={styles.bottomButton}>
                <Volume2 size={20} color="#fff" strokeWidth={1.5} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.bottomButton}>
                <Share size={20} color="#fff" strokeWidth={1.5} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.bottomButton}>
                <List size={20} color="#fff" strokeWidth={1.5} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  dragArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
    textAlign: 'center',
  },
  albumArtContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  albumArtShadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  albumArt: {
    width: width - 80,
    height: width - 80,
    borderRadius: 12,
  },
  songInfo: {
    marginBottom: 32,
  },
  songTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  songTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    flex: 1,
    marginRight: 16,
  },
  likeButton: {
    padding: 4,
  },
  artistName: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 18,
    fontFamily: 'Inter-Regular',
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressBar: {
    marginBottom: 8,
    paddingVertical: 8, // Increase touch area
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginLeft: -6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  controlsContainer: {
    marginBottom: 40,
  },
  secondaryControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  secondaryButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
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
  repeatOneDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1DB954',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
  },
  bottomButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});