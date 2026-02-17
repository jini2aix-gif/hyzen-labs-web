// 간호조무사 실전 모의고사 통합 문제 은행 (200문항)
import { basicNursingQuestions } from './questionBank_part1';
import { healthNursingQuestions } from './questionBank_part2';
import { publicHealthQuestions } from './questionBank_part3';
import { practicalSkillsQuestions } from './questionBank_part4';
import { basicNursingQuestionsExt } from './questionBank_ext1';
import { mixedQuestionsExt } from './questionBank_ext2';

// 전체 200문항 통합
export const allQuestions = [
    ...basicNursingQuestions,       // 35문항 (ID 1-35)
    ...healthNursingQuestions,      // 15문항 (ID 36-50)
    ...publicHealthQuestions,       // 20문항 (ID 51-70)
    ...practicalSkillsQuestions,    // 35문항 (ID 71-105)
    ...basicNursingQuestionsExt,    // 33문항 (ID 106-138)
    ...mixedQuestionsExt            // 62문항 (ID 139-200)
];

// 과목별 문항 수 통계
export const questionStats = {
    total: allQuestions.length,
    bySubject: {
        기초간호학: allQuestions.filter(q => q.subject === '기초간호학').length,
        보건간호학: allQuestions.filter(q => q.subject === '보건간호학').length,
        공중보건학: allQuestions.filter(q => q.subject === '공중보건학').length,
        실기학: allQuestions.filter(q => q.subject === '실기학').length
    }
};

// 완전 랜덤 문제 추출 함수 (105문항)
export const getRandomQuestions = (count = 105) => {
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, allQuestions.length));
};

// 실전 CBT 형식: 과목별 순서대로 출제 (기초 → 보건 → 공중 → 실기)
export const getProportionalQuestions = () => {
    const basicQuestions = allQuestions.filter(q => q.subject === '기초간호학');
    const healthQuestions = allQuestions.filter(q => q.subject === '보건간호학');
    const publicQuestions = allQuestions.filter(q => q.subject === '공중보건학');
    const practicalQuestions = allQuestions.filter(q => q.subject === '실기학');

    // 각 과목 내에서만 랜덤으로 섞음 (과목 순서는 유지)
    const basic = [...basicQuestions].sort(() => Math.random() - 0.5).slice(0, 35);
    const health = [...healthQuestions].sort(() => Math.random() - 0.5).slice(0, 15);
    const publicH = [...publicQuestions].sort(() => Math.random() - 0.5).slice(0, 20);
    const practical = [...practicalQuestions].sort(() => Math.random() - 0.5).slice(0, 35);

    // 실전 CBT처럼 과목 순서대로 배치 (섞지 않음)
    return [...basic, ...health, ...publicH, ...practical];
};

// 난이도별 문제 추출 (향후 확장용)
export const getQuestionsByDifficulty = (difficulty) => {
    // 현재는 난이도 태그가 없으므로 전체 반환
    // 향후 각 문제에 difficulty 속성 추가 시 필터링 가능
    return allQuestions;
};

// 특정 과목만 추출
export const getQuestionsBySubject = (subject) => {
    return allQuestions.filter(q => q.subject === subject);
};

export default allQuestions;
