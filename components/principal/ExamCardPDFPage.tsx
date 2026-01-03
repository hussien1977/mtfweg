import React from 'react';
import type { SchoolSettings } from '../../types.ts';
import ExamCard from './ExamCard.tsx';

interface StudentCardData {
    fullName: string;
    motherName: string;
    birthDate: string;
    examId: string;
    governorate: string;
}

interface ExamCardPDFPageProps {
    students: StudentCardData[];
    settings: SchoolSettings;
}

export default function ExamCardPDFPage({ students, settings }: ExamCardPDFPageProps) {
    return (
        <div 
            className="w-[794px] h-[1123px] bg-white flex flex-col items-center justify-around"
            style={{ direction: 'rtl' }}
        >
            {students.map((student, index) => (
                 <div key={student.examId || index} className="transform scale-[0.9] origin-center">
                    <ExamCard student={student} settings={settings} />
                </div>
            ))}
        </div>
    );
}