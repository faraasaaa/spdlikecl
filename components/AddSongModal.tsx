import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, ExternalLink } from 'lucide-react-native';
import { settingsService, type AddSongRequest } from '../services/settingsService';

interface AddSongModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (request: AddSongRequest) => void;
}

export function AddSongModal({ visible, onClose, onSuccess }: AddSongModalProps) {
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setSpotifyUrl('');
    setError(null);
    setIsSubmitting(false);
    onClose();
  };

  const handleUrlChange = (text: string) => {
    setSpotifyUrl(text);
    if (error) {
      setError(null);
    }
  };

  const validateUrl = (url: string): boolean => {
    const spotifyUrlPattern = /^https:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+(\?.*)?$/;
    return spotifyUrlPattern.test(url);
  };

  const handleSubmitRequest = async () => {
    if (!spotifyUrl.trim()) {
      setError('Please enter a Spotify URL');
      return;
    }

    if (!validateUrl(spotifyUrl.trim())) {
      setError('Please enter a valid Spotify track URL');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await settingsService.addSongRequest(spotifyUrl.trim());
      
      if (result.success && result.request) {
        onSuccess(result.request);
        handleClose();
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlaceholderUrl = () => {
    return 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <LinearGradient colors={['#1a1a1a', '#000']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView 
            style={styles.content}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.title}>Add Song</Text>
              <View style={styles.placeholder} />
            </View>

            {/* Instructions */}
            <View style={styles.instructions}>
              <Plus size={32} color="#1DB954" />
              <Text style={styles.instructionsTitle}>Request a New Song</Text>
              <Text style={styles.instructionsText}>
                Enter a Spotify track URL to request it to be added to our database. 
                We'll notify you when it becomes available for download.
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Spotify Track URL</Text>
                <View style={styles.inputWrapper}>
                  <ExternalLink size={20} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, error && styles.inputError]}
                    value={spotifyUrl}
                    onChangeText={handleUrlChange}
                    placeholder={getPlaceholderUrl()}
                    placeholderTextColor="#666"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmitRequest}
                    editable={!isSubmitting}
                  />
                </View>
                <Text style={styles.inputHint}>
                  Copy the URL from Spotify app: Share → Copy link to song
                </Text>
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!spotifyUrl.trim() || isSubmitting) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmitRequest}
                disabled={!spotifyUrl.trim() || isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <View style={styles.submitButtonContent}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.submitButtonText}>Submitting Request...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Help Section */}
            <View style={styles.helpSection}>
              <Text style={styles.helpTitle}>How to get Spotify URL:</Text>
              <Text style={styles.helpStep}>1. Open Spotify and find the song</Text>
              <Text style={styles.helpStep}>2. Tap the three dots (⋯) next to the song</Text>
              <Text style={styles.helpStep}>3. Select "Share" → "Copy link to song"</Text>
              <Text style={styles.helpStep}>4. Paste the URL here</Text>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  placeholder: {
    width: 44,
  },
  instructions: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  instructionsTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionsText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    paddingVertical: 16,
  },
  inputError: {
    borderColor: '#ff6b6b',
  },
  inputHint: {
    color: '#666',
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
  submitButton: {
    backgroundColor: '#1DB954',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#333',
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  helpSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  helpTitle: {
    color: '#1DB954',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  helpStep: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
    paddingLeft: 8,
  },
});