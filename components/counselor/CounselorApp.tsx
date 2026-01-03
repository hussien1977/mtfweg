
import React, { useState, useMemo, useEffect } from 'react';
import { Home, LogOut, ChevronsRight, ChevronsLeft, MessageSquare, Award, Settings as SettingsIcon, RefreshCw, Star, BookHeart, MessageCircle, Bell, X, CloudRain, GraduationCap } from 'lucide-react';
import type { SchoolSettings, ClassData, User as CurrentUser, StudentSubmission, ParentContact, StudentNotification } from '../../types.ts';
import { DEFAULT_SCHOOL_SETTINGS } from '../../constants.ts';
import { db } from '../../lib/firebase.ts';
import CounselorParentCommunication from './CounselorParentCommunication.tsx';
import BehavioralHonorsManager from './BehavioralHonorsManager.tsx';
import HonorBoardView from '../shared/HonorBoardView.tsx';
import CounselorStudentEvaluation from './CounselorStudentEvaluation.tsx';
import CounselorGuidance from './CounselorGuidance.tsx';
import SchoolForum from '../shared/SchoolForum.tsx';
import NotificationsModal from '../NotificationsModal.tsx';
import CounselorMoodTracker from './CounselorMoodTracker.tsx';
import CounselorGradesView from './CounselorGradesView.tsx';


interface NavItem {
    view: 'home' | 'parent_communication' | 'honors_manager' | 'honor_board_view' | 'student_evaluation' | 'guidance' | 'school_forum' | 'mood_tracker' | 'student_grades';
    icon: React.ElementType;
    label: string;
}

interface NavButtonProps {
    item: NavItem;
    isCollapsed: boolean;
    onClick: () => void;
    isActive: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ item, isCollapsed, onClick, isActive }) => {
    const isForum = item.view === 'school_forum';
    let colorClass = isActive ? 'bg-cyan-600 text-white shadow-inner' : 'hover:bg-gray-700';
    
    if (isForum) {
        colorClass = isActive 
            ? 'bg-green-600 text-white shadow-inner' 
            : 'text-green-400 hover:bg-gray-700 hover:text-green-300';
    }

    return (
        <button 
            onClick={onClick}
            className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg transition-colors ${colorClass} ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? item.label : ''}
        >
            <item.icon size={20} />
            {!isCollapsed && <span className="truncate">{item.label}</span>}
        </button>
    );
};

const UnderMaintenance = ({ featureName }: { featureName: string }) => (
    <div className="text-center p-8 bg-white rounded-lg shadow-lg flex flex-col items-center justify-center h-full">
        <SettingsIcon className="w-16 h-16 text-yellow-500 mb-4 animate-spin" />
        <h2 className="text-2xl font-bold text-gray-800">ميزة "{featureName}" قيد الصيانة</h2>
        <p className="mt-2 text-gray-600 max-w-md">نعمل حالياً على إصلاح هذه الميزة وستعود للعمل قريباً. شكراً لتفهمكم وصبركم.</p>
    </div>
);


interface CounselorAppProps {
    currentUser: CurrentUser;
    onLogout: () => void;
    users: CurrentUser[];
}

export default function CounselorApp({ currentUser, onLogout, users }: CounselorAppProps) {
    const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [activeView, setActiveView] = useState<NavItem['view']>('home');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
    const [parentContacts, setParentContacts] = useState<ParentContact[]>([]);

    // Notification State
    const [notifications, setNotifications] = useState<StudentNotification[]>([]);
    const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);

    const principalId = currentUser.principalId;

    useEffect(() => {
        if (!principalId) return;

        const settingsRef = db.ref(`settings/${principalId}`);
        const classesRef = db.ref('classes');
        const submissionsRef = db.ref(`student_submissions/${principalId}`);
        const contactsRef = db.ref(`parent_contacts/${principalId}`);
        const notificationsRef = db.ref(`student_notifications/${principalId}/${currentUser.id}`);


        const settingsCallback = (snapshot: any) => setSettings(snapshot.val() || DEFAULT_SCHOOL_SETTINGS);
        const classesCallback = (snapshot: any) => {
            const data = snapshot.val();
            const allClassesList: ClassData[] = data ? Object.values(data) as ClassData[] : [];
            setClasses(allClassesList.filter((c: ClassData) => c.principalId === principalId));
        };
        const submissionsCallback = (snapshot: any) => {
            const data = snapshot.val();
            setSubmissions(data ? Object.values(data) : []);
        };
        const contactsCallback = (snapshot: any) => {
             const data = snapshot.val();
             setParentContacts(data ? Object.values(data) : []);
        };
        const notificationsCallback = (snapshot: any) => {
            const data = snapshot.val();
            const notifs = data ? Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value })) : [];
            setNotifications(notifs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        };

        settingsRef.on('value', settingsCallback);
        classesRef.on('value', classesCallback);
        submissionsRef.on('value', submissionsCallback);
        contactsRef.on('value', contactsCallback);
        notificationsRef.on('value', notificationsCallback);

        return () => {
            settingsRef.off('value', settingsCallback);
            classesRef.off('value', classesCallback);
            submissionsRef.off('value', submissionsCallback);
            contactsRef.off('value', contactsCallback);
            notificationsRef.off('value', notificationsCallback);
        };
    }, [principalId, currentUser.id]);
    
    const handleOpenNotifications = () => {
        setIsNotificationsModalOpen(true);
        const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
        if (unreadIds.length > 0 && principalId) {
            const updates: Record<string, any> = {};
            unreadIds.forEach(id => {
                updates[`/${id}/isRead`] = true;
            });
            db.ref(`student_notifications/${principalId}/${currentUser.id}`).update(updates);
        }
    };

    const unreadNotificationsCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

    const counselorNavItems: NavItem[] = [
        { view: 'home', icon: Home, label: 'الرئيسية' },
        { view: 'student_grades', icon: GraduationCap, label: 'نتائج الطلاب' },
        { view: 'student_evaluation', icon: Star, label: 'تقييم الطلاب' },
        { view: 'mood_tracker', icon: CloudRain, label: 'مقياس المزاج' },
        { view: 'school_forum', icon: MessageCircle, label: 'منتدى المدرسة' },
        { view: 'guidance', icon: BookHeart, label: 'التوجيهات التربوية' },
        { view: 'parent_communication', icon: MessageSquare, label: 'مخاطبة ولي الامر' },
        { view: 'honors_manager', icon: Award, label: 'ادارة لوحة الشرف' },
        { view: 'honor_board_view', icon: Award, label: 'عرض لوحة الشرف' },
    ];

    const renderView = () => {
        const featureName = counselorNavItems.find(item => item.view === activeView)?.label || 'الميزة المحددة';
        switch (activeView) {
            case 'student_grades':
                return <CounselorGradesView classes={classes} settings={settings} />;
            case 'student_evaluation':
                return <CounselorStudentEvaluation currentUser={currentUser} classes={classes} users={users} />;
            case 'mood_tracker':
                 return <CounselorMoodTracker currentUser={currentUser} classes={classes} users={users} />;
            case 'guidance':
                return <CounselorGuidance currentUser={currentUser} />;
            case 'parent_communication':
                const principal = users.find(user => user.id === currentUser.principalId);
                if (!principal) {
                    return (
                        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                            <h2 className="text-2xl font-bold text-red-600">خطأ</h2>
                            <p className="mt-4 text-lg text-gray-600">
                                لا يمكن الوصول لبيانات المدير. يرجى التأكد من أن حساب المرشد مرتبط بمدير مدرسة.
                            </p>
                        </div>
                    );
                }
                return <CounselorParentCommunication principal={principal} settings={settings} />;
            case 'honors_manager':
                return <BehavioralHonorsManager currentUser={currentUser} classes={classes} users={users} submissions={submissions} />;
            case 'honor_board_view':
                return <HonorBoardView currentUser={currentUser} classes={classes} />;
            case 'school_forum':
                return <SchoolForum currentUser={currentUser} />;
            case 'home':
            default:
                return (
                     <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                        <h2 className="text-3xl font-bold text-gray-800">مرحباً بك في صفحة الإرشاد التربوي</h2>
                        <p className="mt-4 text-lg text-gray-600">
                            هنا يمكنك إدارة التواصل مع أولياء الأمور وتكريم الطلاب المتميزين سلوكياً ومتابعة درجاتهم ومزاجهم العام. اختر إحدى الأدوات من القائمة الجانبية للبدء.
                        </p>
                    </div>
                );
        }
    };
    
    return (
        <div className="flex h-screen bg-gray-200 relative" dir="rtl">
             <NotificationsModal
                isOpen={isNotificationsModalOpen}
                onClose={() => setIsNotificationsModalOpen(false)}
                notifications={notifications}
            />

            <div className={`bg-gray-800 text-white flex flex-col transition-all duration-300 relative ${isSidebarCollapsed ? 'w-0 p-0 border-none' : 'w-64'} overflow-hidden`}>
                <div className="flex items-center justify-center p-4 border-b border-gray-700 h-16">
                    {!isSidebarCollapsed && <span className="font-bold text-xl whitespace-nowrap">إدارة الإرشاد التربوي</span>}
                </div>

                <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                    {counselorNavItems.map(item => (
                        <NavButton
                            key={item.view}
                            item={item}
                            isCollapsed={isSidebarCollapsed}
                            onClick={() => setActiveView(item.view)}
                            isActive={activeView === item.view}
                        />
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-700">
                    <button onClick={onLogout} className={`flex items-center w-full gap-3 px-4 py-2 rounded-lg hover:bg-red-700 bg-red-600/80 transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? "تسجيل الخروج" : ''}>
                        <LogOut size={20} />
                        {!isSidebarCollapsed && <span>تسجيل الخروج</span>}
                    </button>
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
                            <h1 className="text-xl font-bold text-gray-800">{currentUser.name} (مرشد تربوي)</h1>
                            <p className="text-sm text-gray-500">{settings.schoolName}</p>
                        </div>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="p-2 text-gray-500 hover:bg-gray-200 hover:text-cyan-600 rounded-full transition-colors self-center"
                            title="تحديث التطبيق للحصول على آخر التغييرات"
                        >
                            <RefreshCw size={20} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={handleOpenNotifications} className="relative text-gray-600 hover:text-cyan-600 p-2 rounded-full hover:bg-gray-200 transition-colors">
                            <Bell size={24} />
                            {unreadNotificationsCount > 0 && (
                                <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                                </span>
                            )}
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 p-4 sm:p-6 lg:p-8">
                    {renderView()}
                </main>
            </div>
        </div>
    );
}
