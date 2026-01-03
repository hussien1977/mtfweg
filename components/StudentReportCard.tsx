import React from 'react';
import type { ClassData, SchoolSettings, Student, StudentResult, CalculatedGrade, SubjectGrade } from '../types.ts';
import { numberToArabicWords } from '../lib/numberToWords.ts';

interface StudentReportCardProps {
    student: Student;
    classData: ClassData;
    settings: SchoolSettings;
    studentResultData: {
        finalCalculatedGrades: Record<string, CalculatedGrade>;
        result: StudentResult;
    };
    logos: {
        school: string | null;
        ministry: string | null;
    };
}

const DEFAULT_SUBJECT_GRADE: SubjectGrade = {
    firstTerm: null,
    midYear: null,
    secondTerm: null,
    finalExam1st: null,
    finalExam2nd: null,
};

const DEFAULT_CALCULATED_GRADE: CalculatedGrade = {
    annualPursuit: null,
    finalGrade1st: null,
    finalGradeWithDecision: null,
    decisionApplied: 0,
    finalGrade2nd: null,
    isExempt: false,
};

const GradeCell: React.FC<{ value: number | null | undefined; isFailing?: boolean }> = ({ value, isFailing = false }) => {
    const grade = value ?? ' ';
    const colorClass = value === null || value === undefined ? 'text-gray-500' : (value < 50 ? 'text-red-600' : 'text-black');
    return (
        <td className={`border border-black text-center font-bold text-lg ${colorClass}`}>
            {grade}
        </td>
    );
}

export default function StudentReportCard({ student, classData, settings, studentResultData, logos }: StudentReportCardProps) {
    const { finalCalculatedGrades, result } = studentResultData;
    const reportCardHeaders = ['المواد', 'الفصل الاول', 'نصف السنة', 'الفصل الثاني', 'السعي السنوي', 'الامتحان النهائي', 'الدرجة النهائية', 'درجة الاكمال', 'الدرجة بعد الاكمال'];
    
    const renderLogo = (logo: string | null, defaultText: string) => {
        if (logo) {
            return <img src={logo} alt={defaultText} className="h-20 w-20 object-contain rounded-full bg-white p-1" />;
        }
        return <div className="h-20 w-20 flex items-center justify-center bg-black text-white rounded-full text-center text-sm p-1">{defaultText}</div>
    }

    return (
        <div className="w-[794px] h-[1123px] p-6 bg-white flex flex-col font-['Cairo']" style={{ direction: 'rtl' }}>
            <div className="p-3 bg-violet-200 border-2 border-black rounded-lg shadow-lg">
                <header className="flex justify-between items-center text-center mb-2">
                    {renderLogo(logos.ministry, 'شعار الوزارة')}
                    <div className="flex-grow">
                        <h1 className="text-2xl font-bold">{settings.schoolName}</h1>
                        <h2 className="text-xl">نتيجة الطالب للعام الدراسي {settings.academicYear}</h2>
                    </div>
                    {renderLogo(logos.school, 'شعار المدرسة')}
                </header>

                <div className="flex justify-between items-center text-lg font-bold p-2 border-y-2 border-x-2 border-black bg-violet-100 rounded-t-md">
                    <span>اسم الطالب: {student.name}</span>
                    <span>{classData.stage} - ({classData.section})</span>
                </div>
                 <div className="flex justify-between items-center text-lg font-bold p-2 border-b-2 border-x-2 border-black bg-violet-100 rounded-b-md mb-2">
                    <span>الرقم الامتحاني: {student.examId}</span>
                    <span>الصف: {classData.stage}</span>
                </div>
            </div>

            <main className="flex-grow mt-2">
                <table className="w-full border-collapse border-2 border-black">
                    <thead className="bg-violet-200">
                        <tr>
                            {reportCardHeaders.map(header => (
                                <th key={header} className="p-2 border border-black font-bold">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(classData.subjects || []).map((subject, index) => {
                            const grades = student.grades?.[subject.name] || DEFAULT_SUBJECT_GRADE;
                            const calculated = finalCalculatedGrades[subject.name] || DEFAULT_CALCULATED_GRADE;
                            return (
                                <tr key={subject.id} className={index % 2 === 0 ? 'bg-white' : 'bg-violet-50'}>
                                    <td className="p-2 border border-black font-semibold text-right bg-violet-100">{subject.name}</td>
                                    <GradeCell value={grades.firstTerm} />
                                    <GradeCell value={grades.midYear} />
                                    <GradeCell value={grades.secondTerm} />
                                    <GradeCell value={calculated.annualPursuit} />
                                    {calculated.isExempt ? (
                                        <td className="border border-black text-center font-bold text-lg text-blue-800 bg-blue-100">
                                            معفو
                                        </td>
                                    ) : (
                                        <GradeCell value={grades.finalExam1st} />
                                    )}
                                    
                                    {(() => {
                                        const originalGrade = calculated.finalGrade1st;
                                        const decisionGrade = calculated.finalGradeWithDecision;
                                        const decisionApplied = calculated.decisionApplied;

                                        if (decisionApplied > 0 && decisionGrade === 50 && originalGrade !== null && originalGrade < 50) {
                                            return (
                                                <td className="border border-black text-center p-0 align-middle">
                                                    <div className="flex flex-col items-center justify-center h-full py-1 leading-tight">
                                                        <span className="text-xl font-bold text-black">{decisionGrade}</span>
                                                        <div className="relative">
                                                            <span className="text-md font-bold text-red-600">{originalGrade}</span>
                                                            <div className="absolute top-1/2 left-1/2 w-[140%] h-[2px] bg-red-600 transform -translate-x-1/2 -translate-y-1/2 -rotate-12"></div>
                                                        </div>
                                                    </div>
                                                </td>
                                            );
                                        }
                                        return <GradeCell value={decisionGrade} />;
                                    })()}

                                    <GradeCell value={grades.finalExam2nd} />
                                    <GradeCell value={calculated.finalGrade2nd} />
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </main>

            <footer className="mt-auto">
                <div className="flex justify-center items-center gap-4 text-xl font-bold p-2 border-2 border-black rounded-lg bg-violet-200 shadow-lg">
                    <span>نتيجة الدور الاول:</span>
                    <span className="px-4 py-1 bg-white rounded-md">{result.message}</span>
                </div>
                 <div className="text-center mt-2 text-sm text-gray-500">
                    <p>مدير المدرسة: {settings.principalName}</p>
                </div>
            </footer>
        </div>
    );
}