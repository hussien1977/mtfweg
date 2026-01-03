
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { User } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { Html5Qrcode } from 'html5-qrcode';
import { Plus, Edit, Copy, Trash2, Upload, FileText, Printer, Eye, Settings, RefreshCw, Loader2, Camera, X, CheckSquare, Layout, Download } from 'lucide-react';

declare const QRCode: any;
declare const html2canvas: any;
declare const jspdf: any;
declare const XLSX: any;
declare const docx: any;

interface SeatingHall {
    id: number;
    name: string;
    location: string;
    rows: number;
    sector1Cols: number;
    sector2Cols: number;
    sector1Name: string;
    sector2Name: string;
    disabledSeats: string[];
}

interface SeatingStudent {
    uid: number;
    name: string;
    id: string; // الرقم الامتحاني
    class: string;
    section: string;
}

interface SeatingState {
    halls: SeatingHall[];
    students: SeatingStudent[];
    seatingChart: Record<string, number>; // seatId -> studentUid
    columnClassAssignments: Record<string, string>; // hallId:colIndex -> className
    absentStudents: SeatingStudent[];
}

export default function SeatingChartManagerV2({ principal }: { principal: User }) {
    const [state, setState] = useState<SeatingState>({
        halls: [],
        students: [],
        seatingChart: {},
        columnClassAssignments: {},
        absentStudents: []
    });

    const [currentStep, setCurrentStep] = useState(1);
    const [selectedHallIds, setSelectedHallIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
    const [pastedText, setPastedText] = useState('');
    const [isHallModalOpen, setIsHallModalOpen] = useState(false);
    const [editingHall, setEditingHall] = useState<SeatingHall | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isImportingExcel, setIsImportingExcel] = useState(false);
    
    const [exportSettings, setExportSettings] = useState({
        showBackground: true,
        headerText: 'وزارة التربية - المديرية العامة لتربية بغداد',
        schoolName: principal.schoolName || 'متوسطة الحمزة للبنين',
        academicYear: '2024 - 2025'
    });

    const [isScanning, setIsScanning] = useState(false);
    const [scanFeedback, setScanFeedback] = useState<{msg: string, type: 'success' | 'fail'} | null>(null);
    const qrScannerRef = useRef<Html5Qrcode | null>(null);

    const steps = [
        { id: 1, name: 'إدارة القاعات' },
        { id: 2, name: 'بيانات الطلاب' },
        { id: 3, name: 'توزيع الطلاب' },
        { id: 4, name: 'تصدير التقارير' },
        { id: 5, name: 'تسجيل الغياب' }
    ];

    useEffect(() => {
        const seatingRef = db.ref(`seating_data/${principal.id}`);
        const callback = (snapshot: any) => {
            const data = snapshot.val();
            if (data) {
                setState({
                    halls: (data.halls || []).map((h: any) => ({ ...h, disabledSeats: h.disabledSeats || [] })),
                    students: data.students || [],
                    seatingChart: data.seatingChart || {},
                    columnClassAssignments: data.columnClassAssignments || {},
                    absentStudents: data.absentStudents || []
                });
            }
            setIsLoading(false);
        };
        seatingRef.on('value', callback);
        return () => seatingRef.off('value', callback);
    }, [principal.id]);

    const saveToFirebase = (newState: SeatingState) => {
        db.ref(`seating_data/${principal.id}`).set(newState);
    };

    const uniqueClasses = useMemo(() => {
        const classesSet = new Set<string>();
        state.students.forEach(s => classesSet.add(s.class));
        return Array.from(classesSet).sort();
    }, [state.students]);

    const toggleSeatDisabled = (hall: SeatingHall, seatId: string) => {
        const newDisabled = (hall.disabledSeats || []).includes(seatId)
            ? hall.disabledSeats.filter(s => s !== seatId)
            : [...(hall.disabledSeats || []), seatId];
        
        const newHalls = state.halls.map(h => h.id === hall.id ? { ...h, disabledSeats: newDisabled } : h);
        saveToFirebase({ ...state, halls: newHalls });
    };

    const copyHall = (hall: SeatingHall) => {
        const newHall = { ...hall, id: Date.now(), name: `${hall.name} (نسخة)` };
        saveToFirebase({ ...state, halls: [...state.halls, newHall] });
    };

    const deleteHall = (hallId: number) => {
        if (confirm("هل أنت متأكد من حذف هذه القاعة؟")) {
            const newHalls = state.halls.filter(h => h.id !== hallId);
            saveToFirebase({ ...state, halls: newHalls });
        }
    };

    const startScanning = async () => {
        try {
            const scanner = new Html5Qrcode("reader");
            qrScannerRef.current = scanner;
            setIsScanning(true);
            setScanFeedback(null);
            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: 250 },
                (decodedText) => {
                    const student = state.students.find(s => s.id === decodedText);
                    if (student) {
                        if (!state.absentStudents.some(as => as.uid === student.uid)) {
                            saveToFirebase({ ...state, absentStudents: [...state.absentStudents, student] });
                            setScanFeedback({ msg: `تم تسجيل غياب: ${student.name}`, type: 'success' });
                        } else {
                            setScanFeedback({ msg: "الطالب مسجل مسبقاً", type: 'fail' });
                        }
                    } else {
                        setScanFeedback({ msg: "رمز غير معروف", type: 'fail' });
                    }
                },
                () => {}
            );
        } catch (err) {
            console.error(err);
            setIsScanning(false);
            alert("تعذر تشغيل الكاميرا");
        }
    };

    const stopScanning = async () => {
        if (qrScannerRef.current) {
            try {
                await qrScannerRef.current.stop();
            } catch(e) {}
            qrScannerRef.current = null;
        }
        setIsScanning(false);
    };

    const processNewStudents = (newStudents: SeatingStudent[]) => {
        saveToFirebase({ ...state, students: [...state.students, ...newStudents] });
    };

    const handleAddHall = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const hallId = editingHall ? editingHall.id : Date.now();
        
        const newHall: SeatingHall = {
            id: hallId,
            name: formData.get('hallName') as string,
            location: formData.get('location') as string,
            rows: parseInt(formData.get('rows') as string),
            sector1Cols: parseInt(formData.get('sector1Cols') as string),
            sector2Cols: parseInt(formData.get('sector2Cols') as string),
            sector1Name: editingHall ? editingHall.sector1Name : `القطاع (A)`,
            sector2Name: editingHall ? editingHall.sector2Name : `القطاع (B)`,
            disabledSeats: editingHall ? (editingHall.disabledSeats || []) : []
        };

        const newHalls = editingHall 
            ? state.halls.map(h => h.id === hallId ? newHall : h)
            : [...state.halls, newHall];

        saveToFirebase({ ...state, halls: newHalls });
        setIsHallModalOpen(false);
        setEditingHall(null);
    };

    const importFromText = () => {
        const lines = pastedText.trim().split('\n');
        const newStudents = lines.map((line, idx) => {
            const parts = line.split(/[,،\t]/).map(p => p.trim());
            if (parts.length < 4) return null;
            return { uid: Date.now() + idx, id: parts[0], class: parts[1], section: parts[2], name: parts[3] };
        }).filter(Boolean) as SeatingStudent[];
        processNewStudents(newStudents);
        setPastedText('');
    };

    const handleImportFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImportingExcel(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.Sheets[0]], { header: 1 });
                const rows = json[0] && isNaN(Number(json[0][0])) ? json.slice(1) : json;
                const newStudents = rows.map((row, index) => {
                    if (!row || row.length < 4) return null;
                    return { uid: Date.now() + index, id: String(row[0]), class: String(row[1]), section: String(row[2]), name: String(row[3]) };
                }).filter(s => s && s.name) as SeatingStudent[];
                processNewStudents(newStudents);
            } catch (err) { alert("خطأ في قراءة الملف"); }
            finally { setIsImportingExcel(false); e.target.value = ''; }
        };
        reader.readAsArrayBuffer(file);
    };

    const removeStudent = (uid: number) => {
        const newStudents = state.students.filter(s => s.uid !== uid);
        const newChart = { ...state.seatingChart };
        Object.keys(newChart).forEach(k => { if (newChart[k] === uid) delete newChart[k]; });
        saveToFirebase({ ...state, students: newStudents, seatingChart: newChart });
    };

    const handleSetColumnClass = (hallId: number, colIdx: number, className: string) => {
        const newAssignments = { ...state.columnClassAssignments };
        const key = `${hallId}:${colIdx}`;
        if (className === "") delete newAssignments[key];
        else newAssignments[key] = className;
        saveToFirebase({ ...state, columnClassAssignments: newAssignments });
    };

    const autoDistribute = () => {
        const newChart: Record<string, number> = {};
        const studentsByClass: Record<string, SeatingStudent[]> = {};
        
        state.students.forEach(s => {
            if (!studentsByClass[s.class]) studentsByClass[s.class] = [];
            studentsByClass[s.class].push(s);
        });

        Object.keys(studentsByClass).forEach(cls => {
            studentsByClass[cls] = studentsByClass[cls].sort(() => Math.random() - 0.5);
        });

        selectedHallIds.forEach(hid => {
            const hall = state.halls.find(h => h.id === hid);
            if (!hall) return;
            
            const totalCols = hall.sector1Cols + hall.sector2Cols;
            let lastUsedStage: string | null = null;
            
            for (let c = 0; c < totalCols; c++) {
                const manualAssignedClass = state.columnClassAssignments[`${hid}:${c}`];
                let columnStage: string | null = null;

                if (manualAssignedClass) {
                    columnStage = manualAssignedClass;
                } else {
                    const availableStages = Object.keys(studentsByClass)
                        .filter(cls => studentsByClass[cls].length > 0 && cls !== lastUsedStage)
                        .sort((a, b) => studentsByClass[b].length - studentsByClass[a].length);
                    
                    if (availableStages.length > 0) {
                        columnStage = availableStages[0];
                    } else {
                        const fallbackStages = Object.keys(studentsByClass)
                            .filter(cls => studentsByClass[cls].length > 0)
                            .sort((a, b) => studentsByClass[b].length - studentsByClass[a].length);
                        if (fallbackStages.length > 0) columnStage = fallbackStages[0];
                    }
                }

                if (columnStage) {
                    lastUsedStage = columnStage;
                    for (let r = 0; r < hall.rows; r++) {
                        const seatId = `${hid}:${r}-${c}`;
                        if ((hall.disabledSeats || []).includes(seatId)) continue;

                        const student = studentsByClass[columnStage]?.shift();
                        if (student) newChart[seatId] = student.uid;
                    }
                }
            }
        });

        saveToFirebase({ ...state, seatingChart: newChart });
        alert("تم التوزيع التلقائي بنجاح مع مراعاة الفصل بين المراحل.");
    };

    // FIX: Added return null to resolve Type 'void' is not assignable to type 'ReactNode' error in JSX for lines 363 and 548.
    const generateQR = (containerId: string, text: string) => {
        setTimeout(() => {
            const el = document.getElementById(containerId);
            if (el) {
                el.innerHTML = '';
                new QRCode(el, { text, width: 64, height: 64, correctLevel: 1 });
            }
        }, 150);
        return null;
    };

    const renderExportPage = (hall: SeatingHall, sector: 1 | 2) => {
        const isSector1 = sector === 1;
        const cols = isSector1 ? hall.sector1Cols : hall.sector2Cols;
        const colStart = isSector1 ? 0 : hall.sector1Cols;

        return (
            <div className="pdf-export-container" id={`export-page-${hall.id}-${sector}`}>
                {exportSettings.showBackground && (
                    <img src="https://i.imgur.com/9tZ8dYb.jpeg" className="export-bg" alt="bg" />
                )}
                <div className="export-content">
                    <header className="export-header">
                        <div className="text-right">
                            <p className="font-bold text-sm">{exportSettings.headerText}</p>
                            <p className="font-black text-xl">{exportSettings.schoolName}</p>
                        </div>
                        <div className="text-center">
                            <h2 className="export-title">مخطط جلوس الطلاب</h2>
                            <p className="font-bold">القاعة: {hall.name} | {isSector1 ? hall.sector1Name : hall.sector2Name}</p>
                        </div>
                        <div className="text-left font-bold">
                            <p>العام الدراسي</p>
                            <p>{exportSettings.academicYear}</p>
                        </div>
                    </header>

                    <div className="grid gap-4 mt-6" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                        {Array.from({ length: cols }).map((_, cIdx) => {
                            const actualCol = colStart + cIdx;
                            return (
                                <div key={cIdx} className="flex flex-col gap-2">
                                    <div className="bg-blue-800 text-white text-center py-1 font-bold rounded">عمود {cIdx + 1}</div>
                                    {Array.from({ length: hall.rows }).map((_, rIdx) => {
                                        const seatId = `${hall.id}:${rIdx}-${actualCol}`;
                                        const uid = state.seatingChart[seatId];
                                        const student = state.students.find(s => s.uid === uid);
                                        const isDisabled = (hall.disabledSeats || []).includes(seatId);

                                        return (
                                            <div key={rIdx} className={`border-2 border-black p-2 h-44 rounded-lg flex flex-col justify-between text-center ${isDisabled ? 'bg-gray-200' : 'bg-white'}`}>
                                                {isDisabled ? (
                                                    <span className="m-auto font-black text-2xl text-gray-400">✕</span>
                                                ) : student ? (
                                                    <>
                                                        <div className="font-black text-xs leading-tight h-8 overflow-hidden">{student.name}</div>
                                                        <div className="text-[7pt] font-black text-blue-700">{student.class} - {student.section}</div>
                                                        <div id={`qr-export-${seatId.replace(/:|-/g, '_')}`} className="qr-code-cell">
                                                            {generateQR(`qr-export-${seatId.replace(/:|-/g, '_')}`, student.id)}
                                                        </div>
                                                        <div className="text-[8px] font-mono bg-gray-100 rounded px-1">{student.id}</div>
                                                    </>
                                                ) : (
                                                    <span className="m-auto text-gray-300 text-xs italic">مقعد شاغر</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const handleExportPDF = async () => {
        setIsExporting(true);
        const { jsPDF } = jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        try {
            for (let i = 0; i < selectedHallIds.length; i++) {
                const hall = state.halls.find(h => h.id === selectedHallIds[i])!;
                for (let sector of [1, 2] as const) {
                    if (i > 0 || sector > 1) pdf.addPage();
                    const elId = `export-page-${hall.id}-${sector}`;
                    const element = document.getElementById(elId);
                    if (element) {
                        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
                        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
                    }
                }
            }
            pdf.save(`مخططات_القاعات_الامتحانية.pdf`);
        } catch (e) {
            alert("حدث خطأ أثناء التصدير");
        } finally {
            setIsExporting(false);
        }
    };

    // FIX: Added missing handleExportWord function to resolve the error.
    const handleExportWord = () => {
        alert("ميزة التصدير بصيغة Word قيد التطوير حالياً. يرجى استخدام تصدير PDF للوقت الحالي.");
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <button onClick={() => setIsHallModalOpen(true)} className="bg-sky-600 text-white font-bold py-2 px-6 rounded-md hover:bg-sky-700 transition shadow-md">
                                + إنشاء قاعة جديدة
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {state.halls.map(hall => (
                                <div key={hall.id} className={`border rounded-lg p-4 shadow transition flex flex-col ${selectedHallIds.includes(hall.id) ? 'border-sky-500 ring-2 ring-sky-200 bg-sky-50' : 'bg-white'}`}>
                                    <h3 className="font-bold text-lg">{hall.name}</h3>
                                    <p className="text-sm text-gray-500">{hall.location}</p>
                                    <div className="flex gap-2 mt-4 pt-4 border-t">
                                        <button onClick={() => setSelectedHallIds(prev => prev.includes(hall.id) ? prev.filter(id => id !== hall.id) : [...prev, hall.id])} className={`flex-1 text-sm ${selectedHallIds.includes(hall.id) ? 'bg-red-500' : 'bg-green-500'} text-white font-bold py-1 px-2 rounded`}>
                                            {selectedHallIds.includes(hall.id) ? 'إلغاء التحديد' : 'تحديد'}
                                        </button>
                                        <button onClick={() => { setEditingHall(hall); setIsHallModalOpen(true); }} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"><Edit size={18}/></button>
                                        <button onClick={() => copyHall(hall)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Copy size={18}/></button>
                                        <button onClick={() => deleteHall(hall.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <div className="flex border-b mb-4">
                                <button onClick={() => setActiveTab('paste')} className={`flex-1 py-2 font-semibold ${activeTab === 'paste' ? 'border-b-4 border-sky-600 text-sky-600' : 'text-gray-500'}`}>لصق نص</button>
                                <button onClick={() => setActiveTab('upload')} className={`flex-1 py-2 font-semibold ${activeTab === 'upload' ? 'border-b-4 border-sky-600 text-sky-600' : 'text-gray-500'}`}>رفع ملف Excel</button>
                            </div>
                            {activeTab === 'paste' ? (
                                <div className="space-y-4">
                                    <p className="text-xs text-gray-500">التنسيق المطلوب: الرقم، الصف، الشعبة، اسم الطالب (في كل سطر)</p>
                                    <textarea value={pastedText} onChange={e => setPastedText(e.target.value)} rows={8} className="w-full p-3 border rounded-md" placeholder="مثال: 1201، الثالث، أ، أحمد علي"></textarea>
                                    <button onClick={importFromText} className="w-full bg-sky-600 text-white font-bold py-2 rounded">استيراد من النص</button>
                                </div>
                            ) : (
                                <div className="p-8 border-2 border-dashed rounded-lg text-center bg-gray-50">
                                    {isImportingExcel ? (
                                        <Loader2 className="mx-auto animate-spin text-sky-600" size={48} />
                                    ) : (
                                        <Upload className="mx-auto mb-2 text-gray-400" size={48} />
                                    )}
                                    <p className="font-bold text-gray-700">رفع ملف الأسماء من Excel</p>
                                    <p className="text-xs text-gray-500 mt-1">يجب أن تكون الأعمدة بالترتيب: الرقم، الصف، الشعبة، الاسم</p>
                                    <input type="file" className="hidden" id="excel-up-input" onChange={handleImportFromExcel} accept=".xlsx, .xls" />
                                    <button onClick={() => document.getElementById('excel-up-input')?.click()} disabled={isImportingExcel} className="mt-4 px-8 py-2 bg-white text-sky-600 font-bold rounded-lg border-2 border-sky-600 hover:bg-sky-50 transition disabled:opacity-50">
                                        {isImportingExcel ? 'جاري المعالجة...' : 'اختر ملف من جهازك'}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border h-[400px] flex flex-col">
                            <h3 className="font-bold mb-2">قائمة الطلاب ({state.students.length})</h3>
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {state.students.map(s => (
                                    <div key={s.uid} className="bg-white p-2 border rounded flex justify-between items-center text-sm shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="font-bold">{s.name}</span>
                                            <span className="text-[10px] text-gray-400">{s.id} • {s.class} ({s.section})</span>
                                        </div>
                                        {/* FIX: Fixed error where 'uid' was undefined by using 's.uid' from the map function. */}
                                        <button onClick={() => removeStudent(s.uid)} className="text-red-500 hover:bg-red-50 p-1 rounded transition"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-1 bg-white p-4 rounded-xl border shadow-sm flex flex-col">
                            <h3 className="font-bold mb-4 flex items-center gap-2"><Layout size={18}/> أدوات التوزيع</h3>
                            <button onClick={autoDistribute} className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition mb-3">توزيع تلقائي ذكي</button>
                            <button onClick={() => saveToFirebase({ ...state, seatingChart: {} })} className="w-full bg-gray-100 text-red-600 py-3 rounded-lg font-bold border border-red-200 hover:bg-red-50 transition">تصفير المخطط</button>
                            <div className="mt-8 flex-1">
                                <h4 className="font-bold text-sm text-gray-500 mb-2">الطلاب غير الموزعين ({state.students.filter(s => !Object.values(state.seatingChart).includes(s.uid)).length})</h4>
                                <div className="max-h-64 overflow-y-auto space-y-2">
                                    {state.students.filter(s => !Object.values(state.seatingChart).includes(s.uid)).map(s => (
                                        <div key={s.uid} className="text-xs p-2 bg-gray-50 border rounded">{s.name}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-3 space-y-10">
                            {selectedHallIds.map(hid => {
                                const hall = state.halls.find(h => h.id === hid)!;
                                return (
                                    <div key={hid} className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 overflow-x-auto">
                                        <h3 className="text-center font-black text-2xl text-blue-900 mb-6">{hall.name}</h3>
                                        <div className="flex gap-8 justify-center min-w-max">
                                            {[1, 2].map(sector => (
                                                <div key={sector} className="text-center">
                                                    <h4 className="font-bold mb-4 px-4 py-1 bg-gray-800 text-white rounded-full inline-block">{sector === 1 ? hall.sector1Name : hall.sector2Name}</h4>
                                                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${sector === 1 ? hall.sector1Cols : hall.sector2Cols}, 100px)` }}>
                                                        {Array.from({ length: sector === 1 ? hall.sector1Cols : hall.sector2Cols }).map((_, c) => {
                                                            const actualCol = sector === 1 ? c : c + hall.sector1Cols;
                                                            return (
                                                                <div key={`head-${actualCol}`} className="mb-2">
                                                                    <select 
                                                                        className="w-full text-[10px] p-1 border rounded bg-blue-50 font-bold"
                                                                        value={state.columnClassAssignments[`${hid}:${actualCol}`] || ""}
                                                                        onChange={(e) => handleSetColumnClass(hid, actualCol, e.target.value)}
                                                                    >
                                                                        <option value="">كل الصفوف</option>
                                                                        {uniqueClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                                                                    </select>
                                                                </div>
                                                            );
                                                        })}
                                                        {Array.from({ length: hall.rows }).map((_, r) => (
                                                            Array.from({ length: sector === 1 ? hall.sector1Cols : hall.sector2Cols }).map((_, c) => {
                                                                const actualCol = sector === 1 ? c : c + hall.sector1Cols;
                                                                const seatId = `${hid}:${r}-${actualCol}`;
                                                                const uid = state.seatingChart[seatId];
                                                                const student = state.students.find(s => s.uid === uid);
                                                                const isDisabled = (hall.disabledSeats || []).includes(seatId);

                                                                return (
                                                                    <div 
                                                                        key={seatId} 
                                                                        className={`seat w-[100px] h-40 border-2 border-dashed rounded-xl p-1 relative flex flex-col items-center justify-center text-[9px] text-center cursor-pointer transition-all ${isDisabled ? 'bg-gray-700 border-gray-900 cursor-not-allowed text-white' : uid ? 'bg-blue-50 border-blue-600 shadow-sm' : 'bg-white border-gray-300 hover:border-blue-400'}`}
                                                                        onClick={() => !uid && toggleSeatDisabled(hall, seatId)}
                                                                    >
                                                                        {isDisabled ? <X size={24}/> : student ? (
                                                                            <div className="w-full flex flex-col items-center gap-1">
                                                                                <p className="font-bold leading-tight truncate w-full">{student.name}</p>
                                                                                <p className="text-[7px] text-blue-600 font-black">{student.class} - {student.section}</p>
                                                                                <div id={`qr-view-${seatId.replace(/:|-/g, '_')}`} className="qr-code-cell">
                                                                                    {generateQR(`qr-view-${seatId.replace(/:|-/g, '_')}`, student.id)}
                                                                                </div>
                                                                                <p className="text-gray-500 font-mono text-[8px] bg-white px-1 rounded border">{student.id}</p>
                                                                            </div>
                                                                        ) : null}
                                                                    </div>
                                                                );
                                                            })
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="bg-white p-8 rounded-2xl border-2 border-blue-100 shadow-xl">
                            <h3 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2"><Settings className="text-blue-600"/> إعدادات التصدير النهائي</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <label className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-blue-50 transition">
                                        <input type="checkbox" className="w-5 h-5" checked={exportSettings.showBackground} onChange={e => setExportSettings({...exportSettings, showBackground: e.target.checked})} />
                                        <span className="font-bold text-gray-700">استخدام الخلفية الرسمية (الملونة)</span>
                                    </label>
                                    <div>
                                        <label className="block text-sm font-bold mb-1">اسم المدرسة</label>
                                        <input type="text" className="w-full p-2 border rounded" value={exportSettings.schoolName} onChange={e => setExportSettings({...exportSettings, schoolName: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold mb-1">ترويسة التقرير</label>
                                        <input type="text" className="w-full p-2 border rounded" value={exportSettings.headerText} onChange={e => setExportSettings({...exportSettings, headerText: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1">العام الدراسي</label>
                                        <input type="text" className="w-full p-2 border rounded" value={exportSettings.academicYear} onChange={e => setExportSettings({...exportSettings, academicYear: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                                <button onClick={handleExportPDF} disabled={isExporting} className="bg-red-600 text-white font-black py-4 px-10 rounded-2xl hover:bg-red-700 transition shadow-lg flex items-center gap-3">
                                    {isExporting ? <Loader2 className="animate-spin"/> : <Printer />} تصدير بصيغة PDF
                                </button>
                                <button onClick={handleExportWord} className="bg-blue-700 text-white font-black py-4 px-10 rounded-2xl hover:bg-blue-800 transition shadow-lg flex items-center gap-3">
                                    <Download /> تصدير بصيغة Word
                                </button>
                            </div>
                        </div>

                        {selectedHallIds.map(hid => {
                            const hall = state.halls.find(h => h.id === hid)!;
                            return (
                                <React.Fragment key={hid}>
                                    {renderExportPage(hall, 1)}
                                    {renderExportPage(hall, 2)}
                                </React.Fragment>
                            );
                        })}
                    </div>
                );
            case 5:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-xl border shadow-md text-center">
                            <h3 className="font-bold mb-4 text-xl">لوحة تحكم الماسح الذكي</h3>
                            <div className="flex justify-center gap-2 mb-4">
                                {!isScanning ? (
                                    <button onClick={startScanning} className="bg-green-600 text-white px-8 py-2 rounded-full font-bold flex items-center gap-2 shadow-md hover:bg-green-700 transition"><Camera size={20}/> بدء المسح بالكاميرا</button>
                                ) : (
                                    <button onClick={stopScanning} className="bg-red-600 text-white px-8 py-2 rounded-full font-bold shadow-md hover:bg-red-700 transition">إيقاف المسح</button>
                                )}
                            </div>
                            <div id="reader" className="bg-black aspect-square rounded-3xl overflow-hidden border-4 border-gray-800 shadow-inner"></div>
                            {scanFeedback && (
                                <div className={`mt-4 p-3 rounded-lg font-bold animate-bounce ${scanFeedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {scanFeedback.msg}
                                </div>
                            )}
                        </div>
                        <div className="bg-gray-50 p-6 rounded-xl border h-[600px] flex flex-col shadow-inner">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-xl">قائمة الغياب اليومي ({state.absentStudents.length})</h3>
                                {state.absentStudents.length > 0 && <button onClick={() => { if(confirm("مسح القائمة؟")) saveToFirebase({...state, absentStudents: []})}} className="text-xs text-red-500">مسح الكل</button>}
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                {state.absentStudents.map(s => (
                                    <div key={s.uid} className="bg-white p-3 border rounded shadow-sm flex justify-between items-center hover:bg-red-50 transition border-r-4 border-r-red-500">
                                        <div>
                                            <p className="font-bold text-gray-800">{s.name}</p>
                                            <p className="text-xs text-gray-500">الرقم: {s.id} • الصف: {s.class}</p>
                                        </div>
                                        <button onClick={() => saveToFirebase({ ...state, absentStudents: state.absentStudents.filter(as => as.uid !== s.uid) })} className="text-red-400 hover:text-red-600 transition"><Trash2 size={18}/></button>
                                    </div>
                                ))}
                                {state.absentStudents.length === 0 && <p className="text-center text-gray-400 mt-20">لم يتم رصد أي غياب بعد...</p>}
                            </div>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-12 w-12 text-sky-600" /></div>;

    return (
        <div className="min-h-screen bg-stone-50 p-4 md:p-8">
            <header className="text-center mb-8 border-b pb-6">
                <h1 className="text-3xl md:text-4xl font-black text-sky-800">نظام إدارة مخططات الجلوس الذكي</h1>
                <p className="text-gray-500 mt-2">إدارة شاملة لترتيب القاعات، توزيع الطلاب، وتتبع الغياب</p>
            </header>

            <div className="flex justify-center items-center mb-10 space-x-4 rtl:space-x-reverse max-w-4xl mx-auto overflow-x-auto px-4 pb-2 scrollbar-hide">
                {steps.map((step, idx) => (
                    <React.Fragment key={step.id}>
                        <div className={`flex items-center gap-2 transition-all flex-shrink-0 ${currentStep === step.id ? 'text-sky-600 font-bold' : (currentStep > step.id ? 'text-green-600' : 'text-gray-400')}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === step.id ? 'border-sky-600 bg-sky-100' : (currentStep > step.id ? 'border-green-600 bg-green-100' : 'border-gray-300')}`}>
                                {currentStep > step.id ? '✓' : step.id}
                            </div>
                            <span className="hidden md:block text-sm">{step.name}</span>
                        </div>
                        {idx < steps.length - 1 && <div className={`flex-1 h-0.5 min-w-[30px] ${currentStep > step.id ? 'bg-green-600' : 'bg-gray-300'}`}></div>}
                    </React.Fragment>
                ))}
            </div>

            <main className="bg-white rounded-2xl shadow-xl p-6 md:p-8 min-h-[600px] border border-gray-100 relative">
                {renderStepContent()}

                <div className="mt-12 pt-8 border-t flex justify-between items-center">
                    <button 
                        onClick={() => setCurrentStep(p => Math.max(1, p - 1))}
                        disabled={currentStep === 1}
                        className="px-8 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 disabled:opacity-50 transition"
                    >
                        السابق
                    </button>
                    <button 
                        onClick={() => setCurrentStep(p => Math.min(5, p + 1))}
                        disabled={(currentStep === 1 && selectedHallIds.length === 0) || currentStep === 5}
                        className="px-8 py-2 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 disabled:opacity-50 transition shadow-lg"
                    >
                        {currentStep === 5 ? 'انتهاء' : 'التالي'}
                    </button>
                </div>
            </main>

            {isHallModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <header className="p-4 border-b bg-sky-50 flex justify-between items-center">
                            <h3 className="font-black text-sky-900">{editingHall ? 'تعديل بيانات القاعة' : 'إضافة قاعة جديدة'}</h3>
                            <button onClick={() => setIsHallModalOpen(false)} className="text-gray-400 hover:text-red-500 transition"><X size={20}/></button>
                        </header>
                        <form onSubmit={handleAddHall} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">اسم القاعة</label>
                                <input name="hallName" defaultValue={editingHall?.name} required className="w-full p-2 border rounded-md" placeholder="مثال: قاعة 101" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">الموقع</label>
                                <input name="location" defaultValue={editingHall?.location} className="w-full p-2 border rounded-md" placeholder="مثال: الطابق الثاني" />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">الصفوف</label>
                                    <input name="rows" type="number" defaultValue={editingHall?.rows || 5} min="1" max="20" required className="w-full p-2 border rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">أعمدة قطاع 1</label>
                                    <input name="sector1Cols" type="number" defaultValue={editingHall?.sector1Cols || 3} min="1" max="10" required className="w-full p-2 border rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">أعمدة قطاع 2</label>
                                    <input name="sector2Cols" type="number" defaultValue={editingHall?.sector2Cols || 3} min="1" max="10" required className="w-full p-2 border rounded-md" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setIsHallModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-md">إلغاء</button>
                                <button type="submit" className="px-8 py-2 bg-sky-600 text-white font-bold rounded-md hover:bg-sky-700 shadow-md">حفظ القاعة</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
