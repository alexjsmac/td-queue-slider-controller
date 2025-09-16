# Admin Dashboard Documentation

## Overview

The TouchDesigner Slider Queue Admin Dashboard provides real-time monitoring and control of the queue system. It allows administrators to view queue status, manage users, and reset the system when needed.

## Accessing the Dashboard

Navigate to: `http://localhost:3000/admin` (or your production URL + `/admin`)

### Setting Up Authentication

1. **Set the admin password in your `.env.local` file:**
   ```bash
   NEXT_PUBLIC_ADMIN_PASSWORD_HASH=your_secure_password_here
   ```

2. **Keep this password secure:**
   - Never commit passwords to version control
   - Store passwords in a secure password manager
   - Share with team members through secure channels only
   - Use different passwords for development and production

> ⚠️ **Security Note**: The `.env.local` file should never be committed to Git. It's already in `.gitignore`.

## Dashboard Features

### 1. Real-Time Statistics
The dashboard displays four key metrics:
- **Queue Status**: Shows if the system is Active (with a live user) or Idle
- **Queue Length**: Number of users currently waiting
- **Sessions Today**: Total number of sessions completed today
- **Average Session Duration**: Average time users spend in active sessions

### 2. Queue Management

#### Active User Section
- Displays the currently active user with their session ID
- Shows remaining time in their 30-second session
- **Skip Button**: Immediately end the current user's session and move to the next user

#### Waiting Users
- Lists all users waiting in the queue with their position
- Each user shows a truncated session ID for identification
- **Remove Button**: Remove any waiting user from the queue

#### Live Slider Value
- Real-time display of the current slider value (-1 to 1)
- Visual progress bar showing the slider position
- Updates in real-time as the active user moves the slider

### 3. System Controls

#### Quick Reset
- Clears the current queue and slider values
- Preserves session history for analytics
- Initializes an empty queue structure
- Use when you need to clear a stuck queue

#### Full Reset
- Clears everything including:
  - Current queue
  - Slider values
  - All session history in Firestore
- Use with caution as this removes all historical data
- Requires confirmation before executing

## Technical Implementation

### Authentication
The admin dashboard uses a simple password-based authentication system:
- Password stored in environment variable
- Session persisted in localStorage
- Automatic logout on page navigation

### Real-Time Updates
- Uses Firebase Realtime Database listeners
- Updates automatically when queue state changes
- 100ms refresh rate for slider values
- No manual refresh needed

### Firebase Operations
The dashboard can perform these operations:
- Read queue state (public access)
- Modify queue structure (public write)
- Skip/remove users from queue
- Reset system state
- Clear Firestore sessions (if permissions allow)

## Security Considerations

### For Development
Set a simple password in your `.env.local` file for local development.

### For Production

1. **Change the Admin Password**:
   ```bash
   # In .env.local
   NEXT_PUBLIC_ADMIN_PASSWORD_HASH=your-secure-password-here
   ```

2. **Consider Firebase Authentication**:
   For production deployments, consider implementing proper Firebase Authentication:
   - Use Firebase Auth for admin users
   - Implement role-based access control
   - Add security rules to protect admin operations

3. **Network Security**:
   - Deploy over HTTPS only
   - Consider IP whitelisting for admin access
   - Use Firebase security rules to restrict database access

## Troubleshooting

### Cannot Access Admin Dashboard
1. Check that the server is running: `npm run dev`
2. Verify the URL: `http://localhost:3000/admin`
3. Check browser console for errors

### Login Issues
1. Verify password in `.env.local`
2. Clear browser localStorage and try again
3. Check browser console for authentication errors

### Queue Not Updating
1. Check Firebase connection in browser DevTools
2. Verify Firebase configuration in `.env.local`
3. Ensure Firebase Realtime Database is enabled

### Reset Operations Failing
1. Check Firebase security rules
2. Verify write permissions for queue paths
3. Note: `/systemState` requires authentication (this is expected)

### Permission Errors
Some operations may show permission errors:
- Clearing Firestore sessions requires authentication
- System state modifications require admin SDK
- These are expected and handled gracefully

## Command Line Alternative

If you prefer command-line tools, you can use the Node scripts:

```bash
# Interactive reset with prompts
npm run reset-queue

# Quick reset (clears queue only)
npm run reset-queue -- --quick --force

# Full reset (clears everything)
npm run reset-queue -- --full --force

# Admin reset with service account (requires setup)
npm run admin-reset
```

## Future Enhancements

Potential improvements for the admin dashboard:
1. Historical analytics and charts
2. User session replay functionality
3. Export session data to CSV
4. Multi-admin support with roles
5. Audit logging for admin actions
6. Email notifications for queue issues
7. Customizable session duration
8. Queue scheduling and time slots