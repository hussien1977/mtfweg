
import React from 'react';
import type { ClassData, SchoolSettings, Student, StudentResult, CalculatedGrade, Subject, SubjectGrade } from '../types.ts';

interface AdminReportCardProps {
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
    studentIndex: number;
    exportWithGrades: boolean;
}

const DEFAULT_SUBJECT_GRADE: SubjectGrade = { firstTerm: null, midYear: null, secondTerm: null, finalExam1st: null, finalExam2nd: null };
const DEFAULT_CALCULATED_GRADE: CalculatedGrade = { annualPursuit: null, finalGrade1st: null, finalGradeWithDecision: null, decisionApplied: 0, finalGrade2nd: null, isExempt: false };

// Component for Vertical Text Header
const VerticalHeader: React.FC<{ children: React.ReactNode; className?: string; textSize?: string }> = ({ children, className = '', textSize = 'text-base' }) => {
    return (
        <th className={`p-0 border-2 border-black align-middle text-center h-48 ${className}`}>
            <div className="h-full w-full flex items-center justify-center relative overflow-hidden">
                <span 
                    className={`absolute font-bold text-black ${textSize}`}
                    style={{
                        transform: 'rotate(-90deg)',
                        whiteSpace: 'nowrap',
                        width: '200px', // Ensure width doesn't clip when rotated
                        textAlign: 'center'
                    }}
                >
                    {children}
                </span>
            </div>
        </th>
    );
};

// Component for Grade Cells
const GradeCell: React.FC<{ value: number | null | undefined, className?: string }> = ({ value, className = '' }) => {
    return (
        <td className={`border-2 border-black text-center font-bold text-lg p-1 h-10 ${className}`}>
            {value ?? ''}
        </td>
    );
};

export default function AdminReportCard({ student, classData, settings, studentResultData, logos, studentIndex, exportWithGrades }: AdminReportCardProps) {
    const { finalCalculatedGrades, result } = studentResultData;

    const renderLogo = (logo: string | null, defaultText: string) => {
        return (
            <div className="h-40 w-40 flex items-center justify-center text-center text-sm p-1">
                {logo ? 
                    <img src={logo} alt={defaultText} className="h-full w-full object-contain" /> :
                    <div className="h-36 w-36 rounded-full border-4 border-dashed border-gray-400 flex items-center justify-center text-gray-500 font-bold text-xl">
                        {defaultText}
                    </div>
                }
            </div>
        )
    };
    
    // Use subjects directly without padding to ensure no empty rows
    const subjects = classData.subjects || [];
    const rowCount = subjects.length;

    return (
        <div className="w-[794px] h-[1123px] p-6 bg-white font-['Cairo'] flex flex-col box-border" dir="rtl">
            
            {/* Header Section */}
            <header className="flex justify-between items-center mb-6 px-2">
                {renderLogo(logos.ministry, 'شعار الوزارة')}
                
                <div className="text-center flex flex-col items-center flex-grow mx-4">
                    <h1 className="text-4xl font-extrabold text-black mb-2">سجل</h1>
                    <h2 className="text-3xl font-extrabold text-black mb-2">الدرجات للمدارس المتوسطة والثانوية</h2>
                    <p className="text-2xl font-bold text-red-600 mt-2">السـنة الدراسيـة {settings.academicYear}</p>
                    
                    {/* Removed border and background from student name */}
                    <div className="mt-6 text-3xl font-extrabold text-black px-6 py-2">
                        اسم الطالب : {student.name}
                    </div>
                </div>

                {renderLogo(logos.school, 'شعار المدرسة')}
            </header>
            
            {/* Sub-Header Info - Removed border-b-4 and Exam ID */}
            <div className="flex justify-between items-center px-4 mb-2 text-xl font-bold pb-2">
                <div className="text-right">
                    <span className="text-blue-800">الصف والشعبة:</span> {classData.stage} {classData.section}
                </div>
                 <div className="text-center">
                    <span className="text-blue-800">سجل القيد:</span> {student.registrationId || ''}
                </div>
                <div className="text-left">
                     <span className="text-red-600">المواليد :</span> {student.birthDate || ''}
                </div>
            </div>

            {/* Main Table */}
            <main className="flex-grow">
                <table className="w-full border-collapse border-4 border-black">
                    <thead className="bg-yellow-300 text-black font-bold text-lg">
                        <tr>
                            <VerticalHeader className="w-[18%]">الدروس</VerticalHeader>
                            <VerticalHeader className="w-[6%]">معدل النصف الاول</VerticalHeader>
                            <VerticalHeader className="w-[6%]">نصف السنة</VerticalHeader>
                            <VerticalHeader className="w-[6%]">معدل النصف الثاني</VerticalHeader>
                            <VerticalHeader className="w-[6%]">درجة السعي السنوي</VerticalHeader>
                            <VerticalHeader className="w-[6%]">درجة الامتحان النهائي</VerticalHeader>
                            <VerticalHeader className="w-[6%]">الدرجة النهائية</VerticalHeader>
                            <VerticalHeader className="w-[6%]">درجة الاكمال</VerticalHeader>
                            <VerticalHeader className="w-[6%]" textSize="text-sm">الدرجة النهائية بعد الاكمال</VerticalHeader>
                            <VerticalHeader className="w-[15%]">النتيجة</VerticalHeader>
                        </tr>
                    </thead>
                    <tbody>
                        {subjects.map((subject, index) => {
                            const grades = (student.grades?.[subject.name] || DEFAULT_SUBJECT_GRADE);
                            const calculated = (finalCalculatedGrades[subject.name] || DEFAULT_CALCULATED_GRADE);
                            
                            // Alternating Row Colors: White / Light Orange
                            const rowBackgroundColor = index % 2 !== 0 ? '#ffedd5' : '#ffffff';

                            return (
                                <tr key={subject.id} className="h-12" style={{ backgroundColor: rowBackgroundColor }}>
                                    {/* Subject Name */}
                                    <td className="border-2 border-black font-extrabold text-xl text-right align-middle px-3">
                                        {subject.name}
                                    </td>

                                    {/* Grades */}
                                    {exportWithGrades ? (
                                        <>
                                            <GradeCell value={grades.firstTerm} />
                                            <GradeCell value={grades.midYear} />
                                            <GradeCell value={grades.secondTerm} />
                                            
                                            <GradeCell value={calculated.annualPursuit} />
                                            {calculated.isExempt ? (
                                                <td className="border-2 border-black text-center font-bold text-lg text-blue-800">معفو</td>
                                            ) : (
                                                <GradeCell value={grades.finalExam1st} />
                                            )}
                                            <GradeCell value={calculated.finalGradeWithDecision} />
                                            
                                            <GradeCell value={grades.finalExam2nd} />
                                            <GradeCell value={calculated.finalGrade2nd} />
                                        </>
                                    ) : (
                                        // Empty Cells if no grades
                                        <>
                                            <td className="border-2 border-black"></td>
                                            <td className="border-2 border-black"></td>
                                            <td className="border-2 border-black"></td>
                                            <td className="border-2 border-black"></td>
                                            <td className="border-2 border-black"></td>
                                            <td className="border-2 border-black"></td>
                                            <td className="border-2 border-black"></td>
                                            <td className="border-2 border-black"></td>
                                        </>
                                    )}

                                    {/* Result Column (Merged) - Forced White Background */}
                                    {index === 0 && (
                                        <td rowSpan={rowCount} className="border-2 border-black align-middle text-center p-0 bg-white" style={{ backgroundColor: 'white' }}>
                                            {exportWithGrades && result.status !== 'قيد الانتظار' && (
                                                <div className="h-full w-full flex items-center justify-center relative">
                                                    <span 
                                                        className="absolute font-extrabold text-3xl"
                                                        style={{
                                                            transform: 'rotate(-90deg)',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {result.message}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </main>

            {/* Footer Section - Removed border-t-4 */}
            <footer className="mt-6 pt-4">
                <div className="flex justify-between items-start text-xl font-bold">
                    <div className="text-right w-1/3">
                         <div className="flex items-center gap-4 mb-4">
                            <span>درجة السلوك:</span>
                            <span className="inline-block w-24 border-b-4 border-black"></span>
                        </div>
                        <p className="mt-8">سنوات الرسوب : {student.yearsOfFailure || ''}</p>
                    </div>

                    <div className="text-center flex flex-col items-center w-1/3">
                        <p className="mb-2 font-extrabold">الرقم الامتحاني</p>
                        <div className="w-48 h-16 border-4 border-black bg-[#ff00ff] flex items-center justify-center text-3xl font-black text-black shadow-lg">
                             {student.examId}
                        </div>
                    </div>

                    <div className="text-center w-1/3">
                        <p className="mb-10 text-2xl">{settings.principalName}</p>
                        <p className="text-xl">مدير المدرسة</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
