import React, { useState, useMemo } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { SchoolSettings } from '../../types.ts';
import { Building, PlusCircle, Trash2, Eye, FileDown, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ExamBookletBeforePage from './ExamBookletBeforePage.tsx';
import ExamBookletAfterPage from './ExamBookletAfterPage.tsx';
import useLocalStorage from '../../hooks/useLocalStorage.ts';

declare const jspdf: any;
declare const html2canvas: any;

interface ExamBookletsReceiptProps {
    settings: SchoolSettings;
    setCurrentPageKey: (key: any) => void;
}

interface StudentCounts {
    first: string;
    second: string;
    third: string;
}

export interface SectorData {
    id: string;
    sectorNumber: number;
    invigilatorName: string;
    studentCounts: StudentCounts;
}

export interface HallData {
    id: string;
    hallNumber: number;
    sectors: SectorData[];
}

const isHallValid = (hall: HallData): boolean => {
    if (!hall || !hall.sectors || hall.sectors.length === 0) return false;
    return hall.sectors.every(sector => 
        sector.invigilatorName.trim() !== '' &&
        (sector.studentCounts.first !== '' || sector.studentCounts.second !== '' || sector.studentCounts.third !== '')
    );
};

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


export default function ExamBookletsReceipt({ settings, setCurrentPageKey }: ExamBookletsReceiptProps) {
    const [stage, setStage] = useLocalStorage<'intermediate' | null>('examBookletsReceipt_stage', null);
    const [halls, setHalls] = useLocalStorage<HallData[]>('examBookletsReceipt_halls', []);
    const [day, setDay] = useLocalStorage<string>('examBookletsReceipt_day', '');
    const [examDate, setExamDate] = useLocalStorage<string>('examBookletsReceipt_examDate', '');
    const [subject, setSubject] = useLocalStorage<string>('examBookletsReceipt_subject', '');
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [isExporting, setIsExporting] = useState(false);


    const handleAddHall = () => {
        const lastHall = halls[halls.length - 1];
        if (halls.length > 0 && !isHallValid(lastHall)) {
            alert('يرجى ملء بيانات القاعة الحالية (اسم مراقب واحد وعدد طلاب واحد على الأقل لكل قطاع) قبل إضافة قاعة جديدة.');
            return;
        }

        const newHallNumber = halls.length + 1;
        const lastSectorNumber = halls.flatMap(h => h.sectors).reduce((max, s) => Math.max(max, s.sectorNumber), 0);
        
        const newHall: HallData = {
            id: uuidv4(),
            hallNumber: newHallNumber,
            sectors: [
                { id: uuidv4(), sectorNumber: lastSectorNumber + 1, invigilatorName: '', studentCounts: { first: '', second: '', third: '' } },
                { id: uuidv4(), sectorNumber: lastSectorNumber + 2, invigilatorName: '', studentCounts: { first: '', second: '', third: '' } }
            ]
        };
        setHalls(prev => [...prev, newHall]);
    };

    const handleHallDataChange = (hallId: string, sectorId: string, field: keyof SectorData | keyof StudentCounts, value: string) => {
        setHalls(prev => prev.map(hall => {
            if (hall.id === hallId) {
                return {
                    ...hall,
                    sectors: hall.sectors.map(sector => {
                        if (sector.id === sectorId) {
                            if (field === 'invigilatorName') {
                                return { ...sector, invigilatorName: value };
                            } else {
                                return { ...sector, studentCounts: { ...sector.studentCounts, [field]: value } };
                            }
                        }
                        return sector;
                    })
                };
            }
            return hall;
        }));
    };
    
    const handleRemoveHall = (hallId: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذه القاعة بكل قطاعاتها؟')) {
            setHalls(prev => prev.filter(h => h.id !== hallId).map((h, index) => ({...h, hallNumber: index + 1})));
        }
    };
    
    const handleRemoveSecondSector = (hallId: string) => {
         setHalls(prev => prev.map(hall => {
            if (hall.id === hallId && hall.sectors.length > 1) {
                return { ...hall, sectors: [hall.sectors[0]] };
            }
            return hall;
        }));
    };

    const handleExportPdf = async () => {
        setIsExporting(true);
        
        const { jsPDF } = jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        const renderPage = (Page: React.ElementType) => new Promise<void>(resolve => {
            root.render(<Page halls={halls} day={day} examDate={examDate} subject={subject} settings={settings} />);
            setTimeout(resolve, 500);
        });

        try {
            await document.fonts.ready;
            
            // Page 1
            await renderPage(ExamBookletBeforePage);
            const page1Element = tempContainer.children[0] as HTMLElement;
            const canvas1 = await html2canvas(page1Element, { scale: 2, useCORS: true });
            pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');

            // Page 2
            pdf.addPage();
            await renderPage(ExamBookletAfterPage);
            const page2Element = tempContainer.children[0] as HTMLElement;
            const canvas2 = await html2canvas(page2Element, { scale: 2, useCORS: true });
            pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');

            pdf.save('استلام-وتسليم-الدفاتر.pdf');
        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("حدث خطأ أثناء التصدير.");
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
        }
    };

    if (!stage) {
        return (
             <PageWrapper
                title="استلام وتسليم رزم الدفاتر الامتحانية"
                onPrev={() => setCurrentPageKey('absence_form')}
                onNext={() => setCurrentPageKey('examination_record')}
            >
                <div className="space-y-4">
                    <p className="font-semibold text-lg">اختر المرحلة الدراسية:</p>
                    <button onClick={() => setStage('intermediate')} className="w-full text-right p-4 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition shadow-md flex items-center justify-between">
                        <span>المتوسطة</span>
                    </button>
                    <button disabled className="w-full text-right p-4 bg-gray-400 text-white font-bold rounded-lg cursor-not-allowed flex items-center justify-between">
                        <span>الابتدائية</span><span className="text-xs bg-gray-500 px-2 py-1 rounded-full">قريباً</span>
                    </button>
                    <button disabled className="w-full text-right p-4 bg-gray-400 text-white font-bold rounded-lg cursor-not-allowed flex items-center justify-between">
                        <span>الاعدادية</span><span className="text-xs bg-gray-500 px-2 py-1 rounded-full">قريباً</span>
                    </button>
                     <button disabled className="w-full text-right p-4 bg-gray-400 text-white font-bold rounded-lg cursor-not-allowed flex items-center justify-between">
                        <span>الثانوية</span><span className="text-xs bg-gray-500 px-2 py-1 rounded-full">قريباً</span>
                    </button>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper
            title="استلام وتسليم رزم الدفاتر الامتحانية"
            onPrev={() => setCurrentPageKey('absence_form')}
            onNext={() => setCurrentPageKey('examination_record')}
        >
            <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <input type="text" placeholder="اليوم" value={day} onChange={e => setDay(e.target.value)} className="p-2 border rounded-md" />
                     <input type="text" placeholder="تاريخ الامتحان" value={examDate} onChange={e => setExamDate(e.target.value)} className="p-2 border rounded-md" />
                 </div>

                 <div className="space-y-4">
                    {halls.map((hall, index) => renderHallForm(hall, index === halls.length - 1))}
                 </div>
                 
                 <div className="flex justify-center gap-4 mt-4 border-t pt-6">
                    <button onClick={handleAddHall} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
                        <Building size={18} /> إضافة قاعة
                    </button>
                     <button onClick={() => setIsPreviewVisible(true)} disabled={halls.length === 0} className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400">
                        <Eye size={18} /> عرض للمعاينة
                    </button>
                </div>

                {isPreviewVisible && (
                    <div className="mt-8 border-t-4 border-cyan-500 pt-6">
                         <div className="flex justify-center mb-4">
                            <button onClick={handleExportPdf} disabled={isExporting} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:bg-gray-400">
                                {isExporting ? <Loader2 className="animate-spin" /> : <FileDown size={20} />}
                                <span>{isExporting ? 'جاري التصدير...' : 'تصدير PDF'}</span>
                            </button>
                         </div>
                         <div className="space-y-8 bg-gray-200 p-4 rounded-lg">
                            <div className="bg-white shadow-lg"><ExamBookletBeforePage halls={halls} day={day} examDate={examDate} subject={subject} onSubjectChange={setSubject} settings={settings} /></div>
                            <div className="bg-white shadow-lg"><ExamBookletAfterPage halls={halls} day={day} examDate={examDate} subject={subject} settings={settings} /></div>
                         </div>
                    </div>
                )}
            </div>
        </PageWrapper>
    );

    function renderHallForm(hall: HallData, isLastHall: boolean): React.ReactNode {
        return (
            <div key={hall.id} className="p-4 bg-gray-50 rounded-lg border-l-4 border-cyan-500 relative">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-bold text-gray-700">القاعة رقم: {hall.hallNumber}</h3>
                    <button onClick={() => handleRemoveHall(hall.id)} className="p-1 text-red-500 hover:bg-red-100 rounded-full">
                        <Trash2 size={18} />
                    </button>
                </div>
                <div className="space-y-4">
                    {hall.sectors.map((sector, index) => (
                        <div key={sector.id} className="p-3 bg-white rounded-md border shadow-sm relative">
                            <h4 className="font-semibold text-cyan-800">القطاع رقم: {sector.sectorNumber}</h4>
                            {isLastHall && index === 1 && (
                                <button onClick={() => handleRemoveSecondSector(hall.id)} className="absolute top-2 left-2 p-1 text-xs text-gray-500 hover:text-red-600 border rounded-md">
                                    حذف القطاع الثاني
                                </button>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-2">
                                <input type="text" placeholder="اسم المراقب" value={sector.invigilatorName} onChange={e => handleHallDataChange(hall.id, sector.id, 'invigilatorName', e.target.value)} className="md:col-span-1 p-2 border rounded-md" />
                                <input type="number" placeholder="عدد طلاب الأول" value={sector.studentCounts.first} onChange={e => handleHallDataChange(hall.id, sector.id, 'first', e.target.value)} className="p-2 border rounded-md" />
                                <input type="number" placeholder="عدد طلاب الثاني" value={sector.studentCounts.second} onChange={e => handleHallDataChange(hall.id, sector.id, 'second', e.target.value)} className="p-2 border rounded-md" />
                                <input type="number" placeholder="عدد طلاب الثالث" value={sector.studentCounts.third} onChange={e => handleHallDataChange(hall.id, sector.id, 'third', e.target.value)} className="p-2 border rounded-md" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
}