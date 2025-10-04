
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: [
            '.ios.ts',
            '.android.ts',
            '.ts',
            '.ios.tsx',
            '.android.tsx',
            '.tsx',
            '.jsx',
            '.js',
            '.json',
          ],
          alias: {
            '@': './',
            '@components': './components',
            '@style': './style',
            '@hooks': './hooks',
            '@types': './types',
          },
        },
      ],
      // FIXED: Ensure react-native-reanimated/plugin is the last plugin to fix Worklets version mismatch
      'react-native-reanimated/plugin',
    ],
  };
};
