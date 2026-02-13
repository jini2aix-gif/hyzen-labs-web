import { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
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

    useEffect(() => {
        const initAuth = async () => {
            if (!auth) {
                setIsInitializingAuth(false);
                return;
            }
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (err) {
                console.error("Auth Error:", err);
                setCloudStatus('error');
            } finally {
                setIsInitializingAuth(false);
            }
        };

        initAuth();

        const unsubscribe = onAuthStateChanged(auth, u => {
            setUser(u);
            if (u) setCloudStatus('connected');
            else setCloudStatus('disconnected');
        });

        return () => unsubscribe();
    }, []);

    return { user, cloudStatus, db, appId, isInitializingAuth };
};
