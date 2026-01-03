import React, { useState, useMemo } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { ClassData, SchoolSettings, Student, StudentResult, CalculatedGrade } from '../types.ts';
import { GRADE_LEVELS } from '../constants.ts';
import { calculateStudentResult } from '../lib/gradeCalculator.ts';
import { Loader2, FileDown, AlertTriangle } from 'lucide-react';
import OverallPercentagesManager from './statistics/OverallPercentagesManager.tsx';

declare const jspdf: any;
declare const html2canvas: any;

// Define types and constants
type ReportType = 'successful' | 'failing' | 'supplementary' | 'decision_log' | 'overall_percentages';

const REPORT_TABS: { key: ReportType; label: string }[] = [
    { key: 'successful', label: 'الناجحون' },
    { key: 'failing', label: 'الراسبون' },
    { key: 'supplementary', label: 'تبليغات المكملين' },
    { key: 'decision_log', label: 'سجل إضافات القرار' },
    { key: 'overall_percentages', label: 'النسب الكلية' },
];

const ROWS_PER_PAGE = 25;

// Under Maintenance Component
const UnderMaintenance: React.FC<{ featureName: string }> = ({ featureName }) => (
    <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
        <h3 className="text-xl font-bold text-gray-700">ميزة "{featureName}" قيد التطوير</h3>
        <p className="mt-2 text-gray-500">ستكون هذه الميزة متاحة قريباً. شكراً لتفهمكم.</p>
    </div>
);


// ReportPage component (for PDF generation)
interface ReportPageProps {
    settings: SchoolSettings;
    title: string;
    children: React.ReactNode;
    pageNumber: number;
    totalPages: number;
}
const ReportPage = React.forwardRef<HTMLDivElement, ReportPageProps>(({ settings, title, children, pageNumber, totalPages }, ref) => (
    <div ref={ref} className="w-[794px] h-[1123px] p-10 bg-white flex flex-col font-['Cairo']" style={{ direction: 'rtl' }}>
        <header className="text-center mb-4">
            <p>إدارة: {settings.directorate || '..............'}</p>
            <p>اسم المدرسة: {settings.schoolName}</p>
            <p>العام الدراسي: {settings.academicYear} &nbsp;&nbsp;&nbsp; الدور الاول</p>
        </header>
        <h2 className="text-2xl font-bold text-center my-4">{title}</h2>
        <main className="flex-grow">
            {children}
        </main>
        <footer className="flex justify-between items-center text-center mt-auto pt-2 border-t-2 border-black">
             <p>اسم مدير المدرسة: {settings.principalName}</p>
             <p>صفحة {pageNumber} من {totalPages}</p>
        </footer>
    </div>
));

// Report Tables
interface SuccessFailReportProps {
    students: (Student & { classId: string })[];
    classMap: Map<string, ClassData>;
    startingIndex?: number;
}
const SuccessFailReport: React.FC<SuccessFailReportProps> = ({ students, classMap, startingIndex = 0 }) => {
    const headers = ['تسلسل', 'اسم الطالب', 'الرقم الامتحاني', 'رقم القيد', 'الشعبة'];
    return (
        <table className="w-full border-collapse border border-black text-lg">
            <thead className="bg-gray-200">
                <tr>
                    {headers.map(h => <th key={h} className="border border-black p-2 font-bold">{h}</th>)}
                </tr>
            </thead>
            <tbody>
                {students.map((s, i) => (
                    <tr key={s.id} className="odd:bg-white even:bg-gray-100 h-10">
                        <td className="border border-black p-2 text-center">{startingIndex + i + 1}</td>
                        <td className="border border-black p-2 text-right">{s.name}</td>
                        <td className="border border-black p-2 text-center">{s.examId}</td>
                        <td className="border border-black p-2 text-center">{s.registrationId}</td>
                        <td className="border border-black p-2 text-center">{classMap.get(s.classId)?.section}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

interface SupplementaryStudent extends Student {
    classId: string;
    failingSubjects: string[];
}
const SupplementaryReport: React.FC<{ students: SupplementaryStudent[], classMap: Map<string, ClassData>, startingIndex?: number }> = ({ students, classMap, startingIndex = 0 }) => {
    const headers = ['تسلسل', 'اسم الطالب', 'الرقم الامتحاني', 'الصف', 'الدروس التي اكمل بها', 'التوقيع'];
    return (
        <table className="w-full border-collapse border border-black text-lg">
            <thead className="bg-gray-200">
                <tr>
                    {headers.map(h => <th key={h} className="border border-black p-2 font-bold">{h}</th>)}
                </tr>
            </thead>
            <tbody>
                {students.map((s, i) => (
                    <tr key={s.id} className="odd:bg-white even:bg-gray-100 h-12">
                        <td className="border border-black p-2 text-center">{startingIndex + i + 1}</td>
                        <td className="border border-black p-2 text-right">{s.name}</td>
                        <td className="border border-black p-2 text-center">{s.examId}</td>
                        <td className="border border-black p-2 text-center">{classMap.get(s.classId)?.stage}</td>
                        <td className="border border-black p-2 text-center font-semibold text-red-600">{s.failingSubjects.join('، ')}</td>
                        <td className="border border-black p-2"></td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

interface DecisionStudent extends Student {
    classId: string;
    amountGranted: number;
    decisionSubjects: { name: string; points: number }[];
    remainingPoints: number;
    // FIX: Changed type from `string` to `StudentResult['status']` to match the actual type of the data.
    finalResult: StudentResult['status'];
}
const DecisionLogReport: React.FC<{ students: DecisionStudent[], classMap: Map<string, ClassData>, settings: SchoolSettings, startingIndex?: number }> = ({ students, classMap, settings, startingIndex = 0 }) => {
    const headers = ['ت', 'اسم الطالب', 'الصف والشعبة', 'مقدار المنح', 'المواد التي حصل عليها القرار', 'المتبقي', 'النتيجة'];
    return (
        <table className="w-full border-collapse border border-black text-lg">
            <thead className="bg-gray-200">
                <tr>
                    {headers.map(h => <th key={h} className="border border-black p-2 font-bold">{h}</th>)}
                </tr>
            </thead>
            <tbody>
                {students.map((s, i) => (
                    <tr key={s.id} className="odd:bg-white even:bg-gray-100 h-12">
                        <td className="border border-black p-2 text-center">{startingIndex + i + 1}</td>
                        <td className="border border-black p-2 text-right">{s.name}</td>
                        <td className="border border-black p-2 text-center">{`${classMap.get(s.classId)?.stage} - ${classMap.get(s.classId)?.section}`}</td>
                        <td className="border border-black p-2 text-center font-bold text-blue-600">{s.amountGranted}</td>
                        <td className="border border-black p-2 text-center font-semibold text-green-600">{s.decisionSubjects.map(ds => `${ds.name} (${ds.points}+)`).join('، ')}</td>
                        <td className="border border-black p-2 text-center">{s.remainingPoints}</td>
                        <td className="border border-black p-2 text-center font-semibold">{s.finalResult}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};


// Main Component
export default function StatisticsManager({ classes, settings }: { classes: ClassData[], settings: SchoolSettings }) {
    const [selectedStage, setSelectedStage] = useState('');
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<ReportType>('successful');
    const [isExporting, setIsExporting] = useState(false);
    
    const classesInSelectedStage = useMemo(() => {
        return selectedStage ? classes.filter(c => c.stage === selectedStage) : [];
    }, [selectedStage, classes]);

    const studentResults = useMemo(() => {
        const results = new Map<string, { finalCalculatedGrades: Record<string, CalculatedGrade>, result: StudentResult }>();
        const students: (Student & { classId: string })[] = [];
        const classMap = new Map<string, ClassData>();

        classes
            .filter(c => selectedClassIds.includes(c.id))
            .forEach(c => {
                if (!c) return;
                classMap.set(c.id, c);
                (c.students || []).forEach(s => {
                    const studentWithClassId = { ...s, classId: c.id };
                    students.push(studentWithClassId);
                    results.set(s.id, calculateStudentResult(s, c.subjects || [], settings, c));
                });
            });
        
        return { students, results, classMap };
    }, [selectedClassIds, classes, settings]);

    const filteredData = useMemo(() => {
        const { students, results, classMap } = studentResults;
        switch (activeTab) {
            case 'successful':
                return students.filter(s => ['ناجح', 'مؤهل', 'مؤهل بقرار'].includes(results.get(s.id)?.result.status || ''));
            case 'failing':
                 return students.filter(s => ['راسب', 'غير مؤهل'].includes(results.get(s.id)?.result.status || ''));
            case 'supplementary':
                return students
                    .filter(s => results.get(s.id)?.result.status === 'مكمل')
                    .map(s => {
                        const res = results.get(s.id);
                        if (!res) return { ...s, failingSubjects: [] };
                        const studentClass = classMap.get(s.classId);
                        const failingSubjects = (studentClass?.subjects || [])
                            .filter(subj => {
                                const gradeInfo = res.finalCalculatedGrades[subj.name];
                                return gradeInfo && !gradeInfo.isExempt && gradeInfo.finalGradeWithDecision !== null && gradeInfo.finalGradeWithDecision < 50;
                            })
                            .map(subj => subj.name);
                        return { ...s, failingSubjects };
                    });
            case 'decision_log':
                return students
                    .map(s => {
                        const res = results.get(s.id);
                        if (!res) return null;

                        let amountGranted = 0;
                        const decisionSubjects: { name: string; points: number }[] = [];
                        const studentClass = classMap.get(s.classId);
                        
                        (studentClass?.subjects || []).forEach(subj => {
                            const gradeInfo = res.finalCalculatedGrades[subj.name];
                            if (gradeInfo && gradeInfo.decisionApplied > 0) {
                                amountGranted += gradeInfo.decisionApplied;
                                decisionSubjects.push({ name: subj.name, points: gradeInfo.decisionApplied });
                            }
                        });

                        if (amountGranted > 0) {
                            return {
                                ...s,
                                amountGranted,
                                decisionSubjects,
                                remainingPoints: settings.decisionPoints - amountGranted,
                                finalResult: res.result.status
                            };
                        }
                        return null;
                    })
                    .filter((s): s is DecisionStudent => s !== null);
            default:
                return [];
        }
    }, [studentResults, activeTab, settings.decisionPoints]);
    
    const handleExportPdf = async () => {
        const reportTitle = REPORT_TABS.find(t => t.key === activeTab)?.label || 'تقرير';
        const data = filteredData;

        if (data.length === 0) {
            alert(`لا يوجد طلاب في قائمة "${reportTitle}" لتصديرهم.`);
            return;
        }

        setIsExporting(true);

        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '-9999px' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        const renderComponent = (component: React.ReactElement) => new Promise<void>(resolve => {
            root.render(component);
            setTimeout(resolve, 500);
        });
        
        const totalPages = Math.ceil(data.length / ROWS_PER_PAGE) || 1;
        const { jsPDF } = jspdf;
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

        try {
            await document.fonts.ready;
            for (let i = 0; i < totalPages; i++) {
                const pageData = data.slice(i * ROWS_PER_PAGE, (i + 1) * ROWS_PER_PAGE);
                
                let reportContent;
                if (activeTab === 'supplementary') {
                    reportContent = <SupplementaryReport students={pageData as SupplementaryStudent[]} classMap={studentResults.classMap} startingIndex={i * ROWS_PER_PAGE} />;
                } else if (activeTab === 'decision_log') {
                    reportContent = <DecisionLogReport students={pageData as DecisionStudent[]} classMap={studentResults.classMap} settings={settings} startingIndex={i * ROWS_PER_PAGE} />;
                } else {
                    reportContent = <SuccessFailReport students={pageData} classMap={studentResults.classMap} startingIndex={i * ROWS_PER_PAGE}/>;
                }
                
                await renderComponent(
                    <ReportPage settings={settings} title={reportTitle} pageNumber={i + 1} totalPages={totalPages}>
                        {reportContent}
                    </ReportPage>
                );

                const reportElement = tempContainer.children[0] as HTMLElement;
                const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
            }
            pdf.save(`${reportTitle}_${selectedStage}.pdf`);
        } catch (error) {
            console.error("PDF Export Error:", error);
            const message = error instanceof Error ? error.message : String(error);
            alert(`حدث خطأ أثناء التصدير: ${message}`);
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
        }
    };
    
    const renderContent = () => {
        if (activeTab === 'overall_percentages') {
            return <OverallPercentagesManager classes={classes} settings={settings} />;
        }
        
        if (selectedClassIds.length === 0) {
            return (
                <div className="flex items-center justify-center h-64 text-gray-500">
                    <p>اختر مرحلة وشعبة لعرض التقرير.</p>
                </div>
            );
        }

        const reportTitleForPreview = REPORT_TABS.find(t => t.key === activeTab)?.label || 'تقرير';

        const pageData = filteredData.slice(0, ROWS_PER_PAGE);
        let reportContent;
        if (activeTab === 'supplementary') {
            reportContent = <SupplementaryReport students={pageData as SupplementaryStudent[]} classMap={studentResults.classMap} />;
        } else if (activeTab === 'decision_log') {
            reportContent = <DecisionLogReport students={pageData as DecisionStudent[]} classMap={studentResults.classMap} settings={settings} />;
        } else {
            reportContent = <SuccessFailReport students={pageData} classMap={studentResults.classMap} />;
        }
         return (
            <div className="transform scale-[0.8] origin-top mx-auto">
              <ReportPage settings={settings} title={reportTitleForPreview} pageNumber={1} totalPages={Math.ceil(filteredData.length / ROWS_PER_PAGE) || 1}>
                 {reportContent}
              </ReportPage>
            </div>
         )
    };
    
    return (
        <div className="bg-white p-8 rounded-xl shadow-lg">
            {isExporting && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center z-50 text-white">
                    <Loader2 className="animate-spin h-16 w-16 mb-4" />
                    <p className="text-2xl font-bold">جاري التصدير...</p>
                </div>
            )}
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">الإحصائيات والتقارير</h2>
            
            {activeTab !== 'overall_percentages' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-md font-bold text-gray-700 mb-2">1. اختر المرحلة</label>
                        <select onChange={e => {setSelectedStage(e.target.value); setSelectedClassIds([]);}} value={selectedStage} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500">
                            <option value="">-- اختر مرحلة --</option>
                            {GRADE_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-md font-bold text-gray-700 mb-2">2. اختر الشعب</label>
                        <div className="space-y-2 p-2 border rounded-lg max-h-32 overflow-y-auto">
                            {selectedStage && classesInSelectedStage.length > 0 ? classesInSelectedStage.map(c => (
                                <label key={c.id} className="flex items-center gap-3 p-1 rounded-md hover:bg-gray-100 cursor-pointer">
                                    <input type="checkbox" checked={selectedClassIds.includes(c.id)} onChange={() => setSelectedClassIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])} className="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"/>
                                    <span className="font-semibold">{c.stage} - {c.section}</span>
                                    <span className="text-sm text-gray-500">({(c.students || []).length} طالب)</span>
                                </label>
                            )) : <p className="text-gray-500 text-center">اختر مرحلة لعرض الشعب.</p>}
                        </div>
                    </div>
                </div>
            )}
            
            <div className="flex items-center justify-between border-b-2 mb-4">
                 <div className="flex flex-wrap gap-1">
                    {REPORT_TABS.map(tab => (
                        <button 
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 font-semibold rounded-t-lg transition-colors ${activeTab === tab.key ? 'bg-cyan-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                {activeTab !== 'overall_percentages' && (
                     <button onClick={handleExportPdf} disabled={isExporting || filteredData.length === 0} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:bg-gray-400">
                        <FileDown size={20} />
                        <span>تصدير PDF</span>
                    </button>
                )}
            </div>

            <div className="bg-gray-100 p-4 rounded-lg overflow-x-auto min-h-[400px]">
                {renderContent()}
            </div>

        </div>
    );
}