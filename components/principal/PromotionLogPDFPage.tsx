import React from 'react';
import type { SchoolSettings } from '../../types.ts';
import type { PromotionData } from './PromotionLog.tsx';

interface PromotionLogPDFPageProps {
    settings: SchoolSettings;
    data: PromotionData[];
    stage: string;
}

const LiftedCellContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ position: 'relative', bottom: '6px' }}>{children}</div>
);


export default function PromotionLogPDFPage({ settings, data, stage }: PromotionLogPDFPageProps) {
    const currentYear = settings.academicYear.split('-')[0];
    const prevYear = parseInt(currentYear, 10) - 1;
    const nextYear = parseInt(currentYear, 10) + 1;

    const academicYearCurrent = `${currentYear}/${parseInt(currentYear, 10) + 1}`;
    const academicYearPrevious = `${prevYear}/${currentYear}`;
    const academicYearNext = `${nextYear}/${nextYear + 1}`;

    const schoolGenderText = settings.schoolGender === 'بنات' ? 'للبنات' : 'للبنين';

    return (
        <div className="w-[794px] h-[1123px] p-8 bg-white flex flex-col font-['Cairo']" dir="rtl">
            <header className="flex justify-between items-center mb-4">
                <div className="text-center font-bold">
                    <p>إدارة : {settings.directorate || 'متوسطة الحمزة'}</p>
                    <p>{schoolGenderText}</p>
                </div>
                <div className="text-center">
                    <h1 className="text-2xl font-bold border-2 border-black p-2" style={{ backgroundColor: '#a5f3fc' }}>
                        سجل ترحيل طلبة الصف {stage}
                    </h1>
                    <h2 className="text-xl font-bold mt-2">للعام الدراسي {academicYearCurrent}</h2>
                </div>
                <div className="w-40"></div>
            </header>

            <main className="flex-grow">
                <table className="w-full border-collapse border-2 border-black text-sm">
                    <thead className="bg-yellow-400 font-bold text-center">
                        <tr>
                            <th rowSpan={2} className="border-2 border-black p-1 w-[4%]">ت</th>
                            <th rowSpan={2} className="border-2 border-black p-1 w-[28%]">اسم الطالب</th>
                            <th colSpan={3} className="border-2 border-black p-1"></th>
                            <th colSpan={3} className="border-2 border-black p-1">مصير الطالب</th>
                        </tr>
                        <tr>
                            <th className="border-2 border-black p-1 w-[8%]">الشعبة</th>
                            <th className="border-2 border-black p-1 w-[10%]">المواليد</th>
                            <th className="border-2 border-black p-1 w-[10%]">رقم القيد</th>
                            <th className="border-2 border-black p-1 w-[13%]">في العام السابق<br />{academicYearPrevious}</th>
                            <th className="border-2 border-black p-1 w-[13%]">نهاية العام الحالي<br />{academicYearCurrent}</th>
                            <th className="border-2 border-black p-1 w-[13%]">في العام القادم<br />{academicYearNext}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => {
                            const isOverAge = row.nextYearFate === 'تجاوز المواليد المسموحة';
                            const rowStyle: React.CSSProperties = {
                                backgroundColor: isOverAge ? '#fee2e2' : (row.seq % 2 !== 0 ? '#f3f4f6' : 'white'),
                            };
                            return (
                                <tr key={row.studentId} style={rowStyle}>
                                    <td className="border border-black text-center p-1"><LiftedCellContent>{row.seq}</LiftedCellContent></td>
                                    <td className="border border-black p-1 font-semibold"><LiftedCellContent>{row.name}</LiftedCellContent></td>
                                    <td className="border border-black text-center p-1"><LiftedCellContent>{row.section}</LiftedCellContent></td>
                                    <td className="border border-black text-center p-1"><LiftedCellContent>{row.birthDate}</LiftedCellContent></td>
                                    <td className="border border-black text-center p-1"><LiftedCellContent>{row.registrationId}</LiftedCellContent></td>
                                    <td className="border border-black text-center p-1 font-semibold"><LiftedCellContent>{row.previousYearFate}</LiftedCellContent></td>
                                    <td className="border border-black text-center p-1 font-semibold"><LiftedCellContent>{row.currentYearFate}</LiftedCellContent></td>
                                    <td className={`border border-black text-center p-1 font-bold ${isOverAge ? 'text-red-600' : ''}`}>
                                        <LiftedCellContent>{row.nextYearFate}</LiftedCellContent>
                                    </td>
                                </tr>
                            );
                        })}
                        {/* Fill empty rows */}
                        {Array.from({ length: 30 - data.length }).map((_, index) => (
                            <tr key={`empty-${index}`} className={(data.length + index + 1) % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                                <td className="border border-black p-1 text-center h-8"><LiftedCellContent>{data.length + index + 1}</LiftedCellContent></td>
                                <td className="border border-black"></td>
                                <td className="border border-black"></td>
                                <td className="border border-black"></td>
                                <td className="border border-black"></td>
                                <td className="border border-black"></td>
                                <td className="border border-black"></td>
                                <td className="border border-black"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>

            <footer className="mt-auto pt-4 flex justify-between font-bold text-lg">
                <span>اسم وتوقيع معاون المدير</span>
                <span>اسم وتوقيع مدير المدرسة<br />{settings.principalName}</span>
            </footer>
        </div>
    );
}