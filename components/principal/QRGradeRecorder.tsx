
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { QrCode, Search, GraduationCap, X, Save, CheckCircle, Camera, RefreshCw, Loader2, AlertTriangle, ChevronDown, Hash, Target, Zap, Activity, Cpu, Lightbulb, Info, Keyboard } from 'lucide-react';
import type { ClassData, Student, SchoolSettings, Subject, SubjectGrade } from '../../types.ts';
import { GRADE_LEVELS } from '../../constants.ts';
import { db } from '../../lib/firebase.ts';

interface QRGradeRecorderProps {
    classes: ClassData[];
    settings: SchoolSettings;
}

const FIELD_OPTIONS = [
    { key: 'midYear', label: 'نصف السنة' },
    { key: 'finalExam1st', label: 'الامتحان النهائي' },
    { key: 'finalExam2nd', label: 'الاكمال' }
];

type ScanMode = 'qr' | 'manual';

const normalizeDigits = (str: string): string => {
    if (!str) return '';
    // FIX: Replaced duplicate '٨' (U+0668) with the correct Extended Arabic-Indic digit '۸' (U+06F8).
    const map: Record<string, string> = {
        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
        '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
    };
    return str.replace(/[٠-٩۰-۹]/g, (d) => map[d] || d).replace(/\D/g, '');
};

const playSuccessSound = () => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
};

export default function QRGradeRecorder({ classes, settings }: QRGradeRecorderProps) {
    const [selectedStage, setSelectedStage] = useState('');
    const [selectedSubjectName, setSelectedSubjectName] = useState('');
    const [selectedField, setSelectedField] = useState('midYear');
    const [foundStudent, setFoundStudent] = useState<{ student: Student; classData: ClassData; index: number } | null>(null);
    const [gradeInput, setGradeInput] = useState('');
    const [manualIdInput, setManualIdInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isScannerActive, setIsScannerActive] = useState(false);
    const [scannerError, setScannerError] = useState<string | null>(null);
    const [scanMode, setScanMode] = useState<ScanMode>('qr');
    
    const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string>('');
    const [isLoadingCameras, setIsLoadingCameras] = useState(false);

    // Movable Modal State
    const [offsetY, setOffsetY] = useState(0);
    const isDraggingRef = useRef(false);
    const startYRef = useRef(0);
    const manualInputRef = useRef<HTMLInputElement>(null);
    
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

    const availableSubjects = useMemo(() => {
        if (!selectedStage) return [];
        const classForStage = classes.find(c => c.stage === selectedStage);
        return classForStage?.subjects || [];
    }, [selectedStage, classes]);

    const fetchCameras = async () => {
        setIsLoadingCameras(true);
        setScannerError(null);
        try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
                setCameras(devices.map(d => ({ id: d.id, label: d.label })));
                const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
                setSelectedCameraId(backCamera ? backCamera.id : devices[0].id);
            } else {
                setScannerError("لم يتم العثور على كاميرات.");
            }
        } catch (err) {
            setScannerError("فشل الوصول إلى الكاميرا.");
        } finally {
            setIsLoadingCameras(false);
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try {
                await html5QrCodeRef.current.stop();
            } catch (err) {
                console.error("Stop failed", err);
            }
        }
    };

    const startScanner = async () => {
        if (!selectedCameraId || scanMode !== 'qr') return;
        setScannerError(null);
        await stopScanner();

        try {
            const scanner = new Html5Qrcode("qr-reader", {
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                verbose: false
            });
            html5QrCodeRef.current = scanner;

            const config = {
                fps: 30,
                qrbox: { width: 300, height: 300 },
                aspectRatio: 1.0
            };

            await scanner.start(
                selectedCameraId,
                config,
                onQrSuccess, 
                () => {}
            );
        } catch (err) {
            setScannerError("حدث خطأ أثناء تشغيل الكاميرا.");
            setIsScannerActive(false);
        }
    };

    useEffect(() => {
        if (isScannerActive && !foundStudent && selectedCameraId && scanMode === 'qr') {
            const timer = setTimeout(startScanner, 300);
            return () => clearTimeout(timer);
        } else {
            stopScanner();
        }
        return () => { stopScanner(); };
    }, [isScannerActive, foundStudent, selectedCameraId, scanMode]);

    // Focus manual input when mode changes to manual
    useEffect(() => {
        if (isScannerActive && scanMode === 'manual' && !foundStudent) {
            setTimeout(() => manualInputRef.current?.focus(), 100);
        }
    }, [isScannerActive, scanMode, foundStudent]);

    function onQrSuccess(decodedText: string) {
        if (!selectedStage || scanMode !== 'qr') return;
        findAndSetStudent(decodedText);
    }

    const handleManualSearch = (e: React.FormEvent) => {
        e.preventDefault();
        findAndSetStudent(manualIdInput);
    };

    const findAndSetStudent = (identifier: string): boolean => {
        const cleanId = normalizeDigits(identifier);
        if (!cleanId) return false;

        let studentResult: { student: Student; classData: ClassData; index: number } | null = null;
        
        for (const cls of classes) {
            if (cls.stage === selectedStage) {
                const sIndex = (cls.students || []).findIndex(s => normalizeDigits(s.examId || '') === cleanId);
                if (sIndex !== -1) {
                    studentResult = { student: cls.students[sIndex], classData: cls, index: sIndex };
                    break;
                }
            }
        }

        if (studentResult) {
            playSuccessSound();
            if (window.navigator.vibrate) window.navigator.vibrate(200);
            setOffsetY(0); 
            setFoundStudent(studentResult);
            return true;
        } else if (scanMode === 'manual') {
            alert("لم يتم العثور على طالب بهذا الرقم في المرحلة المختارة.");
        }
        return false;
    };

    const handleSaveGrade = async () => {
        if (!foundStudent || !selectedSubjectName || !gradeInput) return;
        setIsSaving(true);
        const numericGrade = parseInt(gradeInput, 10);
        
        if (isNaN(numericGrade) || numericGrade < 0 || numericGrade > 100) {
            alert("يرجى إدخال درجة صالحة (0-100)");
            setIsSaving(false);
            return;
        }

        try {
            const path = `classes/${foundStudent.classData.id}/students/${foundStudent.index}/grades/${selectedSubjectName}/${selectedField}`;
            await db.ref(path).set(numericGrade);
            setFoundStudent(null);
            setGradeInput('');
            setManualIdInput(''); // Clear ID for next search
            // Auto focus back to manual input if in that mode
            if (scanMode === 'manual') {
                setTimeout(() => manualInputRef.current?.focus(), 100);
            }
        } catch (error) {
            alert("فشل حفظ الدرجة");
        } finally {
            setIsSaving(false);
        }
    };

    const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
        isDraggingRef.current = true;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startYRef.current = clientY - offsetY;
    };

    const onDrag = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDraggingRef.current) return;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const newOffset = clientY - startYRef.current;
        setOffsetY(newOffset);
    };

    const endDrag = () => {
        isDraggingRef.current = false;
    };

    return (
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xl max-w-4xl mx-auto border-t-4 border-cyan-500 font-['Cairo']">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-cyan-100 p-2 rounded-lg"><QrCode className="text-cyan-600 w-8 h-8" /></div>
                    <h2 className="text-2xl font-bold text-gray-800">مسجل الدرجات السريع</h2>
                </div>
                
                <div className="flex bg-gray-100 p-1.5 rounded-xl w-full sm:w-auto shadow-inner">
                    <button onClick={() => setScanMode('qr')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all duration-300 ${scanMode === 'qr' ? 'bg-white text-cyan-600 shadow-md transform scale-105' : 'text-gray-500'}`}><QrCode size={20} /><span>مسح QR</span></button>
                    <button onClick={() => setScanMode('manual')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all duration-300 ${scanMode === 'manual' ? 'bg-white text-indigo-600 shadow-md transform scale-105' : 'text-gray-500'}`}><Keyboard size={20} /><span>إدخال رقم</span></button>
                </div>
            </div>

            {!isScannerActive ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="group"><label className="block text-sm font-black text-gray-600 mb-2">1. المرحلة</label><select value={selectedStage} onChange={e => setSelectedStage(e.target.value)} className="w-full p-3.5 border-2 border-gray-200 rounded-xl bg-gray-50 focus:border-cyan-500 outline-none">{GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                        <div className="group"><label className="block text-sm font-black text-gray-600 mb-2">2. المادة</label><select value={selectedSubjectName} onChange={e => setSelectedSubjectName(e.target.value)} disabled={!selectedStage} className="w-full p-3.5 border-2 border-gray-200 rounded-xl bg-gray-50 focus:border-cyan-500 outline-none disabled:opacity-50"><option value="">-- اختر مادة --</option>{availableSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
                        <div className="group"><label className="block text-sm font-black text-gray-600 mb-2">3. حقل الدرجة</label><select value={selectedField} onChange={e => setSelectedField(e.target.value)} className="w-full p-3.5 border-2 border-gray-200 rounded-xl bg-gray-50 focus:border-cyan-500 outline-none">{FIELD_OPTIONS.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}</select></div>
                    </div>
                    <button onClick={() => { if (!selectedStage || !selectedSubjectName) { alert("يرجى إكمال الاختيارات أولاً"); return; } setIsScannerActive(true); if (scanMode === 'qr' && cameras.length === 0) fetchCameras(); }} className={`w-full flex items-center justify-center gap-3 py-5 text-white font-black text-xl rounded-2xl transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1 active:scale-95 ${scanMode === 'qr' ? 'bg-gradient-to-r from-cyan-600 to-blue-600' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}>{scanMode === 'qr' ? <Camera size={28} /> : <Search size={28} />}<span>{scanMode === 'qr' ? 'فتح ماسح رموز الطلاب' : 'بدء البحث عن أرقام الطلاب'}</span></button>
                    {scanMode === 'manual' && (
                        <p className="text-center text-xs text-indigo-500 font-bold bg-indigo-50 py-2 rounded-lg">
                            <Zap size={12} className="inline ml-1"/> الطريقة اليدوية تتيح لك إدخال الدرجات بسرعة عند تعطل الكاميرا
                        </p>
                    )}
                </div>
            ) : (
                <div className="relative">
                    <div className="mb-4 flex flex-col gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className={`${scanMode === 'qr' ? 'bg-cyan-600' : 'bg-indigo-600'} text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-sm`}>{selectedStage}</span>
                                <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">{selectedSubjectName}</span>
                            </div>
                            <button onClick={() => setIsScannerActive(false)} className="text-white bg-red-500 p-2 rounded-full hover:bg-red-600 transition-all shadow-md active:scale-90"><X size={20}/></button>
                        </div>
                        {scanMode === 'qr' && (
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-gray-400">الكاميرا:</span>
                                <div className="relative flex-grow">
                                    <select value={selectedCameraId} onChange={(e) => setSelectedCameraId(e.target.value)} className="w-full pl-3 pr-8 py-2 text-xs bg-white border-2 border-gray-100 rounded-xl appearance-none font-bold outline-none">
                                        {isLoadingCameras ? <option>جاري البحث...</option> : cameras.map(cam => <option key={cam.id} value={cam.id}>{cam.label || `كاميرا ${cam.id.substring(0,5)}`}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                                <button onClick={fetchCameras} className="p-2 bg-white border-2 border-gray-100 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"><RefreshCw size={16} className={isLoadingCameras ? 'animate-spin' : ''}/></button>
                            </div>
                        )}
                    </div>

                    <div className="relative max-w-lg mx-auto">
                        {scanMode === 'qr' ? (
                            <div id="qr-reader" className="w-full overflow-hidden rounded-3xl border-8 border-cyan-500 shadow-2xl bg-black aspect-square"></div>
                        ) : (
                            <div className="w-full aspect-square bg-gray-100 rounded-3xl border-8 border-indigo-600 shadow-2xl flex flex-col items-center justify-center p-8 text-center">
                                <Hash size={48} className="text-indigo-400 mb-4 animate-pulse" />
                                <h3 className="text-xl font-bold text-indigo-900 mb-6">أدخل الرقم الامتحاني للطالب</h3>
                                <form onSubmit={handleManualSearch} className="w-full space-y-4">
                                    <input 
                                        ref={manualInputRef}
                                        type="text" 
                                        inputMode="numeric" 
                                        pattern="[0-9]*"
                                        value={manualIdInput}
                                        onChange={e => setManualIdInput(normalizeDigits(e.target.value))}
                                        placeholder="000000"
                                        className="w-full text-center text-5xl font-black p-4 border-4 border-indigo-100 rounded-2xl focus:border-indigo-500 outline-none transition-all shadow-inner"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!manualIdInput}
                                        className="w-full py-4 bg-indigo-600 text-white font-black text-xl rounded-2xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:bg-gray-400"
                                    >
                                        <Search size={24} />
                                        بحث عن الطالب
                                    </button>
                                </form>
                            </div>
                        )}
                        
                        {scanMode === 'qr' && (
                            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                                <div className="w-[200px] h-[100px] border-4 border-white/40 border-dashed rounded-xl flex items-center justify-center transition-all duration-300">
                                    <div className="w-full h-1 bg-cyan-400 shadow-[0_0_15px_cyan] animate-pulse"></div>
                                </div>
                                <div className="mt-6 bg-black/70 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 shadow-xl flex items-center gap-3">
                                    <Target className="text-cyan-400 animate-spin" size={16} />
                                    <span className="text-white text-sm font-bold">بانتظار رمز QR...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {foundStudent && (
                <div 
                    className="fixed inset-0 bg-gray-900/95 flex items-center justify-center p-4 backdrop-blur-md z-[200] overflow-hidden"
                    onMouseMove={onDrag}
                    onMouseUp={endDrag}
                    onTouchMove={onDrag}
                    onTouchEnd={endDrag}
                >
                    <div 
                        className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden relative border-4 border-white transition-transform duration-75 ease-out select-none"
                        style={{ transform: `translateY(${offsetY}px)` }}
                    >
                        {/* Drag Handle Bar */}
                        <div 
                            className="absolute top-0 left-0 w-full h-10 flex items-center justify-center cursor-ns-resize z-[210]"
                            onMouseDown={startDrag}
                            onTouchStart={startDrag}
                        >
                            <div className="w-12 h-1.5 bg-gray-300 rounded-full opacity-60"></div>
                        </div>

                        <div className="bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-600 p-6 pt-10 text-white text-center relative overflow-hidden">
                            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-white/30 shadow-inner">
                                <CheckCircle className="text-green-300" size={36} />
                            </div>
                            <h3 className="text-2xl font-black mb-1">{foundStudent.student.name}</h3>
                            <p className="opacity-80 text-base font-bold">{foundStudent.classData.stage} • {foundStudent.classData.section}</p>
                            <div className="mt-3 text-xs font-mono bg-black/30 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl border border-white/10">
                                <Hash size={14}/> الرقم الامتحاني: {foundStudent.student.examId}
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-100 text-center shadow-inner group">
                                <label className="block font-black text-gray-500 text-sm mb-3">أدخل درجة {selectedSubjectName}</label>
                                <input
                                    type="text" inputMode="numeric" pattern="[0-9]*"
                                    value={gradeInput}
                                    onChange={e => setGradeInput(normalizeDigits(e.target.value))}
                                    autoFocus
                                    className="w-full text-center text-4xl font-black p-3 border-4 border-cyan-100 rounded-2xl focus:border-cyan-500 outline-none transition-all bg-white text-gray-800 shadow-sm"
                                    placeholder="00"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => { setFoundStudent(null); setGradeInput(''); }} className="flex-1 py-4 bg-gray-100 text-gray-600 font-black rounded-xl transition-all hover:bg-gray-200 active:scale-95 text-sm">إلغاء</button>
                                <button 
                                    onClick={handleSaveGrade} disabled={isSaving || !gradeInput}
                                    className="flex-[2] py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black text-xl rounded-xl shadow-xl flex items-center justify-center gap-3 transform transition-all active:scale-90"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                    <span>حفظ وتثبيت</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
