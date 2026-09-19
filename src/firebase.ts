import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDSuWsOTSmd8PUkIsN6-P-OAklI9raLWY8",
  authDomain: "sturdy-turbine-17dgj.firebaseapp.com",
  projectId: "sturdy-turbine-17dgj",
  storageBucket: "sturdy-turbine-17dgj.firebasestorage.app",
  messagingSenderId: "1073701319587",
  appId: "1:1073701319587:web:024f693a0dfa73d1776016",
  firestoreDatabaseId: "ai-studio-b2fd733f-7ae2-4600-af7a-5faf7bad6765"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
