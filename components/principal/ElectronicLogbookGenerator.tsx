

import React, { useState, useMemo } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { ClassData, SchoolSettings, Student } from '../../types.ts';
import { AlertTriangle, BookCopy, FileDown, Loader2, Upload } from 'lucide-react';
import LogbookFormPage from './LogbookFormPage.tsx';

declare const jspdf: any;
declare const html2canvas: any;

const STAGES = [
    { key: 'الثالث متوسط', label: 'الثالث متوسط' },
    { key: 'السادس العلمي', label: 'السادس العلمي' },
    { key: 'السادس الادبي', label: 'السادس الأدبي' },
];

const STUDENTS_PER_PAGE = 25;

interface LogbookStudent {
    id: string;
    seq: number;
    firstName: string;
    fatherName: string;
    grandFatherName: string;
    greatGrandFatherName: string;
    birthYear: string;
    motherName: string;
    motherFatherName: string;
    notMuslim: string;
    languages: string;
    visionStatus: string;
    gender: string;
}
interface LogbookPage {
    students: LogbookStudent[];
}

export default function ElectronicLogbookGenerator({ classes, settings }: { classes: ClassData[], settings: SchoolSettings }) {
    const [view, setView] = useState<'initial' | 'selecting' | 'viewing'>('initial');
    const [selectedStage, setSelectedStage] = useState<string>('');
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [ministryLogo, setMinistryLogo] = useState<string | null>(null);
    const [pagesData, setPagesData] = useState<LogbookPage[]>([]);
    const [totalStudents, setTotalStudents] = useState(0);

    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    const classesInSelectedStage = useMemo(() => {
        return selectedStage ? classes.filter(c => c.stage === selectedStage) : [];
    }, [selectedStage, classes]);

    const handleStageSelect = (stageKey: string) => {
        setSelectedStage(stageKey);
        setView('selecting');
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setMinistryLogo(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const handleGenerate = () => {
        const studentsToProcess = classes
            .filter(c => selectedClassIds.includes(c.id))
            .flatMap(c => c.students || [])
            .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

        setTotalStudents(studentsToProcess.length);
            
        const genderCode = settings.schoolGender === 'بنين' ? '1' : (settings.schoolGender === 'بنات' ? '2' : '');

        const pages: LogbookPage[] = [];
        for (let i = 0; i < studentsToProcess.length; i += STUDENTS_PER_PAGE) {
            const chunk = studentsToProcess.slice(i, i + STUDENTS_PER_PAGE);
            const processedStudents = chunk.map((student, index): LogbookStudent => {
                const nameParts = student.name.split(' ');
                return {
                    id: student.id,
                    seq: i + index + 1,
                    firstName: nameParts[0] || '',
                    fatherName: nameParts[1] || '',
                    grandFatherName: nameParts[2] || '',
                    greatGrandFatherName: nameParts.slice(3).join(' ') || '',
                    birthYear: student.birthDate || '',
                    motherName: student.motherName || '',
                    motherFatherName: student.motherFatherName || '',
                    notMuslim: '',
                    languages: '',
                    visionStatus: '',
                    gender: genderCode,
                };
            });
            pages.push({ students: processedStudents });
        }
        setPagesData(pages);
        setView('viewing');
    };
    
    const handleDataUpdate = (pageIndex: number, studentIndex: number, field: keyof LogbookStudent, value: string) => {
        const newPagesData = [...pagesData];
        (newPagesData[pageIndex].students[studentIndex] as any)[field] = value;
        setPagesData(newPagesData);
    };

    const handleExportPdf = async () => {
        if (pagesData.length === 0) return;

        setIsExporting(true);
        setExportProgress(0);

        const { jsPDF } = jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        const renderComponent = (component: React.ReactElement) => new Promise<void>(resolve => {
            root.render(component);
            setTimeout(resolve, 500);
        });

        try {
            await document.fonts.ready;
            for (let i = 0; i < pagesData.length; i++) {
                const page = pagesData[i];
                await renderComponent(
                    <LogbookFormPage 
                        settings={settings}
                        pageData={page}
                        totalStudents={totalStudents}
                        ministryLogo={ministryLogo}
                        onUpdate={() => {}} // Not updating during PDF export
                        isPdfMode={true}
                    />
                );

                const reportElement = tempContainer.children[0] as HTMLElement;
                const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
                setExportProgress(Math.round(((i + 1) / pagesData.length) * 100));
            }
            pdf.save(`دفتر_الكتروني_${selectedStage}.pdf`);
        } catch (error) {
            console.error("PDF Export error:", error);
            alert(`حدث خطأ أثناء التصدير: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
        }
    };
    
    const renderInitialView = () => (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
            <div className="flex items-center gap-3 text-2xl font-bold text-gray-800 mb-4">
                <BookCopy className="w-8 h-8 text-cyan-600" />
                <h2>إنشاء الدفتر الالكتروني</h2>
            </div>
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded-md" role="alert">
                <div className="flex">
                    <div className="py-1"><AlertTriangle className="h-6 w-6 text-yellow-500 mr-4" /></div>
                    <div>
                        <p className="font-bold">تنبيه هام</p>
                        <p>يرجى التأكد من صحة جميع البيانات في صفحة "الإعدادات" قبل المتابعة، حيث أن النموذج يعتمد عليها بشكل كامل.</p>
                    </div>
                </div>
            </div>
            <div className="space-y-4">
                <p className="font-semibold text-lg">اختر المرحلة الدراسية لإنشاء الدفتر:</p>
                {STAGES.map((stage, index) => (
                    <button 
                        key={stage.key} 
                        onClick={() => handleStageSelect(stage.key)} 
                        disabled={index > 0} // Only first button is enabled
                        className="w-full text-right p-4 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition shadow-md flex items-center justify-between disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        <span>{stage.label}</span>
                        {index > 0 && <span className="text-xs bg-gray-500 px-2 py-1 rounded-full">قريباً</span>}
                    </button>
                ))}
            </div>
        </div>
    );

    const renderSelectionView = () => (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
            <button onClick={() => setView('initial')} className="mb-4 text-cyan-600 font-semibold">&larr; العودة</button>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">اختيار الشعب وتحميل الشعار لمرحلة: {selectedStage}</h2>
             <div>
                <label className="block text-md font-bold text-gray-700 mb-2">1. اختر الشعب</label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                    {classesInSelectedStage.length > 0 ? classesInSelectedStage.map(c => (
                        <label key={c.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                            <input type="checkbox" checked={selectedClassIds.includes(c.id)} onChange={() => setSelectedClassIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])} className="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"/>
                            <span className="font-semibold">{c.stage} - {c.section}</span>
                            <span className="text-sm text-gray-500">({(c.students || []).length} طالب)</span>
                        </label>
                    )) : <p className="text-gray-500">لا توجد شعب لهذه المرحلة.</p>}
                </div>
            </div>
            <div className="mt-6">
                <label className="block text-md font-bold text-gray-700 mb-2">2. تحميل شعار الوزارة (اختياري)</label>
                <div className="flex items-center gap-4">
                    <input type="file" onChange={handleLogoChange} accept="image/*" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"/>
                    {ministryLogo && <img src={ministryLogo} alt="Ministry Logo Preview" className="h-16 w-16 object-contain rounded-full border p-1" />}
                </div>
            </div>
             <div className="mt-8">
                <button onClick={handleGenerate} disabled={selectedClassIds.length === 0} className="w-full p-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition shadow-md disabled:bg-gray-400">
                    إنشاء الدفتر
                </button>
            </div>
        </div>
    );
    
    const renderViewingView = () => (
        <div>
            {isExporting && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center z-50 text-white">
                    <Loader2 className="animate-spin h-16 w-16 mb-4" />
                    <p className="text-2xl font-bold mb-2">جاري التصدير...</p>
                    <div className="w-1/2 bg-gray-600 rounded-full h-4"><div className="bg-cyan-500 h-4 rounded-full" style={{ width: `${exportProgress}%` }}></div></div>
                    <p className="mt-2 text-lg">{exportProgress}%</p>
                </div>
            )}
            <div className="bg-white p-4 rounded-xl shadow-lg mb-4 sticky top-0 z-10 flex justify-between items-center">
                <button onClick={() => setView('selecting')} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">
                    &larr; العودة للاختيار
                </button>
                <h2 className="text-xl font-bold">معاينة الدفتر الالكتروني</h2>
                <button onClick={handleExportPdf} disabled={isExporting} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition flex items-center gap-2">
                    <FileDown size={20} />
                    تصدير PDF
                </button>
            </div>
            <div className="space-y-8">
                {pagesData.map((page, index) => (
                    <div key={index} className="p-2 bg-white shadow-2xl rounded-lg">
                        <LogbookFormPage
                           settings={settings}
                           pageData={page}
                           totalStudents={totalStudents}
                           ministryLogo={ministryLogo}
                           onUpdate={(studentIndex, field, value) => handleDataUpdate(index, studentIndex, field, value)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );

    switch (view) {
        case 'initial': return renderInitialView();
        case 'selecting': return renderSelectionView();
        case 'viewing': return renderViewingView();
        default: return renderInitialView();
    }
}