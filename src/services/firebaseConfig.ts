import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = getAuth(app);

// Initialize Firestore with long-polling for React Native compatibility
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export { app, auth, db };
