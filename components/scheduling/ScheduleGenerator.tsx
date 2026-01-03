import React, { useState, useMemo, useEffect, useCallback } from 'react';
// Fix: Added missing type imports.
import type { User, ClassData, ScheduleData, StudyPlan, SchedulePeriod, SchoolSettings, Teacher } from '../../types';
import { Sparkles, Upload, BookOpen, ChevronDown, ChevronUp, CheckCircle2, XCircle, BrainCircuit, RefreshCw, Loader2, Users, Trash2 } from 'lucide-react';
import StudyPlanEditor from './StudyPlanEditor';
import GeneratedScheduleView from './GeneratedScheduleView';
import { generateScheduleForGradeOnDay } from '../../lib/gemini';
import { db } from '../../lib/firebase';


interface ScheduleGeneratorProps {
    currentUser: User;
    users: User[];
    classes: ClassData[];
    settings: SchoolSettings;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const DAY_NAMES_AR: Record<string, string> = {
    Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس'
};

const initialGenerationStatus: Record<string, 'pending' | 'generating' | 'done' | 'failed'> = {
    Sunday: 'pending', Monday: 'pending', Tuesday: 'pending', Wednesday: 'pending', Thursday: 'pending'
};

export default function ScheduleGenerator({ currentUser, users, classes, settings }: ScheduleGeneratorProps) {
    const [studyPlans, setStudyPlans] = useState<Record<string, StudyPlan> | null>(null);
    const [isLoadingPlans, setIsLoadingPlans] = useState(true);
    const [schedule, setSchedule] = useState<ScheduleData>({});
    const [history, setHistory] = useState<ScheduleData[]>([]);
    const [teacherUnavailability, setTeacherUnavailability] = useState<Record<string, string[]>>({});
    const [generationStatus, setGenerationStatus] = useState<Record<string, 'pending' | 'generating' | 'done' | 'failed'>>(initialGenerationStatus);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [isPublishing, setIsPublishing] = useState(false);
    const [isPublishingToStudents, setIsPublishingToStudents] = useState(false);
    const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
    const [isPlanVisible, setIsPlanVisible] = useState(true);

    useEffect(() => {
        const planRef = db.ref(`study_plans/${currentUser.id}`);
        const localStorageKey = `studyPlans_${currentUser.id}`;

        planRef.get().then((snapshot) => {
            if (snapshot.exists()) {
                const firebasePlans = snapshot.val();
                setStudyPlans(firebasePlans);
                localStorage.setItem(localStorageKey, JSON.stringify(firebasePlans));
            } else {
                const localPlans = localStorage.getItem(localStorageKey);
                if (localPlans && localPlans !== 'undefined') {
                    try {
                        setStudyPlans(JSON.parse(localPlans));
                    } catch {
                        setStudyPlans(null);
                    }
                } else {
                    setStudyPlans(null);
                }
            }
        }).catch(error => {
            console.error("Error fetching plans from Firebase:", error);
            const localPlans = localStorage.getItem(localStorageKey);
            if (localPlans && localPlans !== 'undefined') {
                try {
                    setStudyPlans(JSON.parse(localPlans));
                } catch {
                    setStudyPlans(null);
                }
            } else {
                setStudyPlans(null);
            }
        }).finally(() => {
            setIsLoadingPlans(false);
        });
    }, [currentUser.id]);

    useEffect(() => {
        const scheduleRef = db.ref(`schedules/${currentUser.id}`);
        scheduleRef.get().then((snapshot) => {
            if (snapshot.exists()) {
                const publishedSchedule = snapshot.val();
                setSchedule(publishedSchedule);

                const newStatus = { ...initialGenerationStatus };
                Object.keys(DAY_NAMES_AR).forEach(day => {
                    if (publishedSchedule[day] && Array.isArray(publishedSchedule[day]) && publishedSchedule[day].length > 0) {
                        newStatus[day] = 'done';
                    }
                });
                setGenerationStatus(newStatus);
                setHasUnpublishedChanges(false);
            }
        });
    }, [currentUser.id]);


    const teachers = useMemo(() => {
        return users.filter(u => u.role === 'teacher' && u.principalId === currentUser.id);
    }, [users, currentUser.id]);
    
    const handleScheduleUpdate = (newSchedule: ScheduleData) => {
        setHistory(prev => [...prev, schedule]);
        setSchedule(newSchedule);
        setHasUnpublishedChanges(true);
    };
    
    const handleUndo = useCallback(() => {
        if (history.length === 0) return;
        const previousState = history[history.length - 1];
        const newHistory = history.slice(0, -1);
        setSchedule(previousState);
        setHistory(newHistory);
        setHasUnpublishedChanges(true);
    }, [history, schedule]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
                event.preventDefault();
                handleUndo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo]);

    const handleUnavailabilityChange = (teacherId: string, day: string, isChecked: boolean) => {
        setTeacherUnavailability(prev => {
            const currentDays = prev[teacherId] || [];
            if (isChecked) {
                return { ...prev, [teacherId]: [...currentDays, day] };
            } else {
                return { ...prev, [teacherId]: currentDays.filter(d => d !== day) };
            }
        });
    };

    const generateFullSchedule = async (startDayIndex = 0) => {
        if (!studyPlans) {
            alert("يرجى حفظ الخطة الدراسية أولاً.");
            return;
        }
        if (isGenerating) return;

        setIsGenerating(true);

        let newStatus = { ...generationStatus };
        let newSchedule = { ...schedule };
        for (let i = startDayIndex; i < DAYS.length; i++) {
            newStatus[DAYS[i]] = i === startDayIndex ? 'generating' : 'pending';
            delete newSchedule[DAYS[i]];
        }
        setGenerationStatus(newStatus);
        handleScheduleUpdate(newSchedule);

        const gradesByStage = classes.reduce((acc, cls) => {
            if (!acc[cls.stage]) acc[cls.stage] = [];
            acc[cls.stage].push(cls);
            return acc;
        }, {} as Record<string, ClassData[]>);
        
        const sortedStages = Object.keys(gradesByStage).sort((a,b) => a.localeCompare(b, 'ar-IQ'));
        
        // FIX: Explicitly type `plan` and `grade` to ensure correct property access and resolve TypeScript errors.
        const allGradeTotals = Object.values(studyPlans).flatMap((plan: StudyPlan) => 
            Object.values(plan.grades).map(grade => (grade as { total: number }).total)
        );
        const maxWeeklyLessons = allGradeTotals.length > 0 ? Math.max(...allGradeTotals) : 35; // Default to 35 (7 per day) if no plan
        const schoolBasePeriods = Math.floor(maxWeeklyLessons / 5);
        const schoolExtraPeriods = maxWeeklyLessons % 5;
        const schoolDayPeriods: Record<string, number> = {};
        DAYS.forEach((day, index) => {
            schoolDayPeriods[day] = schoolBasePeriods + (index < schoolExtraPeriods ? 1 : 0);
        });

        for (let i = startDayIndex; i < DAYS.length; i++) {
            const day = DAYS[i];
            setGenerationStatus(prev => ({ ...prev, [day]: 'generating' }));

            let dailySchedule: SchedulePeriod[] = Array.from({ length: schoolDayPeriods[day] }, (_, j) => ({ period: j + 1, assignments: {} }));
            let dayFailed = false;

            for (const stage of sortedStages) {
                const gradeClasses = gradesByStage[stage];
                
                const planType = stage.includes('ابتدائي') ? 'primary' : stage.includes('متوسط') ? 'intermediate' : 'preparatory';
                const planForGrade = studyPlans[planType]?.grades[stage];
                const totalWeeklyPeriods = planForGrade ? planForGrade.total : 0;

                const gradeBasePeriods = Math.floor(totalWeeklyPeriods / 5);
                const gradeExtraPeriods = totalWeeklyPeriods % 5;
                const targetPeriodsForGrade = gradeBasePeriods + (DAYS.indexOf(day) < gradeExtraPeriods ? 1 : 0);

                const scheduleUntilYesterday: ScheduleData = {};
                for (let j = 0; j < i; j++) {
                    scheduleUntilYesterday[DAYS[j]] = newSchedule[DAYS[j]];
                }

                const gradeSchedulePart = await generateScheduleForGradeOnDay(
                    day, stage, gradeClasses, dailySchedule, teachers, 
                    studyPlans, schoolDayPeriods[day], targetPeriodsForGrade,
                    settings.schoolLevel as any, scheduleUntilYesterday, classes,
                    teacherUnavailability
                );

                if (!gradeSchedulePart) {
                    dayFailed = true;
                    setGenerationStatus(prev => ({ ...prev, [day]: 'failed' }));
                    break;
                }
                
                gradeSchedulePart.forEach(periodFromAI => {
                    const existingPeriod = dailySchedule.find(p => p.period === periodFromAI.period);
                    if (existingPeriod && periodFromAI.assignments) {
                        existingPeriod.assignments = { ...existingPeriod.assignments, ...periodFromAI.assignments };
                    }
                });
            }

            if (dayFailed) {
                break;
            }

            newSchedule[day] = dailySchedule;
            handleScheduleUpdate({ ...newSchedule });
            setGenerationStatus(prev => ({ ...prev, [day]: 'done' }));
        }

        setIsGenerating(false);
    };

    const handlePublish = () => {
        if (!Object.values(generationStatus).some(s => s === 'done')) {
            alert("يرجى إكمال توليد الجدول ليوم واحد على الأقل قبل النشر.");
            return;
        }
        if (window.confirm("هل أنت متأكد من نشر هذا الجدول؟ سيصبح مرئياً لجميع المدرسين وسيستبدل أي جدول منشور سابقاً.")) {
            setIsPublishing(true);
            db.ref(`schedules/${currentUser.id}`).set(schedule)
                .then(() => {
                    alert("تم نشر الجدول بنجاح!");
                    setHasUnpublishedChanges(false);
                })
                .catch(error => alert("فشل نشر الجدول."))
                .finally(() => setIsPublishing(false));
        }
    };
    
    const handlePublishToStudents = () => {
        if (!Object.values(generationStatus).some(s => s === 'done')) return;
        if (window.confirm("هل أنت متأكد من نشر هذا الجدول للطلبة؟")) {
            setIsPublishingToStudents(true);
            db.ref(`student_schedules/${currentUser.id}`).set(schedule)
                .then(() => alert("تم نشر الجدول للطلبة بنجاح!"))
                .catch(error => alert("فشل نشر الجدول للطلبة."))
                .finally(() => setIsPublishingToStudents(false));
        }
    };
    
    const handleResetSchedule = () => {
        if (window.confirm("تحذير: سيتم حذف الجدول الحالي بالكامل من الخادم ومن ذاكرة المتصفح، بما في ذلك الجدول المنشور للطلاب والمدرسين. لا يمكن التراجع عن هذا الإجراء. هل أنت متأكد من المتابعة؟")) {
            setSchedule({});
            setHistory([]);
            setGenerationStatus(initialGenerationStatus);
            setHasUnpublishedChanges(false);

            Promise.all([
                db.ref(`schedules/${currentUser.id}`).remove(),
                db.ref(`student_schedules/${currentUser.id}`).remove()
            ]).then(() => {
                alert("تم مسح الجدول بنجاح. يمكنك الآن البدء من جديد.");
            }).catch(error => alert("حدث خطأ أثناء محاولة مسح الجدول من الخادم."));
        }
    };


    const handlePlansSaved = (plans: Record<string, StudyPlan>) => {
        const localStorageKey = `studyPlans_${currentUser.id}`;
        setStudyPlans(plans);
        localStorage.setItem(localStorageKey, JSON.stringify(plans));

        db.ref(`study_plans/${currentUser.id}`).set(plans)
            .then(() => alert('تم حفظ الخطة بنجاح في المتصفح وعلى الخادم.'))
            .catch(error => alert("حدث خطأ أثناء حفظ الخطة على الخادم."));
    };
    
    const renderStatusNode = (day: string, index: number) => {
        const status = generationStatus[day];
        switch(status) {
            case 'generating': return <div className="flex items-center gap-2 text-cyan-600"><Loader2 className="animate-spin"/> جاري...</div>;
            case 'done': return <div className="flex items-center gap-2 text-green-600 font-bold"><CheckCircle2/> تم</div>;
            case 'failed': return <div className="flex items-center gap-2 text-red-600 font-bold"><XCircle/> فشل</div>;
            default: return <div className="text-gray-500">قيد الانتظار</div>;
        }
    };

    if (isLoadingPlans) return <div className="flex justify-center p-8"><Loader2 className="h-12 w-12 animate-spin text-cyan-600"/></div>;

    const canPublish = Object.values(generationStatus).some(s => s === 'done');
    const publishButtonText = hasUnpublishedChanges ? 'نشر التعديلات للكادر' : 'تم النشر للكادر';
    const studentPublishLabel = settings.schoolLevel === 'ابتدائية' ? 'نشر للتلاميذ' : 'نشر للطلبة';

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg space-y-8">
            <div>
                <button onClick={() => setIsPlanVisible(!isPlanVisible)} className="w-full flex justify-between items-center bg-gray-100 p-4 rounded-lg">
                    <h3 className="text-xl font-bold">الخطوة 1: إعداد الخطة الدراسية</h3>
                    {isPlanVisible ? <ChevronUp/> : <ChevronDown/>}
                </button>
                {isPlanVisible && (
                    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                        <StudyPlanEditor schoolLevel={settings.schoolLevel as any} onSave={handlePlansSaved} savedPlans={studyPlans} />
                    </div>
                )}
            </div>

             <div className="border-t pt-8">
                <h3 className="text-xl font-bold mb-4 text-center">الخطوة 2: إدارة تفرغ المدرسين (اختياري)</h3>
                <div className="space-y-3 max-w-2xl mx-auto p-4 border rounded-lg shadow-inner bg-gray-50">
                    {teachers.map(teacher => (
                        <div key={teacher.id} className="p-3 bg-white rounded-lg shadow-sm">
                            <p className="font-bold">{(teacher as Teacher).name}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                                {DAYS.map(day => (
                                    <label key={day} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded text-cyan-600"
                                            checked={(teacherUnavailability[teacher.id] || []).includes(day)}
                                            onChange={(e) => handleUnavailabilityChange(teacher.id, day, e.target.checked)}
                                        />
                                        {DAY_NAMES_AR[day]}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t pt-8">
                <h3 className="text-xl font-bold mb-2 text-center">الخطوة 3: توليد الجدول الدراسي</h3>
                <div className="text-center mb-6">
                    <button onClick={() => generateFullSchedule(0)} disabled={isGenerating || !studyPlans} className="flex items-center gap-3 px-8 py-4 bg-cyan-600 text-white font-bold text-xl rounded-lg hover:bg-cyan-700 transition disabled:bg-gray-400 shadow-lg">
                        {isGenerating ? <Loader2 className="animate-spin"/> : <BrainCircuit/>}
                        {isGenerating ? 'جاري التوليد...' : 'تكوين الجدول الدراسي بالكامل'}
                    </button>
                </div>
                <div className="space-y-3 max-w-2xl mx-auto p-4 border rounded-lg shadow-inner bg-gray-50">
                    {DAYS.map((day, index) => (
                        <div key={day} className="flex justify-between items-center p-3 rounded-lg bg-white shadow-sm">
                            <span className="font-bold text-lg">{DAY_NAMES_AR[day]}</span>
                            {renderStatusNode(day, index)}
                            {(generationStatus[day] === 'done' || generationStatus[day] === 'failed') && (
                                <button onClick={() => generateFullSchedule(index)} disabled={isGenerating} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                                    <RefreshCw size={14}/> إعادة من هنا
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t pt-8">
                <h3 className="text-xl font-bold mb-4 text-center">الخطوة 4: النشر والإدارة</h3>
                <div className="flex justify-center flex-wrap items-center gap-4 my-6">
                    <button onClick={handlePublish} disabled={!canPublish || isPublishing || !hasUnpublishedChanges} className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition disabled:bg-gray-400">
                        {isPublishing ? <Loader2 className="animate-spin"/> : <Upload size={20}/>} {publishButtonText}
                    </button>
                    <button onClick={handlePublishToStudents} disabled={!canPublish || isPublishingToStudents} className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition disabled:bg-gray-400">
                        {isPublishingToStudents ? <Loader2 className="animate-spin"/> : <Users size={20}/>} {studentPublishLabel}
                    </button>
                    <button onClick={handleResetSchedule} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition">
                        <Trash2 size={20}/> مسح الجدول بالكامل
                    </button>
                </div>
            </div>
            
            {Object.keys(schedule).length > 0 && (
                <div className="mt-6 border-t pt-6">
                    <GeneratedScheduleView scheduleData={schedule} onUpdateSchedule={handleScheduleUpdate} classes={classes} teachers={teachers} settings={settings}/>
                </div>
            )}
        </div>
    );
}