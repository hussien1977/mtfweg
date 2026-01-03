
import React, { useState, useMemo } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { ClassData, SchoolSettings, Student } from '../../types.ts';
import { GRADE_LEVELS } from '../../constants.ts';
import { FileDown, Loader2, QrCode, Grid, CheckCircle, Hash, Printer } from 'lucide-react';

declare const jspdf: any;
declare const html2canvas: any;

interface QRGeneratorManagerProps {
    classes: ClassData[];
    settings: SchoolSettings;
}

const CARDS_PER_PAGE = 30; // 3 columns * 10 rows

// Individual Card Component
const StudentQRCard: React.FC<{ student: Partial<Student>; classData: Partial<ClassData> }> = ({ student, classData }) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${student.examId || student.id}`;
    
    return (
        <div 
            className="w-[62mm] h-[27mm] border border-gray-400 p-2 flex items-center justify-between bg-white box-border overflow-hidden"
            style={{ fontFamily: 'Calibri, "Segoe UI", Tahoma, sans-serif' }}
        >
            <div className="flex-1 text-right flex flex-col justify-center min-w-0">
                <h4 className="font-bold text-[11pt] text-gray-900 leading-[1.1] mb-1 break-words">
                    {student.name || 'بطاقة تعريفية'}
                </h4>
                <p className="text-[9pt] text-cyan-700 font-bold">
                    {classData.stage ? `${classData.stage} - ${classData.section}` : 'رقم تسلسلي'}
                </p>
                <div className="mt-1">
                    <span className="text-[8pt] text-gray-500 font-bold ml-1">الرقم:</span>
                    <span className="text-[10pt] font-mono font-black text-red-600 bg-red-50 px-1 rounded border border-red-100">
                        {student.examId || '---'}
                    </span>
                </div>
            </div>
            <div className="w-[18mm] h-[18mm] flex-shrink-0 flex items-center justify-center mr-2 border-r border-gray-200 pr-2">
                <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
            </div>
        </div>
    );
};

// Full Page Layout for PDF
const QRGeneratorPDFPage = ({ dataChunk, settings, pageNumber, totalPages, isRangeMode }: { 
    dataChunk: Array<{ student: Partial<Student>; classData: Partial<ClassData> }>; 
    settings: SchoolSettings;
    pageNumber: number;
    totalPages: number;
    isRangeMode?: boolean;
}) => (
    <div 
        className="w-[210mm] h-[297mm] p-[5mm] bg-white flex flex-col box-border" 
        dir="rtl"
        style={{ fontFamily: 'Calibri, "Segoe UI", Tahoma, sans-serif' }}
    >
        <header className="flex justify-between items-center mb-3 px-2 border-b-2 border-cyan-600 pb-1">
            <div className="text-right">
                <p className="text-[10pt] font-bold text-gray-800">{settings.schoolName}</p>
                <p className="text-[9pt] text-gray-500">العام الدراسي: {settings.academicYear}</p>
            </div>
            <h1 className="text-[15pt] font-black text-cyan-600">
                {isRangeMode ? 'ملصقات الأرقام التسلسلية' : 'جدول رموز QR للطلاب'} (صفحة {pageNumber})
            </h1>
            <div className="text-left text-[9pt] text-gray-400">
                صفحة {pageNumber} من {totalPages}
            </div>
        </header>
        
        <main className="flex-grow">
            <div className="grid grid-cols-3 gap-[1.2mm] justify-items-center">
                {dataChunk.map((item, idx) => (
                    <StudentQRCard 
                        key={idx} 
                        student={item.student} 
                        classData={item.classData} 
                    />
                ))}
            </div>
        </main>
        <footer className="text-center text-[8pt] text-gray-400 mt-2 border-t pt-1 border-dotted">
            تم التوليد بواسطة نظام تربوي تك - الإدارة الذكية
        </footer>
    </div>
);

export default function QRGeneratorManager({ classes, settings }: QRGeneratorManagerProps) {
    const [mode, setMode] = useState<'students' | 'range'>('students');
    const [selectedStage, setSelectedStage] = useState('');
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [rangeStart, setRangeStart] = useState(1);
    const [rangeEnd, setRangeEnd] = useState(100);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    const classesInStage = useMemo(() => 
        selectedStage ? classes.filter(c => c.stage === selectedStage) : [],
    [selectedStage, classes]);

    const handleExportPdf = async () => {
        let allOrderedData: Array<{ student: Partial<Student>; classData: Partial<ClassData> }> = [];

        if (mode === 'students') {
            const selectedClasses = classes
                .filter(c => selectedClassIds.includes(c.id))
                .sort((a, b) => a.section.localeCompare(b.section, 'ar'));

            selectedClasses.forEach(cls => {
                const studentsInClass = [...(cls.students || [])].sort((a, b) => {
                    const numA = parseInt(a.examId || '0', 10);
                    const numB = parseInt(b.examId || '0', 10);
                    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                    return a.name.localeCompare(b.name, 'ar');
                });
                studentsInClass.forEach(s => allOrderedData.push({ student: s, classData: cls }));
            });
        } else {
            // Range Mode: Create dummy student objects for the numbers
            for (let i = rangeStart; i <= rangeEnd; i++) {
                allOrderedData.push({
                    student: { name: 'ملصق تعريفي', examId: String(i), id: String(i) },
                    classData: { stage: 'رقم', section: 'تسلسلي' }
                });
            }
        }

        if (allOrderedData.length === 0) {
            alert('يرجى اختيار البيانات المطلوبة للتصدير.');
            return;
        }

        setIsExporting(true);
        setExportProgress(0);

        const chunks = [];
        for (let i = 0; i < allOrderedData.length; i += CARDS_PER_PAGE) {
            chunks.push(allOrderedData.slice(i, i + CARDS_PER_PAGE));
        }

        const { jsPDF } = jspdf;
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        try {
            await document.fonts.ready;
            for (let i = 0; i < chunks.length; i++) {
                await new Promise<void>(resolve => {
                    root.render(
                        <QRGeneratorPDFPage 
                            dataChunk={chunks[i]} 
                            settings={settings}
                            pageNumber={i + 1}
                            totalPages={chunks.length}
                            isRangeMode={mode === 'range'}
                        />
                    );
                    setTimeout(resolve, 800); 
                });

                const canvas = await html2canvas(tempContainer.children[0] as HTMLElement, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                if (i > 0) pdf.addPage();
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
                setExportProgress(Math.round(((i + 1) / chunks.length) * 100));
            }
            pdf.save(`رموز_QR_${mode === 'students' ? 'طلاب' : 'تسلسل'}.pdf`);
        } catch (error) {
            console.error(error); alert("حدث خطأ أثناء التصدير.");
        } finally {
            root.unmount(); document.body.removeChild(tempContainer);
            setIsExporting(false); setExportProgress(0);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-cyan-600">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-cyan-100 p-2 rounded-lg"><QrCode className="text-cyan-600 w-8 h-8" /></div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">نظام توليد الرموز الذكي</h2>
                        <p className="text-sm text-gray-500">اختر طريقة توليد الرموز لتعريف الطلاب.</p>
                    </div>
                </div>
                
                <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner w-full sm:w-auto">
                    <button onClick={() => setMode('students')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'students' ? 'bg-white text-cyan-600 shadow-sm' : 'text-gray-500'}`}>سجل الطلاب</button>
                    <button onClick={() => setMode('range')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'range' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>أرقام تسلسلية</button>
                </div>
            </div>

            {isExporting && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-16 h-16 animate-spin mb-4" />
                    <p className="text-xl font-bold">جاري إعداد الملف: {exportProgress}%</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {mode === 'students' ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">1. اختيار المرحلة</label>
                            <select value={selectedStage} onChange={e => {setSelectedStage(e.target.value); setSelectedClassIds([]);}} className="w-full p-3 border rounded-xl bg-gray-50 outline-none">
                                <option value="">-- اختر المرحلة --</option>
                                {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        {selectedStage && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">2. اختيار الشعب</label>
                                <div className="grid grid-cols-2 gap-2 p-3 border rounded-xl bg-gray-50 max-h-48 overflow-y-auto">
                                    {classesInStage.map(c => (
                                        <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent">
                                            {/* FIX: Fixed error where 'id' was used instead of 'c.id' in filter function */}
                                            <input type="checkbox" checked={selectedClassIds.includes(c.id)} onChange={() => setSelectedClassIds(prev => prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id])} className="w-4 h-4 text-cyan-600" />
                                            <span className="font-bold text-gray-700">{c.section}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="bg-indigo-50 p-3 rounded-lg text-indigo-700 text-sm font-bold border border-indigo-100">
                             هذه الميزة تتيح لك طباعة ملصقات QR لأرقام ثابتة (مثلاً من 1 إلى 500) للصقها على البطاقات الورقية للطلاب الذين لا يملكون أرقاماً في النظام بعد.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">من رقم:</label>
                                <input type="number" value={rangeStart} onChange={e => setRangeStart(Number(e.target.value))} className="w-full p-3 border rounded-xl" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">إلى رقم:</label>
                                <input type="number" value={rangeEnd} onChange={e => setRangeEnd(Number(e.target.value))} className="w-full p-3 border rounded-xl" />
                            </div>
                        </div>
                        <p className="text-xs text-gray-400">سيتم توليد {Math.max(0, rangeEnd - rangeStart + 1)} ملصق.</p>
                    </div>
                )}

                <div className={`p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center ${mode === 'students' ? 'bg-cyan-50 border-cyan-200' : 'bg-indigo-50 border-indigo-200'}`}>
                    <Grid size={48} className={mode === 'students' ? 'text-cyan-400' : 'text-indigo-400'} />
                    <h3 className="font-bold mb-2 mt-2">نصيحة للإدارة</h3>
                    <p className="text-sm text-gray-600">
                        استخدم ورق "A4 Sticker" (لاصق) عند الطباعة، ثم قص الملصقات بابعاد (62mm x 27mm) والصقها على هويات الطلاب لسهولة المسح بالكاميرا.
                    </p>
                </div>
            </div>

            <button onClick={handleExportPdf} disabled={isExporting} className={`w-full flex items-center justify-center gap-3 py-4 text-white font-black text-xl rounded-2xl transition shadow-lg disabled:bg-gray-400 ${mode === 'students' ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                <FileDown />
                <span>{mode === 'range' ? 'توليد وطباعة ملصقات الأرقام' : 'تصدير رموز QR الطلاب'}</span>
            </button>
        </div>
    );
}
