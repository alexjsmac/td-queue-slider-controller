import { realtimeDb, firestore } from './firebase-config';
import { ref, remove, set, get, onValue, off } from 'firebase/database';
import { collection, getDocs, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import type { QueueState, SessionSummary } from './types';

export interface QueueStatistics {
  activeUser: {
    sessionId: string;
    remainingTime: number;
    startTime: number;
  } | null;
  waitingUsers: Array<{
    sessionId: string;
    joinedAt: number;
    position: number;
  }>;
  queueLength: number;
  totalSessionsToday: number;
  averageSessionDuration: number;
  currentSliderValue: number | null;
}

export interface ResetOptions {
  clearQueue?: boolean;
  clearSliderValues?: boolean;
  clearSessions?: boolean;
  clearSystemState?: boolean;
  initialize?: boolean;
}

class AdminOperations {
  private statsListener: ((stats: QueueStatistics) => void) | null = null;
  private unsubscribes: Array<() => void> = [];

  // Get real-time queue statistics
  async getQueueStatistics(): Promise<QueueStatistics> {
    try {
      // Get queue data
      const queueRef = ref(realtimeDb, 'queue');
      const queueSnapshot = await get(queueRef);
      const queueData = queueSnapshot.val() || {};

      // Get current slider value
      const sliderRef = ref(realtimeDb, 'sliderValues/current');
      const sliderSnapshot = await get(sliderRef);
      const sliderData = sliderSnapshot.val();

      // Get today's sessions from Firestore (with error handling)
      let todaySessionCount = 0;
      let totalDuration = 0;
      
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const sessionsRef = collection(firestore, 'sessions');
        const sessionsSnapshot = await getDocs(sessionsRef);
        
        sessionsSnapshot.forEach((doc) => {
          const data = doc.data() as SessionSummary;
          const sessionDate = new Date(data.startTime);
          if (sessionDate >= today) {
            todaySessionCount++;
            totalDuration += data.duration;
          }
        });
      } catch (firestoreError: any) {
        // Handle Firestore permission errors gracefully
        if (firestoreError.code === 'permission-denied') {
          console.warn('Cannot access Firestore sessions - using default values');
        } else {
          console.error('Firestore error:', firestoreError);
        }
      }

      const avgDuration = todaySessionCount > 0 ? totalDuration / todaySessionCount : 0;

      // Format waiting users
      const waitingUsers = queueData.waitingUsers 
        ? Object.values(queueData.waitingUsers).map((user: any) => ({
            sessionId: user.sessionId,
            joinedAt: user.joinedAt,
            position: user.position || 0,
          })).sort((a, b) => a.position - b.position)
        : [];

      // Calculate remaining time for active user
      let activeUser = null;
      if (queueData.activeUser) {
        const now = Date.now();
        const endTime = queueData.activeUser.endTime || now;
        const remainingTime = Math.max(0, Math.floor((endTime - now) / 1000));
        activeUser = {
          sessionId: queueData.activeUser.sessionId,
          remainingTime,
          startTime: queueData.activeUser.startTime,
        };
      }

      // Ensure currentSliderValue is properly set
      const currentSliderValue = sliderData && typeof sliderData.value === 'number' 
        ? sliderData.value 
        : null;

      return {
        activeUser,
        waitingUsers,
        queueLength: queueData.queueLength || 0,
        totalSessionsToday: todaySessionCount,
        averageSessionDuration: Math.round(avgDuration / 1000), // Convert to seconds
        currentSliderValue,
      };
    } catch (error) {
      console.error('Error getting queue statistics:', error);
      // Return a safe default state instead of throwing
      return {
        activeUser: null,
        waitingUsers: [],
        queueLength: 0,
        totalSessionsToday: 0,
        averageSessionDuration: 0,
        currentSliderValue: null,
      };
    }
  }

  // Subscribe to real-time queue updates
  subscribeToQueueStats(callback: (stats: QueueStatistics) => void): () => void {
    this.statsListener = callback;
    
    // Set up real-time listeners
    const queueRef = ref(realtimeDb, 'queue');
    const sliderRef = ref(realtimeDb, 'sliderValues/current');
    
    const updateStats = async () => {
      const stats = await this.getQueueStatistics();
      if (this.statsListener) {
        this.statsListener(stats);
      }
    };

    // Listen to queue changes
    const queueUnsub = onValue(queueRef, updateStats);
    const sliderUnsub = onValue(sliderRef, updateStats);
    
    this.unsubscribes.push(
      () => off(queueRef, 'value', queueUnsub as any),
      () => off(sliderRef, 'value', sliderUnsub as any)
    );

    // Initial update
    updateStats();

    // Return unsubscribe function
    return () => {
      this.unsubscribes.forEach(unsub => unsub());
      this.unsubscribes = [];
      this.statsListener = null;
    };
  }

  // Reset queue with options
  async resetQueue(options: ResetOptions = {}): Promise<void> {
    try {
      const promises: Promise<any>[] = [];

      if (options.clearQueue !== false) {
        const queueRef = ref(realtimeDb, 'queue');
        promises.push(remove(queueRef));
      }

      if (options.clearSliderValues !== false) {
        const sliderRef = ref(realtimeDb, 'sliderValues');
        promises.push(remove(sliderRef));
      }

      if (options.clearSessions) {
        // Clear Firestore sessions
        const sessionsRef = collection(firestore, 'sessions');
        const snapshot = await getDocs(sessionsRef);
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        promises.push(...deletePromises);

        // Clear Realtime Database sessions
        const rtdbSessionsRef = ref(realtimeDb, 'sessions');
        promises.push(remove(rtdbSessionsRef));
      }

      if (options.clearSystemState) {
        // Try to clear system state, but handle permission errors
        try {
          const systemRef = ref(realtimeDb, 'systemState');
          await remove(systemRef);
        } catch (error: any) {
          if (error.code === 'PERMISSION_DENIED') {
            console.warn('Cannot clear system state - requires authentication');
          } else {
            throw error;
          }
        }
      }

      // Wait for all deletions to complete
      await Promise.all(promises);

      // Initialize empty queue structure if requested
      if (options.initialize !== false) {
        const queueRef = ref(realtimeDb, 'queue');
        await set(queueRef, {
          activeUser: null,
          waitingUsers: {},
          queueLength: 0,
        });
      }
    } catch (error) {
      console.error('Error resetting queue:', error);
      throw error;
    }
  }

  // Get recent sessions
  async getRecentSessions(limitCount: number = 10): Promise<SessionSummary[]> {
    try {
      const sessionsRef = collection(firestore, 'sessions');
      const q = query(sessionsRef, orderBy('startTime', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      
      const sessions: SessionSummary[] = [];
      snapshot.forEach((doc) => {
        sessions.push({ ...(doc.data() as SessionSummary), sessionId: doc.id });
      });
      
      return sessions;
    } catch (error: any) {
      // Handle permission errors gracefully
      if (error.code === 'permission-denied') {
        console.warn('Cannot access sessions - authentication required');
        return [];
      }
      console.error('Error getting recent sessions:', error);
      throw error;
    }
  }

  // Remove specific user from queue
  async removeUserFromQueue(sessionId: string): Promise<void> {
    try {
      // Check if user is active
      const queueRef = ref(realtimeDb, 'queue');
      const snapshot = await get(queueRef);
      const queueData = snapshot.val();

      if (queueData?.activeUser?.sessionId === sessionId) {
        // If active user, clear active user and activate next in queue
        await set(ref(realtimeDb, 'queue/activeUser'), null);
        
        // The queue manager will automatically activate the next user
      } else if (queueData?.waitingUsers?.[sessionId]) {
        // Remove from waiting users
        await remove(ref(realtimeDb, `queue/waitingUsers/${sessionId}`));
        
        // Update queue length
        const newLength = Math.max(0, (queueData.queueLength || 1) - 1);
        await set(ref(realtimeDb, 'queue/queueLength'), newLength);
        
        // Reposition remaining users
        const remainingUsers = Object.values(queueData.waitingUsers)
          .filter((u: any) => u.sessionId !== sessionId)
          .sort((a: any, b: any) => a.position - b.position);
        
        for (let i = 0; i < remainingUsers.length; i++) {
          const user = remainingUsers[i] as any;
          await set(ref(realtimeDb, `queue/waitingUsers/${user.sessionId}/position`), i + 1);
        }
      }
    } catch (error) {
      console.error('Error removing user from queue:', error);
      throw error;
    }
  }

  // Skip current active user and move to next
  async skipActiveUser(): Promise<void> {
    try {
      const queueRef = ref(realtimeDb, 'queue/activeUser');
      const snapshot = await get(queueRef);
      const activeUser = snapshot.val();

      if (activeUser) {
        // Set end time to now to trigger immediate transition
        await set(ref(realtimeDb, 'queue/activeUser/endTime'), Date.now());
      }
    } catch (error) {
      console.error('Error skipping active user:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const adminOps = new AdminOperations();