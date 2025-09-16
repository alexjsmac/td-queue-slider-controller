'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { adminOps, type QueueStatistics } from '@/lib/admin-operations';
import styles from './admin.module.css';

export default function AdminDashboard() {
  const { isAuthenticated, isLoading, login, logout } = useAdminAuth();
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [stats, setStats] = useState<QueueStatistics | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState('');

  // Subscribe to real-time updates when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = adminOps.subscribeToQueueStats(setStats);
    return unsubscribe;
  }, [isAuthenticated]);

  // Handle login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (!login(password)) {
      setLoginError('Invalid password');
      return;
    }
    
    setPassword('');
  };

  // Handle queue reset
  const handleReset = async (type: 'quick' | 'full') => {
    if (!window.confirm(`Are you sure you want to perform a ${type} reset?`)) {
      return;
    }

    setIsResetting(true);
    setResetStatus('Resetting...');

    try {
      const options = type === 'quick' 
        ? { clearQueue: true, clearSliderValues: true, initialize: true }
        : { clearQueue: true, clearSliderValues: true, clearSessions: true, initialize: true };

      await adminOps.resetQueue(options);
      setResetStatus(`✅ ${type === 'quick' ? 'Quick' : 'Full'} reset completed`);
      setTimeout(() => setResetStatus(''), 3000);
    } catch (error) {
      console.error('Reset error:', error);
      setResetStatus('❌ Reset failed');
      setTimeout(() => setResetStatus(''), 3000);
    } finally {
      setIsResetting(false);
    }
  };

  // Handle skip active user
  const handleSkipUser = async () => {
    if (!stats?.activeUser) return;
    
    if (!window.confirm('Skip current active user?')) {
      return;
    }

    try {
      await adminOps.skipActiveUser();
    } catch (error) {
      console.error('Error skipping user:', error);
    }
  };

  // Handle remove user from queue
  const handleRemoveUser = async (sessionId: string) => {
    if (!window.confirm('Remove this user from the queue?')) {
      return;
    }

    try {
      await adminOps.removeUserFromQueue(sessionId);
    } catch (error) {
      console.error('Error removing user:', error);
    }
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    const isPasswordConfigured = !!process.env.NEXT_PUBLIC_ADMIN_PASSWORD_HASH;
    
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <h1 className={styles.loginTitle}>Admin Dashboard</h1>
          {!isPasswordConfigured ? (
            <div style={{ 
              padding: '1rem', 
              background: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: '0.5rem',
              marginBottom: '1rem' 
            }}>
              <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: '0.5rem' }}>
                Admin Password Not Configured
              </p>
              <p style={{ color: '#7f1d1d', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Please set the admin password in your environment:
              </p>
              <code style={{ 
                display: 'block', 
                padding: '0.5rem', 
                background: '#fef2f2', 
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                color: '#991b1b'
              }}>
                NEXT_PUBLIC_ADMIN_PASSWORD_HASH=your_secure_password
              </code>
            </div>
          ) : (
            <form className={styles.loginForm} onSubmit={handleLogin}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className={styles.inputField}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  autoFocus
                />
              </div>
              {loginError && (
                <div className={styles.errorMessage}>{loginError}</div>
              )}
              <button type="submit" className={styles.loginBtn}>
                Login
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Show admin dashboard
  // Show loading state if stats not loaded yet
  if (!stats) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>TouchDesigner Admin Dashboard</h1>
          <button onClick={logout} className={styles.logoutBtn}>
            Logout
          </button>
        </header>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'white' }}>
          Loading queue statistics...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>TouchDesigner Admin Dashboard</h1>
        <button onClick={logout} className={styles.logoutBtn}>
          Logout
        </button>
      </header>

      {/* Statistics Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Queue Status</div>
          <p className={styles.statValue}>
            {stats?.activeUser ? (
              <>
                Active
                <span className={styles.activeIndicator}>
                  <span className={styles.pulse}></span>
                  Live
                </span>
              </>
            ) : (
              'Idle'
            )}
          </p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Queue Length</div>
          <p className={styles.statValue}>{stats?.queueLength || 0}</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Sessions Today</div>
          <p className={styles.statValue}>{stats?.totalSessionsToday || 0}</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Avg Session Duration</div>
          <p className={`${styles.statValue} ${styles.statValueSmall}`}>
            {stats?.averageSessionDuration || 0}s
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Queue Management */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Queue Management</h2>
          
          <div className={styles.queueList}>
            {/* Active User */}
            {stats?.activeUser && (
              <div className={`${styles.queueItem} ${styles.queueItemActive}`}>
                <div className={styles.queueInfo}>
                  <span className={styles.queuePosition}>Active User</span>
                  <span className={styles.queueSession}>
                    {stats.activeUser.sessionId.slice(0, 8)}...
                  </span>
                </div>
                <div className={styles.queueTimer}>
                  <span>⏱️</span>
                  <span>{formatTime(stats.activeUser.remainingTime)}</span>
                  <button onClick={handleSkipUser} className={styles.skipBtn}>
                    Skip
                  </button>
                </div>
              </div>
            )}

            {/* Waiting Users */}
            {stats?.waitingUsers && stats.waitingUsers.length > 0 ? (
              stats.waitingUsers.map((user) => (
                <div key={user.sessionId} className={styles.queueItem}>
                  <div className={styles.queueInfo}>
                    <span className={styles.queuePosition}>
                      Position #{user.position}
                    </span>
                    <span className={styles.queueSession}>
                      {user.sessionId.slice(0, 8)}...
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveUser(user.sessionId)}
                    className={styles.removeBtn}
                  >
                    Remove
                  </button>
                </div>
              ))
            ) : (
              !stats?.activeUser && (
                <div className={styles.emptyQueue}>Queue is empty</div>
              )
            )}
          </div>

          {/* Current Slider Value */}
          {stats && typeof stats.currentSliderValue === 'number' && (
            <div className={styles.sliderIndicator}>
              <div className={styles.sliderLabel}>Current Slider Value</div>
              <div className={styles.sliderValue}>
                {stats.currentSliderValue.toFixed(3)}
              </div>
              <div className={styles.sliderBar}>
                <div 
                  className={styles.sliderFill} 
                  style={{ 
                    width: `${((stats.currentSliderValue + 1) / 2) * 100}%` 
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* System Controls */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>System Controls</h2>
          
          <div className={styles.controls}>
            <button
              onClick={() => handleReset('quick')}
              disabled={isResetting}
              className={styles.controlBtn}
            >
              Quick Reset
            </button>
            <p className={styles.controlDesc}>
              Clear the current queue and slider values
            </p>

            <button
              onClick={() => handleReset('full')}
              disabled={isResetting}
              className={`${styles.controlBtn} ${styles.dangerBtn}`}
            >
              Full Reset
            </button>
            <p className={styles.controlDesc}>
              Clear everything including session history
            </p>

            {resetStatus && (
              <div className={styles.controlDesc}>
                {resetStatus}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}