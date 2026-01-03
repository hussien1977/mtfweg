import React, { useState, useMemo } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { ClassData, SchoolSettings, Student } from '../../types.ts';
import { ChevronDown, FileDown, Loader2, BarChart2 } from 'lucide-react';
import PrimaryLogPDFPage from './PrimaryLogPDFPage.tsx';
import Primary56LogPDFPage from './Primary56LogPDFPage.tsx';
import { calculateStudentResult } from '../../lib/gradeCalculator.ts';


declare const jspdf: any;
declare const html2canvas: any;

interface PrimaryLogExporterProps {
    classes: ClassData[];
    settings: SchoolSettings;
}

const EARLY_GRADES = ['الاول ابتدائي', 'الثاني ابتدائي', 'الثالث ابتدائي', 'الرابع ابتدائي'];
const LATE_GRADES = ['الخامس ابتدائي', 'السادس ابتدائي'];
const STUDENTS_PER_PAGE_EARLY = 24;

export default function PrimaryLogExporter({ classes, settings }: PrimaryLogExporterProps) {
    const [logType, setLogType] = useState<'early_grades' | '5_6_primary' | ''>('');
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    const classesForSelection = useMemo(() => {
        if (logType === 'early_grades') {
            return classes.filter(c => EARLY_GRADES.includes(c.stage));
        }
        if (logType === '5_6_primary') {
            return classes.filter(c => LATE_GRADES.includes(c.stage));
        }
        return [];
    }, [classes, logType]);

    const handleClassSelection = (classId: string) => {
        setSelectedClassIds(prev =>
            prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
        );
    };

    const handleExportEarlyGradesPdf = async (examType: 'midYear' | 'finalYear') => {
        if (selectedClassIds.length === 0) {
            alert('يرجى اختيار شعبة واحدة على الأقل.');
            return;
        }

        setIsExporting(true);
        setExportProgress(0);

        if (typeof jspdf === 'undefined' || typeof html2canvas === 'undefined') {
            alert("خطأ: مكتبة تصدير PDF غير محملة.");
            setIsExporting(false);
            return;
        }

        const { jsPDF } = jspdf;
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        const renderComponent = (component: React.ReactElement) => new Promise<void>(resolve => {
            root.render(component);
            setTimeout(resolve, 500);
        });

        const classesToExport = classes.filter(c => selectedClassIds.includes(c.id));
        const allPagesData: { classData: ClassData, students: Student[] }[] = [];

        for (const classData of classesToExport) {
            const students = [...(classData.students || [])].sort((a,b) => a.name.localeCompare(b.name, 'ar'));
            if (students.length === 0) {
                allPagesData.push({ classData, students: [] });
            } else {
                for (let i = 0; i < students.length; i += STUDENTS_PER_PAGE_EARLY) {
                    allPagesData.push({ classData, students: students.slice(i, i + STUDENTS_PER_PAGE_EARLY) });
                }
            }
        }
        
        try {
            await document.fonts.ready;

            for (let i = 0; i < allPagesData.length; i++) {
                const { classData, students } = allPagesData[i];
                
                await renderComponent(
                    <PrimaryLogPDFPage
                        settings={settings}
                        classData={classData}
                        students={students}
                        examType={examType}
                    />
                );

                const pageElement = tempContainer.children[0] as HTMLElement;
                const canvas = await html2canvas(pageElement, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/png');

                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
                setExportProgress(Math.round(((i + 1) / allPagesData.length) * 100));
            }
            const examTypeName = examType === 'midYear' ? 'نصف_السنة' : 'نهاية_السنة';
            pdf.save(`سجل_درجات_ابتدائي-${examTypeName}.pdf`);

        } catch (error) {
            console.error("PDF Export error:", error);
            alert(`حدث خطأ أثناء التصدير: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
        }
    };

    const handleExport56Pdf = async () => {
        const studentsToExport = classes
            .filter(c => selectedClassIds.includes(c.id))
            .flatMap(c => (c.students || []).map(s => ({ student: s, classData: c })));
        
        if (studentsToExport.length === 0) {
            alert('يرجى اختيار طالب واحد على الأقل للتصدير.');
            return;
        }
        
        setIsExporting(true);
        setExportProgress(0);
    
        if (typeof jspdf === 'undefined' || typeof html2canvas === 'undefined') {
            alert("خطأ: مكتبة تصدير PDF غير محملة.");
            setIsExporting(false);
            return;
        }
    
        const { jsPDF } = jspdf;
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, {
            position: 'absolute',
            left: '-9999px',
            top: '0',
            width: '794px',
            height: '1123px',
        });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);
    
        const renderComponent = (component: React.ReactElement): Promise<void> => {
            return new Promise((resolve) => {
                root.render(component);
                setTimeout(resolve, 500);
            });
        };
    
        try {
            await document.fonts.ready;
    
            for (let i = 0; i < studentsToExport.length; i++) {
                const { student, classData } = studentsToExport[i];
                const studentResultData = calculateStudentResult(student, classData.subjects, settings, classData);
    
                await renderComponent(
                    <Primary56LogPDFPage
                        student={student}
                        classData={classData}
                        settings={settings}
                        studentResultData={studentResultData}
                    />
                );
    
                const reportElement = tempContainer.children[0] as HTMLElement;
                if (!reportElement) {
                    throw new Error("Report card element could not be found for rendering.");
                }
    
                const canvas = await html2canvas(reportElement, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                });
                
                const imgData = canvas.toDataURL('image/png');
                const { width: pageWidth, height: pageHeight } = pdf.internal.pageSize;
    
                if (i > 0) {
                    pdf.addPage();
                }
                pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
                
                setExportProgress(Math.round(((i + 1) / studentsToExport.length) * 100));
            }
    
            pdf.save(`سجل_درجات_${selectedClassIds.length > 0 ? classes.find(c=>c.id === selectedClassIds[0])?.stage : 'الخامس_السادس'}.pdf`);
    
        } catch (error) {
            console.error("An error occurred during PDF export:", error);
            alert(`حدث خطأ أثناء تصدير ملف PDF: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            root.unmount();
            if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
            }
            setIsExporting(false);
            setExportProgress(0);
        }
    };
    
    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
             {isExporting && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center z-[200] text-white">
                    <Loader2 className="animate-spin h-16 w-16 mb-4" />
                    <p className="text-2xl font-bold mb-2">جاري إعداد السجل...</p>
                    <div className="w-1/2 bg-gray-600 rounded-full h-4"><div className="bg-cyan-500 h-4 rounded-full" style={{ width: `${exportProgress}%` }}></div></div>
                    <p className="mt-2 text-lg">{exportProgress}%</p>
                </div>
            )}
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">إصدار سجل درجات الابتدائية</h2>
            
            <div className="space-y-6">
                 <div>
                    <label className="block text-md font-bold text-gray-700 mb-2">1. اختر نوع السجل</label>
                    <div className="relative">
                        <select onChange={(e) => { setLogType(e.target.value as any); setSelectedClassIds([]); }} value={logType} className="w-full appearance-none px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 bg-white">
                            <option value="" disabled>-- اختر الصفوف --</option>
                            <option value="early_grades">الصفوف الأولية (الأول - الرابع)</option>
                            <option value="5_6_primary">الخامس والسادس ابتدائي</option>
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {logType && (
                     <div>
                        <label className="block text-md font-bold text-gray-700 mb-2">2. اختر الشعب</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                            {classesForSelection.length > 0 ? classesForSelection.map(c => (
                                <label key={c.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                    <input type="checkbox" checked={selectedClassIds.includes(c.id)} onChange={() => handleClassSelection(c.id)} className="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"/>
                                    <span className="font-semibold">{c.stage} - {c.section}</span>
                                </label>
                            )) : <p className="text-gray-500">لا توجد شعب لهذه المراحل.</p>}
                        </div>
                    </div>
                )}
                
                 {logType === 'early_grades' && (
                     <div className="border-t pt-6">
                        <label className="block text-md font-bold text-gray-700 mb-3 text-center">3. تنفيذ التصدير</label>
                        <div className="flex flex-col md:flex-row gap-4 justify-center">
                            <button onClick={() => handleExportEarlyGradesPdf('midYear')} disabled={selectedClassIds.length === 0 || isExporting} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition shadow-md disabled:bg-gray-400">
                                <BarChart2 size={20} />
                                <span>انشاء سجل درجات نصف السنة</span>
                            </button>
                            <button onClick={() => handleExportEarlyGradesPdf('finalYear')} disabled={selectedClassIds.length === 0 || isExporting} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-md disabled:bg-gray-400">
                                <FileDown size={20} />
                                <span>انشاء سجل درجات نهاية السنة</span>
                            </button>
                        </div>
                    </div>
                 )}

                 {logType === '5_6_primary' && (
                     <div className="border-t pt-6">
                        <label className="block text-md font-bold text-gray-700 mb-3 text-center">3. تنفيذ التصدير</label>
                        <div className="flex justify-center">
                            <button onClick={handleExport56Pdf} disabled={selectedClassIds.length === 0 || isExporting} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition shadow-md disabled:bg-gray-400">
                                <FileDown size={20} />
                                <span>انشاء سجل الدرجات (صفحة لكل طالب)</span>
                            </button>
                        </div>
                    </div>
                 )}
            </div>
        </div>
    );
}