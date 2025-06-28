import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchBar } from '../../components/SearchBar';
import { TrackCard } from '../../components/TrackCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { FullScreenPlayer } from '../../components/FullScreenPlayer';
import { Toast } from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { spotifyApi } from '../../services/spotifyApi';
import type { SpotifyTrack, SpotifyArtist, SpotifyPlaylist } from '../../types/spotify';

export default function HomeScreen() {
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'tracks' | 'artists' | 'playlists'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const { toast, showToast, hideToast } = useToast();
  const insets = useSafeAreaInsets();

  const searchDelayRef = useRef<NodeJS.Timeout>();

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setTracks([]);
      setArtists([]);
      setPlaylists([]);
      setHasSearched(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);

      const results = await spotifyApi.search(searchQuery, 'track,artist,playlist', 20);

      setTracks(results.tracks?.items || []);
      setArtists(results.artists?.items || []);
      setPlaylists(results.playlists?.items || []);
    } catch (err) {
      console.error('Search error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Search failed. Please try again.';
      setError(errorMessage);
      setTracks([]);
      setArtists([]);
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    
    // Clear previous timeout
    if (searchDelayRef.current) {
      clearTimeout(searchDelayRef.current);
    }

    // Debounce search
    searchDelayRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
  };

  const handleRetry = () => {
    setError(null);
    if (query.trim()) {
      performSearch(query);
    }
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {[
        { key: 'all', label: 'All' },
        { key: 'tracks', label: 'Songs' },
        { key: 'artists', label: 'Artists' },
        { key: 'playlists', label: 'Playlists' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => setActiveTab(tab.key as any)}
        >
          <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSearchResults = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={32} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Search Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          {error.includes('credentials') || error.includes('Client ID') ? (
            <View style={styles.setupContainer}>
              <Text style={styles.setupTitle}>Setup Required:</Text>
              <Text style={styles.setupStep}>1. Go to https://developer.spotify.com/dashboard</Text>
              <Text style={styles.setupStep}>2. Create a new app or select an existing one</Text>
              <Text style={styles.setupStep}>3. Copy your Client ID and Client Secret</Text>
              <Text style={styles.setupStep}>4. Update the .env file with your credentials</Text>
              <Text style={styles.setupStep}>5. Restart the development server</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (!hasSearched) {
      return (
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitle}>Search for Music</Text>
          <Text style={styles.welcomeSubtitle}>
            Find your favorite songs, artists, and playlists
          </Text>
        </View>
      );
    }

    if (tracks.length === 0 && artists.length === 0 && playlists.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>Try different keywords</Text>
        </View>
      );
    }

    return (
      <ScrollView 
        style={styles.resultsContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(100, insets.bottom + 80) }}
      >
        {(activeTab === 'all' || activeTab === 'tracks') && tracks.length > 0 && (
          <View style={styles.resultSection}>
            {activeTab === 'all' && <Text style={styles.sectionTitle}>Songs</Text>}
            {tracks.slice(0, activeTab === 'all' ? 10 : tracks.length).map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                onPress={() => console.log('Open track:', track.name)}
                onPlayPress={() => console.log('Play track:', track.name)}
                showDownload={true}
                isSearchResult={true}
              />
            ))}
          </View>
        )}

        {(activeTab === 'all' || activeTab === 'artists') && artists.length > 0 && (
          <View style={styles.resultSection}>
            {activeTab === 'all' && <Text style={styles.sectionTitle}>Artists</Text>}
            {artists.slice(0, activeTab === 'all' ? 5 : artists.length).map((artist) => (
              <TouchableOpacity
                key={artist.id}
                style={styles.artistItem}
                onPress={() => console.log('Open artist:', artist.name)}
                activeOpacity={0.7}
              >
                <Text style={styles.artistName}>{artist.name}</Text>
                <Text style={styles.artistFollowers}>
                  {artist.followers.total.toLocaleString()} followers
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <LinearGradient colors={['#1a1a1a', '#000']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
        </View>

        <SearchBar onSearch={handleSearch} />
        
        {hasSearched && renderTabs()}
        
        {renderSearchResults()}
        
        <FullScreenPlayer 
          visible={showFullPlayer} 
          onClose={() => setShowFullPlayer(false)} 
        />

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            visible={toast.visible}
            onHide={hideToast}
          />
        )}
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  greeting: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'Inter-Bold',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333',
  },
  activeTab: {
    backgroundColor: '#1DB954',
    borderColor: '#1DB954',
  },
  tabText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  activeTabText: {
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  resultsContainer: {
    flex: 1,
  },
  resultSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  artistItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#1a1a1a',
    borderBottomWidth: 1,
  },
  artistName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  artistFollowers: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  setupContainer: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  setupTitle: {
    color: '#1DB954',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  setupStep: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 6,
    paddingLeft: 8,
  },
  retryButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
});