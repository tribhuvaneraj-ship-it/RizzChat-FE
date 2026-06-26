// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDEEBx6MkAJPATCu5FJ878BW0babGprahI",
  authDomain: "auth-032007.firebaseapp.com",
  projectId: "auth-032007",
  storageBucket: "auth-032007.firebasestorage.app",
  messagingSenderId: "820069782466",
  appId: "1:820069782466:web:c736bbd5b09bc5d2223c5b",
  measurementId: "G-P3LVHW912F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export default app;