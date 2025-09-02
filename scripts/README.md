# TouchDesigner Slider Queue - Reset Scripts

This directory contains utility scripts for managing and resetting the Firebase queue state.

## Available Scripts

### 1. `reset-queue.js` - Main Reset Tool (Recommended)

An interactive reset tool with multiple options for clearing queue data. This script works without authentication but has limitations on protected resources.

#### Usage

```bash
# Interactive mode (recommended)
npm run reset-queue

# Quick reset - clears queue only, preserves session history
npm run reset-queue -- --quick

# Full reset - attempts to clear everything
npm run reset-queue -- --full

# Skip confirmation prompts (for automation)
npm run reset-queue -- --quick --force
npm run reset-queue -- --full --force

# Show help
npm run reset-queue -- --help
```

#### Features

- **Interactive Mode**: Shows current queue statistics and provides menu options
- **Quick Reset**: Clears queue, slider values, and reinitializes (most common use case)
- **Full Reset**: Attempts to clear all data including session history
- **Custom Reset**: Choose exactly what to clear

#### Limitations

- Cannot clear Firestore sessions (requires authentication)
- Cannot clear system state (requires authentication)
- These limitations are shown as warnings but don't prevent the script from completing

### 2. `admin-reset.js` - Authenticated Admin Tool

Uses Firebase Admin SDK for full access to all Firebase resources. Requires service account credentials.

#### Setup

1. Go to [Firebase Console](https://console.firebase.google.com) → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file as `service-account-key.json` in the project root
4. The file is already in `.gitignore` for security

#### Usage

```bash
# Interactive mode
npm run admin-reset

# Full reset
npm run admin-reset -- --full

# Clear Firestore only
npm run admin-reset -- --firestore

# Clear Realtime Database only
npm run admin-reset -- --realtime

# Force mode (no confirmations)
npm run admin-reset -- --full --force
```

#### Features

- Full access to all Firebase resources
- Can clear Firestore sessions
- Can manage system state
- Batch operations for efficiency

### 3. `clear-queue.js` - Legacy Simple Reset

The original simple reset script. Kept for backward compatibility.

```bash
npm run clear-queue
```

Clears all queue data without prompts or options.

## What Gets Cleared

### Realtime Database

| Path | Description | Quick Reset | Full Reset | Requires Auth |
|------|-------------|-------------|------------|---------------|
| `/queue` | Active queue state | ✅ | ✅ | No |
| `/sliderValues` | Current slider values | ✅ | ✅ | No |
| `/systemState` | System configuration | ⚠️ Attempted | ⚠️ Attempted | Yes |
| `/sessions` | Realtime DB sessions | No | ✅ | No |

### Firestore

| Collection | Description | Quick Reset | Full Reset | Requires Auth |
|------------|-------------|-------------|------------|---------------|
| `sessions` | Session summaries | No | ⚠️ Attempted | Yes |

⚠️ = Will show warning if permission denied but continues execution

## Common Use Cases

### During Development

```bash
# Quick reset between tests
npm run reset-queue -- --quick --force
```

### After Testing Session

```bash
# Interactive reset to review what to clear
npm run reset-queue
```

### Production Maintenance

```bash
# Use admin tool with service account
npm run admin-reset
```

### CI/CD Pipeline

```bash
# Force reset without prompts
npm run reset-queue -- --quick --force
```

## Security Notes

1. **Service Account Keys**: Never commit `service-account-key.json` to version control
2. **Permissions**: The web app has limited permissions by design
3. **Authentication**: Only TouchDesigner and admin scripts should have auth tokens

## Firebase Console Alternative

You can also clear data directly in the Firebase Console:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to Realtime Database or Firestore
4. Delete data manually

## Troubleshooting

### Permission Denied Warnings

These are expected for:
- System state (requires auth)
- Firestore sessions (requires auth)

The script will continue and complete successfully despite these warnings.

### Service Account Not Found

If using `admin-reset`:
1. Download service account key from Firebase Console
2. Save as `service-account-key.json` in project root
3. Ensure the file is in `.gitignore`

### Script Hangs

If the script hangs during execution:
1. Press `Ctrl+C` to exit
2. Check your Firebase configuration in `.env.local`
3. Verify Firebase services are enabled in the console

## Related Documentation

- [Main Project README](../README.md)
- [WARP Development Guide](../WARP.md)
- [TouchDesigner Integration](../TOUCHDESIGNER.md)
