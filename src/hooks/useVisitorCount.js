import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, increment, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../hooks/useFirebase'; // Reuse existing db connection

export const useVisitorCount = () => {
    const [visitorCount, setVisitorCount] = useState(0);

    useEffect(() => {
        if (!db || !appId) return;

        const statsRef = doc(db, 'artifacts', appId, 'public', 'stats');

        // 1. Increment logic (only once per session)
        const hasVisited = sessionStorage.getItem('has_visited');
        if (!hasVisited) {
            setDoc(statsRef, {
                totalVisitors: increment(1),
                lastUpdated: serverTimestamp()
            }, { merge: true })
                .then(() => {
                    sessionStorage.setItem('has_visited', 'true');
                })
                .catch(err => console.error("Stats increment error:", err));
        }

        // 2. Real-time listener
        const unsubscribe = onSnapshot(statsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setVisitorCount(data.totalVisitors || 0);
            } else {
                // Initialize if not exists
                setDoc(statsRef, { totalVisitors: 1, lastUpdated: serverTimestamp() });
                setVisitorCount(1);
            }
        });

        return () => unsubscribe();
    }, []);

    return visitorCount;
};
