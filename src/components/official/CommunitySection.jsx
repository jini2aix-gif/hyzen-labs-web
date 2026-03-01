import React, { useState, useEffect, useCallback } from 'react';
import { useFirebase } from '../../hooks/useFirebase';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    deleteDoc,
    doc
} from 'firebase/firestore';
import GuestbookGrid from './GuestbookGrid';

const CommunitySection = ({ user }) => {
    const { db } = useFirebase();
    const [messages, setMessages] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);

    useEffect(() => {
        if (!db) return;

        const q = query(collection(db, 'guestbook'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(data);
        });

        return () => unsubscribe();
    }, [db]);

    const handleDelete = useCallback(async (id) => {
        try {
            await deleteDoc(doc(db, 'guestbook', id));
        } catch (e) {
            console.error('Delete error:', e);
            alert('삭제 중 오류가 발생했습니다.');
        }
    }, [db]);

    // Note: Edit and specific click logic can be expanded here as needed
    // For now, focusing on stability and basic display

    return (
        <div className="w-full">
            <GuestbookGrid
                messages={messages}
                user={user}
                onItemClick={(item) => setSelectedItem(item)}
                onEdit={(item) => { /* Edit Modal Trigger logic */ }}
                onDelete={handleDelete}
            />
        </div>
    );
};

export default React.memo(CommunitySection);
