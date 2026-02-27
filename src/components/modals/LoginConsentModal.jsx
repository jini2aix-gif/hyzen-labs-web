import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, ShieldCheck } from 'lucide-react';

const LoginConsentModal = ({ isOpen, onClose, onConfirm }) => {
    const [isChecked, setIsChecked] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (isChecked) {
            onConfirm();
            setIsChecked(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gray-50 px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-500 rounded-full">
                                    <ShieldCheck size={24} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 font-brand tracking-tight">Login Verification</h2>
                            </div>
                            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-8 flex flex-col gap-6">
                            <p className="text-gray-600 text-sm leading-relaxed">
                                원활한 서비스 제공 및 본인 확인을 위해 <strong>구글 계정 프로필 정보(이름, 프로필 사진) 및 이메일 주소</strong>를 수집합니다. <br /><br />
                                수집된 정보는 회원 식별 및 고객 지원 목적으로만 사용되며, 동의 시에만 가입 및 로그인이 진행됩니다. 프로필 정보 이외의 데이터는 외부에 노출되지 않습니다.
                            </p>

                            <label className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors">
                                <div className="mt-0.5 relative flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => setIsChecked(e.target.checked)}
                                        className="appearance-none w-6 h-6 border-2 border-gray-300 rounded-full checked:bg-blue-500 checked:border-blue-500 transition-colors"
                                    />
                                    {isChecked && <CheckCircle2 size={16} className="absolute text-white pointer-events-none" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className={`font-bold text-sm ${isChecked ? 'text-blue-600' : 'text-gray-700'}`}>[필수] 관련 정보 수집 및 이용에 동의합니다.</span>
                                </div>
                            </label>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold font-tech text-sm uppercase tracking-widest hover:bg-gray-50 transition-colors"
                            >
                                취소 (Cancel)
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!isChecked}
                                className="flex-1 py-3 bg-black text-white rounded-xl font-bold font-tech text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg"
                            >
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="G" />
                                동의 후 시작 (Start)
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default LoginConsentModal;
