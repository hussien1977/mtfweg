import React from 'react';
import type { SchoolSettings } from '../../types.ts';
import { GRADE_LEVELS } from '../../constants.ts';


type ScheduleData = Record<string, {
    day: string;
    date: string;
    subject1: string;
    subject2: string;
    subject3: string;
    subject4: string;
}>;


interface OralExamSchedulePDFPageProps {
    settings: SchoolSettings;
    examType: string;
    examRound: string;
    scheduleData: ScheduleData;
}

export default function OralExamSchedulePDFPage({ settings, examType, examRound, scheduleData }: OralExamSchedulePDFPageProps) {

    const sortedStages = Object.keys(scheduleData).sort((a, b) => GRADE_LEVELS.indexOf(a) - GRADE_LEVELS.indexOf(b));

    return (
        <div className="w-[794px] h-[1123px] bg-white p-10 flex flex-col font-['Cairo']" dir="rtl">
            <header className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-red-600" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.2)' }}>
                    جدول الامتحانات الشفوية
                </h1>
                <h2 className="text-2xl font-bold mt-2">
                    {examType} / الدور {examRound}
                </h2>
                <h3 className="text-xl font-semibold mt-4">
                    للعام الدراسي {settings.academicYear} - {settings.schoolName}
                </h3>
            </header>
            <main className="flex-grow">
                 <table className="w-full border-collapse border-4 border-cyan-700 text-lg">
                     <thead className="bg-cyan-600 text-white font-bold">
                         <tr>
                            <th className="p-3 border-2 border-cyan-800">الصف</th>
                            <th className="p-3 border-2 border-cyan-800">اليوم</th>
                            <th className="p-3 border-2 border-cyan-800">التاريخ</th>
                            <th className="p-3 border-2 border-cyan-800">المادة الاولى</th>
                            <th className="p-3 border-2 border-cyan-800">المادة الثانية</th>
                            <th className="p-3 border-2 border-cyan-800">المادة الثالثة</th>
                            <th className="p-3 border-2 border-cyan-800">المادة الرابعة</th>
                         </tr>
                     </thead>
                     <tbody>
                        {sortedStages.map((stage, index) => (
                            <tr key={stage} className={`h-16 ${index % 2 === 0 ? 'bg-cyan-50' : 'bg-white'}`}>
                                <td className="p-2 border-2 border-cyan-700 font-bold text-center">{stage}</td>
                                <td className="p-2 border-2 border-cyan-700 text-center">{scheduleData[stage]?.day || ''}</td>
                                <td className="p-2 border-2 border-cyan-700 text-center">{scheduleData[stage]?.date || ''}</td>
                                <td className="p-2 border-2 border-cyan-700 text-center font-semibold">{scheduleData[stage]?.subject1 || ''}</td>
                                <td className="p-2 border-2 border-cyan-700 text-center font-semibold">{scheduleData[stage]?.subject2 || ''}</td>
                                <td className="p-2 border-2 border-cyan-700 text-center font-semibold">{scheduleData[stage]?.subject3 || ''}</td>
                                <td className="p-2 border-2 border-cyan-700 text-center font-semibold">{scheduleData[stage]?.subject4 || ''}</td>
                            </tr>
                        ))}
                     </tbody>
                 </table>
                 <div className="mt-8 text-center text-red-600 font-bold text-lg border-2 border-red-400 p-3 rounded-lg bg-red-50">
                     <p>ملاحظة: تبدأ الامتحانات الساعة الثامنة صباحاً</p>
                 </div>
            </main>
             <footer className="mt-auto pt-16 flex justify-end text-xl font-bold">
                <div className="text-center">
                    <p>مدير المدرسة</p>
                    <p className="mt-20">{settings.principalName}</p>
                </div>
            </footer>
        </div>
    );
}
