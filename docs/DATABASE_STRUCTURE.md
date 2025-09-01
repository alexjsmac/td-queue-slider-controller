# Firebase Database Architecture

The TouchDesigner Slider Queue uses a **dual-database approach** with Firebase:
- **Realtime Database**: Live queue state and current slider values
- **Firestore**: Session summaries and historical data for TouchDesigner

## Firebase Realtime Database Schema

> Used for real-time queue management and current slider values

```json
{
  "queue": {
    "activeUser": {
      "sessionId": "uuid-string",
      "startTime": 1234567890000,
      "endTime": 1234567890000,
      "remainingTime": 25
    },
    "waitingUsers": {
      "user1": {
        "sessionId": "uuid-string",
        "joinedAt": 1234567890000,
        "position": 1
      },
      "user2": {
        "sessionId": "uuid-string", 
        "joinedAt": 1234567890000,
        "position": 2
      }
    },
    "queueLength": 2
  },
  "sliderValues": {
    "current": {
      "value": -0.5,
      "normalizedValue": 0.25,
      "sessionId": "uuid-string",
      "timestamp": 1234567890000
    }
  },
  "systemState": {
    "lastUpdated": 1234567890000,
    "serverTime": 1234567890000,
    "totalSessions": 10,
    "activeConnections": 3
  }
}
```

## Firebase Firestore Collections

> Used for session summaries and TouchDesigner data consumption

### `sessions` Collection
```json
{
  "sessionId": "uuid-string",
  "startTime": "2024-08-31T10:00:00.000Z",
  "endTime": "2024-08-31T10:00:30.000Z", 
  "duration": 30,
  "dataPoints": 300,
  "statistics": {
    "average": 0.1,
    "min": -0.8,
    "max": 0.9,
    "standardDeviation": 0.45
  }
}
```


## Realtime Database Rules

```json
{
  "rules": {
    ".read": true,
    "queue": {
      ".write": true,
      "activeUser": {
        ".validate": "newData.hasChildren(['sessionId', 'startTime', 'endTime'])"
      },
      "waitingUsers": {
        "$userId": {
          ".validate": "newData.hasChildren(['sessionId', 'joinedAt', 'position'])"
        }
      }
    },
    "sliderValues": {
      ".write": true,
      "current": {
        ".validate": "newData.hasChildren(['value', 'normalizedValue', 'sessionId', 'timestamp']) && newData.child('value').val() >= -1 && newData.child('value').val() <= 1"
      }
    },
    "systemState": {
      ".write": true
    }
  }
}
```

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow public read access
    match /{document=**} {
      allow read: if true;
    }
    
    // Session summaries - write from web app, read requires authentication
    match /sessions/{sessionId} {
      allow write: if true; // Web app can write session summaries
      allow read: if request.auth != null; // Only authenticated users can read
    }
    
    // System state - requires authentication
    match /system/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Key Design Decisions

### Dual Database Strategy
1. **Realtime Database**: Handles live queue state and current slider values
   - Optimized for real-time updates (sub-100ms)
   - Minimal data structure for performance
   - Direct TouchDesigner REST API access

2. **Firestore**: Handles session summaries only
   - Better for complex queries and analytics
   - Document-based structure for historical data
   - Statistics-only approach to control costs

### Architecture Benefits
1. **Queue Management**: Separate `activeUser` and `waitingUsers` for clear state management
2. **Real-time Performance**: Current slider value updated in real-time
3. **Data Persistence**: Session summaries stored permanently in Firestore
4. **Cost Optimization**: Statistics-only approach reduces Firestore writes
5. **TouchDesigner Integration**: Multiple endpoints for different use cases

## TouchDesigner Integration Endpoints

### Real-time Data (Realtime Database)
```
# Current slider value (recommended for live visuals)
GET https://PROJECT-ID-default-rtdb.firebaseio.com/sliderValues/current.json

# Queue state (for queue visualization)
GET https://PROJECT-ID-default-rtdb.firebaseio.com/queue.json
```

### Historical Data (Firestore)
```
# Session summaries (for analytics) - requires authentication
GET https://firestore.googleapis.com/v1/projects/PROJECT-ID/databases/(default)/documents/sessions
```

## Advantages Over Socket.IO Architecture

- **No Custom Server**: Pure client-side static application
- **Automatic Scaling**: Firebase handles all infrastructure
- **Built-in Persistence**: Data survives across sessions
- **Global Synchronization**: All clients sync automatically
- **Offline Resilience**: Works with intermittent connections
- **Direct API Access**: TouchDesigner connects directly to Firebase
- **Cost Effective**: Pay only for actual usage
- **Multiple Data Sources**: Realtime DB for live data, Firestore for analytics
