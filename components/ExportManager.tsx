import React, { useState, useMemo, useRef } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { ClassData, SchoolSettings, Student, SubjectGrade, CalculatedGrade } from '../types.ts';
import { GRADE_LEVELS } from '../constants.ts';
import { calculateStudentResult } from '../lib/gradeCalculator.ts';
import StudentReportCard from './StudentReportCard.tsx';
import { Download, FileText, Loader2 } from 'lucide-react';

declare const XLSX: any;
declare const jspdf: any;
declare const html2canvas: any;

interface ExportManagerProps {
    classes: ClassData[];
    settings: SchoolSettings;
}

const RESULT_TYPES = ['الفصل الاول', 'نصف السنة', 'الفصل الثاني', 'السعي السنوي', 'الدرجة النهائية', 'الدور الثاني'];

const DEFAULT_SUBJECT_GRADE: SubjectGrade = {
    firstTerm: null,
    midYear: null,
    secondTerm: null,
    finalExam1st: null,
    finalExam2nd: null,
};

const DEFAULT_CALCULATED_GRADE: CalculatedGrade = {
    annualPursuit: null,
    finalGrade1st: null,
    finalGradeWithDecision: null,
    decisionApplied: 0,
    finalGrade2nd: null,
    isExempt: false,
};

export default function ExportManager({ classes, settings }: ExportManagerProps) {
    const [selectedStage, setSelectedStage] = useState<string>('');
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [resultType, setResultType] = useState<string>('الدرجة النهائية');
    const [logos, setLogos] = useState<{ school: string | null; ministry: string | null }>({ school: null, ministry: null });
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    const reportCardRef = useRef<HTMLDivElement>(null);

    const classesInSelectedStage = useMemo(() => {
        return selectedStage ? classes.filter(c => c.stage === selectedStage) : [];
    }, [selectedStage, classes]);

    const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedStage(e.target.value);
        setSelectedClassIds([]);
    };

    const handleClassSelection = (classId: string) => {
        setSelectedClassIds(prev =>
            prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
        );
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'school' | 'ministry') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setLogos(prev => ({ ...prev, [type]: event.target?.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };
    
    const getStudentsToExport = (): { student: Student, classData: ClassData }[] => {
        return classes
            .filter(c => selectedClassIds.includes(c.id))
            .flatMap(c => (c.students || []).map(s => ({ student: s, classData: c })));
    };

    const handleExportExcel = () => {
        setIsExporting(true);
        setExportProgress(0);
        
        setTimeout(() => {
            const studentsToExport = getStudentsToExport();
            if (studentsToExport.length === 0) {
                alert('يرجى اختيار طالب واحد على الأقل للتصدير.');
                setIsExporting(false);
                return;
            }
            
            const dataForExcel: any[] = [];
            const allSubjects = classes.find(c => c.id === selectedClassIds[0])?.subjects || [];

            studentsToExport.forEach(({ student, classData }) => {
                const { finalCalculatedGrades } = calculateStudentResult(student, classData.subjects, settings, classData);
                const studentRow: any = {
                    'اسم الطالب': student.name,
                    'الرقم الامتحاني': student.examId,
                    'المرحلة': classData.stage,
                    'الشعبة': classData.section,
                };
                
                allSubjects.forEach(subject => {
                   const grade = student.grades?.[subject.name] || DEFAULT_SUBJECT_GRADE;
                   const calculated = finalCalculatedGrades[subject.name] || DEFAULT_CALCULATED_GRADE;
                   studentRow[`${subject.name} - الفصل الأول`] = grade.firstTerm;
                   studentRow[`${subject.name} - نصف السنة`] = grade.midYear;
                   studentRow[`${subject.name} - الفصل الثاني`] = grade.secondTerm;
                   studentRow[`${subject.name} - السعي السنوي`] = calculated.annualPursuit;
                   studentRow[`${subject.name} - الامتحان النهائي`] = grade.finalExam1st;
                   studentRow[`${subject.name} - الدرجة النهائية`] = calculated.finalGradeWithDecision;
                });
                
                dataForExcel.push(studentRow);
            });

            const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'النتائج');
            XLSX.writeFile(workbook, `نتائج-${selectedStage}-${resultType}.xlsx`);
            
            setExportProgress(100);
            setIsExporting(false);
        }, 100);
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
            console.error("jsPDF or html2canvas not loaded");
            alert("خطأ: مكتبة تصدير PDF غير محملة. يرجى تحديث الصفحة والمحاولة مرة أخرى.");
            setIsExporting(false);
            return;
        }
    
        const { jsPDF } = jspdf;
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });
    
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, {
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: '794px',
            height: '1123px',
        });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);
    
        const renderComponent = (component: React.ReactElement): Promise<void> => {
            return new Promise((resolve) => {
                root.render(component);
                // This timeout is crucial to allow React to render and the browser to apply styles,
                // especially custom fonts, before the screenshot is taken.
                setTimeout(resolve, 500); // Increased for more stability
            });
        };
    
        try {
            // Wait for external fonts to be loaded to prevent them from being missed by html2canvas.
            await document.fonts.ready;
    
            for (let i = 0; i < studentsToExport.length; i++) {
                const { student, classData } = studentsToExport[i];
                const studentResultData = calculateStudentResult(student, classData.subjects, settings, classData);
    
                await renderComponent(
                    <StudentReportCard
                        student={student}
                        classData={classData}
                        settings={settings}
                        studentResultData={studentResultData}
                        logos={logos}
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
                    logging: true, // Enable verbose logging for easier debugging
                });
                
                const imgData = canvas.toDataURL('image/png');
                const { width: pageWidth, height: pageHeight } = pdf.internal.pageSize;
    
                if (i > 0) {
                    pdf.addPage();
                }
                pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
                
                setExportProgress(Math.round(((i + 1) / studentsToExport.length) * 100));
            }
    
            pdf.save(`نتائج-${selectedStage}.pdf`);
    
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
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">تصدير النتائج</h2>
            
            {isExporting && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center z-50 text-white">
                    <Loader2 className="animate-spin h-16 w-16 mb-4" />
                    <p className="text-2xl font-bold mb-2">جاري التصدير...</p>
                    <div className="w-1/2 bg-gray-600 rounded-full h-4">
                        <div className="bg-cyan-500 h-4 rounded-full" style={{ width: `${exportProgress}%` }}></div>
                    </div>
                    <p className="mt-2 text-lg">{exportProgress}%</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Column 1: Selections */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-md font-bold text-gray-700 mb-2">1. اختر المرحلة الدراسية</label>
                        <select onChange={handleStageChange} value={selectedStage} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500">
                            <option value="">-- اختر مرحلة --</option>
                            {GRADE_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                        </select>
                    </div>

                    {selectedStage && (
                        <div>
                            <label className="block text-md font-bold text-gray-700 mb-2">2. اختر الشعبة (أو الشعب)</label>
                            <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                                {classesInSelectedStage.length > 0 ? classesInSelectedStage.map(c => (
                                    <label key={c.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                        <input type="checkbox" checked={selectedClassIds.includes(c.id)} onChange={() => handleClassSelection(c.id)} className="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"/>
                                        <span className="font-semibold">{c.stage} - {c.section}</span>
                                        <span className="text-sm text-gray-500">({(c.students || []).length} طالب)</span>
                                    </label>
                                )) : <p className="text-gray-500">لا توجد شعب لهذه المرحلة.</p>}
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-md font-bold text-gray-700 mb-2">3. اختر نوع النتيجة (للتصدير)</label>
                        <select onChange={e => setResultType(e.target.value)} value={resultType} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500">
                             {RESULT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                </div>

                {/* Column 2: Logos & Actions */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-md font-bold text-gray-700 mb-2">4. اختر الشعارات (اختياري)</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-600">شعار الوزارة</label>
                                <input type="file" onChange={e => handleLogoChange(e, 'ministry')} accept="image/*" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"/>
                                {logos.ministry && <img src={logos.ministry} alt="Ministry Logo Preview" className="mt-2 h-16 w-16 object-contain rounded-full border p-1" />}
                            </div>
                             <div>
                                <label className="text-sm font-medium text-gray-600">شعار المدرسة</label>
                                <input type="file" onChange={e => handleLogoChange(e, 'school')} accept="image/*" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"/>
                                {logos.school && <img src={logos.school} alt="School Logo Preview" className="mt-2 h-16 w-16 object-contain rounded-full border p-1" />}
                            </div>
                        </div>
                    </div>
                    
                    <div className="border-t pt-6">
                        <label className="block text-md font-bold text-gray-700 mb-3 text-center">5. تنفيذ التصدير</label>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button onClick={handleExportPdf} disabled={selectedClassIds.length === 0 || isExporting} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition shadow-md disabled:bg-gray-400">
                                <FileText size={20} />
                                تصدير بطاقات النتائج (PDF)
                            </button>
                            <button onClick={handleExportExcel} disabled={selectedClassIds.length === 0 || isExporting} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition shadow-md disabled:bg-gray-400">
                                <Download size={20} />
                                تصدير كشف درجات (Excel)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
