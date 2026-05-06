
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/setup#config-object
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Authentication with persistent session (PWA-safe)
let authInstance: any = null;

function getFirebaseAuth() {
  if (typeof window === "undefined") return getAuth(app);
  
  if (authInstance) return authInstance;

  try {
    authInstance = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence]
    });
    return authInstance;
  } catch (error) {
    // Si falla la inicialización (ej. ya inicializado), intentar obtener el existente
    authInstance = getAuth(app);
    return authInstance;
  }
}

export const auth = getFirebaseAuth();

// Initialize Firestore with Offline Persistence (Only on client)
function getFirebaseFirestore() {
  if (typeof window === "undefined") return getFirestore(app);
  
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      experimentalAutoDetectLongPolling: true // Ayuda si websockets están bloqueados en tu red/dev
    });
  } catch {
    // Si ya fue inicializado por Hot Reload
    return getFirestore(app);
  }
}

export const db = getFirebaseFirestore();
