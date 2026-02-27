import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Mail, Lock, User, AtSign, CheckCircle2, AlertCircle, ArrowRight, LogIn } from 'lucide-react';

const AuthModal = ({ isOpen, onClose, onGoogleLogin, onEmailLogin, onEmailRegister }) => {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        nickname: '',
        consent: false
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Validation Regex
    const passwordRegex = useMemo(() => /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?]{6,}$/, []);

    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        setError('');
    };

    const validateForm = () => {
        if (!formData.email || !formData.password) {
            setError('이메일과 비밀번호를 모두 입력해 주세요.');
            return false;
        }
        if (mode === 'register') {
            if (!formData.nickname) {
                setError('사용하실 닉네임을 입력해 주세요.');
                return false;
            }
            if (!passwordRegex.test(formData.password)) {
                setError('비밀번호 규칙을 확인해 주세요. (6자 이상 + 대문자/숫자/특수문자 포함)');
                return false;
            }
            if (!formData.consent) {
                setError('이메일 정보 수집 이용에 동의가 필요합니다.');
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        setError('');

        try {
            if (mode === 'login') {
                await onEmailLogin(formData.email, formData.password);
            } else {
                await onEmailRegister(formData.email, formData.password, formData.nickname);
            }
            onClose();
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('아이디 또는 비밀번호가 일치하지 않습니다.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('이미 사용 중인 이메일 주소입니다.');
            } else {
                setError('로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            await onGoogleLogin();
        } catch (err) {
            console.error(err);
            // Error handling is mostly done in parent via alerts, 
            // but we reset loading state here.
        } finally {
            setIsLoading(false);
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
                        className="relative w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gray-50/50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-black text-white rounded-2xl shadow-lg shadow-black/10">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 font-brand tracking-tight">
                                        {mode === 'login' ? '다시 오셨군요!' : '하이젠 랩스 시작하기'}
                                    </h2>
                                    <p className="text-[10px] text-gray-400 font-tech uppercase tracking-[0.2em]">Hyzen Labs Digital ID</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-8 py-8 flex flex-col gap-6 overflow-y-auto max-h-[70vh]">
                            {/* Mode Toggle */}
                            <div className="flex p-1.5 bg-gray-100 rounded-2xl relative">
                                <motion.div
                                    layoutId="toggle-bg"
                                    className="absolute inset-y-1.5 bg-white rounded-xl shadow-sm border border-gray-200"
                                    style={{
                                        left: mode === 'login' ? '6px' : '50%',
                                        right: mode === 'login' ? '50%' : '6px',
                                        width: 'calc(50% - 6px)'
                                    }}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                                <button
                                    onClick={() => setMode('login')}
                                    className={`relative z-10 flex-1 py-2 text-xs font-bold font-tech uppercase tracking-widest transition-colors ${mode === 'login' ? 'text-black' : 'text-gray-400'}`}
                                >
                                    로그인
                                </button>
                                <button
                                    onClick={() => setMode('register')}
                                    className={`relative z-10 flex-1 py-2 text-xs font-bold font-tech uppercase tracking-widest transition-colors ${mode === 'register' ? 'text-black' : 'text-gray-400'}`}
                                >
                                    회원가입
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                {mode === 'register' && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">닉네임</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-4 flex items-center text-gray-400 group-focus-within:text-black transition-colors">
                                                <User size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                name="nickname"
                                                placeholder="사용하실 닉네임을 입력해 주세요"
                                                value={formData.nickname}
                                                onChange={handleInputChange}
                                                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5 transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">이메일 주소</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-4 flex items-center text-gray-400 group-focus-within:text-black transition-colors">
                                            <AtSign size={18} />
                                        </div>
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="example@gmail.com"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">비밀번호</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-4 flex items-center text-gray-400 group-focus-within:text-black transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            name="password"
                                            placeholder="비밀번호를 입력해 주세요"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5 transition-all outline-none"
                                        />
                                    </div>
                                    {mode === 'register' && (
                                        <p className="text-[10px] text-gray-400 mt-1 ml-1 leading-relaxed">
                                            * 6자 이상이며 대문자, 숫자, 특수문자를 포함해야 합니다.
                                        </p>
                                    )}
                                </div>

                                {mode === 'register' && (
                                    <label className="group flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all mt-2">
                                        <div className="mt-0.5 relative flex items-center justify-center shrink-0">
                                            <input
                                                type="checkbox"
                                                name="consent"
                                                checked={formData.consent}
                                                onChange={handleInputChange}
                                                className="appearance-none w-5 h-5 border-2 border-gray-300 rounded-lg checked:bg-black checked:border-black transition-all group-hover:border-black"
                                            />
                                            {formData.consent && <CheckCircle2 size={12} className="absolute text-white pointer-events-none" />}
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[11px] font-bold text-gray-900">[필수] 이메일 정보 수집 및 이용 동의</span>
                                            <span className="text-[10px] text-gray-500 leading-tight">서비스 제공 및 주요 안내 사항 발송에 동의합니다.</span>
                                        </div>
                                    </label>
                                )}

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 p-3.5 bg-red-50 text-red-600 rounded-2xl text-[11px] font-bold border border-red-100"
                                    >
                                        <AlertCircle size={14} />
                                        {error}
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-4 mt-2 bg-black text-white rounded-2xl font-bold font-tech text-xs uppercase tracking-[0.2em] shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {mode === 'login' ? '로그인 하기' : '가입 완료'}
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="relative flex items-center py-2">
                                <div className="flex-grow border-t border-gray-100"></div>
                                <span className="flex-shrink mx-4 text-[10px] font-tech text-gray-300 uppercase tracking-widest">간편 로그인</span>
                                <div className="flex-grow border-t border-gray-100"></div>
                            </div>

                            <button
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="w-full py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold font-tech text-xs uppercase tracking-[0.2em] hover:bg-gray-50 hover:border-black/10 transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-black/10 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
                                        구글 계정으로 시작하기
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AuthModal;
