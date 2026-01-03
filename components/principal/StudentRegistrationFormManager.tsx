import React, { useState, useRef } from 'react';
import * as ReactDOM from 'react-dom/client';
import { FileDown, Loader2 } from 'lucide-react';
import RegistrationFormPage1 from './RegistrationFormPage1.tsx';
import RegistrationFormPage2 from './RegistrationFormPage2.tsx';

declare const jspdf: any;
declare const html2canvas: any;

export default function StudentRegistrationFormManager() {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [studentPhoto, setStudentPhoto] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    const handleUpdate = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setStudentPhoto(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleExportPdf = async () => {
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

        try {
            await document.fonts.ready;

            // Render and capture page 1
            // FIX: Correct props being passed to RegistrationFormPage1
            await renderComponent(
                <RegistrationFormPage1 formData={formData} onUpdate={handleUpdate} studentPhoto={studentPhoto} onPhotoUpload={handlePhotoUpload} isPdfMode />
            );
            const page1Element = tempContainer.children[0] as HTMLElement;
            const canvas1 = await html2canvas(page1Element, { scale: 2, useCORS: true });
            pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
            setExportProgress(50);

            // Render and capture page 2
            pdf.addPage();
            await renderComponent(
                <RegistrationFormPage2 formData={formData} onUpdate={handleUpdate} isPdfMode />
            );
            const page2Element = tempContainer.children[0] as HTMLElement;
            const canvas2 = await html2canvas(page2Element, { scale: 2, useCORS: true });
            pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
            setExportProgress(100);

            pdf.save('استمارة-تسجيل-طالب.pdf');

        } catch (error) {
            console.error("PDF Export error:", error);
            alert(`حدث خطأ أثناء التصدير: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-8">
            {isExporting && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center z-[200] text-white">
                    <Loader2 className="animate-spin h-16 w-16 mb-4" />
                    <p className="text-2xl font-bold mb-2">جاري تصدير الاستمارة...</p>
                    <div className="w-1/2 bg-gray-600 rounded-full h-4"><div className="bg-cyan-500 h-4 rounded-full" style={{ width: `${exportProgress}%` }}></div></div>
                    <p className="mt-2 text-lg">{exportProgress}%</p>
                </div>
            )}
            <div className="bg-white p-4 rounded-xl shadow-lg flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">استمارة معلومات الطالب</h2>
                <button
                    onClick={handleExportPdf}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition disabled:bg-gray-400"
                >
                    <FileDown size={20} />
                    تصدير PDF
                </button>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-lg">
                {/* FIX: Correct props being passed to RegistrationFormPage1 */}
                <RegistrationFormPage1 formData={formData} onUpdate={handleUpdate} studentPhoto={studentPhoto} onPhotoUpload={handlePhotoUpload} />
            </div>
            <div className="bg-white p-4 rounded-xl shadow-lg">
                <RegistrationFormPage2 formData={formData} onUpdate={handleUpdate} />
            </div>
        </div>
    );
}