import React, { useState } from 'react';
import * as ReactDOM from 'react-dom/client';
import useLocalStorage from '../../hooks/useLocalStorage.ts';
import type { SchoolSettings } from '../../types.ts';
import { FileText, Loader2 } from 'lucide-react';
import Decision132PDFPage from './Decision132PDFPage.tsx';

declare const jspdf: any;
declare const html2canvas: any;

interface Decision132ViewProps {
    setCurrentPageKey: (key: any) => void;
    settings: SchoolSettings;
}

const PageWrapper = ({ title, children, setCurrentPageKey }: { title: string, children?: React.ReactNode, setCurrentPageKey: (key: any) => void }) => (
    <div className="bg-white p-8 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
            <button onClick={() => setCurrentPageKey('minutes')} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">&larr; الصفحة السابقة</button>
            <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
            <button onClick={() => setCurrentPageKey('signatures')} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">الصفحة التالية &rarr;</button>
        </div>
        {children}
    </div>
);

const defaultDecisionText = `بسم الله الرحمن الرحيم
قرار رقم ١٣٢
استناداً الى الصلاحيات المخولة الينا من قبل وزارة التربية بموجب نظام الامتحانات العامة رقم (١٨) لسنة ١٩٨٧ تقرر ما يلي:
المادة - ١ - أ- اذا ثبت غش الطالب او محاولته الغش في اي من الامتحانات اليومية او الاسبوعية او الشهرية او الفصلية او النهائية (الدور الاول او الثاني) يلغى امتحانه في الدرس الذي ثبت فيه الغش ويعطى صفراً.
ب- اذا تكرر الغش او محاولة الغش من قبل الطالب في احد الامتحانات المذكورة في الفقرة (أ) من هذه المادة يعتبر راسباً في صفه لتلك السنة.
جـ- اذا ثبت غش الطالب في الامتحان الوزاري للصفوف المنتهية (الدور الاول او الثاني) يعتبر راسباً في جميع الدروس لتلك السنة.
المادة - ٢ - لا يسمح للطالب الذي اعتبر راسباً في صفه بسبب الغش بأداء الامتحان الخارجي في السنة التالية لرسوبه.
المادة - ٣ - ينفذ هذا القرار من تاريخ صدوره.
المادة - ٤ - على ادارات المدارس متابعة تنفيذ ما ورد في هذا القرار.`;


export default function Decision132View({ setCurrentPageKey, settings }: Decision132ViewProps) {
    const [decisionText, setDecisionText] = useLocalStorage('examLog_decision132Text', defaultDecisionText);
    const [isExporting, setIsExporting] = useState(false);

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
                <Decision132PDFPage 
                    settings={settings}
                    decisionText={decisionText}
                />
            );
            
            const page = tempContainer.children[0] as HTMLElement;
            if(!page) throw new Error("PDF export element not found");

            const canvas = await html2canvas(page, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            
            const { jsPDF } = jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
            pdf.save('قرار_132.pdf');

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
        <PageWrapper title="القرار ١٣٢" setCurrentPageKey={setCurrentPageKey}>
            <div className="bg-gray-50 p-6 rounded-lg border shadow-sm space-y-4">
                <div>
                    <label className="font-bold text-lg">نص القرار (قابل للتعديل):</label>
                    <textarea
                        value={decisionText}
                        onChange={e => setDecisionText(e.target.value)}
                        rows={15}
                        className="w-full p-3 border rounded-md mt-1 font-sans text-lg leading-relaxed bg-white"
                        placeholder="اكتب نص القرار هنا..."
                    />
                </div>
                <div className="text-center pt-4">
                    <button onClick={handleExport} disabled={isExporting} className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:bg-gray-400">
                        {isExporting ? <Loader2 className="animate-spin" /> : <FileText className="inline-block ml-2"/>}
                        {isExporting ? 'جاري التصدير...' : 'تصدير PDF'}
                    </button>
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-bold text-center mb-4">معاينة القرار</h3>
                <div className="p-4 bg-gray-100 rounded-lg shadow-inner overflow-hidden">
                    <div className="transform scale-[0.8] origin-top mx-auto -my-14">
                        <Decision132PDFPage 
                            settings={settings}
                            decisionText={decisionText}
                        />
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
}