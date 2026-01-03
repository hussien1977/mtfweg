import React from 'react';
import type { ClassData, SchoolSettings, Student, StudentResult, CalculatedGrade, SubjectGrade, Subject } from '../../types';

interface Primary56LogPDFPageProps {
    student: Student;
    classData: ClassData;
    settings: SchoolSettings;
    studentResultData: {
        finalCalculatedGrades: Record<string, CalculatedGrade>;
        result: StudentResult;
    };
}

const DEFAULT_SUBJECT_GRADE: SubjectGrade = {
    firstTerm: null, midYear: null, secondTerm: null, finalExam1st: null, finalExam2nd: null,
    october: null, november: null, december: null, january: null, february: null, march: null, april: null,
};

const DEFAULT_CALCULATED_GRADE: CalculatedGrade = {
    annualPursuit: null, finalGrade1st: null, finalGradeWithDecision: null, decisionApplied: 0,
    finalGrade2nd: null, isExempt: false,
};

// Helper component to lift text content
const LiftedCellContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ position: 'relative', bottom: '6px' }}>{children}</div>
);

const GradeCell: React.FC<{ value: number | null | undefined; className?: string }> = ({ value, className = '' }) => {
    const grade = value ?? '';
    const colorClass = value !== null && value !== undefined && value < 50 ? 'text-red-600' : 'text-black';
    return (
        <td className={`border border-black text-center p-0 h-8 font-semibold ${colorClass} ${className}`}>
            <LiftedCellContent>{grade}</LiftedCellContent>
        </td>
    );
};

// Header helper for vertical text
const VerticalHeader: React.FC<{ children: React.ReactNode; className?: string, rowSpan?: number }> = ({ children, className, rowSpan }) => (
    <th rowSpan={rowSpan} className={`border border-black p-1 align-middle ${className}`} style={{ writingMode: 'vertical-rl' }}>
        <LiftedCellContent>{children}</LiftedCellContent>
    </th>
);


const getSecondRoundResult = (finalCalculatedGrades: Record<string, CalculatedGrade>, subjects: Subject[]): string => {
    let secondRoundFailingCount = 0;
    let anySecondRoundGradeEntered = false;

    subjects.forEach(subject => {
        const gradeInfo = finalCalculatedGrades[subject.name];
        if (gradeInfo && gradeInfo.finalGrade2nd !== null) {
            anySecondRoundGradeEntered = true;
            if (gradeInfo.finalGrade2nd < 50) {
                secondRoundFailingCount++;
            }
        } else if (gradeInfo && gradeInfo.finalGradeWithDecision !== null && gradeInfo.finalGradeWithDecision < 50 && gradeInfo.finalGrade2nd === null) {
            // If the student was supplementary but didn't take the 2nd exam, they are considered failing.
            anySecondRoundGradeEntered = true;
            secondRoundFailingCount++;
        }
    });

    if (!anySecondRoundGradeEntered) return ''; // No second round exams taken yet
    return secondRoundFailingCount === 0 ? 'ناجح' : 'راسب';
};

export default function Primary56LogPDFPage({ student, classData, settings, studentResultData }: Primary56LogPDFPageProps) {
    const { finalCalculatedGrades, result } = studentResultData;

    // Use a fixed list of subjects based on the grade level to ensure consistent table structure
    const subjects = classData.subjects || [];

    const secondRoundResult = getSecondRoundResult(finalCalculatedGrades, subjects);

    return (
        <div className="w-[794px] h-[1123px] p-4 bg-white flex flex-col font-['Cairo']" dir="rtl">
            <header className="text-center font-bold mb-2">
                <div className="flex justify-between items-center text-sm">
                    <p><LiftedCellContent>إدارة: {settings.directorate || '..............'}</LiftedCellContent></p>
                    <p><LiftedCellContent>اسم المدرسة في النظام: {settings.schoolName}</LiftedCellContent></p>
                </div>
                <h1 className="text-xl mt-1"><LiftedCellContent>سجل درجات الصف {classData.stage} للعام الدراسي {settings.academicYear}</LiftedCellContent></h1>
            </header>

            <div className="grid grid-cols-2 gap-x-4 text-sm font-bold mb-2 border-y-2 border-black py-1">
                <p><LiftedCellContent>اسم الطالب: {student.name}</LiftedCellContent></p>
                <p><LiftedCellContent>الصف والشعبة: {classData.stage} / {classData.section}</LiftedCellContent></p>
                <p><LiftedCellContent>رقم القيد: {student.registrationId}</LiftedCellContent></p>
                <p><LiftedCellContent>التولد: {student.birthDate}</LiftedCellContent></p>
                <p><LiftedCellContent>اسم الأم: {student.motherName || '..................'}</LiftedCellContent></p>
            </div>

            <main className="flex-grow">
                <table className="w-full border-collapse border-2 border-black text-xs">
                    <thead className="font-bold text-center">
                        <tr className="bg-orange-200">
                            <th rowSpan={2} className="border border-black p-1 align-middle w-[15%]">
                                <LiftedCellContent>المواد</LiftedCellContent>
                            </th>
                            <th colSpan={5} className="border border-black p-1">
                                <LiftedCellContent>الفصل الأول</LiftedCellContent>
                            </th>
                            <VerticalHeader rowSpan={2} className="w-[6%] bg-yellow-200">السنة نصف</VerticalHeader>
                            <th colSpan={4} className="border border-black p-1">
                                <LiftedCellContent>الفصل الثاني</LiftedCellContent>
                            </th>
                            <th colSpan={5} className="border border-black p-1 bg-pink-200">
                                <LiftedCellContent>الدرجات النهائية</LiftedCellContent>
                            </th>
                        </tr>
                        <tr className="bg-orange-200">
                            <VerticalHeader className="w-[5%]">الاول تشرين</VerticalHeader>
                            <VerticalHeader className="w-[5%]">الثاني تشرين</VerticalHeader>
                            <VerticalHeader className="w-[5%]">الاول كانون</VerticalHeader>
                            <VerticalHeader className="w-[5%]">الثاني كانون</VerticalHeader>
                            <VerticalHeader className="w-[6%] bg-green-200">الأول فصل معدل</VerticalHeader>
                            
                            <VerticalHeader className="w-[5%]">شباط</VerticalHeader>
                            <VerticalHeader className="w-[5%]">آذار</VerticalHeader>
                            <VerticalHeader className="w-[5%]">نيسان</VerticalHeader>
                            <VerticalHeader className="w-[6%] bg-green-200">الثاني الفصل معدل</VerticalHeader>
                            
                            <VerticalHeader className="w-[6%] bg-pink-200">السنوي السعي </VerticalHeader>
                            <VerticalHeader className="w-[6%] bg-pink-200">النهائي الامتحان</VerticalHeader>
                            <VerticalHeader className="w-[6%] bg-pink-200">النهائية الدرجة</VerticalHeader>
                            <VerticalHeader className="w-[6%] bg-pink-200">الاكمال درجة</VerticalHeader>
                            <VerticalHeader className="w-[6%] bg-pink-200">الاكمال بعد الدرجة</VerticalHeader>
                        </tr>
                    </thead>
                    <tbody>
                        {subjects.map(subject => {
                            const grades = student.grades?.[subject.name] || DEFAULT_SUBJECT_GRADE;
                            const calculated = finalCalculatedGrades[subject.name] || DEFAULT_CALCULATED_GRADE;
                             
                            return (
                                <tr key={subject.id}>
                                    <td className="border border-black text-right px-2 font-bold bg-gray-100"><LiftedCellContent>{subject.name}</LiftedCellContent></td>
                                    <GradeCell value={grades.october} />
                                    <GradeCell value={grades.november} />
                                    <GradeCell value={grades.december} />
                                    <GradeCell value={grades.january} />
                                    <GradeCell value={calculated.annualPursuit !== null ? grades.firstTerm : null} className="bg-green-100" />
                                    <GradeCell value={grades.midYear} className="bg-yellow-100"/>
                                    <GradeCell value={grades.february} />
                                    <GradeCell value={grades.march} />
                                    <GradeCell value={grades.april} />
                                    <GradeCell value={calculated.annualPursuit !== null ? grades.secondTerm : null} className="bg-green-100" />
                                    <GradeCell value={calculated.annualPursuit} className="bg-pink-100"/>
                                    <GradeCell value={grades.finalExam1st} className="bg-pink-100"/>
                                    <GradeCell value={calculated.finalGradeWithDecision} className="bg-pink-100"/>
                                    <GradeCell value={grades.finalExam2nd} className="bg-pink-100"/>
                                    <GradeCell value={calculated.finalGrade2nd} className="bg-pink-100"/>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </main>

            <footer className="mt-4 text-sm font-bold">
                <div className="grid grid-cols-2 gap-2">
                    <div className="border-2 border-black p-1"><LiftedCellContent>نتيجة الدور الأول: {result.message}</LiftedCellContent></div>
                    <div className="border-2 border-black p-1"><LiftedCellContent>نتيجة الدور الثاني: {secondRoundResult}</LiftedCellContent></div>
                </div>
                <div className="text-left mt-4">
                    <p><LiftedCellContent>المدير</LiftedCellContent></p>
                    <p><LiftedCellContent>{settings.principalName}</LiftedCellContent></p>
                </div>
            </footer>
        </div>
    );
}