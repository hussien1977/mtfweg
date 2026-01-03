import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { User, ClassData, Student, BehavioralHonorBoard, HonoredStudent, StudentSubmission } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { Award, Loader2, UserPlus, CheckCircle, Trash2, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const getWeekId = (date = new Date()) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `week-${weekNo}-${d.getUTCFullYear()}`;
};

interface BehavioralHonorsManagerProps {
    currentUser: User;
    classes: ClassData[];
    users: User[];
    submissions: StudentSubmission[];
}

export default function BehavioralHonorsManager({ currentUser, classes, users, submissions }: BehavioralHonorsManagerProps) {
    const [selectedStage, setSelectedStage] = useState('');
    const [honorBoardData, setHonorBoardData] = useState<BehavioralHonorBoard | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isNominationModalOpen, setIsNominationModalOpen] = useState(false);
    
    const principalId = currentUser.principalId!;
    const weekId = getWeekId();

    const availableStages = useMemo(() => Array.from(new Set(classes.map(c => c.stage))), [classes]);
    
    const studentsForNomination = useMemo(() => {
        if (!selectedStage) return [];
        return classes
            .filter(c => c.stage === selectedStage)
            .flatMap(c => c.students || [])
            .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [selectedStage, classes]);

    useEffect(() => {
        if (selectedStage) {
            setIsLoading(true);
            const boardRef = db.ref(`behavioral_honor_boards/${principalId}/${weekId}/${selectedStage}`);
            const callback = (snapshot: any) => {
                setHonorBoardData(snapshot.val());
                setIsLoading(false);
            };
            boardRef.on('value', callback);
            return () => boardRef.off('value', callback);
        } else {
            setHonorBoardData(null);
        }
    }, [selectedStage, principalId, weekId]);

    const handleNominateStudent = (student: Student) => {
        if (!selectedStage) return;

        const classInfo = classes.find(c => c.students?.some(s => s.id === student.id));
        if (!classInfo) return;
        
        const newNomination: HonoredStudent = {
            studentId: student.id,
            studentName: student.name,
            classId: classInfo.id,
            section: classInfo.section,
            nominationTimestamp: new Date().toISOString(),
            votes: {},
            studentPhotoUrl: student.photoUrl || 'https://i.imgur.com/GckSf3v.jpeg',
        };

        let path = `behavioral_honor_boards/${principalId}/${weekId}/${selectedStage}`;
        db.ref(path).get().then(snapshot => {
            if (!snapshot.exists()) {
                const newBoard: BehavioralHonorBoard = {
                    id: `${weekId}-${selectedStage}`,
                    principalId: principalId,
                    stage: selectedStage,
                    weekStartDate: new Date().toISOString(),
                    honoredStudents: { [student.id]: newNomination }
                };
                db.ref(path).set(newBoard);
            } else {
                db.ref(`${path}/honoredStudents/${student.id}`).set(newNomination);
            }
        });
    };
    
    const handleRemoveNomination = (studentId: string) => {
        if (!selectedStage || !window.confirm("هل أنت متأكد من إزالة ترشيح هذا الطالب؟")) return;
        const path = `behavioral_honor_boards/${principalId}/${weekId}/${selectedStage}/honoredStudents/${studentId}`;
        db.ref(path).remove();
    };

    const nominatedStudentIds = useMemo(() => {
        return honorBoardData?.honoredStudents ? Object.keys(honorBoardData.honoredStudents) : [];
    }, [honorBoardData]);

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg">
            {isNominationModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col h-[80vh]">
                        <header className="p-4 border-b flex justify-between items-center">
                             <h3 className="text-xl font-bold">ترشيح طالب جديد لمرحلة: {selectedStage}</h3>
                             <button onClick={() => setIsNominationModalOpen(false)}><X/></button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-4">
                             {studentsForNomination.map(student => (
                                <div key={student.id} className="p-2 bg-gray-50 rounded-md flex justify-between items-center mb-2">
                                    <span>{student.name}</span>
                                    {nominatedStudentIds.includes(student.id) ? (
                                        <span className="text-green-600 font-semibold flex items-center gap-1"><CheckCircle/> تم ترشيحه</span>
                                    ) : (
                                        <button onClick={() => handleNominateStudent(student)} className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600">
                                            <UserPlus size={16} className="inline-block ml-1"/> ترشيح
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <div className="flex items-center gap-3 text-2xl font-bold text-gray-800 mb-6 border-b pb-4">
                <Award className="w-8 h-8 text-yellow-500" />
                <h2>إدارة لوحة الشرف السلوكية</h2>
            </div>
            
            <p className="mb-4 text-lg text-center text-gray-700 bg-gray-50 p-3 rounded-md">
                هنا يمكنك ترشيح الطلاب المتميزين سلوكياً لهذا الأسبوع. سيتمكن الكادر التدريسي من التصويت للمرشحين، وسيتم تكريم الطلاب الحاصلين على أعلى الأصوات.
            </p>

            <div className="mb-6">
                <label className="font-bold text-gray-700">اختر المرحلة الدراسية:</label>
                <select value={selectedStage} onChange={e => setSelectedStage(e.target.value)} className="w-full mt-1 p-2 border rounded-md bg-white">
                    <option value="">-- اختر مرحلة --</option>
                    {availableStages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                </select>
            </div>

            {selectedStage && (
                isLoading ? <div className="text-center p-8"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></div> : (
                    <div>
                        <div className="flex justify-center mb-6">
                            <button onClick={() => setIsNominationModalOpen(true)} className="px-6 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition shadow-md">
                                ترشيح طالب جديد
                            </button>
                        </div>
                        <div>
                             <h3 className="text-xl font-bold mb-3 text-center">المرشحون هذا الأسبوع لمرحلة {selectedStage}</h3>
                             <div className="max-h-96 overflow-y-auto space-y-2 border p-2 rounded-lg bg-gray-50">
                                {nominatedStudentIds.length > 0 ? (Object.values(honorBoardData!.honoredStudents) as HonoredStudent[]).map(nominated => (
                                    <div key={nominated.studentId} className="p-3 bg-green-50 rounded-md border border-green-200 flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-16 h-16 rounded-full bg-gray-200">
                                                <img
                                                    src={nominated.studentPhotoUrl || 'https://i.imgur.com/GckSf3v.jpeg'}
                                                    alt={nominated.studentName}
                                                    className="w-full h-full object-cover rounded-full"
                                                />
                                            </div>
                                            <p className="font-bold text-green-800">{nominated.studentName}</p>
                                        </div>
                                        <button onClick={() => handleRemoveNomination(nominated.studentId)} className="p-1 text-red-500 hover:bg-red-100 rounded-full">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                )) : (
                                    <p className="text-gray-500 text-center p-4">لم يتم ترشيح أي طالب بعد لهذه المرحلة.</p>
                                )}
                             </div>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}