
import React, { useMemo } from 'react';
import type { SchoolSettings, ExamAbsenceRecord, SeatingAssignment, ClassData } from '../../types.ts';

interface AbsenceSummaryPageProps {
    settings: SchoolSettings;
    stages: string[];
    stageSubjects: Record<string, string>;
    date: string;
    absences: ExamAbsenceRecord[];
    allClasses: ClassData[];
    seating: Record<string, SeatingAssignment>;
}

const HALLS_PER_PAGE = 12;

export default function AbsenceSummaryPage({ settings, stages, stageSubjects, date, absences, allClasses, seating }: AbsenceSummaryPageProps) {
    
    const stageSlots = useMemo(() => {
        return stages.slice(0, 3);
    }, [stages]);

    const stats = useMemo(() => {
        const hallSectors: Record<string, { 
            hall: string, 
            sector: string, 
            totals: number[], 
            examinees: number[] 
        }> = {};
        
        allClasses.forEach(cls => {
            if (!stages.includes(cls.stage)) return;
            
            const slotIdx = stageSlots.indexOf(cls.stage);
            if (slotIdx === -1) return;

            (cls.students || []).forEach(student => {
                const assign = seating[student.id];
                if (!assign || !assign.hallNumber || !assign.sectorNumber) return;
                
                const key = `${assign.hallNumber}-${assign.sectorNumber}`;
                if (!hallSectors[key]) {
                    hallSectors[key] = { 
                        hall: assign.hallNumber, 
                        sector: assign.sectorNumber, 
                        totals: [0, 0, 0], 
                        examinees: [0, 0, 0] 
                    };
                }
                
                hallSectors[key].totals[slotIdx]++;
                
                const isAbsent = absences.some(a => a.studentId === student.id);
                if (!isAbsent) {
                    hallSectors[key].examinees[slotIdx]++;
                }
            });
        });

        return Object.values(hallSectors).sort((a, b) => {
            const hallA = parseInt(a.hall) || 0;
            const hallB = parseInt(b.hall) || 0;
            if (hallA !== hallB) return hallA - hallB;
            return a.sector.localeCompare(b.sector, undefined, { numeric: true });
        });
    }, [seating, absences, allClasses, stages, stageSlots]);

    const finalTotals = useMemo(() => {
        return stats.reduce((acc, curr) => ({
            totals: acc.totals.map((v, i) => v + curr.totals[i]),
            examinees: acc.examinees.map((v, i) => v + curr.examinees[i]),
        }), { totals: [0, 0, 0], examinees: [0, 0, 0] });
    }, [stats]);

    const pages = useMemo(() => {
        const chunks = [];
        for (let i = 0; i < stats.length; i += HALLS_PER_PAGE) {
            chunks.push(stats.slice(i, i + HALLS_PER_PAGE));
        }
        return chunks.length > 0 ? chunks : [[]];
    }, [stats]);

    return (
        <div className="flex flex-col gap-10">
            {pages.map((pageStats, pageIdx) => (
                <div key={pageIdx} className="summary-page w-[794px] h-[1123px] bg-white p-10 flex flex-col font-['Cairo'] relative border-[12px] border-double border-gray-800" dir="rtl">
                    <header className="text-center mb-4 flex-shrink-0 flex flex-col items-center">
                        <img 
                            src="https://i.imgur.com/8wmYU0x.png" 
                            alt="خلاصة الغيابات" 
                            className="h-20 object-contain mb-2" 
                        />
                        <div className="flex justify-center gap-6 mb-2">
                            {stageSlots.map(stage => (
                                <div key={stage} className="text-center px-4">
                                    <p className="text-blue-800 font-bold text-sm">{stage}</p>
                                    <p className="text-red-600 font-bold text-sm">{stageSubjects[stage] || '...'}</p>
                                </div>
                            ))}
                        </div>
                        <div className="border-2 border-black inline-block px-10 py-1 bg-yellow-400 font-black text-xl overflow-hidden">
                            <span className="relative -top-[7px] block">
                                التاريخ: {date}
                            </span>
                        </div>
                    </header>

                    <main className="flex-grow">
                        <div className="grid grid-cols-[1fr_2fr_2fr_1fr] gap-0 border-x-4 border-t-4 border-black">
                            <div className="col-span-1 border-l-4 border-black h-16"></div>
                            
                            <div className="border-l-4 border-black flex flex-col">
                                <div className="bg-yellow-400 p-2 text-center border-b-4 border-black font-black text-2xl h-16 flex flex-col items-center justify-center leading-tight">
                                    <span>عدد الطلاب الكلي</span>
                                </div>
                            </div>

                            <div className="border-l-4 border-black flex flex-col">
                                <div className="bg-yellow-400 p-2 text-center border-b-4 border-black font-black text-2xl h-16 flex flex-col items-center justify-center leading-tight">
                                    <span>عدد الممتحنين</span>
                                </div>
                            </div>

                            <div className="col-span-1 h-16"></div>
                        </div>

                        <div className="grid grid-cols-[10%_10%_10%_10%_10%_10%_10%_10%_20%] border-x-4 border-t-4 border-black bg-cyan-500 text-white font-black text-[9pt] h-10 items-center text-center">
                            <div className="border-l-2 border-black h-full flex items-center justify-center px-1">رقم القاعة</div>
                            <div className="border-l-2 border-black h-full flex items-center justify-center px-1">رقم القطاع</div>
                            
                            <div className="border-l-2 border-black h-full flex items-center justify-center px-1 whitespace-normal leading-tight text-[8pt]">{stageSlots[0] || '-'}</div>
                            <div className="border-l-2 border-black h-full flex items-center justify-center px-1 whitespace-normal leading-tight text-[8pt]">{stageSlots[1] || '-'}</div>
                            <div className="border-l-4 border-black h-full flex items-center justify-center px-1 whitespace-normal leading-tight text-[8pt]">{stageSlots[2] || '-'}</div>
                            
                            <div className="border-l-2 border-black h-full flex items-center justify-center px-1 whitespace-normal leading-tight text-[8pt]">{stageSlots[0] || '-'}</div>
                            <div className="border-l-2 border-black h-full flex items-center justify-center px-1 whitespace-normal leading-tight text-[8pt]">{stageSlots[1] || '-'}</div>
                            <div className="border-l-4 border-black h-full flex items-center justify-center px-1 whitespace-normal leading-tight text-[8pt]">{stageSlots[2] || '-'}</div>
                            
                            <div className="h-full flex items-center justify-center px-1">توقيع المراقب</div>
                        </div>

                        <div className="border-4 border-black border-t-0">
                            {pageStats.map((row, idx) => (
                                <div key={idx} className={`grid grid-cols-[10%_10%_10%_10%_10%_10%_10%_10%_20%] border-b-2 border-black h-[50px] text-xl font-black text-center items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                    <div className="border-l-2 border-black h-full flex items-center justify-center bg-gray-100">{row.hall}</div>
                                    <div className="border-l-2 border-black h-full flex items-center justify-center">{row.sector}</div>
                                    
                                    <div className="border-l-2 border-black h-full flex items-center justify-center text-blue-800">{row.totals[0] || ''}</div>
                                    <div className="border-l-2 border-black h-full flex items-center justify-center text-blue-800">{row.totals[1] || ''}</div>
                                    <div className="border-l-4 border-black h-full flex items-center justify-center text-blue-800">{row.totals[2] || ''}</div>
                                    
                                    <div className="border-l-2 border-black h-full flex items-center justify-center text-green-700 bg-green-50/20">{row.examinees[0] || ''}</div>
                                    <div className="border-l-2 border-black h-full flex items-center justify-center text-green-700 bg-green-50/20">{row.examinees[1] || ''}</div>
                                    <div className="border-l-4 border-black h-full flex items-center justify-center text-green-700 bg-green-50/20">{row.examinees[2] || ''}</div>
                                    
                                    <div className="h-full"></div>
                                </div>
                            ))}
                            
                            {Array.from({ length: Math.max(0, HALLS_PER_PAGE - pageStats.length) }).map((_, i) => (
                                <div key={`empty-${i}`} className={`grid grid-cols-[10%_10%_10%_10%_10%_10%_10%_10%_20%] border-b-2 last:border-b-0 border-black h-[50px] ${ (pageStats.length + i) % 2 === 0 ? 'bg-white' : 'bg-gray-50' }`}>
                                    <div className="border-l-2 border-black h-full bg-gray-100"></div>
                                    <div className="border-l-2 border-black h-full"></div>
                                    <div className="border-l-2 border-black h-full"></div>
                                    <div className="border-l-2 border-black h-full"></div>
                                    <div className="border-l-4 border-black h-full"></div>
                                    <div className="border-l-2 border-black h-full"></div>
                                    <div className="border-l-2 border-black h-full"></div>
                                    <div className="border-l-4 border-black h-full"></div>
                                    <div className="h-full"></div>
                                </div>
                            ))}
                        </div>

                        {pageIdx === pages.length - 1 && (
                            <div className="border-x-4 border-b-4 border-black grid grid-cols-[20%_10%_10%_10%_10%_10%_10%_20%] h-14 items-center text-center">
                                <div className="border-l-2 border-black h-full flex items-center justify-center bg-orange-500 text-white font-black text-2xl">المجموع العام</div>
                                <div className="border-l-2 border-black h-full flex items-center justify-center bg-orange-500 text-white font-black text-2xl">{finalTotals.totals[0]}</div>
                                <div className="border-l-2 border-black h-full flex items-center justify-center bg-orange-500 text-white font-black text-2xl">{finalTotals.totals[1]}</div>
                                <div className="border-l-4 border-black h-full flex items-center justify-center bg-orange-500 text-white font-black text-2xl">{finalTotals.totals[2]}</div>
                                <div className="border-l-2 border-black h-full flex items-center justify-center bg-orange-600 text-white font-black text-2xl">{finalTotals.examinees[0]}</div>
                                <div className="border-l-2 border-black h-full flex items-center justify-center bg-orange-600 text-white font-black text-2xl">{finalTotals.examinees[1]}</div>
                                <div className="border-l-4 border-black h-full flex items-center justify-center bg-orange-600 text-white font-black text-2xl">{finalTotals.examinees[2]}</div>
                                <div className="h-full flex items-center justify-center bg-green-600 text-white font-black text-2xl">
                                    {finalTotals.examinees.reduce((a, b) => a + b, 0)}
                                </div>
                            </div>
                        )}
                    </main>

                    {/* Footer */}
                    <footer className="mt-auto flex justify-between items-end font-bold px-8 pb-16 flex-shrink-0">
                        <div className="text-center">
                             <p className="text-xl text-gray-800">عضو اللجنة الامتحانية</p>
                             <div className="w-48 h-0.5 bg-black mt-16 opacity-30"></div>
                        </div>
                        <div className="text-center">
                            <p className="text-sm opacity-70 mb-2">مدير المدرسة المصادق</p>
                            <p className="font-black text-3xl pb-1">{settings.principalName}</p>
                        </div>
                    </footer>
                    
                    <div className="absolute bottom-4 right-10 text-xs text-gray-400">
                        صفحة {pageIdx + 1} من {pages.length}
                    </div>
                </div>
            ))}
        </div>
    );
}
