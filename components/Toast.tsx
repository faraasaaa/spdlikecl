import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
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

export function Toast({ message, type, duration = 3000, visible, onHide }: ToastProps) {
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      const timer = setTimeout(() => {
        Animated.spring(slideAnim, {
          toValue: -100,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start(() => {
          onHide();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, slideAnim, duration, onHide]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check size={20} color="#fff" />;
      case 'error':
        return <X size={20} color="#fff" />;
      case 'info':
        return <AlertCircle size={20} color="#fff" />;
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
        },
      ]}
    >
      {getIcon()}
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
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
    alignItems: 'center',
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
  },
  message: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginLeft: 12,
    flex: 1,
  },
});