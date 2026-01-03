import React, { useState, useMemo } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { ClassData, SchoolSettings, Student, StudentResult, CalculatedGrade } from '../../types.ts';
import { GRADE_LEVELS } from '../../constants.ts';
import { calculateStudentResult } from '../../lib/gradeCalculator.ts';
import { Loader2, FileDown, Upload, BarChart2, Download } from 'lucide-react';
import GradeBoardPage from './GradeBoardPage.tsx';

declare const jspdf: any;
declare const html2canvas: any;
declare const XLSX: any;
declare const ExcelJS: any;

const STUDENTS_PER_PAGE = 20;
const MINISTERIAL_STAGES = ['الثالث متوسط', 'السادس العلمي', 'السادس الادبي'];

export default function GradeBoardExporter({ classes, settings }: { classes: ClassData[], settings: SchoolSettings }) {
    const [selectedStage, setSelectedStage] = useState('');
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [ministryLogo, setMinistryLogo] = useState<string | null>(null);
    const [reportPages, setReportPages] = useState<Student[][]>([]);
    const [resultsData, setResultsData] = useState<Map<string, { finalCalculatedGrades: Record<string, CalculatedGrade>, result: StudentResult }>>(new Map());

    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    const classesInSelectedStage = useMemo(() => {
        return selectedStage ? classes.filter(c => c.stage === selectedStage) : [];
    }, [selectedStage, classes]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setMinistryLogo(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const handleGeneratePreview = () => {
        const classesToProcess = classes.filter(c => selectedClassIds.includes(c.id));
        if (classesToProcess.length === 0) {
            alert("يرجى اختيار شعبة واحدة على الأقل.");
            return;
        }

        const allStudents = classesToProcess.flatMap(c => c.students || []).sort((a, b) => {
            const aId = a.examId || '';
            const bId = b.examId || '';
            const numA = parseInt(aId, 10);
            const numB = parseInt(bId, 10);
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            return aId.localeCompare(bId, undefined, { numeric: true });
        });
        
        const newResultsData = new Map();
        allStudents.forEach(student => {
            const studentClass = classesToProcess.find(c => (c.students || []).some(s => s.id === student.id));
            if (studentClass) {
                newResultsData.set(student.id, calculateStudentResult(student, studentClass.subjects || [], settings, studentClass));
            }
        });
        setResultsData(newResultsData);

        const pages: Student[][] = [];
        for (let i = 0; i < allStudents.length; i += STUDENTS_PER_PAGE) {
            pages.push(allStudents.slice(i, i + STUDENTS_PER_PAGE));
        }
        setReportPages(pages);
    };

    const handleExportExcel = async () => {
        if (reportPages.length === 0) {
            alert('يرجى إنشاء معاينة للبورد أولاً.');
            return;
        }
    
        const allStudents = reportPages.flat();
        if (allStudents.length === 0) {
            alert('لا يوجد طلاب للتصدير.');
            return;
        }
    
        const selectedClassData = classes.find(c => c.stage === selectedStage);
        if (!selectedClassData) {
            alert('لم يتم العثور على بيانات الصف المحدد.');
            return;
        }
        
        const subjects = selectedClassData.subjects || [];
        const isMinisterial = MINISTERIAL_STAGES.includes(selectedClassData.stage);
    
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('بورد الدرجات', {
            views: [{ rightToLeft: true }]
        });
    
        const headerColumns = [
            { header: 'ت', key: 'seq', width: 5 },
            { header: 'اسم الطالب', key: 'name', width: 35 },
            { header: 'الرقم الامتحاني', key: 'examId', width: 18 },
            ...subjects.map(s => ({ header: s.name, key: s.name, width: 15 })),
            { header: 'النتيجة', key: 'result', width: 20 },
        ];
        worksheet.columns = headerColumns;

        worksheet.getRow(1).eachCell(cell => {
            cell.font = { bold: true, size: 12 };
            cell.fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'FFD3D3D3'}
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
    
        allStudents.forEach((student, index) => {
            const studentResult = resultsData.get(student.id);
            const rowValues: (string | number | null)[] = [index + 1, student.name, student.examId || null];
    
            subjects.forEach(subject => {
                rowValues.push(null); // Placeholder, will be styled below
            });
    
            let resultText = '';
            if (studentResult) {
                if (isMinisterial) {
                    resultText = (studentResult.result.status === 'مؤهل' || studentResult.result.status === 'مؤهل بقرار') ? 'مؤهل' : 'غير مؤهل';
                } else {
                     resultText = studentResult.result.status === 'ناجح' ? 'ناجح' : (studentResult.result.status === 'مكمل' ? 'مكمل' : 'راسب');
                }
            }
            rowValues.push(resultText);
    
            const newRow = worksheet.addRow(rowValues);
            newRow.height = 25;
    
            subjects.forEach((subject, subjIndex) => {
                const cell = newRow.getCell(4 + subjIndex);
                const calculated = studentResult?.finalCalculatedGrades?.[subject.name];
                
                const originalGrade = isMinisterial ? calculated?.annualPursuit : calculated?.finalGrade1st;
                const decisionGrade = isMinisterial ? calculated?.annualPursuitWithDecision : calculated?.finalGradeWithDecision;
                const decisionApplied = isMinisterial ? (calculated?.decisionAppliedOnPursuit || 0) : (calculated?.decisionApplied || 0);
    
                if (decisionApplied > 0 && decisionGrade === 50 && originalGrade && originalGrade < 50) {
                    cell.value = {
                        richText: [
                            { text: `${originalGrade} `, font: { color: { argb: 'FFFF0000' }, strike: true } },
                            { text: `${decisionGrade}`, font: { color: { argb: 'FF000000' }, bold: true } }
                        ]
                    };
                } else if (decisionGrade !== null && decisionGrade !== undefined) {
                    cell.value = decisionGrade;
                    if (decisionGrade < 50) {
                        cell.font = { color: { argb: 'FFFF0000' }, bold: true };
                    }
                } else {
                    cell.value = '';
                }
            });
            
            const resultCell = newRow.getCell(4 + subjects.length);
            if (resultText === 'راسب' || resultText === 'غير مؤهل' || resultText === 'مكمل') {
                resultCell.font = { color: { argb: 'FFFF0000' }, bold: true };
            } else if (resultText === 'ناجح' || resultText === 'مؤهل') {
                resultCell.font = { bold: true };
            }
    
            newRow.eachCell(cell => {
                 cell.alignment = { vertical: 'middle', horizontal: 'center' };
                 cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            });
        });
    
        workbook.xlsx.writeBuffer().then((buffer: any) => {
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `بورد_درجات-${selectedStage}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        });
    };

    const handleExportPdf = async () => {
        if (reportPages.length === 0) {
            alert('يرجى إنشاء معاينة للبورد أولاً.');
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
        const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a3' });
        
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        const renderComponent = (component: React.ReactElement) => new Promise<void>(resolve => {
            root.render(component);
            setTimeout(resolve, 500);
        });

        const selectedClassData = classes.find(c => c.stage === selectedStage);
        if (!selectedClassData) {
             alert('لم يتم العثور على بيانات الصف المحدد.');
             setIsExporting(false);
             return;
        }

        try {
            await document.fonts.ready;
            for (let i = 0; i < reportPages.length; i++) {
                await renderComponent(
                    <GradeBoardPage
                        settings={settings}
                        ministryLogo={ministryLogo}
                        students={reportPages[i]}
                        classData={selectedClassData}
                        resultsData={resultsData}
                        pageInfo={{ pageNumber: i + 1, startingIndex: i * STUDENTS_PER_PAGE }}
                    />
                );

                const reportElement = tempContainer.children[0] as HTMLElement;
                const canvas = await html2canvas(reportElement, { scale: 1.5, useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const canvasAspectRatio = canvasWidth / canvasHeight;
                
                let imgWidth = pdfWidth;
                let imgHeight = imgWidth / canvasAspectRatio;

                if (imgHeight > pdfHeight) {
                    imgHeight = pdfHeight;
                    imgWidth = imgHeight * canvasAspectRatio;
                }
                
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', (pdfWidth - imgWidth) / 2, (pdfHeight - imgHeight) / 2, imgWidth, imgHeight, undefined, 'FAST');
                setExportProgress(Math.round(((i + 1) / reportPages.length) * 100));
            }
            pdf.save(`بورد_درجات-${selectedStage}.pdf`);
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
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">إعداد بورد الدرجات</h2>
            
            {isExporting && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center z-50 text-white">
                    <Loader2 className="animate-spin h-16 w-16 mb-4" />
                    <p className="text-2xl font-bold mb-2">جاري التصدير...</p>
                    <div className="w-1/2 bg-gray-600 rounded-full h-4"><div className="bg-cyan-500 h-4 rounded-full" style={{ width: `${exportProgress}%` }}></div></div>
                    <p className="mt-2 text-lg">{exportProgress}%</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                    <label className="block text-md font-bold text-gray-700 mb-2">1. اختر المرحلة الدراسية</label>
                    <select onChange={e => { setSelectedStage(e.target.value); setSelectedClassIds([]); setReportPages([]); }} value={selectedStage} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500">
                        <option value="">-- اختر مرحلة --</option>
                        {GRADE_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-md font-bold text-gray-700 mb-2">2. اختر الشعب</label>
                    <div className="p-2 border rounded-lg max-h-32 overflow-y-auto bg-gray-50">
                        {selectedStage && classesInSelectedStage.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
                 <div>
                    <label className="block text-md font-bold text-gray-700 mb-2">3. شعار الوزارة (اختياري)</label>
                    <div className="flex items-center gap-4">
                        <input type="file" onChange={handleLogoChange} accept="image/*" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"/>
                        {ministryLogo && <img src={ministryLogo} alt="Logo Preview" className="h-12 w-12 object-contain rounded-full border p-1" />}
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-4 mt-4 border-t pt-6">
                 <button onClick={handleGeneratePreview} disabled={selectedClassIds.length === 0} className="flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition disabled:bg-gray-400">
                    <BarChart2 size={20} />
                    <span>عرض البورد</span>
                </button>
                {reportPages.length > 0 && (
                    <>
                        <button onClick={handleExportPdf} disabled={isExporting} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition disabled:bg-gray-400">
                            <FileDown size={20} />
                            <span>تصدير PDF</span>
                        </button>
                         <button onClick={handleExportExcel} disabled={isExporting} className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:bg-gray-400">
                            <Download size={20} />
                            <span>تصدير Excel</span>
                        </button>
                    </>
                )}
            </div>

            {reportPages.length > 0 && (() => {
                const selectedClassDataForPreview = classes.find(c => c.stage === selectedStage);
                if (!selectedClassDataForPreview) return <p className="text-center text-red-500 mt-4">خطأ: لم يتم العثور على بيانات الصف للمرحلة المحددة.</p>;

                return (
                    <div className="mt-8">
                        <h3 className="text-xl font-bold text-center mb-4">معاينة البورد</h3>
                        <div className="space-y-8">
                            {reportPages.map((pageStudents, index) => (
                                <div key={index} className="p-4 bg-gray-100 rounded-lg overflow-x-auto shadow-inner">
                                    <GradeBoardPage
                                        settings={settings}
                                        ministryLogo={ministryLogo}
                                        students={pageStudents}
                                        classData={selectedClassDataForPreview}
                                        resultsData={resultsData}
                                        pageInfo={{ pageNumber: index + 1, startingIndex: index * STUDENTS_PER_PAGE }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
