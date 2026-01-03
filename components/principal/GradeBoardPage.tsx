import React from 'react';
import type { ClassData, SchoolSettings, Student, StudentResult, CalculatedGrade } from '../../types';

const MINISTERIAL_STAGES = ['الثالث متوسط', 'السادس العلمي', 'السادس الادبي'];

// New component for vertical headers using CSS transform
const VerticalHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className="" }) => {
    return (
        <th className={`border border-black p-1 align-middle text-center ${className}`}>
            <div className="relative w-full h-32 flex items-center justify-center">
                <span 
                    className="absolute font-bold"
                    style={{
                        transform: 'rotate(-90deg)',
                        whiteSpace: 'normal',
                        textAlign: 'center',
                        maxWidth: '120px',
                        display: 'inline-block',
                    }}
                >
                    {children}
                </span>
            </div>
        </th>
    );
};


interface GradeBoardPageProps {
    settings: SchoolSettings;
    ministryLogo: string | null;
    students: Student[];
    classData?: ClassData;
    resultsData: Map<string, { finalCalculatedGrades: Record<string, CalculatedGrade>; result: StudentResult }>;
    pageInfo: {
        pageNumber: number;
        startingIndex: number;
    };
}

const GradeCell: React.FC<{
    originalGrade: number | null;
    decisionGrade: number | null;
    decisionApplied: number;
}> = ({ originalGrade, decisionGrade, decisionApplied }) => {

    if (decisionGrade === null) {
        return <td className="border border-black"></td>;
    }

    const cellColor = decisionGrade < 50 ? 'text-red-600' : 'text-black';

    if (decisionApplied > 0 && decisionGrade === 50 && originalGrade && originalGrade < 50) {
        return (
            <td className="border border-black text-center font-bold p-1 relative h-full text-xl">
                <span className={`text-red-600`}>{originalGrade}</span>
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-red-600 transform -rotate-[20deg] scale-x-110"></div>
                <span className="absolute top-0 left-1 text-sm text-black font-extrabold">50</span>
            </td>
        );
    }

    return (
        <td className={`border border-black text-center font-bold text-xl ${cellColor}`}>
            {decisionGrade}
        </td>
    );
};

export default function GradeBoardPage({ settings, ministryLogo, students, classData, resultsData, pageInfo }: GradeBoardPageProps) {
    if (!classData) return <div>لا توجد بيانات للصف</div>;
    const isMinisterial = MINISTERIAL_STAGES.includes(classData.stage);
    const subjects = classData.subjects || [];

    return (
        <div className="w-[1580px] p-6 bg-white flex flex-col font-['Cairo']" dir="rtl" style={{border: '4px solid #facc15'}}>
            <header className="text-center mb-2">
                <h1 className="text-5xl font-extrabold text-red-600">بورد درجات</h1>
                <h2 className="text-3xl font-extrabold">استمارة الدرجات للصف {classData.stage} للعام الدراسي ({settings.academicYear})</h2>
            </header>
            
            <div className="flex justify-between items-center text-lg font-semibold mb-2 px-4">
                <span>المديرية العامة لتربية: {settings.directorate}</span>
                <span>تاريخ تنظيم الاستمارة: {new Date().toLocaleDateString('ar-EG')}</span>
            </div>
            
            <div className="flex justify-center my-2">
                {ministryLogo ? (
                    <img src={ministryLogo} alt="شعار الوزارة" className="h-24 w-24 object-contain" />
                ) : (
                    <div className="h-24 w-24 flex items-center justify-center border-2 border-dashed rounded-full text-gray-400">شعار الوزارة</div>
                )}
            </div>

            <div className="flex justify-between items-center text-lg font-semibold mb-2 px-4" style={{ position: 'relative', bottom: '20px' }}>
                 <span>اسم المدرسة: {settings.schoolName}</span>
                 <span>رمز المدرسة: {settings.schoolCode}</span>
            </div>

            <main className="flex-grow">
                <table className="w-full border-collapse border border-black text-lg">
                    <thead className="bg-[#a7f3d0] font-bold">
                        <tr>
                            <th className="border border-black p-2 w-[4%]">ت</th>
                            <th className="border border-black p-2 w-[18%]">اسم الطالب</th>
                            <th className="border border-black p-2 w-[8%]">الرقم الامتحاني</th>
                            {subjects.map(subject => (
                                <VerticalHeader key={subject.id}>
                                    {subject.name}
                                </VerticalHeader>
                            ))}
                            <VerticalHeader className="w-[8%]">النتيجة</VerticalHeader>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student, index) => {
                             const studentResult = resultsData.get(student.id);
                             let resultText = '';
                             if (studentResult) {
                                if (isMinisterial) {
                                    resultText = (studentResult.result.status === 'مؤهل' || studentResult.result.status === 'مؤهل بقرار') ? 'مؤهل' : 'غير مؤهل';
                                } else {
                                     resultText = studentResult.result.status === 'ناجح' ? 'ناجح' : (studentResult.result.status === 'مكمل' ? 'مكمل' : 'راسب');
                                }
                             }
                             const resultColor = resultText === 'ناجح' || resultText === 'مؤهل' ? 'text-black' : 'text-red-600';
                             const rowStyle = index % 2 === 0 ? { backgroundColor: '#e0f2fe' } : { backgroundColor: '#fee2e2' };
                            return (
                                <tr key={student.id} style={rowStyle} className="align-top">
                                    <td className="border border-black text-center font-bold bg-yellow-200">{pageInfo.startingIndex + index + 1}</td>
                                    <td className="border border-black p-2 text-right font-bold text-xl"><div style={{ position: 'relative', bottom: '11px' }}>{student.name}</div></td>
                                    <td className="border border-black text-center font-semibold text-lg">{student.examId}</td>
                                    
                                    {subjects.map(subject => {
                                        const calculated = studentResult?.finalCalculatedGrades?.[subject.name];
                                        const gradeToDisplay = isMinisterial ? calculated?.annualPursuitWithDecision : calculated?.finalGradeWithDecision;
                                        const originalGrade = isMinisterial ? calculated?.annualPursuit : calculated?.finalGrade1st;
                                        const decisionApplied = isMinisterial ? (calculated?.decisionAppliedOnPursuit || 0) : (calculated?.decisionApplied || 0);
                                        
                                        return <GradeCell key={subject.id} originalGrade={originalGrade ?? null} decisionGrade={gradeToDisplay ?? null} decisionApplied={decisionApplied} />;
                                    })}

                                    <td className={`border border-black text-center font-bold ${resultColor}`}>{resultText}</td>
                                </tr>
                            )
                        })}
                        {/* Empty rows to fill up to 20 */}
                        {Array.from({ length: 20 - students.length }).map((_, index) => (
                             <tr key={`empty-${index}`} className={ (students.length + index) % 2 === 0 ? 'bg-[#e0f2fe]' : 'bg-[#fee2e2]'}>
                                <td className="border border-black text-center font-bold bg-yellow-200">{pageInfo.startingIndex + students.length + index + 1}</td>
                                <td className="border border-black h-12"></td>
                                <td className="border border-black"></td>
                                {subjects.map(subject => (
                                    <td key={subject.id} className="border border-black"></td>
                                ))}
                                <td className="border border-black"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>
            <footer className="mt-auto pt-4 flex justify-between font-bold text-lg">
                <span>اسم وتوقيع المشرف المتابع</span>
                <span>اسم وتوقيع مدير المدرسة<br/>{settings.principalName}</span>
            </footer>
        </div>
    );
}