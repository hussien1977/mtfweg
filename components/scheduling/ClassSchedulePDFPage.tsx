

import React from 'react';
// Fix: Added missing type import.
import type { ClassData, ScheduleData, SchoolSettings } from '../../types.ts';

interface ClassSchedulePDFPageProps {
    classInfo: ClassData;
    scheduleData: ScheduleData;
    settings: SchoolSettings;
    effectiveDate: string;
}

const DAYS_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const DAY_NAMES_AR: Record<string, string> = {
    Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس'
};
const PERIOD_NAMES = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة"];

const getClassNameKey = (stage: string, section: string): string => `${stage.replace(/ /g, '-')}-${section}`;

export default function ClassSchedulePDFPage({ classInfo, scheduleData, settings, effectiveDate }: ClassSchedulePDFPageProps) {
    const classNameKey = getClassNameKey(classInfo.stage, classInfo.section);

    return (
        <div className="w-[1123px] h-[794px] p-6 bg-white font-['Cairo'] flex flex-col border-2 border-black" dir="rtl">
            <header className="flex justify-between items-center text-center text-sm font-bold mb-4">
                <div className="w-1/3 text-right">
                    <p>جمهورية العراق</p>
                    <p>وزارة التربية</p>
                    <p>المديرية العامة للتربية في {settings.governorateName || '...'}</p>
                </div>
                <div className="w-1/3">
                    <h1 className="text-xl">جدول الدروس الاسبوعي</h1>
                    <h2 className="text-2xl font-bold text-cyan-700 my-1">{classInfo.stage} - {classInfo.section}</h2>
                    <h2 className="text-lg">{settings.schoolName}</h2>
                    <h3 className="text-md">للعام الدراسي {settings.academicYear}</h3>
                </div>
                <div className="w-1/3 text-left">
                    <p>يعمل به بتاريخ</p>
                    <p>{effectiveDate}</p>
                </div>
            </header>

            <main className="flex-grow mt-4">
                <table className="w-full h-full border-collapse border-2 border-black">
                    <thead>
                        <tr className="bg-gray-200 text-lg font-bold">
                            <th className="border-2 border-black p-2 w-24">الحصة</th>
                            {DAYS_ORDER.map(day => <th key={day} className="border-2 border-black p-2">{DAY_NAMES_AR[day]}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 7 }).map((_, periodIndex) => (
                            <tr key={periodIndex} className="h-20">
                                <td className="border-2 border-black text-center font-bold text-lg bg-gray-100">
                                    {PERIOD_NAMES[periodIndex]}
                                </td>
                                {DAYS_ORDER.map(day => {
                                    const assignment = scheduleData[day]?.find(p => p.period === periodIndex + 1)?.assignments?.[classNameKey];
                                    return (
                                        <td key={day} className="border-2 border-black text-center p-1">
                                            {assignment ? (
                                                <div>
                                                    <p className="font-bold text-lg">{assignment.subject}</p>
                                                    <p className="text-sm text-gray-700">{assignment.teacher}</p>
                                                </div>
                                            ) : null}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>

            <footer className="text-center mt-4 pt-2 border-t-2 border-dashed">
                <p className="text-lg font-bold">ادارة المدرسة</p>
            </footer>
        </div>
    );
}