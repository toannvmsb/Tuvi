const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @supabase/supabase-js v2.47+ bundles OTel tracing code that uses
// import(/* webpackIgnore */ variable) — magic comments inside import()
// crash the Hermes parser. Adding @supabase to the transform list
// forces Babel to process the bundle and strip those comments.
const defaultIgnore =
  'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/(?!metro-runtime)|@expo-google-fonts|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)';

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
