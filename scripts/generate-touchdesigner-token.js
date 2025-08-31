#!/usr/bin/env node

/**
 * TouchDesigner Firebase Authentication Token Generator
 * 
 * Generates OAuth2 access tokens using Firebase Admin SDK for TouchDesigner Web Client DAT.
 * This script uses Node.js to stay consistent with the existing project setup.
 * 
 * Setup:
 * 1. Download Firebase service account key from Firebase Console → Project Settings → Service Accounts
 * 2. Save as 'firebase-admin-key.json' in project root or scripts/ directory
 * 3. Run: node scripts/generate-touchdesigner-token.js
 * 
 * Requirements:
 * npm install firebase-admin google-auth-library
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Try to import Firebase Admin SDK
let admin;
try {
  admin = require('firebase-admin');
} catch (error) {
  console.log('❌ Firebase Admin SDK not found');
  console.log('📦 Install with: npm install firebase-admin google-auth-library');
  process.exit(1);
}

class TouchDesignerAuthGenerator {
  constructor() {
    this.projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    this.serviceAccountPath = this.findServiceAccountFile();
    this.app = null;
  }

  /**
   * Find the Firebase service account key file
   */
  findServiceAccountFile() {
    const possiblePaths = [
      path.join(__dirname, 'firebase-admin-key.json'),
      path.join(__dirname, '..', 'firebase-admin-key.json'),
      path.join(__dirname, 'service-account-key.json'),
      path.join(__dirname, '..', 'service-account-key.json'),
      path.join(__dirname, 'firebase-service-account.json'),
      path.join(__dirname, '..', 'firebase-service-account.json')
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initializeFirebase() {
    if (!this.serviceAccountPath) {
      throw new Error('Service account key file not found');
    }

    try {
      // Check if already initialized
      if (admin.apps.length > 0) {
        this.app = admin.app();
        return this.app;
      }

      // Load service account
      const serviceAccount = require(this.serviceAccountPath);
      
      // Initialize Firebase Admin
      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
      });

      console.log(`✓ Firebase Admin SDK initialized`);
      console.log(`✓ Project ID: ${serviceAccount.project_id}`);
      console.log(`✓ Service Account: ${serviceAccount.client_email}`);

      this.projectId = serviceAccount.project_id;
      return this.app;

    } catch (error) {
      throw new Error(`Failed to initialize Firebase Admin: ${error.message}`);
    }
  }

  /**
   * Generate OAuth2 access token using Google Auth Library
   */
  async generateOAuthToken() {
    try {
      // Import Google Auth Library
      const { GoogleAuth } = require('google-auth-library');
      
      // Create auth client with service account
      const auth = new GoogleAuth({
        keyFile: this.serviceAccountPath,
        scopes: [
          'https://www.googleapis.com/auth/firebase.database',
          'https://www.googleapis.com/auth/cloud-platform',
          'https://www.googleapis.com/auth/datastore'
        ]
      });

      // Get access token
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      
      const tokenInfo = {
        access_token: tokenResponse.token,
        token_type: 'Bearer',
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
        project_id: this.projectId,
        database_url: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        firestore_url: `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)`
      };

      console.log(`✓ OAuth access token generated`);
      console.log(`✓ Expires: ${tokenInfo.expires_at}`);
      
      return tokenInfo;

    } catch (error) {
      console.log(`⚠️ OAuth method failed: ${error.message}`);
      return this.generateServiceAccountInfo();
    }
  }

  /**
   * Fallback: Provide service account information for direct usage
   */
  generateServiceAccountInfo() {
    const serviceAccount = require(this.serviceAccountPath);
    
    return {
      auth_type: 'service_account',
      project_id: this.projectId,
      database_url: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      firestore_url: `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)`,
      service_account_email: serviceAccount.client_email,
      note: 'Use Firebase Admin SDK or service account key for authentication'
    };
  }

  /**
   * Create comprehensive TouchDesigner configuration file
   */
  async createTouchDesignerConfig() {
    try {
      const tokenInfo = await this.generateOAuthToken();
      
      // Add TouchDesigner-specific configuration
      const config = {
        ...tokenInfo,
        endpoints: {
          current_slider: `${process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL}/sliderValues/current.json`,
          queue_state: `${process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL}/queue.json`,
          sessions_rtdb: `${process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL}/sessions.json`,
          sessions_firestore: `${tokenInfo.firestore_url}/documents/sessions`,
          system_state: `${process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL}/systemState.json`
        },
        touchdesigner_setup: {
          web_client_dat: {
            request_method: 'GET',
            custom_headers: [
              {
                name: 'Authorization',
                value: tokenInfo.access_token ? `Bearer ${tokenInfo.access_token}` : 'Bearer YOUR_TOKEN_HERE'
              },
              {
                name: 'Content-Type',
                value: 'application/json'
              }
            ],
            refresh_interval: '100ms',
            auto_request: true
          }
        },
        usage_examples: {
          realtime_slider: {
            url: `${process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL}/sliderValues/current.json`,
            method: 'GET',
            auth_required: false,
            description: 'Get current slider value and session info'
          },
          queue_monitoring: {
            url: `${process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL}/queue.json`,
            method: 'GET', 
            auth_required: false,
            description: 'Monitor queue state and active users'
          },
          session_history: {
            url: `${tokenInfo.firestore_url}/documents/sessions`,
            method: 'GET',
            auth_required: true,
            description: 'Get historical session data (requires authentication)'
          }
        }
      };

      // Save configuration file
      const configPath = path.join(__dirname, '..', 'touchdesigner-config.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      console.log(`✓ TouchDesigner config saved: ${configPath}`);
      return configPath;

    } catch (error) {
      throw new Error(`Failed to create TouchDesigner config: ${error.message}`);
    }
  }

  /**
   * Print detailed setup instructions for TouchDesigner
   */
  printSetupInstructions() {
    const databaseUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)`;

    console.log('\n' + '='.repeat(80));
    console.log('🎯 TOUCHDESIGNER FIREBASE INTEGRATION SETUP');
    console.log('='.repeat(80));

    console.log(`\n📋 Project Configuration:`);
    console.log(`   Project ID: ${this.projectId}`);
    console.log(`   Database URL: ${databaseUrl}`);
    console.log(`   Firestore URL: ${firestoreUrl}`);

    console.log(`\n🔧 TouchDesigner Web Client DAT Setup:`);
    console.log(`   1. Create Web Client DAT in your TouchDesigner network`);
    console.log(`   2. Set Request Method: GET`);
    console.log(`   3. Set Request URL to one of these endpoints:`);
    console.log(`      • Real-time Slider: ${databaseUrl}/sliderValues/current.json`);
    console.log(`      • Queue State: ${databaseUrl}/queue.json`);
    console.log(`      • Sessions (auth): ${firestoreUrl}/documents/sessions`);

    console.log(`\n🔑 Authentication Headers (for protected endpoints):`);
    console.log(`   Header 1 - Name: Authorization`);
    console.log(`                Value: Bearer YOUR_ACCESS_TOKEN`);
    console.log(`   Header 2 - Name: Content-Type`);
    console.log(`                Value: application/json`);

    console.log(`\n⚡ Real-time Configuration:`);
    console.log(`   • Set Auto Request: On`);
    console.log(`   • Set Request Interval: 0.1 seconds (100ms)`);
    console.log(`   • Enable Auto-request on Start`);

    console.log(`\n📊 Available Data Endpoints:`);
    console.log(`   🟢 Public (No Auth):`);
    console.log(`      • ${databaseUrl}/sliderValues/current.json`);
    console.log(`      • ${databaseUrl}/queue.json`);
    console.log(`   🔒 Authenticated:`);
    console.log(`      • ${firestoreUrl}/documents/sessions`);
    console.log(`      • ${databaseUrl}/systemState.json`);

    console.log(`\n🔄 Token Management:`);
    console.log(`   • Tokens expire after ~1 hour`);
    console.log(`   • Re-run this script to refresh: npm run touchdesigner:token`);
    console.log(`   • Consider automating refresh for production use`);

    console.log(`\n💡 TouchDesigner Integration Examples:`);
    console.log(`   # Get slider value in Python DAT:`);
    console.log(`   import json`);
    console.log(`   data = json.loads(op('webClient1').text or '{}')`);
    console.log(`   value = data.get('normalizedValue', 0.5)`);
    console.log(`   op('slider').par.value0 = value`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Setup complete! Check touchdesigner-config.json for full details.');
    console.log('='.repeat(80));
  }

  /**
   * Main execution function
   */
  async execute() {
    try {
      console.log('🚀 Generating TouchDesigner Firebase authentication...\n');

      // Check prerequisites
      if (!this.projectId) {
        throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID not found in environment variables');
      }

      if (!this.serviceAccountPath) {
        console.log('❌ Firebase service account key not found!');
        console.log('\n📋 Setup Steps:');
        console.log('1. Go to Firebase Console → Project Settings → Service Accounts');
        console.log('2. Click "Generate new private key"');
        console.log('3. Save JSON file as one of these names in project root:');
        console.log('   • firebase-admin-key.json');
        console.log('   • service-account-key.json');
        console.log('   • firebase-service-account.json');
        console.log('\n4. Re-run this script');
        process.exit(1);
      }

      // Initialize Firebase
      this.initializeFirebase();

      // Create configuration
      const configFile = await this.createTouchDesignerConfig();

      // Print setup instructions
      this.printSetupInstructions();

      console.log(`\n✅ Authentication setup complete!`);
      console.log(`📄 Configuration: ${path.basename(configFile)}`);
      console.log(`🎯 Ready for TouchDesigner integration!`);

    } catch (error) {
      console.error(`\n❌ Setup failed: ${error.message}`);
      console.log('\n🔍 Troubleshooting:');
      console.log('   • Check Firebase service account key is valid');
      console.log('   • Ensure .env.local has correct Firebase project ID');
      console.log('   • Install dependencies: npm install firebase-admin google-auth-library');
      process.exit(1);
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const generator = new TouchDesignerAuthGenerator();
  generator.execute();
}

module.exports = TouchDesignerAuthGenerator;
