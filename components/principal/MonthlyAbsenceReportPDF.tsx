import React from 'react';
import type { User, SchoolSettings, ClassData, Student, AbsenceStatus } from '../../types.ts';

interface MonthlyAbsenceReportPDFProps {
    settings: SchoolSettings;
    classData: ClassData;
    students: Student[];
    monthlyAbsences: Record<string, Record<string, AbsenceStatus>>;
    monthlyTotals: Record<string, number>;
    month: string;
}

// Local helper for lifting content in this specific PDF
const LiftedContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ position: 'relative', bottom: '6px' }}>{children}</div>
);

export default function MonthlyAbsenceReportPDF({ settings, classData, students, monthlyAbsences, monthlyTotals, month }: MonthlyAbsenceReportPDFProps) {
    const [year, monthNum] = month.split('-');
    
    return (
        <div className="w-[794px] h-[1123px] bg-white p-6 pb-10 flex flex-col font-['Cairo']" dir="rtl">
            <header className="text-center font-bold mb-4">
                <h1 className="text-2xl">قائمة الغيابات اليومية</h1>
                <div className="flex justify-around text-lg mt-2">
                    <span>الصف: {classData.stage}</span>
                    <span>الشعبة: {classData.section}</span>
                    <span>الشهر: {monthNum} / {year}</span>
                </div>
            </header>
            <main className="flex-grow">
                <table className="w-full border-collapse border-[0.5px] border-black text-xs">
                    <thead>
                        <tr className="bg-gray-200 font-bold">
                            <th className="border-[0.5px] border-black p-1 w-[3%]">
                                <div style={{ position: 'relative', bottom: '6px' }}>ت</div>
                            </th>
                            <th className="border-[0.5px] border-black p-1 w-[20%]">
                                <div style={{ position: 'relative', bottom: '6px' }}>اسم الطالب</div>
                            </th>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                <th key={day} className="border-[0.5px] border-black p-1 w-5 align-middle text-center text-[10px]">
                                    {day}
                                </th>
                            ))}
                            <th className="border-[0.5px] border-black p-1 w-10 align-middle" style={{ writingMode: 'vertical-rl' }}>
                                <div style={{ position: 'relative', bottom: '10px' }}>مج</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student, index) => (
                            <tr key={student.id} className="h-5">
                                <td className="border-[0.5px] border-black text-center">
                                    <div style={{ position: 'relative', bottom: '6px' }}>{index + 1}</div>
                                </td>
                                <td className="border-[0.5px] border-black text-right px-1 font-semibold align-middle">
                                    <div style={{ position: 'relative', bottom: '6px' }}>{student.name}</div>
                                </td>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                                    const dayStr = String(day).padStart(2, '0');
                                    const status = monthlyAbsences[dayStr]?.[student.id];
                                    let symbol = '';
                                    let colorClass = '';
                                    if (status === 'absent') {
                                        symbol = 'غ';
                                        colorClass = 'text-red-600';
                                    } else if (status === 'excused') {
                                        symbol = 'م';
                                        colorClass = 'text-yellow-600';
                                    } else if (status === 'runaway') {
                                        symbol = 'هـ';
                                        colorClass = 'text-blue-600';
                                    }
                                    return <td key={day} className={`border-[0.5px] border-black text-center font-bold ${colorClass}`}>
                                        <LiftedContent>{symbol}</LiftedContent>
                                    </td>;
                                })}
                                <td className="border-[0.5px] border-black text-center font-bold">
                                    <LiftedContent>{monthlyTotals[student.id] || 0}</LiftedContent>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>
        </div>
    );
}