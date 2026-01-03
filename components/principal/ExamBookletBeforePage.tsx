import React, { useMemo } from 'react';
import type { HallData, SectorData } from './ExamBookletsReceipt.tsx';
import type { SchoolSettings } from '../../types.ts';

interface ExamBookletBeforePageProps {
    halls: HallData[];
    day: string;
    examDate: string;
    subject: string;
    onSubjectChange?: (value: string) => void;
    settings: SchoolSettings;
}

export default function ExamBookletBeforePage({ halls, day, examDate, subject, onSubjectChange, settings }: ExamBookletBeforePageProps) {
    const totals = useMemo(() => {
        let first = 0, second = 0, third = 0;
        halls.flatMap(h => h.sectors).forEach(sector => {
            first += parseInt(sector.studentCounts.first || '0', 10);
            second += parseInt(sector.studentCounts.second || '0', 10);
            third += parseInt(sector.studentCounts.third || '0', 10);
        });
        return { first, second, third };
    }, [halls]);

    const allSectors = useMemo(() => halls.flatMap(hall => 
        hall.sectors.map(sector => ({ ...sector, hallNumber: hall.hallNumber, hallSectorCount: hall.sectors.length }))
    ), [halls]);

    return (
        <div className="w-[794px] h-[1123px] bg-white p-8 flex flex-col font-['Cairo']" dir="rtl">
            <header className="text-center mb-6">
                <h1 className="text-2xl font-bold">استلام وتسليم الدفاتر الامتحانية من المراقبين</h1>
            </header>
            <div className="grid grid-cols-2 gap-x-8 text-lg font-semibold mb-6">
                <div>
                    <p>عدد طلاب الاول: <span className="font-bold text-blue-600">{totals.first || '.....'}</span></p>
                    <p>عدد طلاب الثاني: <span className="font-bold text-blue-600">{totals.second || '.....'}</span></p>
                    <p>عدد طلاب الثالث: <span className="font-bold text-blue-600">{totals.third || '.....'}</span></p>
                </div>
                <div className="text-left">
                    {onSubjectChange ? (
                        <p>اسم المادة: <input type="text" value={subject} onChange={e => onSubjectChange(e.target.value)} className="border-b-2 border-dotted w-40 text-center font-bold" /></p>
                    ) : (
                         <p>اسم المادة: <span className="font-bold">{subject || '...........'}</span></p>
                    )}
                    <p>التاريخ: <span className="font-bold">{examDate || '.... / .... / ....'}</span></p>
                    <p>اليوم: <span className="font-bold">{day || '...........'}</span></p>
                </div>
            </div>

            <main className="flex-grow flex flex-col">
                <h2 className="text-xl font-bold text-center bg-yellow-300 py-2 mb-2 border-2 border-black">التسليم قبل الامتحان</h2>
                <table className="w-full border-collapse border-2 border-black">
                    <thead className="bg-gray-200">
                        <tr>
                            <th rowSpan={2} className="border-2 border-black p-2">رقم القاعة</th>
                            <th rowSpan={2} className="border-2 border-black p-2">اسم المدرس</th>
                            <th rowSpan={2} className="border-2 border-black p-2">رقم القطاع</th>
                            <th colSpan={3} className="border-2 border-black p-2">عدد الدفاتر المستلمة</th>
                            <th rowSpan={2} className="border-2 border-black p-2">التوقيع</th>
                        </tr>
                        <tr>
                            <th className="border-2 border-black p-2">اول</th>
                            <th className="border-2 border-black p-2">ثاني</th>
                            <th className="border-2 border-black p-2">ثالث</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allSectors.map((sector, index) => {
                            const isFirstSectorOfHall = index === 0 || sector.hallNumber !== allSectors[index - 1].hallNumber;
                            return (
                                <tr key={sector.id} className="text-center h-12">
                                    {isFirstSectorOfHall && <td rowSpan={sector.hallSectorCount} className="border-2 border-black font-bold align-middle">{['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة', 'احدى عشر'][sector.hallNumber - 1] || sector.hallNumber}</td>}
                                    <td className="border-2 border-black p-1">{sector.invigilatorName}</td>
                                    <td className="border-2 border-black p-1">{sector.sectorNumber}</td>
                                    <td className="border-2 border-black p-1 font-bold">{sector.studentCounts.first || ''}</td>
                                    <td className="border-2 border-black p-1 font-bold">{sector.studentCounts.second || ''}</td>
                                    <td className="border-2 border-black p-1 font-bold">{sector.studentCounts.third || ''}</td>
                                    <td className="border-2 border-black p-1"></td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-200 font-bold text-center h-12">
                            <td colSpan={3} className="border-2 border-black p-2">المجموع</td>
                            <td className="border-2 border-black p-2">{totals.first || ''}</td>
                            <td className="border-2 border-black p-2">{totals.second || ''}</td>
                            <td className="border-2 border-black p-2">{totals.third || ''}</td>
                            <td className="border-2 border-black p-2"></td>
                        </tr>
                    </tfoot>
                </table>
            </main>
        </div>
    );
}