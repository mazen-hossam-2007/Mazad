/**
 * MAZAD — Firebase Configuration
 * 
 * Replace the placeholder values below with your Firebase project credentials.
 * You can get these from your Firebase Console: Project Settings > General > Your apps (Web app).
 * 
 * Realtime Database must be enabled in your Firebase console:
 * 1. Build > Realtime Database > Create Database
 * 2. Set Database Rules to allow read/write for authenticated/open rooms (see firestore/database rules in instructions).
 */

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_DATABASE_NAME-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const STORAGE_KEY = "mazad_custom_firebase_config";

/**
 * Retrieves active Firebase configuration (prioritizing custom user config saved in localStorage)
 */
export function getFirebaseConfig() {
  try {
    const custom = localStorage.getItem(STORAGE_KEY);
    if (custom) {
      const parsed = JSON.parse(custom);
      if (parsed && parsed.apiKey && parsed.apiKey !== "YOUR_API_KEY") {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not read custom Firebase config from localStorage", e);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

/**
 * Saves custom Firebase credentials to localStorage
 */
export function saveFirebaseConfig(customConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customConfig));
    return true;
  } catch (e) {
    console.error("Failed to save custom Firebase config", e);
    return false;
  }
}

/**
 * Clears custom Firebase credentials from localStorage
 */
export function clearFirebaseConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Checks if Firebase has valid user-provided credentials
 */
export function isFirebaseConfigured() {
  const config = getFirebaseConfig();
  return (
    Boolean(config.apiKey) &&
    config.apiKey !== "YOUR_API_KEY" &&
    !config.apiKey.includes("YOUR_") &&
    Boolean(config.databaseURL || config.projectId)
  );
}
