import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyDm4bERB6XEMk_QQINQHFZo0GpmLAwGTRI",
  authDomain: "hackxios-authentication.firebaseapp.com",
  projectId: "hackxios-authentication",
  storageBucket: "hackxios-authentication.firebasestorage.app",
  messagingSenderId: "295050118112",
  appId: "1:295050118112:web:582d42492681c977d16185"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
