import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Teacher, ClassData, Subject, XOQuestion, XOGameSettings, XOGameScore, User } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { extractTextFromURL, generateXOQuestionsFromText } from '../../lib/gemini.ts';
import { v4 as uuidv4 } from 'uuid';
import { BrainCircuit, Loader2, Plus, Save, Trash2, BookOpen, Gamepad2, Check, Settings, BarChart2, PlayCircle, X } from 'lucide-react';
import XoGame from '../student/XoGame.tsx';
import { normalizePathSegment } from '../../lib/utils.ts';


interface XoGameManagerProps {
    teacher: Teacher;
    classes: ClassData[];
    users: User[];
}

const CHAPTERS = Array.from({ length: 14 }, (_, i) => `الفصل ${i + 1}`);
const DEFAULT_GAME_SETTINGS: XOGameSettings = {
    pointsPolicy: 'winner_takes_all',
    startTime: '',
    endTime: '',
    questionTimeLimit: 60,
    allowSinglePlayer: true,
};

export default function XoGameManager({ teacher, classes, users }: XoGameManagerProps) {
    const [selectedAssignment, setSelectedAssignment] = useState<string>(''); // classId|subjectId
    const [questions, setQuestions] = useState<XOQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState<'manager' | 'test_game'>('manager');
    const [activeTab, setActiveTab] = useState<'questions' | 'settings' | 'scores'>('questions');

    // State for manual question entry
    const [newQuestion, setNewQuestion] = useState<Partial<XOQuestion>>({
        questionText: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
    });
    const [manualChapter, setManualChapter] = useState<string>('الفصل 1');
    
    // State for AI generation
    const [aiParams, setAiParams] = useState({
      startPage: 1, endPage: 10, questionCount: 30,
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState('');
    const [sourceMode, setSourceMode] = useState<'url' | 'text'>('url');
    const [pastedText, setPastedText] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [reviewQuestions, setReviewQuestions] = useState<XOQuestion[]>([]);
    const [aiChapter, setAiChapter] = useState<string>('الفصل 1');
    const [generationAttempts, setGenerationAttempts] = useState<Record<string, number>>({}); // Key: normalized chapter, Value: count


    // State for filtering and selecting active questions
    const [questionFilter, setQuestionFilter] = useState<'all' | 'ai' | 'teachers'>('all');
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<Record<string, boolean>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [chapterFilters, setChapterFilters] = useState<string[]>([]);
    
    // State for Game Settings
    const [gameSettings, setGameSettings] = useState<XOGameSettings>(DEFAULT_GAME_SETTINGS);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // State for Student Scores
    const [subjectScores, setSubjectScores] = useState<XOGameScore[]>([]);
    const [isLoadingScores, setIsLoadingScores] = useState(false);
    const [isTutorialVisible, setIsTutorialVisible] = useState(false);


    const teacherAssignments = useMemo(() => {
        return (teacher.assignments || []).map(a => {
            const classInfo = classes.find(c => c.id === a.classId);
            const subjectInfo = classInfo?.subjects.find(s => s.id === a.subjectId);
            if (!classInfo || !subjectInfo) return null;
            return {
                value: `${a.classId}|${a.subjectId}`,
                label: `${classInfo.stage} - ${classInfo.section} / ${subjectInfo.name}`,
                classInfo,
                subjectInfo
            };
        }).filter((a): a is NonNullable<typeof a> => !!a);
    }, [teacher.assignments, classes]);
    
    const { selectedClass, selectedSubject } = useMemo(() => {
        if (!selectedAssignment) return { selectedClass: null, selectedSubject: null };
        const assignment = teacherAssignments.find(a => a.value === selectedAssignment);
        return { selectedClass: assignment?.classInfo || null, selectedSubject: assignment?.subjectInfo || null };
    }, [selectedAssignment, teacherAssignments]);

    const schoolIdentifier = useMemo(() => {
        const principal = users.find(u => u.id === teacher.principalId);
        if (principal?.schoolName) {
            return normalizePathSegment(principal.schoolName);
        }
        return teacher.principalId; // Fallback
    }, [users, teacher.principalId]);
    
    const normalizedStageName = useMemo(() => normalizePathSegment(selectedClass?.stage || ''), [selectedClass]);
    const normalizedSubjectName = useMemo(() => normalizePathSegment(selectedSubject?.name || ''), [selectedSubject]);

    // Effect for fetching all data when subject changes
    useEffect(() => {
        if (selectedClass && selectedSubject && schoolIdentifier && normalizedStageName && normalizedSubjectName) {
            setIsLoading(true);
            setSelectedQuestionIds({});
            setChapterFilters([]);

            // Paths
            const questionsRef = db.ref(`xo_questions/${schoolIdentifier}/${normalizedStageName}/${normalizedSubjectName}`);
            const activeQuestionsRef = db.ref(`active_xo_questions/${schoolIdentifier}/${normalizedStageName}/${normalizedSubjectName}`);
            const settingsRef = db.ref(`xo_game_settings/${schoolIdentifier}/${normalizedStageName}/${normalizedSubjectName}`);
            const scoresRef = db.ref(`xo_leaderboards/${schoolIdentifier}/subjects/${normalizedStageName}/${normalizedSubjectName}/scores`);
            const attemptsRef = db.ref(`xo_generation_attempts/${schoolIdentifier}/${normalizedStageName}/${normalizedSubjectName}`);


            // Callbacks
            const questionsCallback = (s: any) => setQuestions(s.val() ? Object.values(s.val()) : []);
            const activeQuestionsCallback = (s: any) => setSelectedQuestionIds(s.val() || {});
            const settingsCallback = (s: any) => setGameSettings(s.val() || DEFAULT_GAME_SETTINGS);
            const scoresCallback = (s: any) => {
                const scoresData: XOGameScore[] = s.val() ? Object.values(s.val()) : [];
                setSubjectScores(scoresData.sort((a,b) => b.points - a.points));
            };
            const attemptsCallback = (s: any) => setGenerationAttempts(s.val() || {});


            // Attach listeners
            questionsRef.on('value', questionsCallback);
            activeQuestionsRef.on('value', activeQuestionsCallback);
            settingsRef.on('value', settingsCallback);
            scoresRef.on('value', scoresCallback);
            attemptsRef.on('value', attemptsCallback);
            
            Promise.all([questionsRef.get(), activeQuestionsRef.get(), settingsRef.get(), scoresRef.get(), attemptsRef.get()])
                .finally(() => setIsLoading(false));

            return () => {
                questionsRef.off('value', questionsCallback);
                activeQuestionsRef.off('value', activeQuestionsCallback);
                settingsRef.off('value', settingsCallback);
                scoresRef.off('value', scoresCallback);
                attemptsRef.off('value', attemptsCallback);
            };
        } else {
            setQuestions([]);
            setSelectedQuestionIds({});
            setGameSettings(DEFAULT_GAME_SETTINGS);
            setSubjectScores([]);
        }
    }, [selectedClass, selectedSubject, schoolIdentifier, normalizedStageName, normalizedSubjectName]);
    
    const filteredQuestions = useMemo(() => {
        let tempQuestions = questions;
        
        switch(questionFilter) {
            case 'ai': tempQuestions = tempQuestions.filter(q => q.createdBy === 'ai'); break;
            case 'teachers': tempQuestions = tempQuestions.filter(q => q.createdBy !== 'ai'); break;
        }
        
        if (chapterFilters.length > 0) {
            tempQuestions = tempQuestions.filter(q => q.chapter && chapterFilters.includes(q.chapter));
        }

        return tempQuestions;
    }, [questions, questionFilter, chapterFilters]);
    
    const aiQuestionsInCurrentChapter = useMemo(() => {
        if (!aiChapter) return 0;
        return questions.filter(q => q.createdBy === 'ai' && q.chapter === aiChapter).length;
    }, [questions, aiChapter]);
    
    const normalizedAiChapter = useMemo(() => normalizePathSegment(aiChapter), [aiChapter]);
    const currentChapterAttempts = useMemo(() => generationAttempts[normalizedAiChapter] || 0, [generationAttempts, normalizedAiChapter]);
    const isGenerationLockedForChapter = currentChapterAttempts >= 3 || aiQuestionsInCurrentChapter >= 250;
    
    
    const handleAddManualQuestion = () => {
        if (!selectedClass || !selectedSubject || !newQuestion.questionText?.trim() || newQuestion.options?.some(o => !o.trim())) {
            alert('يرجى ملء جميع حقول السؤال والخيارات.');
            return;
        }

        const principal = users.find(u => u.id === teacher.principalId);

        const questionToAdd: XOQuestion = {
            id: uuidv4(),
            principalId: teacher.principalId,
            grade: selectedClass.stage,
            subject: selectedSubject.name,
            questionText: newQuestion.questionText.trim(),
            options: newQuestion.options as [string, string, string, string],
            correctOptionIndex: newQuestion.correctOptionIndex || 0,
            createdBy: teacher.id,
            creatorName: teacher.name,
            creatorSchool: principal?.schoolName || '',
            chapter: manualChapter,
        };

        db.ref(`xo_questions/${schoolIdentifier}/${normalizedStageName}/${normalizedSubjectName}/${questionToAdd.id}`).set(questionToAdd);
        setNewQuestion({ questionText: '', options: ['', '', '', ''], correctOptionIndex: 0 });
    };
    
    const handleExtractTextFromUrl = async () => {
        if (!sourceUrl) { alert('يرجى لصق الرابط أولاً.'); return; }
        setIsExtracting(true);
        try {
            const extractedText = await extractTextFromURL(sourceUrl, aiParams.startPage, aiParams.endPage, aiChapter);
            setPastedText(extractedText);
            alert('تم استخلاص النص بنجاح.');
            setSourceMode('text');
        } catch (error: any) {
            alert(`فشل استخلاص النص: ${error.message}`);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleGenerateAIQuestions = async () => {
        if (!selectedClass || !selectedSubject || !pastedText.trim()) { alert('يرجى توفير النص أولاً.'); return; }
        setIsGenerating(true); setReviewQuestions([]); setGenerationProgress('البدء في توليد الأسئلة...');
        try {
            setGenerationProgress('جاري تحليل النص وتوليد الأسئلة...');
            const generated = await generateXOQuestionsFromText(pastedText, aiParams.questionCount, selectedClass.stage, selectedSubject.name, teacher.principalId, aiChapter);
            if (generated?.length) {
                setReviewQuestions(generated); setGenerationProgress(`تم توليد ${generated.length} سؤال. يرجى المراجعة والحفظ.`);
            } else { throw new Error("AI returned no questions."); }
        } catch (error: any) {
            console.error(error); setGenerationProgress('حدث خطأ أثناء التوليد.'); alert(`فشل توليد الأسئلة: ${error.message}`);
        } finally { setIsGenerating(false); }
    };
    
    const handleSaveReviewedQuestions = async () => {
        if (!selectedClass || !selectedSubject || !reviewQuestions.length) return;
        setIsGenerating(true); setGenerationProgress('جاري حفظ الأسئلة...');
        try {
            const updates: Record<string, XOQuestion> = {};
            reviewQuestions.forEach(q => { 
                updates[q.id] = q;
            });
            await db.ref(`xo_questions/${schoolIdentifier}/${normalizedStageName}/${normalizedSubjectName}`).update(updates);
            
            // Increment attempt count
            const newAttemptCount = (generationAttempts[normalizedAiChapter] || 0) + 1;
            await db.ref(`xo_generation_attempts/${schoolIdentifier}/${normalizedStageName}/${normalizedSubjectName}/${normalizedAiChapter}`).set(newAttemptCount);
            
            setGenerationProgress('تم الحفظ بنجاح!'); alert(`تم حفظ ${reviewQuestions.length} سؤال جديد.`); setReviewQuestions([]);
        } catch (error: any) {
            console.error(error); setGenerationProgress('فشل الحفظ.'); alert(`فشل حفظ الأسئلة: ${error.message}`);
        } finally { setIsGenerating(false); }
    };

    const handleToggleQuestion = (questionId: string) => {
        setSelectedQuestionIds(prev => {
            const newSelection = { ...prev };
            if (newSelection[questionId]) delete newSelection[questionId]; else newSelection[questionId] = true;
            return newSelection;
        });
    };

    const handleSelectAll = () => {
        const isAllFilteredSelected = filteredQuestions.length > 0 && filteredQuestions.every(q => selectedQuestionIds[q.id]);
        const newSelection = { ...selectedQuestionIds };
        if (isAllFilteredSelected) {
            filteredQuestions.forEach(q => delete newSelection[q.id]);
        } else {
            filteredQuestions.forEach(q => newSelection[q.id] = true);
        }
        setSelectedQuestionIds(newSelection);
    };
    
    const handleToggleChapterFilter = (chapter: string) => {
        setChapterFilters(prev => prev.includes(chapter) ? prev.filter(c => c !== chapter) : [...prev, chapter]);
    };

    const handleSaveChanges = async () => {
        if (!selectedClass || !selectedSubject) return;
        setIsSaving(true);
        try {
            const ref = db.ref(`active_xo_questions/${schoolIdentifier}/${normalizedStageName}/${normalizedSubjectName}`);
            await ref.set(selectedQuestionIds);
            alert('تم حفظ تحديد الأسئلة.');
        } catch (error) { console.error(error); alert('فشل حفظ التحديد.'); } finally { setIsSaving(false); }
    };
    
    const handleSettingsChange = (field: keyof XOGameSettings, value: any) => {
        setGameSettings(prev => ({...prev, [field]: value}));
    };

    const handleSaveSettings = async () => {
        if (!selectedClass || !selectedSubject) return;
        setIsSavingSettings(true);
        try {
            const settingsToSave = {
                ...gameSettings,
                questionTimeLimit: Number(gameSettings.questionTimeLimit) || 60,
            };
            await db.ref(`xo_game_settings/${schoolIdentifier}/${normalizedStageName}/${normalizedSubjectName}`).set(settingsToSave);
            alert('تم حفظ الإعدادات بنجاح!');
        } catch (error) {
            console.error(error);
            alert('فشل حفظ الإعدادات.');
        } finally {
            setIsSavingSettings(false);
        }
    };


    if (view === 'test_game') {
        return (
            <div>
                <button onClick={() => setView('manager')} className="mb-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">&larr; العودة لإدارة الأسئلة</button>
                <XoGame
                    currentUser={teacher}
                    forceSubject={{ grade: selectedClass!.stage, subject: selectedSubject!.name }}
                    gameId={null}
                    onExit={() => setView('manager')}
                />
            </div>
        );
    }
    
    const renderContent = () => {
        if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-10 w-10 text-cyan-600"/></div>

        switch(activeTab) {
            case 'questions': return renderQuestionBank();
            case 'settings': return renderGameSettings();
            case 'scores': return renderStudentScores();
            default: return null;
        }
    };
    
    const renderGameSettings = () => (
        <div className="bg-white p-6 rounded-xl shadow-lg space-y-6 max-w-3xl mx-auto">
            <h3 className="text-xl font-bold text-gray-700">إعدادات اللعبة لمادة: {selectedSubject?.name}</h3>
            
            <div>
                <label className="font-semibold block mb-2">سياسة منح النقاط</label>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2"><input type="radio" name="pointsPolicy" value="grant_all" checked={gameSettings.pointsPolicy === 'grant_all'} onChange={() => handleSettingsChange('pointsPolicy', 'grant_all')} /> منح النقاط للجميع</label>
                    <label className="flex items-center gap-2"><input type="radio" name="pointsPolicy" value="winner_takes_all" checked={gameSettings.pointsPolicy === 'winner_takes_all'} onChange={() => handleSettingsChange('pointsPolicy', 'winner_takes_all')} /> الفائز يحصل على كل النقاط</label>
                </div>
                <p className="text-xs text-gray-500 mt-1">في حالة التعادل، لا يحصل أي لاعب على نقاط.</p>
            </div>

            <div>
                <label className="font-semibold block mb-2">تحديد موعد ووقت اللعب</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="datetime-local" value={gameSettings.startTime} onChange={e => handleSettingsChange('startTime', e.target.value)} className="p-2 border rounded-md"/>
                    <input type="datetime-local" value={gameSettings.endTime} onChange={e => handleSettingsChange('endTime', e.target.value)} className="p-2 border rounded-md"/>
                </div>
            </div>

            <div>
                <label htmlFor="timeLimit" className="font-semibold block mb-2">زمن الإجابة على السؤال (بالثواني)</label>
                <input id="timeLimit" type="number" min="60" value={gameSettings.questionTimeLimit} onChange={e => handleSettingsChange('questionTimeLimit', e.target.value)} className="p-2 border rounded-md w-full"/>
                <p className="text-xs text-gray-500 mt-1">الحد الأدنى 60 ثانية. إذا تأخر اللاعب، ينتقل الدور للخصم.</p>
            </div>

            <div>
                <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={gameSettings.allowSinglePlayer} onChange={e => handleSettingsChange('allowSinglePlayer', e.target.checked)} /> السماح باللعب الفردي (للتدريب)</label>
                <p className="text-xs text-gray-500 mt-1">نقاط اللعب الفردي لا يتم احتسابها.</p>
            </div>
            
            <button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400">
                {isSavingSettings ? <Loader2 className="animate-spin"/> : <Save/>} حفظ الإعدادات
            </button>
        </div>
    );

    const renderStudentScores = () => (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-3xl mx-auto">
             <h3 className="text-xl font-bold text-gray-700 mb-4">نتائج الطلاب في مادة: {selectedSubject?.name}</h3>
             <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                    <thead className="sticky top-0 bg-gray-100">
                        <tr>
                            <th className="p-2 text-right">اسم الطالب</th>
                            <th className="p-2 text-right">الشعبة</th>
                            <th className="p-2 text-center">النقاط</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subjectScores.map(score => (
                            <tr key={score.studentId} className="border-b">
                                <td className="p-2 font-semibold">{score.studentName}</td>
                                <td className="p-2 text-gray-600">{score.section}</td>
                                <td className="p-2 text-center font-bold text-cyan-600">{score.points}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {subjectScores.length === 0 && <p className="text-center text-gray-500 p-8">لا توجد نتائج مسجلة بعد.</p>}
             </div>
        </div>
    );

    const renderQuestionBank = () => (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Manual Entry */}
            <div className="bg-white p-6 rounded-xl shadow-lg space-y-4">
                <h3 className="text-xl font-bold text-gray-700">إضافة سؤال يدوياً</h3>
                <div>
                    <label className="block text-sm font-medium text-gray-700">الفصل أو الوحدة</label>
                    <select value={manualChapter} onChange={e => setManualChapter(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded-md bg-white">
                        {CHAPTERS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <input type="text" placeholder="نص السؤال" value={newQuestion.questionText} onChange={e => setNewQuestion(p => ({...p, questionText: e.target.value}))} className="w-full p-2 border rounded-md"/>
                {(newQuestion.options as string[]).map((opt, i) => (<div key={i} className="flex items-center gap-2"><input type="radio" name="correct_option" checked={newQuestion.correctOptionIndex === i} onChange={() => setNewQuestion(p => ({...p, correctOptionIndex: i}))} /><input type="text" placeholder={`الخيار ${i+1}`} value={opt} onChange={e => { const opts = [...(newQuestion.options as string[])]; opts[i] = e.target.value; setNewQuestion(p => ({...p, options: opts as any})); }} className="flex-grow p-2 border rounded-md"/></div>))}
                <button onClick={handleAddManualQuestion} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"><Plus/>إضافة السؤال</button>
            </div>

            {/* AI Generation */}
            <div className="bg-white p-6 rounded-xl shadow-lg space-y-4">
                <h3 className="text-xl font-bold text-gray-700">توليد الأسئلة بالذكاء الاصطناعي</h3>
                <div><label className="block text-sm font-medium text-gray-700">الفصل أو الوحدة (للتوليد والاستخلاص)</label><select value={aiChapter} onChange={e => setAiChapter(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded-md bg-white">{CHAPTERS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                
                {currentChapterAttempts >= 3 ? (
                    <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-md">
                        <p className="font-bold">عذراً، لقد أكملت حصتك المقررة لتوليد الأسئلة لهذا الفصل الدراسي.</p>
                        <p>تستطيع توليد باقي الأسئلة يدوياً أو الانتقال إلى فصل دراسي آخر.</p>
                    </div>
                ) : aiQuestionsInCurrentChapter >= 250 ? (
                     <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-md">
                        <p className="font-bold">تم الوصول للحد الأقصى</p>
                        <p>لقد وصلت إلى الحد الأقصى (250 سؤال) من الأسئلة التي يمكن إنشاؤها بالذكاء الاصطناعي لهذا الفصل. لا يزال بإمكانك إضافة أسئلة يدوياً أو اختيار فصل آخر.</p>
                    </div>
                ) : null}

                <div className="flex bg-gray-200 rounded-lg p-1"><button onClick={() => setSourceMode('url')} className={`flex-1 p-2 rounded-md font-semibold text-sm ${sourceMode === 'url' ? 'bg-white shadow' : ''}`}>من رابط</button><button onClick={() => setSourceMode('text')} className={`flex-1 p-2 rounded-md font-semibold text-sm ${sourceMode === 'text' ? 'bg-white shadow' : ''}`}>لصق نص</button></div>
                {sourceMode === 'url' && (<div className="space-y-4 border p-3 rounded-md bg-gray-50"><input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="رابط المنهج الدراسي" className="w-full p-2 border rounded-md" disabled={isGenerationLockedForChapter}/><div className="grid grid-cols-2 gap-4"><input type="number" value={aiParams.startPage} onChange={e => setAiParams(p => ({...p, startPage: Number(e.target.value)}))} className="w-full p-2 border rounded-md" placeholder="من صفحة" disabled={isGenerationLockedForChapter}/><input type="number" value={aiParams.endPage} onChange={e => setAiParams(p => ({...p, endPage: Number(e.target.value)}))} className="w-full p-2 border rounded-md" placeholder="إلى صفحة" disabled={isGenerationLockedForChapter}/></div><button onClick={handleExtractTextFromUrl} disabled={isExtracting || isGenerationLockedForChapter} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 disabled:bg-gray-400">{isExtracting && <Loader2 className="animate-spin"/>} استخلاص النص</button></div>)}
                <textarea value={pastedText} onChange={e => setPastedText(e.target.value)} rows={5} className="w-full p-2 border rounded-md" placeholder="النص المصدر للأسئلة..." disabled={isGenerationLockedForChapter}/>
                <div><label htmlFor="questionCount" className="block text-sm font-medium text-gray-700 mb-1">عدد الأسئلة المطلوب (حد أقصى 50)</label><input id="questionCount" type="number" value={aiParams.questionCount} onChange={(e) => setAiParams((p) => ({ ...p, questionCount: Math.min(50, Number(e.target.value)) })) } max="50" className="w-full p-2 border rounded-md" disabled={isGenerationLockedForChapter}/></div>
                <button onClick={handleGenerateAIQuestions} disabled={isGenerating || isGenerationLockedForChapter} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400">{isGenerating ? <Loader2 className="animate-spin"/> : <BrainCircuit/>} {isGenerating ? generationProgress : 'توليد الأسئلة من النص أعلاه'}</button>
                {reviewQuestions.length > 0 && (<div className="mt-4 p-4 border-t-2 bg-green-50 space-y-3"><h4 className="text-lg font-bold text-green-800">أسئلة للمراجعة ({reviewQuestions.length})</h4><div className="max-h-60 overflow-y-auto space-y-2 pr-2">{reviewQuestions.map(q => (<div key={q.id} className="p-2 rounded-md border bg-white"><p className="font-semibold">{q.questionText}</p><div className="text-sm mt-1">{q.options.map((opt, i) => <span key={i} className={`mr-4 ${i === q.correctOptionIndex ? 'font-bold text-green-600' : ''}`}>{i + 1}. {opt}</span>)}</div></div>))}</div><div className="flex gap-4"><button onClick={() => setReviewQuestions([])} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600"><Trash2 size={18} /> تجاهل</button><button onClick={handleSaveReviewedQuestions} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700"><Save size={18} /> حفظ</button></div></div>)}
            </div>
            
             {/* Question List */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold text-gray-700 mb-2">بنك الأسئلة ({filteredQuestions.length})</h3>
                <div className="mb-4 border-y py-2 space-y-2"><div className="flex justify-center gap-2 p-1 bg-gray-100 rounded-lg"><button onClick={() => setQuestionFilter('all')} className={`px-3 py-1 text-sm rounded-md ${questionFilter === 'all' ? 'bg-cyan-600 text-white' : ''}`}>الكل</button><button onClick={() => setQuestionFilter('ai')} className={`px-3 py-1 text-sm rounded-md ${questionFilter === 'ai' ? 'bg-cyan-600 text-white' : ''}`}>AI</button><button onClick={() => setQuestionFilter('teachers')} className={`px-3 py-1 text-sm rounded-md ${questionFilter === 'teachers' ? 'bg-cyan-600 text-white' : ''}`}>المدرسين</button></div><div className="flex flex-wrap justify-center gap-2">{CHAPTERS.map(c => (<button key={c} onClick={() => handleToggleChapterFilter(c)} className={`px-3 py-1 text-xs rounded-full border-2 ${chapterFilters.includes(c) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-blue-50 border-blue-200'}`}>{chapterFilters.includes(c) && <Check size={12} className="inline-block ml-1"/>}{c}</button>))
                }{chapterFilters.length > 0 && <button onClick={() => setChapterFilters([])} className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-700">إلغاء تحديد الفصول</button>}</div></div>
                <div className="flex justify-between items-center mb-4"><div className="flex items-center gap-4"><button onClick={handleSaveChanges} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400">{isSaving ? <Loader2 className="animate-spin"/> : <Save />} حفظ التحديد</button><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={filteredQuestions.length > 0 && filteredQuestions.every(q => selectedQuestionIds[q.id])} onChange={handleSelectAll} className="h-5 w-5"/> تحديد الكل</label></div><button onClick={() => setView('test_game')} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700"><Gamepad2 /> تجربة اللعبة</button></div>
                <div className="max-h-96 overflow-y-auto space-y-2 pr-2">{isLoading ? <Loader2 className="animate-spin mx-auto"/> : filteredQuestions.map(q => (<div key={q.id} className={`p-3 rounded-md border flex items-start gap-3 ${q.createdBy === 'ai' ? 'bg-gray-50' : 'bg-blue-50'}`}><input type="checkbox" checked={!!selectedQuestionIds[q.id]} onChange={() => handleToggleQuestion(q.id)} className="h-5 w-5 mt-1"/><div><p className="font-semibold">{q.questionText}</p><div className="text-sm mt-1">{q.options.map((opt, i) => <span key={i} className={`mr-4 ${i === q.correctOptionIndex ? 'font-bold text-green-600' : ''}`}>{i+1}. {opt}</span>)}</div>{q.chapter && <span className="text-xs mt-1 text-blue-500 font-semibold bg-blue-100 px-2 py-0.5 rounded-full inline-block">{q.chapter}</span>}</div></div>))}</div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
             {isTutorialVisible && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[100] p-4"
                    onClick={() => setIsTutorialVisible(false)}
                >
                    <div 
                        className="bg-black p-2 rounded-lg shadow-xl w-full max-w-4xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setIsTutorialVisible(false)}
                            className="absolute -top-3 -right-3 bg-white text-black rounded-full p-2 z-10 shadow-lg hover:scale-110 transition-transform"
                            aria-label="Close video"
                        >
                            <X size={24} />
                        </button>
                        <div className="relative w-full" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
                            <iframe
                                src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2F61578356680977%2Fvideos%2F1099228382324741&show_text=false&autoplay=1&mute=0"
                                className="absolute top-0 left-0 w-full h-full"
                                style={{ border: 'none', overflow: 'hidden' }}
                                title="Facebook video player"
                                frameBorder="0"
                                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                allowFullScreen={true}>
                            </iframe>
                        </div>
                    </div>
                </div>
            )}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b pb-2">
                    <h2 className="text-2xl font-bold text-gray-800">إدارة مسابقة XO التعليمية</h2>
                    <button 
                        onClick={() => setIsTutorialVisible(true)}
                        className="flex items-center gap-2 mt-2 sm:mt-0 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-transform transform hover:scale-105"
                    >
                        <PlayCircle size={20} />
                        شاهد العرض التوضيحي
                    </button>
                </div>
                <select value={selectedAssignment} onChange={e => setSelectedAssignment(e.target.value)} className="w-full max-w-lg p-2 border border-gray-300 rounded-lg bg-white">
                    <option value="">-- اختر الصف والمادة --</option>
                    {teacherAssignments.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
            </div>
            
            {selectedAssignment && (
                <>
                    <div className="flex justify-center border-b">
                        <button onClick={() => setActiveTab('questions')} className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'questions' ? 'border-b-2 border-cyan-500 text-cyan-600' : 'text-gray-500'}`}><BookOpen size={18}/> بنك الأسئلة</button>
                        <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'settings' ? 'border-b-2 border-cyan-500 text-cyan-600' : 'text-gray-500'}`}><Settings size={18}/> إعدادات اللعبة</button>
                        <button onClick={() => setActiveTab('scores')} className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'scores' ? 'border-b-2 border-cyan-500 text-cyan-600' : 'text-gray-500'}`}><BarChart2 size={18}/> نتائج الطلبة</button>
                    </div>
                    <div className="mt-6">
                        {renderContent()}
                    </div>
                </>
            )}
        </div>
    );
}