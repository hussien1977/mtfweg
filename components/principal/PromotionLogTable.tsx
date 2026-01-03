
import React, { useState, useMemo } from 'react';
import type { PromotionData } from './PromotionLog.tsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PromotionLogTableProps {
    data: PromotionData[];
    stage: string;
    onUpdate: (studentId: string, field: keyof PromotionData, value: any) => void;
}

const ROWS_PER_PAGE = 30;

const EditableCell: React.FC<{
    studentId: string;
    field: keyof PromotionData;
    value: string;
    options: string[];
    onUpdate: (studentId: string, field: keyof PromotionData, value: any) => void;
    highlight?: boolean;
}> = ({ studentId, field, value, options, onUpdate, highlight }) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onUpdate(studentId, field, e.target.value);
    };

    const cellStyle: React.CSSProperties = highlight ? { backgroundColor: '#fee2e2', color: '#dc2626' } : {};

    return (
        <td className="border border-gray-300 p-0" style={cellStyle}>
            <select
                value={value}
                onChange={handleChange}
                className="w-full h-full bg-transparent border-0 focus:ring-1 focus:ring-cyan-500 text-center font-semibold"
                style={cellStyle}
            >
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </td>
    );
};

export default function PromotionLogTable({ data, stage, onUpdate }: PromotionLogTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(data.length / ROWS_PER_PAGE);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
        const endIndex = startIndex + ROWS_PER_PAGE;
        return data.slice(startIndex, endIndex);
    }, [data, currentPage]);

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-400 bg-white">
                <thead className="bg-yellow-300 text-black font-bold">
                    <tr>
                        <th className="border border-black p-2">ت</th>
                        <th className="border border-black p-2">اسم الطالب</th>
                        <th className="border border-black p-2">الشعبة</th>
                        <th className="border border-black p-2">المواليد</th>
                        <th className="border border-black p-2">رقم القيد</th>
                        <th className="border border-black p-2">مصير الطالب في العام السابق</th>
                        <th className="border border-black p-2">مصير الطالب في نهاية العام الحالي</th>
                        <th className="border border-black p-2">مصير الطالب في العام القادم</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedData.map(row => {
                         const highlight = row.nextYearFate === 'تجاوز المواليد المسموحة';
                        return (
                            <tr key={row.studentId} className={highlight ? '' : (row.seq % 2 === 0 ? 'bg-gray-50' : '')}>
                                <td className={`border border-gray-300 p-2 text-center ${highlight ? 'bg-pink-100' : ''}`}>{row.seq}</td>
                                <td className={`border border-gray-300 p-2 font-semibold ${highlight ? 'bg-pink-100' : ''}`}>{row.name}</td>
                                <td className={`border border-gray-300 p-2 text-center ${highlight ? 'bg-pink-100' : ''}`}>{row.section}</td>
                                <td className={`border border-gray-300 p-2 text-center ${highlight ? 'bg-pink-100' : ''}`}>{row.birthDate}</td>
                                <td className={`border border-gray-300 p-2 text-center ${highlight ? 'bg-pink-100' : ''}`}>{row.registrationId}</td>
                                <EditableCell studentId={row.studentId} field="previousYearFate" value={row.previousYearFate} options={['ناجح', 'راسب']} onUpdate={onUpdate} />
                                <EditableCell studentId={row.studentId} field="currentYearFate" value={row.currentYearFate} options={['ناجح', 'راسب']} onUpdate={onUpdate} />
                                <EditableCell studentId={row.studentId} field="nextYearFate" value={row.nextYearFate} options={['يحق له الدوام', 'لا يحق له الدوام', 'تجاوز المواليد المسموحة']} onUpdate={onUpdate} highlight={highlight} />
                            </tr>
                        )
                    })}
                </tbody>
            </table>

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-4">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                    >
                        <ChevronRight size={20} />
                    </button>
                    <span>صفحة {currentPage} من {totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                    >
                        <ChevronLeft size={20} />
                    </button>
                </div>
            )}
        </div>
    );
}