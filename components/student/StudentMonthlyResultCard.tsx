
import React, { useMemo } from 'react';
import type { User, SchoolSettings, PublishedMonthlyResult } from '../../types.ts';

interface StudentMonthlyResultCardProps {
    student: User;
    settings: SchoolSettings;
    resultsData: Record<string, PublishedMonthlyResult>;
}

const LiftedText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ position: 'relative', bottom: '5px' }}>
        {children}
    </div>
);

export default function StudentMonthlyResultCard({ student, settings, resultsData }: StudentMonthlyResultCardProps) {
    
    const processedData = useMemo(() => {
        const subjectsMap = new Map<string, {
            s1_m1: number | null;
            s1_m2: number | null;
            s2_m1: number | null;
            s2_m2: number | null;
        }>();

        const processMonth = (monthKey: string, targetField: 's1_m1' | 's1_m2' | 's2_m1' | 's2_m2') => {
            if (resultsData[monthKey]) {
                resultsData[monthKey].grades.forEach(g => {
                    if (!subjectsMap.has(g.subjectName)) {
                        subjectsMap.set(g.subjectName, { s1_m1: null, s1_m2: null, s2_m1: null, s2_m2: null });
                    }
                    const current = subjectsMap.get(g.subjectName)!;
                    current[targetField] = g.grade;
                });
            }
        };

        processMonth('firstSemMonth1', 's1_m1');
        processMonth('firstSemMonth2', 's1_m2');
        processMonth('secondSemMonth1', 's2_m1');
        processMonth('secondSemMonth2', 's2_m2');

        return Array.from(subjectsMap.entries()).map(([subjectName, grades]) => {
            const s1_avg = (grades.s1_m1 !== null && grades.s1_m2 !== null) 
                ? Math.round((grades.s1_m1 + grades.s1_m2) / 2) 
                : null;
            
            const s2_avg = (grades.s2_m1 !== null && grades.s2_m2 !== null) 
                ? Math.round((grades.s2_m1 + grades.s2_m2) / 2) 
                : null;

            return {
                subjectName,
                ...grades,
                s1_avg,
                s2_avg
            };
        });
    }, [resultsData]);

    const cardStyle: React.CSSProperties = {
        width: '794px',
        minHeight: '1123px',
        padding: '40px',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Cairo', sans-serif",
        direction: 'rtl',
    };
    
    const renderGrade = (grade: number | null) => {
        if (grade === null || grade === undefined) return '';
        return grade;
    };

    const getGradeColor = (grade: number | null) => {
        if (grade !== null && grade < 50) return 'text-red-600 font-bold';
        return 'text-black';
    };

    return (
        <div style={cardStyle}>
            <header className="flex-grow-0 border-b-2 border-black pb-4 mb-6">
                <div className="flex justify-between items-start text-lg font-bold">
                    <div className="text-right w-1/3">
                        <p>المديرية العامة للتربية في {settings.directorate || '......'}</p>
                        <p>إدارة: {settings.schoolName}</p>
                    </div>
                    <div className="text-center w-1/3">
                        <h1 className="text-2xl font-extrabold text-black mb-2">
                             بسم الله الرحمن الرحيم
                        </h1>
                        <h2 className="text-xl font-bold border-2 border-black p-1 inline-block">
                             نتائج الامتحانات الشهرية
                        </h2>
                    </div>
                    <div className="text-left w-1/3">
                        <p>العام الدراسي</p>
                        <p>{settings.academicYear}</p>
                    </div>
                </div>
                
                <div className="mt-6 flex justify-between items-center text-lg font-bold bg-gray-100 p-2 border-2 border-black rounded-md">
                    <div>الطالب: {student.name}</div>
                    <div>الصف: {student.stage} / {student.section}</div>
                </div>
            </header>

            <main className="flex-grow">
                <table className="w-full border-collapse border-2 border-black text-center">
                    <thead>
                        <tr className="bg-gray-200 text-lg font-bold">
                            <th rowSpan={2} className="border-2 border-black p-2 w-[20%] align-middle"><LiftedText>المادة</LiftedText></th>
                            <th colSpan={3} className="border-2 border-black p-1"><LiftedText>الفصل الأول</LiftedText></th>
                            <th colSpan={3} className="border-2 border-black p-1"><LiftedText>الفصل الثاني</LiftedText></th>
                            <th rowSpan={2} className="border-2 border-black p-2 w-[15%] align-middle"><LiftedText>الملاحظات</LiftedText></th>
                        </tr>
                        <tr className="bg-gray-100 text-base font-bold">
                            <th className="border-2 border-black p-1 w-[8%]"><LiftedText>شهر ١</LiftedText></th>
                            <th className="border-2 border-black p-1 w-[8%]"><LiftedText>شهر ٢</LiftedText></th>
                            <th className="border-2 border-black p-1 w-[10%] bg-yellow-100"><LiftedText>معدل الفصل ١</LiftedText></th>
                            <th className="border-2 border-black p-1 w-[8%]"><LiftedText>شهر ١</LiftedText></th>
                            <th className="border-2 border-black p-1 w-[8%]"><LiftedText>شهر ٢</LiftedText></th>
                            <th className="border-2 border-black p-1 w-[10%] bg-yellow-100"><LiftedText>معدل الفصل ٢</LiftedText></th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedData.map((row, index) => {
                            const rowColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                            return (
                                <tr key={row.subjectName} className={`text-lg font-semibold h-12 ${rowColor}`}>
                                    <td className="border-2 border-black p-1 text-right pr-3 font-bold">{row.subjectName}</td>
                                    
                                    <td className={`border-2 border-black p-1 ${getGradeColor(row.s1_m1)}`}>
                                        <LiftedText>{renderGrade(row.s1_m1)}</LiftedText>
                                    </td>
                                    <td className={`border-2 border-black p-1 ${getGradeColor(row.s1_m2)}`}>
                                        <LiftedText>{renderGrade(row.s1_m2)}</LiftedText>
                                    </td>
                                    <td className={`border-2 border-black p-1 bg-yellow-50 font-bold ${getGradeColor(row.s1_avg)}`}>
                                        <LiftedText>{renderGrade(row.s1_avg)}</LiftedText>
                                    </td>
                                    
                                    <td className={`border-2 border-black p-1 ${getGradeColor(row.s2_m1)}`}>
                                        <LiftedText>{renderGrade(row.s2_m1)}</LiftedText>
                                    </td>
                                    <td className={`border-2 border-black p-1 ${getGradeColor(row.s2_m2)}`}>
                                        <LiftedText>{renderGrade(row.s2_m2)}</LiftedText>
                                    </td>
                                    <td className={`border-2 border-black p-1 bg-yellow-50 font-bold ${getGradeColor(row.s2_avg)}`}>
                                        <LiftedText>{renderGrade(row.s2_avg)}</LiftedText>
                                    </td>
                                    
                                    <td className="border-2 border-black p-1"></td>
                                </tr>
                            );
                        })}
                        {Array.from({ length: Math.max(0, 14 - processedData.length) }).map((_, index) => (
                            <tr key={`empty-${index}`} className={`h-12 ${(processedData.length + index) % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                <td className="border-2 border-black"></td>
                                <td className="border-2 border-black"></td>
                                <td className="border-2 border-black"></td>
                                <td className="border-2 border-black bg-yellow-50"></td>
                                <td className="border-2 border-black"></td>
                                <td className="border-2 border-black"></td>
                                <td className="border-2 border-black bg-yellow-50"></td>
                                <td className="border-2 border-black"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>

            <footer className="flex-grow-0 mt-8 pt-4 border-t-2 border-black">
                <div className="flex justify-between items-end text-xl font-bold px-8">
                    <div className="text-center">
                        <p>مرشد الصف</p>
                        <p className="mt-8">........................</p>
                    </div>
                    <div className="text-center">
                        <p>مدير المدرسة</p>
                        <p className="mt-8">{settings.principalName}</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
