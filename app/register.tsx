import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { storageService } from '../services/storageService';
import { Music } from 'lucide-react-native';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async () => {
    if (!username.trim()) {
      setError('Username cannot be empty.');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }

    if (username.trim().length > 30) {
      setError('Username must be less than 30 characters.');
      return;
    }

    // Basic validation for username format
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username.trim())) {
      setError('Username can only contain letters, numbers, underscores, and hyphens.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `https://faras1334.pythonanywhere.com/registerid?id=${encodeURIComponent(username.trim())}`
      );

      if (response.status === 201) {
        // Save username to persistent storage
        await storageService.saveData('username', username.trim());
        
        // Navigate to main app tabs
        router.replace('/(tabs)');
      } else {
        setError('Unexpected response from server.');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 400) {
          setError(err.response.data.error || 'Invalid username provided.');
        } else if (err.response.status === 409) {
          setError(err.response.data.error || 'Username already exists. Please try another.');
        } else {
          setError(`Registration failed: ${err.response.status} - ${err.response.statusText}`);
        }
      } else {
        setError('Network error or unexpected issue. Please try again.');
      }
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    if (error) {
      setError(null); // Clear error when user starts typing
    }
  };

  return (
    <LinearGradient colors={['#1DB954', '#1a1a1a', '#000']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Music size={64} color="#fff" strokeWidth={1.5} />
            </View>
            <Text style={styles.title}>Welcome to Bolt Music</Text>
            <Text style={styles.subtitle}>
              Choose a unique username to get started with your music journey.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                placeholder="Enter your username"
                placeholderTextColor="#888"
                value={username}
                onChangeText={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <Text style={styles.inputHint}>
                3-30 characters, letters, numbers, underscores, and hyphens only
              </Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                (loading || !username.trim()) && styles.buttonDisabled
              ]}
              onPress={handleRegister}
              disabled={loading || !username.trim()}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#000" size="small" />
                  <Text style={styles.buttonTextLoading}>Creating Account...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our terms of service and privacy policy.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#ff6b6b',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  inputHint: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
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
  buttonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  buttonTextLoading: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  footer: {
    marginTop: 32,
    paddingHorizontal: 16,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
});