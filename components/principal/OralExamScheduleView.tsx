import React, { useState, useMemo, useEffect } from 'react';
import * as ReactDOM from 'react-dom/client';
import useLocalStorage from '../../hooks/useLocalStorage.ts';
import type { SchoolSettings, ClassData } from '../../types.ts';
import { FileText, Loader2 } from 'lucide-react';
import OralExamSchedulePDFPage from './OralExamSchedulePDFPage.tsx';
import { GRADE_LEVELS } from '../../constants.ts';

declare const jspdf: any;
declare const html2canvas: any;

interface OralExamScheduleViewProps {
    setCurrentPageKey: (key: any) => void;
    settings: SchoolSettings;
    classes: ClassData[];
}

type ScheduleData = Record<string, {
    day: string;
    date: string;
    subject1: string;
    subject2: string;
    subject3: string;
    subject4: string;
}>;


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


export default function OralExamScheduleView({ setCurrentPageKey, settings, classes }: OralExamScheduleViewProps) {
    const [examType, setExamType] = useLocalStorage('oralExam_examType', 'نصف السنة');
    const [examRound, setExamRound] = useLocalStorage('oralExam_examRound', 'الأول');
    const [startDate, setStartDate] = useLocalStorage('oralExam_startDate', '');
    const [scheduleData, setScheduleData] = useLocalStorage<ScheduleData>('oralExam_scheduleData', {});
    const [isExporting, setIsExporting] = useState(false);

    const relevantStages = useMemo(() => {
        const stages = Array.from(new Set(classes.map(c => c.stage)));
        return stages.sort((a, b) => GRADE_LEVELS.indexOf(a) - GRADE_LEVELS.indexOf(b));
    }, [classes]);

    useEffect(() => {
        // Initialize schedule data if it's empty
        if (Object.keys(scheduleData).length === 0 && relevantStages.length > 0) {
            const initialData: ScheduleData = {};
            relevantStages.forEach(stage => {
                initialData[stage] = { day: '', date: '', subject1: '', subject2: '', subject3: '', subject4: '' };
            });
            setScheduleData(initialData);
        }
    }, [relevantStages, scheduleData, setScheduleData]);

    useEffect(() => {
        if (startDate) {
            const date = new Date(startDate);
            const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
            
            const newScheduleData: ScheduleData = {};
            relevantStages.forEach((stage, index) => {
                const currentDate = new Date(date);
                currentDate.setDate(date.getDate() + index);

                newScheduleData[stage] = {
                    ...scheduleData[stage], // Keep existing subject data
                    day: days[currentDate.getDay()],
                    date: currentDate.toLocaleDateString('ar-EG-u-nu-latn'),
                };
            });
            setScheduleData(newScheduleData);
        }
    }, [startDate, relevantStages]);


    const handleDataChange = (stage: string, field: string, value: string) => {
        setScheduleData(prev => ({
            ...prev,
            [stage]: {
                ...prev[stage],
                [field]: value,
            }
        }));
    };
    
    const handleExport = async () => {
        setIsExporting(true);
        await new Promise(resolve => setTimeout(resolve, 100));

        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        const renderComponent = (component: React.ReactElement) => new Promise<void>(resolve => {
            root.render(component);
            setTimeout(resolve, 500);
        });

        try {
            await renderComponent(
                <OralExamSchedulePDFPage
                    settings={settings}
                    examType={examType}
                    examRound={examRound}
                    scheduleData={scheduleData}
                />
            );
            
            const page = tempContainer.children[0] as HTMLElement;
            if(!page) throw new Error("PDF export element not found");

            const canvas = await html2canvas(page, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            
            const { jsPDF } = jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
            pdf.save('جدول_الامتحانات_الشفوية.pdf');

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
            title="جدول الامتحانات الشفوية"
            onPrev={() => setCurrentPageKey('specialization_committees')}
            onNext={() => setCurrentPageKey('written_exam_schedule')}
        >
             <div className="bg-gray-50 p-6 rounded-lg border shadow-sm space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputField label="نوع الامتحان" value={examType} onChange={e => setExamType(e.target.value)} />
                    <InputField label="الدور" value={examRound} onChange={e => setExamRound(e.target.value)} />
                    <InputField label="تاريخ البدء" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                 </div>
                 <div className="text-center pt-4">
                    <button onClick={handleExport} disabled={isExporting} className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:bg-gray-400">
                        {isExporting ? <Loader2 className="animate-spin" /> : <FileText className="inline-block ml-2"/>}
                        {isExporting ? 'جاري التصدير...' : 'تصدير PDF'}
                    </button>
                </div>
            </div>
            
            <div className="mt-8 overflow-x-auto">
                 <h3 className="text-xl font-bold text-center mb-4">تعديل الجدول</h3>
                 <table className="min-w-full border-collapse border border-gray-400">
                     <thead className="bg-cyan-100">
                         <tr>
                            <th className="p-2 border">الصف</th>
                            <th className="p-2 border">اليوم</th>
                            <th className="p-2 border">التاريخ</th>
                            <th className="p-2 border">المادة الاولى</th>
                            <th className="p-2 border">المادة الثانية</th>
                            <th className="p-2 border">المادة الثالثة</th>
                            <th className="p-2 border">المادة الرابعة</th>
                         </tr>
                     </thead>
                     <tbody>
                        {relevantStages.map(stage => (
                            <tr key={stage} className="hover:bg-gray-50">
                                <td className="p-2 border font-bold">{stage}</td>
                                <td className="p-2 border">{scheduleData[stage]?.day || ''}</td>
                                <td className="p-2 border">{scheduleData[stage]?.date || ''}</td>
                                <EditableCell value={scheduleData[stage]?.subject1 || ''} onChange={val => handleDataChange(stage, 'subject1', val)} />
                                <EditableCell value={scheduleData[stage]?.subject2 || ''} onChange={val => handleDataChange(stage, 'subject2', val)} />
                                <EditableCell value={scheduleData[stage]?.subject3 || ''} onChange={val => handleDataChange(stage, 'subject3', val)} />
                                <EditableCell value={scheduleData[stage]?.subject4 || ''} onChange={val => handleDataChange(stage, 'subject4', val)} />
                            </tr>
                        ))}
                     </tbody>
                 </table>
            </div>
        </PageWrapper>
    );
}

const InputField = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
        <label className="font-bold text-lg">{label}:</label>
        <input {...props} className="w-full p-2 border rounded-md mt-1" />
    </div>
);

const EditableCell = ({ value, onChange }: { value: string; onChange: (val: string) => void; }) => (
    <td className="p-0 border">
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full h-full p-2 bg-transparent border-0 focus:outline-none focus:bg-yellow-100 text-center"
        />
    </td>
);
