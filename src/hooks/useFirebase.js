import { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
    getAuth,
    signInAnonymously,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const FALLBACK_APP_ID = 'hyzen-labs-production';

const getFirebaseConfig = () => {
    try {
        if (typeof __firebase_config !== 'undefined' && __firebase_config) {
            return typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
        }
        const viteEnv = import.meta.env?.VITE_FIREBASE_CONFIG;
        if (viteEnv) return typeof viteEnv === 'string' ? JSON.parse(viteEnv) : viteEnv;
    } catch (e) { }
    return null;
};

const firebaseConfig = getFirebaseConfig();
export const appId = typeof __app_id !== 'undefined' ? __app_id : FALLBACK_APP_ID;
const firebaseApp = firebaseConfig ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]) : null;
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;

export const useFirebase = () => {
    const [user, setUser] = useState(null);
    const [cloudStatus, setCloudStatus] = useState('disconnected');
    const [isInitializingAuth, setIsInitializingAuth] = useState(true);

    // Login with Google
    const loginWithGoogle = async () => {
        if (!auth) return;
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Google Login Error:", error);
            throw error;
        }
    };

    // Logout
    const logout = async () => {
        if (!auth) return;
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            if (!auth) {
                setIsInitializingAuth(false);
                return;
            }
            // We do NOT force anonymous login anymore if we want explicit Google Auth
            // But we can keep it as a fallback for 'view-only' if needed, 
            // OR just wait for user action. 
            // For now, let's NOT auto-login anonymously to keep it clean for Phase 3 options.
            // If the user was previously logged in, onAuthStateChanged will catch it.
            setIsInitializingAuth(false);
        };

        initAuth();

        const unsubscribe = onAuthStateChanged(auth, u => {
            setUser(u);
            if (u) setCloudStatus('connected');
            else setCloudStatus('disconnected');
        });

        return () => unsubscribe();
    }, []);

    return { user, cloudStatus, db, appId, isInitializingAuth, loginWithGoogle, logout };
};
