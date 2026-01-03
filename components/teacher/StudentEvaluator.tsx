import React, { useState, useEffect } from 'react';
import type { Student, Subject, Teacher, EvaluationRating, StudentEvaluation, StudentNotification } from '../../types.ts';
import { EVALUATION_RATINGS } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { v4 as uuidv4 } from 'uuid';

interface StudentEvaluatorProps {
    student: Student;
    subject: Subject;
    teacher: Teacher;
    isReadOnly?: boolean;
}

export default function StudentEvaluator({ student, subject, teacher, isReadOnly }: StudentEvaluatorProps) {
    const [currentRating, setCurrentRating] = useState<EvaluationRating | ''>('');
    const [isLoading, setIsLoading] = useState(true);

    const principalId = teacher.principalId;
    const evaluationPath = `evaluations/${principalId}/${student.id}/${subject.id}`;

    useEffect(() => {
        setIsLoading(true);
        db.ref(evaluationPath).get().then(snapshot => {
            if (snapshot.exists()) {
                setCurrentRating(snapshot.val().rating);
            } else {
                setCurrentRating('');
            }
        }).finally(() => setIsLoading(false));
    }, [evaluationPath]);

    const handleRatingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newRating = e.target.value as EvaluationRating | '';
        setCurrentRating(newRating);
        
        if (!newRating) {
             db.ref(evaluationPath).remove();
             return;
        }

        const evaluationData: StudentEvaluation = {
            id: `${student.id}-${subject.id}`,
            studentId: student.id,
            principalId: principalId,
            classId: teacher.assignments.find(a => a.subjectId === subject.id)?.classId || '',
            subjectId: subject.id,
            subjectName: subject.name,
            teacherId: teacher.id,
            teacherName: teacher.name,
            rating: newRating,
            timestamp: new Date().toISOString()
        };

        db.ref(evaluationPath).set(evaluationData);
        
        // Send notification to student
        const notification: Omit<StudentNotification, 'id'> = {
            studentId: student.id,
            message: `قام المدرس ${teacher.name} بتقييمك في مادة ${subject.name} بتقدير: ${newRating}.`,
            timestamp: new Date().toISOString(),
            isRead: false
        };
        db.ref(`student_notifications/${principalId}/${student.id}`).push(notification);
    };

    if (!student.studentAccessCode || isReadOnly) {
        return <div className="p-2 text-center text-gray-400">-</div>;
    }
    
    if (isLoading) {
        return <div className="p-2 text-center text-gray-400">...</div>;
    }

    return (
        <select
            value={currentRating}
            onChange={handleRatingChange}
            className="w-full h-full bg-transparent border-0 focus:ring-1 focus:ring-inset focus:ring-cyan-500 p-1 outline-none font-semibold"
        >
            <option value="">-- لم يقيم --</option>
            {EVALUATION_RATINGS.map(rating => (
                <option key={rating} value={rating}>{rating}</option>
            ))}
        </select>
    );
}