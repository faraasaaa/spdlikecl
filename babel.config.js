module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // NOTE: `expo-router/babel` is a plugin that you must install if you use Expo Router
      'expo-router/babel',
      // NOTE: this must be last in the plugins
      'react-native-reanimated/plugin',
    ],
  };
};