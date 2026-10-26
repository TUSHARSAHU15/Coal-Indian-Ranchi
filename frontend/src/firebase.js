import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAPFjpVUj8ilK6sGWgAPel8mKdic86_cIg",
  authDomain: "ccl-dvms.firebaseapp.com",
  projectId: "ccl-dvms",
  storageBucket: "ccl-dvms.firebasestorage.app",
  messagingSenderId: "848098454600",
  appId: "1:848098454600:web:a498d3faceb3dcfc0abc7d",
  measurementId: "G-448MFHSYE6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
