
import React, { useState, useMemo } from 'react';
import type { ClassData, SchoolSettings, Student, CalculatedGrade, Subject } from '../../types.ts';
import { Search, GraduationCap, FileText, X, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { calculateStudentResult } from '../../lib/gradeCalculator.ts';

interface CounselorGradesViewProps {
    classes: ClassData[];
    settings: SchoolSettings;
}

export default function CounselorGradesView({ classes, settings }: CounselorGradesViewProps) {
    const [selectedStage, setSelectedStage] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<{ student: Student; classData: ClassData } | null>(null);

    // Get unique stages
    const stages = useMemo(() => Array.from(new Set(classes.map(c => c.stage))), [classes]);

    // Filter classes based on stage
    const filteredClasses = useMemo(() => {
        return selectedStage ? classes.filter(c => c.stage === selectedStage) : classes;
    }, [classes, selectedStage]);

    // Flatten all students and filter based on criteria
    const filteredStudents = useMemo(() => {
        let studentsList: { student: Student; classData: ClassData; resultStatus: string }[] = [];

        filteredClasses.forEach(cls => {
            if (selectedClassId && cls.id !== selectedClassId) return;

            (cls.students || []).forEach(student => {
                if (searchQuery && !student.name.includes(searchQuery)) return;

                // Calculate result on the fly to show status
                const { result } = calculateStudentResult(student, cls.subjects || [], settings, cls);
                
                studentsList.push({
                    student,
                    classData: cls,
                    resultStatus: result.status
                });
            });
        });

        return studentsList.sort((a, b) => a.student.name.localeCompare(b.student.name, 'ar'));
    }, [filteredClasses, selectedClassId, searchQuery, settings]);

    // Helper to render grade cell with color
    const GradeCell = ({ value, className = '' }: { value: number | null | undefined, className?: string }) => {
        if (value === null || value === undefined) return <span className="text-gray-300">-</span>;
        return <span className={`font-bold ${value < 50 ? 'text-red-600' : 'text-gray-800'} ${className}`}>{value}</span>;
    };

    return (
        <div className="space-y-6">
            {/* Header and Filters */}
            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-indigo-500">
                <div className="flex items-center gap-3 mb-6">
                    <GraduationCap className="w-8 h-8 text-indigo-600" />
                    <h2 className="text-2xl font-bold text-gray-800">سجل الدرجات والمستوى الأكاديمي</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="بحث عن طالب بالاسم..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <select
                        value={selectedStage}
                        onChange={(e) => { setSelectedStage(e.target.value); setSelectedClassId(''); }}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                        <option value="">-- كل المراحل --</option>
                        {stages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                    </select>
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        disabled={!selectedStage}
                        className="w-full p-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                    >
                        <option value="">-- كل الشعب --</option>
                        {classes.filter(c => c.stage === selectedStage).map(c => (
                            <option key={c.id} value={c.id}>{c.section}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Students List */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-100 border-b">
                            <tr>
                                <th className="p-4 font-semibold text-gray-700">اسم الطالب</th>
                                <th className="p-4 font-semibold text-gray-700">الصف والشعبة</th>
                                <th className="p-4 font-semibold text-gray-700">الحالة الأكاديمية</th>
                                <th className="p-4 font-semibold text-gray-700">الإجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map((item) => (
                                    <tr key={item.student.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-medium text-gray-900">{item.student.name}</td>
                                        <td className="p-4 text-gray-600">{item.classData.stage} - {item.classData.section}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1
                                                ${['ناجح', 'مؤهل', 'مؤهل بقرار'].includes(item.resultStatus) ? 'bg-green-100 text-green-700' : 
                                                  ['مكمل'].includes(item.resultStatus) ? 'bg-yellow-100 text-yellow-700' :
                                                  ['راسب', 'غير مؤهل'].includes(item.resultStatus) ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}
                                            `}>
                                                {['ناجح', 'مؤهل', 'مؤهل بقرار'].includes(item.resultStatus) && <CheckCircle size={14}/>}
                                                {['مكمل'].includes(item.resultStatus) && <AlertTriangle size={14}/>}
                                                {['راسب', 'غير مؤهل'].includes(item.resultStatus) && <XCircle size={14}/>}
                                                {item.resultStatus}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <button 
                                                onClick={() => setSelectedStudent({ student: item.student, classData: item.classData })}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium text-sm"
                                            >
                                                <FileText size={16} />
                                                كشف الدرجات
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">
                                        لا توجد نتائج مطابقة للبحث.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Student Details Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-5 border-b flex justify-between items-center bg-indigo-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">{selectedStudent.student.name}</h3>
                                <p className="text-sm text-indigo-600 mt-1">{selectedStudent.classData.stage} - {selectedStudent.classData.section}</p>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="p-2 bg-white text-gray-500 hover:text-red-500 rounded-full shadow-sm hover:shadow transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
                            <div className="bg-blue-100 border-r-4 border-blue-500 p-4 mb-6 rounded-l-md shadow-sm">
                                <h4 className="font-bold text-blue-800 mb-1">النتيجة النهائية:</h4>
                                <p className="text-lg font-semibold text-gray-800">
                                    {calculateStudentResult(selectedStudent.student, selectedStudent.classData.subjects, settings, selectedStudent.classData).result.message}
                                </p>
                            </div>

                            <div className="overflow-hidden border border-gray-300 rounded-lg shadow-md bg-white">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-center text-sm border-collapse whitespace-nowrap">
                                        <thead className="bg-gray-800 text-white sticky top-0 z-10">
                                            <tr>
                                                <th className="p-3 border-b border-r border-gray-600 sticky right-0 bg-gray-800 z-20 min-w-[120px]">المادة</th>
                                                <th className="p-3 border-b border-gray-600 bg-blue-900">ش1 (ف1)</th>
                                                <th className="p-3 border-b border-gray-600 bg-blue-900">ش2 (ف1)</th>
                                                <th className="p-3 border-b border-gray-600">معدل ف1</th>
                                                <th className="p-3 border-b border-gray-600 bg-yellow-600">نصف السنة</th>
                                                <th className="p-3 border-b border-gray-600 bg-green-900">ش1 (ف2)</th>
                                                <th className="p-3 border-b border-gray-600 bg-green-900">ش2 (ف2)</th>
                                                <th className="p-3 border-b border-gray-600">معدل ف2</th>
                                                <th className="p-3 border-b border-gray-600 bg-orange-600">السعي</th>
                                                <th className="p-3 border-b border-gray-600 bg-red-700">النهائي</th>
                                                <th className="p-3 border-b border-gray-600 bg-indigo-700">الدرجة النهائية</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {selectedStudent.classData.subjects.map(subject => {
                                                const grades = selectedStudent.student.grades?.[subject.name];
                                                const teacherGrades = selectedStudent.student.teacherGrades?.[subject.name];
                                                const calc = calculateStudentResult(selectedStudent.student, selectedStudent.classData.subjects, settings, selectedStudent.classData).finalCalculatedGrades[subject.name];
                                                
                                                return (
                                                    <tr key={subject.id} className="hover:bg-gray-50">
                                                        <td className="p-3 border-r border-gray-200 text-right font-bold bg-gray-50 sticky right-0 z-10">{subject.name}</td>
                                                        {/* Semester 1 Months */}
                                                        <td className="p-3 border-r border-gray-100 bg-blue-50"><GradeCell value={teacherGrades?.firstSemMonth1 ?? grades?.october} /></td>
                                                        <td className="p-3 border-r border-gray-100 bg-blue-50"><GradeCell value={teacherGrades?.firstSemMonth2 ?? grades?.november} /></td>
                                                        <td className="p-3 border-r border-gray-100 font-semibold"><GradeCell value={grades?.firstTerm} /></td>
                                                        
                                                        {/* Mid Year */}
                                                        <td className="p-3 border-r border-gray-100 bg-yellow-50 font-semibold"><GradeCell value={grades?.midYear} /></td>
                                                        
                                                        {/* Semester 2 Months */}
                                                        <td className="p-3 border-r border-gray-100 bg-green-50"><GradeCell value={teacherGrades?.secondSemMonth1 ?? grades?.february} /></td>
                                                        <td className="p-3 border-r border-gray-100 bg-green-50"><GradeCell value={teacherGrades?.secondSemMonth2 ?? grades?.march} /></td>
                                                        <td className="p-3 border-r border-gray-100 font-semibold"><GradeCell value={grades?.secondTerm} /></td>
                                                        
                                                        {/* Annual Pursuit */}
                                                        <td className="p-3 border-r border-gray-100 bg-orange-50 font-bold text-orange-800"><GradeCell value={calc?.annualPursuit} /></td>
                                                        
                                                        {/* Final Exam */}
                                                        <td className="p-3 border-r border-gray-100 bg-red-50">
                                                            {calc?.isExempt ? <span className="text-blue-600 font-bold text-xs">معفو</span> : <GradeCell value={grades?.finalExam1st} />}
                                                        </td>
                                                        
                                                        {/* Final Grade */}
                                                        <td className="p-3 font-bold text-lg bg-indigo-50 border-r border-gray-100">
                                                            <GradeCell value={calc?.finalGradeWithDecision} />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-center">يمكنك سحب الجدول يميناً ويساراً لعرض كافة التفاصيل.</p>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t bg-white flex justify-end">
                            <button 
                                onClick={() => setSelectedStudent(null)} 
                                className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition shadow"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
