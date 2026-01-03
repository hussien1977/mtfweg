import React, { useState, useRef } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { SchoolSettings } from '../../types.ts';
import { BookMarked, Upload, FileDown, Loader2 } from 'lucide-react';
import ExamCardPDFPage from './ExamCardPDFPage.tsx';

declare const XLSX: any;
declare const jspdf: any;
declare const html2canvas: any;

interface StudentCardData {
    fullName: string;
    motherName: string;
    birthDate: string;
    examId: string;
    governorate: string;
}

interface ExamCardsExporterProps {
    settings: SchoolSettings;
}

export default function ExamCardsExporter({ settings }: ExamCardsExporterProps) {
    const [studentData, setStudentData] = useState<StudentCardData[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isButtonEnabled = settings.schoolLevel === 'متوسطة';

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileProcess = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const data = event.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            const newStudents = json.slice(1).map((row: any[]): StudentCardData => ({
                fullName: row[0] || '',
                motherName: row[1] || '',
                birthDate: row[2]?.toString() || '',
                examId: row[3]?.toString() || '',
                governorate: row[4] || '',
            })).filter(s => s.fullName);

            setStudentData(newStudents);
            alert(`تم تحميل بيانات ${newStudents.length} طالب بنجاح. أنت جاهز للتصدير.`);
        };
        reader.readAsBinaryString(file);
        e.target.value = ''; // Reset file input
    };
    
    const handleExportPdf = async () => {
        if (studentData.length === 0) {
            alert('يرجى تحميل ملف بيانات الطلاب أولاً.');
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

        const studentChunks = [];
        for (let i = 0; i < studentData.length; i += 2) {
            studentChunks.push(studentData.slice(i, i + 2));
        }
        
        const totalPages = studentChunks.length;

        try {
            await document.fonts.ready;

            for (let i = 0; i < totalPages; i++) {
                const chunk = studentChunks[i];
                await renderComponent(
                    <ExamCardPDFPage
                        students={chunk}
                        settings={settings}
                    />
                );

                const pageElement = tempContainer.children[0] as HTMLElement;
                const canvas = await html2canvas(pageElement, { scale: 4, useCORS: true });
                const imgData = canvas.toDataURL('image/png');

                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
                setExportProgress(Math.round(((i + 1) / totalPages) * 100));
            }
            pdf.save(`بطاقات-امتحانية-${settings.schoolLevel}.pdf`);

        } catch (error) {
            console.error("PDF Export error:", error);
            alert(`حدث خطأ أثناء التصدير: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            root.unmount();
            if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
            }
            setIsExporting(false);
        }
    };


    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
            {isExporting && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center z-[200] text-white">
                    <Loader2 className="animate-spin h-16 w-16 mb-4" />
                    <p className="text-2xl font-bold mb-2">جاري إعداد البطاقات...</p>
                    <div className="w-1/2 bg-gray-600 rounded-full h-4"><div className="bg-cyan-500 h-4 rounded-full" style={{ width: `${exportProgress}%` }}></div></div>
                    <p className="mt-2 text-lg">{exportProgress}%</p>
                </div>
            )}

            <div className="flex items-center gap-3 mb-6 border-b pb-4">
                <BookMarked className="text-cyan-600" size={32} />
                <h2 className="text-3xl font-bold text-gray-800">إصدار بطاقات الدخول للامتحان الوزاري</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-4">
                    <button 
                        onClick={handleFileSelect}
                        disabled={!isButtonEnabled}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-cyan-600 text-white font-bold text-lg rounded-lg hover:bg-cyan-700 transition shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        <Upload size={24} />
                        <span>1. تحميل ملف Excel (الثالث متوسط)</span>
                    </button>
                    {!isButtonEnabled && <p className="text-center text-sm text-red-600">هذه الميزة مخصصة للمدارس المتوسطة حالياً.</p>}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileProcess}
                        accept=".xlsx, .xls"
                        className="hidden"
                    />
                    
                     <button 
                        onClick={handleExportPdf}
                        disabled={studentData.length === 0 || isExporting}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-red-600 text-white font-bold text-lg rounded-lg hover:bg-red-700 transition shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        <FileDown size={24} />
                        <span>2. تصدير البطاقات كـ PDF</span>
                    </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-2">تعليمات ملف Excel:</h3>
                    <p className="text-sm text-gray-600 mb-3">
                        يجب أن يحتوي الملف على الأعمدة التالية بالترتيب، بدون سطر عناوين:
                    </p>
                    <ol className="list-decimal list-inside text-sm space-y-1 text-gray-800">
                        <li>الاسم الرباعي للطالب</li>
                        <li>اسم الأم الثلاثي</li>
                        <li>المواليد (مثال: 2008)</li>
                        <li>الرقم الامتحاني</li>
                        <li>المحافظة</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}