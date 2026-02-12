// frontend/js/firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyCeScZUZii7ef6Ou_Hptv_gSqnPASOMXVk",
  authDomain: "smartfarmersystem-5c9ee.firebaseapp.com",
  databaseURL: "https://smartfarmersystem-5c9ee-default-rtdb.firebaseio.com",
  projectId: "smartfarmersystem-5c9ee",
  storageBucket: "smartfarmersystem-5c9ee.firebasestorage.app",
  messagingSenderId: "814146849558",
  appId: "1:814146849558:web:4391c0c2960321d17cde37",
  measurementId: "G-KNDV2VDCE4"
};

if (typeof firebase === "undefined") {
  console.error("❌ Firebase SDK not loaded. Include firebase-app-compat.js first.");
} else {
  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized");
  }
}

const auth = firebase.auth();
