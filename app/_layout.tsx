import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { dataManager } from '@/services/dataManager';
import { storageService } from '@/services/storageService';
import { useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const [isReady, setIsReady] = useState(false);
  const [hasUsername, setHasUsername] = useState<boolean | null>(null);
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize data migration
        await dataManager.migrateDataToPersistentStorage();
        console.log('App initialization completed');

        // Check if user has a saved username
        const savedUsername = await storageService.loadData<string>('username');
        setHasUsername(!!savedUsername);

        console.log('Username check:', savedUsername ? 'Found' : 'Not found');
      } catch (error) {
        console.error('Error during app initialization:', error);
        // If there's an error, assume no username and let user register
        setHasUsername(false);
      } finally {
        setIsReady(true);
      }
    };

    if (fontsLoaded || fontError) {
      initializeApp();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (isReady && hasUsername !== null) {
      SplashScreen.hideAsync();
      
      // Navigate based on username status
      if (hasUsername) {
        router.replace('/(tabs)');
      } else {
        router.replace('/register');
      }
    }
  }, [isReady, hasUsername, router]);

  // Show loading screen while checking username status
  if (!isReady || hasUsername === null || (!fontsLoaded && !fontError)) {
    return (
      <LinearGradient colors={['#1DB954', '#1a1a1a', '#000']} style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          {/* You could add a loading spinner or logo here */}
        </View>
      </LinearGradient>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" backgroundColor="#000" />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});