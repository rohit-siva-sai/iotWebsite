import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAq2Xm7ssFW597W90QMRCe6EOyjQP0DocA",
  authDomain: "iotproject-1e3b3.firebaseapp.com",
  databaseURL: "https://iotproject-1e3b3-default-rtdb.firebaseio.com",
  projectId: "iotproject-1e3b3",
  storageBucket: "iotproject-1e3b3.firebasestorage.app",
  messagingSenderId: "1039779998428",
  appId: "1:1039779998428:web:f4cd9302f65c2c4707e219",
  measurementId: "G-6KWYCH8C7V",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const database = getDatabase(app);

export async function getFirebaseAnalytics() {
  if (typeof window === "undefined") {
    return null;
  }

  const supported = await isSupported();
  return supported ? getAnalytics(app) : null;
}
