import React from 'react';
import type { SchoolSettings, ClassData, Student, Subject } from '../../types.ts';

interface MonthlyStatsReportPDFProps {
    settings: SchoolSettings;
    classData: ClassData;
    students: Student[];
    subjects: Subject[];
    detailedStats: Record<string, {
        month1: { successful: number; examined: number; successRate: number };
        month2: { successful: number; examined: number; successRate: number };
    }> | null;
    pageInfo: { pageNumber: number, totalPages: number };
}

const STUDENTS_PER_PAGE = 21;

export default function MonthlyStatsReportPDF({ settings, classData, students, subjects, detailedStats, pageInfo }: MonthlyStatsReportPDFProps) {

    return (
        <div className="w-[1123px] h-[794px] p-6 bg-white font-['Cairo'] flex flex-col" dir="rtl">
            <header className="flex justify-between items-center mb-4 text-lg font-bold">
                <p>مدرسة: {settings.schoolName}</p>
                <h1 className="text-2xl font-extrabold">كشف درجات امتحان الشهر الاول والثاني</h1>
                <p>الشعبة: {classData.stage} / {classData.section}</p>
            </header>

            <main className="flex-grow">
                <table className="w-full border-collapse border-2 border-black text-sm">
                    <thead className="bg-yellow-200 font-bold">
                        <tr>
                            <th rowSpan={2} className="border-2 border-black p-1 w-[3%]">ت</th>
                            <th rowSpan={2} className="border-2 border-black p-1 w-[20%]">اسم الطالب الثلاثي</th>
                            {subjects.map(subject => (
                                <th key={subject.id} colSpan={2} className="border-2 border-black p-1">{subject.name}</th>
                            ))}
                        </tr>
                        <tr>
                            {subjects.map(subject => (
                                <React.Fragment key={subject.id}>
                                    <th className="border-2 border-black p-1 font-normal">شهر ۱</th>
                                    <th className="border-2 border-black p-1 font-normal">شهر ۲</th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student, index) => {
                            const rowStyle = { backgroundColor: index % 2 === 0 ? '#f0f9ff' : '#ffffff' }; // sky-100 and white
                            return (
                                <tr key={student.id} className="h-9" style={rowStyle}>
                                    <td className="border-2 border-black text-center">{(pageInfo.pageNumber - 1) * STUDENTS_PER_PAGE + index + 1}</td>
                                    <td className="border-2 border-black p-1 text-right font-semibold">{student.name}</td>
                                    {subjects.map(subject => {
                                        const grades = student.teacherGrades?.[subject.name];
                                        const m1 = grades?.firstSemMonth1;
                                        const m2 = grades?.firstSemMonth2;
                                        return (
                                            <React.Fragment key={subject.id}>
                                                <td className={`border-2 border-black text-center font-bold ${m1 !== null && m1 !== undefined && m1 < 50 ? 'text-red-600' : ''}`}>{m1 ?? ''}</td>
                                                <td className={`border-2 border-black text-center font-bold ${m2 !== null && m2 !== undefined && m2 < 50 ? 'text-red-600' : ''}`}>{m2 ?? ''}</td>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                    {detailedStats && (
                        <tfoot className="font-bold">
                            <tr className="h-9 bg-cyan-100">
                                <td colSpan={2} className="border-2 border-black p-1 text-right">عدد الناجحون</td>
                                {subjects.map(subject => {
                                    const subjectStats = detailedStats[subject.id];
                                    return (
                                        <React.Fragment key={subject.id}>
                                            <td className="border-2 border-black p-1 text-center text-base">{subjectStats?.month1.successful ?? ''}</td>
                                            <td className="border-2 border-black p-1 text-center text-base">{subjectStats?.month2.successful ?? ''}</td>
                                        </React.Fragment>
                                    );
                                })}
                            </tr>
                            <tr className="h-9 bg-cyan-200">
                                <td colSpan={2} className="border-2 border-black p-1 text-right">نسبة النجاح</td>
                                {subjects.map(subject => {
                                    const subjectStats = detailedStats[subject.id];
                                    return (
                                        <React.Fragment key={subject.id}>
                                            <td className="border-2 border-black p-1 text-center text-base">{subjectStats ? `${subjectStats.month1.successRate}%` : ''}</td>
                                            <td className="border-2 border-black p-1 text-center text-base">{subjectStats ? `${subjectStats.month2.successRate}%` : ''}</td>
                                        </React.Fragment>
                                    );
                                })}
                            </tr>
                        </tfoot>
                    )}
                </table>
            </main>
            
            {detailedStats && (
                <footer className="mt-auto pt-4 flex justify-between items-end font-bold text-lg">
                    <p>اسم المدرس: ..............................</p>
                    <p>مدير المدرسة: {settings.principalName}</p>
                </footer>
            )}
        </div>
    );
}