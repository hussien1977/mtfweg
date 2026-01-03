
import React, { useState, useEffect, useMemo } from 'react';
// Fix: Added missing type imports
import type { User, ClassData, BehavioralHonorBoard, HonoredStudent, BehavioralVote } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { Award, Crown, Loader2, Send, Star, UserCheck, X } from 'lucide-react';
// Fix: Added missing constant import
import { BEHAVIORAL_CRITERIA } from '../../constants.ts';

interface HonorBoardViewProps {
    currentUser: User;
    classes: ClassData[];
}

const getWeekId = (date = new Date()) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `week-${weekNumber}-${d.getUTCFullYear()}`;
};

const calculateStudentScore = (student: HonoredStudent): number => {
    // FIX: Cast the result of Object.values to the correct type (BehavioralVote[]) to allow reduce to work.
    return (Object.values(student.votes || {}) as BehavioralVote[]).reduce((total, vote) => total + vote.criteriaKeys.length, 0);
};

const StudentCard = ({ student, rank, score, classes }: { student: HonoredStudent; rank: number; score: number; classes: ClassData[] }) => (
    <div className="relative flex flex-col items-center p-4 bg-white rounded-xl shadow-lg border-2 border-yellow-300 transform transition-transform hover:scale-105">
        {rank === 1 && <Crown className="absolute -top-5 w-10 h-10 text-yellow-400" />}
        <img
            src={student.studentPhotoUrl || 'https://i.imgur.com/0zjxJmi.jpeg'}
            alt={student.studentName}
            className="w-28 h-28 rounded-full object-cover border-4 border-yellow-400 bg-gray-200"
        />
        <h4 className="mt-3 text-lg font-bold text-gray-800">{student.studentName}</h4>
        <p className="text-sm text-gray-500">{classes.find(c => c.id === student.classId)?.section}</p>
        <div className="mt-2 flex items-center gap-1 font-bold text-yellow-600">
            <Star size={18} />
            <span>{score} نقطة</span>
        </div>
    </div>
);

const VoteModal = ({
    isOpen,
    onClose,
    students,
    currentUser,
    onVote,
}: {
    isOpen: boolean;
    onClose: () => void;
    students: HonoredStudent[];
    currentUser: User;
    onVote: (studentId: string, criteria: string[]) => void;
}) => {
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [selectedCriteria, setSelectedCriteria] = useState<Record<string, boolean>>({});

    // Effect to set the initial student when the modal opens or the list changes
    useEffect(() => {
        if (isOpen && students.length > 0 && !selectedStudentId) {
            setSelectedStudentId(students[0].studentId);
        }
    }, [isOpen, students, selectedStudentId]);

    // Effect to load the votes for the selected student.
    // This ONLY runs when the selected student changes, preventing re-renders
    // from wiping out the user's checkbox interactions.
    useEffect(() => {
        if (selectedStudentId) {
            const studentData = students.find(s => s.studentId === selectedStudentId);
            const myVote = studentData?.votes?.[currentUser.id];
            const initialCriteria: Record<string, boolean> = {};
            if (myVote) {
                 myVote.criteriaKeys.forEach(key => { initialCriteria[key] = true; });
            }
             setSelectedCriteria(initialCriteria);
        } else {
             setSelectedCriteria({});
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStudentId]);


    const handleVote = () => {
        if (!selectedStudentId) {
            alert("يرجى اختيار طالب للتصويت.");
            return;
        }
        const criteriaKeys = Object.entries(selectedCriteria).filter(([, isSelected]) => isSelected).map(([key]) => key);
        if (criteriaKeys.length === 0) {
            alert("يرجى اختيار معيار واحد على الأقل للتصويت.");
            return;
        }
        onVote(selectedStudentId, criteriaKeys);
        alert('تم تسجيل تصويتك بنجاح!');
    };

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col" style={{height: '90vh'}}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold">التصويت لنجوم السلوك</h3>
                    <button onClick={onClose}><X/></button>
                </header>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow overflow-hidden">
                    <div className="md:col-span-1 overflow-y-auto border-r pr-2">
                        <h4 className="font-bold mb-2">المرشحون</h4>
                        {students.map(s => (
                             <button key={s.studentId} onClick={() => setSelectedStudentId(s.studentId)}
                                className={`w-full text-right p-2 rounded-md flex items-center justify-between ${selectedStudentId === s.studentId ? 'bg-cyan-500 text-white' : 'hover:bg-gray-100'}`}>
                                {s.studentName}
                                {s.votes?.[currentUser.id] && <UserCheck size={16} className="text-green-500"/>}
                            </button>
                        ))}
                    </div>
                    <div className="md:col-span-2 overflow-y-auto">
                         {selectedStudentId ? (
                            <div>
                                 <h4 className="font-bold mb-2">معايير التقييم لـ: {students.find(s=>s.studentId === selectedStudentId)?.studentName}</h4>
                                <div className="space-y-2">
                                    {BEHAVIORAL_CRITERIA.map(criterion => (
                                        <label key={criterion.key} className="flex items-start gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                                            <input type="checkbox" checked={!!selectedCriteria[criterion.key]} onChange={e => setSelectedCriteria(p => ({ ...p, [criterion.key]: e.target.checked }))} className="mt-1 h-4 w-4"/>
                                            <div>
                                                <span className="font-semibold">{criterion.label}</span>
                                                <p className="text-xs text-gray-500">{criterion.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ) : <p className="text-gray-500 text-center mt-8">اختر طالباً من القائمة للتصويت.</p>}
                    </div>
                </div>
                 <footer className="p-4 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">إغلاق</button>
                    <button onClick={handleVote} disabled={!selectedStudentId} className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center gap-2 disabled:bg-gray-400">
                        <Send size={16}/> حفظ التصويت
                    </button>
                </footer>
            </div>
        </div>
    );
};


export default function HonorBoardView({ currentUser, classes }: HonorBoardViewProps) {
    const [boards, setBoards] = useState<Record<string, BehavioralHonorBoard>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
    const [votingStage, setVotingStage] = useState<string | null>(null);
    
    // FIX: Corrected the logic to determine principalId for different user roles.
    const principalId = currentUser.role === 'principal' ? currentUser.id : currentUser.principalId;
    const weekId = getWeekId();
    // FIX: Corrected role check to include all non-student roles for staff voting.
    const isStaff = currentUser.role !== 'student';

    useEffect(() => {
        if (!principalId) return;
        setIsLoading(true);
        const boardsRef = db.ref(`behavioral_honor_boards/${principalId}/${weekId}`);
        const callback = (snapshot: any) => {
            setBoards(snapshot.val() || {});
            setIsLoading(false);
        };
        boardsRef.on('value', callback);
        return () => boardsRef.off('value', callback);
    }, [principalId, weekId]);
    
    const topStudentsByStage = useMemo(() => {
        const result: Record<string, (HonoredStudent & { score: number })[]> = {};
        const boardData = boards as unknown as Record<string, BehavioralHonorBoard>;
        if (!boardData) return result;

        Object.entries(boardData).forEach(([stage, board]) => {
             if (!board || !board.honoredStudents) return;
             // FIX: Correctly type students to HonoredStudent[] and cast score calculation to work on each entry.
             const studentsWithScores = (Object.values(board.honoredStudents) as HonoredStudent[])
                .map(student => ({ ...student, score: calculateStudentScore(student) }))
                .sort((a, b) => b.score - a.score);
            result[stage] = studentsWithScores.slice(0, 5);
        });
        return result;
    }, [boards]);
    
    const handleVote = (studentId: string, criteriaKeys: string[]) => {
        if (!votingStage || !principalId) return;
        const vote: BehavioralVote = {
            voterId: currentUser.id,
            voterName: currentUser.name,
            criteriaKeys
        };
        const path = `behavioral_honor_boards/${principalId}/${weekId}/${votingStage}/honoredStudents/${studentId}/votes/${currentUser.id}`;
        db.ref(path).set(vote);
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-10 w-10 text-cyan-600"/></div>;

    return (
        <div className="space-y-8">
            <div className="text-center bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300 p-6 rounded-xl shadow-lg">
                <h1 className="text-4xl font-extrabold text-gray-800" style={{ textShadow: '1px 1px 2px white' }}>لوحة الشرف السلوكية</h1>
                <p className="mt-2 text-yellow-900 font-semibold">
                    هنا نكرّم النجوم الذين يضيئون مدرستنا بأخلاقهم العالية والتزامهم المثالي. هؤلاء هم قدوة لزملائهم ومصدر فخر لنا جميعاً.
                </p>
            </div>
            
            {Object.keys(topStudentsByStage).length === 0 ? (
                <p className="text-center text-gray-500 p-8 bg-white rounded-lg">لم يتم ترشيح أي طلاب للوحة الشرف هذا الأسبوع بعد.</p>
            ) : (
                Object.entries(topStudentsByStage).map(([stage, students]) => (
                    <div key={stage} className="bg-white p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold text-center mb-6">نجوم {stage}</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                            {((students || []) as (HonoredStudent & { score: number })[]).map((student, index) => (
                                <React.Fragment key={student.studentId}>
                                    <StudentCard student={student} rank={index + 1} score={student.score} classes={classes} />
                                </React.Fragment>
                            ))}
                        </div>
                        {isStaff && (
                             <div className="text-center mt-8">
                                <button onClick={() => { setVotingStage(stage); setIsVoteModalOpen(true); }} className="px-6 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition">
                                    صوّت لطلاب {stage}
                                </button>
                             </div>
                        )}
                    </div>
                ))
            )}

            {isVoteModalOpen && votingStage && boards[votingStage] && (
                <VoteModal
                    isOpen={isVoteModalOpen}
                    onClose={() => setIsVoteModalOpen(false)}
                    students={Object.values((boards[votingStage] as BehavioralHonorBoard).honoredStudents || {})}
                    currentUser={currentUser}
                    onVote={handleVote}
                />
            )}
        </div>
    );
}