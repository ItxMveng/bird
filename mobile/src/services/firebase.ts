import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === '1';

const rawFirebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? 'bird-af69c',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim(),
};

const requiredFirebaseKeys: Array<keyof typeof rawFirebaseConfig> = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const missingKeys = requiredFirebaseKeys.filter((key) => !rawFirebaseConfig[key]);
if (!USE_MOCK && missingKeys.length > 0) {
  throw new Error(
    `Firebase config incomplete: missing ${missingKeys.join(
      ', ',
    )}. Add your EXPO_PUBLIC_FIREBASE_* values in mobile/.env.`,
  );
}

export const firebaseConfig = {
  apiKey: rawFirebaseConfig.apiKey ?? 'mock-api-key',
  authDomain: rawFirebaseConfig.authDomain ?? 'bird-af69c.firebaseapp.com',
  projectId: rawFirebaseConfig.projectId,
  storageBucket: rawFirebaseConfig.storageBucket ?? 'bird-af69c.appspot.com',
  messagingSenderId: rawFirebaseConfig.messagingSenderId ?? '000000000000',
  appId: rawFirebaseConfig.appId ?? '1:000000000000:web:mockappid',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
