
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { ClassData, Teacher, TeacherSubjectGrade, TeacherCalculatedGrade, TeacherSubmission, SchoolSettings, Student } from '../../types.ts';
import { calculateStudentResult } from '../../lib/gradeCalculator.ts';
import { Download, Send, AlertTriangle, Lock, Loader2, AlertCircle, Unlock, CheckCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import * as ReactDOM from 'react-dom/client';
import TeacherGradeSheetPDF from './TeacherGradeSheetPDF.tsx';
import { db } from '../../lib/firebase.ts';

declare const jspdf: any;
declare const html2canvas: any;
declare const XLSX: any;

interface TeacherGradeSheetProps {
    classData: ClassData;
    teacher: Teacher;
    settings: SchoolSettings;
    isReadOnly?: boolean;
    subjectId?: string; 
}

const DEFAULT_TEACHER_GRADE: TeacherSubjectGrade = {
    firstSemMonth1: null, firstSemMonth2: null, midYear: null, secondSemMonth1: null, secondSemMonth2: null, finalExam: null,
    october: null, november: null, december: null, january: null, february: null, march: null, april: null,
};

const GradeInput: React.FC<{
    value: number | null;
    onChange: (value: number | null) => void;
    onEnterPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    isReadOnly?: boolean;
    onAutoAdvance: (input: HTMLInputElement | null) => void;
    studentId: string;
    field: keyof TeacherSubjectGrade;
    schoolGender?: string;
    max: number;
}> = ({ value, onChange, onEnterPress, isReadOnly = false, onAutoAdvance, studentId, field, schoolGender, max }) => {
    
    const valueToString = useCallback((val: number | null): string => {
        if (val === null) return '';
        if (val === -1) return schoolGender === 'بنات' ? 'غائبة' : 'غائب';
        if (val === -2) return schoolGender === 'بنات' ? 'مجازة' : 'مجاز';
        return String(val);
    }, [schoolGender]);

    const [localValue, setLocalValue] = useState(valueToString(value));

    useEffect(() => {
        setLocalValue(valueToString(value));
    }, [value, valueToString]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const inputElement = e.currentTarget;
        setLocalValue(val);

        if (isReadOnly) return;
        
        const numericValue = parseInt(val, 10);
        if (isNaN(numericValue)) {
            return;
        }

        if (numericValue >= 0 && numericValue <= max) {
            const shouldAdvance = String(numericValue).length >= String(max).length && (max < 10 || val !== String(Math.floor(max/10)));

            if (shouldAdvance) {
                onChange(numericValue);
                setTimeout(() => onAutoAdvance(inputElement), 0);
            }
        }
    };
    
    const handleBlur = () => {
        if (isReadOnly) return;
        const trimmedVal = localValue.trim();
        if (trimmedVal === '') {
            onChange(null);
            return;
        }
        if (trimmedVal === 'غ' || trimmedVal === 'غائب' || trimmedVal === 'غائبة') {
            onChange(-1);
            return;
        }
        if (trimmedVal === 'م' || trimmedVal === 'مجاز' || trimmedVal === 'مجازة') {
            onChange(-2);
            return;
        }

        let numericValue = parseInt(trimmedVal, 10);
        if (!isNaN(numericValue)) {
            if (numericValue > max) numericValue = max;
            if (numericValue < 0) numericValue = 0;
            onChange(numericValue);
        } else {
            setLocalValue(valueToString(value));
        }
    };
    
    return (
        <input
            type="text" 
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={onEnterPress}
            data-student-id={studentId}
            data-field={field}
            className="w-full h-full text-center bg-transparent border-0 focus:ring-1 focus:ring-inset focus:ring-cyan-500 p-1 outline-none disabled:bg-gray-100 disabled:text-gray-400"
            disabled={isReadOnly}
        />
    );
};

export default function TeacherGradeSheet({ classData, teacher, settings, isReadOnly = false, subjectId }: TeacherGradeSheetProps) {
    const [submissions, setSubmissions] = useState<TeacherSubmission[]>([]);
    const [localGrades, setLocalGrades] = useState<Record<string, TeacherSubjectGrade>>({});
    const [isExporting, setIsExporting] = useState(false);

    const isPrimary = settings.schoolLevel === 'ابتدائية';
    const isPrimary1_4 = isPrimary && ['الاول ابتدائي', 'الثاني ابتدائي', 'الثالث ابتدائي', 'الرابع ابتدائي'].includes(classData.stage);
    const isPrimary5_6 = isPrimary && ['الخامس ابتدائي', 'السادس ابتدائي'].includes(classData.stage);
    const maxGrade = isPrimary1_4 ? 10 : 100;
    const studentLabel = isPrimary ? 'التلميذ' : 'الطالب';
    const teacherLabel = isPrimary ? 'المعلم' : 'المدرس';

    // Check submission locks from settings
    const isGlobalLocked = !!settings.lockAllSubmissions;
    const isS1Locked = !!settings.lockS1Submissions;
    const isS2Locked = !!settings.lockS2Submissions;
    
    // Submit button is forbidden if everything is locked
    const isSubmissionForbidden = isGlobalLocked || (isS1Locked && isS2Locked);

    // Helpers to classify fields
    const isS1Field = (field: keyof TeacherSubjectGrade) => 
        ['firstSemMonth1', 'firstSemMonth2', 'midYear', 'october', 'november', 'december', 'january'].includes(String(field));

    const isS2Field = (field: keyof TeacherSubjectGrade) => 
        ['secondSemMonth1', 'secondSemMonth2', 'finalExam', 'february', 'march', 'april'].includes(String(field));

    const isFieldDisabled = useCallback((field: keyof TeacherSubjectGrade) => {
        if (isReadOnly) return true; // Viewing from principal dashboard
        if (isGlobalLocked) return true;
        if (isS1Locked && isS1Field(field)) return true;
        if (isS2Locked && isS2Field(field)) return true;
        return false;
    }, [isReadOnly, isGlobalLocked, isS1Locked, isS2Locked]);


    useEffect(() => {
        if (isReadOnly) return;
        const submissionsRef = db.ref('teacher_submissions');
        const callback = (snapshot: any) => {
            const data = snapshot.val();
            setSubmissions(data ? Object.values(data) : []);
        };
        submissionsRef.on('value', callback);
        return () => submissionsRef.off('value', callback);
    }, [isReadOnly]);

    const activeSubject = useMemo(() => {
        if (subjectId) {
            return (classData.subjects || []).find(s => s.id === subjectId);
        }
        const assignment = (teacher.assignments || []).find(a => a.classId === classData.id);
        return assignment ? (classData.subjects || []).find(s => s.id === assignment.subjectId) : undefined;
    }, [classData, teacher, subjectId]);

    useEffect(() => {
        if (activeSubject) {
            const initialGrades: Record<string, TeacherSubjectGrade> = {};
            (classData.students || []).forEach(student => {
                const existingGrades = student.teacherGrades?.[activeSubject.name] || {};
                initialGrades[student.id] = { ...DEFAULT_TEACHER_GRADE, ...existingGrades };
            });
            setLocalGrades(initialGrades);
        }
    }, [classData.students, activeSubject]);
    
    const sortedStudents = useMemo(() => 
        [...(classData.students || [])].sort((a, b) => {
            const aId = a.examId || '';
            const bId = b.examId || '';
            const numA = parseInt(aId, 10);
            const numB = parseInt(bId, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return aId.localeCompare(bId, undefined, { numeric: true });
        }), 
    [classData.students]);

    const isValidGrade = (g: number | null | undefined): g is number => g !== null && g !== undefined && g >= 0;

    const calculateGrades = (grade: TeacherSubjectGrade): TeacherCalculatedGrade => {
        const firstSemAvg = (isValidGrade(grade.firstSemMonth1) && isValidGrade(grade.firstSemMonth2))
            ? Math.round((Number(grade.firstSemMonth1) + Number(grade.firstSemMonth2)) / 2)
            : null;
        const secondSemAvg = (isValidGrade(grade.secondSemMonth1) && isValidGrade(grade.secondSemMonth2))
            ? Math.round((Number(grade.secondSemMonth1) + Number(grade.secondSemMonth2)) / 2)
            : null;
        const annualPursuit = (firstSemAvg !== null && isValidGrade(grade.midYear) && secondSemAvg !== null)
            ? Math.round((firstSemAvg + Number(grade.midYear) + secondSemAvg) / 3)
            : null;
        return { firstSemAvg, secondSemAvg, annualPursuit };
    };

    const calculateGradesForPrimary = (grade: TeacherSubjectGrade): TeacherCalculatedGrade => {
        const { october, november, december, january, february, march, april, midYear } = grade;
        let primaryFirstTerm: number | null = null;
        const firstTermMonths = [october, november, december, january].filter(g => g !== null);
        if (firstTermMonths.length > 0) {
            primaryFirstTerm = Math.round(firstTermMonths.reduce((acc, val) => acc + (val as number), 0) / firstTermMonths.length);
        }
        let primarySecondTerm: number | null = null;
        const secondTermMonths = [february, march, april].filter(g => g !== null);
        if (secondTermMonths.length > 0) {
            primarySecondTerm = Math.round(secondTermMonths.reduce((acc, val) => acc + (val as number), 0) / secondTermMonths.length);
        }
        const annualPursuit = (primaryFirstTerm !== null && isValidGrade(midYear) && primarySecondTerm !== null)
            ? Math.round((primaryFirstTerm + Number(midYear) + primarySecondTerm) / 3)
            : null;
        return { firstSemAvg: null, secondSemAvg: null, annualPursuit, primaryFirstTerm, primarySecondTerm };
    };

    const results = useMemo(() => {
        const studentResults: Record<string, TeacherCalculatedGrade> = {};
        sortedStudents.forEach(student => {
            const grade = localGrades[student.id];
            if (grade) {
                 studentResults[student.id] = isPrimary5_6 ? calculateGradesForPrimary(grade) : calculateGrades(grade);
            }
        });
        return studentResults;
    }, [sortedStudents, localGrades, isPrimary5_6]);

    const handleGradeChange = useCallback((studentId: string, field: keyof TeacherSubjectGrade, value: number | null) => {
        setLocalGrades(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || DEFAULT_TEACHER_GRADE),
                [field]: value
            }
        }));
        if (!isReadOnly && activeSubject) {
            const studentIndex = (classData.students || []).findIndex(s => s.id === studentId);
            if (studentIndex !== -1) {
                // FIX: Wrap 'field' in String() to avoid implicit symbol-to-string conversion error in template literal.
                const gradePath = `classes/${classData.id}/students/${studentIndex}/teacherGrades/${activeSubject.name}/${String(field)}`;
                db.ref(gradePath).set(value);
            }
        }
    }, [isReadOnly, activeSubject, classData.id, classData.students]);

    const handleAutoAdvance = useCallback((currentInput: HTMLInputElement | null) => {
        if (!currentInput?.form) return;
        const { studentId, field } = currentInput.dataset;
        if (!studentId || !field) return;
        const currentStudentIndex = sortedStudents.findIndex(s => s.id === studentId);
        let nextIndex = currentStudentIndex + 1;
        while (nextIndex < sortedStudents.length) {
             const status = sortedStudents[nextIndex].enrollmentStatus;
             if (!status || status === 'active') break;
             nextIndex++;
        }
        if (nextIndex < sortedStudents.length) {
            const nextStudentId = sortedStudents[nextIndex].id;
            const nextInput = currentInput.form.querySelector(`input[data-student-id="${nextStudentId}"][data-field="${field}"]`) as HTMLInputElement;
            if (nextInput) { nextInput.focus(); nextInput.select(); }
        }
    }, [sortedStudents]);

    const handleEnterPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAutoAdvance(e.currentTarget);
        }
    };
    
     const handleSubmit = () => {
        if (!activeSubject || !teacher.principalId) return;
        if (isGlobalLocked) {
            alert("عذراً، تم إغلاق إرسال السجلات تماماً من قبل الإدارة.");
            return;
        }
        if (isS1Locked && isS2Locked) {
            alert("تم إغلاق إرسال نتائج الفصلين من قبل الإدارة.");
            return;
        }

        if (window.confirm("هل أنت متأكد من إرسال هذا السجل إلى الإدارة؟ سيتم اعتماد الدرجات المتاحة فقط.")) {
            const submission: TeacherSubmission = {
                id: uuidv4(),
                teacherId: teacher.id,
                classId: classData.id,
                subjectId: activeSubject.id,
                submittedAt: new Date().toISOString(),
                grades: localGrades
            };
            db.ref(`teacher_submissions/${submission.id}`).set(submission)
                .then(() => alert("تم إرسال السجل بنجاح!"))
                .catch(err => alert("حدث خطأ أثناء الإرسال."));
        }
    };

    const handleExportPdf = async () => {
        if (!activeSubject) return;
        setIsExporting(true);
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);
        const renderComponent = (component: React.ReactElement) => new Promise<void>(resolve => {
            root.render(component);
            setTimeout(resolve, 500);
        });
        const studentsWithLocalGrades = sortedStudents.map(s => ({
            ...s,
            teacherGrades: { ...s.teacherGrades, [activeSubject.name]: localGrades[s.id] || DEFAULT_TEACHER_GRADE }
        }));
        const MAX_ROWS_PER_PAGE = 21;
        const studentChunks = [];
        for (let i = 0; i < studentsWithLocalGrades.length; i += MAX_ROWS_PER_PAGE) {
            studentChunks.push(studentsWithLocalGrades.slice(i, i + MAX_ROWS_PER_PAGE));
        }
        try {
            const { jsPDF } = jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            for (let i = 0; i < studentChunks.length; i++) {
                await renderComponent(
                    <TeacherGradeSheetPDF students={studentChunks[i]} classData={classData} subject={activeSubject} teacherName={teacher.name} settings={settings} pageNumber={i + 1} totalPages={studentChunks.length} startingIndex={i * MAX_ROWS_PER_PAGE} isPrimary1_4={isPrimary1_4} isPrimary5_6={isPrimary5_6} />
                );
                const pageElement = tempContainer.children[0] as HTMLElement;
                const canvas = await html2canvas(pageElement, { scale: 2 });
                if (i > 0) pdf.addPage();
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
            }
            pdf.save(`سجل-${activeSubject.name}-${classData.stage}-${classData.section}.pdf`);
        } catch (error) {
            console.error(error);
            alert("فشل تصدير PDF.");
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
        }
    };

    if (!activeSubject) return <div className="p-4 text-center">لم يتم تعيين مادة لهذا الصف.</div>;
    
    const lastSubmissionDate = submissions
        .filter(s => s.classId === classData.id && s.subjectId === activeSubject.id)
        .sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        [0]?.submittedAt;
        
    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
            {/* Professional Alert for Locks */}
            {(isGlobalLocked || isS1Locked || isS2Locked) && !isReadOnly && (
                <div className={`mb-6 p-4 rounded-xl border-r-8 shadow-md flex items-center gap-4 transition-all ${
                    isGlobalLocked ? 'bg-red-50 border-red-500 text-red-800' : 'bg-amber-50 border-amber-500 text-amber-800'
                }`}>
                    <div className="bg-white/50 p-2 rounded-full">
                        <Lock size={28} className={isGlobalLocked ? 'text-red-600' : 'text-amber-600'} />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-black text-lg">تنبيه إداري: الحقول مقيدة</h4>
                        <p className="font-bold leading-relaxed">
                            {isGlobalLocked 
                                ? 'لقد قامت الإدارة بإغلاق السجل بالكامل. لا يمكن تعديل أي درجات حالياً.' 
                                : `تم إغلاق حقول ${isS1Locked ? 'الفصل الأول' : ''} ${isS1Locked && isS2Locked ? 'و' : ''} ${isS2Locked ? 'الفصل الثاني' : ''}. يمكنك فقط إدخال الدرجات في الحقول المفتوحة.`}
                        </p>
                    </div>
                    <div className="hidden sm:block">
                        <AlertTriangle size={32} className="opacity-20" />
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
                        سجل درجات: {classData.stage} - {classData.section}
                    </h2>
                    <p className="text-lg font-semibold text-cyan-700 mt-1">المادة: {activeSubject.name}</p>
                </div>
                <div className="flex gap-2 mt-2 sm:mt-0">
                    <button onClick={handleExportPdf} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition-all"><Download size={20} /><span>تصدير PDF</span></button>
                    {!isReadOnly && (
                        <button 
                            onClick={handleSubmit} 
                            disabled={isSubmissionForbidden}
                            className={`flex items-center gap-2 px-6 py-2 text-white font-bold rounded-lg shadow-md transition-all ${
                                isSubmissionForbidden 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-green-600 hover:bg-green-700 transform hover:scale-105'
                            }`}
                        >
                            {isSubmissionForbidden ? <Lock size={20} /> : <Send size={20} />}
                            <span>إرسال للإدارة</span>
                        </button>
                    )}
                </div>
            </div>
             {lastSubmissionDate && !isReadOnly && (
                <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded-md text-sm flex items-center gap-2">
                    <CheckCircle size={16} />
                    <span><b>آخر إرسال ناجح لهذا السجل:</b> {new Date(lastSubmissionDate).toLocaleString('ar-EG')}</span>
                </div>
            )}
            
            <div className="overflow-x-auto">
                <form>
                    {isPrimary1_4 ? (
                         <table className="min-w-full border-collapse border border-gray-400 text-sm">
                            <thead className="bg-gray-200 text-gray-700 font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="border border-gray-300 p-2 w-12">ت</th>
                                    <th className="border border-gray-300 p-2 min-w-[250px]">اسم {studentLabel}</th>
                                    <th className={`border border-gray-300 p-2 ${isS1Locked ? 'bg-gray-300' : ''}`}>نصف السنة</th>
                                    <th className={`border border-gray-300 p-2 ${isS2Locked ? 'bg-gray-300' : ''}`}>نهاية السنة</th>
                                </tr>
                            </thead>
                             <tbody>
                                {sortedStudents.map((student, studentIndex) => {
                                    const grade = localGrades[student.id] || DEFAULT_TEACHER_GRADE;
                                    const isTransferred = student.enrollmentStatus === 'transferred';
                                    const isDismissed = student.enrollmentStatus === 'dismissed';
                                    const rowStyle = isTransferred ? { backgroundColor: '#d8b4fe' } : isDismissed ? { backgroundColor: '#fca5a5' } : {};
                                    return (
                                        <tr key={student.id} className="h-10 hover:bg-cyan-50" style={rowStyle}>
                                            <td className="border border-gray-300 text-center">{studentIndex + 1}</td>
                                            <td className="border border-gray-300 p-2 font-semibold">{student.name}</td>
                                            {isTransferred ? <td colSpan={2} className="border border-gray-300 text-center font-bold text-purple-900">منقول</td> : isDismissed ? <td colSpan={2} className="border border-gray-300 text-center font-bold text-red-900">مفصول</td> : (
                                                <>
                                                    <td className="border border-gray-300 p-0">
                                                        <GradeInput value={grade.midYear} onChange={val => handleGradeChange(student.id, 'midYear', val)} onEnterPress={handleEnterPress} isReadOnly={isFieldDisabled('midYear')} onAutoAdvance={handleAutoAdvance} studentId={student.id} field='midYear' max={maxGrade} schoolGender={settings.schoolGender}/>
                                                    </td>
                                                    <td className="border border-gray-300 p-0">
                                                        <GradeInput value={grade.finalExam} onChange={val => handleGradeChange(student.id, 'finalExam', val)} onEnterPress={handleEnterPress} isReadOnly={isFieldDisabled('finalExam')} onAutoAdvance={handleAutoAdvance} studentId={student.id} field='finalExam' max={maxGrade} schoolGender={settings.schoolGender}/>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : isPrimary5_6 ? (
                         <table className="min-w-full border-collapse border border-gray-400 text-sm">
                             <thead className="bg-gray-200 text-gray-700 font-bold sticky top-0 z-10">
                                <tr>
                                    <th rowSpan={2} className="border border-gray-300 p-2 w-12">ت</th>
                                    <th rowSpan={2} className="border border-gray-300 p-2 min-w-[180px]">اسم {studentLabel}</th>
                                    <th colSpan={4} className={`border-b border-gray-300 p-2 ${isS1Locked ? 'bg-gray-300' : ''}`}>الفصل الأول</th>
                                    <th rowSpan={2} className="border border-gray-300 p-2">معدل الفصل الأول</th>
                                    <th rowSpan={2} className={`border border-gray-300 p-2 ${isS1Locked ? 'bg-gray-300' : ''}`}>نصف السنة</th>
                                    <th colSpan={3} className={`border-b border-gray-300 p-2 ${isS2Locked ? 'bg-gray-300' : ''}`}>الفصل الثاني</th>
                                    <th rowSpan={2} className="border border-gray-300 p-2">معدل الفصل الثاني</th>
                                    <th rowSpan={2} className="border border-gray-300 p-2 text-red-600">السعي السنوي</th>
                                </tr>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 p-2">تشرين الأول</th>
                                    <th className="border border-gray-300 p-2">تشرين الثاني</th>
                                    <th className="border border-gray-300 p-2">كانون الأول</th>
                                    <th className="border border-gray-300 p-2">كانون الثاني</th>
                                    <th className="border border-gray-300 p-2">شباط</th>
                                    <th className="border border-gray-300 p-2">آذار</th>
                                    <th className="border border-gray-300 p-2">نيسان</th>
                                </tr>
                            </thead>
                             <tbody>
                                {sortedStudents.map((student, studentIndex) => {
                                    const grade = localGrades[student.id] || DEFAULT_TEACHER_GRADE;
                                    const calculated = results[student.id];
                                    const isTransferred = student.enrollmentStatus === 'transferred';
                                    const isDismissed = student.enrollmentStatus === 'dismissed';
                                    const rowStyle = isTransferred ? { backgroundColor: '#d8b4fe' } : isDismissed ? { backgroundColor: '#fca5a5' } : {};
                                    return (
                                        <tr key={student.id} className="h-10 hover:bg-cyan-50" style={rowStyle}>
                                            <td className="border border-gray-300 text-center">{studentIndex + 1}</td>
                                            <td className="border border-gray-300 p-2 font-semibold">{student.name}</td>
                                            {isTransferred ? <td colSpan={11} className="border border-gray-300 text-center font-bold text-purple-900">منقول</td> : isDismissed ? <td colSpan={11} className="border border-gray-300 text-center font-bold text-red-900">مفصول</td> : (
                                                <>
                                                    {['october', 'november', 'december', 'january'].map(month => (
                                                        <td key={month} className="border border-gray-300 p-0"><GradeInput value={grade[month as keyof TeacherSubjectGrade] as number | null} onChange={val => handleGradeChange(student.id, month as keyof TeacherSubjectGrade, val)} onEnterPress={handleEnterPress} isReadOnly={isFieldDisabled(month as keyof TeacherSubjectGrade)} onAutoAdvance={handleAutoAdvance} studentId={student.id} field={month as keyof TeacherSubjectGrade} max={maxGrade} schoolGender={settings.schoolGender}/></td>
                                                    ))}
                                                    <td className="border border-gray-300 text-center font-semibold bg-gray-100">{calculated?.primaryFirstTerm ?? ''}</td>
                                                    <td className="border border-gray-300 p-0"><GradeInput value={grade.midYear} onChange={val => handleGradeChange(student.id, 'midYear', val)} onEnterPress={handleEnterPress} isReadOnly={isFieldDisabled('midYear')} onAutoAdvance={handleAutoAdvance} studentId={student.id} field='midYear' max={maxGrade} schoolGender={settings.schoolGender}/></td>
                                                    {['february', 'march', 'april'].map(month => (
                                                        <td key={month} className="border border-gray-300 p-0"><GradeInput value={grade[month as keyof TeacherSubjectGrade] as number | null} onChange={val => handleGradeChange(student.id, month as keyof TeacherSubjectGrade, val)} onEnterPress={handleEnterPress} isReadOnly={isFieldDisabled(month as keyof TeacherSubjectGrade)} onAutoAdvance={handleAutoAdvance} studentId={student.id} field={month as keyof TeacherSubjectGrade} max={maxGrade} schoolGender={settings.schoolGender}/></td>
                                                    ))}
                                                    <td className="border border-gray-300 text-center font-semibold bg-gray-100">{calculated?.primarySecondTerm ?? ''}</td>
                                                    <td className="border border-gray-300 text-center font-bold bg-yellow-50 text-red-600">{calculated?.annualPursuit ?? ''}</td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                         </table>
                    ) : (
                        <table className="min-w-full border-collapse border border-gray-400 text-sm">
                            <thead className="bg-gray-200 text-gray-700 font-bold sticky top-0 z-10">
                                <tr>
                                    <th rowSpan={2} className="border border-gray-300 p-2 w-12">ت</th>
                                    <th rowSpan={2} className="border border-gray-300 p-2 min-w-[180px]">اسم {studentLabel}</th>
                                    <th colSpan={2} className={`border-b border-gray-300 p-2 ${isS1Locked ? 'bg-gray-300' : ''}`}>الفصل اول</th>
                                    <th rowSpan={2} className="border border-gray-300 p-2">معدل الفصل اول</th>
                                    <th rowSpan={2} className={`border border-gray-300 p-2 ${isS1Locked ? 'bg-gray-300' : ''}`}>نصف السنة</th>
                                    <th colSpan={2} className={`border-b border-gray-300 p-2 ${isS2Locked ? 'bg-gray-300' : ''}`}>الفصل الثاني</th>
                                    <th rowSpan={2} className="border border-gray-300 p-2">معدل الفصل الثاني</th>
                                    <th rowSpan={2} className="border border-gray-300 p-2 text-red-600">السعي السنوي</th>
                                </tr>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 p-2">الشهر الاول</th>
                                    <th className="border border-gray-300 p-2">الشهر الثاني</th>
                                    <th className="border border-gray-300 p-2">الشهر الاول</th>
                                    <th className="border border-gray-300 p-2">الشهر الثاني</th>
                                </tr>
                            </thead>
                             <tbody>
                                {sortedStudents.map((student, studentIndex) => {
                                    const grade = localGrades[student.id] || DEFAULT_TEACHER_GRADE;
                                    const calculated = results[student.id];
                                    const isTransferred = student.enrollmentStatus === 'transferred';
                                    const isDismissed = student.enrollmentStatus === 'dismissed';
                                    const rowStyle = isTransferred ? { backgroundColor: '#d8b4fe' } : isDismissed ? { backgroundColor: '#fca5a5' } : {};
                                    return (
                                        <tr key={student.id} className="h-10 hover:bg-cyan-50" style={rowStyle}>
                                            <td className="border border-gray-300 text-center">{studentIndex + 1}</td>
                                            <td className="border border-gray-300 p-2 font-semibold">{student.name}</td>
                                            {isTransferred ? <td colSpan={8} className="border border-gray-300 text-center font-bold text-purple-900">منقول</td> : isDismissed ? <td colSpan={8} className="border border-gray-300 text-center font-bold text-red-900">مفصول</td> : (
                                                <>
                                                    <td className="border border-gray-300 p-0"><GradeInput value={grade.firstSemMonth1} onChange={val => handleGradeChange(student.id, 'firstSemMonth1', val)} onEnterPress={handleEnterPress} isReadOnly={isFieldDisabled('firstSemMonth1')} onAutoAdvance={handleAutoAdvance} studentId={student.id} field='firstSemMonth1' max={maxGrade} schoolGender={settings.schoolGender}/></td>
                                                    <td className="border border-gray-300 p-0"><GradeInput value={grade.firstSemMonth2} onChange={val => handleGradeChange(student.id, 'firstSemMonth2', val)} onEnterPress={handleEnterPress} isReadOnly={isFieldDisabled('firstSemMonth2')} onAutoAdvance={handleAutoAdvance} studentId={student.id} field='firstSemMonth2' max={maxGrade} schoolGender={settings.schoolGender}/></td>
                                                    <td className="border border-gray-300 text-center font-semibold bg-gray-100">{calculated?.firstSemAvg ?? ''}</td>
                                                    <td className="border border-gray-300 p-0"><GradeInput value={grade.midYear} onChange={val => handleGradeChange(student.id, 'midYear', val)} onEnterPress={handleEnterPress} isReadOnly={isFieldDisabled('midYear')} onAutoAdvance={handleAutoAdvance} studentId={student.id} field='midYear' max={maxGrade} schoolGender={settings.schoolGender}/></td>
                                                    <td className="border border-gray-300 p-0"><GradeInput value={grade.secondSemMonth1} onChange={val => handleGradeChange(student.id, 'secondSemMonth1', val)} onEnterPress={handleEnterPress} isReadOnly={isFieldDisabled('secondSemMonth1')} onAutoAdvance={handleAutoAdvance} studentId={student.id} field='secondSemMonth1' max={maxGrade} schoolGender={settings.schoolGender}/></td>
                                                    <td className="border border-gray-300 p-0"><GradeInput value={grade.secondSemMonth2} onChange={val => handleGradeChange(student.id, 'secondSemMonth2', val)} onEnterPress={handleEnterPress} isReadOnly={isFieldDisabled('secondSemMonth2')} onAutoAdvance={handleAutoAdvance} studentId={student.id} field='secondSemMonth2' max={maxGrade} schoolGender={settings.schoolGender}/></td>
                                                    <td className="border border-gray-300 text-center font-semibold bg-gray-100">{calculated?.secondSemAvg ?? ''}</td>
                                                    <td className="border border-gray-300 text-center font-bold bg-yellow-50 text-red-600">{calculated?.annualPursuit ?? ''}</td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </form>
            </div>
        </div>
    );
}
