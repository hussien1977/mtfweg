import React, { useState } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { SchoolSettings, User } from '../../types.ts';
import { FileText, Loader2 } from 'lucide-react';
import SignaturesPDFPage from './SignaturesPDFPage.tsx';

declare const jspdf: any;
declare const html2canvas: any;

interface SignaturesViewProps {
    setCurrentPageKey: (key: any) => void;
    settings: SchoolSettings;
    users: User[];
}

const PageWrapper = ({ title, children, setCurrentPageKey, onPrev, onNext }: { title: string, children?: React.ReactNode, setCurrentPageKey: (key: any) => void, onPrev: () => void, onNext: () => void }) => (
    <div className="bg-white p-8 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
            <button onClick={onPrev} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">&larr; الصفحة السابقة</button>
            <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
            <button onClick={onNext} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">الصفحة التالية &rarr;</button>
        </div>
        {children}
    </div>
);

export default function SignaturesView({ setCurrentPageKey, settings, users }: SignaturesViewProps) {
    const [isExporting, setIsExporting] = useState(false);
    
    const teachers = users.filter(u => u.role === 'teacher');

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
                <SignaturesPDFPage 
                    settings={settings}
                    teachers={teachers}
                />
            );
            
            const page = tempContainer.children[0] as HTMLElement;
            if(!page) throw new Error("PDF export element not found");

            const canvas = await html2canvas(page, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            
            const { jsPDF } = jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
            pdf.save('تواقيع_القرار_132.pdf');

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
            title="توقيع الهيئات التعليمية على القرار ١٣٢" 
            setCurrentPageKey={setCurrentPageKey}
            onPrev={() => setCurrentPageKey('decision132')}
            onNext={() => setCurrentPageKey('committee')}
        >
            <div className="bg-gray-50 p-6 rounded-lg border shadow-sm text-center">
                <p className="text-lg mb-4">
                    هذه الصفحة مخصصة لطباعة قائمة بأسماء الكادر التدريسي ليتم التوقيع عليها بعد الاطلاع على القرار الوزاري رقم ١٣٢.
                </p>
                <button onClick={handleExport} disabled={isExporting} className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:bg-gray-400">
                    {isExporting ? <Loader2 className="animate-spin" /> : <FileText className="inline-block ml-2"/>}
                    {isExporting ? 'جاري التصدير...' : 'تصدير قائمة التواقيع (PDF)'}
                </button>
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-bold text-center mb-4">معاينة القائمة</h3>
                <div className="p-4 bg-gray-100 rounded-lg shadow-inner overflow-hidden">
                    <div className="transform scale-[0.8] origin-top mx-auto -my-14">
                        <SignaturesPDFPage 
                            settings={settings}
                            teachers={teachers}
                        />
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
}