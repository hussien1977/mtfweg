import React, { useState, useMemo, useEffect } from 'react';
import type { User, ClassData, Student, StudentEvaluation, EvaluationRating } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { Loader2, Star } from 'lucide-react';

const RATING_MAP: Record<EvaluationRating, { value: number; color: string; }> = {
    'ممتاز': { value: 6, color: 'text-green-500' },
    'جيد جدا': { value: 5, color: 'text-cyan-500' },
    'جيد': { value: 4, color: 'text-teal-500' },
    'متوسط': { value: 3, color: 'text-blue-500' },
    'ضعيف': { value: 2, color: 'text-orange-500' },
    'ضعيف جدا': { value: 1, color: 'text-red-500' },
};

const INVERSE_RATING_MAP: Record<number, EvaluationRating> = {
    6: 'ممتاز',
    5: 'جيد جدا',
    4: 'جيد',
    3: 'متوسط',
    2: 'ضعيف',
    1: 'ضعيف جدا',
};


interface CounselorStudentEvaluationProps {
    currentUser: User;
    classes: ClassData[];
    users: User[];
}

export default function CounselorStudentEvaluation({ currentUser, classes, users }: CounselorStudentEvaluationProps) {
    const [selectedStage, setSelectedStage] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [evaluations, setEvaluations] = useState<Record<string, StudentEvaluation[]>>({}); // Keyed by studentId
    const [isLoading, setIsLoading] = useState(false);
    const principalId = currentUser.principalId;

    const availableStages = useMemo(() => Array.from(new Set(classes.map(c => c.stage))), [classes]);
    const classesInStage = useMemo(() => classes.filter(c => c.stage === selectedStage).sort((a, b) => a.section.localeCompare(b.section, 'ar')), [selectedStage, classes]);

    const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [selectedClassId, classes]);

    useEffect(() => {
        if (!selectedClass || !principalId) {
            setEvaluations({});
            return;
        }

        setIsLoading(true);
        const studentIds = selectedClass.students.map(s => s.id);
        if (studentIds.length === 0) {
            setIsLoading(false);
            setEvaluations({});
            return;
        }
        
        const promises = studentIds.map(studentId =>
            db.ref(`evaluations/${principalId}/${studentId}`).get()
        );

        Promise.all(promises).then(snapshots => {
            const allEvals: Record<string, StudentEvaluation[]> = {};
            snapshots.forEach((snapshot, index) => {
                if (snapshot.exists()) {
                    allEvals[studentIds[index]] = Object.values(snapshot.val());
                }
            });
            setEvaluations(allEvals);
        }).finally(() => setIsLoading(false));

    }, [selectedClass, principalId]);

    const getOverallEvaluation = (studentId: string) => {
        const studentEvals = evaluations[studentId];
        if (!studentEvals || studentEvals.length === 0) {
            return { text: 'لا يوجد تقييم', color: 'text-gray-500' };
        }
        const totalValue = studentEvals.reduce((sum, e) => sum + (RATING_MAP[e.rating]?.value || 0), 0);
        const averageValue = Math.round(totalValue / studentEvals.length);
        const ratingText = INVERSE_RATING_MAP[averageValue] || 'متوسط';
        return { text: ratingText, color: RATING_MAP[ratingText]?.color || 'text-gray-500' };
    };
    
    const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedStage(e.target.value);
        setSelectedClassId(''); // Reset class selection
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="flex items-center gap-3 text-2xl font-bold text-gray-800 mb-6 border-b pb-4">
                <Star className="w-8 h-8 text-yellow-500" />
                <h2>عرض تقييمات الطلاب</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <select value={selectedStage} onChange={handleStageChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                    <option value="">-- اختر المرحلة --</option>
                    {availableStages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                </select>
                <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} disabled={!selectedStage} className="w-full p-3 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100">
                    <option value="">-- اختر الشعبة --</option>
                    {classesInStage.map(c => <option key={c.id} value={c.id}>{c.section}</option>)}
                </select>
            </div>
            
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-cyan-600" />
                </div>
            ) : selectedClass ? (
                 <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    {selectedClass.students.sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(student => {
                        const overallEval = getOverallEvaluation(student.id);
                        const studentEvals = evaluations[student.id] || [];
                        return (
                             <div key={student.id} className="p-4 border rounded-lg bg-gray-50 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-gray-800">{student.name}</h3>
                                    <div className={`flex items-center gap-2 text-2xl font-bold ${overallEval.color}`}>
                                        <Star />
                                        <span>{overallEval.text}</span>
                                    </div>
                                </div>
                                {studentEvals.length > 0 ? (
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-200">
                                            <tr>
                                                <th className="p-2 text-right">المادة</th>
                                                <th className="p-2 text-center">التقييم</th>
                                                <th className="p-2 text-right">المُقيِّم</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studentEvals.map(ev => (
                                                <tr key={ev.id} className="border-b">
                                                    <td className="p-2 font-semibold">{ev.subjectName}</td>
                                                    <td className={`p-2 text-center font-bold ${RATING_MAP[ev.rating]?.color || 'text-gray-600'}`}>{ev.rating}</td>
                                                    <td className="p-2 text-gray-600">{ev.teacherName}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-center text-gray-500 py-4">لم يتم تقييم هذا الطالب بعد.</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center text-gray-500 p-8 bg-gray-100 rounded-lg">
                    <p>يرجى اختيار مرحلة وشعبة لعرض تقييمات الطلاب.</p>
                </div>
            )}
        </div>
    );
}