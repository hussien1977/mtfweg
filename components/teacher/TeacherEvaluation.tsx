import React, { useState, useMemo } from 'react';
import type { ClassData, Teacher, Student, Subject, EvaluationRating, StudentEvaluation, StudentNotification } from '../../types.ts';
import { EVALUATION_RATINGS } from '../../types.ts';
import StudentEvaluator from './StudentEvaluator.tsx';
import { Star } from 'lucide-react';

interface TeacherEvaluationProps {
    teacher: Teacher;
    classes: ClassData[];
}

export default function TeacherEvaluation({ teacher, classes }: TeacherEvaluationProps) {
    const [selectedAssignment, setSelectedAssignment] = useState<string>(''); // Will store "classId|subjectId"

    const assignments = useMemo(() => {
        return (teacher.assignments || []).map(a => {
            const classInfo = classes.find(c => c.id === a.classId);
            if (!classInfo) return null;
            const subjectInfo = classInfo.subjects.find(s => s.id === a.subjectId);
            if (!subjectInfo) return null;
            return {
                value: `${a.classId}|${a.subjectId}`,
                label: `${classInfo.stage} - ${classInfo.section} / ${subjectInfo.name}`,
                classInfo,
                subjectInfo
            };
        }).filter((item): item is NonNullable<typeof item> => !!item);
    }, [teacher.assignments, classes]);

    const { selectedClass, selectedSubject } = useMemo(() => {
        if (!selectedAssignment) return { selectedClass: null, selectedSubject: null };
        const [classId, subjectId] = selectedAssignment.split('|');
        const classInfo = classes.find(c => c.id === classId);
        const subjectInfo = classInfo?.subjects.find(s => s.id === subjectId);
        return { selectedClass: classInfo || null, selectedSubject: subjectInfo || null };
    }, [selectedAssignment, classes]);

    const studentsWithCodes = useMemo(() => {
        if (!selectedClass) return [];
        return (selectedClass.students || []).filter(student => student.studentAccessCode);
    }, [selectedClass]);

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="flex items-center gap-3 text-2xl font-bold text-gray-800 mb-6 border-b pb-4">
                <Star className="w-8 h-8 text-yellow-500" />
                <h2>صفحة تقييم الطلبة</h2>
            </div>

            <div className="mb-6">
                <label htmlFor="assignment-select" className="block text-md font-bold text-gray-700 mb-2">
                    اختر الصف والمادة للتقييم:
                </label>
                <select
                    id="assignment-select"
                    value={selectedAssignment}
                    onChange={(e) => setSelectedAssignment(e.target.value)}
                    className="w-full max-w-lg p-2 border border-gray-300 rounded-lg bg-white"
                >
                    <option value="">-- يرجى الاختيار --</option>
                    {assignments.map(a => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                </select>
            </div>

            {selectedAssignment && selectedClass && selectedSubject ? (
                studentsWithCodes.length > 0 ? (
                    <div className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-700">
                            الطلاب المتاح تقييمهم في: {selectedClass.stage} - {selectedClass.section}
                        </h3>
                        <div className="max-h-[60vh] overflow-y-auto pr-2">
                            {studentsWithCodes.map(student => (
                                <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                    <span className="font-semibold text-lg">{student.name}</span>
                                    <div className="w-48">
                                        <StudentEvaluator
                                            student={student}
                                            subject={selectedSubject}
                                            teacher={teacher}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-500 p-8 bg-gray-100 rounded-lg">
                        <p>لا يوجد طلاب لديهم أكواد اشتراك في هذه الشعبة لعرضهم.</p>
                    </div>
                )
            ) : (
                <div className="text-center text-gray-500 p-8 bg-gray-100 rounded-lg">
                    <p>يرجى اختيار صف ومادة من القائمة أعلاه لبدء التقييم.</p>
                </div>
            )}
        </div>
    );
}