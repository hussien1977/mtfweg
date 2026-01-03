import React, { useState } from 'react';
import * as ReactDOM from 'react-dom/client';
import useLocalStorage from '../../hooks/useLocalStorage.ts';
import type { SchoolSettings, ClassData } from '../../types.ts';
import { Printer, Upload, BarChart2, Loader2 } from 'lucide-react';
import WrittenExamSchedulePDF from './WrittenExamSchedulePDF.tsx';
import { GRADE_LEVELS } from '../../constants.ts';

declare const jspdf: any;
declare const html2canvas: any;

interface WrittenExamScheduleViewProps {
    setCurrentPageKey: (key: any) => void;
    settings: SchoolSettings;
    classes: ClassData[];
}

export interface ScheduleState {
    columns: string[];
    tableData: Record<number, Record<string, string>>;
    examTime: string;
}

export interface ScheduleConfig {
    examType: 'نصف السنة' | 'نهاية السنة';
    examRound: 'الأول' | 'الثاني';
    examDays: number;
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


const EditableCell: React.FC<{ value: string; onSave: (val: string) => void; }> = ({ value, onSave }) => {
    return (
        <td
            contentEditable
            suppressContentEditableWarning
            onBlur={e => onSave(e.target.innerText)}
            className="border border-black p-2 h-12 text-center align-middle font-semibold bg-white focus:outline-none focus:bg-yellow-100"
        >
            {value}
        </td>
    );
};

export default function WrittenExamScheduleView({ setCurrentPageKey, settings, classes }: WrittenExamScheduleViewProps) {
    const [config, setConfig] = useLocalStorage<ScheduleConfig>('writtenExamConfig_v1', {
        examType: 'نصف السنة',
        examRound: 'الأول',
        examDays: 8,
    });
    const [schoolLogo, setSchoolLogo] = useLocalStorage<string | null>('writtenExamSchoolLogo', null);
    const [generatedSchedule, setGeneratedSchedule] = useLocalStorage<ScheduleState | null>('writtenExamGeneratedSchedule', null);
    const [orientation, setOrientation] = useLocalStorage<'p' | 'l'>('writtenExamPdfOrientation', 'p');
    const [isExporting, setIsExporting] = useState(false);

    const handleConfigChange = (field: keyof typeof config, value: string | number) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setSchoolLogo(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleGenerate = () => {
        const existingStages = Array.from(new Set(classes.map(c => c.stage)));

        const filterStages = (stages: string[]) => {
            if (config.examType === 'نهاية السنة') {
                return stages.filter(stage => 
                    !stage.includes('الثالث متوسط') && 
                    !stage.includes('السادس') &&
                    !stage.includes('السادس ابتدائي')
                );
            }
            return stages;
        };
        
        const finalStages = filterStages(existingStages);
        
        const sortedFinalStages = finalStages.sort((a, b) => GRADE_LEVELS.indexOf(a) - GRADE_LEVELS.indexOf(b));
        
        const initialTableData: Record<number, Record<string, string>> = {};
        for (let i = 0; i < config.examDays; i++) {
            initialTableData[i] = { day: '', date: '', ...sortedFinalStages.reduce((acc, stage) => ({...acc, [stage]: ''}), {}) };
        }

        setGeneratedSchedule({
            columns: ['اليوم', 'التاريخ', ...sortedFinalStages],
            tableData: initialTableData,
            examTime: '.................'
        });
    };

    const handleTableDataChange = (rowIndex: number, colKey: string, value: string) => {
        if (!generatedSchedule) return;
        const newTableData = { ...generatedSchedule.tableData };
        newTableData[rowIndex][colKey] = value;
        setGeneratedSchedule({ ...generatedSchedule, tableData: newTableData });
    };

    const handleTimeChange = (value: string) => {
        if (!generatedSchedule) return;
        setGeneratedSchedule({ ...generatedSchedule, examTime: value });
    };
    
    const handleExport = async () => {
        if (!generatedSchedule) return;
        
        setIsExporting(true);
        await new Promise(resolve => setTimeout(resolve, 100));

        const { jsPDF } = jspdf;
        const pdf = new jsPDF(orientation, 'mm', 'a4');
        
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
                <WrittenExamSchedulePDF
                    settings={settings}
                    config={config}
                    schedule={generatedSchedule}
                    schoolLogo={schoolLogo}
                />
            );
            
            const page = document.getElementById('pdf-export-page');
            if(!page) throw new Error("PDF export element not found");

            const canvas = await html2canvas(page, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
            pdf.save(`جدول_امتحانات_${config.examType}.pdf`);

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
            title="جدول الامتحانات التحريرية" 
            onPrev={() => setCurrentPageKey('oral_exam_schedule')}
            onNext={() => setCurrentPageKey('questions_answers_receipt')}
        >
            <div className="bg-gray-50 p-6 rounded-lg border shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="font-bold">نوع الامتحان:</label>
                        <select value={config.examType} onChange={e => handleConfigChange('examType', e.target.value as any)} className="w-full mt-1 p-2 border rounded-md">
                            <option value="نصف السنة">نصف السنة</option>
                            <option value="نهاية السنة">نهاية السنة</option>
                        </select>
                    </div>
                    <div>
                        <label className="font-bold">الدور:</label>
                        <select value={config.examRound} onChange={e => handleConfigChange('examRound', e.target.value)} className="w-full mt-1 p-2 border rounded-md">
                            <option value="الأول">الأول</option>
                            <option value="الثاني">الثاني</option>
                        </select>
                    </div>
                    <div>
                        <label className="font-bold">عدد أيام الامتحان:</label>
                        <input type="number" value={config.examDays} onChange={e => handleConfigChange('examDays', parseInt(e.target.value))} className="w-full mt-1 p-2 border rounded-md" min="1"/>
                    </div>
                </div>
                 <div className="flex items-center gap-4">
                    <label className="font-bold">شعار المدرسة (اختياري):</label>
                    <input type="file" onChange={handleLogoUpload} accept="image/*" className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100" />
                    {schoolLogo && <img src={schoolLogo} alt="School Logo" className="h-12 w-12 object-contain rounded-full border p-1" />}
                </div>
                <div className="flex items-center gap-4">
                    <label className="font-bold">اتجاه PDF:</label>
                    <select value={orientation} onChange={e => setOrientation(e.target.value as 'p'|'l')} className="p-2 border rounded-md">
                        <option value="p">عمودي (Portrait)</option>
                        <option value="l">أفقي (Landscape)</option>
                    </select>
                </div>
                 <div className="text-center pt-4">
                    <button onClick={handleGenerate} className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">
                        <BarChart2 className="inline-block ml-2"/> إنشاء / تحديث الجدول
                    </button>
                </div>
            </div>

            {generatedSchedule && (
                <div className="mt-8">
                    <div className="flex justify-end mb-2">
                         <button onClick={handleExport} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">
                            {isExporting ? <Loader2 className="animate-spin" /> : <Printer size={18} />}
                            {isExporting ? 'جاري التصدير...' : 'تصدير PDF'}
                        </button>
                    </div>
                     <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse border border-black">
                            <thead>
                                <tr className="bg-yellow-200">
                                    {generatedSchedule.columns.map(col => <th key={col} className="border border-black p-2">{col}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(generatedSchedule.tableData).map(([rowIndex, rowData]) => (
                                    <tr key={rowIndex}>
                                        {generatedSchedule.columns.map(colKey => (
                                            <EditableCell 
                                                key={colKey}
                                                value={rowData[colKey]}
                                                onSave={(val) => handleTableDataChange(Number(rowIndex), colKey, val)}
                                            />
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-4 font-bold text-lg">
                             ملاحظة مهمة جدا" : يبدأ الامتحان الساعة 
                             <div className="inline-block w-40 mx-2">
                                <EditableCell value={generatedSchedule.examTime} onSave={handleTimeChange} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PageWrapper>
    );
}