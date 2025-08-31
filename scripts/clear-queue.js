const { initializeApp } = require('firebase/app');
const { getDatabase, ref, remove } = require('firebase/database');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const realtimeDb = getDatabase(app);

async function clearQueue() {
  try {
    console.log('🧹 Clearing Firebase Realtime Database queue state...');
    
    // Clear queue data
    const queueRef = ref(realtimeDb, 'queue');
    await remove(queueRef);
    console.log('✅ Queue data cleared');
    
    // Clear current slider values
    const sliderRef = ref(realtimeDb, 'sliderValues');
    await remove(sliderRef);
    console.log('✅ Slider values cleared');
    
    // Clear system state
    const systemRef = ref(realtimeDb, 'systemState');
    await remove(systemRef);
    console.log('✅ System state cleared');
    
    // Clear sessions (optional - you might want to keep this for analytics)
    const sessionsRef = ref(realtimeDb, 'sessions');
    await remove(sessionsRef);
    console.log('✅ Sessions cleared');
    
    console.log('🎉 Firebase queue state cleared successfully!');
    console.log('💡 You can now test the queue activation from a clean state.');
    
  } catch (error) {
    console.error('❌ Error clearing queue state:', error);
  }
  
  // Exit the process
  process.exit(0);
}

clearQueue();
