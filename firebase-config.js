// ═══════════════════════════════════════════════════════════
// FIREBASE CONFIG — Imkon Tower
// ═══════════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey: "AIzaSyBTUP45BOV_2K7fN3WJUCXn9aqbJn4Pe6A",
  authDomain: "imkon-tower-620c2.firebaseapp.com",
  projectId: "imkon-tower-620c2",
  storageBucket: "imkon-tower-620c2.firebasestorage.app",
  messagingSenderId: "288947179743",
  appId: "1:288947179743:web:b70fe855602dc18152996a"
};

// Рақамҳои тамос
const CONTACT = {
  whatsapp: '992937988000',
  telegram: '992881180770'
};

// ── Firebase init (compat SDK) ──
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
// Storage — Cloudinary истифода мешавад, Firebase Storage лозим нест
let storage = null;
try { storage = firebase.storage(); } catch(e) { console.warn('Firebase Storage disabled:', e.message); }