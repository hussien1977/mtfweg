import React from 'react';
import type { Student } from '../../types.ts';

interface StudentCodesPDFProps {
    students: Student[];
    schoolName: string;
    className: string;
}

const CodeColumn: React.FC<{ students: Student[], startIndex: number }> = ({ students, startIndex }) => {
    const rows = Array.from({ length: 20 }); // Always render 20 rows

    return (
        <table className="w-full border-collapse border border-black text-sm">
            <thead className="bg-gray-200">
                <tr>
                    <th className="border border-black p-1 font-bold w-12">ت</th>
                    <th className="border border-black p-1 font-bold text-right">اسم الطالب</th>
                    <th className="border border-black p-1 font-bold text-center">الرمز السري</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((_, index) => {
                    const student = students[index];
                    return (
                        <tr key={student?.id || `empty-${index}`} className="h-11 odd:bg-white even:bg-gray-50">
                            <td className="border border-black p-1 text-center">{student ? startIndex + index + 1 : ''}</td>
                            <td className="border border-black p-1">{student?.name || ''}</td>
                            <td className="border border-black p-1 text-center font-mono text-cyan-700 font-bold">{student?.studentAccessCode || ''}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};


export default function StudentCodesPDF({ students, schoolName, className }: StudentCodesPDFProps) {
    const STUDENTS_PER_PAGE = 40;
    const studentPages: Student[][] = [];
    for (let i = 0; i < students.length; i += STUDENTS_PER_PAGE) {
        studentPages.push(students.slice(i, i + STUDENTS_PER_PAGE));
    }
    
    // If there are no students, render a single blank page
    if (studentPages.length === 0) {
        studentPages.push([]);
    }

    return (
        <div>
            {studentPages.map((pageStudents, pageIndex) => {
                const leftColumnStudents = pageStudents.slice(0, 20);
                const rightColumnStudents = pageStudents.slice(20, 40);
                
                return (
                    <div key={pageIndex} className="w-[794px] h-[1123px] p-8 bg-white font-['Cairo'] pdf-page" dir="rtl">
                        <header className="text-center mb-6">
                            <h1 className="text-2xl font-bold">{schoolName}</h1>
                            <h2 className="text-lg font-semibold mt-1">رموز الدخول لمنصة الطالب</h2>
                            <h3 className="text-md text-gray-700">{className}</h3>
                        </header>
        
                        <main className="flex gap-6">
                            <div className="flex-1">
                                <CodeColumn students={leftColumnStudents} startIndex={pageIndex * STUDENTS_PER_PAGE} />
                            </div>
                            <div className="flex-1">
                                <CodeColumn students={rightColumnStudents} startIndex={pageIndex * STUDENTS_PER_PAGE + 20} />
                            </div>
                        </main>
                        
                        {studentPages.length > 1 && (
                            <footer className="mt-auto text-center text-xs text-gray-500">
                                صفحة {pageIndex + 1} من {studentPages.length}
                            </footer>
                        )}
                    </div>
                );
            })}
        </div>
    );
}