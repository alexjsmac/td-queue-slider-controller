# Firebase Deployment Guide

## 🚀 Complete Firebase Deployment

This guide will help you deploy the TouchDesigner Slider Queue to Firebase Hosting with Realtime Database and Firestore.

## Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project with Realtime Database and Firestore enabled
- Environment variables configured

## Step 1: Firebase Setup

### Enable Firebase Services

**Realtime Database:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to "Build" → "Realtime Database"
4. Click "Create Database"
5. Choose "Start in test mode" (we'll update rules later)
6. Select your preferred location

**Firestore Database:**
1. Navigate to "Build" → "Firestore Database"
2. Click "Create Database"
3. Choose "Start in test mode"
4. Select your preferred location

### Get Database URL

1. In Realtime Database, copy the database URL
2. It looks like: `https://your-project-default-rtdb.firebaseio.com/`
3. Add this to your `.env.local` as `NEXT_PUBLIC_FIREBASE_DATABASE_URL`

## Step 2: Environment Configuration

Create `.env.local` with your Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com/
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## Step 3: Initialize Firebase

```bash
# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Select:
# - Hosting: Configure files for Firebase Hosting
# - Realtime Database: Configure a realtime database and rules file
# - Firestore: Configure Firestore and rules file
```

When prompted:
- **Database rules file**: Use `database.rules.json` (already created)
- **Firestore rules file**: Use `firestore.rules` (already created)
- **Public directory**: Use `out` 
- **Single-page app**: Yes
- **Overwrite index.html**: No

## Step 4: Deploy Database Rules

Update your database rules:

```bash
# Deploy Realtime Database rules
firebase deploy --only database

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

This uploads rules from `database.rules.json` and `firestore.rules` to secure your databases.

## Step 5: Build and Deploy

```bash
# Build for production
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

## Step 6: Verify Deployment

1. Firebase will provide a URL (e.g., `https://your-project.web.app`)
2. Open the URL in multiple browser tabs to test the queue system
3. Check Firebase Realtime Database console to see live data

## TouchDesigner Integration

### Direct Database Access

TouchDesigner can access data through multiple Firebase endpoints:

**Real-time Data (Realtime Database - Recommended):**
```
# Current Slider Value
GET https://your-project-default-rtdb.firebaseio.com/sliderValues/current.json

# Queue State
GET https://your-project-default-rtdb.firebaseio.com/queue.json
```

**Historical Data (Firestore):**
```
# Session Summaries
GET https://firestore.googleapis.com/v1/projects/YOUR_PROJECT/databases/(default)/documents/sessions

# Latest Slider Value
GET https://firestore.googleapis.com/v1/projects/YOUR_PROJECT/databases/(default)/documents/current_value
```

### Response Format

```json
{
  "value": -0.5,
  "normalizedValue": 0.25,
  "sessionId": "uuid",
  "timestamp": 1234567890
}
```

## Maintenance Commands

```bash
# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only database rules
firebase deploy --only database

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# View deployment logs
firebase serve

# Check project status
firebase projects:list
```

## Monitoring

### Firebase Console
- Monitor usage in Firebase Console
- Check Realtime Database usage and quotas
- Monitor Firestore usage and document counts
- Review hosting analytics

### Live Debugging
- Use Firebase Console's Realtime Database viewer for live queue state
- Use Firestore Console to view session summaries and historical data
- Watch live updates as users interact
- Monitor connection status and data flow

## Scaling Considerations

### Free Tier Limits
- **Realtime Database**: 1GB storage, 10GB/month bandwidth
- **Firestore**: 1GB storage, 50K reads, 20K writes, 20K deletes per day
- **Hosting**: 10GB storage, 360MB/day transfer
- **Simultaneous connections**: 100 (Realtime Database)

### Performance Optimization
- Data is automatically cached at edge locations
- Real-time updates work globally
- Firebase handles scaling automatically

## Troubleshooting

### Common Issues

1. **Database rules too restrictive**
   ```bash
   firebase deploy --only database
   ```

2. **Environment variables not working**
   - Ensure all variables start with `NEXT_PUBLIC_`
   - Check `.env.local` is in project root
   - Rebuild after environment changes

3. **Build fails**
   ```bash
   rm -rf .next out node_modules
   npm install
   npm run build
   ```

4. **Real-time not working**
   - Check database URL format
   - Verify database rules allow read/write
   - Check browser console for connection errors

### Debug Mode

Enable Firebase debug mode:
```bash
# In browser console
localStorage.debug = 'firebase*'
```

## Security

### Production Rules

For production, update `database.rules.json`:

```json
{
  "rules": {
    ".read": true,
    ".write": "auth != null || (now - root.child('systemState/lastActivity').val()) < 60000",
    "queue": {
      "waitingUsers": {
        "$sessionId": {
          ".write": "$sessionId == newData.child('sessionId').val()"
        }
      }
    }
  }
}
```

### Rate Limiting

Firebase automatically handles:
- DDoS protection
- Connection limits
- Bandwidth throttling

## Cost Optimization

### Monitor Usage
- Set up billing alerts
- Monitor Realtime Database bandwidth
- Use Firebase Analytics for usage tracking

### Optimize Data Structure
- Minimize data size in Realtime Database paths (live queue data)
- Use Firestore for session summaries and historical data
- Implement data cleanup for old Firestore sessions
- Sample slider values (every 10th) to reduce Firestore writes

## Support

For issues:
1. Check Firebase Status Page
2. Review Firebase Documentation
3. Check project's GitHub issues
4. Firebase Support (paid plans)

---

🎉 **Congratulations!** Your TouchDesigner Slider Queue is now deployed on Firebase and ready for collaborative real-time interactions!
