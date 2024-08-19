// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAF88i8mW0TUp-03VIc7oI5GlWUiUNo9Ps",
  authDomain: "task-manager-f9bd5.firebaseapp.com",
  projectId: "task-manager-f9bd5",
  storageBucket: "task-manager-f9bd5.appspot.com",
  messagingSenderId: "935058544654",
  appId: "1:935058544654:web:6587e5bb9c0d77b156045f",
  measurementId: "G-XMZ3Y4ZSRH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

export { auth, firestore };
