
import React from 'react';
import type { SchoolSettings, Student, StudentResult, CalculatedGrade, SubjectGrade } from '../types.ts';
import { numberToArabicWords } from '../lib/numberToWords.ts';
import type { DetailedStats } from './TeacherLogExporter.tsx';

const DEFAULT_SUBJECT_GRADE: SubjectGrade = { firstTerm: null, midYear: null, secondTerm: null, finalExam1st: null, finalExam2nd: null };
const DEFAULT_CALCULATED_GRADE: CalculatedGrade = { annualPursuit: null, finalGrade1st: null, finalGradeWithDecision: null, decisionApplied: 0, finalGrade2nd: null, isExempt: false };

interface TeacherLogPageProps {
    settings: SchoolSettings;
    logos: { school: string | null; ministry: string | null };
    pageData: {
        students: Student[];
        classInfo: { stage: string; sections: string };
        subjectName: string;
        teacherName: string;
    };
    resultsData: Map<string, { finalCalculatedGrades: Record<string, CalculatedGrade>; result: StudentResult }>;
    stats: DetailedStats;
    pageNumber: number;
    totalPages: number;
    showSummary: boolean;
    maxRows: number;
    startingIndex: number;
    colors?: {
        header: string;
        oddRow: string;
        evenRow: string;
    };
}

const LiftedCellContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ position: 'relative', bottom: '10px' }}>{children}</div>
);

const GradeCell: React.FC<{ value: number | null, className?: string }> = ({ value, className = '' }) => (
    <td className={`border-l-2 border-black text-center px-1 align-top ${className}`}>
        <LiftedCellContent>{value !== null && value !== undefined ? value : ''}</LiftedCellContent>
    </td>
);

const StatsRow: React.FC<{ title: string; stats: DetailedStats[keyof DetailedStats]; colorClass: string }> = ({ title, stats, colorClass }) => (
    <tr className={colorClass}>
        <td className="border border-black p-2 font-bold">{title}</td>
        <td className="border border-black p-2 text-center font-bold">{stats.total > 0 ? stats.total : ''}</td>
        <td className="border border-black p-2 text-center font-bold">{stats.total > 0 ? stats.passed : ''}</td>
        <td className="border border-black p-2 text-center font-bold">{stats.total > 0 ? stats.failed : ''}</td>
        <td className="border border-black p-2 text-center font-bold">{stats.total > 0 ? stats.passRate : ''}</td>
    </tr>
);


export default function TeacherLogPage({ settings, logos, pageData, resultsData, stats, pageNumber, totalPages, showSummary, maxRows, startingIndex, colors }: TeacherLogPageProps) {

    const { students, classInfo, subjectName, teacherName } = pageData;

    const renderLogo = (logo: string | null, defaultText: string) => (
        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center p-1">
            {logo ? 
                <img src={logo} alt={defaultText} className="h-full w-full object-contain rounded-full" /> :
                <span className="text-gray-500 text-center text-sm font-bold">{defaultText}</span>
            }
        </div>
    );
    
    // Create empty rows to ensure consistent page height if not full, but only if explicitly requested by logic (which is removed in logic now but kept here just in case visually needed for table structure, though student list shouldn't be padded)
    const emptyRowsCount = Math.max(0, maxRows - students.length);
    const emptyRows = Array.from({ length: emptyRowsCount });

    return (
        <div className="w-[794px] h-[1123px] py-8 px-[44px] bg-white flex flex-col font-['Cairo']" style={{ direction: 'rtl' }}>
            {/* Header */}
            <header className="flex justify-between items-center mb-2">
                {renderLogo(logos.ministry, 'شعار الوزارة')}
                <div className="text-center">
                    <h1 className="text-xl font-bold">{settings.schoolName}</h1>
                    <h2 className="text-2xl font-bold text-red-600">سجل درجات المدرسين في المدارس المتوسطة</h2>
                   <p className="text-lg font-black text-blue-700">الصف: {classInfo.stage}</p>

<p className="text-lg font-bold">السنة الدراسية {settings.academicYear}</p>
                </div>
                {renderLogo(logos.school, 'شعار المدرسة')}
            </header>
            
            <div className="flex justify-between items-center mb-2 text-lg font-bold">
                <div>الموضوع: {subjectName}</div>
                <div>الشعبة: {classInfo.sections}</div>
            </div>

            {/* Main Table */}
            <main className="flex-grow">
                <table className="w-full border-collapse border-2 border-black text-sm">
                    <thead className="font-bold" style={{ backgroundColor: colors?.header || '#fde047' }}>
                        <tr>
                            <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[4%]"><LiftedCellContent>تسلسل</LiftedCellContent></th>
                            <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[20%] whitespace-nowrap"><LiftedCellContent>اسم الطالب</LiftedCellContent></th>
                            <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[8%]"><LiftedCellContent>معدل الفصل الأول</LiftedCellContent></th>
                            <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[8%]"><LiftedCellContent>نصف السنة</LiftedCellContent></th>
                            <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[8%]"><LiftedCellContent>معدل الفصل الثاني</LiftedCellContent></th>
                            <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[9%]"><LiftedCellContent>درجة السعي السنوي</LiftedCellContent></th>
                            <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[9%]"><LiftedCellContent>درجة امتحان اخر السنة</LiftedCellContent></th>
                            <th colSpan={2} className="border-2 border-black p-1 w-[18%]"><LiftedCellContent>الدرجة النهائية</LiftedCellContent></th>
                            <th rowSpan={2} className="border-2 border-black p-1 align-middle"><LiftedCellContent>الملاحظات</LiftedCellContent></th>
                        </tr>
                        <tr>
                            <th className="border-2 border-black p-1"><LiftedCellContent>رقما</LiftedCellContent></th>
                            <th className="border-2 border-black p-1"><LiftedCellContent>كتابة</LiftedCellContent></th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student, index) => {
                            const isTransferred = student.enrollmentStatus === 'transferred';
                            const isDismissed = student.enrollmentStatus === 'dismissed';

                            const result = resultsData.get(student.id)?.finalCalculatedGrades[subjectName] || DEFAULT_CALCULATED_GRADE;
                            const grade = student.grades?.[subjectName] || DEFAULT_SUBJECT_GRADE;
                            const finalGrade = result.finalGradeWithDecision;
                            const status = finalGrade !== null ? (finalGrade >= 50 ? 'ناجح' : 'راسب') : '';
                            
                            let rowBg = index % 2 !== 0 ? (colors?.evenRow || '#fef9c3') : (colors?.oddRow || '#ffffff');
                            
                            if (isTransferred) rowBg = '#d8b4fe'; // Purple for transferred
                            if (isDismissed) rowBg = '#fca5a5'; // Red for dismissed

                            return (
                                <tr key={student.id} className="h-[32px] border-b-2 border-black" style={{ backgroundColor: rowBg }}>
                                    <td className="border-l-2 border-black text-center align-top"><LiftedCellContent>{startingIndex + index + 1}</LiftedCellContent></td>
                                    <td 
                                        className="border-l-2 border-black text-right px-1 font-black text-base align-top whitespace-nowrap"
                                        style={{ 
                                            fontWeight: 900, 
                                            textShadow: '0.2px 0 0 black' 
                                        }}
                                    >
                                        <LiftedCellContent>{student.name}</LiftedCellContent>
                                    </td>
                                    
                                    {isTransferred ? (
                                        <td colSpan={8} className="border-l-2 border-black text-center font-bold align-middle text-purple-900">
                                            <LiftedCellContent>منقول الى مدرسة اخرى</LiftedCellContent>
                                        </td>
                                    ) : isDismissed ? (
                                        <td colSpan={8} className="border-l-2 border-black text-center font-bold align-middle text-red-900 text-xs leading-tight pt-1">
                                            <LiftedCellContent>تم فصل الطالب للعام الدراسي الحالي لتجاوزة الغيابات المسموح بها</LiftedCellContent>
                                        </td>
                                    ) : (
                                        <>
                                            <GradeCell value={grade.firstTerm} />
                                            <GradeCell value={grade.midYear} />
                                            <GradeCell value={grade.secondTerm} />
                                            <GradeCell value={result.annualPursuit} />
                                            <GradeCell value={grade.finalExam1st} />
                                            <td className="border-l-2 border-black text-center align-top"><LiftedCellContent>{finalGrade}</LiftedCellContent></td>
                                            <td className="border-l-2 border-black text-center text-xs px-1 align-top"><LiftedCellContent>{numberToArabicWords(finalGrade ?? -1)}</LiftedCellContent></td>
                                            <td className="border-l-2 border-black text-center align-top"><LiftedCellContent>{status}</LiftedCellContent></td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                        {/* We are NOT rendering emptyRows here as per request requirement "3- لا داعي لترك صفوف أسماء فارغة في الجدول" */}
                    </tbody>
                </table>
                
                {showSummary && (
                    <div className="w-full mt-4">
                        <table className="w-full border-collapse border-2 border-black">
                            <thead className="bg-green-200">
                                <tr>
                                    <th className="border border-black p-2 font-bold w-[20%]">الاحصائية</th>
                                    <th className="border border-black p-2 font-bold w-[20%]">العدد الكلي</th>
                                    <th className="border border-black p-2 font-bold w-[20%]">عدد الناجحون</th>
                                    <th className="border border-black p-2 font-bold w-[20%]">عدد الراسبون</th>
                                    <th className="border border-black p-2 font-bold w-[20%]">النسبة الكلية</th>
                                </tr>
                            </thead>
                            <tbody>
                                <StatsRow title="الفصل الاول" stats={stats.firstTerm} colorClass="bg-pink-100" />
                                <StatsRow title="نصف السنة" stats={stats.midYear} colorClass="bg-blue-100" />
                                <StatsRow title="الفصل الثاني" stats={stats.secondTerm} colorClass="bg-yellow-100" />
                                <StatsRow title="السعي السنوي" stats={stats.annualPursuit} colorClass="bg-orange-100" />
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="mt-auto flex justify-between font-bold text-lg">
                <span>اسم مدرس المادة / {teacherName || '..............................'}</span>
                 <span>مدير المدرسة / {settings.principalName}</span>
            </footer>
        </div>
    );
}
