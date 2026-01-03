import React, { useState } from 'react';
import type { User, SchoolSettings, ClassData } from '../../types.ts';
import { Settings, Map as MapIcon } from 'lucide-react';
import MinutesView from './MinutesView.tsx';
import Decision132View from './Decision132View.tsx';
import SignaturesView from './SignaturesView.tsx';
import ExamCommitteeView from './ExamCommitteeView.tsx';
import AuditingCommitteeView from './AuditingCommitteeView.tsx';
import SpecializationCommitteesView from './SpecializationCommitteesView.tsx';
import OralExamScheduleView from './OralExamScheduleView.tsx';
import WrittenExamScheduleView from './WrittenExamScheduleView.tsx';
import QuestionsAnswersReceiptView from './QuestionsAnswersReceiptView.tsx';
import SeatingChartsManager from './SeatingChartsManager.tsx';
import AbsenceDraftExporter from './AbsenceDraftExporter.tsx';
import ExamBookletsReceipt from './ExamBookletsReceipt.tsx';
import ExaminationRecord from './ExaminationRecord.tsx';

interface ExamControlLogProps {
    principal: User;
    users: User[];
    settings: SchoolSettings;
    classes: ClassData[];
}

type ExamLogPageKey =
    | 'index'
    | 'cover'
    | 'minutes'
    | 'decision132'
    | 'signatures'
    | 'committee'
    | 'auditing_committee'
    | 'specialization_committees'
    | 'oral_exam_schedule'
    | 'written_exam_schedule'
    | 'questions_answers_receipt'
    | 'seating_charts'
    | 'absence_form'
    | 'exam_booklets_receipt'
    | 'examination_record';

const logTopics = [
    { key: 'cover' as ExamLogPageKey, title: 'غلاف سجل السيطرة' },
    { key: 'minutes' as ExamLogPageKey, title: 'محضر اجتماع الهيئات التعليمية' },
    { key: 'decision132' as ExamLogPageKey, title: 'القرار ١٣٢' },
    { key: 'signatures' as ExamLogPageKey, title: 'توقيع الهيئات التعليمية على القرار ١٣٢' },
    { key: 'committee' as ExamLogPageKey, title: 'اللجنة الامتحانية واعمالها' },
    { key: 'auditing_committee' as ExamLogPageKey, title: 'لجنة التدقيق واعمالها' },
    { key: 'specialization_committees' as ExamLogPageKey, title: 'لجان الفحص حسب الاختصاص' },
    { key: 'oral_exam_schedule' as ExamLogPageKey, title: 'جدول الامتحانات الشفوية' },
    { key: 'written_exam_schedule' as ExamLogPageKey, title: 'جدول الامتحانات التحريرية' },
    { key: 'questions_answers_receipt' as ExamLogPageKey, title: 'استلام الأسئلة والاجوبة' },
    { key: 'seating_charts' as ExamLogPageKey, title: 'خرائط جلوس الطلبة' },
    { key: 'absence_form' as ExamLogPageKey, title: 'استمارة الغيابات اليومية للطلبة' },
    { key: 'exam_booklets_receipt' as ExamLogPageKey, title: 'استلام وتسليم رزم الدفاتر الامتحانية' },
    { key: 'examination_record' as ExamLogPageKey, title: 'محضر فحص وتدقيق' }
];

// --- Sub-Components for each page ---

const IndexView = ({ setCurrentPageKey }: { setCurrentPageKey: (key: ExamLogPageKey) => void }) => (
    <div className="bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-4xl font-bold text-center text-gray-800">سجل السيطرة الامتحانية</h1>
        <p className="text-center text-gray-600 mt-2">
            نظم امتحاناتك بدقة وسيطر بثقة !..الإدارة الامتحانية تبدأ بالذكاء... وتستمر بالنظام
        </p>
        <div className="mt-6 bg-green-100 border-r-4 border-green-500 p-4 rounded-md">
            <p className="font-bold text-green-800">
                تنقل بين صفحات سجل السيطرة من خلال النقر على عناوين الصفحات داخل الفهرس وعدل ما تحتاج تعديله وفرنا لك امكانية تعديل النماذج وتصديرها.
            </p>
        </div>
        <div className="mt-8">
            <div className="grid grid-cols-[1fr_auto] gap-x-4 border-2 border-orange-400 rounded-lg p-4 bg-gray-50">
                <div className="font-bold text-xl text-center border-b-2 border-orange-300 pb-2">الموضوع</div>
                <div className="font-bold text-xl text-center border-b-2 border-orange-300 pb-2">الصفحة</div>
                {logTopics.map((topic, index) => (
                    <React.Fragment key={index}>
                        <button
                            onClick={() => topic.key && setCurrentPageKey(topic.key)}
                            disabled={!topic.key}
                            className={`text-right p-3 rounded-md my-1 text-lg font-semibold ${topic.key ? 'bg-blue-50 hover:bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        >
                            {topic.title}
                        </button>
                        <div className="flex items-center justify-center p-3 my-1">
                            <span className="bg-orange-100 text-orange-700 font-bold px-4 py-2 rounded-md">{index + 1}</span>
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </div>
    </div>
);

const PageWrapper = ({ title, children, setCurrentPageKey, currentPageKey, onNext, onPrev }: { title: string, children?: React.ReactNode, setCurrentPageKey: (key: ExamLogPageKey) => void, currentPageKey: ExamLogPageKey, onNext?: () => void, onPrev?: () => void }) => {
    
    const handleNavigation = (direction: 'next' | 'prev') => {
        const currentIndex = logTopics.findIndex(p => p.key === currentPageKey);
        if (currentIndex === -1) return;

        const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

        if (newIndex >= 0 && newIndex < logTopics.length) {
            const newKey = logTopics[newIndex].key;
            if (newKey) {
                setCurrentPageKey(newKey);
            }
        }
    };
    
    return (
        <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => handleNavigation('prev')} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">&larr; الصفحة السابقة</button>
                <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
                <button onClick={() => handleNavigation('next')} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">الصفحة التالية &rarr;</button>
            </div>
            {children}
        </div>
    );
};

const CoverView = ({ setCurrentPageKey }: { setCurrentPageKey: (key: ExamLogPageKey) => void }) => (
    <PageWrapper title="غلاف سجل السيطرة" setCurrentPageKey={setCurrentPageKey} currentPageKey="cover">
        <div className="text-center bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
            <p className="text-lg font-semibold text-blue-800 mb-4">
                انشئ غلاف سجل السيطرة الخاص بك بكل احترافية وسهولة. وفرنا لك العديد من النماذج للتعديل السهل المباشر في تطبيق محرر صور المستندات المدرسية.
            </p>
            <a
                href="https://service-314929620446.us-west1.run.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-transform transform hover:-translate-y-1"
            >
                ابدأ انشاء غلاف سجل السيطرة الامتحانية
            </a>
        </div>
        <div className="mt-6 flex justify-center">
            <img src="https://i.imgur.com/FvdZ291.png" alt="غلاف سجل السيطرة" className="max-w-full h-auto rounded-lg shadow-md" />
        </div>
    </PageWrapper>
);

const UnderMaintenance = ({ featureName }: { featureName: string }) => (
    <div className="text-center p-8 bg-white rounded-lg shadow-lg flex flex-col items-center justify-center h-full">
        <Settings className="w-16 h-16 text-yellow-500 mb-4 animate-spin" />
        <h2 className="text-2xl font-bold text-gray-800">صفحة "{featureName}" قيد الصيانة</h2>
        <p className="mt-2 text-gray-600 max-w-md">نحن نعمل على إصلاح هذه الميزة وستعود للعمل قريباً. شكراً لتفهمكم وصبركم.</p>
    </div>
);


// --- Main Component ---

export default function ExamControlLog({ principal, users, settings, classes }: ExamControlLogProps) {
    const [currentPageKey, setCurrentPageKey] = React.useState<ExamLogPageKey>('index');

    const renderContent = () => {
        switch (currentPageKey) {
            case 'index':
                return <IndexView setCurrentPageKey={setCurrentPageKey} />;
            case 'cover':
                return <CoverView setCurrentPageKey={setCurrentPageKey} />;
            case 'minutes':
                return <MinutesView setCurrentPageKey={setCurrentPageKey} settings={settings} users={users} />;
            case 'decision132':
                return <Decision132View setCurrentPageKey={setCurrentPageKey} settings={settings} />;
            case 'signatures':
                return <SignaturesView setCurrentPageKey={setCurrentPageKey} settings={settings} users={users} />;
            case 'committee':
                return <ExamCommitteeView setCurrentPageKey={setCurrentPageKey} settings={settings} users={users} />;
            case 'auditing_committee':
                return <AuditingCommitteeView setCurrentPageKey={setCurrentPageKey} settings={settings} users={users} />;
            case 'specialization_committees':
                return <SpecializationCommitteesView setCurrentPageKey={setCurrentPageKey} settings={settings} users={users} classes={classes} />;
            case 'oral_exam_schedule':
                return <OralExamScheduleView setCurrentPageKey={setCurrentPageKey} settings={settings} classes={classes} />;
            case 'written_exam_schedule':
                return <WrittenExamScheduleView setCurrentPageKey={setCurrentPageKey} settings={settings} classes={classes} />;
            case 'questions_answers_receipt':
                return <QuestionsAnswersReceiptView setCurrentPageKey={setCurrentPageKey} settings={settings} classes={classes} />;
            case 'seating_charts':
                return <SeatingChartsManager setCurrentPageKey={setCurrentPageKey} />;
            case 'absence_form':
                return <AbsenceDraftExporter setCurrentPageKey={setCurrentPageKey} settings={settings} />;
            case 'exam_booklets_receipt':
                return <ExamBookletsReceipt settings={settings} setCurrentPageKey={setCurrentPageKey} />;
            case 'examination_record':
                return <ExaminationRecord settings={settings} />;
            default:
                const topic = logTopics.find(t => t.key === currentPageKey);
                if (topic) {
                    return (
                        <PageWrapper title={topic.title} setCurrentPageKey={setCurrentPageKey} currentPageKey={currentPageKey}>
                            <UnderMaintenance featureName={topic.title} />
                        </PageWrapper>
                    );
                }
                return <IndexView setCurrentPageKey={setCurrentPageKey} />; // Fallback
        }
    };

    return (
        <div>
            {renderContent()}
        </div>
    );
}