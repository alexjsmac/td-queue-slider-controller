#!/usr/bin/env node

/**
 * Advanced Trend Analysis Script - Better statistical methods for trend detection
 * This script uses multiple methods to identify trends in the slider data:
 * 1. Moving averages (not cumulative from start)
 * 2. Time-based bucketing (hourly/half-hourly averages)
 * 3. Linear regression for trend line
 * 4. Comparison of quartiles
 * 
 * Usage: npm run analyze-trends
 */

// Use dynamic import for ES modules
async function main() {
  const { initializeApp } = await import('firebase/app');
  const { getFirestore, collection, getDocs, query, orderBy } = await import('firebase/firestore');
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const dotenv = await import('dotenv');
  
  // Setup __dirname equivalent for ES modules
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Load environment variables
  dotenv.config({ path: path.join(__dirname, '../.env.local') });

  // Color codes for terminal output
  const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
    bold: '\x1b[1m',
  };

  // Helper function to print colored text
  function print(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  // Firebase configuration
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const firestore = getFirestore(app);

  /**
   * Format timestamp to readable time
   */
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  /**
   * Calculate moving average with window size
   */
  function calculateMovingAverage(data, windowSize) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(data.length, i + Math.ceil(windowSize / 2));
      const window = data.slice(start, end);
      const avg = window.reduce((sum, d) => sum + d.value, 0) / window.length;
      result.push({
        ...data[i],
        movingAvg: avg,
        windowSize: window.length
      });
    }
    return result;
  }

  /**
   * Calculate linear regression
   */
  function linearRegression(data) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    data.forEach((point, i) => {
      sumX += i;
      sumY += point.value;
      sumXY += i * point.value;
      sumX2 += i * i;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    let ssRes = 0, ssTot = 0;
    
    data.forEach((point, i) => {
      const yPred = slope * i + intercept;
      ssRes += Math.pow(point.value - yPred, 2);
      ssTot += Math.pow(point.value - yMean, 2);
    });
    
    const rSquared = 1 - (ssRes / ssTot);
    
    return { slope, intercept, rSquared };
  }

  /**
   * Group sessions by time buckets
   */
  function bucketByTime(sessions, bucketSizeMinutes = 30) {
    const buckets = new Map();
    
    sessions.forEach(session => {
      const bucketTime = Math.floor(session.startTime / (bucketSizeMinutes * 60 * 1000)) * (bucketSizeMinutes * 60 * 1000);
      
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, {
          time: bucketTime,
          sessions: [],
          values: []
        });
      }
      
      const bucket = buckets.get(bucketTime);
      bucket.sessions.push(session);
      bucket.values.push(session.statistics?.average || 0);
    });
    
    // Calculate averages for each bucket
    const result = [];
    buckets.forEach((bucket, time) => {
      const avg = bucket.values.reduce((sum, v) => sum + v, 0) / bucket.values.length;
      result.push({
        time,
        average: avg,
        count: bucket.sessions.length,
        values: bucket.values
      });
    });
    
    return result.sort((a, b) => a.time - b.time);
  }

  /**
   * Mann-Kendall trend test
   */
  function mannKendallTest(data) {
    const n = data.length;
    let s = 0;
    
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const diff = data[j] - data[i];
        if (diff > 0) s++;
        else if (diff < 0) s--;
      }
    }
    
    // Calculate variance
    const variance = n * (n - 1) * (2 * n + 5) / 18;
    
    // Calculate z-score
    let z = 0;
    if (s > 0) z = (s - 1) / Math.sqrt(variance);
    else if (s < 0) z = (s + 1) / Math.sqrt(variance);
    
    // Determine trend
    const alpha = 0.05; // 95% confidence
    const zCritical = 1.96;
    
    let trend = 'No trend';
    if (Math.abs(z) > zCritical) {
      trend = z > 0 ? 'Increasing' : 'Decreasing';
    }
    
    return { s, z, trend, confidence: (1 - 2 * (1 - normalCDF(Math.abs(z)))) * 100 };
  }

  // Helper for normal CDF approximation
  function normalCDF(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }

  /**
   * Generate ASCII bar chart
   */
  function generateBarChart(value, min = -1, max = 1, width = 40) {
    const normalized = (value - min) / (max - min);
    const position = Math.round(normalized * width);
    const bar = '█'.repeat(Math.max(0, position)) + '░'.repeat(Math.max(0, width - position));
    return bar;
  }

  try {
    print('\n═══════════════════════════════════════════════════════', 'magenta');
    print('   Advanced Trend Analysis for TouchDesigner Sessions   ', 'magenta');
    print('═══════════════════════════════════════════════════════', 'magenta');
    
    // Fetch all sessions from Firestore
    print('\n📊 Fetching session data from Firestore...', 'yellow');
    
    const sessionsRef = collection(firestore, 'sessions');
    const q = query(sessionsRef, orderBy('startTime', 'asc'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      print('  ℹ️  No sessions found in database', 'cyan');
      process.exit(0);
    }
    
    print(`  ✅ Found ${querySnapshot.size} sessions`, 'green');
    
    // Process sessions
    const allSessions = [];
    const activeSessions = [];
    
    querySnapshot.forEach((doc) => {
      const session = doc.data();
      allSessions.push(session);
      
      // Filter out inactive sessions
      const hasNoMovement = session.statistics?.min === 0 && session.statistics?.max === 0;
      if (!hasNoMovement) {
        activeSessions.push({
          ...session,
          value: session.statistics?.average || 0
        });
      }
    });
    
    print(`  ✅ ${activeSessions.length} active sessions for analysis`, 'green');
    
    // ═══════════════════════════════════════════════════════
    // METHOD 1: Moving Averages (10-session window)
    // ═══════════════════════════════════════════════════════
    print('\n\n📈 METHOD 1: Moving Average Analysis (10-session window)', 'bold');
    print('════════════════════════════════════════════════════════', 'blue');
    
    const movingAvgData = calculateMovingAverage(activeSessions, 10);
    
    // Show first, middle, and last portions
    const showIndices = [
      ...Array(5).keys(), // First 5
      ...Array(5).keys().map(i => Math.floor(movingAvgData.length / 2) - 2 + i), // Middle 5
      ...Array(5).keys().map(i => movingAvgData.length - 5 + i) // Last 5
    ];
    
    print('\nTime              | Session Avg | Moving Avg | Trend', 'cyan');
    print('------------------|-------------|------------|' + '-'.repeat(40), 'cyan');
    
    let lastMA = null;
    showIndices.forEach((i, idx) => {
      if (i >= 0 && i < movingAvgData.length) {
        const session = movingAvgData[i];
        const time = formatTime(session.startTime).padEnd(17);
        const sessionAvg = session.value.toFixed(4).padStart(11);
        const movingAvg = session.movingAvg.toFixed(4).padStart(10);
        const bar = generateBarChart(session.movingAvg);
        
        if (idx === 5 || idx === 10) print('...               |     ...     |    ...     | ...', 'gray');
        print(`${time} | ${sessionAvg} | ${movingAvg} | ${bar}`, 'reset');
        
        lastMA = session.movingAvg;
      }
    });
    
    // Calculate trend from moving averages
    const firstQuarterMA = movingAvgData.slice(0, Math.floor(movingAvgData.length / 4))
      .reduce((sum, d) => sum + d.movingAvg, 0) / Math.floor(movingAvgData.length / 4);
    const lastQuarterMA = movingAvgData.slice(Math.floor(movingAvgData.length * 3 / 4))
      .reduce((sum, d) => sum + d.movingAvg, 0) / Math.floor(movingAvgData.length / 4);
    
    print(`\n📊 Moving Average Summary:`, 'blue');
    print(`  • First quarter average: ${firstQuarterMA.toFixed(4)}`, 'cyan');
    print(`  • Last quarter average: ${lastQuarterMA.toFixed(4)}`, 'cyan');
    print(`  • Change: ${(lastQuarterMA - firstQuarterMA).toFixed(4)}`, 'cyan');
    print(`  • Trend: ${lastQuarterMA > firstQuarterMA ? '📈 Increasing' : lastQuarterMA < firstQuarterMA ? '📉 Decreasing' : '➡️ Stable'}`, 
      lastQuarterMA > firstQuarterMA ? 'green' : lastQuarterMA < firstQuarterMA ? 'red' : 'yellow');
    
    // ═══════════════════════════════════════════════════════
    // METHOD 2: Time-based bucketing (30-minute intervals)
    // ═══════════════════════════════════════════════════════
    print('\n\n📊 METHOD 2: Time-Based Analysis (30-minute buckets)', 'bold');
    print('════════════════════════════════════════════════════', 'blue');
    
    const timeBuckets = bucketByTime(activeSessions, 30);
    
    print('\nTime Bucket       | Sessions | Average   | Visual', 'cyan');
    print('------------------|----------|-----------|' + '-'.repeat(40), 'cyan');
    
    timeBuckets.forEach(bucket => {
      const time = formatTime(bucket.time).padEnd(17);
      const count = bucket.count.toString().padStart(8);
      const avg = bucket.average.toFixed(4).padStart(9);
      const bar = generateBarChart(bucket.average);
      
      print(`${time} | ${count} | ${avg} | ${bar}`, 'reset');
    });
    
    // Linear regression on time buckets
    const bucketRegression = linearRegression(timeBuckets.map(b => ({ value: b.average })));
    
    print(`\n📊 Time-Based Trend Analysis:`, 'blue');
    print(`  • Slope: ${bucketRegression.slope.toFixed(6)} per bucket`, 'cyan');
    print(`  • Direction: ${bucketRegression.slope > 0.001 ? '📈 Increasing' : bucketRegression.slope < -0.001 ? '📉 Decreasing' : '➡️ Stable'}`, 
      bucketRegression.slope > 0.001 ? 'green' : bucketRegression.slope < -0.001 ? 'red' : 'yellow');
    print(`  • R² value: ${bucketRegression.rSquared.toFixed(4)} (${bucketRegression.rSquared > 0.5 ? 'moderate' : 'weak'} fit)`, 'cyan');
    
    // ═══════════════════════════════════════════════════════
    // METHOD 3: Linear Regression on All Active Sessions
    // ═══════════════════════════════════════════════════════
    print('\n\n📉 METHOD 3: Linear Regression Analysis', 'bold');
    print('════════════════════════════════════════════════', 'blue');
    
    const regression = linearRegression(activeSessions);
    
    print(`\n📊 Linear Regression Results:`, 'blue');
    print(`  • Slope: ${regression.slope.toFixed(6)} per session`, 'cyan');
    print(`  • Intercept: ${regression.intercept.toFixed(4)}`, 'cyan');
    print(`  • R² value: ${regression.rSquared.toFixed(4)}`, 'cyan');
    
    const predictedFirst = regression.intercept;
    const predictedLast = regression.slope * (activeSessions.length - 1) + regression.intercept;
    
    print(`  • Predicted first value: ${predictedFirst.toFixed(4)}`, 'cyan');
    print(`  • Predicted last value: ${predictedLast.toFixed(4)}`, 'cyan');
    print(`  • Overall trend: ${regression.slope > 0.0001 ? '📈 Increasing' : regression.slope < -0.0001 ? '📉 Decreasing' : '➡️ Stable'}`, 
      regression.slope > 0.0001 ? 'green' : regression.slope < -0.0001 ? 'red' : 'yellow');
    
    // ═══════════════════════════════════════════════════════
    // METHOD 4: Mann-Kendall Trend Test
    // ═══════════════════════════════════════════════════════
    print('\n\n🔬 METHOD 4: Mann-Kendall Statistical Trend Test', 'bold');
    print('════════════════════════════════════════════════════', 'blue');
    
    const mkTest = mannKendallTest(activeSessions.map(s => s.value));
    
    print(`\n📊 Mann-Kendall Test Results:`, 'blue');
    print(`  • Test statistic (S): ${mkTest.s}`, 'cyan');
    print(`  • Z-score: ${mkTest.z.toFixed(4)}`, 'cyan');
    print(`  • Trend: ${mkTest.trend}`, mkTest.trend === 'Increasing' ? 'green' : mkTest.trend === 'Decreasing' ? 'red' : 'yellow');
    print(`  • Confidence: ${mkTest.confidence.toFixed(1)}%`, 'cyan');
    
    // ═══════════════════════════════════════════════════════
    // METHOD 5: Quartile Analysis
    // ═══════════════════════════════════════════════════════
    print('\n\n📊 METHOD 5: Quartile Comparison', 'bold');
    print('════════════════════════════════════════════════', 'blue');
    
    const quartileSize = Math.floor(activeSessions.length / 4);
    const q1 = activeSessions.slice(0, quartileSize);
    const q2 = activeSessions.slice(quartileSize, quartileSize * 2);
    const q3 = activeSessions.slice(quartileSize * 2, quartileSize * 3);
    const q4 = activeSessions.slice(quartileSize * 3);
    
    const q1Avg = q1.reduce((sum, s) => sum + s.value, 0) / q1.length;
    const q2Avg = q2.reduce((sum, s) => sum + s.value, 0) / q2.length;
    const q3Avg = q3.reduce((sum, s) => sum + s.value, 0) / q3.length;
    const q4Avg = q4.reduce((sum, s) => sum + s.value, 0) / q4.length;
    
    print('\nQuartile | Sessions | Average   | Visual', 'cyan');
    print('---------|----------|-----------|' + '-'.repeat(40), 'cyan');
    print(`Q1 (1st) | ${q1.length.toString().padStart(8)} | ${q1Avg.toFixed(4).padStart(9)} | ${generateBarChart(q1Avg)}`, 'reset');
    print(`Q2 (2nd) | ${q2.length.toString().padStart(8)} | ${q2Avg.toFixed(4).padStart(9)} | ${generateBarChart(q2Avg)}`, 'reset');
    print(`Q3 (3rd) | ${q3.length.toString().padStart(8)} | ${q3Avg.toFixed(4).padStart(9)} | ${generateBarChart(q3Avg)}`, 'reset');
    print(`Q4 (4th) | ${q4.length.toString().padStart(8)} | ${q4Avg.toFixed(4).padStart(9)} | ${generateBarChart(q4Avg)}`, 'reset');
    
    const quartileTrend = q4Avg - q1Avg;
    print(`\n📊 Quartile Analysis:`, 'blue');
    print(`  • Q1 to Q4 change: ${quartileTrend.toFixed(4)}`, 'cyan');
    print(`  • Progressive changes:`, 'cyan');
    print(`    - Q1→Q2: ${(q2Avg - q1Avg).toFixed(4)}`, 'cyan');
    print(`    - Q2→Q3: ${(q3Avg - q2Avg).toFixed(4)}`, 'cyan');
    print(`    - Q3→Q4: ${(q4Avg - q3Avg).toFixed(4)}`, 'cyan');
    
    // ═══════════════════════════════════════════════════════
    // FINAL CONSENSUS
    // ═══════════════════════════════════════════════════════
    print('\n\n═══════════════════════════════════════════════════════', 'magenta');
    print('                    TREND CONSENSUS                     ', 'bold');
    print('═══════════════════════════════════════════════════════', 'magenta');
    
    const trends = [
      { method: 'Moving Average', result: lastQuarterMA > firstQuarterMA ? 'Increasing' : lastQuarterMA < firstQuarterMA ? 'Decreasing' : 'Stable' },
      { method: 'Time Buckets', result: bucketRegression.slope > 0.001 ? 'Increasing' : bucketRegression.slope < -0.001 ? 'Decreasing' : 'Stable' },
      { method: 'Linear Regression', result: regression.slope > 0.0001 ? 'Increasing' : regression.slope < -0.0001 ? 'Decreasing' : 'Stable' },
      { method: 'Mann-Kendall', result: mkTest.trend },
      { method: 'Quartile Analysis', result: quartileTrend > 0.01 ? 'Increasing' : quartileTrend < -0.01 ? 'Decreasing' : 'Stable' }
    ];
    
    print('\nMethod            | Trend Result', 'cyan');
    print('------------------|---------------', 'cyan');
    trends.forEach(t => {
      const method = t.method.padEnd(17);
      const color = t.result === 'Increasing' ? 'green' : t.result === 'Decreasing' ? 'red' : 'yellow';
      print(`${method} | ${t.result}`, color);
    });
    
    // Count consensus
    const trendCounts = { Increasing: 0, Decreasing: 0, Stable: 0, 'No trend': 0 };
    trends.forEach(t => trendCounts[t.result]++);
    
    const consensus = Object.entries(trendCounts).sort((a, b) => b[1] - a[1])[0][0];
    
    print(`\n🎯 CONSENSUS: ${consensus.toUpperCase()}`, 'bold');
    print(`   (${trendCounts[consensus]} out of ${trends.length} methods agree)`, 'cyan');
    
    // Export comprehensive results
    const exportData = {
      metadata: {
        analysisTime: new Date().toISOString(),
        totalSessions: allSessions.length,
        activeSessions: activeSessions.length,
        methods: ['Moving Average', 'Time Buckets', 'Linear Regression', 'Mann-Kendall', 'Quartile Analysis']
      },
      results: {
        movingAverage: {
          firstQuarter: firstQuarterMA,
          lastQuarter: lastQuarterMA,
          change: lastQuarterMA - firstQuarterMA,
          trend: trends[0].result
        },
        timeBuckets: {
          buckets: timeBuckets,
          regression: bucketRegression,
          trend: trends[1].result
        },
        linearRegression: {
          ...regression,
          trend: trends[2].result
        },
        mannKendall: {
          ...mkTest
        },
        quartiles: {
          q1: q1Avg,
          q2: q2Avg,
          q3: q3Avg,
          q4: q4Avg,
          totalChange: quartileTrend,
          trend: trends[4].result
        }
      },
      consensus: {
        trend: consensus,
        agreement: `${trendCounts[consensus]}/${trends.length}`,
        breakdown: trendCounts
      }
    };
    
    // Create analysis folder if it doesn't exist
    const analysisDir = path.join(__dirname, '../analysis');
    await fs.promises.mkdir(analysisDir, { recursive: true });
    
    // Save with timestamp in filename
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const outputPath = path.join(analysisDir, `trend-analysis-${timestamp}.json`);
    await fs.promises.writeFile(outputPath, JSON.stringify(exportData, null, 2));
    
    // Also save as latest for easy access
    const latestPath = path.join(analysisDir, 'trend-analysis-latest.json');
    await fs.promises.writeFile(latestPath, JSON.stringify(exportData, null, 2));
    
    print(`\n💾 Detailed analysis saved to:`, 'green');
    print(`   • analysis/trend-analysis-${timestamp}.json`, 'cyan');
    print(`   • analysis/trend-analysis-latest.json`, 'cyan');
    
    print('\n✨ Analysis complete!', 'green');
    
  } catch (error) {
    print(`\n❌ Error during analysis: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});