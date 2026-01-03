import React, { useState, useMemo } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { ClassData, SchoolSettings, Student, StudentResult, CalculatedGrade } from '../types.ts';
import { GRADE_LEVELS } from '../constants.ts';
import { calculateStudentResult } from '../lib/gradeCalculator.ts';
import AdminReportCard from './AdminReportCard.tsx';
import { Loader2, FileDown } from 'lucide-react';

declare const jspdf: any;
declare const html2canvas: any;

export default function AdminLogExporter({ classes, settings }: { classes: ClassData[], settings: SchoolSettings }) {
    const [selectedStage, setSelectedStage] = useState('');
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [logos, setLogos] = useState<{ ministry: string | null; school: string | null }>({ ministry: null, school: null });
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportWithGrades, setExportWithGrades] = useState<boolean>(true);

    const classesInSelectedStage = useMemo(() => {
        return selectedStage ? classes.filter(c => c.stage === selectedStage) : [];
    }, [selectedStage, classes]);
    
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'ministry' | 'school') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setLogos(prev => ({ ...prev, [type]: event.target?.result as string }));
            };
            reader.readAsDataURL(file);
        } else {
             setLogos(prev => ({ ...prev, [type]: null }));
        }
    };
    
    const getStudentsToExport = (): { student: Student, classData: ClassData }[] => {
        return classes
            .filter(c => selectedClassIds.includes(c.id))
            .flatMap(c => {
                const sortedStudents = [...(c.students || [])].sort((a, b) => {
                    const aId = a.examId || '';
                    const bId = b.examId || '';
                    const numA = parseInt(aId, 10);
                    const numB = parseInt(bId, 10);
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return numA - numB;
                    }
                    // Fallback to name sort if examId is not numeric or consistent
                    return a.name.localeCompare(b.name, 'ar');
                });
                return sortedStudents.map(s => ({ student: s, classData: c }))
            });
    };
    
    const handleExportPdf = async () => {
        const studentsToExport = getStudentsToExport();
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
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '-9999px', width: '794px', height: '1123px' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        const renderComponent = (component: React.ReactElement) => new Promise<void>(resolve => {
            root.render(component);
            setTimeout(resolve, 500);
        });

        const resultsData = new Map<string, { finalCalculatedGrades: Record<string, CalculatedGrade>, result: StudentResult }>();
        studentsToExport.forEach(({student, classData}) => {
             if (!resultsData.has(student.id)) {
                resultsData.set(student.id, calculateStudentResult(student, classData.subjects || [], settings, classData));
            }
        });

        try {
            await document.fonts.ready;
            
            for (let i = 0; i < studentsToExport.length; i++) {
                const { student, classData } = studentsToExport[i];
                const studentResultData = resultsData.get(student.id);

                if (!studentResultData) continue;

                await renderComponent(
                    <AdminReportCard
                        student={student}
                        classData={classData}
                        settings={settings}
                        studentResultData={studentResultData}
                        logos={logos}
                        studentIndex={i + 1}
                        exportWithGrades={exportWithGrades}
                    />
                );

                const reportElement = tempContainer.children[0] as HTMLElement;
                const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                const imgData = canvas.toDataURL('image/png');
                
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
                setExportProgress(Math.round(((i + 1) / studentsToExport.length) * 100));
            }
            pdf.save(`السجل_العام-${selectedStage}.pdf`);
        } catch (error) {
            console.error("PDF Export Error:", error);
            const message = error instanceof Error ? error.message : String(error);
            alert(`حدث خطأ أثناء التصدير: ${message}`);
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
            setExportProgress(0);
        }
    };

    const FileInput = ({ label, onChange, type }: { label: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, type: 'ministry' | 'school' }) => (
        <div className="text-center">
            <label className="text-md font-semibold text-gray-700">{label}</label>
            <div className="mt-2 flex justify-center items-center gap-2">
                <button
                    type="button"
                    onClick={() => { const el = document.getElementById(`logo-upload-${type}`); if (el) el.click(); }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm hover:bg-gray-300"
                >
                    اختیار ملف
                </button>
                <span className={`text-sm ${logos[type] ? 'text-green-600' : 'text-gray-500'}`}>
                    {logos[type] ? 'تم رفع الملف' : 'لم يتم اختيار أي ملف'}
                </span>
            </div>
            <input id={`logo-upload-${type}`} type="file" onChange={onChange} accept="image/*" className="hidden" />
        </div>
    );

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">تصدير سجل درجات الادارة ( السجل الوسطي )</h2>
            
            {isExporting && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center z-50 text-white">
                    <Loader2 className="animate-spin h-16 w-16 mb-4" />
                    <p className="text-2xl font-bold mb-2">جاري التصدير...</p>
                    <div className="w-1/2 bg-gray-600 rounded-full h-4"><div className="bg-cyan-500 h-4 rounded-full" style={{ width: `${exportProgress}%` }}></div></div>
                    <p className="mt-2 text-lg">{exportProgress}%</p>
                </div>
            )}

             <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div>
                        <label className="block text-md font-bold text-gray-700 mb-2">1. اختر المرحلة الدراسية</label>
                        <select onChange={e => { setSelectedStage(e.target.value); setSelectedClassIds([]); }} value={selectedStage} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500">
                            <option value="">-- اختر مرحلة --</option>
                            {GRADE_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-md font-bold text-gray-700 mb-2">2. اختر الشعبة (أو الشعب)</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                            {selectedStage && classesInSelectedStage.length > 0 ? classesInSelectedStage.map(c => (
                                <label key={c.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                    <input type="checkbox" checked={selectedClassIds.includes(c.id)} onChange={() => {setSelectedClassIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]);}} className="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"/>
                                    <span className="font-semibold">{c.stage} - {c.section}</span>
                                    <span className="text-sm text-gray-500">({(c.students || []).length} طالب)</span>
                                </label>
                            )) : <p className="text-gray-500 text-center">اختر مرحلة لعرض الشعب</p>}
                        </div>
                    </div>
                </div>

                 <div>
                    <label className="block text-md font-bold text-gray-700 mb-2">3. خيارات التصدير</label>
                    <div className="flex gap-6 p-3 bg-gray-100 rounded-lg justify-center">
                        <label className="flex items-center gap-2 cursor-pointer text-lg font-semibold">
                            <input
                                type="radio"
                                name="exportType"
                                checked={exportWithGrades}
                                onChange={() => setExportWithGrades(true)}
                                className="h-5 w-5 text-cyan-600 focus:ring-cyan-500"
                            />
                            <span>مع الدرجات والنتيجة</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-lg font-semibold">
                            <input
                                type="radio"
                                name="exportType"
                                checked={!exportWithGrades}
                                onChange={() => setExportWithGrades(false)}
                                className="h-5 w-5 text-cyan-600 focus:ring-cyan-500"
                            />
                            <span>خالي من الدرجات</span>
                        </label>
                    </div>
                </div>

                 <div>
                    <label className="block text-md font-bold text-gray-700 mb-2">4. اختر الشعارات (اختياري)</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-100 rounded-lg">
                        <FileInput label="شعار الوزارة" onChange={e => handleLogoChange(e, 'ministry')} type="ministry"/>
                        <FileInput label="شعار المدرسة" onChange={e => handleLogoChange(e, 'school')} type="school"/>
                    </div>
                </div>
            </div>
            
             <div className="border-t pt-6 mt-8">
                <label className="block text-md font-bold text-gray-700 mb-3 text-center">5. تنفيذ التصدير</label>
                <div className="flex justify-center">
                    <button onClick={handleExportPdf} disabled={selectedClassIds.length === 0 || isExporting} className="flex items-center justify-center gap-2 px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed">
                        <FileDown size={20} />
                        <span>تصدير سجل الادارة (PDF)</span>
                    </button>
                </div>
            </div>
        </div>
    );
}