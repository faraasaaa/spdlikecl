import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Check, X, CircleAlert as AlertCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export interface ToastConfig {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface ToastProps extends ToastConfig {
  visible: boolean;
  onHide: () => void;
}

export function Toast({ message, type, duration = 4000, visible, onHide }: ToastProps) {
  const [slideAnim] = useState(new Animated.Value(-100));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Slide in and fade in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, slideAnim, fadeAnim, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: -100,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check size={20} color="#fff" strokeWidth={2} />;
      case 'error':
        return <X size={20} color="#fff" strokeWidth={2} />;
      case 'info':
        return <AlertCircle size={20} color="#fff" strokeWidth={2} />;
      default:
        return null;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#1DB954';
      case 'error':
        return '#ff6b6b';
      case 'info':
        return '#3b82f6';
      default:
        return '#333';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor() },
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.content}>
        {getIcon()}
        <Text style={styles.message} numberOfLines={3}>
          {message}
        </Text>
      </View>
      
      <TouchableOpacity
        style={styles.closeButton}
        onPress={hideToast}
        activeOpacity={0.7}
      >
        <X size={16} color="#fff" strokeWidth={2} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    minHeight: 56,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  message: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    flex: 1,
    lineHeight: 20,
    paddingTop: 2, // Align with icon
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
    marginTop: -2,
  },
});