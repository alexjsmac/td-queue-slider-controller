import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { 
  SessionValueHistory 
} from './types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if it hasn't been initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const rtdb = getDatabase(app);

/**
 * Send slider value to Firestore for Touch Designer consumption
 * The data structure is designed for real-time visualization
 */
export async function sendSliderValueToFirestore(value: number, sessionId: string) {
  try {
    // Collection for real-time slider values
    const sliderCollection = collection(db, 'slider_values');
    
    await addDoc(sliderCollection, {
      value,
      sessionId,
      timestamp: serverTimestamp(),
      // Additional fields for Touch Designer
      normalizedValue: (value + 1) / 2, // Convert -1 to 1 range to 0 to 1
      active: true
    });

    // Also update a "current" document for the latest value
    // This allows Touch Designer to always get the most recent value
    const currentCollection = collection(db, 'current_value');
    await addDoc(currentCollection, {
      value,
      sessionId,
      timestamp: serverTimestamp(),
      normalizedValue: (value + 1) / 2,
    });

  } catch (error) {
    console.error('Error sending value to Firestore:', error);
  }
}

/**
 * Send session summary to Firestore when a user's turn ends
 */
export async function sendSessionSummaryToFirestore(
  sessionId: string,
  startTime: Date,
  endTime: Date,
  valueHistory: SessionValueHistory[]
) {
  try {
    const sessionsCollection = collection(db, 'sessions');
    
    // Calculate some statistics for the session
    const values = valueHistory.map(h => h.value);
    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    await addDoc(sessionsCollection, {
      sessionId,
      startTime,
      endTime,
      duration: 30, // seconds
      dataPoints: valueHistory.length,
      statistics: {
        average: avgValue,
        min: minValue,
        max: maxValue,
        standardDeviation: calculateStandardDeviation(values)
      },
      // Store compressed value history (sample every 10th value to reduce size)
      sampledHistory: valueHistory
        .filter((_, index) => index % 10 === 0)
        .map(h => ({
          t: h.timestamp.getTime(),
          v: h.value
        })),
      timestamp: serverTimestamp()
    });

    console.log(`Session ${sessionId} summary sent to Firestore`);
  } catch (error) {
    console.error('Error sending session summary to Firestore:', error);
  }
}

function calculateStandardDeviation(values: number[]): number {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b) / n;
  const variance = values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / n;
  return Math.sqrt(variance);
}

// ============================================================================
// REALTIME DATABASE FUNCTIONS FOR QUEUE MANAGEMENT
// ============================================================================

/**
 * Update current slider value in Realtime Database
 */
export async function updateSliderValue(value: number, sessionId: string) {
  try {
    const sliderRef = ref(rtdb, 'sliderValues/current');
    await set(sliderRef, {
      value,
      normalizedValue: (value + 1) / 2,
      sessionId,
      timestamp: rtdbServerTimestamp()
    });

    // Also send to Firestore for TouchDesigner (backward compatibility)
    await sendSliderValueToFirestore(value, sessionId);
  } catch (error) {
    console.error('Error updating slider value:', error);
  }
}

// All queue management is now handled by FirebaseQueueManager in firebase-queue.ts
// This file only contains Firestore operations and utility functions

export { db, rtdb };
