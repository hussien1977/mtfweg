import React, { useState, useMemo } from 'react';
import type { Teacher, ClassData } from '../../types.ts';
import { BOOK_LINKS } from '../../data/bookLinks.ts';
import { Link as LinkIcon, Copy, Check, Info, Eye, X } from 'lucide-react';

interface TeacherLinksProps {
    teacher: Teacher;
    classes: ClassData[];
}

const normalizeAlef = (str: string) => str.replace(/[إأآ]/g, 'ا');

const findLinkKeyForSubject = (subjectName: string): string | null => {
    const allLinkKeys = Object.values(BOOK_LINKS).flatMap(subjects => Object.keys(subjects));
    const uniqueKeys = Array.from(new Set(allLinkKeys));

    const normalizedSubjectName = normalizeAlef(subjectName);

    // Find all keys that are a prefix of the subject name (after normalization)
    const matchingKeys = uniqueKeys.filter(key => normalizedSubjectName.startsWith(normalizeAlef(key)));
    
    if (matchingKeys.length === 0) {
        return null;
    }
    
    // Return the longest matching key to handle cases like 'اللغة العربية' vs 'اللغة العربية الجزء الاول' if both were keys
    return matchingKeys.reduce((a, b) => a.length > b.length ? a : b);
};


export default function TeacherLinks({ teacher, classes }: TeacherLinksProps) {
    const [copiedLink, setCopiedLink] = useState<string | null>(null);
    const [viewingLink, setViewingLink] = useState<string | null>(null);

    const assignmentsWithLinks = useMemo(() => {
        const assignmentsMap = new Map<string, {
            classStage: string;
            subjectName: string;
            links: string[] | null;
        }>();

        (teacher.assignments || []).forEach(assignment => {
            const classInfo = classes.find(c => c.id === assignment.classId);
            if (!classInfo) return;
            const subjectInfo = classInfo.subjects.find(s => s.id === assignment.subjectId);
            if (!subjectInfo) return;

            const linkKey = findLinkKeyForSubject(subjectInfo.name);
            const links = linkKey ? BOOK_LINKS[classInfo.stage]?.[linkKey] || null : null;
            
            const uniqueKey = `${classInfo.stage}-${linkKey || subjectInfo.name}`;
            if (!assignmentsMap.has(uniqueKey)) {
                assignmentsMap.set(uniqueKey, {
                    classStage: classInfo.stage,
                    subjectName: linkKey || subjectInfo.name, // Show base subject name
                    links: links,
                });
            }
        });

        return Array.from(assignmentsMap.values());
    }, [teacher.assignments, classes]);

    const handleCopy = (link: string) => {
        navigator.clipboard.writeText(link).then(() => {
            setCopiedLink(link);
            setTimeout(() => setCopiedLink(null), 2000);
        });
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4 flex items-center gap-3">
                <LinkIcon className="text-cyan-600" />
                روابط الكتب المنهجية
            </h2>

            <div className="bg-blue-50 border-r-4 border-blue-500 text-blue-800 p-4 mb-8 rounded-md flex items-start gap-4">
                <Info className="w-10 h-10 flex-shrink-0 mt-1 text-blue-400" />
                <div>
                    <h3 className="font-bold text-lg">الأستاذ الفاضل، نقدّر جهودكم العظيمة في إثراء العقول.</h3>
                    <p className="mt-2">
                        لتسهيل مهمتكم السامية، قمنا بتجميع روابط الكتب المنهجية لموادكم الدراسية. يمكنكم نسخ هذه الروابط والاستفادة منها في أداة <strong>'إدارة مسابقة XO'</strong> لتوليد بنك أسئلة ثري ومتنوع بالذكاء الاصطناعي.
                        هذا البنك سيكون حجر الأساس لمسابقات تعليمية تفاعلية ومبتكرة سنقدمها لكم قريبًا. استثمروا هذه الأداة لإطلاق العنان لإبداعكم.
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                {assignmentsWithLinks.length > 0 ? assignmentsWithLinks.map((item, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border shadow-sm">
                        <h4 className="text-xl font-bold text-gray-800">{item.subjectName}</h4>
                        <p className="text-sm text-gray-500 mb-3">{item.classStage}</p>
                        
                        {item.links ? (
                            <div className="space-y-3">
                                {item.links.map((link, linkIndex) => (
                                    <div key={linkIndex} className="flex items-center gap-3 bg-white p-2 border rounded-md">
                                        <LinkIcon className="text-gray-400 flex-shrink-0" />
                                        <p className="flex-grow font-mono text-sm text-gray-600 truncate" dir="ltr">{link}</p>
                                        <button onClick={() => handleCopy(link)} className="p-2 text-gray-600 hover:bg-gray-200 rounded-md transition-colors flex-shrink-0" title="نسخ الرابط">
                                            {copiedLink === link ? <Check className="text-green-600" size={20} /> : <Copy size={20} />}
                                        </button>
                                        <button onClick={() => setViewingLink(link)} className="p-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 transition-colors flex-shrink-0" title="فتح الكتاب">
                                            <Eye size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-orange-700 bg-orange-100 p-4 rounded-md border border-orange-200">
                                <p className="font-semibold">نعتذر، لم يتم توفير رابط الكتاب المنهجي لهذه المادة بعد.</p>
                                <p className="text-sm mt-1">فريقنا يعمل بجد لإضافته في أقرب فرصة، وسنوافيكم بالتحديثات فور توفره. نقدر تفهمكم.</p>
                            </div>
                        )}
                    </div>
                )) : (
                    <p className="text-center text-gray-500 p-8">لم يتم تعيين أي مواد لك بعد.</p>
                )}
            </div>

            {viewingLink && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-2 sm:p-4" onClick={() => setViewingLink(null)}>
                    <div className="bg-white rounded-lg shadow-xl w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>
                        <header className="flex-shrink-0 flex justify-between items-center p-3 border-b bg-gray-50">
                            <h3 className="font-bold text-gray-700 truncate" dir="ltr">{viewingLink}</h3>
                            <button onClick={() => setViewingLink(null)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transform hover:scale-110 transition-transform" aria-label="إغلاق">
                                <X size={24} />
                            </button>
                        </header>
                        <div className="flex-grow bg-gray-200">
                            <iframe
                                src={viewingLink}
                                title="عارض الكتب"
                                className="w-full h-full border-0"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}