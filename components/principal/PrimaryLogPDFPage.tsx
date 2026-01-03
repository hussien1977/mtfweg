import React from 'react';
import type { ClassData, SchoolSettings, Student, SubjectGrade } from '../../types.ts';
import { numberToArabicWords } from '../../lib/numberToWords.ts';

interface PrimaryLogPDFPageProps {
    settings: SchoolSettings;
    classData: ClassData;
    students: Student[];
    examType: 'midYear' | 'finalYear';
}

const PRIMARY_PASSING_GRADE = 5;
const STUDENTS_PER_PAGE = 24;

// A cell with content that's slightly lifted up to look better.
const LiftedCell: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div style={{ position: 'relative', bottom: '6px' }} className={className}>
        {children}
    </div>
);

export default function PrimaryLogPDFPage({ settings, classData, students, examType }: PrimaryLogPDFPageProps) {
    const examTitle = examType === 'midYear' ? 'نصف السنة' : 'نهاية السنة';
    const gradeKey: keyof SubjectGrade = examType === 'midYear' ? 'midYear' : 'finalExam1st';
    
    const subjects = classData.subjects || [];

    // --- Calculate Stats for the ENTIRE class ---
    const allClassStudents = classData.students || [];
    let examinedCount = 0;
    let successCount = 0;
    let supplementaryCount = 0;
    let failCount = 0;

    allClassStudents.forEach(student => {
        const grades = student.grades || {};
        let allGradesEntered = true;
        
        const failingSubjectsCount = subjects.reduce((acc, subject) => {
            const grade = grades[subject.name]?.[gradeKey];
            if (grade === undefined || grade === null) {
                allGradesEntered = false;
            } else if (grade < PRIMARY_PASSING_GRADE) {
                return acc + 1;
            }
            return acc;
        }, 0);

        if (allGradesEntered) {
            examinedCount++;
            if (failingSubjectsCount === 0) {
                successCount++;
            } else if (failingSubjectsCount <= (settings.supplementarySubjectsCount || 3)) {
                supplementaryCount++;
            } else {
                failCount++;
            }
        }
    });

    const totalPassAndSupp = successCount + supplementaryCount;
    const successRate = examinedCount > 0 ? ((totalPassAndSupp / examinedCount) * 100).toFixed(0) : '0';
    // --- End Stats Calculation ---

    const displayRows = [...students];
    while(displayRows.length < STUDENTS_PER_PAGE) {
        displayRows.push(null as any);
    }
    
    return (
        <div className="w-[794px] h-[1123px] bg-white p-6 flex flex-col font-['Cairo']" dir="rtl">
            <header className="flex justify-between items-center font-bold text-lg mb-4">
                <div className="text-center">
                    <p>إدارة</p>
                    <p>{settings.schoolName}</p>
                </div>
                <div className="text-center">
                    <p>سجل الدرجات للصفوف الأولية</p>
                    <p>إمتحان {examTitle}</p>
                    <p>{settings.academicYear}</p>
                </div>
                 <div className="text-center">
                    <p>الصف والشعبة</p>
                    <p>{classData.stage} / {classData.section}</p>
                </div>
            </header>

            <main className="flex-grow">
                <table className="w-full border-collapse border-2 border-black text-sm">
                    <thead className="font-bold text-center text-xs">
                        <tr style={{ backgroundColor: '#fef9c3' }}>
                            <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[3%]"><LiftedCell>التسلسل</LiftedCell></th>
                            <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[8%]"><LiftedCell>التولد</LiftedCell></th>
                            <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[8%]"><LiftedCell>رقم القبول</LiftedCell></th>
                            <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[20%]"><LiftedCell>اسم التلميذ</LiftedCell></th>
                            
                            {/* Vertical Subject Headers */}
                            {subjects.map(subject => (
                                <th rowSpan={2} key={subject.id} className="border-2 border-black p-0 h-36 align-middle w-12">
                                    <div className="h-full w-full flex items-center justify-center relative">
                                        <div 
                                            className="transform -rotate-90 absolute"
                                            style={{ width: '130px' }} // This width becomes the height of the text block and allows wrapping
                                        >
                                            <p className="font-bold text-center" style={{ fontSize: '11px', lineHeight: '1.2' }}>
                                                {subject.name}
                                            </p>
                                        </div>
                                    </div>
                                </th>
                            ))}
                            
                            <th colSpan={2} className="border-2 border-black p-1"><LiftedCell>المجموع</LiftedCell></th>
                            
                            <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[8%]"><LiftedCell>نتيجة الدور الأول</LiftedCell></th>
                            <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[8%]"><LiftedCell>نتيجة الدور الثاني</LiftedCell></th>
                        </tr>
                        <tr style={{ backgroundColor: '#fef9c3' }}>
                            {/* Sub-headers for المجموع */}
                            <th className="border-2 border-black p-1 w-[5%]"><LiftedCell>رقماً</LiftedCell></th>
                            <th className="border-2 border-black p-1 w-[8%]"><LiftedCell>كتابةً</LiftedCell></th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayRows.map((student, index) => {
                            const grades = student?.grades || {};
                            const failingSubjects: string[] = [];
                            let allGradesEntered = true;
                            let totalGrade = 0;

                            subjects.forEach(subject => {
                                const grade = grades[subject.name]?.[gradeKey];
                                if (grade === undefined || grade === null) {
                                    allGradesEntered = false;
                                } else {
                                    totalGrade += grade;
                                    if (grade < PRIMARY_PASSING_GRADE) {
                                        failingSubjects.push(subject.name);
                                    }
                                }
                            });

                            let resultText = '';
                            if (student && allGradesEntered) {
                                if (failingSubjects.length === 0) {
                                    resultText = 'ناجح';
                                } else if (failingSubjects.length <= (settings.supplementarySubjectsCount || 3)) {
                                    resultText = 'مكمل';
                                } else {
                                    resultText = 'راسب';
                                }
                            }

                            return (
                                <tr key={student?.id ?? `empty-${index}`} className="h-9">
                                    <td className="border-2 border-black text-center"><LiftedCell>{student ? index + 1 : ''}</LiftedCell></td>
                                    <td className="border-2 border-black text-center"><LiftedCell>{student?.birthDate}</LiftedCell></td>
                                    <td className="border-2 border-black text-center"><LiftedCell>{student?.examId || student?.registrationId}</LiftedCell></td>
                                    <td className="border-2 border-black text-right px-2 font-semibold"><LiftedCell>{student?.name}</LiftedCell></td>
                                    {subjects.map(subject => {
                                        const grade = student?.grades?.[subject.name]?.[gradeKey];
                                        const gradeText = (grade !== null && grade !== undefined) ? grade : '';
                                        return (
                                            <td key={subject.id} className={`border-2 border-black text-center font-bold ${grade !== null && grade !== undefined && grade < PRIMARY_PASSING_GRADE ? 'text-red-600' : ''}`}>
                                                <LiftedCell>{gradeText}</LiftedCell>
                                            </td>
                                        )
                                    })}
                                    <td className="border-2 border-black text-center font-bold"><LiftedCell>{student && allGradesEntered ? totalGrade : ''}</LiftedCell></td>
                                    <td className="border-2 border-black text-center font-bold text-xs"><LiftedCell>{student && allGradesEntered ? numberToArabicWords(totalGrade) : ''}</LiftedCell></td>
                                    <td className="border-2 border-black text-center font-bold"><LiftedCell>{resultText}</LiftedCell></td>
                                    <td className="border-2 border-black text-center font-bold"></td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </main>
            <footer className="mt-auto pt-4 font-bold text-xs">
                <table className="w-full border-collapse border-2 border-black mb-4">
                    <thead className="bg-yellow-100">
                        <tr>
                            <th className="border-2 border-black p-1">المشاركون</th>
                            <th className="border-2 border-black p-1">الناجحون</th>
                            <th className="border-2 border-black p-1">المكملون</th>
                            <th className="border-2 border-black p-1">الراسبون</th>
                            <th className="border-2 border-black p-1">نسبة النجاح</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border-2 border-black p-1 text-center">{examinedCount}</td>
                            <td className="border-2 border-black p-1 text-center">{successCount}</td>
                            <td className="border-2 border-black p-1 text-center">{supplementaryCount}</td>
                            <td className="border-2 border-black p-1 text-center">{failCount}</td>
                            <td className="border-2 border-black p-1 text-center">{successRate} %</td>
                        </tr>
                    </tbody>
                </table>
                <div className="flex justify-between items-end text-sm px-8">
                    <div>
                        <p>مرشد الصف</p>
                        <p>..................</p>
                    </div>
                    <div>
                        <p>المدير</p>
                        <p>{settings.principalName}</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}