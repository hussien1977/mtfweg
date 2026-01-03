import React, { useState, useMemo } from 'react';
import type { User, ClassData } from '../../types.ts';
import { BookText, BrainCircuit, CheckCircle, Clock, BookOpen, Download, X } from 'lucide-react';

// Data from user's provided images
const ENCYCLOPEDIA_LINKS: Record<string, Record<string, string>> = {
  'الاول متوسط': {
    'التربية الاسلامية': 'https://kadumjr-boop.github.io/ms1/',
    'الاحياء': 'https://kadumjr-boop.github.io/mh1/',
    'الاجتماعيات': 'https://kadumjr-boop.github.io/ma1/',
    'الفيزياء': 'https://kadumjr-boop.github.io/mp1/',
    'الكيمياء': 'https://kadumjr-boop.github.io/mc1/',
    'اللغة العربية': 'https://kadumjr-boop.github.io/mar1/',
    'اللغة الانكليزية': 'https://kadumjr-boop.github.io/men1/',
    'الحاسوب': 'https://kadumjr-boop.github.io/mhs1/'
  },
  'الثاني متوسط': {
    'التربية الاسلامية': 'https://kadumjr-boop.github.io/ms2/',
    'الاحياء': 'https://kadumjr-boop.github.io/mh2/',
    'الاجتماعيات': 'https://kadumjr-boop.github.io/mg2/',
    'الفيزياء': 'https://kadumjr-boop.github.io/mp2/',
    'الكيمياء': 'https://kadumjr-boop.github.io/mc2/',
    'اللغة العربية': 'https://kadumjr-boop.github.io/mar2/',
    'اللغة الانكليزية': 'https://kadumjr-boop.github.io/mn2/',
    'الحاسوب': 'https://kadumjr-boop.github.io/mh/' // As per OCR
  },
  'الثالث متوسط': {
    'الاحياء': 'https://salemali2230-alt.github.io/mo3',
    'اللغة العربية': 'https://salemali2230-alt.github.io/moar3',
    'اللغة الانكليزية': 'https://salemali2230-alt.github.io/eng3',
    'التربية الاسلامية': 'https://salemali2230-alt.github.io/moas3',
    'الكيمياء': 'https://salemali2230-alt.github.io/mok3',
    'الفيزياء': 'https://salemali2230-alt.github.io/mof3',
    'الاجتماعيات': 'https://salemali2230-alt.github.io/moj3',
  }
};

interface EducationalEncyclopediaProps {
    currentUser: User;
    classes: ClassData[];
}

export default function EducationalEncyclopedia({ currentUser, classes }: EducationalEncyclopediaProps) {
    const [viewingLink, setViewingLink] = useState<string | null>(null);

    const teacherAssignments = useMemo(() => {
        const uniqueAssignments = new Map<string, { stage: string, subjectName: string, link: string | null }>();
        
        (currentUser.assignments || []).forEach(assignment => {
            const classInfo = classes.find(c => c.id === assignment.classId);
            if (!classInfo) return;
            const subjectInfo = classInfo.subjects.find(s => s.id === assignment.subjectId);
            if (!subjectInfo) return;

            const key = `${classInfo.stage}-${subjectInfo.name}`;
            if (!uniqueAssignments.has(key)) {
                // The subject name in app data 'اللغة الإنكليزية' differs from link data 'اللغة الانكليزية'.
                // This handles the variation by replacing the character.
                const subjectNameToFind = subjectInfo.name.replace('الإنكليزية', 'الانكليزية');
                const link = ENCYCLOPEDIA_LINKS[classInfo.stage]?.[subjectNameToFind] || null;

                uniqueAssignments.set(key, {
                    stage: classInfo.stage,
                    subjectName: subjectInfo.name,
                    link: link
                });
            }
        });
        return Array.from(uniqueAssignments.values());
    }, [currentUser.assignments, classes]);

    return (
        <div className="max-w-7xl mx-auto">
             {viewingLink && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-[200] p-4" onClick={() => setViewingLink(null)}>
                    <div className="bg-white rounded-lg shadow-xl w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>
                        <header className="flex-shrink-0 flex justify-end items-center p-3 border-b bg-gray-50">
                            <button onClick={() => setViewingLink(null)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transform hover:scale-110 transition-transform" aria-label="إغلاق">
                                <X size={24} />
                            </button>
                        </header>
                        <div className="flex-grow bg-gray-200">
                            <iframe
                                src={viewingLink}
                                title="الموسوعة التعليمية"
                                className="w-full h-full border-0"
                            />
                        </div>
                    </div>
                </div>
            )}
            
            <div className="bg-slate-800 text-white p-8 rounded-2xl shadow-lg mb-10">
                <h2 className="text-3xl font-bold text-center mb-4">لأستاذ المادة الفاضل:</h2>
                <p className="text-center text-slate-300 mb-8 max-w-3xl mx-auto">
                    الموسوعة التعليمية ليست مجرد منصة أخرى، بل هي شريكك الرقمي في رحلة التعليم. تخيل أن بين يديك مكتبة ضخمة من الأسئلة التفاعلية والاختبارات المخصصة، مصممة بدقة لتتوافق مع كل فصل من فصول المنهج.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div className="space-y-2">
                        <CheckCircle className="mx-auto h-12 w-12 text-cyan-400" />
                        <h3 className="font-bold text-xl">قياس مستوى الطلاب</h3>
                        <p className="text-slate-400">بسهولة ودقة، يمكنك معرفة نقاط القوة والضعف لدى كل طالب أو صف.</p>
                    </div>
                    <div className="space-y-2">
                        <BrainCircuit className="mx-auto h-12 w-12 text-cyan-400" />
                        <h3 className="font-bold text-xl">تحفيز المشاركة</h3>
                        <p className="text-slate-400">حوّل المراجعة إلى لعبة ممتعة وتحدٍ شيق يحفز الطلاب على التفاعل والمنافسة الإيجابية.</p>
                    </div>
                    <div className="space-y-2">
                        <Clock className="mx-auto h-12 w-12 text-cyan-400" />
                        <h3 className="font-bold text-xl">توفير الوقت والجهد</h3>
                        <p className="text-slate-400">بدلاً من إعداد أسئلة لكل درس، يمكنك الاعتماد على محتوى غني ومتجدد جاهز للاستخدام الفوري.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {teacherAssignments.map(({ stage, subjectName, link }) => (
                    <div key={`${stage}-${subjectName}`} className="bg-white p-6 rounded-lg shadow-md border flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                             <div className="bg-purple-100 text-purple-600 p-3 rounded-full">
                                <BookText size={32} />
                            </div>
                            <div>
                                <h4 className="text-2xl font-bold text-gray-800">{subjectName}</h4>
                                <p className="text-md text-gray-500">{stage}</p>
                            </div>
                        </div>
                        {link ? (
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <button onClick={() => setViewingLink(link)} className="flex items-center gap-2 px-5 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-transform transform hover:scale-105">
                                    <BookOpen size={20} />
                                    <span>فتح الموسوعة</span>
                                </button>
                                <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105">
                                    <Download size={20} />
                                    <span>تحميل (HTML)</span>
                                </a>
                            </div>
                        ) : (
                            <div className="px-5 py-3 bg-gray-200 text-gray-500 font-semibold rounded-lg">
                                المحتوى قيد الإعداد
                            </div>
                        )}
                    </div>
                ))}
                 {teacherAssignments.length === 0 && (
                    <div className="text-center p-8 bg-gray-50 rounded-lg">
                        <p className="text-lg text-gray-600">لم يتم تعيين أي مواد لك بعد. يرجى مراجعة الإدارة.</p>
                    </div>
                )}
            </div>
        </div>
    );
}