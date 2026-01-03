import React, { useState, useMemo } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { ClassData, SchoolSettings, Student } from '../../types.ts';
import { GRADE_LEVELS } from '../../constants.ts';
import { FileDown, Loader2, ImagePlus, CalendarDays, Clock, Users } from 'lucide-react';
import InvitationPDFPage from './InvitationPDFPage.tsx';

declare const jspdf: any;
declare const html2canvas: any;

interface ParentInvitationExporterProps {
    classes: ClassData[];
    settings: SchoolSettings;
}

export default function ParentInvitationExporter({ classes, settings }: ParentInvitationExporterProps) {
    const [selectedStage, setSelectedStage] = useState<string>('');
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [meetingDay, setMeetingDay] = useState('');
    const [meetingTime, setMeetingTime] = useState('');
    const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
    
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    const classesInSelectedStage = useMemo(() => {
        return selectedStage ? classes.filter(c => c.stage === selectedStage) : [];
    }, [selectedStage, classes]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setSchoolLogo(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const getStudentsToExport = (): { students: Student[], classMap: Map<string, ClassData> } => {
        const students: Student[] = [];
        const classMap = new Map<string, ClassData>();
        
        classes
            .filter(c => selectedClassIds.includes(c.id))
            .forEach(c => {
                (c.students || []).forEach(s => {
                    students.push(s);
                    classMap.set(s.id, c);
                });
            });

        return { students, classMap };
    };

    const handleExportPdf = async () => {
        const { students, classMap } = getStudentsToExport();

        if (students.length === 0 || !meetingDay || !meetingTime) {
            alert('يرجى اختيار الشعب وتحديد اليوم والساعة قبل التصدير.');
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
        Object.assign(tempContainer.style, {
            position: 'absolute',
            left: '-9999px',
            top: '0',
        });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        const renderComponent = (component: React.ReactElement) => new Promise<void>(resolve => {
            root.render(component);
            setTimeout(resolve, 500);
        });

        const studentChunks = [];
        for (let i = 0; i < students.length; i += 4) {
            studentChunks.push(students.slice(i, i + 4));
        }
        
        const totalPages = studentChunks.length;

        try {
            await document.fonts.ready;

            for (let i = 0; i < totalPages; i++) {
                const chunk = studentChunks[i];
                await renderComponent(
                    <InvitationPDFPage
                        studentsChunk={chunk}
                        classMap={classMap}
                        settings={settings}
                        meetingTime={meetingTime}
                        meetingDay={meetingDay}
                        schoolLogo={schoolLogo}
                    />
                );

                const pageElement = tempContainer.children[0] as HTMLElement;
                const canvas = await html2canvas(pageElement, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/png');

                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
                setExportProgress(Math.round(((i + 1) / totalPages) * 100));
            }
            pdf.save(`دعوات-اجتماع-${selectedStage}.pdf`);
        } catch (error) {
            console.error("PDF Export error:", error);
            alert(`حدث خطأ أثناء التصدير: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            root.unmount();
            if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
            }
            setIsExporting(false);
            setExportProgress(0);
        }
    };


    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-5xl mx-auto">
             <div className="flex items-center gap-3 mb-6 border-b pb-4">
                <Users className="text-cyan-600" size={32} />
                <h2 className="text-3xl font-bold text-gray-800">إعداد دعوات اجتماع أولياء الأمور</h2>
             </div>
            
            {isExporting && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center z-[200] text-white">
                    <Loader2 className="animate-spin h-16 w-16 mb-4" />
                    <p className="text-2xl font-bold mb-2">جاري إعداد الدعوات...</p>
                    <div className="w-1/2 bg-gray-600 rounded-full h-4"><div className="bg-cyan-500 h-4 rounded-full" style={{ width: `${exportProgress}%` }}></div></div>
                    <p className="mt-2 text-lg">{exportProgress}%</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Column 1: Selections */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-md font-bold text-gray-700 mb-2">1. اختر المرحلة الدراسية</label>
                        <select onChange={e => { setSelectedStage(e.target.value); setSelectedClassIds([]); }} value={selectedStage} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500">
                            <option value="">-- اختر مرحلة --</option>
                            {GRADE_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                        </select>
                    </div>

                    {selectedStage && (
                        <div>
                            <label className="block text-md font-bold text-gray-700 mb-2">2. اختر الشعبة (أو الشعب)</label>
                            <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                                {classesInSelectedStage.length > 0 ? classesInSelectedStage.map(c => (
                                    <label key={c.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                        <input type="checkbox" checked={selectedClassIds.includes(c.id)} onChange={() => setSelectedClassIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])} className="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"/>
                                        <span className="font-semibold">{c.stage} - {c.section}</span>
                                        <span className="text-sm text-gray-500">({(c.students || []).length} طالب)</span>
                                    </label>
                                )) : <p className="text-gray-500">لا توجد شعب لهذه المرحلة.</p>}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Column 2: Details & Logo */}
                <div className="space-y-6">
                     <div>
                        <label htmlFor="meetingDay" className="flex items-center gap-2 text-md font-bold text-gray-700 mb-2">
                            <CalendarDays className="text-gray-500" />
                            3. حدد يوم الاجتماع
                        </label>
                        <input id="meetingDay" type="text" value={meetingDay} onChange={(e) => setMeetingDay(e.target.value)} placeholder="مثال: الثلاثاء" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500" />
                    </div>
                    <div>
                        <label htmlFor="meetingTime" className="flex items-center gap-2 text-md font-bold text-gray-700 mb-2">
                            <Clock className="text-gray-500" />
                            4. حدد ساعة الاجتماع
                        </label>
                        <input id="meetingTime" type="text" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} placeholder="مثال: التاسعة صباحاً" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500" />
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-md font-bold text-gray-700 mb-2">
                            <ImagePlus className="text-gray-500" />
                            5. تحميل شعار المدرسة (اختياري)
                        </label>
                        <div className="flex items-center gap-4">
                            <input type="file" onChange={handleLogoChange} accept="image/*" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"/>
                            {schoolLogo && <img src={schoolLogo} alt="School Logo Preview" className="h-16 w-16 object-contain rounded-full border p-1" />}
                        </div>
                    </div>
                </div>
            </div>
             <div className="border-t pt-6 mt-8">
                <div className="flex justify-center">
                    <button onClick={handleExportPdf} disabled={selectedClassIds.length === 0 || isExporting} className="flex items-center justify-center gap-2 px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed w-full md:w-auto">
                        <FileDown size={20} />
                        <span>تصدير دعوات PDF (4 لكل صفحة)</span>
                    </button>
                </div>
            </div>
        </div>
    );
}