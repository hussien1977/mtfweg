import React, { useState, useMemo } from 'react';
import * as ReactDOM from 'react-dom/client';
import useLocalStorage from '../../hooks/useLocalStorage.ts';
import type { SchoolSettings, ClassData } from '../../types.ts';
import { FileText, Loader2 } from 'lucide-react';
import QuestionsAnswersReceiptPDF from './QuestionsAnswersReceiptPDF.tsx';

declare const jspdf: any;
declare const html2canvas: any;

interface QuestionsAnswersReceiptViewProps {
    setCurrentPageKey: (key: any) => void;
    settings: SchoolSettings;
    classes: ClassData[];
}

export interface PageConfig {
    grade: string;
    subjects: string[];
    teacherLabel: 'اسم المعلم' | 'اسم المدرس';
}

const PageWrapper = ({ title, children, onPrev, onNext }: { title: string, children?: React.ReactNode, onPrev: () => void, onNext: () => void }) => (
    <div className="bg-white p-8 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
            <button onClick={onPrev} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">&larr; الصفحة السابقة</button>
            <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
            <button onClick={onNext} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">الصفحة التالية &rarr;</button>
        </div>
        {children}
    </div>
);

const getPagesConfig = (schoolLevel: string, classes: ClassData[]): PageConfig[] => {
    const isPrimary = schoolLevel === 'ابتدائية';
    const teacherLabel = isPrimary ? 'اسم المعلم' : 'اسم المدرس';
    
    const uniqueStages = Array.from(new Set(classes.map(c => c.stage)));
    const gradeOrder = [
        'الاول ابتدائي', 'الثاني ابتدائي', 'الثالث ابتدائي', 'الرابع ابتدائي', 'الخامس ابتدائي', 'السادس ابتدائي',
        'الاول متوسط', 'الثاني متوسط', 'الثالث متوسط', 
        'الرابع العلمي', 'الرابع الادبي', 'الخامس العلمي', 'الخامس الادبي', 'السادس العلمي', 'السادس الادبي'
    ];
    
    const sortedStages = uniqueStages.sort((a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b));

    return sortedStages.map(stage => {
        const classForStage = classes.find(c => c.stage === stage);
        const subjects = (classForStage?.subjects || [])
            .map(s => s.name)
            .filter(name => !['التربية الرياضية', 'التربية الفنية'].includes(name));
        
        return {
            grade: `الصف : ${stage}`,
            subjects: subjects,
            teacherLabel: teacherLabel
        };
    });
};

export default function QuestionsAnswersReceiptView({ setCurrentPageKey, settings, classes }: QuestionsAnswersReceiptViewProps) {
    const [subtitle, setSubtitle] = useLocalStorage('qaReceiptSubtitle', '....................');
    const [teacherNames, setTeacherNames] = useLocalStorage<Record<string, Record<string, string>>>('qaReceiptTeacherNames', {});
    const [isExporting, setIsExporting] = useState(false);

    const pagesConfig = useMemo(() => getPagesConfig(settings.schoolLevel || 'متوسطة', classes), [settings.schoolLevel, classes]);

    const handleTeacherNameChange = (grade: string, subject: string, name: string) => {
        setTeacherNames(prev => ({
            ...prev,
            [grade]: {
                ...(prev[grade] || {}),
                [subject]: name,
            },
        }));
    };
    
    const handleExport = async () => {
        setIsExporting(true);
        await new Promise(resolve => setTimeout(resolve, 100));

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
        
        try {
            // Render all pages at once in a hidden div
            await renderComponent(
                <QuestionsAnswersReceiptPDF
                    settings={settings}
                    subtitle={subtitle}
                    pagesConfig={pagesConfig}
                    teacherNames={teacherNames}
                />
            );
            
            const pages = document.querySelectorAll('.pdf-page-qa-receipt');
            if (pages.length === 0) throw new Error("PDF export element not found");
            
            for(let i = 0; i < pages.length; i++) {
                 const canvas = await html2canvas(pages[i] as HTMLElement, { scale: 2, useCORS: true });
                 const imgData = canvas.toDataURL('image/png');
                 if (i > 0) pdf.addPage();
                 pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
            }
            pdf.save(`استلام_اسئلة_واجوبة.pdf`);

        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء التصدير.");
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
        }
    };


    return (
        <PageWrapper 
            title="استلام الأسئلة والأجوبة" 
            onPrev={() => setCurrentPageKey('written_exam_schedule')}
            onNext={() => setCurrentPageKey('seating_charts')}
        >
            <div className="bg-gray-50 p-6 rounded-lg border shadow-sm space-y-4">
                 <div className="flex items-center gap-4">
                    <label className="font-bold text-lg">عنوان الامتحان:</label>
                    <input 
                        type="text"
                        value={subtitle}
                        onChange={e => setSubtitle(e.target.value)}
                        className="p-2 border rounded-md flex-grow"
                        placeholder="نصف السنة، نهاية الكورس الأول..."
                    />
                </div>
                 <div className="text-center">
                    <button onClick={handleExport} disabled={isExporting} className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:bg-gray-400">
                        {isExporting ? <Loader2 className="animate-spin" /> : <FileText className="inline-block ml-2"/>}
                        {isExporting ? 'جاري التصدير...' : 'تصدير PDF'}
                    </button>
                </div>
            </div>

            <div className="mt-8 space-y-8 bg-gray-100 p-4 rounded-lg">
                <h3 className="text-xl font-bold text-center">معاينة وتعديل أسماء المعلمين/المدرسين</h3>
                 <div className="my-4 text-center">
                    <div className="p-3 bg-blue-900 text-white font-bold rounded-t-lg">اكتب اسم المعلم / المدرس الذي تم استلام الاسئلة والاجوبة منه و للدورين وحسب اختصاصة او تستطيع تصدير ملف pdf لكتابة الاسم يدويا" ,</div>
                    <div className="p-3 bg-black text-red-500 font-bold rounded-b-lg">نصائح مهمة لا تستلم لدور واحد فقط , ولا تستلم الاسئلة دون وجود الاجوبة النموذجية , تأكد من غلق المغلف جيدا" وختمه وتوقيع المعلم عليه مع و جود كافة المعلومات الضرورية مدونة على المغلف</div>
                </div>
                {pagesConfig.map(page => (
                    <div key={page.grade} className="p-4 bg-white rounded-lg shadow-md">
                        <h4 className="text-lg font-bold mb-2 text-cyan-700">{page.grade}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {page.subjects.map(subject => (
                                <div key={subject}>
                                    <label className="block text-sm font-medium text-gray-700">{subject}</label>
                                    <input
                                        type="text"
                                        value={teacherNames[page.grade]?.[subject] || ''}
                                        onChange={e => handleTeacherNameChange(page.grade, subject, e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder={`اسم ${page.teacherLabel === 'اسم المعلم' ? 'المعلم' : 'المدرس'}`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </PageWrapper>
    );
}