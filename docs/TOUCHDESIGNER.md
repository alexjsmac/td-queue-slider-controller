# TouchDesigner Firebase Integration

This guide shows how to connect TouchDesigner to your Firebase slider queue system using authenticated Web Client DATs.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install firebase-admin google-auth-library
```

### 2. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/) → Your Project
2. Navigate to **Project Settings** → **Service Accounts** 
3. Click **"Generate new private key"**
4. Save the JSON file as `firebase-admin-key.json` in your project root

### 3. Generate Authentication Token

```bash
# Generate OAuth token for TouchDesigner
npm run touchdesigner:token
```

This creates `touchdesigner-config.json` with:
- ✅ OAuth2 access token for authenticated endpoints
- ✅ All Firebase endpoint URLs  
- ✅ Web Client DAT configuration
- ✅ TouchDesigner setup instructions

### 4. Configure TouchDesigner

#### Web Client DAT Setup
1. **Create Web Client DAT** in TouchDesigner
2. **Set Request Method**: `GET`
3. **Set Request URL** to one of:
   - Real-time slider: `https://YOUR_PROJECT-default-rtdb.firebaseio.com/sliderValues/current.json`
   - Queue state: `https://YOUR_PROJECT-default-rtdb.firebaseio.com/queue.json`
   - Session history: `https://firestore.googleapis.com/v1/projects/YOUR_PROJECT/databases/(default)/documents/sessions` (requires auth)

4. **Add Headers** (for authenticated endpoints):
   - **Header 1**: `Authorization` = `Bearer YOUR_ACCESS_TOKEN`
   - **Header 2**: `Content-Type` = `application/json`

5. **Configure Auto-refresh**: Set to 100ms for real-time updates

## 📡 Available Endpoints

### 🟢 Public Access (No Authentication)
Perfect for real-time TouchDesigner integration:

```bash
# Current slider value
GET https://YOUR_PROJECT-default-rtdb.firebaseio.com/sliderValues/current.json

# Response:
{
  "value": -0.234,           # Raw slider value (-1 to 1)
  "normalizedValue": 0.383,  # Normalized value (0 to 1)  
  "sessionId": "abc123",     # Current user session
  "timestamp": 1693478400000 # Unix timestamp
}
```

```bash
# Queue state and active users
GET https://YOUR_PROJECT-default-rtdb.firebaseio.com/queue.json

# Response:
{
  "activeUser": {
    "sessionId": "abc123",
    "startTime": 1693478400000,
    "endTime": 1693478430000,
    "remainingTime": 25
  },
  "waitingUsers": {
    "user123": {"sessionId": "user123", "position": 1}
  },
  "queueLength": 1
}
```

### 🔒 Authenticated Access (Requires Token)
For session history and analytics:

```bash
# Historical session data
GET https://firestore.googleapis.com/v1/projects/YOUR_PROJECT/databases/(default)/documents/sessions
Authorization: Bearer YOUR_ACCESS_TOKEN

# Response: Firestore documents with session statistics
```

## 💻 TouchDesigner Code Examples

### Real-time Slider Control
```python
# In TouchDesigner Python DAT
import json

# Get data from Web Client DAT
web_client = op('webClient1')
if web_client.text:
    try:
        data = json.loads(web_client.text)
        
        # Extract slider values
        slider_value = data.get('normalizedValue', 0.5)  # 0-1 range
        raw_value = data.get('value', 0)                 # -1 to 1 range
        session_id = data.get('sessionId', '')
        
        # Update TouchDesigner parameters
        op('constant1').par.value0 = slider_value
        op('text1').par.text = f"Session: {session_id}"
        
        # Use raw value for bipolar controls
        op('lfo1').par.amp = abs(raw_value)
        op('lfo1').par.offset = raw_value
        
    except json.JSONDecodeError:
        print("Invalid JSON from Firebase")
```

### Queue State Monitor
```python  
# Monitor queue and display info
web_client = op('queueClient')
if web_client.text:
    try:
        queue_data = json.loads(web_client.text)
        
        # Get active user info
        active_user = queue_data.get('activeUser')
        if active_user:
            remaining_time = active_user.get('remainingTime', 0)
            op('text_timer').par.text = f"Time: {remaining_time}s"
            
            # Flash when time is low
            if remaining_time <= 5:
                op('null_flash').par.tx = 1 if remaining_time % 2 else 0
        
        # Show queue length
        queue_length = queue_data.get('queueLength', 0)
        op('text_queue').par.text = f"Queue: {queue_length}"
        
        # Enable/disable based on activity
        has_active_user = active_user is not None
        op('switch1').par.index = 1 if has_active_user else 0
        
    except json.JSONDecodeError:
        print("Invalid queue data")
```

### Session History Analysis
```python
# Analyze session patterns (requires auth token)
web_client = op('sessionHistoryClient')
if web_client.text:
    try:
        firestore_response = json.loads(web_client.text)
        sessions = firestore_response.get('documents', [])
        
        # Process each session
        total_sessions = len(sessions)
        avg_values = []
        
        for session in sessions:
            fields = session.get('fields', {})
            
            # Extract session data
            duration = int(fields.get('duration', {}).get('integerValue', 0))
            stats = fields.get('statistics', {}).get('mapValue', {}).get('fields', {})
            
            if stats:
                avg_val = float(stats.get('average', {}).get('doubleValue', 0))
                min_val = float(stats.get('min', {}).get('doubleValue', 0)) 
                max_val = float(stats.get('max', {}).get('doubleValue', 0))
                
                avg_values.append(avg_val)
                
                print(f"Session: {duration}s, avg: {avg_val:.2f}, range: {min_val:.2f} to {max_val:.2f}")
        
        # Update visualization parameters
        if avg_values:
            overall_avg = sum(avg_values) / len(avg_values)
            op('constant_avg').par.value0 = (overall_avg + 1) / 2  # Convert to 0-1
            
        op('text_stats').par.text = f"Sessions: {total_sessions}"
        
    except json.JSONDecodeError:
        print("Invalid session history data")
```

## 🔄 Token Management

### Token Expiration
- **OAuth tokens last ~1 hour**
- **Re-run script to refresh**: `npm run touchdesigner:token`
- **Check expiration**: Look at `expires_at` in `touchdesigner-config.json`

### Automated Refresh (Advanced)
```python
# TouchDesigner auto-refresh script
import subprocess
import json
import os
from datetime import datetime

def refresh_token_if_needed():
    config_path = "touchdesigner-config.json"
    
    if not os.path.exists(config_path):
        return False
    
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    expires_at = config.get('expires_at')
    if expires_at:
        # Parse expiration time
        from datetime import datetime
        expiry = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        now = datetime.utcnow().replace(tzinfo=expiry.tzinfo)
        
        # Refresh 10 minutes before expiry
        if (expiry - now).total_seconds() < 600:
            print("Token expiring, refreshing...")
            subprocess.run(['npm', 'run', 'touchdesigner:token'])
            return True
    
    return False

# Call periodically in TouchDesigner timer
refresh_token_if_needed()
```

## 🔒 Security Features

### What's Protected
- ✅ **Session history**: Requires authentication (prevents abuse)
- ✅ **System state**: Admin access only
- ✅ **Token expiration**: Automatic timeout for security

### What's Public
- ✅ **Real-time slider values**: Public for TouchDesigner integration
- ✅ **Queue state**: Public for real-time updates
- ✅ **Current user info**: Public for display purposes

### Firebase Security Rules
The system implements tiered access:
1. **Public endpoints**: Real-time data for TouchDesigner
2. **Authenticated endpoints**: Historical data and analytics
3. **Admin endpoints**: System configuration and management

## 📊 Performance Tips

### TouchDesigner Optimization
- **Use 100ms refresh rate** for real-time feel without overwhelming Firebase
- **Parse JSON efficiently** - cache parsed data between frames
- **Handle connection errors** gracefully with try/catch blocks
- **Use different DATs** for different endpoints to avoid conflicts

### Firebase Quota Management
- **Real-time endpoints** are optimized for frequent access
- **Session history** is sampled and cached to minimize reads
- **Authentication** is token-based to reduce auth overhead

## 🛠️ Troubleshooting

### Common Issues

**"Firebase Admin SDK not found"**
```bash
npm install firebase-admin google-auth-library
```

**"Service account key not found"**
- Download from Firebase Console → Project Settings → Service Accounts  
- Save as `firebase-admin-key.json` in project root

**"Access denied" (401/403 errors)**
- Check token is correctly set in Authorization header
- Verify token hasn't expired (re-run `npm run touchdesigner:token`)
- Ensure endpoint requires the authentication level you're providing

**"Invalid JSON response"**
- Check Firebase project ID in URLs
- Verify endpoint exists and has data
- Enable verbose mode in Web Client DAT for debugging

### Debug Mode
Enable verbose logging in TouchDesigner Web Client DAT:
- Check HTTP status codes (200 = success, 401 = auth error, 403 = forbidden)
- View response headers for error details
- Monitor Firebase usage in console

---

## 📁 Generated Files

After running `npm run touchdesigner:token`:

- **`touchdesigner-config.json`**: Complete configuration with tokens and endpoints
- **Contains**: Access tokens, endpoint URLs, TouchDesigner setup instructions
- **Expires**: ~1 hour, re-run script to refresh

## 🔗 Links

- [TouchDesigner Web Client DAT Docs](https://docs.derivative.ca/Web_Client_DAT)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Your Firebase Console](https://console.firebase.google.com/)

---

✅ **You're ready to create amazing real-time TouchDesigner experiences with your Firebase slider queue!**
