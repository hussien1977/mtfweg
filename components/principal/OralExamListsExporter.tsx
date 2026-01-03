import React, { useState, useMemo } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { ClassData, SchoolSettings, Student } from '../../types.ts';
import { GRADE_LEVELS } from '../../constants.ts';
import { Loader2, FileDown, BarChart2, AlertCircle } from 'lucide-react';
import OralExamListPage from './OralExamListPage.tsx';
import { v4 as uuidv4 } from 'uuid';

declare const jspdf: any;
declare const html2canvas: any;

const ORAL_EXAM_SUBJECTS = ['التربية الاسلامية', 'اللغة العربية', 'اللغة الانكليزية', 'الحاسوب', 'اللغة الفرنسية'];
const STUDENTS_PER_PAGE = 20;


export default function OralExamListsExporter({ classes, settings }: { classes: ClassData[], settings: SchoolSettings }) {
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedStage, setSelectedStage] = useState('');
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [logos, setLogos] = useState<{ school: string | null; ministry: string | null }>({ school: null, ministry: null });
    
    // New state for committee members
    const [committeeMemberName, setCommitteeMemberName] = useState('');
    const [committeeHeadName, setCommitteeHeadName] = useState('');

    const [examRound, setExamRound] = useState('الأول');
    const [examType, setExamType] = useState('نصف السنة');
    
    const [reportPages, setReportPages] = useState<Student[][]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    const classesInSelectedStage = useMemo(() => {
        return selectedStage ? classes.filter(c => c.stage === selectedStage) : [];
    }, [selectedStage, classes]);

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
    
    const handleGeneratePreview = () => {
        const classesToProcess = classes.filter(c => selectedClassIds.includes(c.id));
        if (classesToProcess.length === 0) {
            alert("يرجى اختيار شعبة واحدة على الأقل.");
            return;
        }

        const allStudents = classesToProcess.flatMap(c => c.students || [])
            .filter(s => s.enrollmentStatus !== 'transferred' && s.enrollmentStatus !== 'dismissed')
            .sort((a, b) => {
                const aId = a.examId || '';
                const bId = b.examId || '';
                const numA = parseInt(aId, 10);
                const numB = parseInt(bId, 10);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }
                return a.name.localeCompare(b.name, 'ar');
            });
        
        const pages: Student[][] = [];
        for (let i = 0; i < allStudents.length; i += STUDENTS_PER_PAGE) {
            pages.push(allStudents.slice(i, i + STUDENTS_PER_PAGE));
        }
        setReportPages(pages);
    };

    const handleExportPdf = async () => {
        if (reportPages.length === 0) {
            alert('يرجى إنشاء معاينة أولاً.');
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

        const classesToProcess = classes.filter(c => selectedClassIds.includes(c.id));
        const combinedSectionNames = classesToProcess.map(c => c.section).join(' - ');
        
        const classTemplate = classes.find(c => c.stage === selectedStage);
        if (!classTemplate) {
            alert(`خطأ: لا توجد بيانات صف للمرحلة ${selectedStage}. لا يمكن التصدير.`);
            setIsExporting(false);
            return;
        }
        
        const syntheticClassData: ClassData = {
            ...classTemplate,
            id: uuidv4(), // provide a dummy id
            section: combinedSectionNames,
        };

        try {
            await document.fonts.ready;
            for (let i = 0; i < reportPages.length; i++) {
                const startingIndex = i * STUDENTS_PER_PAGE;
                
                await renderComponent(
                    <OralExamListPage
                        settings={settings}
                        logos={logos}
                        students={reportPages[i]}
                        classData={syntheticClassData}
                        subjectName={selectedSubject}
                        pageInfo={{ pageNumber: i + 1, totalPages: reportPages.length }}
                        isExporting={true}
                        committeeMemberName={committeeMemberName}
                        committeeHeadName={committeeHeadName}
                        examRound={examRound}
                        examType={examType}
                        startingIndex={startingIndex}
                    />
                );

                const reportElement = tempContainer.children[0] as HTMLElement;
                const canvas = await html2canvas(reportElement, { scale: 1.5, useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
                setExportProgress(Math.round(((i + 1) / reportPages.length) * 100));
            }
            pdf.save(`قائمة_شفوي-${selectedSubject}-${selectedStage}.pdf`);
        } catch (error) {
            console.error("PDF Export error:", error);
            alert(`حدث خطأ أثناء التصدير: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
        }
    };
    
    const isTemplateReady = ORAL_EXAM_SUBJECTS.includes(selectedSubject);

    const syntheticClassDataForPreview = useMemo(() => {
        if (selectedClassIds.length === 0) return null;
        const classesToProcess = classes.filter(c => selectedClassIds.includes(c.id));
        if (classesToProcess.length === 0) return null;
        const combinedSectionNames = classesToProcess.map(c => c.section).join(' - ');
        const classTemplate = classes.find(c => c.stage === selectedStage);
        if (!classTemplate) return null;
        
        return {
            ...classTemplate,
            section: combinedSectionNames,
        };
    }, [selectedClassIds, classes, selectedStage]);

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">إعداد قوائم الامتحان الشفوي</h2>
            
            {isExporting && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center z-50 text-white">
                    <Loader2 className="animate-spin h-16 w-16 mb-4" />
                    <p className="text-2xl font-bold mb-2">جاري التصدير...</p>
                    <div className="w-1/2 bg-gray-600 rounded-full h-4"><div className="bg-cyan-500 h-4 rounded-full" style={{ width: `${exportProgress}%` }}></div></div>
                    <p className="mt-2 text-lg">{exportProgress}%</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-md font-bold text-gray-700 mb-2">1. اختر المادة الدراسية</label>
                    <select onChange={e => { setSelectedSubject(e.target.value); setSelectedStage(''); setSelectedClassIds([]); setReportPages([]); }} value={selectedSubject} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500">
                        <option value="">-- اختر مادة --</option>
                        {ORAL_EXAM_SUBJECTS.map(subject => <option key={subject} value={subject}>{subject}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-md font-bold text-gray-700 mb-2">2. اختر المرحلة الدراسية</label>
                    <select onChange={e => { setSelectedStage(e.target.value); setSelectedClassIds([]); setReportPages([]); }} value={selectedStage} disabled={!selectedSubject} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-200">
                        <option value="">-- اختر مرحلة --</option>
                        {GRADE_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-md font-bold text-gray-700 mb-2">3. اختر الشعب</label>
                    <div className="p-2 border rounded-lg max-h-32 overflow-y-auto bg-gray-50">
                        {selectedStage ? (
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
                    <label className="block text-md font-bold text-gray-700 mb-2 text-blue-600">4. اختر الدور</label>
                    <select onChange={e => setExamRound(e.target.value)} value={examRound} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 text-blue-600 font-semibold">
                        <option value="الأول">الأول</option>
                        <option value="الثاني">الثاني</option>
                    </select>
                </div>
                <div>
                    <label className="block text-md font-bold text-gray-700 mb-2 text-blue-600">5. اختر نوع الامتحان</label>
                    <select onChange={e => setExamType(e.target.value)} value={examType} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 text-blue-600 font-semibold">
                        <option value="نصف السنة">نصف السنة</option>
                        <option value="نهاية السنة">نهاية السنة</option>
                    </select>
                </div>
                {selectedSubject === 'الحاسوب' && (
                    <>
                        <div>
                            <label htmlFor="committeeMemberName" className="block text-md font-bold text-gray-700 mb-2">اسم عضو اللجنة</label>
                            <input
                                id="committeeMemberName"
                                type="text"
                                value={committeeMemberName}
                                onChange={e => setCommitteeMemberName(e.target.value)}
                                placeholder="ادخل اسم العضو هنا"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
                            />
                        </div>
                         <div>
                            <label htmlFor="committeeHeadName" className="block text-md font-bold text-gray-700 mb-2">اسم رئيس اللجنة</label>
                            <input
                                id="committeeHeadName"
                                type="text"
                                value={committeeHeadName}
                                onChange={e => setCommitteeHeadName(e.target.value)}
                                placeholder="ادخل اسم الرئيس هنا"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
                            />
                        </div>
                    </>
                )}
                <div>
                    <label className="block text-md font-bold text-gray-700 mb-2">6. شعار الوزارة (اختياري)</label>
                    <input type="file" onChange={e => handleLogoChange(e, 'ministry')} accept="image/*" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"/>
                    {logos.ministry && <img src={logos.ministry} alt="Logo Preview" className="mt-2 h-12 w-12 object-contain rounded-full border p-1" />}
                </div>
                <div>
                    <label className="block text-md font-bold text-gray-700 mb-2">7. شعار المدرسة (اختياري)</label>
                    <input type="file" onChange={e => handleLogoChange(e, 'school')} accept="image/*" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"/>
                    {logos.school && <img src={logos.school} alt="Logo Preview" className="mt-2 h-12 w-12 object-contain rounded-full border p-1" />}
                </div>
            </div>

            <div className="flex justify-center gap-4 mt-4 border-t pt-6">
                 <button onClick={handleGeneratePreview} disabled={selectedClassIds.length === 0 || !isTemplateReady} className="flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition disabled:bg-gray-400">
                    <BarChart2 size={20} />
                    <span>عرض القائمة</span>
                </button>
                {reportPages.length > 0 && (
                    <button onClick={handleExportPdf} disabled={isExporting} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition disabled:bg-gray-400">
                        <FileDown size={20} />
                        <span>تصدير PDF</span>
                    </button>
                )}
            </div>

            {!isTemplateReady && selectedSubject && (
                <div className="mt-4 p-4 bg-orange-100 text-orange-800 rounded-md flex items-center gap-3">
                    <AlertCircle />
                    <p className="font-semibold">لا يوجد قالب مخصص لهذه المادة بعد. سيتم استخدام تصميم افتراضي.</p>
                </div>
            )}

            {reportPages.length > 0 && syntheticClassDataForPreview && (
                <div className="mt-8">
                    <h3 className="text-xl font-bold text-center mb-4">معاينة القائمة</h3>
                    <div className="p-4 bg-gray-100 rounded-lg overflow-x-auto shadow-inner">
                        {reportPages.map((pageStudents, index) => (
                             <div key={index} className="mb-8">
                                <OralExamListPage
                                    settings={settings}
                                    logos={logos}
                                    students={pageStudents}
                                    classData={syntheticClassDataForPreview}
                                    subjectName={selectedSubject}
                                    pageInfo={{ pageNumber: index + 1, totalPages: reportPages.length }}
                                    isExporting={false}
                                    committeeMemberName={committeeMemberName}
                                    committeeHeadName={committeeHeadName}
                                    examRound={examRound}
                                    examType={examType}
                                    startingIndex={index * STUDENTS_PER_PAGE}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
