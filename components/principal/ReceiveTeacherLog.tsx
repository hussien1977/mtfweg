
import React, { useState, useMemo, useEffect } from 'react';
import type { User, ClassData, TeacherSubmission, TeacherSubjectGrade, SchoolSettings, Student, Teacher, SubjectGrade } from '../../types.ts';
import TeacherGradeSheet from '../teacher/TeacherGradeSheet.tsx';
import { db } from '../../lib/firebase.ts';
import { Eye, ArrowLeft, Lock, Unlock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ReceiveTeacherLogProps {
    principal: User;
    classes: ClassData[];
    settings: SchoolSettings;
    users: User[];
}

const DEFAULT_TEACHER_GRADE: TeacherSubjectGrade = {
    firstSemMonth1: null,
    firstSemMonth2: null,
    midYear: null,
    secondSemMonth1: null,
    secondSemMonth2: null,
    finalExam: null,
    october: null,
    november: null,
    december: null,
    january: null,
    february: null,
    march: null,
    april: null,
};

export default function ReceiveTeacherLog({ principal, classes, settings, users }: ReceiveTeacherLogProps) {
    const [submissions, setSubmissions] = useState<TeacherSubmission[]>([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
    const [selectedSubmission, setSelectedSubmission] = useState<TeacherSubmission | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const submissionsRef = db.ref('teacher_submissions');
        const callback = (snapshot: any) => {
            const data = snapshot.val();
            const allSubmissions: TeacherSubmission[] = data ? Object.values(data) : [];
            const principalTeacherIds = new Set(users.filter(u => u.principalId === principal.id).map(u => u.id));
            const relevantSubmissions = allSubmissions.filter(sub => principalTeacherIds.has(sub.teacherId));
            setSubmissions(relevantSubmissions);
        };
        submissionsRef.on('value', callback);
        return () => submissionsRef.off('value', callback);
    }, [principal.id, users]);

    const teachers = useMemo(() => users.filter(u => u.role === 'teacher' && u.principalId === principal.id), [users, principal.id]);
    
    const latestSubmissions = useMemo(() => {
        const latest = new Map<string, TeacherSubmission>();
        (submissions || []).forEach(sub => {
            const key = `${sub.teacherId}-${sub.classId}-${sub.subjectId}`;
            const existing = latest.get(key);
            if (!existing || new Date(sub.submittedAt) > new Date(existing.submittedAt)) {
                latest.set(key, sub);
            }
        });
        // FIX: Replaced non-existent 'timestamp' property with 'submittedAt' to fix TypeScript error and correctly sort submissions by date.
        return Array.from(latest.values()).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    }, [submissions]);

    const filteredSubmissions = useMemo(() => {
        if (!selectedTeacherId) {
            return latestSubmissions;
        }
        return latestSubmissions.filter(sub => sub.teacherId === selectedTeacherId);
    }, [selectedTeacherId, latestSubmissions]);

    const handleToggleLock = async (lockField: keyof SchoolSettings) => {
        try {
            const currentVal = !!settings[lockField];
            await db.ref(`settings/${principal.id}/${lockField}`).set(!currentVal);
        } catch (error) {
            console.error("Lock update failed:", error);
        }
    };

    const handleApproveGrades = async (semester: 1 | 2) => {
        const semesterLabel = semester === 1 ? 'الفصل الأول' : 'الفصل الثاني';
        if (!confirm(`هل أنت متأكد من اعتماد درجات ${semesterLabel}؟ سيتم تحديث سجلات الطلاب في الشعب بناءً على آخر السجلات المستلمة من المدرسين.`)) {
            return;
        }

        setIsProcessing(true);
        const updates: Record<string, any> = {};
        let updateCount = 0;

        try {
            for (const submission of latestSubmissions) {
                const classData = classes.find(c => c.id === submission.classId);
                if (!classData || !classData.students) continue;

                const subjectObj = (classData.subjects || []).find(s => s.id === submission.subjectId);
                if (!subjectObj) continue;

                if (submission.grades) {
                    // FIX: Wrap 'key' in String() to avoid implicit symbol-to-string conversion error in template literal.
                    Object.entries(submission.grades).forEach(([studentId, teacherGrade]: [string, any]) => {
                        const studentIndex = classData.students.findIndex(s => s.id === studentId);
                        if (studentIndex === -1) return;

                        const gradePath = `classes/${classData.id}/students/${studentIndex}/grades/${subjectObj.name}`;

                        // Helper to safely get numeric value or null
                        const getVal = (v: any) => (v === null || v === undefined) ? null : Number(v);

                        if (semester === 1) {
                            // Semester 1: Average of M1 and M2
                            const m1 = getVal(teacherGrade.firstSemMonth1);
                            const m2 = getVal(teacherGrade.firstSemMonth2);
                            const midYear = getVal(teacherGrade.midYear);

                            // Only update if both months exist and are valid positive numbers (ignore -1, -2 for average)
                            if (m1 !== null && m1 >= 0 && m2 !== null && m2 >= 0) {
                                updates[`${gradePath}/firstTerm`] = Math.round((m1 + m2) / 2);
                            }
                            // Direct update for midYear if not null
                            if (midYear !== null) {
                                updates[`${gradePath}/midYear`] = midYear;
                            }
                        } else {
                            // Semester 2: Average of M1 and M2
                            const m1 = getVal(teacherGrade.secondSemMonth1);
                            const m2 = getVal(teacherGrade.secondSemMonth2);
                            const finalExam = getVal(teacherGrade.finalExam);

                            if (m1 !== null && m1 >= 0 && m2 !== null && m2 >= 0) {
                                updates[`${gradePath}/secondTerm`] = Math.round((m1 + m2) / 2);
                            }
                            if (finalExam !== null) {
                                updates[`${gradePath}/finalExam1st`] = finalExam;
                            }
                        }
                        updateCount++;
                    });
                }
            }

            if (Object.keys(updates).length > 0) {
                await db.ref().update(updates);
                alert(`تم اعتماد درجات ${semesterLabel} بنجاح. تم تحديث ${updateCount} حقل درجة.`);
            } else {
                alert("لم يتم العثور على درجات مكتملة لاعتمادها in السجلات المستلمة.");
            }
        } catch (error) {
            console.error("Approval process failed:", error);
            alert("حدث خطأ تقني أثناء عملية الاعتماد. يرجى التأكد من أن جميع الشعب والطلاب لا يزالون موجودين في النظام.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleViewSubmission = (submission: TeacherSubmission) => {
        setSelectedSubmission(submission);
    };
    
    const getTeacherName = (teacherId: string) => users.find(u => u.id === teacherId)?.name || 'مدرس غير معروف';
    const getClassName = (classId: string) => {
        const cls = classes.find(c => c.id === classId);
        return cls ? `${cls.stage} - ${cls.section}` : 'شعبة محذوفة';
    }
    const getSubjectName = (classId: string, subjectId: string) => {
        const cls = classes.find(c => c.id === classId);
        const sub = (cls?.subjects || []).find(s => s.id === subjectId);
        return sub ? sub.name : 'مادة محذوفة';
    }

    if (selectedSubmission) {
        const classData = classes.find(c => c.id === selectedSubmission.classId);
        const teacher = users.find(u => u.id === selectedSubmission.teacherId);

        if (!classData || !teacher) {
            return (
                <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                    <p className="text-red-500">خطأ: لم يتم العثور على بيانات الصف أو المدرس لهذا السجل.</p>
                    <button onClick={() => setSelectedSubmission(null)} className="mt-4 px-4 py-2 bg-gray-300 rounded-lg flex items-center gap-2 mx-auto">
                        <ArrowLeft />
                        العودة
                    </button>
                </div>
            );
        }
        
        const subjectName = getSubjectName(classData.id, selectedSubmission.subjectId);
        const classDataWithGrades: ClassData = {
            ...classData,
            students: (classData.students || []).map((s: Student) => {
                const submittedGrades = (selectedSubmission.grades || {})[s.id] || {};
                return {
                    ...s,
                    teacherGrades: {
                        ...s.teacherGrades,
                        [subjectName]: { ...DEFAULT_TEACHER_GRADE, ...submittedGrades },
                    }
                };
            })
        };
        
        return (
            <div>
                 <button onClick={() => setSelectedSubmission(null)} className="mb-4 px-4 py-2 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 flex items-center gap-2">
                    <ArrowLeft />
                    العودة إلى قائمة السجلات
                </button>
                <TeacherGradeSheet 
                    classData={classDataWithGrades} 
                    teacher={teacher as Teacher} 
                    settings={settings} 
                    isReadOnly={true}
                    subjectId={selectedSubmission.subjectId}
                />
            </div>
        )
    }

    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-0">استلام سجلات المدرسين</h2>
                <div className="flex items-center gap-2 w-full md:w-auto">
                     <label htmlFor="teacher-filter" className="font-semibold text-gray-700 whitespace-nowrap">فلترة بالمدرس:</label>
                    <select 
                        id="teacher-filter"
                        onChange={e => setSelectedTeacherId(e.target.value)} 
                        value={selectedTeacherId}
                        className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    >
                        <option value="">-- كل المدرسين --</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
            </header>

            {/* --- Submission Control Panel --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Control Toggles */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Lock size={18} className="text-red-500" /> التحكم في إرسال السجلات
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
                            <div>
                                <p className="font-bold text-gray-800">إرسال درجات الفصل الأول</p>
                                <p className="text-xs text-gray-500">يتضمن درجات الشهر الأول والثاني ونصف السنة</p>
                            </div>
                            <button 
                                onClick={() => handleToggleLock('lockS1Submissions')}
                                className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-colors ${settings.lockS1Submissions ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}
                            >
                                {settings.lockS1Submissions ? <Lock size={14}/> : <Unlock size={14}/>}
                                {settings.lockS1Submissions ? 'مغلق' : 'مفتوح'}
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
                            <div>
                                <p className="font-bold text-gray-800">إرسال درجات الفصل الثاني</p>
                                <p className="text-xs text-gray-500">يتضمن درجات الشهر الأول والثاني ونهاية السنة</p>
                            </div>
                            <button 
                                onClick={() => handleToggleLock('lockS2Submissions')}
                                className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-colors ${settings.lockS2Submissions ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}
                            >
                                {settings.lockS2Submissions ? <Lock size={14}/> : <Unlock size={14}/>}
                                {settings.lockS2Submissions ? 'مغلق' : 'مفتوح'}
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
                            <div>
                                <p className="font-bold text-gray-800">إيقاف الإرسال تماماً</p>
                                <p className="text-xs text-gray-500">يمنع إرسال أي سجلات من جميع المدرسين</p>
                            </div>
                            <button 
                                onClick={() => handleToggleLock('lockAllSubmissions')}
                                className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-colors ${settings.lockAllSubmissions ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                            >
                                {settings.lockAllSubmissions ? <Lock size={14}/> : <Unlock size={14}/>}
                                {settings.lockAllSubmissions ? 'مغلق تام' : 'تفعيل تام'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Grade Approval Actions */}
                <div className="bg-cyan-50 p-6 rounded-xl border border-cyan-200">
                    <h3 className="text-lg font-bold text-cyan-800 mb-4 flex items-center gap-2">
                        <CheckCircle size={18} /> اعتماد الدرجات النهائية
                    </h3>
                    <p className="text-sm text-cyan-700 mb-6">
                        استخدم هذه الأزرار لنقل الدرجات من السجلات المستلمة إلى السجلات الرئيسية (الرئيسية/الشعب) دفعة واحدة لجميع الشعب والمواد.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button 
                            onClick={() => handleApproveGrades(1)}
                            disabled={isProcessing}
                            className="flex flex-col items-center justify-center gap-2 p-4 bg-white border-2 border-cyan-500 rounded-xl hover:bg-cyan-500 hover:text-white transition-all group disabled:opacity-50"
                        >
                            <span className="font-bold text-lg">اعتماد الفصل الأول</span>
                            <span className="text-xs opacity-70">نقل درجات ف1 + نصف السنة</span>
                        </button>
                        <button 
                            onClick={() => handleApproveGrades(2)}
                            disabled={isProcessing}
                            className="flex flex-col items-center justify-center gap-2 p-4 bg-white border-2 border-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all group disabled:opacity-50"
                        >
                            <span className="font-bold text-lg">اعتماد الفصل الثاني</span>
                            <span className="text-xs opacity-70">نقل درجات ف2 + نهاية السنة</span>
                        </button>
                    </div>
                    {isProcessing && (
                         <div className="mt-4 flex items-center justify-center gap-2 text-cyan-600 font-bold">
                             <Loader2 className="animate-spin" /> جاري المعالجة...
                         </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                    <AlertCircle className="text-blue-500" /> قائمة السجلات المستلمة مؤخراً
                </h3>
                {filteredSubmissions.length > 0 ? (
                    filteredSubmissions.map(sub => (
                         <div key={sub.id} className="p-4 bg-gray-50 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-md transition-shadow">
                            <div>
                                <p className="font-bold text-lg text-gray-800">{getTeacherName(sub.teacherId)}</p>
                                <div className="text-sm text-gray-600 mt-1">
                                    <span className="font-semibold bg-gray-200 px-2 py-0.5 rounded">{getClassName(sub.classId)}</span>
                                    <span className="mx-2 text-gray-300">|</span>
                                    <span className="text-cyan-700 font-bold">{getSubjectName(sub.classId, sub.subjectId)}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                 <span className="text-xs text-gray-500 bg-white px-2 py-1 border rounded">
                                    أرسل في: {new Date(sub.submittedAt).toLocaleString('ar-EG')}
                                </span>
                                <button onClick={() => handleViewSubmission(sub)} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 shadow-sm">
                                    <Eye size={16} />
                                    عرض وتدقيق
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center p-12 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                         <p className="text-xl text-gray-500 italic">لم يتم استلام أي سجلات جديدة حالياً.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
