const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
// In production, use environment variables for service account
// For local dev, you might point to a serviceAccountKey.json
// BUT for security, we'll try to use Application Default Credentials or env vars

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
} else {
    // Fallback or default init (e.g. on GCP)
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

module.exports = { admin, db, auth, storage };
