# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

TouchDesigner Slider Queue is a Next.js web application that provides a real-time, queue-based interactive slider control system. Users take turns controlling a slider for 30 seconds, with values transmitted to TouchDesigner for live visualizations via Firebase (Realtime Database + Firestore).

## Architecture

### Core Components

**Static Next.js with Firebase Backend**
- The application is a static Next.js app that connects directly to Firebase services
- Firebase Realtime Database manages real-time queue state, user activation/deactivation, and slider value transmission
- Firebase Firestore stores session summaries and slider values for TouchDesigner consumption

**Queue Management System**
- `FirebaseQueueManager` class in `lib/firebase-queue.ts` handles:
  - User queue ordering and position tracking
  - 30-second timer activation for active users
  - 100ms slider value sampling during active sessions
  - Automatic progression to next queued user
  - Session data persistence to Firebase Firestore only

**Data Flow**
1. Client generates unique session ID and connects to Firebase
2. User joins queue via Firebase Realtime Database → receives real-time position updates
3. When activated → 30-second timer starts, slider becomes enabled
4. Slider values → throttled at 100ms → sent directly to Firebase Realtime DB and Firestore
5. On deactivation → session summary saved to Firestore for TouchDesigner
6. Next user automatically activated from queue via Firebase listeners

## Development Commands

### Running the Application
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm run start

# Static export for hosting (CDN/GitHub Pages)
npm run build && npm run export
```

### Code Quality
```bash
# Run ESLint
npm run lint

# TypeScript type checking (no dedicated script, runs during build)
npm run build
```

### Firebase Database Management
```bash
# No local database - all data is stored in Firebase
# View data via Firebase Console:
# - Realtime Database: https://console.firebase.google.com/project/[PROJECT_ID]/database
# - Firestore: https://console.firebase.google.com/project/[PROJECT_ID]/firestore
```

## Environment Configuration

Create `.env.local` from `.env.example`:
```bash
cp .env.example .env.local
```

Required Firebase configuration:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL` (for Realtime Database)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## TouchDesigner Integration

The system sends data to Firebase in two ways:

1. **Real-time values** 
   - **Realtime Database**: `sliderValues/current` (most recent value)
   - **Firestore Collections**: `slider_values` and `current_value`
   - Sent every time slider moves (throttled to 100ms)
   - Includes: value (-1 to 1), normalizedValue (0 to 1), sessionId, timestamp

2. **Session summaries** (Firestore Collection: `sessions`)
   - Sent when user's 30-second turn ends
   - Includes: statistics (min/max/avg/stddev), sampled history (every 10th value), duration

TouchDesigner should connect to:
- **Realtime Database** `sliderValues/current` for live values
- **Firestore** `current_value` collection for latest value with metadata
- **Firestore** `sessions` collection for historical session data

## Key Technical Details

### Firebase Realtime Database Structure

**Queue Management** (`/queue`):
- `activeUser`: { sessionId, startTime, endTime, remainingTime }
- `waitingUsers`: { [sessionId]: { sessionId, joinedAt, position } }
- `queueLength`: number

**Slider Values** (`/sliderValues`):
- `current`: { value, normalizedValue, sessionId, timestamp }

**React Hook Events** (`useFirebaseQueue`):
- Real-time listeners automatically update queue position, active status, and remaining time
- No manual event handling needed - Firebase listeners manage all state updates

### State Management

- Client state managed via `useFirebaseQueue` hook (aliased as `useSocket` for backward compatibility)
- Firebase Realtime Database maintains persistent queue state
- Session IDs stored in localStorage for persistence across page reloads
- Active user has exclusive slider control enforced by Firebase security rules

### Data Persistence

**Firebase Firestore Collections:**
- `sessions`: session summaries with statistics and sampled history
- `slider_values`: individual slider readings for real-time TouchDesigner consumption
- `current_value`: latest slider value with metadata

**Firebase Realtime Database:**
- Live queue state and current slider values for real-time updates

**Value Sampling:**
- Client collects slider values at 100ms intervals during active sessions
- Client throttles slider transmission at 100ms to prevent flooding
- Session summaries saved to Firestore with sampled dataset (1/10th)

## Common Development Tasks

### Adding New Firebase Operations
1. Add method to `FirebaseQueueManager` class in `lib/firebase-queue.ts`
2. Add corresponding hook method in `hooks/useFirebaseQueue.ts`
3. Update TypeScript interfaces in `lib/types.ts`

### Modifying Queue Duration
Change the timer duration in `lib/firebase-queue.ts`:
- Line 135: Update `endTime` calculation (30 * 1000 = 30 seconds)
- Line 154: Update `setTimeout` duration (30000 = 30 seconds)
- Update duration field in Firestore session summary

### Debugging Connection Issues
1. Check Firebase connection in browser DevTools Console
2. Verify Firebase configuration in `.env.local`
3. Ensure Firebase Realtime Database and Firestore are enabled in Firebase Console
4. Check Firebase security rules allow read/write access

### Testing Queue Behavior
Open multiple browser tabs/windows to simulate multiple users:
- Each tab gets unique session ID (stored in localStorage)
- Can test queue ordering, position updates, activation cycling
- Monitor browser console for Firebase connection logs
- View live data in Firebase Console

## Performance Considerations

- Slider value transmission throttled to prevent Firebase quota exhaustion
- Firebase writes are fire-and-forget to avoid blocking queue operations  
- Session data sampled (every 10th value) before saving to Firestore to minimize storage costs
- React re-renders minimized through proper dependency arrays in hooks
- Firebase Realtime Database provides efficient real-time updates
- Static export enables CDN deployment for global performance
