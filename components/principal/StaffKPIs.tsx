
import React, { useState, useEffect, useMemo } from 'react';
import type { User, ClassData, Teacher, Homework, HomeworkSubmission, TeacherSubmission } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
// FIX: Added missing Info icon to imports
import { Activity, ClipboardCheck, BookOpen, AlertCircle, CheckCircle2, Clock, Loader2, Search, ChevronDown, ChevronUp, Info } from 'lucide-react';

interface StaffKPIsProps {
    principal: User;
    users: User[];
    classes: ClassData[];
}

interface TeacherKPI {
    teacherId: string;
    name: string;
    homeworkCount: number;
    submissionCount: number;
    correctedCount: number;
    correctionRate: number;
    gradeEntryProgress: {
        s1: number; // %
        s2: number; // %
    };
    subjects: string[];
}

const ProgressBar = ({ progress, color = 'bg-cyan-600' }: { progress: number; color?: string }) => (
    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1 overflow-hidden">
        <div 
            className={`${color} h-2.5 transition-all duration-1000 ease-out`} 
            style={{ width: `${progress}%` }}
        ></div>
    </div>
);

export default function StaffKPIs({ principal, users, classes }: StaffKPIsProps) {
    const [homeworks, setHomeworks] = useState<Homework[]>([]);
    const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);

    const teachers = useMemo(() => 
        users.filter(u => u.role === 'teacher' && u.principalId === principal.id),
    [users, principal.id]);

    useEffect(() => {
        const principalId = principal.id;
        const hwRef = db.ref(`homework_data/${principalId}`);
        const subRef = db.ref(`homework_submissions/${principalId}`);

        const fetchData = async () => {
            setIsLoading(true);
            const [hwSnap, subSnap] = await Promise.all([hwRef.get(), subRef.get()]);
            
            const hwData = hwSnap.val() || {};
            setHomeworks(Object.values(hwData));

            const subData = subSnap.val() || {};
            const flatSubs: HomeworkSubmission[] = Object.values(subData).flatMap((s: any) => Object.values(s));
            setSubmissions(flatSubs);
            
            setIsLoading(false);
        };

        fetchData();
    }, [principal.id]);

    const kpiData = useMemo(() => {
        return teachers.map(teacher => {
            // 1. Homework Stats
            const teacherHws = homeworks.filter(h => h.teacherId === teacher.id);
            const teacherHwIds = new Set(teacherHws.map(h => h.id));
            const teacherSubs = submissions.filter(s => teacherHwIds.has(s.homeworkId));
            
            const corrected = teacherSubs.filter(s => s.status !== 'pending').length;
            const correctionRate = teacherSubs.length > 0 ? Math.round((corrected / teacherSubs.length) * 100) : 100;

            // 2. Grade Entry Progress
            // We check if the teacher has entered grades for their assigned subjects in the main class record
            let totalFieldsS1 = 0;
            let filledFieldsS1 = 0;
            let totalFieldsS2 = 0;
            let filledFieldsS2 = 0;

            const subjectsList: string[] = [];

            (teacher.assignments || []).forEach(assignment => {
                const cls = classes.find(c => c.id === assignment.classId);
                if (!cls) return;

                const subjectObj = cls.subjects.find(s => s.id === assignment.subjectId);
                if (!subjectObj) return;

                if (!subjectsList.includes(subjectObj.name)) subjectsList.push(subjectObj.name);

                (cls.students || []).forEach(student => {
                    const grades = student.grades?.[subjectObj.name];
                    
                    // S1: Check First Term, Midyear
                    totalFieldsS1 += 2;
                    if (grades?.firstTerm !== null && grades?.firstTerm !== undefined) filledFieldsS1++;
                    if (grades?.midYear !== null && grades?.midYear !== undefined) filledFieldsS1++;

                    // S2: Check Second Term, Final
                    totalFieldsS2 += 2;
                    if (grades?.secondTerm !== null && grades?.secondTerm !== undefined) filledFieldsS2++;
                    if (grades?.finalExam1st !== null && grades?.finalExam1st !== undefined) filledFieldsS2++;
                });
            });

            const s1Progress = totalFieldsS1 > 0 ? Math.round((filledFieldsS1 / totalFieldsS1) * 100) : 0;
            const s2Progress = totalFieldsS2 > 0 ? Math.round((filledFieldsS2 / totalFieldsS2) * 100) : 0;

            return {
                teacherId: teacher.id,
                name: teacher.name,
                homeworkCount: teacherHws.length,
                submissionCount: teacherSubs.length,
                correctedCount: corrected,
                correctionRate,
                gradeEntryProgress: { s1: s1Progress, s2: s2Progress },
                subjects: subjectsList
            } as TeacherKPI;
        });
    }, [teachers, homeworks, submissions, classes]);

    const filteredKPIs = kpiData.filter(k => k.name.includes(searchQuery));

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-lg">
                <Loader2 className="animate-spin h-10 w-10 text-cyan-600 mb-4" />
                <p className="text-gray-600 font-bold">جاري تحليل أداء الكادر...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-rose-500">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Activity className="text-rose-600 w-8 h-8" />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">لوحة مراقبة أداء الكادر</h2>
                            <p className="text-sm text-gray-500">إحصائيات حية عن التفاعل الأكاديمي والواجبات</p>
                        </div>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="بحث عن مدرس..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredKPIs.map(kpi => (
                    <div key={kpi.teacherId} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-xl transition-all">
                        {/* Teacher Header */}
                        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-800">{kpi.name}</h3>
                                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">{kpi.subjects.join('، ')}</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="bg-cyan-100 text-cyan-700 text-xs px-2 py-1 rounded-full font-bold">
                                    {kpi.homeworkCount} واجب مرسل
                                </span>
                            </div>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Correction KPI */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-end">
                                    <label className="text-sm font-bold text-gray-600 flex items-center gap-1">
                                        <ClipboardCheck size={14} className="text-green-600" /> نسبة تصحيح الواجبات
                                    </label>
                                    <span className={`text-xs font-bold ${kpi.correctionRate < 50 ? 'text-red-600' : 'text-green-600'}`}>
                                        {kpi.correctionRate}% ({kpi.correctedCount}/{kpi.submissionCount})
                                    </span>
                                </div>
                                <ProgressBar 
                                    progress={kpi.correctionRate} 
                                    color={kpi.correctionRate < 50 ? 'bg-red-500' : kpi.correctionRate < 80 ? 'bg-amber-500' : 'bg-green-500'} 
                                />
                            </div>

                            {/* Grade Entry S1 */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-end">
                                    <label className="text-sm font-bold text-gray-600 flex items-center gap-1">
                                        <BookOpen size={14} className="text-blue-600" /> إنجاز السجل (الفصل الأول)
                                    </label>
                                    <span className="text-xs font-bold text-blue-600">{kpi.gradeEntryProgress.s1}%</span>
                                </div>
                                <ProgressBar progress={kpi.gradeEntryProgress.s1} color="bg-blue-500" />
                            </div>

                            {/* Grade Entry S2 */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-end">
                                    <label className="text-sm font-bold text-gray-600 flex items-center gap-1">
                                        <BookOpen size={14} className="text-purple-600" /> إنجاز السجل (الفصل الثاني)
                                    </label>
                                    <span className="text-xs font-bold text-purple-600">{kpi.gradeEntryProgress.s2}%</span>
                                </div>
                                <ProgressBar progress={kpi.gradeEntryProgress.s2} color="bg-purple-500" />
                            </div>
                        </div>

                        {/* Smart Alerts */}
                        <div className="px-5 py-3 bg-gray-50 border-t flex gap-2">
                            {kpi.gradeEntryProgress.s1 < 100 && (
                                <div className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                                    <AlertCircle size={10} /> سجل ف1 غير مكتمل
                                </div>
                            )}
                            {kpi.correctionRate < 90 && kpi.submissionCount > 0 && (
                                <div className="flex items-center gap-1 text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">
                                    <Clock size={10} /> تأخير في التصحيح
                                </div>
                            )}
                            {kpi.gradeEntryProgress.s1 === 100 && kpi.correctionRate === 100 && (
                                <div className="flex items-center gap-1 text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold">
                                    <CheckCircle2 size={10} /> أداء مثالي
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {filteredKPIs.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-white rounded-xl">
                        <p className="text-gray-500">لا يوجد مدرسون مطابقون لهذا البحث.</p>
                    </div>
                )}
            </div>

            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3">
                <Info className="text-indigo-600 flex-shrink-0 mt-1" />
                <div className="text-sm text-indigo-900 leading-relaxed">
                    <p className="font-bold mb-1">كيف يتم حساب النسب؟</p>
                    <ul className="list-disc pr-5 space-y-1">
                        <li><strong>نسبة التصحيح:</strong> تقارن عدد إجابات الطلاب التي قام المدرس بمراجعتها فعلياً مقابل إجمالي الإجابات الواردة.</li>
                        <li><strong>إنجاز السجل:</strong> تفحص جميع خانات الدرجات (شهر 1، شهر 2، نصف السنة، إلخ) لجميع الطلاب في الشعب التي يدرسها المدرس.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
