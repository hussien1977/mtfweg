import React, { useState } from 'react';
import type { User, ClassData, SchoolSettings } from '../../types.ts';
import { CalendarCog, Handshake, Users, CalendarSearch, Settings2, ShieldCheck, ClipboardPaste, PlayCircle, X } from 'lucide-react';
import ScheduleGenerator from './ScheduleGenerator.tsx';
import CollaborationPlatform from './CollaborationPlatform.tsx';
import TeacherScheduleView from './TeacherScheduleView.tsx';
import YardDutyManager from './YardDutyManager.tsx';
import YardDutyCollaborationPlatform from './YardDutyCollaborationPlatform.tsx';


interface SmartSchedulerProps {
    currentUser: User;
    classes: ClassData[];
    users: User[];
    settings: SchoolSettings;
}

type View = 'schedule_generator' | 'schedule_collaboration' | 'yard_duty_generator' | 'yard_duty_collaboration';

export default function SmartScheduler({ currentUser, classes, users, settings }: SmartSchedulerProps) {
    const [view, setView] = useState<View>('schedule_generator');
    const [isTutorialVisible, setIsTutorialVisible] = useState(false);
    
    const isPrincipal = currentUser.role === 'principal';
    
    const renderContent = () => {
        switch (view) {
            case 'schedule_generator':
                return isPrincipal ? <ScheduleGenerator currentUser={currentUser} users={users} classes={classes} settings={settings} /> : <TeacherScheduleView currentUser={currentUser} users={users} />;
            case 'schedule_collaboration':
                return <CollaborationPlatform currentUser={currentUser} users={users} />;
            case 'yard_duty_generator':
                 return <YardDutyManager currentUser={currentUser} users={users} />;
            case 'yard_duty_collaboration':
                 return <YardDutyCollaborationPlatform currentUser={currentUser} users={users} />;
            default:
                return null;
        }
    };

    const principalTabs = [
        { key: 'schedule_generator', label: 'تكوين الجدول الدراسي', icon: Settings2 },
        { key: 'schedule_collaboration', label: 'منصة التعاون والتنسيق', icon: Handshake },
        { key: 'yard_duty_generator', label: 'تكوين جدول مراقبة الساحة', icon: ShieldCheck },
        { key: 'yard_duty_collaboration', label: 'منصة التعاون في المراقبة', icon: ClipboardPaste },
    ];
    
    const teacherTabs = [
        { key: 'schedule_generator', label: 'عرض جدولي الدراسي', icon: CalendarSearch },
        { key: 'schedule_collaboration', label: 'طلبات التبديل (الدروس)', icon: Handshake },
        { key: 'yard_duty_generator', label: 'عرض جدول المراقبة', icon: ShieldCheck },
        { key: 'yard_duty_collaboration', label: 'طلبات التبديل (المراقبة)', icon: ClipboardPaste },
    ];
    
    const tabs = isPrincipal ? principalTabs : teacherTabs;

    return (
        <div className="space-y-8">
            <div className="text-center bg-white p-6 rounded-lg shadow-md">
                <h1 className="text-4xl font-bold text-cyan-700">تطبيق جدولي الذكي</h1>
                <p className="text-lg text-gray-600 mt-2">ثورة في تنظيم الوقت التعليمي للمعلمين والمدارس</p>
                
                <div className="mt-4">
                    <button
                        onClick={() => setIsTutorialVisible(true)}
                        className="inline-flex items-center gap-2 px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-transform transform hover:scale-105"
                    >
                        <PlayCircle size={20} />
                        عرض الشرح
                    </button>
                </div>

                {isTutorialVisible && (
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
                        onClick={() => setIsTutorialVisible(false)}
                    >
                        <div 
                            className="bg-black p-2 rounded-lg shadow-xl w-full max-w-4xl relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button 
                                onClick={() => setIsTutorialVisible(false)}
                                className="absolute top-0 right-0 -mt-4 -mr-4 bg-white text-black rounded-full p-2 z-10 shadow-lg hover:scale-110 transition-transform"
                                aria-label="Close video"
                            >
                                <X size={24} />
                            </button>
                            <div className="relative w-full" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
                                <iframe 
                                    className="absolute top-0 left-0 w-full h-full"
                                    src="https://www.youtube.com/embed/Ozx_m3KnpWE?autoplay=1" 
                                    title="شرح عمل جدول الحصص" 
                                    frameBorder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                    allowFullScreen
                                ></iframe>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="mb-6 flex justify-center border-b border-gray-300 flex-wrap">
                 {tabs.map(tab => (
                    <button 
                        key={tab.key}
                        onClick={() => setView(tab.key as View)}
                        className={`flex items-center gap-2 px-4 py-3 text-md font-semibold border-b-4 transition-colors ${view === tab.key ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                    >
                        <tab.icon size={20} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div>
                {renderContent()}
            </div>
        </div>
    );
}