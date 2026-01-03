import React, { useState, useMemo } from 'react';
import type { User, ClassData } from '../../types';
import { BookText, BrainCircuit, X } from 'lucide-react';

interface EducationalEncyclopediaProps {
    currentUser: User;
    classes: ClassData[];
}

const ENCYCLOPEDIA_LINKS: Record<string, Record<string, string>> = {
  'الاول متوسط': {
    'التربية الاسلامية': 'https://kadumjr-boop.github.io/ms1/',
    'الاحياء': 'https://kadumjr-boop.github.io/mh1/',
    'الاجتماعيات': 'https://kadumjr-boop.github.io/ma1/',
    'الفيزياء': 'https://kadumjr-boop.github.io/mp1/',
    'الكيمياء': 'https://kadumjr-boop.github.io/mc1/',
    'اللغة العربية': 'https://kadumjr-boop.github.io/mar1/',
    'اللغة الإنكليزية': 'https://kadumjr-boop.github.io/men1/',
    'الحاسوب': 'https://kadumjr-boop.github.io/mhs1/'
  },
  'الثاني متوسط': {
    'التربية الاسلامية': 'https://kadumjr-boop.github.io/ms2/',
    'الاحياء': 'https://kadumjr-boop.github.io/mh2/',
    'الاجتماعيات': 'https://kadumjr-boop.github.io/mg2/',
    'الفيزياء': 'https://kadumjr-boop.github.io/mp2/',
    'الكيمياء': 'https://kadumjr-boop.github.io/mc2/',
    'اللغة العربية': 'https://kadumjr-boop.github.io/mar2/',
    'اللغة الإنكليزية': 'https://kadumjr-boop.github.io/mn2/',
    'الحاسوب': 'https://kadumjr-boop.github.io/mh/'
  },
  'الثالث متوسط': {
    'الاحياء': 'https://salemali2230-alt.github.io/mo3',
    'اللغة العربية': 'https://salemali2230-alt.github.io/moar3',
    'اللغة الإنكليزية': 'https://salemali2230-alt.github.io/eng3',
    'التربية الاسلامية': 'https://salemali2230-alt.github.io/moas3',
    'الكيمياء': 'https://salemali2230-alt.github.io/mok3',
    'الفيزياء': 'https://salemali2230-alt.github.io/mof3',
    'الاجتماعيات': 'https://salemali2230-alt.github.io/moj3',
  }
};

export default function EducationalEncyclopedia({ currentUser, classes }: EducationalEncyclopediaProps) {
    const [viewingLink, setViewingLink] = useState<string | null>(null);

    const studentClass = useMemo(() => {
        return classes.find(c => c.id === currentUser.classId);
    }, [classes, currentUser.classId]);

    const subjects = useMemo(() => {
        return studentClass?.subjects || [];
    }, [studentClass]);

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-5xl mx-auto">
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

            <div className="text-center">
                <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-600 mb-4">
                    الموسوعة التعليمية
                </h2>
                <p className="text-2xl font-bold mb-6">تعلّم بذكاء... تحدَّ نفسك... وتفوق! 💪</p>
                <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
                    وداعاً لطرق المذاكرة التقليدية! 😴 الموسوعة التعليمية هي منصة مبتكرة مصممة خصيصاً لتحويل دروسك إلى تحديات شيقة 🎮. استكشف آلاف الأسئلة المنظمة حسب فصول كتابك، وتنافس مع زملائك، وعزز فهمك للمادة بطريقة لم تعهدها من قبل. حان الوقت لتكتشف متعة التعلم الحقيقية! 🎉
                </p>
            </div>

            <div className="mt-10">
                <h3 className="text-2xl font-bold text-center mb-6">اختر المادة لتبدأ التحدي</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjects.map(subject => {
                        const link = ENCYCLOPEDIA_LINKS[currentUser.stage!]?.[subject.name];
                        return (
                            <button
                                key={subject.id}
                                onClick={() => link && setViewingLink(link)}
                                disabled={!link}
                                className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 font-bold text-xl rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300 ease-in-out border-t-4 border-cyan-400 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 disabled:transform-none disabled:shadow-md disabled:cursor-not-allowed"
                            >
                                <BrainCircuit size={48} className={`mb-3 ${link ? 'text-cyan-500' : 'text-gray-400'}`} />
                                <span>{subject.name}</span>
                                {!link && <span className="text-xs font-normal mt-2">(قريباً)</span>}
                            </button>
                        );
                    })}
                </div>
                {subjects.length === 0 && (
                     <p className="text-center text-gray-500 p-8">لم يتم تحديد مواد لهذه الشعبة بعد.</p>
                )}
            </div>
        </div>
    );
}