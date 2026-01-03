import React, { useState, useEffect, useMemo } from 'react';
import type { User, ScheduleData, SchoolSettings } from '../../types';
import { db } from '../../lib/firebase';
import { Loader2, FileDown } from 'lucide-react';

declare const jspdf: any;
declare const html2canvas: any;

interface StudentScheduleViewProps {
    currentUser: User;
    scheduleData: ScheduleData | null;
}

const DAYS_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const DAY_NAMES_AR: Record<string, string> = {
    Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس'
};
const PERIOD_NAMES = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السبتعة"];

const getClassNameKey = (stage: string, section: string): string => `${stage.replace(/ /g, '-')}-${section}`;

export default function StudentScheduleView({ currentUser, scheduleData }: StudentScheduleViewProps) {
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
        const scheduleElement = document.getElementById('student-schedule-export');
        if (!scheduleElement) return;

        setIsExporting(true);
        try {
            await document.fonts.ready;
            const canvas = await html2canvas(scheduleElement, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = jspdf;
            const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            pdf.save(`جدول-${currentUser.name}.pdf`);
        } catch (error) {
            console.error("PDF Export failed:", error);
            alert("فشل تصدير الملف.");
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading || !settings) {
        return <div className="flex justify-center p-8"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    }

    if (!scheduleData) {
        return (
            <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                <h2 className="text-xl font-bold">لم يتم نشر الجدول الدراسي بعد</h2>
                <p className="mt-2 text-gray-600">يرجى مراجعة إدارة المدرسة.</p>
            </div>
        );
    }
    
    const classNameKey = getClassNameKey(currentUser.stage || '', currentUser.section || '');
    const publishDate = new Date().toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' });

    return (
        <div className="space-y-4">
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
            <div id="student-schedule-export" className="w-[1123px] h-[794px] p-6 bg-white flex flex-col border-2 border-black" dir="rtl">
                <header className="flex justify-between items-center text-center text-sm font-bold mb-4">
                    <div className="w-1/3 text-right">
                        <p>جمهورية العراق</p>
                        <p>وزارة التربية</p>
                        <p>المديرية العامة للتربية في {settings.governorateName || '...'}</p>
                    </div>
                    <div className="w-1/3">
                        <h1 className="text-xl">جدول الدروس الاسبوعي</h1>
                        <h2 className="text-2xl font-bold text-cyan-700 my-1">{currentUser.stage} - {currentUser.section}</h2>
                        <h2 className="text-lg">{settings.schoolName}</h2>
                        <h3 className="text-md">للعام الدراسي {settings.academicYear}</h3>
                    </div>
                    <div className="w-1/3 text-left">
                        <p>يعمل به بتاريخ</p>
                        <p>{publishDate}</p>
                    </div>
                </header>

                <main className="flex-grow mt-4">
                    <table className="w-full h-full border-collapse border-2 border-black">
                        <thead>
                            <tr className="bg-gray-200 text-lg font-bold">
                                <th className="border-2 border-black p-2 w-24">الحصة</th>
                                {DAYS_ORDER.map(day => <th key={day} className="border-2 border-black p-2">{DAY_NAMES_AR[day]}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 7 }).map((_, periodIndex) => (
                                <tr key={periodIndex} className="h-20">
                                    <td className="border-2 border-black text-center font-bold text-lg bg-gray-100">
                                        {PERIOD_NAMES[periodIndex]}
                                    </td>
                                    {DAYS_ORDER.map(day => {
                                        const assignment = scheduleData[day]?.find(p => p.period === periodIndex + 1)?.assignments?.[classNameKey];
                                        return (
                                            <td key={day} className="border-2 border-black text-center p-1">
                                                {assignment ? (
                                                    <div>
                                                        <p className="font-bold text-lg">{assignment.subject}</p>
                                                        <p className="text-sm text-gray-700">{assignment.teacher}</p>
                                                    </div>
                                                ) : null}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </main>

                <footer className="text-center mt-4 pt-2 border-t-2 border-dashed">
                    <p className="text-lg font-bold">ادارة المدرسة</p>
                </footer>
            </div>
        </div>
    );
}