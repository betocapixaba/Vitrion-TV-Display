/**
 * Vitrion TV Display — Firebase client configuration.
 *
 * This module only validates public Firebase Web SDK settings. It does not
 * initialize a Firebase app or connect to any service yet. Keep cloud sync
 * disabled until Firebase Auth and restrictive RTDB/Storage rules are deployed.
 *
 * Firebase Web config values identify the project; they are not admin secrets.
 * Never place service-account credentials or Admin SDK private keys in VITE_* vars.
 */

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const readEnv = (key: string): string => {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value.trim() : '';
};

const config: FirebaseClientConfig = {
  apiKey: readEnv('VITE_FIREBASE_API_KEY'),
  authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  databaseURL: readEnv('VITE_FIREBASE_DATABASE_URL'),
  projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('VITE_FIREBASE_APP_ID'),
};

const requiredFields: Array<keyof FirebaseClientConfig> = [
  'apiKey',
  'authDomain',
  'databaseURL',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

export const firebaseClientConfig: Readonly<FirebaseClientConfig> = Object.freeze(config);

export const missingFirebaseConfigFields: readonly (keyof FirebaseClientConfig)[] =
  requiredFields.filter((field) => !config[field]);

export const isFirebaseClientConfigured = missingFirebaseConfigFields.length === 0;
