import React from 'react';
import type { SchoolSettings } from '../../types.ts';

interface SuccessRow {
    subject: string;
    section: string;
    teacher: string;
    total: number;
    passed: number;
    failed: number;
    rate: number;
}

interface SuccessStatsPDFPageProps {
    settings: SchoolSettings;
    monthLabel: string;
    data: SuccessRow[];
    pageNumber: number;
    totalPages: number;
    stageName: string;
    ministryLogo: string | null;
    schoolLogo: string | null;
}

export default function SuccessStatsPDFPage({ settings, monthLabel, data, pageNumber, totalPages, stageName, ministryLogo, schoolLogo }: SuccessStatsPDFPageProps) {
    const tableHeaderClass = "border border-black p-2 font-bold text-center bg-gray-100 h-12 text-[11pt]";
    const tableCellClass = "border border-black p-1 text-center h-10 font-bold text-[10pt]";

    // Vibrant colors for row backgrounds
    const rowColors = [
        'bg-blue-50',
        'bg-emerald-50',
        'bg-amber-50',
        'bg-rose-50',
        'bg-indigo-50',
        'bg-cyan-50'
    ];

    const getRowColor = (index: number) => rowColors[index % rowColors.length];

    return (
        <div className="w-[794px] h-[1123px] bg-white p-2 flex flex-col font-['Cairo'] relative" dir="rtl">
            {/* Outer Decorative Border */}
            <div className="flex-grow flex flex-col border-4 border-indigo-600 rounded-3xl p-10 m-2 relative overflow-hidden">
                
                {/* Background Accent */}
                <div className="absolute top-0 left-0 w-full h-32 bg-indigo-50 -z-10 opacity-30"></div>

                <header className="mb-6 flex-shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <div className="w-1/4 flex flex-col items-center">
                            {ministryLogo ? (
                                <img src={ministryLogo} alt="وزارة التربية" className="w-20 h-20 object-contain mb-1" />
                            ) : (
                                <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center text-[8pt] text-gray-400">شعار الوزارة</div>
                            )}
                            <p className="text-[9pt] font-black text-gray-600 leading-tight">جمهورية العراق</p>
                            <p className="text-[9pt] font-black text-gray-600 leading-tight">وزارة التربية</p>
                        </div>

                        <div className="flex-grow text-center">
                            <h1 className="text-2xl font-black text-indigo-900 border-b-4 border-indigo-600 pb-2 mb-2 inline-block">
                                احصائيات النجاح {monthLabel}
                            </h1>
                            <p className="text-xl font-extrabold text-cyan-700 mt-1">الصف: {stageName}</p>
                            <p className="text-sm font-bold text-gray-500 mt-1">{settings.academicYear}</p>
                        </div>

                        <div className="w-1/4 flex flex-col items-center">
                            {schoolLogo ? (
                                <img src={schoolLogo} alt="المدرسة" className="w-20 h-20 object-contain rounded-full mb-1" />
                            ) : (
                                <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center text-[8pt] text-gray-400">شعار المدرسة</div>
                            )}
                            <p className="text-[10pt] font-black text-gray-800">{settings.schoolName}</p>
                        </div>
                    </div>
                    <div className="flex justify-center">
                        <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-md">
                            صفحة {pageNumber} من {totalPages}
                        </span>
                    </div>
                </header>

                <main className="flex-grow">
                    <table className="w-full border-collapse border-2 border-black shadow-lg">
                        <thead>
                            <tr className="bg-gradient-to-l from-indigo-600 to-blue-600 text-white">
                                <th className={tableHeaderClass + " w-[20%] text-white bg-transparent"}>المادة</th>
                                <th className={tableHeaderClass + " w-[8%] text-white bg-transparent"}>الشعبة</th>
                                <th className={tableHeaderClass + " w-[20%] text-white bg-transparent"}>مدرس المادة</th>
                                <th className={tableHeaderClass + " w-[10%] text-white bg-transparent"}>العدد الكلي</th>
                                <th className={tableHeaderClass + " w-[10%] text-white bg-transparent"}>عدد الناجحين</th>
                                <th className={tableHeaderClass + " w-[10%] text-white bg-transparent"}>عدد الراسبين</th>
                                <th className={tableHeaderClass + " w-[10%] text-white bg-transparent"}>نسبة النجاح</th>
                                <th className={tableHeaderClass + " text-white bg-transparent"}>الملاحظات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, index) => (
                                <tr key={index} className={`${getRowColor(index)} h-10 border-b border-gray-200 transition-colors`}>
                                    <td className={tableCellClass + " text-right px-3 text-indigo-900"}>{row.subject}</td>
                                    <td className={tableCellClass + " text-gray-700"}>{row.section}</td>
                                    <td className={tableCellClass + " text-gray-700"}>{row.teacher}</td>
                                    <td className={tableCellClass + " text-gray-900"}>{row.total}</td>
                                    <td className={tableCellClass + " text-emerald-700"}>{row.passed}</td>
                                    <td className={tableCellClass + " text-rose-700"}>{row.failed}</td>
                                    <td className={tableCellClass + " font-black text-blue-800 text-[11pt]"}>
                                        <span className="bg-white/80 px-2 py-0.5 rounded-full border border-blue-200">{row.rate}%</span>
                                    </td>
                                    <td className={tableCellClass}></td>
                                </tr>
                            ))}
                            {/* Reduced filling rows to preserve bottom margin */}
                            {Array.from({ length: Math.max(0, 18 - data.length) }).map((_, i) => (
                                <tr key={`empty-${i}`} className="h-10 border-b border-gray-100">
                                    <td className="border border-black"></td>
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

                <footer className="mt-4 flex-shrink-0 border-t-2 border-indigo-200 pt-4 pb-2">
                    <div className="flex justify-between items-end px-4">
                        <div className="text-right text-[10pt] font-bold text-gray-500 space-y-1">
                            <p>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</p>
                            <p>توقيع معاون المدير</p>
                        </div>
                        <div className="text-center font-bold">
                            <p className="text-indigo-900 text-lg mb-2">مدير المدرسة</p>
                            <p className="text-xl font-black text-gray-900 underline decoration-indigo-500 decoration-double underline-offset-4">
                                {settings.principalName}
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
            
            {/* Safe Bottom Padding increased to ensure visibility */}
            <div className="h-14 w-full flex-shrink-0"></div>
        </div>
    );
}
