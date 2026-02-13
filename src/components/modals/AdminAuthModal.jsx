import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '../../hooks/useFirebase';

const ADMIN_PASS = "5733906";

const AdminAuthModal = ({ isOpen, onClose, targetDeleteId }) => {
    const [deletePass, setDeletePass] = useState("");

    // Reset password when modal opens
    React.useEffect(() => {
        if (isOpen) setDeletePass("");
    }, [isOpen]);

    if (!isOpen) return null;

    const handleDelete = async () => {
        if (deletePass === ADMIN_PASS && targetDeleteId && db) {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', targetDeleteId));
            onClose();
        } else {
            alert("Access Denied");
        }
    };

    return (
        <div className="fixed inset-0 z-[8000] flex items-center justify-center p-6 bg-black/98" onClick={onClose}>
            <div className="w-full max-w-xs glass-panel p-10 rounded-[3rem] text-center border border-red-500/20" onClick={e => e.stopPropagation()}>
                <Lock size={40} className="text-red-500 mx-auto mb-6" />
                <input type="password" placeholder="PASSCODE" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-center mb-8 outline-none focus:border-red-500 text-white font-brand tracking-widest" value={deletePass} onChange={(e) => setDeletePass(e.target.value)} />
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-4 rounded-xl bg-white/5 text-[9px] font-brand font-black uppercase">Abort</button>
                    <button onClick={handleDelete} className="flex-1 py-4 rounded-xl bg-red-500 text-black font-brand font-black text-[9px] uppercase">Erase</button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(AdminAuthModal);
