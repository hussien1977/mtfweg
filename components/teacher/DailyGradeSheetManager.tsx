import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Teacher, ClassData, SchoolSettings, Subject } from '../../types.ts';
import { Plus, Trash2, Edit, Save, X, UserPlus, ListVideo, ArrowLeft, Download, FileText, Printer, ChevronLeft, ChevronRight, Loader2, CheckCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import DailyGradeSheetPDFPage1 from './DailyGradeSheetPDFPage1.tsx';
import DailyGradeSheetPDFPage2 from './DailyGradeSheetPDFPage2.tsx';
import * as ReactDOM from 'react-dom/client';
import { db } from '../../lib/firebase.ts';

declare const jspdf: any;
declare const html2canvas: any;
declare const XLSX: any;


// --- Types ---
interface Column {
  id: string;
  name: string;
  maxGrade: number;
}

interface StudentGrades {
  id: string;
  name: string;
  // Semester 1
  s1_m1_daily: Record<string, number | null>;
  s1_m1_written: number | null;
  s1_m2_daily: Record<string, number | null>;
  s1_m2_written: number | null;
  midYear: number | null;
  // Semester 2
  s2_m1_daily: Record<string, number | null>;
  s2_m1_written: number | null;
  s2_m2_daily: Record<string, number | null>;
  s2_m2_written: number | null;
  finalExam: number | null;
}

interface DailyGradeSheet {
  id: string;
  gradeLevel: string;
  section: string;
  subjectName: string;
  subjectId: string;
  teacherName: string;
  schoolName: string;
  academicYear: string;
  columnSettings: {
    s1_m1: Column[]; s1_m2: Column[];
    s2_m1: Column[]; s2_m2: Column[];
  };
  students: StudentGrades[];
}

// --- Helper Functions & Components ---
const round = (num: number | null | undefined) => num ? Math.round(num) : null;

interface DailyGradeSheetManagerProps {
    teacher: Teacher;
    classes: ClassData[];
    settings: SchoolSettings;
}

export default function DailyGradeSheetManager({ teacher, classes, settings }: DailyGradeSheetManagerProps) {
    const [view, setView] = useState<'manager' | 'sheet'>('manager');
    const [sheets, setSheets] = useState<DailyGradeSheet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSheet, setActiveSheet] = useState<DailyGradeSheet | null>(null);

    // --- State for new sheet form ---
    const [newSheetGrade, setNewSheetGrade] = useState('');
    const [newSheetSection, setNewSheetSection] = useState('');
    const [newSheetSubjectId, setNewSheetSubjectId] = useState('');

    useEffect(() => {
        if (!teacher.id) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const sheetsRef = db.ref(`daily_grade_sheets/${teacher.id}`);
        const callback = (snapshot: any) => {
            const data = snapshot.val();
            const sheetsArray: DailyGradeSheet[] = data ? Object.values(data) : [];
    
            const sanitizedSheets = sheetsArray.map(sheet => {
                const students = Array.isArray(sheet.students) ? sheet.students : [];
                // FIX: Use optional chaining to safely access properties on the potentially undefined `columnSettings` object.
                const cs = sheet.columnSettings;
                return {
                    ...sheet,
                    columnSettings: {
                        s1_m1: Array.isArray(cs?.s1_m1) ? cs.s1_m1 : [],
                        s1_m2: Array.isArray(cs?.s1_m2) ? cs.s1_m2 : [],
                        s2_m1: Array.isArray(cs?.s2_m1) ? cs.s2_m1 : [],
                        s2_m2: Array.isArray(cs?.s2_m2) ? cs.s2_m2 : [],
                    },
                    students: students.map(student => ({
                        id: student.id,
                        name: student.name,
                        s1_m1_daily: student.s1_m1_daily || {}, s1_m1_written: student.s1_m1_written ?? null,
                        s1_m2_daily: student.s1_m2_daily || {}, s1_m2_written: student.s1_m2_written ?? null,
                        midYear: student.midYear ?? null,
                        s2_m1_daily: student.s2_m1_daily || {}, s2_m1_written: student.s2_m1_written ?? null,
                        s2_m2_daily: student.s2_m2_daily || {}, s2_m2_written: student.s2_m2_written ?? null,
                        finalExam: student.finalExam ?? null,
                    })),
                };
            });
    
            setSheets(sanitizedSheets);
            setIsLoading(false);
        };
        sheetsRef.on('value', callback);
    
        return () => sheetsRef.off('value', callback);
    }, [teacher.id]);


    const teacherGrades = useMemo(() => {
        const uniqueGrades = new Set<string>();
        (teacher.assignments || []).forEach(a => {
            const classInfo = classes.find(c => c.id === a.classId);
            if (classInfo) uniqueGrades.add(classInfo.stage);
        });
        return Array.from(uniqueGrades);
    }, [teacher, classes]);
    
    const sectionsForGrade = useMemo(() => {
        if (!newSheetGrade) return [];
        const sections = new Set<string>();
         (teacher.assignments || []).forEach(a => {
            const classInfo = classes.find(c => c.id === a.classId);
            if (classInfo && classInfo.stage === newSheetGrade) {
                sections.add(classInfo.section);
            }
        });
        return Array.from(sections).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [newSheetGrade, classes, teacher.assignments]);

    const subjectsForGrade = useMemo(() => {
        if (!newSheetGrade) return [];
        const subjects = new Map<string, Subject>();
        (teacher.assignments || []).forEach(a => {
            const classInfo = classes.find(c => c.id === a.classId);
            if (classInfo && classInfo.stage === newSheetGrade) {
                const subjectInfo = classInfo.subjects.find(s => s.id === a.subjectId);
                if(subjectInfo) subjects.set(subjectInfo.id, subjectInfo);
            }
        });
        return Array.from(subjects.values());
    }, [newSheetGrade, teacher, classes]);
    
    const handleGradeChangeForNewSheet = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setNewSheetGrade(e.target.value);
        setNewSheetSection('');
        setNewSheetSubjectId('');
    };

    const handleCreateSheet = () => {
        if (!newSheetGrade || !newSheetSection.trim() || !newSheetSubjectId) {
            alert('يرجى اختيار الصف والشعبة والمادة.');
            return;
        }

        const subjectInfo = subjectsForGrade.find(s => s.id === newSheetSubjectId);
        if (!subjectInfo) return;
        
        const classForStudents = classes.find(c => c.stage === newSheetGrade && c.section.trim() === newSheetSection.trim());
        const initialStudents: StudentGrades[] = (classForStudents?.students || []).map(s => ({
            id: s.id,
            name: s.name,
            s1_m1_daily: {}, s1_m1_written: null, s1_m2_daily: {}, s1_m2_written: null, midYear: null,
            s2_m1_daily: {}, s2_m1_written: null, s2_m2_daily: {}, s2_m2_written: null, finalExam: null,
        }));


        const newSheet: DailyGradeSheet = {
            id: uuidv4(),
            gradeLevel: newSheetGrade,
            section: newSheetSection.trim(),
            subjectName: subjectInfo.name,
            subjectId: subjectInfo.id,
            teacherName: teacher.name,
            schoolName: settings.schoolName,
            academicYear: settings.academicYear,
            columnSettings: { s1_m1: [], s1_m2: [], s2_m1: [], s2_m2: [] },
            students: initialStudents,
        };

        db.ref(`daily_grade_sheets/${teacher.id}/${newSheet.id}`).set(newSheet);
        // We don't call setActiveSheet here anymore. The useEffect will pick up the new sheet from Firebase,
        // which will be sanitized, and then we can find it and set it as active.
        // Let's find a way to open it after creation. Maybe just set the ID.
        // For now, let's set it directly but also sanitize it to avoid waiting for firebase.
        const sanitizedNewSheet = {
             ...newSheet,
             columnSettings: {
                s1_m1: [], s1_m2: [], s2_m1: [], s2_m2: [],
             }
        };

        setActiveSheet(sanitizedNewSheet);
        setView('sheet');
    };

    const handleDeleteSheet = (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.')) {
            db.ref(`daily_grade_sheets/${teacher.id}/${id}`).remove();
        }
    };
    
    const onSave = useCallback((updatedSheet: DailyGradeSheet) => {
        if(teacher.id && updatedSheet.id) {
            db.ref(`daily_grade_sheets/${teacher.id}/${updatedSheet.id}`).set(updatedSheet);
        }
    }, [teacher.id]);


    const renderManager = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-cyan-600" />
                    <p className="ml-4 text-lg">جاري تحميل السجلات...</p>
                </div>
            );
        }
        return (
            <div className="space-y-8">
                <div className="bg-white p-6 rounded-xl shadow-lg border">
                     <h2 className="text-2xl font-bold text-gray-800 mb-1 border-b pb-3">إدارة سجلات الدرجات اليومية</h2>
                     <p className="text-gray-500 mb-6">قم بإنشاء سجل جديد أو اختر سجلاً محفوظاً للعمل عليه.</p>

                    <div className="bg-gray-50 p-4 rounded-lg border">
                        <h3 className="text-xl font-semibold mb-4 text-cyan-700">إنشاء سجل جديد</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <select value={newSheetGrade} onChange={handleGradeChangeForNewSheet} className="w-full p-2 border rounded-md"><option value="">اختر الصف</option>{teacherGrades.map(g => <option key={g} value={g}>{g}</option>)}</select>
                            <select value={newSheetSection} onChange={e => setNewSheetSection(e.target.value)} disabled={!newSheetGrade} className="w-full p-2 border rounded-md"><option value="">اختر الشعبة</option>{sectionsForGrade.map(s => <option key={s} value={s}>{s}</option>)}</select>
                            <select value={newSheetSubjectId} onChange={e => setNewSheetSubjectId(e.target.value)} disabled={!newSheetGrade} className="w-full p-2 border rounded-md"><option value="">اختر المادة</option>{subjectsForGrade.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                            <button onClick={handleCreateSheet} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700"><Plus /> إنشاء سجل</button>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg border">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">السجلات المحفوظة</h3>
                    <div className="space-y-3">
                        {sheets.length > 0 ? sheets.map(sheet => (
                            <div key={sheet.id} className="p-3 bg-gray-50 rounded-lg border flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-lg">{sheet.gradeLevel} / {sheet.section}</p>
                                    <p className="text-sm text-gray-600">المادة: {sheet.subjectName}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleDeleteSheet(sheet.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={18}/></button>
                                    <button onClick={() => { setActiveSheet(sheet); setView('sheet'); }} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">الدخول للسجل</button>
                                </div>
                            </div>
                        )) : <p className="text-center text-gray-500 p-4">لا توجد سجلات محفوظة.</p>}
                    </div>
                </div>
            </div>
        )
    };

    if (view === 'manager') {
        return renderManager();
    }
    
    if (view === 'sheet' && activeSheet) {
        // Re-find the sheet from the state to ensure it has the latest data from Firebase listener
        const currentSheetFromState = sheets.find(s => s.id === activeSheet.id) || activeSheet;
        return <SheetEditor
                    sheet={currentSheetFromState}
                    onBack={() => setView('manager')}
                    onSave={onSave}
                    settings={settings}
                    classes={classes}
                />;
    }
    
    return null;
}


// ##################################################################################
// #                            SHEET EDITOR COMPONENT                              #
// ##################################################################################
interface SheetEditorProps {
    sheet: DailyGradeSheet;
    onBack: () => void;
    onSave: (sheet: DailyGradeSheet) => void;
    settings: SchoolSettings;
    classes: ClassData[];
}

const SheetEditor = ({ sheet, onBack, onSave, settings, classes }: SheetEditorProps) => {
    const [localSheet, setLocalSheet] = useState<DailyGradeSheet>(sheet);
    const [isExporting, setIsExporting] = useState(false);
    const [exportOrientation, setExportOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [isApproving, setIsApproving] = useState(false);
    
    useEffect(() => {
        setLocalSheet(sheet);
    }, [sheet]);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            onSave(localSheet);
        }, 1500); // Autosave 1.5s after last change

        return () => {
            clearTimeout(handler);
        };
    }, [localSheet, onSave]);

    const updateStudents = (updater: (students: StudentGrades[]) => StudentGrades[]) => {
        setLocalSheet(prev => ({...prev, students: updater(prev.students)}));
    };
    
    const updateColumns = (updater: (cols: DailyGradeSheet['columnSettings']) => DailyGradeSheet['columnSettings']) => {
        setLocalSheet(prev => ({...prev, columnSettings: updater(prev.columnSettings)}));
    };

    const advanceInColumn = (currentInput: HTMLInputElement | null) => {
        if (!currentInput) return;
        const { studentId, columnId } = currentInput.dataset;
        if (!studentId || !columnId) return;

        const students = localSheet.students;
        const currentStudentIndex = students.findIndex(s => s.id === studentId);

        if (currentStudentIndex > -1 && currentStudentIndex < students.length - 1) {
            const nextStudentId = students[currentStudentIndex + 1].id;
            const form = currentInput.closest('form');
            const nextInput = form?.querySelector(`input[data-student-id="${nextStudentId}"][data-column-id="${columnId}"]`) as HTMLInputElement;
            if (nextInput) {
                nextInput.focus();
                nextInput.select();
            }
        }
    };
    
    const GradeInput = ({ value, onChange, max = 100, readOnly = false, studentId, columnId }: {
        value: number | null,
        onChange: (val: number | null) => void,
        max?: number,
        readOnly?: boolean,
        studentId: string,
        columnId: string,
    }) => {
        const [localValue, setLocalValue] = useState(value === null ? '' : String(value));
        const isFocused = useRef(false);
    
        useEffect(() => {
            if (!isFocused.current) {
                setLocalValue(value === null ? '' : String(value));
            }
        }, [value]);
    
        const processAndSave = (val: string): number | null => {
            if (readOnly) return value;
    
            if (val.trim() === '') {
                if (value !== null) onChange(null);
                return null;
            }
            
            let num = parseInt(val, 10);
            if (isNaN(num)) {
                setLocalValue(value === null ? '' : String(value));
                return value;
            }
            
            num = Math.min(Math.max(num, 0), max);
            if (num !== value) onChange(num);
            setLocalValue(String(num)); // Ensure display matches saved value
            return num;
        };
    
        const handleFocus = () => { isFocused.current = true; };
    
        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            isFocused.current = false;
            processAndSave(e.target.value);
        };
    
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            setLocalValue(val);
    
            if (readOnly) return;
            
            const num = parseInt(val, 10);
            if (isNaN(num) || num < 0) return;
    
            const isTwoOrThreeDigit = val.length >= 2 && num >= 11;
    
            if (isTwoOrThreeDigit) {
                const finalNum = Math.min(num, max);
                if (finalNum !== value) onChange(finalNum);
                advanceInColumn(e.currentTarget);
            }
        };
        
        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                processAndSave(localValue);
                advanceInColumn(e.currentTarget);
            }
        };
        
        return (
            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={localValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                readOnly={readOnly}
                className="w-full h-full text-center bg-transparent border-0 focus:ring-1 focus:ring-inset focus:ring-cyan-500 p-1 outline-none disabled:bg-gray-200"
                data-student-id={studentId}
                data-column-id={columnId}
            />
        );
    };

    // Calculation logic
    const calculatedData = useMemo(() => {
        const results = new Map<string, any>();
        
        const sum = (dailyGrades: Record<string, number | null>): number | null => {
            const validGrades = Object.values(dailyGrades).filter(g => g !== null && g !== undefined && !isNaN(Number(g))) as number[];
            return validGrades.length > 0 ? validGrades.reduce((acc, val) => acc + val, 0) : null;
        };
        
        localSheet.students.forEach(student => {
            const s1_m1_total_daily = sum(student.s1_m1_daily);
            const s1_m1_avg = (s1_m1_total_daily !== null || student.s1_m1_written !== null) ? round(((s1_m1_total_daily || 0) + (student.s1_m1_written || 0)) / 2) : null;
            
            const s1_m2_total_daily = sum(student.s1_m2_daily);
            const s1_m2_avg = (s1_m2_total_daily !== null || student.s1_m2_written !== null) ? round(((s1_m2_total_daily || 0) + (student.s1_m2_written || 0)) / 2) : null;
            
            const sem1_avg = (s1_m1_avg !== null || s1_m2_avg !== null) ? round(((s1_m1_avg || 0) + (s1_m2_avg || 0)) / 2) : null;

            const s2_m1_total_daily = sum(student.s2_m1_daily);
            const s2_m1_avg = (s2_m1_total_daily !== null || student.s2_m1_written !== null) ? round(((s2_m1_total_daily || 0) + (student.s2_m1_written || 0)) / 2) : null;
            
            const s2_m2_total_daily = sum(student.s2_m2_daily);
            const s2_m2_avg = (s2_m2_total_daily !== null || student.s2_m2_written !== null) ? round(((s2_m2_total_daily || 0) + (student.s2_m2_written || 0)) / 2) : null;
            
            const sem2_avg = (s2_m1_avg !== null || s2_m2_avg !== null) ? round(((s2_m1_avg || 0) + (s2_m2_avg || 0)) / 2) : null;

            const yearly_pursuit = (sem1_avg !== null || sem2_avg !== null || student.midYear !== null) ? round(((sem1_avg || 0) + (sem2_avg || 0) + (student.midYear || 0)) / 3) : null;
            const final_grade = (yearly_pursuit !== null || student.finalExam !== null) ? round(((yearly_pursuit || 0) + (student.finalExam || 0)) / 2) : null;

            results.set(student.id, {
                s1_m1_total_daily, s1_m1_avg, s1_m2_total_daily, s1_m2_avg, sem1_avg,
                s2_m1_total_daily, s2_m1_avg, s2_m2_total_daily, s2_m2_avg, sem2_avg,
                yearly_pursuit, final_grade
            });
        });
        return results;
    }, [localSheet.students]);

    const addColumn = (semester: 's1' | 's2', month: 'm1' | 'm2') => {
        const key = `${semester}_${month}` as keyof DailyGradeSheet['columnSettings'];
        updateColumns(prev => ({
            ...prev,
            [key]: [...prev[key], { id: uuidv4(), name: 'يومي', maxGrade: 25 }]
        }));
    };

    const removeColumn = (semester: 's1' | 's2', month: 'm1' | 'm2', colId: string) => {
        const key = `${semester}_${month}` as keyof DailyGradeSheet['columnSettings'];
        updateColumns(prev => ({...prev, [key]: prev[key].filter(c => c.id !== colId)}));
        updateStudents(students => students.map(s => {
            const newStudent = {...s};
            const dailyKey = `${key}_daily` as keyof StudentGrades;
            const newDaily = {...(newStudent[dailyKey] as Record<string, number | null>)};
            delete newDaily[colId];
            (newStudent as any)[dailyKey] = newDaily;
            return newStudent;
        }));
    };

    const updateColumn = (semester: 's1' | 's2', month: 'm1' | 'm2', colId: string, field: 'name' | 'maxGrade', value: string | number) => {
        const key = `${semester}_${month}` as keyof DailyGradeSheet['columnSettings'];
        updateColumns(prev => ({
            ...prev,
            [key]: prev[key].map(c => c.id === colId ? {...c, [field]: value} : c)
        }));
    };

    const applyToAllMonths = () => {
        const s1_m1_cols = localSheet.columnSettings.s1_m1;
        updateColumns(prev => ({
            ...prev,
            s1_m2: s1_m1_cols.map(c => ({...c, id: uuidv4()})),
            s2_m1: s1_m1_cols.map(c => ({...c, id: uuidv4()})),
            s2_m2: s1_m1_cols.map(c => ({...c, id: uuidv4()})),
        }));
    };
    
    const addStudentManually = () => {
        const name = prompt("ادخل اسم الطالب:");
        if (name && name.trim()) {
            const newStudent: StudentGrades = {
                id: uuidv4(), name: name.trim(),
                s1_m1_daily: {}, s1_m1_written: null, s1_m2_daily: {}, s1_m2_written: null, midYear: null,
                s2_m1_daily: {}, s2_m1_written: null, s2_m2_daily: {}, s2_m2_written: null, finalExam: null,
            };
            updateStudents(prev => [...prev, newStudent]);
        }
    };

    const handleImportFromExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target!.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            const newStudents: StudentGrades[] = json
                .slice(0)
                .map(row => String(row[0]).trim())
                .filter(name => name)
                .map(name => ({
                    id: uuidv4(), name,
                    s1_m1_daily: {}, s1_m1_written: null, s1_m2_daily: {}, s1_m2_written: null, midYear: null,
                    s2_m1_daily: {}, s2_m1_written: null, s2_m2_daily: {}, s2_m2_written: null, finalExam: null,
                }));
            
            if(window.confirm(`تم العثور على ${newStudents.length} طالب. هل تريد إضافتهم إلى القائمة الحالية؟`)) {
                 updateStudents(prev => [...prev, ...newStudents]);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExport = async (format: 'pdf' | 'word') => {
        setIsExporting(true);
        try {
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute'; tempContainer.style.left = '-9999px'; document.body.appendChild(tempContainer);
            const root = ReactDOM.createRoot(tempContainer);
            const { jsPDF } = jspdf;
            const pdf = new jsPDF({ orientation: exportOrientation, unit: 'mm', format: 'a4' });
            const studentsPerPage = exportOrientation === 'landscape' ? 18 : 30;

            const processPage = async (pageComponent: React.ReactElement) => {
                await new Promise<void>(resolve => { root.render(pageComponent); setTimeout(resolve, 500); });
                const canvas = await html2canvas(tempContainer.children[0] as HTMLElement, { scale: 2 });
                return canvas.toDataURL('image/png');
            };

            for (let i = 0; i < localSheet.students.length; i += studentsPerPage) {
                const chunk = localSheet.students.slice(i, i + studentsPerPage);
                const imgData = await processPage(<DailyGradeSheetPDFPage1 sheet={localSheet} students={chunk} calculatedData={calculatedData} orientation={exportOrientation} startingIndex={i} />);
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
            }
            
            for (let i = 0; i < localSheet.students.length; i += studentsPerPage) {
                const chunk = localSheet.students.slice(i, i + studentsPerPage);
                const imgData = await processPage(<DailyGradeSheetPDFPage2 sheet={localSheet} students={chunk} calculatedData={calculatedData} orientation={exportOrientation} startingIndex={i} />);
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
            }
            
            pdf.save(`${localSheet.subjectName}-${localSheet.gradeLevel}-${localSheet.section}.pdf`);
            root.unmount(); document.body.removeChild(tempContainer);
        } catch(e) { console.error(e); alert("حدث خطأ أثناء التصدير"); } finally { setIsExporting(false); }
    };

    const handleApproveGrades = async () => {
        if (!window.confirm("سيتم اعتماد الدرجات المحسوبة من هذا السجل وتحديث سجل درجات المدرس الرئيسي. هل أنت متأكد؟")) {
            return;
        }
    
        const targetClass = classes.find(c => c.stage === localSheet.gradeLevel && c.section === localSheet.section);
        
        if (!targetClass) {
            alert("خطأ: لم يتم العثور على الشعبة المطابقة في القائمة الرئيسية.");
            return;
        }
    
        setIsApproving(true);
        const updates: Record<string, any> = {};
        let gradesApprovedCount = 0;
    
        localSheet.students.forEach(dailyStudent => {
            const studentIndex = targetClass.students.findIndex(s => s.id === dailyStudent.id);
            if (studentIndex === -1) {
                console.warn(`Student ${dailyStudent.name} not found in main class data.`);
                return;
            }
            
            const calcs = calculatedData.get(dailyStudent.id);
            if (!calcs) return;
    
            const basePath = `classes/${targetClass.id}/students/${studentIndex}/teacherGrades/${localSheet.subjectName}`;
    
            const gradesToUpdate: Record<string, number | null> = {
                firstSemMonth1: calcs.s1_m1_avg,
                firstSemMonth2: calcs.s1_m2_avg,
                midYear: dailyStudent.midYear,
                secondSemMonth1: calcs.s2_m1_avg,
                secondSemMonth2: calcs.s2_m2_avg,
                finalExam: dailyStudent.finalExam
            };
    
            for (const [key, value] of Object.entries(gradesToUpdate)) {
                if (value !== null && value !== undefined) {
                    updates[`${basePath}/${key}`] = value;
                    gradesApprovedCount++;
                }
            }
        });
    
        if (gradesApprovedCount === 0) {
            alert("لا توجد درجات محسوبة لاعتمادها.");
            setIsApproving(false);
            return;
        }
        
        try {
            await db.ref().update(updates);
            alert("تم اعتماد الدرجات بنجاح وتحديث سجل المدرس الرئيسي.");
        } catch (error) {
            console.error("Failed to approve grades:", error);
            alert("حدث خطأ أثناء اعتماد الدرجات.");
        } finally {
            setIsApproving(false);
        }
    };
    

    const renderSemesterTable = (semester: 's1' | 's2') => {
        const m1Key = `${semester}_m1` as const;
        const m2Key = `${semester}_m2` as const;
        const m1Cols = localSheet.columnSettings[m1Key];
        const m2Cols = localSheet.columnSettings[m2Key];
        const semesterLabel = semester === 's1' ? 'الفصل الدراسي الاول' : 'الفصل الدراسي الثاني';
        const semAvgKey = semester === 's1' ? 'sem1_avg' : 'sem2_avg';

        const m1DailyTotal = m1Cols.reduce((sum, c) => sum + c.maxGrade, 0);
        const m2DailyTotal = m2Cols.reduce((sum, c) => sum + c.maxGrade, 0);

        return (
             <div className="bg-white p-4 rounded-lg shadow-lg border mt-6">
                <h3 className="font-bold text-xl mb-2">{semesterLabel}</h3>
                 <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th rowSpan={3} className="border p-1 w-8">ت</th>
                                <th rowSpan={3} className="border p-1 min-w-[200px]">اسم الطالب</th>
                                <th colSpan={m1Cols.length + 3} className="border p-1 bg-blue-100">الشهر الأول</th>
                                <th colSpan={m2Cols.length + 3} className="border p-1 bg-green-100">الشهر الثاني</th>
                                <th rowSpan={3} className="border p-1 min-w-[60px] bg-yellow-200">معدل الفصل</th>
                                {semester === 's1' ? <th rowSpan={3} className="border p-1 min-w-[60px] bg-pink-200">نصف السنة</th> : <>
                                <th rowSpan={3} className="border p-1 min-w-[60px] bg-purple-200">السعي السنوي</th>
                                <th rowSpan={3} className="border p-1 min-w-[60px] bg-red-200">الامتحان النهائي</th>
                                <th rowSpan={3} className="border p-1 min-w-[60px] bg-orange-200">الدرجة النهائية</th>
                                </>}
                            </tr>
                            <tr className="bg-gray-50">
                                {m1Cols.map(c => <th key={c.id} className="border p-1 min-w-[60px]">{c.name}</th>)}
                                <th className="border p-1 min-w-[60px]">م. اليومي</th><th className="border p-1 min-w-[60px]">التحريري</th><th className="border p-1 min-w-[60px] bg-blue-200">المعدل</th>
                                {m2Cols.map(c => <th key={c.id} className="border p-1 min-w-[60px]">{c.name}</th>)}
                                <th className="border p-1 min-w-[60px]">م. اليومي</th><th className="border p-1 min-w-[60px]">التحريري</th><th className="border p-1 min-w-[60px] bg-green-200">المعدل</th>
                            </tr>
                             <tr className="bg-gray-100 font-bold text-cyan-700">
                                {m1Cols.map(c => <td key={c.id} className="border p-1 text-center">{c.maxGrade}</td>)}
                                <td className="border p-1 text-center">{m1DailyTotal || ''}</td><td className="border p-1 text-center">100</td><td className="border p-1 text-center bg-blue-100">100</td>
                                {m2Cols.map(c => <td key={c.id} className="border p-1 text-center">{c.maxGrade}</td>)}
                                <td className="border p-1 text-center">{m2DailyTotal || ''}</td><td className="border p-1 text-center">100</td><td className="border p-1 text-center bg-green-100">100</td>
                            </tr>
                        </thead>
                        <tbody>
                             {localSheet.students.map((student, index) => {
                                const calcs = calculatedData.get(student.id);
                                return (
                                    <tr key={student.id} className="h-10 hover:bg-gray-50">
                                        <td className="border text-center">{index+1}</td>
                                        <td className="border p-1 font-semibold">{student.name}</td>
                                        {m1Cols.map(c => <td key={c.id} className="border p-0"><GradeInput studentId={student.id} columnId={c.id} value={(student[`${m1Key}_daily`][c.id]) ?? null} onChange={v => updateStudents(s => s.map(st => st.id === student.id ? {...st, [`${m1Key}_daily`]: {...st[`${m1Key}_daily`], [c.id]:v}} : st))} max={c.maxGrade} /></td>)}
                                        <td className="border text-center bg-gray-100 font-semibold">{calcs?.[`${m1Key}_total_daily`] ?? ''}</td>
                                        <td className="border p-0"><GradeInput studentId={student.id} columnId={`${m1Key}_written`} value={student[`${m1Key}_written`]} onChange={v => updateStudents(s => s.map(st => st.id === student.id ? {...st, [`${m1Key}_written`]: v} : st))} max={100} /></td>
                                        <td className="border text-center bg-blue-100 font-bold">{calcs?.[`${m1Key}_avg`] ?? ''}</td>
                                        {m2Cols.map(c => <td key={c.id} className="border p-0"><GradeInput studentId={student.id} columnId={c.id} value={(student[`${m2Key}_daily`][c.id]) ?? null} onChange={v => updateStudents(s => s.map(st => st.id === student.id ? {...st, [`${m2Key}_daily`]: {...st[`${m2Key}_daily`], [c.id]:v}} : st))} max={c.maxGrade} /></td>)}
                                        <td className="border text-center bg-gray-100 font-semibold">{calcs?.[`${m2Key}_total_daily`] ?? ''}</td>
                                        <td className="border p-0"><GradeInput studentId={student.id} columnId={`${m2Key}_written`} value={student[`${m2Key}_written`]} onChange={v => updateStudents(s => s.map(st => st.id === student.id ? {...st, [`${m2Key}_written`]: v} : st))} max={100}/></td>
                                        <td className="border text-center bg-green-100 font-bold">{calcs?.[`${m2Key}_avg`] ?? ''}</td>
                                        <td className="border text-center bg-yellow-100 font-bold">{calcs?.[semAvgKey] ?? ''}</td>
                                        {semester === 's1' ? <td className="border p-0"><GradeInput studentId={student.id} columnId="midYear" value={student.midYear} onChange={v => updateStudents(s => s.map(st => st.id === student.id ? {...st, midYear:v}:st))} max={100}/></td> : <>
                                        <td className="border text-center bg-purple-100 font-bold">{calcs?.yearly_pursuit ?? ''}</td>
                                        <td className="border p-0"><GradeInput studentId={student.id} columnId="finalExam" value={student.finalExam} onChange={v => updateStudents(s => s.map(st => st.id === student.id ? {...st, finalExam:v}:st))} max={100}/></td>
                                        <td className="border text-center bg-orange-100 font-bold">{calcs?.final_grade ?? ''}</td>
                                        </>}
                                    </tr>
                                )
                             })}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    };
    
    return (
        <form>
            {isExporting && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><Loader2 className="animate-spin text-white h-16 w-16"/></div>}

             <div className="flex justify-between items-center mb-4">
                <button type="button" onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"><ArrowLeft/> العودة لقائمة السجلات</button>
             </div>
             <div className="bg-white p-4 rounded-lg shadow-lg border mb-4">
                <p><strong>المدرسة:</strong> {localSheet.schoolName}</p><p><strong>العام الدراسي:</strong> {localSheet.academicYear}</p><p><strong>المدرس:</strong> {localSheet.teacherName}</p><p><strong>المادة:</strong> {localSheet.subjectName}</p><p><strong>الصف:</strong> {localSheet.gradeLevel} / {localSheet.section}</p>
             </div>
              <div className="bg-white p-4 rounded-lg shadow-lg border mb-4">
                 <h3 className="font-bold text-lg mb-2">إعدادات الأعمدة (الشهر الأول)</h3>
                 <div className="flex flex-wrap items-center gap-2">
                    {localSheet.columnSettings.s1_m1.map(col => (<div key={col.id} className="flex items-center border rounded-md p-1"><input type="text" value={col.name} onChange={e => updateColumn('s1', 'm1', col.id, 'name', e.target.value)} className="w-24 p-1"/><input type="number" value={col.maxGrade} onChange={e => updateColumn('s1', 'm1', col.id, 'maxGrade', parseInt(e.target.value))} className="w-16 p-1"/><button type="button" onClick={() => removeColumn('s1', 'm1', col.id)} className="p-1 text-red-500"><X size={16}/></button></div>))}
                    <button type="button" onClick={() => addColumn('s1', 'm1')} className="px-3 py-2 bg-blue-500 text-white rounded-md text-sm">إضافة عمود</button>
                    <button type="button" onClick={applyToAllMonths} className="px-3 py-2 bg-purple-500 text-white rounded-md text-sm">تطبيق على كل الشهور</button>
                 </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-lg border mb-4">
                <h3 className="font-bold text-lg mb-2">إدارة الطلاب</h3>
                <div className="flex gap-2"><button type="button" onClick={addStudentManually} className="px-3 py-2 bg-green-500 text-white rounded-md text-sm">إضافة طالب يدويا</button><label className="px-3 py-2 bg-teal-500 text-white rounded-md text-sm cursor-pointer">استيراد من Excel <input type="file" className="hidden" onChange={handleImportFromExcel} accept=".xlsx, .xls"/></label></div>
              </div>
               <div className="bg-white p-4 rounded-lg shadow-lg border mb-4">
                <h3 className="font-bold text-lg mb-2">تصدير واعتماد</h3>
                 <div className="flex items-center gap-4 flex-wrap">
                    <button type="button" onClick={() => handleExport('pdf')} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm flex items-center gap-2"><Printer/> تصدير PDF</button>
                     <div className="flex items-center gap-2">
                         <label><input type="radio" name="orientation" value="landscape" checked={exportOrientation === 'landscape'} onChange={() => setExportOrientation('landscape')}/> أفقي</label>
                         <label><input type="radio" name="orientation" value="portrait" checked={exportOrientation === 'portrait'} onChange={() => setExportOrientation('portrait')}/> عمودي</label>
                     </div>
                     <button
                        type="button"
                        onClick={handleApproveGrades}
                        disabled={isApproving}
                        className="px-4 py-2 bg-green-600 text-white rounded-md text-sm flex items-center gap-2 disabled:bg-gray-400"
                    >
                        {isApproving ? <Loader2 className="animate-spin"/> : <CheckCircle size={18}/>}
                        اعتماد الدرجات
                    </button>
                 </div>
              </div>
             {renderSemesterTable('s1')}
             {renderSemesterTable('s2')}
        </form>
    );
};