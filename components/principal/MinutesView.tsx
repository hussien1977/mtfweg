import React, { useState } from 'react';
import * as ReactDOM from 'react-dom/client';
import useLocalStorage from '../../hooks/useLocalStorage.ts';
import type { SchoolSettings, User } from '../../types.ts';
import { FileText, Loader2 } from 'lucide-react';
import MinutesPDFPage from './MinutesPDFPage.tsx';

declare const jspdf: any;
declare const html2canvas: any;

interface MinutesViewProps {
    setCurrentPageKey: (key: any) => void;
    settings: SchoolSettings;
    users: User[];
}

const PageWrapper = ({ title, children, setCurrentPageKey }: { title: string, children?: React.ReactNode, setCurrentPageKey: (key: any) => void }) => (
    <div className="bg-white p-8 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
            <button onClick={() => setCurrentPageKey('index')} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">&larr; العودة للفهرس</button>
            <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
            <button onClick={() => setCurrentPageKey('decision132')} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">الصفحة التالية &rarr;</button>
        </div>
        {children}
    </div>
);


export default function MinutesView({ setCurrentPageKey, settings, users }: MinutesViewProps) {
    const [meetingDay, setMeetingDay] = useLocalStorage('examLog_meetingDay', '');
    const [meetingDate, setMeetingDate] = useLocalStorage('examLog_meetingDate', '');
    const [meetingAgenda, setMeetingAgenda] = useLocalStorage('examLog_meetingAgenda', 
`١- التأكيد على الالتزام بالتعليمات الامتحانية الصادرة من وزارة التربية.
٢- التأكيد على سرية الاسئلة الامتحانية.
٣- التأكيد على الدقة في تصليح الدفاتر الامتحانية.
٤- التأكيد على الدقة في نقل الدرجات من الدفتر الامتحاني الى سجل الدرجات.
٥- التأكيد على الالتزام بجدول المراقبات اليومية.
٦- التأكيد على عدم ادخال اجهزة الموبايل الى القاعات الامتحانية.
٧- التأكيد على عدم التدخين داخل القاعات الامتحانية.`);

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
                <MinutesPDFPage 
                    settings={settings}
                    meetingDay={meetingDay}
                    meetingDate={meetingDate}
                    meetingAgenda={meetingAgenda}
                    users={users}
                />
            );
            
            const page = tempContainer.children[0] as HTMLElement;
            if(!page) throw new Error("PDF export element not found");

            const canvas = await html2canvas(page, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            
            const { jsPDF } = jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
            pdf.save('محضر_اجتماع.pdf');

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
        <PageWrapper title="محضر اجتماع الهيئات التعليمية" setCurrentPageKey={setCurrentPageKey}>
            <div className="bg-gray-50 p-6 rounded-lg border shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="font-bold text-lg">يوم الاجتماع:</label>
                        <input 
                            type="text"
                            value={meetingDay}
                            onChange={e => setMeetingDay(e.target.value)}
                            className="w-full p-2 border rounded-md mt-1"
                            placeholder="مثال: الاربعاء"
                        />
                    </div>
                     <div>
                        <label className="font-bold text-lg">تاريخ الاجتماع:</label>
                        <input 
                            type="text"
                            value={meetingDate}
                            onChange={e => setMeetingDate(e.target.value)}
                            className="w-full p-2 border rounded-md mt-1"
                            placeholder="مثال: ٢ / ١ / ٢٠٢٥"
                        />
                    </div>
                </div>
                 <div>
                    <label className="font-bold text-lg">محاور الاجتماع:</label>
                    <textarea
                        value={meetingAgenda}
                        onChange={e => setMeetingAgenda(e.target.value)}
                        rows={10}
                        className="w-full p-3 border rounded-md mt-1 font-sans text-lg leading-relaxed"
                        placeholder="اكتب هنا المحاور التي تمت مناقشتها..."
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
                <h3 className="text-xl font-bold text-center mb-4">معاينة المحضر</h3>
                <div className="p-4 bg-gray-100 rounded-lg shadow-inner overflow-hidden">
                    <div className="transform scale-[0.8] origin-top mx-auto -my-14">
                        <MinutesPDFPage 
                            settings={settings}
                            meetingDay={meetingDay}
                            meetingDate={meetingDate}
                            meetingAgenda={meetingAgenda}
                            users={users}
                        />
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
}