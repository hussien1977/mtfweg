import React from 'react';
import type { SchoolSettings, User } from '../../types.ts';

interface MinutesPDFPageProps {
    settings: SchoolSettings;
    meetingDay: string;
    meetingDate: string;
    meetingAgenda: string;
    users: User[];
}

const LiftedText: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div style={{ position: 'relative', bottom: '8px' }} className={className}>
        {children}
    </div>
);

export default function MinutesPDFPage({ settings, meetingDay, meetingDate, meetingAgenda, users }: MinutesPDFPageProps) {
    const teacherName = users.find(u => u.role === 'teacher')?.name || '.....................';

    return (
        <div className="w-[794px] h-[1123px] bg-white p-12 flex flex-col font-['Cairo']" dir="rtl">
            <header className="text-center mb-12">
                <h1 className="text-4xl font-bold border-b-4 border-black pb-4">محضر اجتماع الهيئات التعليمية</h1>
            </header>

            <main className="flex-grow text-2xl leading-loose">
                <p className="mb-8">
                    <span>انه في يوم</span>
                    <span className="font-bold border-b-2 border-dotted border-black px-4 mx-2">{meetingDay || '...........'}</span>
                    <span>الموافق</span>
                    <span className="font-bold border-b-2 border-dotted border-black px-4 mx-2">{meetingDate || '..... / ..... / .....'}</span>
                    <span>اجتمعت الهيئة التعليمية في مدرسة</span>
                    <span className="font-bold border-b-2 border-dotted border-black px-4 mx-2">{settings.schoolName}</span>
                    <span>برئاسة مدير المدرسة السيد</span>
                    <span className="font-bold border-b-2 border-dotted border-black px-4 mx-2">{settings.principalName}</span>
                    <span>وبحضور كافة اعضاء الهيئة التعليمية.</span>
                </p>

                <p className="mb-4">وقد تم في الاجتماع مناقشة ما يلي:</p>
                <div 
                    className="whitespace-pre-wrap border-2 border-gray-200 p-6 rounded-lg bg-gray-50 min-h-[400px]"
                    dangerouslySetInnerHTML={{ __html: meetingAgenda.replace(/\n/g, '<br />') }}
                />
            </main>

            <footer className="mt-auto pt-16 flex justify-between items-end text-xl font-bold">
                <div className="text-center">
                    <p>الهيئة التعليمية</p>
                    <p className="mt-20">{teacherName}</p>
                </div>
                <div className="text-center">
                    <p>مدير المدرسة</p>
                    <p className="mt-20">{settings.principalName}</p>
                </div>
            </footer>
        </div>
    );
}