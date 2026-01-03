import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as ReactDOM from 'react-dom/client';
import { QrCode, Search, UserMinus, Layout, Camera, RefreshCw, X, Save, FileDown, Loader2, ListChecks, CheckCircle, AlertTriangle, Trash2, Info, FileText, Keyboard, FileType, BookOpen, UserCheck } from 'lucide-react';
import type { ClassData, Student, SchoolSettings, ExamAbsenceRecord, SeatingAssignment } from '../../types.ts';
import { GRADE_LEVELS } from '../../constants.ts';
import { db } from '../../lib/firebase.ts';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import AbsenceListPage from './AbsenceListPage.tsx';
import AbsenceSummaryPage from './AbsenceSummaryPage.tsx';

declare const jspdf: any;
declare const html2canvas: any;

interface ExamAbsenceRecorderProps {
    classes: ClassData[];
    settings: SchoolSettings;
}

type Tab = 'seating' | 'scanning';

const FIELD_OPTIONS = [
    { key: 'midYear', label: 'نصف السنة' },
    { key: 'finalExam1st', label: 'الامتحان النهائي' },
    { key: 'finalExam2nd', label: 'الاكمال' }
];

const normalizeDigits = (str: string): string => {
    if (!str) return '';
    // FIX: Replaced duplicate '٨' (U+0668) with the correct Extended Arabic-Indic digit '۸' (U+06F8).
    const map: Record<string, string> = {
        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
        '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
    };
    return str.replace(/[٠-٩۰-۹]/g, (d) => map[d] || d).replace(/\D/g, '');
};

const playScanSound = (success: boolean) => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(success ? 880 : 220, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
};

export default function ExamAbsenceRecorder({ classes, settings }: ExamAbsenceRecorderProps) {
    const [activeTab, setActiveTab] = useState<Tab>('seating');
    const [selectedStages, setSelectedStages] = useState<string[]>([]);
    const [stageSubjects, setStageSubjects] = useState<Record<string, string>>({});
    const [targetField, setTargetField] = useState('midYear');
    const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [isSavingSeating, setIsSavingSeating] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isApproving, setIsApproving] = useState(false);

    const [seatingAssignments, setSeatingAssignments] = useState<Record<string, SeatingAssignment>>({}); 
    const [absentRecords, setAbsentRecords] = useState<Record<string, ExamAbsenceRecord>>({}); 

    const [isScannerActive, setIsScannerActive] = useState(false);
    const [lastScannedStudent, setLastScannedStudent] = useState<ExamAbsenceRecord | null>(null);
    const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string>('');
    const [isLoadingCameras, setIsLoadingCameras] = useState(false);
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

    // FIX: Defined missing filteredGradeLevels variable based on GRADE_LEVELS from constants.
    const filteredGradeLevels = GRADE_LEVELS;

    // توحيد المعرف ليشمل فقط الحروف المسموحة
    const principalId = useMemo(() => {
        // إذا كان هناك معرف مخصص للمدرسة في settings يفضل استخدامه، وإلا نستخدم الاسم
        return (settings.principalName + "_" + settings.schoolName).replace(/[.#$[\]]/g, "_");
    }, [settings]);

    useEffect(() => {
        const path = `exam_seating/${principalId}`;
        const ref = db.ref(path);
        const callback = (snap: any) => setSeatingAssignments(snap.val() || {});
        ref.on('value', callback);
        return () => ref.off('value', callback);
    }, [principalId]);

    useEffect(() => {
        if (selectedStages.length === 0 || !currentDate) {
            setAbsentRecords({});
            return;
        }
        
        const fetchAllAbsences = async () => {
            const allAbsences: Record<string, ExamAbsenceRecord> = {};
            for (const stage of selectedStages) {
                const path = `exam_absences/${principalId}/${stage}/${currentDate}`;
                const snap = await db.ref(path).get();
                if (snap.exists()) {
                    Object.assign(allAbsences, snap.val());
                }
            }
            setAbsentRecords(allAbsences);
        };

        // تفعيل المستمعات (Listeners) لكل مرحلة مختارة
        const activeRefs = selectedStages.map(stage => {
            const r = db.ref(`exam_absences/${principalId}/${stage}/${currentDate}`);
            r.on('value', fetchAllAbsences);
            return r;
        });

        fetchAllAbsences();

        return () => {
            activeRefs.forEach(r => r.off('value'));
        };
    }, [principalId, selectedStages, currentDate]);

    const activeStudents = useMemo(() => {
        if (selectedStages.length === 0) return [];
        return classes
            .filter(c => selectedStages.includes(c.stage))
            .flatMap(c => c.students || [])
            .filter(s => !s.enrollmentStatus || s.enrollmentStatus === 'active')
            .sort((a, b) => {
                const aId = parseInt(normalizeDigits(a.examId || '0'), 10);
                const bId = parseInt(normalizeDigits(b.examId || '0'), 10);
                return aId - bId;
            });
    }, [classes, selectedStages]);

    const getFinalAbsenceList = useMemo(() => {
        const combined: Record<string, ExamAbsenceRecord> = { ...absentRecords };
        
        activeStudents.forEach(student => {
            const seating = seatingAssignments[student.id];
            if (seating?.isExcused && !combined[student.id]) {
                const classData = classes.find(c => c.students?.some(s => s.id === student.id))!;
                combined[student.id] = {
                    studentId: student.id,
                    studentName: student.name,
                    stage: classData.stage,
                    section: classData.section,
                    hallNumber: seating.hallNumber || '?',
                    sectorNumber: seating.sectorNumber || '?',
                    examId: student.examId || '?',
                    status: 'excused'
                };
            }
        });

        return Object.values(combined).sort((a, b) => {
            const idA = parseInt(normalizeDigits(a.examId)) || 0;
            const idB = parseInt(normalizeDigits(b.examId)) || 0;
            return idA - idB;
        });
    }, [absentRecords, activeStudents, seatingAssignments, classes]);

    const handleSeatingChange = (studentId: string, field: keyof SeatingAssignment, value: any) => {
        setSeatingAssignments(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || { hallNumber: '', sectorNumber: '', isExcused: false }),
                [field]: value
            }
        }));
    };

    const handleSaveSeating = async () => {
        setIsSavingSeating(true);
        try {
            await db.ref(`exam_seating/${principalId}`).set(seatingAssignments);
            alert("تم حفظ توزيع القاعات وتأشير الإجازات بنجاح.");
        } catch (error) {
            alert("حدث خطأ أثناء الحفظ.");
        } finally {
            setIsSavingSeating(false);
        }
    };

    const fetchCameras = async () => {
        setIsLoadingCameras(true);
        try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
                setCameras(devices.map(d => ({ id: d.id, label: d.label })));
                const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
                setSelectedCameraId(backCamera ? backCamera.id : devices[0].id);
            }
        } catch (err) {
            console.error("No cameras found");
        } finally {
            setIsLoadingCameras(false);
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try { await html5QrCodeRef.current.stop(); } catch (err) {}
        }
    };

    const startScanner = async () => {
        if (!selectedCameraId || !isScannerActive) return;
        await stopScanner();
        try {
            const scanner = new Html5Qrcode("exam-qr-reader", {
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                verbose: false
            });
            html5QrCodeRef.current = scanner;
            await scanner.start(
                selectedCameraId,
                { fps: 20, qrbox: { width: 250, height: 250 } },
                (text) => {
                    const cleanId = normalizeDigits(text);
                    const student = activeStudents.find(s => normalizeDigits(s.examId || '') === cleanId);
                    if (student) {
                        registerAbsence(student);
                    } else {
                        playScanSound(false);
                    }
                },
                () => {}
            );
        } catch (err) {
            setIsScannerActive(false);
        }
    };

    const registerAbsence = async (student: Student) => {
        if (absentRecords[student.id]) return; 

        const seating = seatingAssignments[student.id] || { hallNumber: '?', sectorNumber: '?', isExcused: false };
        const classData = classes.find(c => c.students?.some(s => s.id === student.id))!;
        
        const record: ExamAbsenceRecord = {
            studentId: student.id,
            studentName: student.name,
            stage: classData.stage,
            section: classData.section,
            hallNumber: seating.hallNumber || '?',
            sectorNumber: seating.sectorNumber || '?',
            examId: student.examId || '?',
            status: seating.isExcused ? 'excused' : 'absent'
        };

        try {
            await db.ref(`exam_absences/${principalId}/${classData.stage}/${currentDate}/${student.id}`).set(record);
            setLastScannedStudent(record);
            playScanSound(true);
            if (window.navigator.vibrate) window.navigator.vibrate(100);
        } catch (e) {
            console.error(e);
        }
    };

    const removeAbsence = async (studentId: string, stage: string) => {
        if (confirm("هل تريد إزالة هذا الطالب من قائمة الغياب؟")) {
            await db.ref(`exam_absences/${principalId}/${stage}/${currentDate}/${studentId}`).remove();
        }
    };

    const handleApproveAbsences = async () => {
        const list = getFinalAbsenceList;
        if (list.length === 0) {
            alert("لا توجد غيابات أو إجازات مسجلة لاعتمادها.");
            return;
        }

        const missingSubjects = selectedStages.filter(s => !stageSubjects[s]);
        if (missingSubjects.length > 0) {
            alert(`يرجى تحديد مادة الامتحان للمراحل التالية أولاً: ${missingSubjects.join('، ')}`);
            return;
        }

        if (!confirm(`سيتم تسجيل ${list.length} طالب كغائب أو مجاز في سجل الدرجات لمادة اليوم. هل أنت متأكد؟`)) return;

        setIsApproving(true);
        const updates: Record<string, any> = {};

        try {
            list.forEach(record => {
                const classData = classes.find(c => c.stage === record.stage && c.section === record.section);
                if (!classData) return;

                const studentIndex = (classData.students || []).findIndex(s => s.id === record.studentId);
                if (studentIndex === -1) return;

                const subjectName = stageSubjects[record.stage];
                const gradeValue = record.status === 'excused' ? -2 : -1;

                const path = `classes/${classData.id}/students/${studentIndex}/grades/${subjectName}/${targetField}`;
                updates[path] = gradeValue;
            });

            if (Object.keys(updates).length > 0) {
                await db.ref().update(updates);
                alert("تم اعتماد الغيابات والإجازات وتحديث سجل الدرجات بنجاح.");
            }
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء عملية الاعتماد.");
        } finally {
            setIsApproving(false);
        }
    };

    const handleExport = async (type: 'list' | 'summary') => {
        const list = getFinalAbsenceList;
        if (selectedStages.length === 0 || (list.length === 0 && type === 'list')) {
            alert("يرجى اختيار المرحلة وتأكد من وجود غيابات أو إجازات مسجلة.");
            return;
        }

        setIsExporting(true);

        const { jsPDF } = jspdf;
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        const renderComponent = (component: React.ReactElement) => new Promise<void>(resolve => {
            root.render(component);
            setTimeout(resolve, 800);
        });

        try {
            await document.fonts.ready;

            if (type === 'list') {
                await renderComponent(
                    <AbsenceListPage 
                        settings={settings}
                        stages={selectedStages}
                        stageSubjects={stageSubjects}
                        date={currentDate}
                        absences={list}
                    />
                );
                const element = tempContainer.children[0] as HTMLElement;
                const canvas = await html2canvas(element, { scale: 2, useCORS: true });
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
            } else {
                await renderComponent(
                    <AbsenceSummaryPage 
                        settings={settings}
                        stages={selectedStages}
                        stageSubjects={stageSubjects}
                        date={currentDate}
                        absences={list}
                        allClasses={classes}
                        seating={seatingAssignments}
                    />
                );
                
                const pages = tempContainer.querySelectorAll('.summary-page');
                for (let i = 0; i < pages.length; i++) {
                    if (i > 0) pdf.addPage();
                    const canvas = await html2canvas(pages[i] as HTMLElement, { scale: 2, useCORS: true });
                    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
                }
            }

            pdf.save(`${type === 'list' ? 'قائمة_غياب' : 'خلاصة_غيابات'}.pdf`);

        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء التصدير.");
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
        }
    };

    const handleStageToggle = (stage: string) => {
        setSelectedStages(prev => {
            if (prev.includes(stage)) {
                const newStages = prev.filter(s => s !== stage);
                const newSubjects = { ...stageSubjects };
                delete newSubjects[stage];
                setStageSubjects(newSubjects);
                return newStages;
            } else {
                return [...prev, stage];
            }
        });
    };

    const handleSubjectChange = (stage: string, subject: string) => {
        setStageSubjects(prev => ({ ...prev, [stage]: subject }));
    };

    useEffect(() => {
        if (isScannerActive && activeTab === 'scanning') {
            if (cameras.length === 0) fetchCameras();
            startScanner();
        } else {
            stopScanner();
        }
        return () => { stopScanner(); };
    }, [isScannerActive, activeTab, selectedCameraId]);

    return (
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xl max-w-6xl mx-auto border-t-4 border-amber-500 font-['Cairo']">
            {(isExporting || isApproving) && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-16 h-16 animate-spin mb-4" />
                    <p className="text-xl font-bold">{isApproving ? 'جاري اعتماد الدرجات...' : 'جاري المعالجة والتصدير...'}</p>
                </div>
            )}

            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="bg-amber-100 p-2 rounded-lg"><UserMinus className="text-amber-600 w-8 h-8" /></div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">تسجيل غيابات الامتحانات</h2>
                        <p className="text-sm text-gray-500">إدارة القاعات وتسجيل الغيابات بـ QR</p>
                    </div>
                </div>
                
                <div className="flex bg-gray-100 p-1.5 rounded-xl w-full sm:w-auto shadow-inner">
                    <button onClick={() => setActiveTab('seating')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'seating' ? 'bg-white text-amber-600 shadow-md transform scale-105' : 'text-gray-500'}`}><Layout size={20} /><span>توزيع القاعات</span></button>
                    <button onClick={() => setActiveTab('scanning')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'scanning' ? 'bg-white text-amber-600 shadow-md transform scale-105' : 'text-gray-500'}`}><QrCode size={20} /><span>مسح الغيابات</span></button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <label className="block text-sm font-black text-gray-600 mb-2">اختر المراحل الدراسية الخاصة بالمدرسة:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-gray-200 max-h-32 overflow-y-auto">
                        {filteredGradeLevels.map(g => (
                            <label key={g} className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition-all ${selectedStages.includes(g) ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                                <input type="checkbox" checked={selectedStages.includes(g)} onChange={() => handleStageToggle(g)} className="w-4 h-4 text-amber-600" />
                                <span className="text-xs font-bold">{g}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-black text-gray-600 mb-2">تاريخ اليوم:</label>
                    <input type="date" value={currentDate} onChange={e => setCurrentDate(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white focus:border-amber-500 outline-none h-[88px]" />
                </div>
            </div>

            {selectedStages.length > 0 && (
                <div className="mb-8 bg-blue-50 p-6 rounded-2xl border border-blue-100">
                    <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                        <BookOpen className="text-blue-600" /> تحديد المواد الامتحانية لهذا اليوم
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {selectedStages.map(stage => (
                            <div key={stage} className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm">
                                <label className="block text-sm font-black text-blue-800 mb-2">{stage}</label>
                                <input 
                                    type="text" 
                                    value={stageSubjects[stage] || ''} 
                                    onChange={(e) => handleSubjectChange(stage, e.target.value)}
                                    placeholder="اسم المادة..."
                                    className="w-full p-2 border rounded-lg focus:border-blue-500 outline-none font-bold text-gray-700"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {selectedStages.length === 0 ? (
                <div className="text-center p-20 bg-gray-100 rounded-2xl border-4 border-dashed border-gray-300">
                    <Info className="mx-auto w-16 h-16 text-gray-400 mb-4" />
                    <h3 className="text-xl font-bold text-gray-500">يرجى اختيار مرحلة واحدة على الأقل للبدء</h3>
                </div>
            ) : activeTab === 'seating' ? (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="text-sm font-bold text-blue-800 flex items-center gap-2">
                            <AlertTriangle size={16} />
                            <span>وزع الطلاب على القاعات، وأشر على "مجاز" لمن لديه عذر رسمي لليوم.</span>
                        </div>
                        <button onClick={handleSaveSeating} disabled={isSavingSeating} className="bg-green-600 text-white px-8 py-2.5 rounded-lg font-bold shadow-md hover:bg-green-700 transition flex items-center gap-2">
                            {isSavingSeating ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            <span>حفظ التوزيع والاجازات</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto border rounded-xl shadow-inner">
                        <table className="w-full text-right">
                            <thead className="bg-gray-800 text-white">
                                <tr>
                                    <th className="p-3 text-center w-12">ت</th>
                                    <th className="p-3">اسم الطالب</th>
                                    <th className="p-3">المرحلة</th>
                                    <th className="p-3 text-center">الرقم الامتحاني</th>
                                    <th className="p-3 text-center w-32">رقم القاعة</th>
                                    <th className="p-3 text-center w-32">رقم القطاع</th>
                                    <th className="p-3 text-center w-24 bg-blue-700">مجاز</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {activeStudents.map((s, i) => (
                                    <tr key={s.id} className={`hover:bg-amber-50 transition-colors ${seatingAssignments[s.id]?.isExcused ? 'bg-blue-50' : ''}`}>
                                        <td className="p-3 text-center font-bold text-gray-400">{i + 1}</td>
                                        <td className={`p-3 font-bold ${seatingAssignments[s.id]?.isExcused ? 'text-blue-700' : 'text-gray-700'}`}>
                                            {s.name} {seatingAssignments[s.id]?.isExcused && '(مجاز)'}
                                        </td>
                                        <td className="p-3 text-xs font-bold text-cyan-600">{classes.find(c => c.students?.some(stu => stu.id === s.id))?.stage}</td>
                                        <td className="p-3 text-center font-mono font-bold text-cyan-700">{s.examId}</td>
                                        <td className="p-2">
                                            <input 
                                                type="text" 
                                                value={seatingAssignments[s.id]?.hallNumber || ''} 
                                                onChange={e => handleSeatingChange(s.id, 'hallNumber', e.target.value)}
                                                className="w-full text-center p-2 border rounded-lg focus:border-amber-500 outline-none"
                                                placeholder="1"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input 
                                                type="text" 
                                                value={seatingAssignments[s.id]?.sectorNumber || ''} 
                                                onChange={e => handleSeatingChange(s.id, 'sectorNumber', e.target.value)}
                                                className="w-full text-center p-2 border rounded-lg focus:border-amber-500 outline-none"
                                                placeholder="A"
                                            />
                                        </td>
                                        <td className="p-2 text-center">
                                            <input 
                                                type="checkbox" 
                                                checked={!!seatingAssignments[s.id]?.isExcused}
                                                onChange={e => handleSeatingChange(s.id, 'isExcused', e.target.checked)}
                                                className="w-6 h-6 text-blue-600 rounded"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-xl border shadow-md text-center flex flex-col items-center">
                        <h3 className="font-bold mb-4 text-xl flex items-center gap-2"><Camera className="text-amber-500" /> ماسح غيابات القاعات</h3>
                        
                        <div className="mb-4 w-full space-y-4">
                            <div className="flex gap-2">
                                <button onClick={() => setIsScannerActive(!isScannerActive)} className={`flex-1 py-3 rounded-full font-bold text-lg transition-all shadow-md flex items-center justify-center gap-2 ${isScannerActive ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                                    {isScannerActive ? <X /> : <Camera />}
                                    <span>{isScannerActive ? 'إيقاف الكاميرا' : 'بدء المسح'}</span>
                                </button>
                                <button onClick={fetchCameras} className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors shadow-inner"><RefreshCw size={24} className={isLoadingCameras ? 'animate-spin' : ''}/></button>
                            </div>
                            {isScannerActive && (
                                <select value={selectedCameraId} onChange={(e) => setSelectedCameraId(e.target.value)} className="w-full p-2 text-sm border-2 border-gray-100 rounded-xl bg-gray-50 font-bold outline-none">
                                    {cameras.map(cam => <option key={cam.id} value={cam.id}>{cam.label || `كاميرا ${cam.id.substring(0,5)}`}</option>)}
                                </select>
                            )}
                        </div>

                        <div className="relative w-full aspect-square max-w-[350px] bg-black rounded-3xl overflow-hidden border-8 border-gray-800 shadow-2xl flex items-center justify-center">
                            <div id="exam-qr-reader" className="w-full h-full"></div>
                            {!isScannerActive && <div className="absolute inset-0 flex items-center justify-center"><QrCode size={120} className="text-gray-700 opacity-20" /></div>}
                        </div>

                        {lastScannedStudent && (
                            <div className={`mt-6 w-full p-4 border-2 rounded-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300 ${lastScannedStudent.status === 'excused' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full text-white shadow-lg ${lastScannedStudent.status === 'excused' ? 'bg-blue-600' : 'bg-green-500'}`}>
                                        {lastScannedStudent.status === 'excused' ? <UserCheck /> : <CheckCircle />}
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-black ${lastScannedStudent.status === 'excused' ? 'text-blue-600' : 'text-green-600'}`}>
                                            تم تسجيل {lastScannedStudent.status === 'excused' ? 'إجازة' : 'غياب'}:
                                        </p>
                                        <h4 className={`text-lg font-black ${lastScannedStudent.status === 'excused' ? 'text-blue-900' : 'text-green-900'}`}>{lastScannedStudent.studentName}</h4>
                                        <p className="text-xs font-bold text-gray-500">القاعة: {lastScannedStudent.hallNumber} | القطاع: {lastScannedStudent.sectorNumber}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-md border-r-4 border-cyan-600">
                            <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><CheckCircle className="text-cyan-600" /> اعتماد النتائج في السجل</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">الحقل المطلوب تسجيل الغياب فيه:</label>
                                    <select value={targetField} onChange={e => setTargetField(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 font-bold">
                                        {FIELD_OPTIONS.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                                    </select>
                                </div>
                                <button 
                                    onClick={handleApproveAbsences}
                                    disabled={isApproving || getFinalAbsenceList.length === 0}
                                    className="w-full py-3 bg-cyan-600 text-white font-black text-lg rounded-xl shadow-lg hover:bg-cyan-700 transition flex items-center justify-center gap-2 disabled:bg-gray-300"
                                >
                                    <Save />
                                    <span>اعتماد الغيابات والاجازات</span>
                                </button>
                                <p className="text-[10px] text-gray-400 italic text-center">سيتم كتابة (غ) للغائب و (م) للمجاز في سجلات الشعب مباشرة.</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><FileDown className="text-red-500" /> تصدير التقارير</h3>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                                    <h4 className="font-bold text-red-800 text-sm mb-2 flex items-center gap-2"><FileText size={16}/> قائمة الغياب اليومية</h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleExport('list')} className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold text-xs">
                                            <FileDown size={14}/> PDF
                                        </button>
                                    </div>
                                </div>

                                <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-100">
                                    <h4 className="font-bold text-cyan-800 text-sm mb-2 flex items-center gap-2"><ListChecks size={16}/> خلاصة الغيابات النهائية</h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleExport('summary')} className="flex-1 flex items-center justify-center gap-2 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition font-bold text-xs">
                                            <FileDown size={14}/> PDF
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-2xl border shadow-inner flex-grow flex flex-col">
                            <h3 className="font-bold text-xl mb-4 flex justify-between items-center">
                                <span>الغيابات والاجازات المسجلة ({getFinalAbsenceList.length})</span>
                                <span className="text-[10pt] font-normal text-gray-500">{currentDate}</span>
                            </h3>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[400px]">
                                {getFinalAbsenceList.reverse().map(record => (
                                    <div key={record.studentId} className={`bg-white p-3 border-2 rounded-xl shadow-sm flex justify-between items-center group transition ${record.status === 'excused' ? 'border-blue-200' : 'border-gray-100 hover:border-red-200'}`}>
                                        <div className="text-right">
                                            <p className={`font-black text-sm ${record.status === 'excused' ? 'text-blue-700' : 'text-gray-800'}`}>
                                                {record.studentName} {record.status === 'excused' && '(مجاز)'}
                                            </p>
                                            <p className="text-[10px] font-bold text-gray-500">القاعة: {record.hallNumber} | القطاع: {record.sectorNumber}</p>
                                            <p className="text-[10px] font-mono font-black text-blue-600 mt-0.5">{record.examId}</p>
                                        </div>
                                        {absentRecords[record.studentId] && (
                                            <button onClick={() => removeAbsence(record.studentId, record.stage)} className="text-gray-300 hover:text-red-500 transition-colors p-2"><Trash2 size={18}/></button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
