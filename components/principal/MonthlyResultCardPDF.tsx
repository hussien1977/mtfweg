import React from 'react';
import type { Student, ClassData, SchoolSettings, TeacherSubjectGrade } from '../../types.ts';

interface MonthlyResultCardPDFProps {
    student: Student;
    classData: ClassData;
    settings: SchoolSettings;
    selectedMonthKey: string;
    selectedMonthLabel: string;
    schoolStamp: string | null;
    customGrades?: Record<string, number | null>; // NEW: Grades provided from exporter calculation
}

const LiftedText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ position: 'relative', bottom: '8px' }}>
        {children}
    </div>
);

export default function MonthlyResultCardPDF({ student, classData, settings, selectedMonthKey, selectedMonthLabel, schoolStamp, customGrades }: MonthlyResultCardPDFProps) {
    const subjects = classData.subjects || [];

    return (
        <div className="w-[794px] h-[1123px] p-12 bg-white flex flex-col font-['Cairo']" dir="rtl">
            <header className="flex-grow-0">
                <div className="flex justify-between items-start text-lg font-bold">
                    <div className="text-right w-1/3">
                        <p><LiftedText>إدارة</LiftedText></p>
                        <p><LiftedText>{settings.schoolName}</LiftedText></p>
                    </div>
                    <div className="text-center">
                        <h1 className="text-3xl font-bold">
                             <LiftedText><span className="text-red-600">نتائج الامتحان</span></LiftedText>
                        </h1>
                        <h2 className="text-2xl font-bold mt-2">
                             <LiftedText>
                                <span>{selectedMonthLabel}</span>
                            </LiftedText>
                        </h2>
                    </div>
                    <div className="text-right">
                        <p><LiftedText>الاسم: {student.name}</LiftedText></p>
                        <p><LiftedText>الصف: {classData.stage}</LiftedText></p>
                        <p><LiftedText>الشعبة: {classData.section}</LiftedText></p>
                    </div>
                </div>
            </header>

            <main className="flex-grow my-8">
                <table className="w-full border-collapse border-2 border-black">
                    <thead>
                        <tr className="bg-yellow-300 text-2xl font-bold">
                            <th className="border-2 border-black p-3 w-1/3"><LiftedText>الدرس</LiftedText></th>
                            <th className="border-2 border-black p-3 w-1/3"><LiftedText>الدرجة</LiftedText></th>
                            <th className="border-2 border-black p-3 w-1/3"><LiftedText>الملاحظات</LiftedText></th>
                        </tr>
                    </thead>
                    <tbody>
                        {subjects.map((subject, index) => {
                            let gradeText: string | number = '';
                            
                            if (customGrades && customGrades[subject.name] !== undefined) {
                                const val = customGrades[subject.name];
                                gradeText = (val !== null && val !== undefined) ? val : '';
                            } else {
                                const grade = student.teacherGrades?.[subject.name]?.[selectedMonthKey as keyof TeacherSubjectGrade];
                                gradeText = (grade !== null && grade !== undefined) ? grade : '';
                            }

                            const rowColor = index % 2 === 0 ? 'bg-green-100' : 'bg-orange-100';

                            return (
                                <tr key={subject.id} className={`text-xl font-semibold ${rowColor}`}>
                                    <td className="border-2 border-black p-3 text-right"><LiftedText>{subject.name}</LiftedText></td>
                                    <td className={`border-2 border-black p-3 text-center ${Number(gradeText) < 50 ? 'text-red-600' : ''}`}>
                                        <LiftedText>{gradeText}</LiftedText>
                                    </td>
                                    <td className="border-2 border-black p-3"></td>
                                </tr>
                            );
                        })}
                        {Array.from({ length: Math.max(0, 10 - subjects.length) }).map((_, index) => (
                            <tr key={`empty-${index}`} className={`h-14 ${(subjects.length + index) % 2 === 0 ? 'bg-green-100' : 'bg-orange-100'}`}>
                                <td className="border-2 border-black"></td>
                                <td className="border-2 border-black"></td>
                                <td className="border-2 border-black"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>

            <footer className="flex-grow-0 flex justify-between items-end text-lg font-bold">
                <div className="w-1/3"></div>
                <div className="w-1/3 flex justify-center items-center">
                    {schoolStamp && (
                        <div className="w-40 h-32 flex items-center justify-center">
                             <img src={schoolStamp} alt="School Stamp" className="max-w-full max-h-full object-contain" />
                        </div>
                    )}
                </div>
                <div className="w-1/3 text-center">
                    <p><LiftedText>{settings.principalName}</LiftedText></p>
                    <p><LiftedText>مدير المدرسة</LiftedText></p>
                </div>
            </footer>
        </div>
    );
}
