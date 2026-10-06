import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "chromatic-pride-0ttsj",
  appId: "1:756507127644:web:fc28107dd861a2dd3cdb99",
  apiKey: "AIzaSyCgxfayQSG0StnO4MDsP_N2VqF9SHZmAuo",
  authDomain: "chromatic-pride-0ttsj.firebaseapp.com",
  storageBucket: "chromatic-pride-0ttsj.firebasestorage.app",
  messagingSenderId: "756507127644"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore on the custom database id provided in the config as the third argument
export const db = initializeFirestore(app, {}, "ai-studio-f947253c-4469-4545-9268-02ec4d0ccde0");
