
import React from 'react';

// Re-using types from DailyGradeSheetManager.tsx
// In a real project, these would be in a shared types file.
interface Column {
  id: string;
  name: string;
  maxGrade: number;
}
interface StudentGrades {
  id: string;
  name: string;
  s1_m1_daily: Record<string, number | null>; s1_m1_written: number | null;
  s1_m2_daily: Record<string, number | null>; s1_m2_written: number | null;
  midYear: number | null;
  s2_m1_daily: Record<string, number | null>; s2_m1_written: number | null;
  s2_m2_daily: Record<string, number | null>; s2_m2_written: number | null;
  finalExam: number | null;
}
interface DailyGradeSheet {
  id: string; gradeLevel: string; section: string; subjectName: string; subjectId: string;
  teacherName: string; schoolName: string; academicYear: string;
  columnSettings: {
    s1_m1: Column[]; s1_m2: Column[];
    s2_m1: Column[]; s2_m2: Column[];
  };
  students: StudentGrades[];
}

interface PDFPageProps {
    sheet: DailyGradeSheet;
    students: StudentGrades[];
    calculatedData: Map<string, any>;
    orientation: 'landscape' | 'portrait';
    startingIndex: number;
}

const LiftedCellContent: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <div style={{ position: 'relative', bottom: '6px' }}>{children}</div>
);

const PDFCell: React.FC<{ children?: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
    <td className={`border-2 border-black text-center p-0 h-8 text-lg font-bold ${className}`}>
        <LiftedCellContent>{children}</LiftedCellContent>
    </td>
);

const VerticalHeader: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
    <th className={`border-2 border-black p-0 align-middle relative ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-bold whitespace-nowrap" style={{ writingMode: 'vertical-rl' }}>
                <LiftedCellContent>{children}</LiftedCellContent>
            </span>
        </div>
    </th>
);


export default function DailyGradeSheetPDFPage2({ sheet, students, calculatedData, orientation, startingIndex }: PDFPageProps) {
    const { columnSettings, schoolName, teacherName, subjectName, gradeLevel, section, academicYear } = sheet;
    const s2_m1_cols = columnSettings.s2_m1;
    const s2_m2_cols = columnSettings.s2_m2;
    const pageClasses = orientation === 'landscape' ? 'w-[1123px] h-[794px]' : 'w-[794px] h-[1123px]';

    return (
        <div className={`${pageClasses} p-6 bg-white font-['Cairo'] flex flex-col`} dir="rtl">
            <header className="flex justify-between items-center mb-2">
                <p><strong>مدرس المادة:</strong> {teacherName}</p>
                <p><strong>المادة الدراسية:</strong> {subjectName}</p>
                <p><strong>الصف والشعبة:</strong> {gradeLevel} / {section}</p>
                <p><strong>إدارة مدرسة:</strong> {schoolName}</p>
            </header>
            <h1 className="text-center text-lg font-bold">الدرجات اليومية للفصل الدراسي الثاني - العام الدراسي {academicYear}</h1>
            <main className="flex-grow mt-2">
                <table className="w-full table-fixed border-collapse border-2 border-black text-xs">
                    <thead>
                        <tr className="bg-yellow-300 h-28">
                            <th className="border-2 border-black p-1 text-lg w-10 align-middle"><LiftedCellContent>ت</LiftedCellContent></th>
                            <th className="border-2 border-black p-1 text-lg w-64 align-middle"><LiftedCellContent>اسم الطالب</LiftedCellContent></th>
                            {/* Month 1 */}
                            {s2_m1_cols.map(c => <VerticalHeader key={c.id}>{c.name} ({c.maxGrade})</VerticalHeader>)}
                            <VerticalHeader className="bg-blue-300">مجموع اليومي</VerticalHeader>
                            <VerticalHeader className="bg-blue-300">التحريري</VerticalHeader>
                            <VerticalHeader className="bg-blue-300">المعدل</VerticalHeader>
                            {/* Month 2 */}
                            {s2_m2_cols.map(c => <VerticalHeader key={c.id}>{c.name} ({c.maxGrade})</VerticalHeader>)}
                            <VerticalHeader className="bg-purple-300">مجموع اليومي</VerticalHeader>
                            <VerticalHeader className="bg-purple-300">التحريري</VerticalHeader>
                            <VerticalHeader className="bg-purple-300">المعدل</VerticalHeader>
                            {/* Semester */}
                            <VerticalHeader className="bg-green-300">معدل الفصل الثاني</VerticalHeader>
                            <VerticalHeader className="bg-orange-300">السعي السنوي</VerticalHeader>
                            <VerticalHeader className="bg-red-300">الامتحان النهائي</VerticalHeader>
                            <VerticalHeader className="bg-pink-300">الدرجة النهائية</VerticalHeader>
                        </tr>
                        <tr className="bg-yellow-300">
                            <th className="border-2 border-black" colSpan={2}><LiftedCellContent>الشهر الأول</LiftedCellContent></th>
                            {s2_m1_cols.map(c => <PDFCell key={c.id}>{c.maxGrade}</PDFCell>)}
                            <PDFCell className="bg-blue-100">100</PDFCell>
                            <PDFCell className="bg-blue-100">100</PDFCell>
                            <PDFCell className="bg-blue-100">-</PDFCell>
                            <th className="border-2 border-black"><LiftedCellContent>الشهر الثاني</LiftedCellContent></th>
                            {s2_m2_cols.map(c => <PDFCell key={c.id}>{c.maxGrade}</PDFCell>)}
                            <PDFCell className="bg-purple-100">100</PDFCell>
                            <PDFCell className="bg-purple-100">100</PDFCell>
                            <PDFCell className="bg-purple-100">-</PDFCell>
                            
                            <PDFCell className="bg-green-100">-</PDFCell>
                            <PDFCell className="bg-orange-100">-</PDFCell>
                            <PDFCell className="bg-red-100">-</PDFCell>
                            <PDFCell className="bg-pink-100">-</PDFCell>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student, index) => {
                            const calcs = calculatedData.get(student.id);
                            return (
                                <tr key={student.id}>
                                    <PDFCell>{startingIndex + index + 1}</PDFCell>
                                    <td className="border-2 border-black p-1 text-right font-semibold text-sm whitespace-nowrap overflow-hidden text-ellipsis"><LiftedCellContent>{student.name}</LiftedCellContent></td>
                                    {/* Month 1 */}
                                    {s2_m1_cols.map(c => <PDFCell key={c.id}>{student.s2_m1_daily[c.id]}</PDFCell>)}
                                    <PDFCell className="bg-blue-100 font-bold">{calcs?.s2_m1_total_daily}</PDFCell>
                                    <PDFCell className="bg-blue-100">{student.s2_m1_written}</PDFCell>
                                    <PDFCell className="bg-blue-100 font-bold">{calcs?.s2_m1_avg}</PDFCell>
                                    {/* Month 2 */}
                                    {s2_m2_cols.map(c => <PDFCell key={c.id}>{student.s2_m2_daily[c.id]}</PDFCell>)}
                                    <PDFCell className="bg-purple-100 font-bold">{calcs?.s2_m2_total_daily}</PDFCell>
                                    <PDFCell className="bg-purple-100">{student.s2_m2_written}</PDFCell>
                                    <PDFCell className="bg-purple-100 font-bold">{calcs?.s2_m2_avg}</PDFCell>
                                    {/* Final Grades */}
                                    <PDFCell className="bg-green-100 font-bold">{calcs?.sem2_avg}</PDFCell>
                                    <PDFCell className="bg-orange-100 font-bold">{calcs?.yearly_pursuit}</PDFCell>
                                    <PDFCell className="bg-red-100 font-bold">{student.finalExam}</PDFCell>
                                    <PDFCell className="bg-pink-100 font-bold">{calcs?.final_grade}</PDFCell>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </main>
            <footer className="mt-auto pt-2 text-center text-sm font-semibold">
                <p>توقيع مدير المدرسة</p>
            </footer>
        </div>
    );
}
