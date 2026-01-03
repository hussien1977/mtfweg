import React from 'react';
import type { SchoolSettings } from '../../types.ts';

type ChartCell = { name: string; examId: string } | null;
type ChartData = ChartCell[][];

interface SeatingChartPDFProps {
    settings: SchoolSettings;
    chartData: ChartData;
    hallNumber: string;
    stage: string;
    sections: string;
    studentsPerRow: number;
    columnsPerHall: number;
}

export default function SeatingChartPDF({ settings, chartData, hallNumber, stage, sections, studentsPerRow, columnsPerHall }: SeatingChartPDFProps) {
    return (
        <div className="w-[794px] min-h-[1123px] bg-white p-8 font-['Cairo'] flex flex-col" dir="rtl">
            <header className="text-center mb-6">
                <h1 className="text-2xl font-bold">جمهورية العراق - وزارة التربية</h1>
                <h2 className="text-xl font-semibold">المديرية العامة للتربية في {settings.directorate}</h2>
                <h3 className="text-lg">{settings.schoolName}</h3>
                <h1 className="text-3xl font-extrabold mt-4 border-y-2 border-black py-2">
                    خارطة جلوس الطلبة
                </h1>
            </header>
            <div className="flex justify-between items-center text-lg font-bold mb-4">
                <span>القاعة رقم: ({hallNumber})</span>
                <span>الصف: {stage} / الشعب: ({sections})</span>
                <span>العام الدراسي: {settings.academicYear}</span>
            </div>

            <main className="flex-grow">
                {chartData.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex gap-4 mb-4">
                        {Array.from({ length: columnsPerHall }).map((_, colIndex) => (
                            <div key={colIndex} className="flex-1 border-2 border-black rounded-lg min-w-[120px]">
                                <h4 className="text-center font-bold border-b-2 border-black p-1 bg-gray-200">
                                    السره {colIndex + 1}
                                </h4>
                                <div className="p-1">
                                    {Array.from({ length: studentsPerRow }).map((_, seatIndex) => {
                                        const cell = row[colIndex * studentsPerRow + seatIndex];
                                        return (
                                            <div key={seatIndex} className="p-1 my-1 border rounded text-center text-xs h-12 flex flex-col justify-center bg-gray-50">
                                                <p className="font-semibold leading-tight">{cell?.name || <>&nbsp;</>}</p>
                                                <p className="text-gray-600 font-mono">{cell?.examId || <>&nbsp;</>}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </main>

            <footer className="mt-auto pt-8 flex justify-end">
                <div className="text-center font-bold text-lg">
                    <p>مدير المدرسة</p>
                    <p className="mt-16">{settings.principalName}</p>
                </div>
            </footer>
        </div>
    );
}