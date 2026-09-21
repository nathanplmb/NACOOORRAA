import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB3L2bIibXwEYbuj66W-J5hjkNp6x4MOAk",
  authDomain: "nacora-7c9d2.firebaseapp.com",
  projectId: "nacora-7c9d2",
  storageBucket: "nacora-7c9d2.firebasestorage.app",
  messagingSenderId: "350691239439",
  appId: "1:350691239439:web:2617d86342605a302da57a",
  measurementId: "G-LHDBW2YD6G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
