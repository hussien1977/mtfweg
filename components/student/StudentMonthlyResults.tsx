
import React, { useState, useEffect } from 'react';
import type { User, SchoolSettings, PublishedMonthlyResult } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { Loader2, FileDown, AlertCircle, Info } from 'lucide-react';
import StudentMonthlyResultCard from './StudentMonthlyResultCard.tsx';

declare const jspdf: any;
declare const html2canvas: any;

interface StudentMonthlyResultsProps {
    currentUser: User;
    resultsData: Record<string, PublishedMonthlyResult> | null;
}

export default function StudentMonthlyResults({ currentUser, resultsData }: StudentMonthlyResultsProps) {
    const [settings, setSettings] = useState<SchoolSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (!currentUser.principalId) {
            setIsLoading(false);
            return;
        }
        const settingsRef = db.ref(`settings/${currentUser.principalId}`);
        settingsRef.get().then(snapshot => {
            if (snapshot.exists()) {
                setSettings(snapshot.val());
            }
        }).finally(() => setIsLoading(false));
    }, [currentUser.principalId]);

    const handleExportPdf = async () => {
        if (!resultsData) return;
        
        const cardElement = document.getElementById('monthly-result-card-export');
        if (!cardElement) return;

        setIsExporting(true);
        try {
            await document.fonts.ready;
            const canvas = await html2canvas(cardElement, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = jspdf;
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            pdf.save(`النتائج_الشهرية-${currentUser.name}.pdf`);
        } catch (error) {
            console.error("PDF Export failed:", error);
            alert("فشل تصدير الملف.");
        } finally {
            setIsExporting(false);
        }
    };
    
    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    }

    const showResults = resultsData && Object.keys(resultsData).length > 0;
    const showNotice = settings?.monthlyResultsNotice;

    return (
        <div className="space-y-6">
            {/* Professional Grade Update Notice */}
            {showNotice && (
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Info size={120} />
                    </div>
                    <div className="relative z-10 flex items-start gap-4">
                        <div className="bg-white/20 p-3 rounded-full flex-shrink-0 animate-pulse">
                            <AlertCircle size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-2">تنويه هام من إدارة المدرسة</h3>
                            <p className="text-lg leading-relaxed opacity-95">
                                عزيزي الطالب، نود إعلامك بأن الإدارة تقوم حالياً بتدقيق وتحديث الدرجات الشهرية لضمان أقصى درجات الدقة والشفافية. 
                                <span className="block mt-2 font-semibold">سيتم إعادة نشر النتائج المحدثة فور اكتمال عملية التدقيق. شكراً لتفهمك وحرصك.</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {!showResults ? (
                <div className="bg-white p-12 rounded-2xl shadow-lg text-center border-2 border-dashed border-gray-200">
                    <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={40} className="text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">لا توجد نتائج منشورة حالياً</h2>
                    <p className="mt-3 text-gray-500 text-lg max-w-md mx-auto">
                        يرجى الانتظار حتى تقوم إدارة المدرسة بنشر النتائج الرسمية، أو مراجعة شريط التنبيهات أعلاه.
                    </p>
                </div>
            ) : (
                settings && (
                    <div className="bg-white p-4 rounded-xl shadow-lg space-y-4 overflow-auto">
                        <div className="flex justify-end">
                            <button 
                                onClick={handleExportPdf}
                                disabled={isExporting}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition disabled:bg-gray-400"
                            >
                                {isExporting ? <Loader2 className="animate-spin"/> : <FileDown size={18} />}
                                {isExporting ? 'جاري التصدير...' : 'تصدير PDF'}
                            </button>
                        </div>
                        <div className="flex justify-center">
                            <div id="monthly-result-card-export">
                                <StudentMonthlyResultCard
                                    student={currentUser}
                                    settings={settings}
                                    resultsData={resultsData}
                                />
                            </div>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
