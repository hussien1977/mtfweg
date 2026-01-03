import { BellOff, BellRing, Download, FileDown, Loader2, Send, Trash2, PieChart, ImagePlus } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import * as ReactDOM from 'react-dom/client';
import { GRADE_LEVELS } from '../../constants.ts';
import { db } from '../../lib/firebase.ts';
import { calculateStudentResult } from '../../lib/gradeCalculator.ts';
import type { ClassData, PublishedMonthlyResult, SchoolSettings, Student, TeacherSubjectGrade, User, Subject } from '../../types.ts';
import MonthlyResultCardPDF from './MonthlyResultCardPDF.tsx';
import MonthlyStatsReportPDF from './MonthlyStatsReportPDF.tsx';
import SuccessStatsPDFPage from './SuccessStatsPDFPage.tsx';

declare const jspdf: any;
declare const html2canvas: any;

interface MonthlyResultsExporterProps {
    classes: ClassData[];
    settings: SchoolSettings;
    users: User[];
}

const RESULT_OPTIONS = [
    { label: 'الشهر الأول للفصل الأول', key: 'firstSemMonth1', type: 'direct' },
    { label: 'الشهر الثاني للفصل الأول', key: 'firstSemMonth2', type: 'direct' },
    { label: 'معدل الفصل الأول', key: 'firstSemAvg', type: 'calc' },
    { label: 'درجة نصف السنة', key: 'midYear', type: 'direct' },
    { label: 'الشهر الأول للفصل الثاني', key: 'secondSemMonth1', type: 'direct' },
    { label: 'الشهر الثاني للفصل الثاني', key: 'secondSemMonth2', type: 'direct' },
    { label: 'معدل الفصل الثاني', key: 'secondSemAvg', type: 'calc' },
    { label: 'السعي السنوي', key: 'annualPursuit', type: 'calc' },
    { label: 'الدرجة النهائية', key: 'finalGrade', type: 'calc' },
];

export default function MonthlyResultsExporter({ classes, settings, users }: MonthlyResultsExporterProps) {
    const [selectedStage, setSelectedStage] = useState<string>('');
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [selectedResult, setSelectedResult] = useState(RESULT_OPTIONS[0]);
    const [schoolStamp, setSchoolStamp] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    const [statsLogos, setStatsLogos] = useState<{ ministry: string | null; school: string | null }>({ ministry: null, school: null });

    const classesInSelectedStage = useMemo(() => {
        return selectedStage ? classes.filter(c => c.stage === selectedStage) : [];
    }, [selectedStage, classes]);

    const handleStampChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setSchoolStamp(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleStatsLogoChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'ministry' | 'school') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setStatsLogos(prev => ({ ...prev, [type]: event.target?.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    // Helper to get the actual grade based on selection
    const getEffectiveGrade = (student: Student, subject: Subject, resultKey: string, classData: ClassData): number | null => {
        const tg = student.teacherGrades?.[subject.name];
        
        if (resultKey === 'firstSemAvg') {
            if (tg?.firstSemMonth1 != null && tg?.firstSemMonth2 != null) {
                return Math.round((Number(tg.firstSemMonth1) + Number(tg.firstSemMonth2)) / 2);
            }
            return null;
        }
        if (resultKey === 'secondSemAvg') {
            if (tg?.secondSemMonth1 != null && tg?.secondSemMonth2 != null) {
                return Math.round((Number(tg.secondSemMonth1) + Number(tg.secondSemMonth2)) / 2);
            }
            return null;
        }
        if (['annualPursuit', 'finalGrade'].includes(resultKey)) {
            const res = calculateStudentResult(student, classData.subjects, settings, classData);
            const calc = res.finalCalculatedGrades[subject.name];
            return resultKey === 'annualPursuit' ? calc?.annualPursuit : calc?.finalGradeWithDecision;
        }

        // Direct keys (month1, midYear, etc)
        const grade = tg?.[resultKey as keyof TeacherSubjectGrade];
        return (grade !== undefined && grade !== null) ? Number(grade) : null;
    };
    
    const getStudentsToExport = (): { student: Student, classData: ClassData }[] => {
        return classes
            .filter(c => selectedClassIds.includes(c.id))
            .flatMap(c => (c.students || []).map(s => ({ student: s, classData: c })));
    };

    const handleToggleNotice = async () => {
        const principalId = classes.find(c => c.principalId)?.principalId;
        if (!principalId) return;
        try {
            await db.ref(`settings/${principalId}/monthlyResultsNotice`).set(!settings.monthlyResultsNotice);
        } catch (error) {
            console.error(error);
        }
    };

    const handleWithdrawResults = async () => {
        const studentsToWithdraw = getStudentsToExport();
        if (studentsToWithdraw.length === 0) {
            alert('يرجى اختيار شعبة واحدة على الأقل لسحب نتائجها.');
            return;
        }

        if (!window.confirm(`هل أنت متأكد من سحب (مسح) نتائج "${selectedResult.label}" لـ ${studentsToWithdraw.length} طالب؟ لن يتمكن الطلاب من رؤيتها بعد الآن.`)) {
            return;
        }

        setIsWithdrawing(true);
        const updates: Record<string, any> = {};
        const principalId = classes.find(c => selectedClassIds.includes(c.id))?.principalId;
        if (!principalId) {
            alert('خطأ: لم يتم العثور على معرّف المدير.');
            setIsWithdrawing(false);
            return;
        }

        for (const { student } of studentsToWithdraw) {
            updates[`/published_monthly_results/${principalId}/${student.id}/${selectedResult.key}`] = null;
        }

        try {
            await db.ref().update(updates);
            alert('تم سحب النتائج بنجاح!');
        } catch (error) {
            console.error("Error withdrawing results:", error);
            alert('حدث خطأ أثناء سحب النتائج.');
        } finally {
            setIsWithdrawing(false);
        }
    };

    const handlePublishResults = async () => {
        const studentsToPublish = getStudentsToExport();
        if (studentsToPublish.length === 0) {
            alert('يرجى اختيار شعبة واحدة على الأقل لنشر نتائجها.');
            return;
        }
        if (!window.confirm(`هل أنت متأكد من نشر نتائج "${selectedResult.label}" لـ ${studentsToPublish.length} طالب؟ سيتمكن الطلاب من رؤية هذه النتائج فوراً.`)) {
            return;
        }

        setIsPublishing(true);
        const updates: Record<string, any> = {};
        
        const principalId = classes.find(c => selectedClassIds.includes(c.id))?.principalId;
        if (!principalId) {
            alert('خطأ: لم يتم العثور على معرّف المدير.');
            setIsPublishing(false);
            return;
        }

        const publishedAt = new Date().toISOString();
        
        for (const { student, classData } of studentsToPublish) {
            const studentGrades: { subjectName: string; grade: number | null }[] = [];
            
            for (const subject of classData.subjects) {
                const grade = getEffectiveGrade(student, subject, selectedResult.key, classData);
                studentGrades.push({
                    subjectName: subject.name,
                    grade: grade,
                });
            }

            const resultToPublish: PublishedMonthlyResult = {
                monthKey: selectedResult.key,
                monthLabel: selectedResult.label,
                publishedAt: publishedAt,
                grades: studentGrades,
            };
            
            updates[`/published_monthly_results/${principalId}/${student.id}/${selectedResult.key}`] = resultToPublish;
        }

        try {
            await db.ref().update(updates);
            alert('تم نشر النتائج بنجاح!');
        } catch (error) {
            console.error("Error publishing results:", error);
            alert('حدث خطأ أثناء نشر النتائج.');
        } finally {
            setIsPublishing(false);
        }
    };

    const handleExportPdf = async () => {
        const studentsToExport = getStudentsToExport();
        if (studentsToExport.length === 0) {
            alert('يرجى اختيار طالب واحد على الأقل للتصدير.');
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
            width: '794px',
            height: '1123px',
        });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        const renderComponent = (component: React.ReactElement): Promise<void> => {
            return new Promise((resolve) => {
                root.render(component);
                setTimeout(resolve, 500);
            });
        };

        try {
            await document.fonts.ready;

            for (let i = 0; i < studentsToExport.length; i++) {
                const { student, classData } = studentsToExport[i];

                const studentGrades: Record<string, number | null> = {};
                classData.subjects.forEach(subject => {
                    studentGrades[subject.name] = getEffectiveGrade(student, subject, selectedResult.key, classData);
                });

                await renderComponent(
                    <MonthlyResultCardPDF
                        student={student}
                        classData={classData}
                        settings={settings}
                        selectedMonthKey={selectedResult.key}
                        selectedMonthLabel={selectedResult.label}
                        schoolStamp={schoolStamp}
                        customGrades={studentGrades}
                    />
                );

                const reportElement = tempContainer.children[0] as HTMLElement;
                const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/png');

                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
                setExportProgress(Math.round(((i + 1) / studentsToExport.length) * 100));
            }
            pdf.save(`بطاقات-نتائج-${selectedResult.label}-${selectedStage}.pdf`);

        } catch (error) {
            console.error("PDF Export Error:", error);
            const message = error instanceof Error ? error.message : String(error);
            alert(`حدث خطأ أثناء تصدير ملف PDF: ${message}`);
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
            setExportProgress(0);
        }
    };

    const handleExportStatsPdf = async () => {
        const classesToProcess = classes.filter(c => selectedClassIds.includes(c.id));
        if (classesToProcess.length === 0) {
            alert("يرجى اختيار شعبة واحدة على الأقل.");
            return;
        }

        setIsExporting(true);
        setExportProgress(0);

        const { jsPDF } = jspdf;
        const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });

        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        const renderComponent = (component: React.ReactElement) => new Promise<void>(resolve => {
            root.render(component);
            setTimeout(resolve, 500);
        });

        let totalPagesToGenerate = 0;
        const allPageData: any[] = [];

        for (const classData of classesToProcess) {
            const students = [...(classData.students || [])].sort((a,b) => a.name.localeCompare(b.name, 'ar'));
            const subjects = (classData.subjects || [])
                .filter(s => !['التربية الرياضية', 'التربية الفنية'].includes(s.name))
                .slice(0, 10); 
            
            const detailedStats: Record<string, {
                month1: { successful: number; examined: number; successRate: number };
                month2: { successful: number; examined: number; successRate: number };
            }> = {};

            subjects.forEach(subject => {
                let m1_successful = 0;
                let m1_examined = 0;
                let m2_successful = 0;
                let m2_examined = 0;

                students.forEach(student => {
                    const tg = student.teacherGrades?.[subject.name];
                    const gradeM1 = tg?.firstSemMonth1;
                    const gradeM2 = tg?.firstSemMonth2;

                    if (gradeM1 !== null && gradeM1 !== undefined) {
                        m1_examined++;
                        if (gradeM1 >= 50) m1_successful++;
                    }
                    if (gradeM2 !== null && gradeM2 !== undefined) {
                        m2_examined++;
                        if (gradeM2 >= 50) m2_successful++;
                    }
                });
                
                detailedStats[subject.id] = {
                    month1: {
                        successful: m1_successful,
                        examined: m1_examined,
                        successRate: m1_examined > 0 ? Math.round((m1_successful / m1_examined) * 100) : 0
                    },
                    month2: {
                        successful: m2_successful,
                        examined: m2_examined,
                        successRate: m2_examined > 0 ? Math.round((m2_successful / m2_examined) * 100) : 0
                    }
                };
            });

            const STUDENTS_PER_PAGE_STATS = 21;
            const studentChunks: Student[][] = [];
            for (let i = 0; i < students.length; i += STUDENTS_PER_PAGE_STATS) {
                studentChunks.push(students.slice(i, i + STUDENTS_PER_PAGE_STATS));
            }
            if (studentChunks.length === 0) studentChunks.push([]);

            totalPagesToGenerate += studentChunks.length;

            studentChunks.forEach((chunk, index) => {
                allPageData.push({
                    classData,
                    students: chunk,
                    subjects,
                    detailedStats: (index === studentChunks.length - 1) ? detailedStats : null,
                    pageInfo: { pageNumber: index + 1, totalPages: studentChunks.length },
                });
            });
        }

        try {
            await document.fonts.ready;
            for (let i = 0; i < allPageData.length; i++) {
                const pageData = allPageData[i];
                await renderComponent(
                    <MonthlyStatsReportPDF
                        settings={settings}
                        classData={pageData.classData}
                        students={pageData.students}
                        subjects={pageData.subjects}
                        detailedStats={pageData.detailedStats}
                        pageInfo={pageData.pageInfo}
                    />
                );

                const reportElement = tempContainer.children[0] as HTMLElement;
                const canvas = await html2canvas(reportElement, { scale: 1.5, useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
                setExportProgress(Math.round(((i + 1) / totalPagesToGenerate) * 100));
            }
            pdf.save(`كشوفات-احصائية-شهرية.pdf`);
        } catch (error) {
            console.error("PDF Export error:", error);
            alert(`حدث خطأ أثناء التصدير`);
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
        }
    };

    const handleExportSuccessStatsPdf = async () => {
        const classesToProcess = classes.filter(c => selectedClassIds.includes(c.id));
        if (classesToProcess.length === 0) {
            alert("يرجى اختيار شعبة واحدة على الأقل.");
            return;
        }

        setIsExporting(true);
        setExportProgress(0);

        const { jsPDF } = jspdf;
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        const renderComponent = (component: React.ReactElement) => new Promise<void>(resolve => {
            root.render(component);
            setTimeout(resolve, 600);
        });

        try {
            await document.fonts.ready;
            
            const rows: any[] = [];
            
            for (const classData of classesToProcess) {
                const activeStudents = (classData.students || []).filter(s => !s.enrollmentStatus || s.enrollmentStatus === 'active');
                if (activeStudents.length === 0) continue;

                for (const subject of classData.subjects) {
                    if (['التربية الرياضية', 'التربية الفنية'].includes(subject.name)) continue;

                    const teacher = users.find(u => 
                        u.role === 'teacher' && 
                        u.assignments?.some(a => a.classId === classData.id && a.subjectId === subject.id)
                    );

                    let passed = 0;
                    let examined = 0;
                    activeStudents.forEach(student => {
                        const grade = getEffectiveGrade(student, subject, selectedResult.key, classData);
                        if (grade !== null) {
                            examined++;
                            if (grade >= 50) passed++;
                        }
                    });

                    const totalCount = activeStudents.length;
                    const failed = totalCount - passed;
                    const successRate = totalCount > 0 ? Math.round((passed / totalCount) * 100) : 0;

                    rows.push({
                        subject: subject.name,
                        section: classData.section,
                        teacher: teacher?.name || '............',
                        total: totalCount,
                        passed,
                        failed,
                        rate: successRate
                    });
                }
            }

            const ROWS_PER_PAGE = 18;
            const chunks = [];
            for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) {
                chunks.push(rows.slice(i, i + ROWS_PER_PAGE));
            }
            if (chunks.length === 0) chunks.push([]);

            for (let i = 0; i < chunks.length; i++) {
                await renderComponent(
                    <SuccessStatsPDFPage
                        settings={settings}
                        monthLabel={selectedResult.label}
                        data={chunks[i]}
                        pageNumber={i + 1}
                        totalPages={chunks.length}
                        stageName={selectedStage}
                        ministryLogo={statsLogos.ministry}
                        schoolLogo={statsLogos.school}
                    />
                );

                const element = tempContainer.children[0] as HTMLElement;
                const canvas = await html2canvas(element, { scale: 2, useCORS: true });
                if (i > 0) pdf.addPage();
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
                setExportProgress(Math.round(((i + 1) / chunks.length) * 100));
            }

            pdf.save(`احصائيات_النجاح-${selectedResult.label}.pdf`);
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء تصدير إحصائيات النجاح.");
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
            setExportProgress(0);
        }
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">تصدير نتائج الامتحانات الشهرية</h2>
            
            <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-800 p-4 mb-6 rounded-md" role="alert">
                <p className="font-bold">تنبيه مهم:</p>
                <p>نتائج الامتحانات الشهرية تعتمد على السجلات المرسلة من قبل المدرسين والمستلمة من قبل الادارة.</p>
            </div>
            
            {isExporting && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center z-50 text-white">
                    <Loader2 className="animate-spin h-16 w-16 mb-4" />
                    <p className="text-2xl font-bold mb-2">جاري التصدير...</p>
                    <div className="w-1/2 bg-gray-600 rounded-full h-4">
                        <div className="bg-cyan-500 h-4 rounded-full" style={{ width: `${exportProgress}%` }}></div>
                    </div>
                    <p className="mt-2 text-lg">{exportProgress}%</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div>
                        <label className="block text-md font-bold text-gray-700 mb-2">1. اختر المرحلة الدراسية</label>
                        <select onChange={e => { setSelectedStage(e.target.value); setSelectedClassIds([]); }} value={selectedStage} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500">
                            <option value="">-- اختر مرحلة --</option>
                            {GRADE_LEVELS.filter(l => !l.includes('ابتدائي')).map(level => <option key={level} value={level}>{level}</option>)}
                        </select>
                    </div>

                    {selectedStage && (
                        <div>
                            <label className="block text-md font-bold text-gray-700 mb-2">2. اختر الشعبة (أو الشعب)</label>
                            <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
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
                    
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-blue-900">تنبيه تحديث الدرجات</p>
                                <p className="text-xs text-blue-700">تنبيه للطلاب بوجود تحديث حالي للنتائج</p>
                            </div>
                            <button 
                                onClick={handleToggleNotice}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all ${
                                    settings.monthlyResultsNotice 
                                    ? 'bg-blue-600 text-white shadow-md' 
                                    : 'bg-white border text-gray-400'
                                }`}
                            >
                                {settings.monthlyResultsNotice ? <BellRing size={18}/> : <BellOff size={18}/>}
                                {settings.monthlyResultsNotice ? 'مفعل' : 'معطل'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-md font-bold text-gray-700 mb-2">3. اختر نوع النتيجة (بطاقات النتائج / الإحصائيات)</label>
                        <select onChange={e => setSelectedResult(RESULT_OPTIONS.find(m => m.key === e.target.value) || RESULT_OPTIONS[0])} value={selectedResult.key} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500">
                            {RESULT_OPTIONS.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-md font-bold text-gray-700 mb-2">4. تحميل ختم المدرسة (لبطاقات النتائج)</label>
                        <div className="flex items-center gap-4">
                             <button
                                type="button"
                                onClick={() => document.getElementById('stamp-upload')?.click()}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm hover:bg-gray-300"
                            >
                                اختيار ملف
                            </button>
                            <span className={`text-sm ${schoolStamp ? 'text-green-600' : 'text-gray-500'}`}>
                                {schoolStamp ? 'تم اختيار ختم' : 'لم يتم اختيار أي ملف'}
                            </span>
                            <input id="stamp-upload" type="file" onChange={handleStampChange} accept="image/*" className="hidden" />
                        </div>
                    </div>

                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                        <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                            <ImagePlus size={18}/> شعارات إحصائيات النجاح
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-600 block mb-1">شعار الوزارة</label>
                                <button onClick={() => document.getElementById('stats-min-logo')?.click()} className="w-full py-2 bg-white border border-indigo-300 rounded text-xs hover:bg-indigo-100 transition truncate px-1">
                                    {statsLogos.ministry ? 'تغيير الشعار' : 'تحميل الشعار'}
                                </button>
                                <input id="stats-min-logo" type="file" onChange={e => handleStatsLogoChange(e, 'ministry')} accept="image/*" className="hidden" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 block mb-1">شعار المدرسة</label>
                                <button onClick={() => document.getElementById('stats-sch-logo')?.click()} className="w-full py-2 bg-white border border-indigo-300 rounded text-xs hover:bg-indigo-100 transition truncate px-1">
                                    {statsLogos.school ? 'تغيير الشعار' : 'تحميل الشعار'}
                                </button>
                                <input id="stats-sch-logo" type="file" onChange={e => handleStatsLogoChange(e, 'school')} accept="image/*" className="hidden" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t pt-6 mt-8">
                <div className="flex flex-col sm:flex-row justify-center flex-wrap gap-4">
                    <button onClick={handleExportPdf} disabled={selectedClassIds.length === 0 || isExporting} className="flex-1 flex items-center justify-center gap-2 px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed">
                        <FileDown size={20} />
                        <span>تصدير بطاقات النتائج (PDF)</span>
                    </button>
                    <button onClick={handleExportStatsPdf} disabled={selectedClassIds.length === 0 || isExporting || selectedResult.type === 'calc'} className="flex-1 flex items-center justify-center gap-2 px-8 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed">
                        <Download size={20} />
                        <span>كشف الاحصائيات الشهرية (PDF)</span>
                    </button>
                    <button onClick={handleExportSuccessStatsPdf} disabled={selectedClassIds.length === 0 || isExporting} className="flex-1 flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed">
                        <PieChart size={20} />
                        <span>احصائيات النجاح (PDF)</span>
                    </button>
                    <button onClick={handlePublishResults} disabled={selectedClassIds.length === 0 || isPublishing} className="flex-1 flex items-center justify-center gap-2 px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {isPublishing ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                        <span>{isPublishing ? 'جاري النشر...' : 'نشر نتائج الطلبة'}</span>
                    </button>
                    <button 
                        onClick={handleWithdrawResults} 
                        disabled={selectedClassIds.length === 0 || isWithdrawing} 
                        className="flex-1 flex items-center justify-center gap-2 px-8 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isWithdrawing ? <Loader2 className="animate-spin" /> : <Trash2 size={20} />}
                        <span>سحب النتائج المنشورة</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
