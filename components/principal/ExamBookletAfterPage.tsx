import React, { useMemo, useEffect, useRef } from 'react';
import type { HallData } from './ExamBookletsReceipt.tsx';
import type { SchoolSettings } from '../../types.ts';

interface ExamBookletAfterPageProps {
    halls: HallData[];
    day: string;
    examDate: string;
    subject: string;
    settings: SchoolSettings;
}

export default function ExamBookletAfterPage({ halls, day, examDate, subject, settings }: ExamBookletAfterPageProps) {
    const tableRef = useRef<HTMLTableElement>(null);
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
            
            <main className="flex-grow flex flex-col">
                <h2 className="text-xl font-bold text-center bg-pink-300 py-2 mb-2 border-2 border-black">الاستلام بعد الامتحان</h2>
                <table ref={tableRef} className="w-full border-collapse border-2 border-black">
                     <thead className="bg-gray-200">
                        <tr>
                            <th rowSpan={2} className="border-2 border-black p-2">رقم القاعة</th>
                            <th rowSpan={2} className="border-2 border-black p-2">رقم القطاع</th>
                            <th colSpan={3} className="border-2 border-black p-2">الاول</th>
                            <th colSpan={3} className="border-2 border-black p-2">الثاني</th>
                            <th colSpan={3} className="border-2 border-black p-2">الثالث</th>
                            <th rowSpan={2} className="border-2 border-black p-2">المجموع الكلي</th>
                            <th rowSpan={2} className="border-2 border-black p-2">التوقيع</th>
                        </tr>
                        <tr>
                            <th className="border-2 border-black p-1 text-xs">الممتحنين</th>
                            <th className="border-2 border-black p-1 text-xs">الغائبين بدون عذر</th>
                            <th className="border-2 border-black p-1 text-xs">الغائبين بعذر</th>
                            <th className="border-2 border-black p-1 text-xs">الممتحنين</th>
                            <th className="border-2 border-black p-1 text-xs">الغائبين بدون عذر</th>
                            <th className="border-2 border-black p-1 text-xs">الغائبين بعذر</th>
                            <th className="border-2 border-black p-1 text-xs">الممتحنين</th>
                            <th className="border-2 border-black p-1 text-xs">الغائبين بدون عذر</th>
                            <th className="border-2 border-black p-1 text-xs">الغائبين بعذر</th>
                        </tr>
                    </thead>
                    <tbody>
                         {allSectors.map((sector, index) => {
                            const isFirstSectorOfHall = index === 0 || sector.hallNumber !== allSectors[index - 1].hallNumber;
                            return (
                                <tr key={sector.id} className="text-center h-12">
                                    {isFirstSectorOfHall && <td rowSpan={sector.hallSectorCount} className="border-2 border-black font-bold align-middle">{['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة', 'احدى عشر'][sector.hallNumber - 1] || sector.hallNumber}</td>}
                                    <td className="border-2 border-black p-1">{sector.sectorNumber}</td>
                                    {/* Empty cells for data entry */}
                                    <td className="border-2 border-black p-1"></td>
                                    <td className="border-2 border-black p-1"></td>
                                    <td className="border-2 border-black p-1"></td>
                                    <td className="border-2 border-black p-1"></td>
                                    <td className="border-2 border-black p-1"></td>
                                    <td className="border-2 border-black p-1"></td>
                                    <td className="border-2 border-black p-1"></td>
                                    <td className="border-2 border-black p-1"></td>
                                    <td className="border-2 border-black p-1"></td>
                                    <td className="border-2 border-black p-1"></td>
                                    <td className="border-2 border-black p-1"></td>
                                </tr>
                            );
                        })}
                    </tbody>
                    {/* Add an empty tfoot with the same number of columns to ensure consistent height, but keep it invisible */}
                    <tfoot style={{visibility: 'hidden'}}>
                         <tr className="font-bold text-center h-12">
                            <td colSpan={12} className="p-2"></td>
                        </tr>
                    </tfoot>
                </table>
            </main>
        </div>
    );
}