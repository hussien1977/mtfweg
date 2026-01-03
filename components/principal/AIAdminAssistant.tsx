
import React, { useState } from 'react';
import * as ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { Send, Printer, Copy, RefreshCw, Sparkles, FileText, Eraser, FileDown, Loader2 } from 'lucide-react';
import type { SchoolSettings } from '../../types.ts';

declare const jspdf: any;
declare const html2canvas: any;

interface AIAdminAssistantProps {
    settings: SchoolSettings;
}

const LETTER_TYPES = [
    'كتاب شكر وتقدير',
    'كتاب توبيخ / لفت نظر',
    'طلب تجهيزات / أثاث',
    'طلب صيانة',
    'إعفاء طالب',
    'تأييد استمرار بالدوام',
    'إعمام إداري',
    'مفاتحة رسمية',
    'أخرى'
];

// Helper to get the API key directly
const getApiKey = (): string => {
    return "AIzaSyDsiZmigwNxdmb-6Yqpvi0ZHUv3gGYz12s";
};

// --- Internal Component for PDF Layout ---
const LetterPDFTemplate = ({ 
    content, 
    settings, 
    showWatermark 
}: { 
    content: string; 
    settings: SchoolSettings; 
    showWatermark: boolean; 
}) => {
    const schoolLogo = "https://i.imgur.com/0zjxJmi.jpeg";
    const ministryLogo = "https://i.imgur.com/JNUggOC.png";

    return (
        <div className="w-[794px] h-[1123px] p-12 bg-white flex flex-col relative font-['Cairo']" dir="rtl">
            {/* Watermark */}
            {showWatermark && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <img 
                        src={schoolLogo} 
                        alt="Watermark" 
                        className="w-[500px] opacity-10 filter grayscale"
                    />
                </div>
            )}

            {/* Header */}
            <header className="flex justify-between items-start border-b-2 border-double border-gray-800 pb-6 mb-8 relative z-10">
                {/* Right: Ministry Info */}
                <div className="flex flex-col items-center w-1/4">
                    <img src={ministryLogo} alt="شعار الوزارة" className="h-24 w-24 object-contain mb-2" />
                    <p className="font-bold text-sm">جمهورية العراق</p>
                    <p className="font-bold text-sm">وزارة التربية</p>
                    <p className="font-bold text-xs mt-1">المديرية العامة للتربية في {settings.directorate}</p>
                </div>

                {/* Center: Bism Allah */}
                <div className="flex-1 flex flex-col items-center justify-center pt-8">
                    <h1 className="text-2xl font-extrabold mb-2 font-serif">بسم الله الرحمن الرحيم</h1>
                </div>

                {/* Left: School Info */}
                <div className="flex flex-col items-center w-1/4">
                    <img src={schoolLogo} alt="شعار المدرسة" className="h-24 w-24 object-contain mb-2 rounded-full" />
                    <p className="font-bold text-sm">إدارة</p>
                    <p className="font-bold text-sm text-center">{settings.schoolName}</p>
                </div>
            </header>

            {/* Body */}
            <main className="flex-grow relative z-10">
                <div className="text-xl leading-loose text-justify font-medium whitespace-pre-wrap px-4">
                    {content}
                </div>
            </main>

            {/* Footer */}
            <footer className="mt-auto pt-16 relative z-10">
                <div className="flex justify-end px-12">
                    <div className="text-center">
                        <p className="font-bold text-lg mb-1">المدير</p>
                        <p className="text-xl font-extrabold">{settings.principalName}</p>
                    </div>
                </div>
                <div className="mt-12 border-t border-gray-400 pt-4 text-center text-xs text-gray-500">
                    تم إصدار هذا الكتاب إلكترونياً بواسطة نظام الإدارة المدرسية الذكي
                </div>
            </footer>
        </div>
    );
};

export default function AIAdminAssistant({ settings }: AIAdminAssistantProps) {
    const [letterType, setLetterType] = useState(LETTER_TYPES[0]);
    const [recipient, setRecipient] = useState('');
    const [subject, setSubject] = useState('');
    const [details, setDetails] = useState('');
    const [generatedLetter, setGeneratedLetter] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Export States
    const [isExporting, setIsExporting] = useState(false);
    const [showWatermark, setShowWatermark] = useState(false);

    const handleGenerate = async () => {
        if (!recipient || !subject || !details) {
            alert('يرجى ملء جميع الحقول المطلوبة (الجهة، الموضوع، التفاصيل).');
            return;
        }

        setIsGenerating(true);
        try {
            // Use the hardcoded key directly
            const apiKey = getApiKey();

            const ai = new GoogleGenAI({ apiKey: apiKey });
            
            const prompt = `
                أنت مساعد إداري خبير في وزارة التربية العراقية. قم بصياغة كتاب رسمي احترافي بناءً على البيانات التالية:
                
                - اسم المدرسة المرسلة: ${settings.schoolName}
                - مدير المدرسة: ${settings.principalName}
                - نوع الكتاب: ${letterType}
                - معنون إلى: ${recipient}
                - موضوع الكتاب (م/): ${subject}
                - النقاط والتفاصيل التي يجب ذكرها في المتن: ${details}
                
                الشروط:
                1. استخدم لغة عربية فصحى رسمية وإدارية دقيقة جداً.
                2. اتبع تنسيق الكتب الرسمية العراقية (العدد، التاريخ، م/، التحية، المتن، التوقيع).
                3. اترك مكاناً للعدد والتاريخ ليتم ملؤه يدوياً في الاعلى (العدد: ..... / التاريخ: .....).
                4. اجعل التنسيق جاهزاً للنسخ والطباعة مباشرة.
                5. لا تضف أي مقدمات أو خاتמות من قبلك (مثل "إليك الكتاب..")، فقط نص الكتاب الرسمي.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setGeneratedLetter(response.text.trim());
        } catch (error) {
            console.error("AI Generation Error:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("API Key") || errorMessage.includes("key")) {
                 alert("خطأ: مفتاح API غير صالح.");
            } else {
                 alert("حدث خطأ أثناء توليد الكتاب. يرجى المحاولة مرة أخرى.");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedLetter);
        alert('تم نسخ النص إلى الحافظة');
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html dir="rtl">
                <head>
                    <title>${subject}</title>
                    <style>
                        body { font-family: 'Times New Roman', serif; padding: 40px; }
                        .content { white-space: pre-wrap; font-size: 18px; line-height: 1.6; }
                        @media print {
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="content">${generatedLetter}</div>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        }
    };

    const handleExportPdf = async () => {
        if (!generatedLetter) return;
        setIsExporting(true);

        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        try {
            await new Promise<void>(resolve => {
                root.render(
                    <LetterPDFTemplate 
                        content={generatedLetter} 
                        settings={settings} 
                        showWatermark={showWatermark} 
                    />
                );
                // Wait for render and images to likely load
                setTimeout(resolve, 800); 
            });

            // Ensure fonts are ready
            await document.fonts.ready;

            if (typeof jspdf === 'undefined' || typeof html2canvas === 'undefined') {
                throw new Error("Libraries not loaded");
            }

            const canvas = await html2canvas(tempContainer.children[0] as HTMLElement, {
                scale: 2,
                useCORS: true,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            pdf.save(`كتاب_رسمي_${subject.replace(/\s+/g, '_')}.pdf`);

        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("حدث خطأ أثناء تصدير الملف.");
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-6xl mx-auto">
            
            {isExporting && (
                <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-16 h-16 animate-spin mb-4" />
                    <p className="text-xl font-bold">جاري إنشاء ملف PDF...</p>
                </div>
            )}

            <div className="flex items-center gap-3 border-b pb-4 mb-6">
                <div className="p-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg text-white shadow-lg">
                    <Sparkles size={32} />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">المساعد الإداري الذكي</h2>
                    <p className="text-gray-500">قم بتوليد كتب رسمية احترافية في ثوانٍ باستخدام الذكاء الاصطناعي</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="space-y-5 bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <FileText className="text-indigo-600" />
                        بيانات الكتاب
                    </h3>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">نوع الكتاب</label>
                        <select 
                            value={letterType} 
                            onChange={(e) => setLetterType(e.target.value)} 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                            {LETTER_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">إلى (الجهة المعنون إليها)</label>
                        <input 
                            type="text" 
                            value={recipient} 
                            onChange={(e) => setRecipient(e.target.value)} 
                            placeholder="مثال: المديرية العامة لتربية بغداد / قسم الملاك" 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الموضوع (م/)</label>
                        <input 
                            type="text" 
                            value={subject} 
                            onChange={(e) => setSubject(e.target.value)} 
                            placeholder="مثال: طلب تجهيز رحلات مدرسية" 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">التفاصيل والنقاط الرئيسية</label>
                        <textarea 
                            value={details} 
                            onChange={(e) => setDetails(e.target.value)} 
                            rows={6}
                            placeholder="- نعلمكم بوجود نقص في الرحلات&#10;- العدد المطلوب 50 رحلة&#10;- السبب: زيادة عدد الطلاب هذا العام" 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">اكتب رؤوس أقلام فقط، وسيقوم المساعد بصياغتها بشكل رسمي.</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button 
                            onClick={handleGenerate} 
                            disabled={isGenerating}
                            className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 font-bold shadow-md disabled:bg-indigo-300"
                        >
                            {isGenerating ? <RefreshCw className="animate-spin" /> : <Sparkles />}
                            {isGenerating ? 'جاري الصياغة...' : 'توليد الكتاب'}
                        </button>
                        <button 
                            onClick={() => { setRecipient(''); setSubject(''); setDetails(''); setGeneratedLetter(''); }}
                            className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                            title="مسح الحقول"
                        >
                            <Eraser size={20} />
                        </button>
                    </div>
                </div>

                {/* Output Section */}
                <div className="flex flex-col h-full">
                    <div className="bg-white border-2 border-indigo-100 rounded-xl shadow-inner flex-grow flex flex-col overflow-hidden h-[600px] lg:h-auto relative">
                        <div className="bg-indigo-50 p-3 border-b border-indigo-100 flex flex-col sm:flex-row justify-between items-center gap-2">
                            <h3 className="font-bold text-indigo-900">المعاينة والتحرير</h3>
                            
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1 text-xs font-semibold cursor-pointer bg-white px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-50">
                                    <input 
                                        type="checkbox" 
                                        checked={showWatermark} 
                                        onChange={(e) => setShowWatermark(e.target.checked)}
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    علامة مائية
                                </label>
                                <button onClick={handleExportPdf} disabled={!generatedLetter} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 disabled:bg-gray-400 transition" title="تصدير PDF">
                                    <FileDown size={14}/> تصدير PDF
                                </button>
                                <div className="h-6 w-px bg-gray-300 mx-1"></div>
                                <button onClick={handleCopy} disabled={!generatedLetter} className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg disabled:text-gray-400" title="نسخ"><Copy size={18}/></button>
                                <button onClick={handlePrint} disabled={!generatedLetter} className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg disabled:text-gray-400" title="طباعة"><Printer size={18}/></button>
                            </div>
                        </div>
                        
                        <textarea
                            value={generatedLetter}
                            onChange={(e) => setGeneratedLetter(e.target.value)}
                            className="flex-grow w-full p-6 resize-none focus:outline-none font-serif text-lg leading-loose text-gray-800"
                            placeholder="سيظهر الكتاب الرسمي هنا..."
                            dir="rtl"
                        />
                        
                        {!generatedLetter && !isGenerating && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
                                <FileText size={64} className="mb-4 opacity-20" />
                                <p>بانتظار البيانات لتوليد الكتاب...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}