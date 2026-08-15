/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Jest's transform only covers .js/.ts/.tsx, so the .mjs entry point that
    // lucide resolves to under Node would never be transpiled. Point at its CJS
    // build instead. Metro is unaffected and still uses the ESM build.
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  // Packages that ship untranspiled ESM and must go through Babel.
  // `[/\\]` because Jest sees Windows paths with backslashes.
  // `standard-navigation` is Expo Router's navigation core as of SDK 56.
  transformIgnorePatterns: [
    'node_modules[/\\\\](?!(' +
      [
        '(jest-)?react-native',
        '@react-native(-community)?',
        'expo(nent)?',
        '@expo(nent)?[/\\\\].*',
        '@expo-google-fonts[/\\\\].*',
        'expo-router',
        'standard-navigation',
        'react-navigation',
        '@react-navigation[/\\\\].*',
        '@unimodules[/\\\\].*',
        'unimodules',
        'react-native-svg',
        'react-native-reanimated',
        'react-native-gesture-handler',
        'nativewind',
        'react-native-css-interop',
        '@rn-primitives[/\\\\].*',
        'lucide-react-native',
        // Victory publishes an untranspiled ESM build under es/; every
        // victory-* package needs Babel.
        'victory.*',
      ].join('|') +
      ')[/\\\\]?)',
  ],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'features/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
  ],
};
