import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, BookUser, Home, Printer, BarChart, ClipboardList, Archive, User, LogOut, Eye, ChevronsRight, ChevronsLeft, BookCopy, LayoutGrid, ClipboardCheck, Info, Presentation, Brush, Mail, BookMarked, BookText, FileText, PlayCircle, X, Users, CalendarClock, Bell, ClipboardPaste, Sparkles, Star, ClipboardEdit, Trophy, Award, ShieldBan, MessageSquare, Headphones, RefreshCw, MessageCircle, Bot, QrCode, Activity, Map, UserMinus } from 'lucide-react';
import type { SchoolSettings, ClassData, User as CurrentUser, Teacher, LeaveRequest, CounselorGuidance } from './types.ts';
import { DEFAULT_SCHOOL_SETTINGS } from './constants.ts';
import { db } from './lib/firebase.ts';
import { v4 as uuidv4 } from 'uuid';

import Settings from './components/Settings.tsx';
import ClassManager from './components/ClassManager.tsx';
import GradeSheet from './components/GradeSheet.tsx';
import MonthlyResultsExporter from './components/principal/MonthlyResultsExporter.tsx';
import StatisticsManager from './components/StatisticsManager.tsx';
import TeacherLogExporter from './components/TeacherLogExporter.tsx';
import AdminLogExporter from './components/AdminLogExporter.tsx';
import PrincipalDashboard from './components/principal/PrincipalDashboard.tsx';
import ReceiveTeacherLog from './components/principal/ReceiveTeacherLog.tsx';
import TeacherGradeSheet from './components/teacher/TeacherGradeSheet.tsx';
import TeacherPlatform from './components/teacher/TeacherPlatform.tsx';
import TeacherEvaluation from './components/teacher/TeacherEvaluation.tsx';
import DailyGradeSheetManager from './components/teacher/DailyGradeSheetManager.tsx';
import GradeBoardExporter from './components/principal/GradeBoardExporter.tsx';
import OralExamListsExporter from './components/principal/OralExamListsExporter.tsx';
import AboutModal from './components/AboutModal.tsx';
import ExamHallsManager from './components/principal/ExamHallsManager.tsx';
import SeatingChartManagerV2 from './components/principal/SeatingChartManagerV2.tsx';
import CoverEditor from './components/principal/CoverEditor.tsx';
import AdministrativeCorrespondence from './components/principal/AdministrativeCorrespondence.tsx';
import AbsenceManager from './components/principal/AbsenceManager.tsx';
import SchoolArchive from './components/principal/SchoolArchive.tsx';
import ExamControlLog from './components/principal/ExamControlLog.tsx';
import ExportManager from './components/ExportManager.tsx';
import LeaveRequestManager from './components/principal/LeaveRequestManager.tsx';
import LeaveRequestForm from './components/teacher/LeaveRequestForm.tsx';
import EducationalEncyclopedia from './components/teacher/EducationalEncyclopedia.tsx';
import StudentManagement from './components/principal/StudentManagement.tsx';
import HomeworkManager from './components/teacher/HomeworkManager.tsx';
import HallOfFame from './components/shared/HallOfFame.tsx';
import HonorBoardView from './components/shared/HonorBoardView.tsx';
import BehaviorManager from './components/principal/BehaviorManager.tsx';
import TeacherCommunication from './components/teacher/TeacherCommunication.tsx';
import StaffAchievements from './components/principal/StaffAchievements.tsx';
import GuidanceDisplay from './components/shared/GuidanceDisplay.tsx';
import SchoolForum from './components/shared/SchoolForum.tsx';
import AIAdminAssistant from './components/principal/AIAdminAssistant.tsx';
import QRGradeRecorder from './components/principal/QRGradeRecorder.tsx';
import QRGeneratorManager from './components/principal/QRGeneratorManager.tsx';
import StaffKPIs from './components/principal/StaffKPIs.tsx';
import ExamAbsenceRecorder from './components/principal/ExamAbsenceRecorder.tsx';

type View = 'home' | 'settings' | 'class_manager' | 'grade_sheet' | 'export_results' | 'statistics' | 'teacher_log_exporter' | 'admin_log_exporter' | 'principal_dashboard' | 'receive_teacher_logs' | 'electronic_logbook' | 'grade_board' | 'oral_exam_lists' | 'promotion_log' | 'exam_halls' | 'seating_chart_v2' | 'cover_editor' | 'exam_cards' | 'exam_control_log' | 'administrative_correspondence' | 'primary_school_log' | 'school_archive' | 'absence_manager' | 'parent_invitations' | 'exam_results_exporter' | 'teacher_platform' | 'leave_requests' | 'leave_request_form' | 'educational_encyclopedia' | 'student_management' | 'student_evaluation' | 'homework_manager' | 'hall_of_fame' | 'honor_board_view' | 'behavior_manager' | 'teacher_communication' | 'staff_achievements' | 'daily_grade_sheet' | 'school_forum' | 'ai_admin_assistant' | 'qr_grade_recorder' | 'qr_generator' | 'staff_kpis' | 'exam_absence_recorder';

interface NavItem {
    view: View;
    icon: React.ElementType;
    label: string;
    classId?: string;
    subjectId?: string;
    badgeCount?: number;
}

interface NavButtonProps {
    item: NavItem;
    isCollapsed: boolean;
    onClick: () => void;
    isActive: boolean;
    disabled?: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ item, isCollapsed, onClick, isActive, disabled }) => {
    const isForum = item.view === 'school_forum';
    const isAI = item.view === 'ai_admin_assistant';
    const isQR = item.view === 'qr_grade_recorder' || item.view === 'exam_absence_recorder';
    const isQRGen = item.view === 'qr_generator';
    const isKPI = item.view === 'staff_kpis';

    let colorClass = isActive ? 'bg-cyan-600 text-white shadow-inner' : 'hover:bg-gray-700';
    if (isForum) {
        colorClass = isActive 
            ? 'bg-green-600 text-white shadow-inner' 
            : 'text-green-400 hover:bg-gray-700 hover:text-green-300';
    } else if (isAI) {
        colorClass = isActive
            ? 'bg-indigo-600 text-white shadow-inner'
            : 'text-indigo-400 hover:bg-gray-700 hover:text-indigo-300';
    } else if (isQR) {
        colorClass = isActive
            ? 'bg-amber-600 text-white shadow-inner'
            : 'text-amber-400 hover:bg-gray-700 hover:text-amber-300';
    } else if (isQRGen) {
        colorClass = isActive
            ? 'bg-blue-600 text-white shadow-inner'
            : 'text-blue-400 hover:bg-gray-700 hover:text-blue-300';
    } else if (isKPI) {
        colorClass = isActive
            ? 'bg-rose-600 text-white shadow-inner'
            : 'text-rose-400 hover:bg-gray-700 hover:text-rose-300';
    }

    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg transition-colors relative ${colorClass} ${isCollapsed ? 'justify-center' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isCollapsed ? item.label : ''}
        >
            <item.icon size={20} />
            {!isCollapsed && <span className="truncate">{item.label}</span>}
            {item.badgeCount && item.badgeCount > 0 && !isCollapsed ? (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">{item.badgeCount}</span>
            ) : null}
        </button>
    );
};

interface MainAppProps {
    currentUser: CurrentUser;
    onLogout: () => void;
    users: CurrentUser[];
    addUser: (user: Omit<CurrentUser, 'id'>) => CurrentUser;
    updateUser: (userId: string, updater: (user: CurrentUser) => CurrentUser) => void;
    deleteUser: (userId: string) => void;
}

export default function MainApp({ currentUser, onLogout, users, addUser, updateUser, deleteUser }: MainAppProps): React.ReactNode {
    const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [activeView, setActiveView] = useState<View>('home');
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [latestGuidance, setLatestGuidance] = useState<CounselorGuidance | null>(null);
    
    const isPrincipal = currentUser.role === 'principal';
    const isTeacher = currentUser.role === 'teacher';
    const migrationCheckRan = useRef(false);

    const createDefaultSettingsForPrincipal = (principal: CurrentUser): SchoolSettings => {
        return {
            schoolName: principal.schoolName || '',
            principalName: principal.name,
            academicYear: "2025-2026",
            directorate: '',
            supplementarySubjectsCount: 3,
            decisionPoints: 5,
            principalPhone: '',
            schoolType: 'نهاري',
            schoolGender: 'بنين',
            schoolLevel: currentUser.schoolLevel || 'متوسطة',
            governorateCode: '',
            schoolCode: '',
            governorateName: 'بغداد',
            district: '',
            subdistrict: ''
        };
    };

    const isEnglishTeacher = useMemo(() => {
        if (!isTeacher) return false;
        const teacher = currentUser as Teacher;
        return (teacher.assignments || []).some(assignment => {
            const assignedClass = classes.find(c => c.id === assignment.classId);
            if (!assignedClass) return false;
            const assignedSubject = assignedClass.subjects.find(s => s.id === assignment.subjectId);
            return !!assignedSubject?.name.replace(/[إأآ]/g, 'ا').includes('انكليزية');
        });
    }, [currentUser, isTeacher, classes]);

    useEffect(() => {
        let settingsPath: string | null = null;
        const principalId = isTeacher ? (currentUser as Teacher).principalId : currentUser.id;

        let settingsRef: any; 
        let settingsCallback: any;
        let leaveRequestsRef: any;
        let leaveRequestsCallback: any;
        let guidanceRef: any;
        let guidanceCallback: any;

        if (isPrincipal || (isTeacher && principalId)) {
            settingsPath = `settings/${principalId}`;

            // معالجة برمجية لفرز التوجيهات لتجنب تحذير الفهرسة
            guidanceRef = db.ref(`counselor_guidance/${principalId}`);
            guidanceCallback = (snapshot: any) => {
                const data = snapshot.val();
                if (data) {
                    const list = Object.values(data) as CounselorGuidance[];
                    // فرز برمجياً بدلاً من استخدام orderByChild
                    const sorted = list.sort((a, b) => 
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
                    setLatestGuidance(sorted[0] || null);
                } else {
                    setLatestGuidance(null);
                }
            };
            guidanceRef.on('value', guidanceCallback);
        }

        if (settingsPath) {
            settingsRef = db.ref(settingsPath);
            settingsCallback = (snapshot: any) => { 
                const data = snapshot.val();
                if (data) {
                    setSettings(data);
                } else if (isPrincipal) {
                    const defaultSettings = createDefaultSettingsForPrincipal(currentUser);
                    setSettings(defaultSettings);
                    settingsRef.set(defaultSettings);
                } else {
                    setSettings(DEFAULT_SCHOOL_SETTINGS);
                }
            };
            settingsRef.on('value', settingsCallback);

            if (principalId) {
                leaveRequestsRef = db.ref(`leave_requests/${principalId}`);
                leaveRequestsCallback = (snapshot: any) => {
                    const data = snapshot.val();
                    const requests: LeaveRequest[] = data ? Object.values(data) : [];
                    setLeaveRequests(requests);
                };
                leaveRequestsRef.on('value', leaveRequestsCallback);
            }
        } else {
            setSettings(DEFAULT_SCHOOL_SETTINGS);
        }

        const classesRef = db.ref('classes');
        const classesCallback = (snapshot: any) => { 
            const data = snapshot.val();
            setClasses(data ? Object.values(data) : []);
        };
        classesRef.on('value', classesCallback);

        return () => {
            if (settingsRef && settingsCallback) settingsRef.off('value', settingsCallback);
            if (leaveRequestsRef && leaveRequestsCallback) leaveRequestsRef.off('value', leaveRequestsCallback);
            if (guidanceRef && guidanceCallback) guidanceRef.off('value', guidanceCallback);
            classesRef.off('value', classesCallback);
        };
    }, [currentUser, isPrincipal, isTeacher]);

    useEffect(() => {
        const runMigration = async () => {
            if (!isPrincipal || classes.length === 0 || users.length === 0) return;
            const targetStages = ['الاول متوسط', 'الثاني متوسط', 'الثالث متوسط'];
            const classesToMigrate = classes.filter(c => targetStages.includes(c.stage) && !c.subjects_migrated_v1);
            if (classesToMigrate.length === 0) return;

            const principalTeachers = users.filter(u => u.role === 'teacher' && u.principalId === currentUser.id);
            const updates: Record<string, any> = {};

            for (const classData of classesToMigrate) {
                let subjects = [...(classData.subjects || [])];
                let classNeedsUpdate = false;
                const oldAr1 = subjects.find(s => s.name === 'اللغة العربية الجزء الاول');
                const oldAr2 = subjects.find(s => s.name === 'اللغة العربية الجزء الثاني');
                const oldEn1 = subjects.find(s => s.name === 'اللغة الإنكليزية كتاب الطالب');
                const oldEn2 = subjects.find(s => s.name === 'اللغة الإنكليزية كتاب النشاط');
                
                let newArabicSub = subjects.find(s => s.name === 'اللغة العربية');
                if (!newArabicSub && (oldAr1 || oldAr2)) {
                    newArabicSub = { id: uuidv4(), name: 'اللغة العربية' };
                    subjects.push(newArabicSub);
                    classNeedsUpdate = true;
                }

                let newEnglishSub = subjects.find(s => s.name === 'اللغة الإنكليزية');
                if (!newEnglishSub && (oldEn1 || oldEn2)) {
                    newEnglishSub = { id: uuidv4(), name: 'اللغة الإنكليزية' };
                    subjects.push(newEnglishSub);
                    classNeedsUpdate = true;
                }

                if (classNeedsUpdate) {
                    updates[`/classes/${classData.id}/subjects_migrated_v1`] = true;
                    updates[`/classes/${classData.id}/subjects`] = subjects.filter(s => ![
                        'اللغة العربية الجزء الاول', 'اللغة العربية الجزء الثاني',
                        'اللغة الإنكليزية كتاب الطالب', 'اللغة الإنكليزية كتاب النشاط'
                    ].includes(s.name));

                    for (const teacher of principalTeachers) {
                        let assignmentsChanged = false;
                        let newAssignments = [...(teacher.assignments || [])];
                        const hasOldArabic = newAssignments.some(a => a.classId === classData.id && (a.subjectId === oldAr1?.id || a.subjectId === oldAr2?.id));
                        if (newArabicSub && hasOldArabic) {
                            assignmentsChanged = true;
                            newAssignments = newAssignments.filter(a => !(a.classId === classData.id && (a.subjectId === oldAr1?.id || a.subjectId === oldAr2?.id)));
                            if (!newAssignments.some(a => a.classId === classData.id && a.subjectId === newArabicSub!.id)) {
                                 newAssignments.push({ classId: classData.id, subjectId: newArabicSub.id });
                            }
                        }
                        const hasOldEnglish = newAssignments.some(a => a.classId === classData.id && (a.subjectId === oldEn1?.id || a.subjectId === oldEn2?.id));
                        if (newEnglishSub && hasOldEnglish) {
                            assignmentsChanged = true;
                            newAssignments = newAssignments.filter(a => !(a.classId === classData.id && (a.subjectId === oldEn1?.id || a.subjectId === oldEn2?.id)));
                             if (!newAssignments.some(a => a.classId === classData.id && a.subjectId === newEnglishSub!.id)) {
                                 newAssignments.push({ classId: classData.id, subjectId: newEnglishSub.id });
                            }
                        }
                        if (assignmentsChanged) updates[`/users/${teacher.id}/assignments`] = newAssignments;
                    }
                }
            }
            if (Object.keys(updates).length > 0) {
                try {
                    await db.ref().update(updates);
                    alert('تم تحديث هيكل المواد الدراسية وتعيينات المدرسين تلقائياً. سيتم تحديث الصفحة.');
                    window.location.reload();
                } catch (e) {
                    console.error("Migration failed:", e);
                }
            }
        };
        if (!migrationCheckRan.current && classes.length > 0 && users.length > 0) {
            runMigration();
            migrationCheckRan.current = true;
        }
    }, [classes, users, isPrincipal, currentUser.id]);

    const effectiveSettings = useMemo(() => {
        if (isPrincipal) {
            return {
                ...settings,
                schoolName: currentUser.schoolName || settings.schoolName || 'لم يتم تحديد اسم المدرسة',
                principalName: currentUser.name,
                schoolLevel: currentUser.schoolLevel || settings.schoolLevel
            };
        }
        if (isTeacher) {
            const principal = users.find(u => u.id === (currentUser as Teacher).principalId);
            return {
                ...settings,
                schoolName: principal?.schoolName || settings.schoolName || 'لم يتم تحديد اسم المدرسة',
                principalName: principal?.name || settings.principalName,
                schoolLevel: principal?.schoolLevel || settings.schoolLevel
            };
        }
        return settings;
    }, [settings, currentUser, isPrincipal, isTeacher, users]);

    const handleSelectClass = (classId: string) => {
        setSelectedClassId(classId);
        setActiveView('grade_sheet');
    };

    const handleSaveSettings = (newSettings: SchoolSettings) => {
        if (isPrincipal) {
            db.ref(`settings/${currentUser.id}`).set(newSettings);
            alert('تم حفظ الإعدادات بنجاح!');
            setActiveView('home');
        }
    };

    const selectedClass = useMemo(() => {
        if (!selectedClassId) return null;
        return classes.find(c => c.id === selectedClassId) || null;
    }, [classes, selectedClassId]);

    const correspondenceNavItems: NavItem[] = [
        { view: 'ai_admin_assistant', icon: Bot, label: 'المساعد الإداري الذكي' },
        { view: 'administrative_correspondence', icon: FileText, label: 'نماذج المراسلات' }
    ];

    const reportNavItems: NavItem[] = [
        { view: 'export_results', icon: Printer, label: 'النتائج الشهرية' },
        { view: 'exam_results_exporter', icon: Printer, label: 'النتائج الامتحانية' },
        { view: 'statistics', icon: BarChart, label: 'التقارير والإحصاءات' },
        { view: 'teacher_log_exporter', icon: ClipboardList, label: 'سجل المدرس' },
        { view: 'admin_log_exporter', icon: Archive, label: 'السجل العام' },
        { view: 'primary_school_log', icon: BookText, label: 'درجات الابتدائية' }
    ];
    
    const examRecordsNavItems: NavItem[] = [
        { view: 'grade_board', icon: LayoutGrid, label: 'بورد الدرجات' },
        { view: 'qr_generator', icon: QrCode, label: 'توليد رموز QR للطلاب' },
        { view: 'qr_grade_recorder', icon: QrCode, label: 'تسجيل الدرجات بـ QR' },
        { view: 'exam_absence_recorder', icon: UserMinus, label: 'تسجيل الغيابات بـ QR' },
        { view: 'oral_exam_lists', icon: ClipboardCheck, label: 'قوائم الشفوي' },
        { view: 'exam_cards', icon: BookMarked, label: 'بطاقات امتحانية' },
        { view: 'exam_halls', icon: Map, label: 'القاعات الامتحانية' },
        { view: 'cover_editor', icon: Brush, label: 'محرر الأغلفة' }
    ];

    const teacherNavItems: NavItem[] = useMemo(() => {
        if (!isTeacher) return [];
        const assignments = (currentUser as Teacher).assignments || [];
        return assignments.map((assignment): NavItem | null => {
            const assignedClass = classes.find(c => c.id === assignment.classId);
            if (!assignedClass) return null;
            const assignedSubject = assignedClass.subjects.find(s => s.id === assignment.subjectId);
            if (!assignedSubject) return null;
            return {
                view: 'grade_sheet',
                icon: Eye,
                label: `${assignedClass.stage} / ${assignedClass.section} - ${assignedSubject.name}`,
                classId: assignedClass.id,
                subjectId: assignedSubject.id
            };
        }).filter((item): item is NavItem => item !== null);
    }, [classes, currentUser, isTeacher]);

    const renderView = () => {
        if (isTeacher) {
            const principalId = (currentUser as Teacher).principalId;
            const principalClasses = principalId ? classes.filter(c => c.principalId === principalId) : [];
            switch(activeView) {
                case 'settings': return <Settings currentSettings={effectiveSettings} onSave={handleSaveSettings} currentUser={currentUser} updateUser={updateUser} />;
                case 'home':
                case 'grade_sheet':
                    const classForSheet = selectedClassId ? classes.find(c => c.id === selectedClassId) : classes.find(c => c.id === teacherNavItems[0]?.classId);
                    if (classForSheet) return <TeacherGradeSheet classData={classForSheet} teacher={currentUser as Teacher} settings={effectiveSettings} subjectId={selectedSubjectId || undefined} />;
                    return <div className="text-center p-8 bg-white rounded-lg shadow"><h2 className="text-2xl font-bold">أهلاً بك، {currentUser.name}</h2><p className="mt-2 text-gray-600">اختر أحد صفوفك من القائمة الجانبية للبدء في إدخال الدرجات.</p></div>;
                case 'teacher_platform': return <TeacherPlatform />;
                case 'student_evaluation': return <TeacherEvaluation teacher={currentUser as Teacher} classes={classes} />;
                case 'homework_manager': return <HomeworkManager teacher={currentUser as Teacher} classes={classes} />;
                case 'teacher_communication': return <TeacherCommunication teacher={currentUser as Teacher} classes={classes} users={users} />;
                case 'hall_of_fame': return <HallOfFame currentUser={currentUser} classes={principalClasses} />;
                case 'honor_board_view': return <HonorBoardView currentUser={currentUser} classes={principalClasses} />;
                case 'educational_encyclopedia': return <EducationalEncyclopedia currentUser={currentUser} classes={classes} />;
                case 'leave_request_form': return <LeaveRequestForm teacher={currentUser as Teacher} settings={effectiveSettings} classes={classes} />;
                case 'daily_grade_sheet': return <DailyGradeSheetManager teacher={currentUser as Teacher} classes={classes} settings={effectiveSettings} />;
                case 'school_forum': return <SchoolForum currentUser={currentUser} />;
                default: return <div>Teacher view not found</div>;
            }
        }
        if (isPrincipal) {
            const principalClasses = classes.filter(c => c.principalId === currentUser.id);
            switch (activeView) {
                case 'home':
                case 'class_manager': return <ClassManager classes={principalClasses} onSelectClass={handleSelectClass} currentUser={currentUser} />;
                case 'settings': return <Settings currentSettings={effectiveSettings} onSave={handleSaveSettings} currentUser={currentUser} updateUser={updateUser} />;
                case 'grade_sheet':
                    if (selectedClass) return <GradeSheet classData={selectedClass} settings={effectiveSettings} />;
                    return <div className="text-center p-8 bg-white rounded-lg shadow"><h2 className="text-2xl font-bold">لم يتم تحديد شعبة</h2><p className="mt-2 text-gray-600">يرجى العودة إلى الرئيسية واختيار شعبة.</p></div>;
                case 'staff_kpis': return <StaffKPIs principal={currentUser} users={users} classes={principalClasses} />;
                case 'qr_grade_recorder': return <QRGradeRecorder classes={principalClasses} settings={effectiveSettings} />;
                case 'exam_absence_recorder': return <ExamAbsenceRecorder classes={principalClasses} settings={effectiveSettings} />;
                case 'qr_generator': return <QRGeneratorManager classes={principalClasses} settings={effectiveSettings} />;
                case 'ai_admin_assistant': return <AIAdminAssistant settings={effectiveSettings} />;
                case 'administrative_correspondence': return <AdministrativeCorrespondence />;
                case 'export_results': return <MonthlyResultsExporter classes={principalClasses} settings={effectiveSettings} users={users} />;
                case 'exam_results_exporter': return <ExportManager classes={principalClasses} settings={effectiveSettings} />;
                case 'statistics': return <StatisticsManager classes={principalClasses} settings={effectiveSettings} />;
                case 'teacher_log_exporter': return <TeacherLogExporter classes={principalClasses} settings={effectiveSettings} users={users} />;
                case 'admin_log_exporter': return <AdminLogExporter classes={principalClasses} settings={effectiveSettings} />;
                case 'principal_dashboard': return <PrincipalDashboard principal={currentUser} classes={principalClasses} users={users} addUser={addUser} updateUser={updateUser} deleteUser={deleteUser} />;
                case 'staff_achievements': return <StaffAchievements principal={currentUser} users={users} classes={principalClasses} />;
                case 'student_management': return <StudentManagement principal={currentUser} settings={effectiveSettings} classes={principalClasses} />;
                case 'absence_manager': return <AbsenceManager principal={currentUser} settings={effectiveSettings} classes={principalClasses} />;
                case 'behavior_manager': return <BehaviorManager principal={currentUser} settings={effectiveSettings} classes={principalClasses} />;
                case 'hall_of_fame': return <HallOfFame currentUser={currentUser} classes={principalClasses} />;
                case 'honor_board_view': return <HonorBoardView currentUser={currentUser} classes={principalClasses} />;
                case 'receive_teacher_logs': return <ReceiveTeacherLog principal={currentUser} classes={principalClasses} settings={effectiveSettings} users={users} />;
                case 'leave_requests': return <LeaveRequestManager principal={currentUser} settings={effectiveSettings} requests={leaveRequests} />;
                case 'grade_board': return <GradeBoardExporter classes={principalClasses} settings={effectiveSettings} />;
                case 'oral_exam_lists': return <OralExamListsExporter classes={principalClasses} settings={effectiveSettings} />;
                case 'exam_halls': return <ExamHallsManager />;
                case 'seating_chart_v2': return <SeatingChartManagerV2 principal={currentUser} />;
                case 'cover_editor': return <CoverEditor />;
                case 'exam_control_log': return <ExamControlLog principal={currentUser} users={users} settings={effectiveSettings} classes={principalClasses} />;
                case 'school_archive': return <SchoolArchive />;
                case 'school_forum': return <SchoolForum currentUser={currentUser} />;
                default: return <ClassManager classes={principalClasses} onSelectClass={handleSelectClass} currentUser={currentUser} />;
            }
        }
        return <div>Unexpected user role.</div>;
    };

    const navForPrincipal: NavItem[] = [
        { view: 'home', icon: Home, label: 'الرئيسية / الشعب' },
        { view: 'staff_kpis', icon: Activity, label: 'مراقبة أداء الكادر' },
        { view: 'principal_dashboard', icon: User, label: 'إدارة المدرسين' },
        { view: 'staff_achievements', icon: BarChart, label: 'إنجازات الكادر' },
        { view: 'school_forum', icon: MessageCircle, label: 'منتدى المدرسة' },
        { view: 'student_management', icon: Users, label: 'إدارة الطلاب والاشتراكات' },
        { view: 'absence_manager', icon: CalendarClock, label: 'إدارة الغيابات' },
        { view: 'behavior_manager', icon: ShieldBan, label: 'إدارة درجات السلوك' },
        { view: 'hall_of_fame', icon: Trophy, label: 'لوحة الأبطال' },
        { view: 'honor_board_view', icon: Award, label: 'لوحة الشرف السلوكية' },
        { view: 'school_archive', icon: Archive, label: 'ارشيف المدرسة' },
        { view: 'exam_control_log', icon: BookText, label: 'سجل السيطرة الامتحانية' },
        { view: 'receive_teacher_logs', icon: ClipboardPaste, label: 'السجلات المستلمة' },
        { view: 'leave_requests', icon: Mail, label: 'طلبات الإجازة' }
    ];
    
    const showAboutButton = (isPrincipal && (activeView === 'home' || activeView === 'class_manager')) || (isTeacher && (activeView === 'home' || activeView === 'grade_sheet'));

    const handleNavClick = (view: View, classId?: string, subjectId?: string) => {
        setActiveView(view);
        if (classId) {
            setSelectedClassId(classId);
            setSelectedSubjectId(subjectId || null);
        } else {
             setSelectedClassId(null);
             setSelectedSubjectId(null);
        }
    };

    const getRoleName = (role: string) => {
        if (role === 'principal') return 'مدير';
        if (role === 'teacher') return 'مدرس';
        return role;
    };

    return (
        <div className="flex h-screen bg-gray-200 relative" dir="rtl">
            <div className={`bg-gray-800 text-white flex flex-col transition-all duration-300 relative ${isSidebarCollapsed ? 'w-0 p-0 border-none' : 'w-64'} overflow-hidden`}>
                <div className="flex items-center justify-center p-4 border-b border-gray-700 h-16 flex-shrink-0">
                    {!isSidebarCollapsed && <span className="font-bold text-xl whitespace-nowrap">لوحة التحكم</span>}
                </div>
                <div className="flex-1 flex flex-col overflow-y-auto">
                    <nav className="px-2 py-4 space-y-1">
                        {isPrincipal && (
                            <>
                                {navForPrincipal.map(item => <NavButton key={item.view} item={item} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick(item.view)} isActive={activeView === item.view}/>)}
                                 <div className="pt-2 mt-2 border-t border-gray-700 space-y-1">
                                    <h3 className={`px-4 text-xs font-semibold uppercase text-gray-400 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>إدارة ومراسلات</h3>
                                    {correspondenceNavItems.map(item => <NavButton key={item.view} item={item} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick(item.view)} isActive={activeView === item.view}/>)}
                                </div>
                                <div className="pt-2 mt-2 border-t border-gray-700 space-y-1">
                                    <h3 className={`px-4 text-xs font-semibold uppercase text-gray-400 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>سجلات امتحانية</h3>
                                    {examRecordsNavItems.map(item => <NavButton key={item.view} item={item} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick(item.view)} isActive={activeView === item.view}/>)}
                                </div>
                                <div className="pt-2 mt-2 border-t border-gray-700 space-y-1">
                                    <h3 className={`px-4 text-xs font-semibold uppercase text-gray-400 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>التقارير</h3>
                                    {reportNavItems.map(item => {
                                        let isDisabled = false;
                                        if (item.view === 'admin_log_exporter') isDisabled = effectiveSettings.schoolLevel === 'ابتدائية';
                                        if (item.view === 'primary_school_log') isDisabled = effectiveSettings.schoolLevel !== 'ابتدائية';
                                        if (item.view === 'export_results') isDisabled = effectiveSettings.schoolLevel === 'ابتدائية';
                                        return <NavButton key={item.view} item={item} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick(item.view)} isActive={activeView === item.view} disabled={isDisabled} />
                                    })}
                                </div>
                            </>
                        )}
                        {isTeacher && (
                             <div className="space-y-1">
                                <NavButton item={{view: 'home', icon: Home, label: 'الرئيسية'}} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick('home')} isActive={activeView === 'home' && !selectedClassId}/>
                                <NavButton item={{view: 'teacher_platform', icon: Sparkles, label: 'تربوي تك الأستاذ'}} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick('teacher_platform')} isActive={activeView === 'teacher_platform'}/>
                                {isEnglishTeacher && <NavButton item={{view: 'sound_lab' as any, icon: Headphones, label: 'مختبر الصوت'}} isCollapsed={isSidebarCollapsed} onClick={() => window.open('https://hussien1977.github.io/moktabar/', '_blank')} isActive={false} />}
                                <NavButton item={{view: 'teacher_communication', icon: MessageSquare, label: 'التواصل مع الطلبة'}} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick('teacher_communication')} isActive={activeView === 'teacher_communication'}/>
                                <NavButton item={{view: 'school_forum', icon: MessageCircle, label: 'منتدى المدرسة'}} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick('school_forum')} isActive={activeView === 'school_forum'}/>
                                <NavButton item={{view: 'student_evaluation', icon: Star, label: 'تقييم الطلبة'}} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick('student_evaluation')} isActive={activeView === 'student_evaluation'}/>
                                <NavButton item={{view: 'homework_manager', icon: ClipboardEdit, label: 'إدارة الواجبات'}} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick('homework_manager')} isActive={activeView === 'homework_manager'}/>
                                <NavButton item={{view: 'hall_of_fame', icon: Trophy, label: 'لوحة الأبطال'}} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick('hall_of_fame')} isActive={activeView === 'hall_of_fame'}/>
                                <NavButton item={{view: 'honor_board_view', icon: Award, label: 'لوحة الشرف السلوكية'}} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick('honor_board_view')} isActive={activeView === 'honor_board_view'}/>
                                <NavButton item={{view: 'daily_grade_sheet', icon: BookCopy, label: 'سجل الدرجات اليومية'}} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick('daily_grade_sheet')} isActive={activeView === 'daily_grade_sheet'}/>
                                <NavButton item={{view: 'educational_encyclopedia', icon: BookText, label: 'الموسوعة التعليمية'}} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick('educational_encyclopedia')} isActive={activeView === 'educational_encyclopedia'}/>
                                <NavButton item={{view: 'leave_request_form', icon: Mail, label: 'طلب إجازة'}} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick('leave_request_form')} isActive={activeView === 'leave_request_form'}/>
                                <div className="pt-2 mt-2 border-t border-gray-700 space-y-1">
                                    <h3 className={`px-4 text-xs font-semibold uppercase text-gray-400 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>صفوفي</h3>
                                    {teacherNavItems.map(item => (<NavButton key={item.label} item={item} isCollapsed={isSidebarCollapsed} onClick={() => item.classId && handleNavClick(item.view, item.classId, item.subjectId)} isActive={selectedClassId === item.classId && selectedSubjectId === item.subjectId} />))}
                                </div>
                             </div>
                        )}
                        <div className="pt-2 mt-2 border-t border-gray-700 space-y-1">
                             <NavButton item={{view: 'settings', icon: SettingsIcon, label: 'الإعدادات'}} isCollapsed={isSidebarCollapsed} onClick={() => handleNavClick('settings')} isActive={activeView === 'settings'}/>
                        </div>
                    </nav>
                    <div className="mt-auto"></div>
                    <div className="p-4 border-t border-gray-700">
                        <button onClick={onLogout} className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg hover:bg-red-700 bg-red-600/80 transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? "تسجيل الخروج" : ''}>
                            <LogOut size={20} />
                            {!isSidebarCollapsed && <span>تسجيل الخروج</span>}
                        </button>
                    </div>
                </div>
            </div>
             <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="absolute top-20 z-50 bg-blue-600 text-white p-2 rounded-l-xl shadow-lg hover:bg-blue-700 focus:outline-none transition-all duration-300 flex items-center justify-center" style={{ right: isSidebarCollapsed ? '0' : '16rem' }} aria-label={isSidebarCollapsed ? "فتح القائمة" : "إغلاق القائمة"}>
                {isSidebarCollapsed ? <ChevronsLeft size={24} /> : <ChevronsRight size={24} />}
            </button>
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-sm p-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div><h1 className="text-xl font-bold text-gray-800">{currentUser.name} ({getRoleName(currentUser.role)})</h1><p className="text-sm text-gray-500">{effectiveSettings.schoolName}</p></div>
                        <button onClick={() => window.location.reload()} className="p-2 text-gray-500 hover:bg-gray-200 hover:text-cyan-600 rounded-full transition-colors self-center" title="تحديث التطبيق"><RefreshCw size={20} /></button>
                    </div>
                    <div className="flex items-center gap-2">
                        <a href="https://www.instagram.com/trbawetk/?utm_source=qr&igsh=MXNoNTNmdDRncnNjag%3D%3D#" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-gray-200 transition-colors"><img src="https://i.imgur.com/J6SeeNQ.png" alt="Instagram" className="w-8 h-8" /></a>
                        <a href="https://www.facebook.com/profile.php?id=61578356680977" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-gray-200 transition-colors"><img src="https://i.imgur.com/zC26Bw6.png" alt="Facebook" className="w-8 h-8" /></a>
                        {isPrincipal && <a href="https://t.me/trbwetk" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-gray-200 transition-colors"><img src="https://i.imgur.com/YsOAIfV.png" alt="Telegram" className="w-8 h-8" /></a>}
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 p-4 sm:p-6 lg:p-8">
                    {latestGuidance && (activeView === 'home' || activeView === 'class_manager') && <div className="mb-6"><GuidanceDisplay guidance={latestGuidance} /></div>}
                    {showAboutButton && (
                         <div className="mb-6 space-y-4">
                             <button onClick={() => setIsVideoModalOpen(true)} className="w-full flex items-center gap-4 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-all duration-300 hover:shadow-md text-red-700"><PlayCircle className="w-12 h-12" /><div><h4 className="font-bold text-red-800">شاهد العرض التوضيحي</h4><p className="text-sm text-red-600">تعرف على إمكانيات الحقيبة الرقمية في دقيقتين.</p></div></button>
                            <button onClick={() => setIsAboutModalOpen(true)} className="w-full text-center p-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-xl rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3"><Info size={28} /><span>تعرف من نحن</span></button>
                        </div>
                    )}
                    {renderView()}
                </main>
            </div>
             {isVideoModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[100] p-4" onClick={() => setIsVideoModalOpen(false)}>
                    <div className="bg-black p-2 rounded-lg shadow-xl w-full max-w-4xl relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setIsVideoModalOpen(false)} className="absolute -top-3 -right-3 bg-white text-black rounded-full p-2 z-10 shadow-lg hover:scale-110 transition-transform"><X size={24} /></button>
                        <div className="relative w-full" style={{ paddingTop: '56.25%' }}><iframe className="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/Pi35fNJIx08?autoplay=1" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe></div>
                    </div>
                </div>
            )}
            <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
        </div>
    );
}