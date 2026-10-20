// firebaseConfig.ts
// Firebase初期化。Authentication（ログイン）とFirestore（クラウド保存）を使う。

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA9AO09w3dG7qr67GEeQg0aGMBH5QrX9Cs",
  authDomain: "motivation-up-app.firebaseapp.com",
  projectId: "motivation-up-app",
  storageBucket: "motivation-up-app.firebasestorage.app",
  messagingSenderId: "512466788267",
  appId: "1:512466788267:web:2c46f6c3f307a3f712bcee",
  measurementId: "G-2XW5K9JQ0Y",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Analyticsは広告ブロッカーや開発環境(localhost)で初期化に失敗することがある。
// ここで例外を投げるとこのファイルの読み込み自体が失敗し、アプリ全体が真っ白になってしまうため、
// 失敗してもアプリの動作に影響しないようtry/catchで囲む
export let analytics: ReturnType<typeof getAnalytics> | null = null;
try {
  analytics = getAnalytics(app);
} catch (error) {
  console.warn("Firebase Analyticsの初期化に失敗しました（無視して続行します）", error);
}
