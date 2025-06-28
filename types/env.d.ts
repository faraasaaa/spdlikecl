declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_SPOTIFY_CLIENT_ID: string;
      EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET: string;
    }
  }
}

export {};