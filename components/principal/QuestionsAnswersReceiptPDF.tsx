import React from 'react';
import type { SchoolSettings } from '../../types.ts';
import type { PageConfig } from './QuestionsAnswersReceiptView.tsx';

interface QuestionsAnswersReceiptPDFProps {
    settings: SchoolSettings;
    subtitle: string;
    pagesConfig: PageConfig[];
    teacherNames: Record<string, Record<string, string>>;
}

const LiftedText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ position: 'relative', bottom: '7px' }}>{children}</div>
);

const ReceiptPage: React.FC<{
    page: PageConfig;
    settings: SchoolSettings;
    subtitle: string;
    teacherNames: Record<string, string> | undefined;
}> = ({ page, settings, subtitle, teacherNames }) => (
    <div className="pdf-page-qa-receipt w-[794px] h-[1123px] bg-white p-10 flex flex-col font-['Cairo']" dir="rtl">
        <header className="flex-shrink-0">
            <div className="flex justify-between items-start text-xl font-bold">
                <div>
                    إدارة<br />
                    <span className="border-b-2 border-dotted border-black px-4">{settings.schoolName || '..............................'}</span>
                </div>
                <div className="text-center">
                    <p>م / استلام أسئلة واجوبة امتحانات</p>
                    <p className="text-blue-600 font-bold -mt-1">{subtitle}</p>
                    <p className="mt-1">العام الدراسي ( {settings.academicYear} )</p>
                    <p className="text-red-500 mt-1">{page.grade}</p>
                </div>
                <div className="w-48"></div> {/* Spacer */}
            </div>
        </header>

        <main className="flex-grow mt-8">
            <table className="w-full border-collapse border-2 border-black">
                <thead className="bg-yellow-200 font-bold text-lg">
                    <tr>
                        <th className="border-2 border-black p-2 w-[4%]"><LiftedText>ت</LiftedText></th>
                        <th className="border-2 border-black p-2 w-[20%]"><LiftedText>اسم المادة</LiftedText></th>
                        <th className="border-2 border-black p-2 w-[20%]"><LiftedText>{page.teacherLabel}</LiftedText></th>
                        <th className="border-2 border-black p-2 w-[12%]"><LiftedText>توقيعه</LiftedText></th>
                        <th className="border-2 border-black p-2 w-[12%]"><LiftedText>الدور الاول</LiftedText></th>
                        <th className="border-2 border-black p-2 w-[12%]"><LiftedText>الدور الثاني</LiftedText></th>
                        <th className="border-2 border-black p-2 w-[10%]"><LiftedText>اسم المستلم</LiftedText></th>
                        <th className="border-2 border-black p-2 w-[10%]"><LiftedText>توقيعه</LiftedText></th>
                    </tr>
                </thead>
                <tbody className="text-md">
                    {page.subjects.map((subject, index) => (
                        <tr key={subject} className="h-14">
                            <td className="border-2 border-black text-center font-bold"><LiftedText>{index + 1}</LiftedText></td>
                            <td className="border-2 border-black text-center font-semibold"><LiftedText>{subject}</LiftedText></td>
                            <td className="border-2 border-black text-center font-semibold"><LiftedText>{teacherNames?.[subject] || ''}</LiftedText></td>
                            <td className="border-2 border-black"></td>
                            <td className="border-2 border-black"></td>
                            <td className="border-2 border-black"></td>
                            <td className="border-2 border-black"></td>
                            <td className="border-2 border-black"></td>
                        </tr>
                    ))}
                    {/* Fill empty rows */}
                    {Array.from({ length: 12 - page.subjects.length }).map((_, i) => (
                        <tr key={`empty-${i}`} className="h-14">
                            <td className="border-2 border-black text-center font-bold"><LiftedText>{page.subjects.length + i + 1}</LiftedText></td>
                             <td className="border-2 border-black"></td>
                             <td className="border-2 border-black"></td>
                             <td className="border-2 border-black"></td>
                             <td className="border-2 border-black"></td>
                             <td className="border-2 border-black"></td>
                             <td className="border-2 border-black"></td>
                             <td className="border-2 border-black"></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </main>
        
        <footer className="flex-shrink-0 mt-auto text-center">
             <div className="flex justify-end">
                <div className="text-center font-bold text-xl">
                    <p>رئيس اللجنة الامتحانية</p>
                    <p>{settings.principalName || '--------------------------'}</p>
                </div>
            </div>
        </footer>
    </div>
);

export default function QuestionsAnswersReceiptPDF({ settings, subtitle, pagesConfig, teacherNames }: QuestionsAnswersReceiptPDFProps) {
    return (
        <div className="hidden-for-preview" style={{ position: 'absolute', left: '-9999px', top: '0' }}>
            {pagesConfig.map(page => (
                <ReceiptPage 
                    key={page.grade}
                    page={page}
                    settings={settings}
                    subtitle={subtitle}
                    teacherNames={teacherNames[page.grade]}
                />
            ))}
        </div>
    );
}