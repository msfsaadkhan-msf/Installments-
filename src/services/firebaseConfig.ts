import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth,
  initializeAuth, 
  // @ts-ignore
  getReactNativePersistence 
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDI6AbnB_QxSFvDruk-4Xn366TWd7gxqF8",
  authDomain: "installment-managmet-system.firebaseapp.com",
  projectId: "installment-managmet-system",
  storageBucket: "installment-managmet-system.firebasestorage.app",
  messagingSenderId: "894359346854",
  appId: "1:894359346854:web:323dee1c7ece7fad825e67",
  measurementId: "G-LWXWVM6YCH"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth with persistence
let auth: any;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  auth = getAuth(app);
}

// Initialize Firestore with long-polling for React Native compatibility
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export { app, auth, db };
