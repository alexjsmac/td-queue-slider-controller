import { firestore, realtimeDb } from './firebase-config';
import { ref, set, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Update current slider value in Realtime Database for live updates
 */
export async function updateRealtimeSliderValue(value: number, sessionId: string): Promise<void> {
  try {
    const sliderRef = ref(realtimeDb, 'sliderValues/current');
    await set(sliderRef, {
      value,
      normalizedValue: (value + 1) / 2, // Convert -1 to 1 range to 0 to 1
      sessionId,
      timestamp: rtdbServerTimestamp()
    });
  } catch (error) {
    console.error('Error updating realtime slider value:', error);
    throw error;
  }
}

/**
 * Send slider value to Firestore for TouchDesigner consumption
 * The data structure is designed for real-time visualization
 */
export async function sendSliderValueToTouchDesigner(value: number, sessionId: string): Promise<void> {
  try {
    // Collection for real-time slider values
    const sliderCollection = collection(firestore, 'slider_values');
    
    await addDoc(sliderCollection, {
      value,
      sessionId,
      timestamp: serverTimestamp(),
      // Additional fields for TouchDesigner
      normalizedValue: (value + 1) / 2, // Convert -1 to 1 range to 0 to 1
      active: true
    });

    // Also update a "current" document for the latest value
    // This allows TouchDesigner to always get the most recent value
    const currentCollection = collection(firestore, 'current_value');
    await addDoc(currentCollection, {
      value,
      sessionId,
      timestamp: serverTimestamp(),
      normalizedValue: (value + 1) / 2,
    });

  } catch (error) {
    console.error('Error sending value to TouchDesigner:', error);
    throw error;
  }
}

/**
 * Update slider value in both realtime database and TouchDesigner
 * This is the main function to call when updating slider values
 */
export async function updateSliderValue(value: number, sessionId: string): Promise<void> {
  try {
    // Update realtime database for live UI updates
    await updateRealtimeSliderValue(value, sessionId);
    
    // Send to TouchDesigner via Firestore
    await sendSliderValueToTouchDesigner(value, sessionId);
    
  } catch (error) {
    console.error('Error updating slider value:', error);
    throw error;
  }
}
