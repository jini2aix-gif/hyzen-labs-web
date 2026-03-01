import { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
    getAuth,
    signInAnonymously,
    signInWithPopup,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

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
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            if (user && db) {
                const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    lastLoginAt: new Date().toISOString()
                }, { merge: true });
            }

        } catch (error) {
            console.error("Google Login Error:", error);
            throw error;
        }
    };

    // Register with Email/Password
    const registerWithEmail = async (email, password, nickname) => {
        if (!auth) return;
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            const user = result.user;

            // Update Profile with Nickname
            await updateProfile(user, { displayName: nickname });

            if (user && db) {
                const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: nickname,
                    photoURL: null,
                    provider: 'email',
                    lastLoginAt: new Date().toISOString()
                }, { merge: true });
            }
            return user;
        } catch (error) {
            console.error("Registration Error:", error);
            throw error;
        }
    };

    // Login with Email/Password
    const loginWithEmail = async (email, password) => {
        if (!auth) return;
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            return result.user;
        } catch (error) {
            console.error("Email Login Error:", error);
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

    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const initAuth = async () => {
            if (!auth) {
                setIsInitializingAuth(false);
                return;
            }
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

    useEffect(() => {
        if (!user || !db) {
            setProfile(null);
            return;
        }
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
        const unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
                setProfile(snapshot.data());
            } else {
                setProfile(null);
            }
        });
        return () => unsubscribeProfile();
    }, [user, db, appId]);

    return { user, profile, cloudStatus, db, appId, isInitializingAuth, loginWithGoogle, registerWithEmail, loginWithEmail, logout };
};
