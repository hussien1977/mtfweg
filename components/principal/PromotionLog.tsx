
import React, { useState, useMemo } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { ClassData, SchoolSettings, Student } from '../../types.ts';
import { GRADE_LEVELS } from '../../constants.ts';
import { calculateStudentResult } from '../../lib/gradeCalculator.ts';
import PromotionLogTable from './PromotionLogTable.tsx';
import PromotionLogPDFPage from './PromotionLogPDFPage.tsx';
import { Loader2, FileDown, BarChart2, Download } from 'lucide-react';

declare const jspdf: any;
declare const html2canvas: any;
declare const XLSX: any;

export interface PromotionData {
    studentId: string;
    seq: number;
    name: string;
    section: string;
    birthDate: string;
    registrationId: string;
    previousYearFate: 'ناجح' | 'راسب';
    currentYearFate: 'ناجح' | 'راسب';
    nextYearFate: 'يحق له الدوام' | 'لا يحق له الدوام' | 'تجاوز المواليد المسموحة';
}

const getAgeLimit = (stage: string, gender: string | undefined): number => {
    let baseLimit = 0;
    switch (stage) {
        case 'الاول متوسط': baseLimit = 15; break;
        case 'الثاني متوسط': baseLimit = 16; break;
        case 'الثالث متوسط': baseLimit = 17; break;
        case 'الرابع العلمي':
        case 'الرابع الادبي': baseLimit = 18; break;
        case 'الخامس العلمي':
        case 'الخامس الادبي': baseLimit = 19; break;
        case 'السادس العلمي':
        case 'السادس الادبي': baseLimit = 20; break;
        default: return 99; // No limit for unknown stages
    }
    return gender === 'بنات' ? baseLimit + 2 : baseLimit;
};

export default function PromotionLog({ classes, settings }: { classes: ClassData[], settings: SchoolSettings }) {
    const [selectedStage, setSelectedStage] = useState('');
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [promotionData, setPromotionData] = useState<PromotionData[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    const classesInSelectedStage = useMemo(() => {
        return selectedStage ? classes.filter(c => c.stage === selectedStage) : [];
    }, [selectedStage, classes]);

    const handleGenerateLog = () => {
        const classesToProcess = classes.filter(c => selectedClassIds.includes(c.id));
        const students = classesToProcess
            .flatMap(c => (c.students || []).map(s => ({ ...s, classData: c })))
            .sort((a, b) => {
                const numA = parseInt(a.examId || '0', 10);
                const numB = parseInt(b.examId || '0', 10);
                if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
                return a.name.localeCompare(b.name, 'ar');
            });

        const data: PromotionData[] = students.map((student, index) => {
            const previousYearFate = (student.yearsOfFailure && student.yearsOfFailure.trim() !== '' && student.yearsOfFailure.trim() !== '0') ? 'راسب' : 'ناجح';
            
            const result = calculateStudentResult(student, student.classData.subjects, settings, student.classData);
            const currentYearFate = result.result.status === 'ناجح' ? 'ناجح' : 'راسب';
            
            let nextYearFate: PromotionData['nextYearFate'] = 'يحق له الدوام';
            if (currentYearFate === 'ناجح') {
                nextYearFate = 'يحق له الدوام';
            } else { // 'راسب'
                if (previousYearFate === 'راسب') {
                    nextYearFate = 'لا يحق له الدوام';
                } else {
                    const academicStartYear = parseInt(settings.academicYear.split('-')[0], 10);
                    const birthYear = parseInt(student.birthDate, 10);
                    if (!isNaN(academicStartYear) && !isNaN(birthYear)) {
                        const age = academicStartYear - birthYear;
                        const ageLimit = getAgeLimit(student.classData.stage, settings.schoolGender);
                        if (age > ageLimit) {
                            nextYearFate = 'تجاوز المواليد المسموحة';
                        }
                    }
                }
            }
            return {
                studentId: student.id,
                seq: index + 1,
                name: student.name,
                section: student.classData.section,
                birthDate: student.birthDate,
                registrationId: student.registrationId,
                previousYearFate,
                currentYearFate,
                nextYearFate
            };
        });
        setPromotionData(data);
    };

    const handleDataUpdate = (studentId: string, field: keyof PromotionData, value: any) => {
        setPromotionData(prevData =>
            prevData.map(row =>
                row.studentId === studentId ? { ...row, [field]: value } : row
            )
        );
    };

    const handleExportExcel = () => {
        const dataForExcel = promotionData.map(d => ({
            'ت': d.seq,
            'اسم الطالب': d.name,
            'الشعبة': d.section,
            'المواليد': d.birthDate,
            'رقم القيد': d.registrationId,
            'مصير الطالب في العام السابق': d.previousYearFate,
            'مصير الطالب في نهاية العام الحالي': d.currentYearFate,
            'مصير الطالب في العام القادم': d.nextYearFate,
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل الترحيل');
        XLSX.writeFile(workbook, `سجل_الترحيل-${selectedStage}.xlsx`);
    };

    const handleExportPdf = async () => {
        if (promotionData.length === 0) return;
        setIsExporting(true);
        setExportProgress(0);

        if (typeof jspdf === 'undefined' || typeof html2canvas === 'undefined') {
            alert("خطأ: مكتبة تصدير PDF غير محملة.");
            setIsExporting(false);
            return;
        }

        const { jsPDF } = jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);
        const renderComponent = (component: React.ReactElement) => new Promise<void>(resolve => {
            root.render(component); setTimeout(resolve, 500);
        });

        const STUDENTS_PER_PAGE = 30;
        const totalPages = Math.ceil(promotionData.length / STUDENTS_PER_PAGE);

        try {
            await document.fonts.ready;
            for (let i = 0; i < totalPages; i++) {
                const chunk = promotionData.slice(i * STUDENTS_PER_PAGE, (i + 1) * STUDENTS_PER_PAGE);
                await renderComponent(
                    <PromotionLogPDFPage
                        settings={settings}
                        data={chunk}
                        stage={selectedStage}
                    />
                );

                const reportElement = tempContainer.children[0] as HTMLElement;
                const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
                setExportProgress(Math.round(((i + 1) / totalPages) * 100));
            }
            pdf.save(`سجل_الترحيل-${selectedStage}.pdf`);
        } catch (error) {
            console.error("PDF Export error:", error);
            alert(`حدث خطأ أثناء التصدير: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
        }
    };


    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-7xl mx-auto">
            {isExporting && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center z-50 text-white">
                    <Loader2 className="animate-spin h-16 w-16 mb-4" />
                    <p className="text-2xl font-bold mb-2">جاري التصدير...</p>
                    <div className="w-1/2 bg-gray-600 rounded-full h-4"><div className="bg-cyan-500 h-4 rounded-full" style={{ width: `${exportProgress}%` }}></div></div>
                    <p className="mt-2 text-lg">{exportProgress}%</p>
                </div>
            )}
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">إعداد سجل الترحيل</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-md font-bold text-gray-700 mb-2">1. اختر المرحلة الدراسية</label>
                    <select onChange={e => { setSelectedStage(e.target.value); setSelectedClassIds([]); setPromotionData([]); }} value={selectedStage} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500">
                        <option value="">-- اختر مرحلة --</option>
                        {GRADE_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                    </select>
                </div>
                <div className="md:col-span-1">
                    <label className="block text-md font-bold text-gray-700 mb-2">2. اختر الشعب</label>
                    <div className="p-2 border rounded-lg max-h-32 overflow-y-auto bg-gray-50">
                        {selectedStage && classesInSelectedStage.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {classesInSelectedStage.map(c => (
                                <label key={c.id} className="flex items-center gap-2 p-1 rounded-md hover:bg-gray-200 cursor-pointer">
                                    <input type="checkbox" checked={selectedClassIds.includes(c.id)} onChange={() => setSelectedClassIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])} className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"/>
                                    <span className="font-semibold">{c.section}</span>
                                </label>
                            ))}
                            </div>
                        ): <p className="text-gray-500 text-center">اختر مرحلة لعرض الشعب.</p>}
                    </div>
                </div>
            </div>
            
            <div className="flex justify-center gap-4 mt-4 border-t pt-6">
                <button onClick={handleGenerateLog} disabled={selectedClassIds.length === 0} className="flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition disabled:bg-gray-400">
                    <BarChart2 size={20} />
                    <span>عرض السجل</span>
                </button>
                {promotionData.length > 0 && (
                    <>
                        <button onClick={handleExportPdf} disabled={isExporting} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition">
                            <FileDown size={20} />
                            <span>تصدير PDF</span>
                        </button>
                         <button onClick={handleExportExcel} className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">
                            <Download size={20} />
                            <span>تصدير Excel</span>
                        </button>
                    </>
                )}
            </div>

            {promotionData.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-xl font-bold text-center mb-4">معاينة سجل الترحيل</h3>
                    <PromotionLogTable 
                        data={promotionData} 
                        stage={selectedStage} 
                        onUpdate={handleDataUpdate}
                    />
                </div>
            )}
        </div>
    );
}