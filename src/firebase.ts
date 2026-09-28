import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCiFkx9-slAEQP4NtCUeMvoO8qcMxoGFyg",
  authDomain: "simulate-presence-dcf33.firebaseapp.com",
  projectId: "simulate-presence-dcf33",
  storageBucket: "simulate-presence-dcf33.firebasestorage.app",
  messagingSenderId: "222800804670",
  appId: "1:222800804670:web:557a829dce178dd8cfca6f",
  measurementId: "G-ND04E2XGR7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, provider);
export const logoutUser = () => signOut(auth);

// Helper to save session data
export async function saveSessionData(uid: string, sessionData: any) {
  try {
    const sessionsRef = collection(db, "sessions");
    await addDoc(sessionsRef, {
      uid,
      timestamp: serverTimestamp(),
      ...sessionData
    });
    console.log("Session saved to Firebase successfully!");
  } catch (error) {
    console.error("Error saving session to Firebase: ", error);
  }
}
