import React, { useState, useEffect, useMemo } from 'react';
import type { User, StudentEvaluation, StudentNotification, Conversation, ScheduleData, PublishedMonthlyResult, BehaviorDeduction, XOChallenge, ClassData, Student, Homework, HomeworkSubmission, HomeworkProgress, Teacher, CounselorGuidance } from '../../types.ts';
import { LogOut, Home, Bell, Shield, BookOpen, Calendar, ClipboardCheck, ShieldBan, Gamepad2, Swords, ChevronsLeft, ChevronsRight, Award, Trophy, ListChecks, BookText, Settings as SettingsIcon, RefreshCw, MessageCircle } from 'lucide-react';
import { db, storage } from '../../lib/firebase.ts';
import StudentDashboard from '../../components/student/StudentDashboard.tsx';
import StudentNotificationsModal from '../../components/student/StudentNotificationsModal.tsx';
import AdministrativeMessages from '../../components/student/AdministrativeMessages.tsx';
import TeacherMessages from '../../components/student/TeacherMessages.tsx';
import StudentScheduleView from '../../components/student/StudentScheduleView.tsx';
import StudentMonthlyResults from '../../components/student/StudentMonthlyResults.tsx';
import StudentBehaviorView from '../../components/student/StudentBehaviorView.tsx';
import XoLeaderboard from '../../components/student/XoLeaderboard.tsx';
import XoChallenges from '../../components/student/XoChallenges.tsx';
import HonorBoardView from '../../components/shared/HonorBoardView.tsx';
import MyHomework from '../../components/student/MyHomework.tsx';
import HallOfFame from '../../components/shared/HallOfFame.tsx';
import MyProgress from '../../components/student/MyProgress.tsx';
import HomeworkSubmissionView from '../../components/student/HomeworkSubmissionView.tsx';
import EducationalEncyclopedia from '../../components/student/EducationalEncyclopedia.tsx';
import GuidanceDisplay from '../../components/shared/GuidanceDisplay.tsx';
import SchoolForum from '../../components/shared/SchoolForum.tsx';
import MoodCheckInModal from '../../components/student/MoodCheckInModal.tsx';


interface StudentAppProps {
    currentUser: User;
    onLogout: () => void;
}

type StudentView = 'dashboard' | 'admin_messages' | 'teacher_messages' | 'schedule' | 'monthly_results' | 'behavior_log' | 'xo_game' | 'challenges' | 'honor_board' | 'my_homework' | 'my_progress' | 'hall_of_fame' | 'homework_submission' | 'educational_encyclopedia' | 'school_forum';

const UnderMaintenance = ({ featureName }: { featureName: string }) => (
    <div className="text-center p-8 bg-white rounded-lg shadow-lg flex flex-col items-center justify-center h-full">
        <SettingsIcon className="w-16 h-16 text-yellow-500 mb-4 animate-spin" />
        <h2 className="text-2xl font-bold text-gray-800">ميزة "{featureName}" قيد الصيانة</h2>
        <p className="mt-2 text-gray-600 max-w-md">نعمل حالياً على تحسين هذه الميزة وستعود للعمل قريباً. شكراً لتفهمكم وصبركم.</p>
    </div>
);


export default function StudentApp({ currentUser, onLogout }: StudentAppProps) {
    const [view, setView] = useState<StudentView>('dashboard');
    const [evaluations, setEvaluations] = useState<StudentEvaluation[]>([]);
    const [notifications, setNotifications] = useState<StudentNotification[]>([]);
    const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const [studentSchedule, setStudentSchedule] = useState<ScheduleData | null>(null);
    const [monthlyResults, setMonthlyResults] = useState<Record<string, PublishedMonthlyResult> | null>(null);
    const [behaviorDeductions, setBehaviorDeductions] = useState<BehaviorDeduction[]>([]);
    const [challenges, setChallenges] = useState<XOChallenge[]>([]);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [allClasses, setAllClasses] = useState<ClassData[]>([]);
    const [gameToJoin, setGameToJoin] = useState<{ gameId: string; grade: string; subject: string } | null>(null);
    const [studentData, setStudentData] = useState<Student | null>(null);
    const [activeHomeworks, setActiveHomeworks] = useState<Homework[]>([]);
    const [homeworkSubmissions, setHomeworkSubmissions] = useState<Record<string, HomeworkSubmission>>({});
    const [homeworkProgress, setHomeworkProgress] = useState<HomeworkProgress | null>(null);
    const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
    const [latestGuidance, setLatestGuidance] = useState<CounselorGuidance | null>(null);
    const [showMoodModal, setShowMoodModal] = useState(false);


    // Effect for one-time data fetching to reduce concurrent connections
    useEffect(() => {
        if (!currentUser.principalId || !currentUser.id) return;

        const principalId = currentUser.principalId;

        const fetchInitialData = async () => {
            try {
                // Define refs for one-time fetches
                const evalRef = db.ref(`evaluations/${principalId}/${currentUser.id}`);
                const scheduleRef = db.ref(`student_schedules/${principalId}`);
                const monthlyResultsRef = db.ref(`published_monthly_results/${principalId}/${currentUser.id}`);
                const behaviorRef = db.ref(`behavior_deductions/${principalId}/${currentUser.id}`);
                const classesRef = db.ref('classes');


                const [
                    evalSnap,
                    scheduleSnap,
                    monthlyResultsSnap,
                    behaviorSnap,
                    classesSnap,
                ] = await Promise.all([
                    evalRef.get(),
                    scheduleRef.get(),
                    monthlyResultsRef.get(),
                    behaviorRef.get(),
                    classesRef.get(),
                ]);

                // Process snapshots
                setEvaluations(evalSnap.exists() ? Object.values(evalSnap.val()) : []);
                setStudentSchedule(scheduleSnap.val());
                setMonthlyResults(monthlyResultsSnap.val());
                const behaviorData = behaviorSnap.val();
                setBehaviorDeductions(behaviorData ? (Object.values(behaviorData) as BehaviorDeduction[]).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : []);

                const classesData = classesSnap.val();
                if (classesData) {
                    const allClassesList: ClassData[] = Object.values(classesData);
                    const principalClasses = allClassesList.filter((c: ClassData) => c.principalId === principalId);
                    setAllClasses(principalClasses);

                    if (currentUser.classId) {
                        const studentClass = principalClasses.find(c => c.id === currentUser.classId);
                        if (studentClass?.students) {
                            const student = studentClass.students.find(s => s.id === currentUser.id);
                            if (student) setStudentData(student);
                        }
                    }
                }
                


                // Fetch homework data
                if (currentUser.classId) {
                    const homeworkRef = db.ref(`homework_data/${principalId}`);
                    const submissionsRef = db.ref(`homework_submissions/${principalId}/${currentUser.id}`);
                    const progressRef = db.ref(`homework_progress/${principalId}/${currentUser.id}`);
                    const activeHomeworkRef = db.ref(`active_homework/${principalId}/${currentUser.classId}`);

                    const [activeHwSnap, submissionsSnap, progressSnap] = await Promise.all([
                        activeHomeworkRef.get(),
                        submissionsRef.get(),
                        progressRef.get(),
                    ]);

                    const studentClassActive = activeHwSnap.val() || {};
                    const activeIds = Object.values(studentClassActive).map((item: any) => item.homeworkId);
                    
                    if (activeIds.length > 0) {
                        const allHomeworksSnap = await homeworkRef.get();
                        const allHomeworks = allHomeworksSnap.val() || {};
                        const studentHomeworks = activeIds
                            .map(hwId => allHomeworks[hwId as string])
                            .filter(hw => hw) as Homework[];
                        setActiveHomeworks(studentHomeworks);
                    } else {
                        setActiveHomeworks([]);
                    }

                    setHomeworkSubmissions(submissionsSnap.val() || {});
                    setHomeworkProgress(progressSnap.val());
                }

            } catch (error) {
                console.error("Error fetching student data:", error);
            }
        };
        
        fetchInitialData();

    }, [currentUser.principalId, currentUser.id, currentUser.classId]);


    // Effect for real-time listeners (notifications, chat, challenges)
    useEffect(() => {
        if (!currentUser.principalId || !currentUser.id) return;
        const principalId = currentUser.principalId;

        const notifRef = db.ref(`student_notifications/${principalId}/${currentUser.id}`);
        const notifCallback = (s: any) => {
            const data = s.val();
            const notifs = data ? Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value })) : [];
            setNotifications(notifs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        };
        notifRef.on('value', notifCallback);

        const conversationsRef = db.ref(`conversations/${principalId}`);
        const conversationsCallback = (snapshot: any) => {
            const data = snapshot.val();
            const conversations: Conversation[] = data ? Object.values(data) : [];
            const unread = conversations.filter(c => (c.studentId === currentUser.id || c.classId === currentUser.classId) && c.unreadByStudent).length;
            setUnreadMessagesCount(unread);
        };
        conversationsRef.on('value', conversationsCallback);

        const challengesRef = db.ref(`xo_challenges/${currentUser.id}`);
        const challengesCallback = (snapshot: any) => {
            const data = snapshot.val() || {};
            const challengeList = Object.values(data).filter((c: any) => c.status === 'pending') as XOChallenge[];
            setChallenges(challengeList);
        };
        challengesRef.on('value', challengesCallback);

        // Realtime homework updates
        const submissionsRef = db.ref(`homework_submissions/${principalId}/${currentUser.id}`);
        const submissionsCallback = (snapshot: any) => {
            setHomeworkSubmissions(snapshot.val() || {});
        };
        submissionsRef.on('value', submissionsCallback);

        // تعديل الجلب لتجنب تحذير الفهرسة
        const guidanceRef = db.ref(`counselor_guidance/${principalId}`);
        const guidanceCallback = (snapshot: any) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.values(data) as CounselorGuidance[];
                const sorted = list.sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                setLatestGuidance(sorted[0] || null);
            } else {
                setLatestGuidance(null);
            }
        };
        guidanceRef.on('value', guidanceCallback);


        return () => {
            notifRef.off('value', notifCallback);
            conversationsRef.off('value', conversationsCallback);
            challengesRef.off('value', challengesCallback);
            submissionsRef.off('value', submissionsCallback);
            guidanceRef.off('value', guidanceCallback);
        };
    }, [currentUser.principalId, currentUser.id, currentUser.classId]);
    
    
    const handlePhotoUpdate = async (photoBlob: Blob) => {
        if (!studentData || !currentUser.principalId || !currentUser.classId) {
             throw new Error("Student data not available for photo update.");
        }

        const photoId = studentData.id;
        const photoRef = storage.ref(`student_photos/${currentUser.principalId}/${photoId}.jpg`);
        await photoRef.put(photoBlob);
        const photoURL = await photoRef.getDownloadURL();

        const studentClass = allClasses.find(c => c.id === currentUser.classId);
        if (!studentClass || !studentClass.students) {
            throw new Error("Class data not found for photo update.");
        }

        const studentIndex = studentClass.students.findIndex(s => s.id === currentUser.id);
        if (studentIndex === -1) {
            throw new Error("Student index not found for photo update.");
        }

        const path = `classes/${currentUser.classId}/students/${studentIndex}/photoUrl`;
        await db.ref(path).set(photoURL);

        // Also update the local state for immediate feedback
        setStudentData(prev => prev ? { ...prev, photoUrl: photoURL } : null);
    };


    const unreadAdminNotifications = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);
    const unreadChallengesCount = useMemo(() => challenges.filter(c => c.status === 'pending').length, [challenges]);
    const totalUnread = unreadAdminNotifications + unreadMessagesCount + unreadChallengesCount;
    
    const handleOpenNotifications = () => {
        setIsNotificationsModalOpen(true);
        const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
        if (unreadIds.length > 0) {
            const updates: Record<string, any> = {};
            unreadIds.forEach(id => {
                updates[`/${id}/isRead`] = true;
            });
            db.ref(`student_notifications/${currentUser.principalId}/${currentUser.id}`).update(updates);
        }
    };

    const renderView = () => {
        const viewLabels: Record<StudentView, string> = {
            dashboard: 'الرئيسية',
            my_homework: 'واجباتي',
            hall_of_fame: 'لوحة الأبطال',
            educational_encyclopedia: 'الموسوعة التعليمية',
            schedule: 'جدولي الدراسي',
            monthly_results: 'نتائجي الشهرية',
            behavior_log: 'سلوكي',
            honor_board: 'لوحة الشرف',
            admin_messages: 'الرسائل الإدارية',
            teacher_messages: 'الواجبات والتبليغات',
            xo_game: 'لعبة XO التعليمية',
            challenges: 'التحديات',
            my_progress: 'تقدمي وإنجازاتي',
            homework_submission: 'تسليم واجب',
            school_forum: 'منتدى المدرسة'
        };
        const featureName = viewLabels[view] || 'هذه الصفحة';
        
        switch(view) {
            case 'dashboard':
                return (
                    <div className="space-y-6">
                        {latestGuidance && <GuidanceDisplay guidance={latestGuidance} />}
                        <StudentDashboard 
                            evaluations={evaluations} 
                            studentData={studentData} 
                            onPhotoUpdate={handlePhotoUpdate}
                            onOpenMoodModal={() => setShowMoodModal(true)} 
                            activeHomeworks={activeHomeworks}
                            submissions={homeworkSubmissions}
                        />
                    </div>
                );
            case 'admin_messages':
                return <UnderMaintenance featureName={featureName} />;
            case 'teacher_messages':
                 return <TeacherMessages currentUser={currentUser} />;
            case 'schedule':
                return <UnderMaintenance featureName={featureName} />;
            case 'monthly_results':
                return <StudentMonthlyResults currentUser={currentUser} resultsData={monthlyResults} />;
            case 'behavior_log':
                return <StudentBehaviorView currentUser={currentUser} deductions={behaviorDeductions} />;
            case 'my_homework':
                return <MyHomework 
                            currentUser={currentUser} 
                            activeHomeworks={activeHomeworks}
                            submissions={homeworkSubmissions}
                            onViewHomework={(homework) => { setSelectedHomework(homework); setView('homework_submission'); }}
                            onViewProgress={() => setView('my_progress')}
                       />;
            case 'my_progress':
                return <MyProgress 
                            currentUser={currentUser}
                            progress={homeworkProgress}
                            allClasses={allClasses}
                            onBack={() => setView('my_homework')}
                        />;
            case 'homework_submission':
                if (selectedHomework) {
                    return <HomeworkSubmissionView
                        currentUser={currentUser}
                        homework={selectedHomework}
                        submission={homeworkSubmissions[selectedHomework.id]}
                        onBack={() => { setView('my_homework'); setSelectedHomework(null); }}
                    />
                }
                setView('my_homework');
                return null;
            case 'hall_of_fame':
                return <HallOfFame currentUser={currentUser} classes={allClasses} />;
            case 'educational_encyclopedia':
                return <EducationalEncyclopedia currentUser={currentUser} classes={allClasses} />;
            case 'xo_game':
                return <UnderMaintenance featureName={featureName} />;
            case 'challenges':
                return <UnderMaintenance featureName={featureName} />;
            case 'honor_board':
                return <HonorBoardView currentUser={currentUser} classes={allClasses} />;
            case 'school_forum':
                return <SchoolForum currentUser={currentUser} />;
            default:
                return (
                    <div className="space-y-6">
                        {latestGuidance && <GuidanceDisplay guidance={latestGuidance} />}
                        <StudentDashboard 
                            evaluations={evaluations} 
                            studentData={studentData} 
                            onPhotoUpdate={handlePhotoUpdate} 
                            onOpenMoodModal={() => setShowMoodModal(true)}
                            activeHomeworks={activeHomeworks}
                            submissions={homeworkSubmissions}
                        />
                    </div>
                );
        }
    }

    return (
        <div className="flex h-screen bg-gray-200 relative" dir="rtl">
            {showMoodModal && <MoodCheckInModal currentUser={{ id: currentUser.id, principalId: currentUser.principalId }} onComplete={() => setShowMoodModal(false)} />}
            
            <StudentNotificationsModal
                isOpen={isNotificationsModalOpen}
                onClose={() => setIsNotificationsModalOpen(false)}
                notifications={notifications}
            />

            <div className={`bg-gray-800 text-white flex flex-col transition-all duration-300 relative ${isSidebarCollapsed ? 'w-0 p-0 border-none overflow-hidden' : 'w-64'} flex-shrink-0`}>
                <div className="flex items-center justify-center p-4 border-b border-gray-700 h-16 flex-shrink-0">
                    {!isSidebarCollapsed && <span className="font-bold text-xl">بوابة الطالب</span>}
                </div>
                <div className="flex-1 flex flex-col overflow-y-auto">
                    <nav className="px-2 py-4 space-y-2">
                        <button onClick={() => setView('dashboard')} className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg transition-colors ${view === 'dashboard' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'الرئيسية' : ''}>
                            <Home size={20} />{!isSidebarCollapsed && <span>الرئيسية</span>}
                        </button>
                        <button onClick={() => setView('my_homework')} className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg transition-colors ${['my_homework', 'my_progress', 'homework_submission'].includes(view) ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'واجباتي' : ''}>
                            <ListChecks size={20} />{!isSidebarCollapsed && <span>واجباتي</span>}
                        </button>
                        <button onClick={() => setView('hall_of_fame')} className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg transition-colors ${view === 'hall_of_fame' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'لوحة الأبطال' : ''}>
                            <Trophy size={20} />{!isSidebarCollapsed && <span>لوحة الأبطال</span>}
                        </button>
                        {['الاول متوسط', 'الثاني متوسط', 'الثالث متوسط'].includes(currentUser.stage || '') && (
                            <button onClick={() => setView('educational_encyclopedia')} className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg transition-colors ${view === 'educational_encyclopedia' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'الموسوعة التعليمية' : ''}>
                                <BookText size={20} />{!isSidebarCollapsed && <span>الموسوعة التعليمية</span>}
                            </button>
                        )}
                         <button onClick={() => setView('schedule')} disabled className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg transition-colors ${view === 'schedule' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700'} ${isSidebarCollapsed ? 'justify-center' : ''} disabled:opacity-50 disabled:cursor-not-allowed`} title={isSidebarCollapsed ? 'جدولي الدراسي' : ''}>
                            <Calendar size={20} />{!isSidebarCollapsed && <span>جدولي الدراسي</span>}
                        </button>
                        <button onClick={() => setView('monthly_results')} className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg transition-colors ${view === 'monthly_results' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'نتائجي الشهرية' : ''}>
                            <ClipboardCheck size={20} />{!isSidebarCollapsed && <span>نتائجي الشهرية</span>}
                        </button>
                         <button onClick={() => setView('behavior_log')} className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg transition-colors ${view === 'behavior_log' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'سلوكي' : ''}>
                            <ShieldBan size={20} />{!isSidebarCollapsed && <span>سلوكي</span>}
                        </button>
                        <button onClick={() => setView('honor_board')} className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg transition-colors ${view === 'honor_board' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'لوحة الشرف' : ''}>
                            <Award size={20} />{!isSidebarCollapsed && <span>لوحة الشرف</span>}
                        </button>
                        <button onClick={() => setView('school_forum')} className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg transition-colors ${view === 'school_forum' ? 'bg-green-600 text-white' : 'text-green-400 hover:bg-gray-700 hover:text-green-300'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'منتدى المدرسة' : ''}>
                            <MessageCircle size={20} />{!isSidebarCollapsed && <span>منتدى المدرسة</span>}
                        </button>
                        <button onClick={() => setView('admin_messages')} disabled className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg transition-colors ${view === 'admin_messages' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700'} ${isSidebarCollapsed ? 'justify-center' : ''} disabled:opacity-50 disabled:cursor-not-allowed`} title={isSidebarCollapsed ? 'الرسائل الإدارية' : ''}>
                            <Shield size={20} />{!isSidebarCollapsed && <span>الرسائل الإدارية</span>}
                        </button>
                        <button onClick={() => setView('teacher_messages')} className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg transition-colors ${view === 'teacher_messages' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'الواجبات والتبليغات' : ''}>
                            <BookOpen size={20} />{!isSidebarCollapsed && <span>الواجبات والتبليغات</span>}
                        </button>
                         <div className="pt-2 mt-2 border-t border-gray-700">
                             <h3 className={`px-4 text-xs font-semibold uppercase text-gray-400 mb-1 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>المسابقات والالعاب التعليمية</h3>
                             <button onClick={() => setView('xo_game')} disabled className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg transition-colors ${view === 'xo_game' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700'} ${isSidebarCollapsed ? 'justify-center' : ''} disabled:opacity-50 disabled:cursor-not-allowed`} title={isSidebarCollapsed ? 'لعبة XO التعليمية' : ''}>
                                 <Gamepad2 size={20} />{!isSidebarCollapsed && <span>لعبة XO التعليمية</span>}
                             </button>
                             <button onClick={() => setView('challenges')} disabled className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg transition-colors relative ${view === 'challenges' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700'} ${isSidebarCollapsed ? 'justify-center' : ''} disabled:opacity-50 disabled:cursor-not-allowed`} title={isSidebarCollapsed ? "التحديات" : ""}>
                                <Swords size={20} />
                                {!isSidebarCollapsed && <span>التحديات</span>}
                                {!isSidebarCollapsed && unreadChallengesCount > 0 && (
                                    <span className="ml-auto bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                                        {unreadChallengesCount}
                                    </span>
                                )}
                            </button>
                         </div>
                    </nav>
                    <div className="mt-auto"></div>
                    <div className="p-4 border-t border-gray-700">
                        <button onClick={onLogout} className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg hover:bg-red-700 bg-red-600/80 transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? "تسجيل الخروج" : ""}>
                            <LogOut size={20} />
                            {!isSidebarCollapsed && <span>تسجيل الخروج</span>}
                        </button>
                    </div>
                </div>
            </div>
            
            <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                className="absolute top-20 z-50 bg-blue-600 text-white p-2 rounded-l-xl shadow-lg hover:bg-blue-700 focus:outline-none transition-all duration-300 flex items-center justify-center"
                style={{ right: isSidebarCollapsed ? '0' : '16rem' }}
                aria-label={isSidebarCollapsed ? "فتح القائمة" : "إغلاق القائمة"}
            >
                {isSidebarCollapsed ? <ChevronsLeft size={24} /> : <ChevronsRight size={24} />}
            </button>

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-sm p-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">مرحباً، {currentUser.name}</h1>
                            <p className="text-sm text-gray-500">مرحلة: {currentUser.stage}</p>
                        </div>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="p-2 text-gray-500 hover:bg-gray-200 hover:text-cyan-600 rounded-full transition-colors self-center"
                            title="تحديث التطبيق للحصول على آخر التغييرات"
                        >
                            <RefreshCw size={20} />
                        </button>
                    </div>
                    <button onClick={handleOpenNotifications} className="relative text-gray-600 hover:text-cyan-600">
                        <Bell size={24} />
                        {totalUnread > 0 && (
                            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                                {totalUnread > 99 ? '99+' : totalUnread}
                            </span>
                        )}
                    </button>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 p-4 sm:p-6 lg:p-8">
                    {renderView()}
                </main>
            </div>
        </div>
    );
}