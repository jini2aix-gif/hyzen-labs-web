import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProportionalQuestions, questionStats } from './questionBank';
import './ExamStyles.css';

const NurseExam = ({ isOpen, onClose }) => {
    const [step, setStep] = useState('start'); // start, exam, result, review
    const [currentIdx, setCurrentIdx] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(6300);
    const [result, setResult] = useState(null);
    const [activeQuestions, setActiveQuestions] = useState([]);
    const [isPaused, setIsPaused] = useState(false); // 일시정지 상태

    // Utility to prepare exam with proportional questions (105 questions total)
    const prepareExam = useCallback(() => {
        const examQuestions = getProportionalQuestions();
        setActiveQuestions(examQuestions);
        setCurrentIdx(0);
        setUserAnswers({});
        setTimeLeft(105 * 60);
        setIsPaused(false);
    }, []);

    // Timer logic with pause support
    useEffect(() => {
        let timer;
        if (step === 'exam' && timeLeft > 0 && !isPaused) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && step === 'exam') {
            handleSubmit();
        }
        return () => clearInterval(timer);
    }, [step, timeLeft, isPaused]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleStart = () => {
        prepareExam();
        setStep('exam');
    };

    const togglePause = () => {
        setIsPaused(prev => !prev);
    };

    const handleSelect = (optionIdx) => {
        setUserAnswers({ ...userAnswers, [currentIdx]: optionIdx });
    };

    const handleNext = () => {
        if (currentIdx < activeQuestions.length - 1) {
            setCurrentIdx(currentIdx + 1);
        }
    };

    const handlePrev = () => {
        if (currentIdx > 0) {
            setCurrentIdx(currentIdx - 1);
        }
    };

    const handleSubmit = () => {
        let score = 0;
        const subjectScores = {};
        const incorrect = [];

        activeQuestions.forEach((q, idx) => {
            const isCorrect = userAnswers[idx] === q.answer;
            if (isCorrect) {
                score += 10;
            } else {
                incorrect.push({ ...q, userChoice: userAnswers[idx] });
            }

            if (!subjectScores[q.subject]) subjectScores[q.subject] = { total: 0, correct: 0 };
            subjectScores[q.subject].total += 1;
            if (isCorrect) subjectScores[q.subject].correct += 1;
        });

        const totalQuestions = activeQuestions.length;
        const finalScore = (score / (totalQuestions * 10)) * 100;

        // Pass logic: Total >= 60% AND each subject >= 40%
        let isPassed = finalScore >= 60;
        let failedSubjects = [];
        Object.keys(subjectScores).forEach(sub => {
            const subRate = (subjectScores[sub].correct / subjectScores[sub].total) * 100;
            if (subRate < 40) {
                isPassed = false;
                failedSubjects.push(sub);
            }
        });

        setResult({
            score: finalScore,
            isPassed,
            failedSubjects,
            incorrect
        });
        setStep('result');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-black z-10 p-2"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {step === 'start' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                            <span className="text-4xl">🎓</span>
                        </div>
                        <h2 className="text-3xl font-bold mb-4">간호조무사 실전 모의고사</h2>
                        <p className="text-gray-600 mb-8 max-w-md">
                            <strong className="text-blue-600 font-bold">2025년 개정 CBT 기준 완전 적용</strong><br />
                            실전과 동일한 105문항/105분 시험입니다.<br />
                            전 과목 60% 이상 및 과목별 40% 이상 시 합격입니다.
                        </p>
                        <div className="grid grid-cols-2 gap-4 mb-8 text-left w-full max-w-sm">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <p className="text-xs text-gray-500 uppercase font-bold">실전 문항</p>
                                <p className="font-semibold">105문항 (랜덤 추출)</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <p className="text-xs text-gray-500 uppercase font-bold">실전 시간</p>
                                <p className="font-semibold">105:00 (문항당 1분)</p>
                            </div>
                        </div>
                        <button
                            onClick={handleStart}
                            className="px-12 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                        >
                            실전 랜덤 시험 시작
                        </button>
                    </div>
                )}

                {step === 'exam' && (
                    <div className="exam-container">
                        <div className="exam-header">
                            <div className="exam-title text-sm md:text-base">
                                <span className="text-blue-600 mr-2">💻</span>
                                실전 CBT 시뮬레이션
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={togglePause}
                                    className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold text-sm transition flex items-center gap-1.5"
                                >
                                    {isPaused ? (
                                        <>
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                            재개
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                            </svg>
                                            일시정지
                                        </>
                                    )}
                                </button>
                                <div className="exam-timer">
                                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {formatTime(timeLeft)}
                                    {isPaused && <span className="ml-2 text-yellow-500 font-bold">(일시정지)</span>}
                                </div>
                            </div>
                        </div>

                        <div className="progress-bar-container">
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${((currentIdx + 1) / activeQuestions.length) * 100}%` }}
                            />
                        </div>

                        <main className="exam-main">
                            <div className="question-card">
                                <div className="question-subject">[{activeQuestions[currentIdx].subject}]</div>
                                <div className="question-text">
                                    <span className="font-bold mr-2">{currentIdx + 1}.</span>
                                    {activeQuestions[currentIdx].question}
                                </div>

                                <div className="options-list">
                                    {activeQuestions[currentIdx].options.map((opt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSelect(i)}
                                            className={`option-button ${userAnswers[currentIdx] === i ? 'selected' : ''}`}
                                            disabled={isPaused}
                                        >
                                            <span className="option-number">{i + 1}</span>
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </main>

                        <footer className="exam-footer">
                            <button
                                onClick={handlePrev}
                                disabled={currentIdx === 0 || isPaused}
                                className="nav-button prev-button text-xs md:text-sm"
                            >
                                이전 문제
                            </button>

                            <div className="flex gap-2">
                                {currentIdx < activeQuestions.length - 1 ? (
                                    <button
                                        onClick={handleNext}
                                        disabled={isPaused}
                                        className="nav-button next-button text-xs md:text-sm"
                                    >
                                        다음 문제
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isPaused}
                                        className="nav-button submit-button text-xs md:text-sm"
                                    >
                                        최종 제출하기
                                    </button>
                                )}
                            </div>
                        </footer>
                    </div>
                )}

                {step === 'result' && result && (
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="result-container">
                            <div className="result-card">
                                <div className="score-circle" style={{ borderColor: result.isPassed ? '#bbf7d0' : '#fecaca' }}>
                                    <span className="score-value">{Math.round(result.score)}</span>
                                    <span className="score-label">득점</span>
                                </div>

                                <div className={`status-badge ${result.isPassed ? 'status-pass' : 'status-fail'}`}>
                                    {result.isPassed ? '최종 합격' : '불합격'}
                                </div>

                                <div className="result-explanation">
                                    {result.isPassed ? (
                                        <p>축하합니다, 대표님! <br /> 실전에서도 이 텐션을 유지하시면 무조건 합격입니다! 🎉</p>
                                    ) : (
                                        <div>
                                            <p className="mb-2">아쉽게도 합격 기준에 미달했습니다.</p>
                                            {result.failedSubjects.length > 0 && (
                                                <p className="text-red-600 font-semibold bg-red-50 border border-red-100 p-2 rounded-lg mt-2">
                                                    과락 과목: {result.failedSubjects.join(', ')}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="action-buttons">
                                    <button
                                        onClick={() => setStep('review')}
                                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                                    >
                                        오답노트 및 해설 보기
                                    </button>
                                    <button
                                        onClick={handleStart}
                                        className="secondary-action"
                                    >
                                        다른 문제로 다시 풀기 (랜덤)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'review' && result && (
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="review-header">
                            <h3 className="text-2xl font-bold mb-2">실전 오답 정리 📚</h3>
                            <p className="text-gray-500">랜덤 추출된 문제 중 틀린 문항에 대한 베테랑 카일의 해설입니다.</p>
                        </div>

                        {result.incorrect.length === 0 ? (
                            <div className="text-center py-12">
                                <span className="text-5xl block mb-4">💯</span>
                                <p className="text-xl font-bold">오점 하나 없는 완벽함! 대단하십니다!</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6">
                                {result.incorrect.map((q, i) => (
                                    <div key={i} className="review-item">
                                        <div className="question-subject">[{q.subject}]</div>
                                        <div className="review-question">{q.id}. {q.question}</div>
                                        <div className="review-answers">
                                            <div className="answer-your">
                                                나의 선택: {q.userChoice !== undefined ? `${q.userChoice + 1}. ${q.options[q.userChoice]}` : '미선택'}
                                            </div>
                                            <div className="answer-correct">
                                                정답: {q.answer + 1}. {q.options[q.answer]}
                                            </div>
                                        </div>
                                        <div className="review-explanation">
                                            <p className="font-bold text-blue-600 mb-1">카일의 족집게 해설:</p>
                                            {q.explanation}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={() => setStep('result')}
                                className="px-8 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition"
                            >
                                결과 화면으로 돌아가기
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default NurseExam;
