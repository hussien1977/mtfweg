import React, { useState, useEffect, useMemo } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { User, SchoolSettings, ClassData, Student, AbsenceStatus } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { Calendar, ListChecks, Printer, AlertTriangle, Loader2, PlayCircle, X } from 'lucide-react';
import MonthlyAbsenceReportPDF from './MonthlyAbsenceReportPDF.tsx';
import AbsenceWarningLetterPDF from './AbsenceWarningLetterPDF.tsx';

declare const jspdf: any;
declare const html2canvas: any;

interface AbsenceManagerProps {
    principal: User;
    settings: SchoolSettings;
    classes: ClassData[];
}

const STATUS_CYCLE: AbsenceStatus[] = ['present', 'absent', 'excused', 'runaway'];
const STATUS_INFO: Record<AbsenceStatus, { text: string; color: string }> = {
    present: { text: 'حاضر', color: 'bg-green-500' },
    absent: { text: 'غائب', color: 'bg-red-500' },
    excused: { text: 'مجاز', color: 'bg-yellow-500' },
    runaway: { text: 'هارب', color: 'bg-blue-500' },
};

export default function AbsenceManager({ principal, settings, classes }: AbsenceManagerProps) {
    const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    
    // Daily state
    const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [dailyAbsences, setDailyAbsences] = useState<Record<string, AbsenceStatus>>({});
    const [isLoadingDaily, setIsLoadingDaily] = useState(false);

    // Monthly state
    const [currentMonth, setCurrentMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [monthlyAbsences, setMonthlyAbsences] = useState<Record<string, Record<string, AbsenceStatus>>>({});
    const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    const [studentForLetter, setStudentForLetter] = useState<Student | null>(null);
    const [isTutorialVisible, setIsTutorialVisible] = useState(false);


    const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
    const sortedStudents = useMemo(() => 
        [...(selectedClass?.students || [])].sort((a, b) => a.name.localeCompare(b.name, 'ar-IQ')),
    [selectedClass]);

    // Create a stable key from student IDs to use as a dependency, preventing re-renders from parent components.
    const studentIdsKey = useMemo(() => (sortedStudents || []).map(s => s.id).join(','), [sortedStudents]);
    
    // Effect for daily data
    useEffect(() => {
        if (!selectedClassId || !currentDate) {
            setDailyAbsences({});
            return;
        }
        setIsLoadingDaily(true);
        const [year, month, day] = currentDate.split('-');
        const path = `absences/${principal.id}/${selectedClassId}/${year}-${month}/${day}`;
        db.ref(path).get().then(snapshot => {
            const data = snapshot.val() || {};
            const initialAbsences: Record<string, AbsenceStatus> = {};
            sortedStudents.forEach(student => {
                initialAbsences[student.id] = data[student.id] || 'present';
            });
            setDailyAbsences(initialAbsences);
        }).finally(() => setIsLoadingDaily(false));
    // The `sortedStudents` array is intentionally omitted from the dependency array.
    // `studentIdsKey` serves as a stable, primitive representation of the student list.
    // This prevents an infinite re-render loop if the parent component passes an unstable `classes` prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedClassId, currentDate, principal.id, studentIdsKey]); 

    // Effect for monthly data
    useEffect(() => {
        if (activeTab !== 'monthly' || !selectedClassId || !currentMonth) {
            setMonthlyAbsences({});
            return;
        }
        setIsLoadingMonthly(true);
        const path = `absences/${principal.id}/${selectedClassId}/${currentMonth}`;
        db.ref(path).get().then(snapshot => {
            setMonthlyAbsences(snapshot.val() || {});
        }).finally(() => setIsLoadingMonthly(false));
    }, [activeTab, selectedClassId, currentMonth, principal.id]);
    
    const handleStatusChange = (studentId: string) => {
        const currentStatus = dailyAbsences[studentId] || 'present';
        const currentIndex = STATUS_CYCLE.indexOf(currentStatus);
        const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
        setDailyAbsences(prev => ({ ...prev, [studentId]: STATUS_CYCLE[nextIndex] }));
    };

    const handleSaveDaily = () => {
        if (!selectedClassId || !currentDate) return;
        const [year, month, day] = currentDate.split('-');
        const path = `absences/${principal.id}/${selectedClassId}/${year}-${month}/${day}`;
        db.ref(path).set(dailyAbsences).then(() => {
            alert('تم حفظ الغيابات بنجاح.');
        });
    };
    
    const monthlyTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        sortedStudents.forEach(student => {
            let absentCount = 0;
            const studentMonthlyData = monthlyAbsences;
            Object.values(studentMonthlyData).forEach(dailyData => {
                if(dailyData[student.id] === 'absent') {
                    absentCount++;
                }
            });
            totals[student.id] = absentCount;
        });
        return totals;
    }, [monthlyAbsences, sortedStudents]);

    const handleExport = async (type: 'report' | 'letter', student?: Student) => {
        setIsExporting(true);

        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        const renderComponent = (component: React.ReactElement) => new Promise<void>(resolve => {
            root.render(component);
            setTimeout(resolve, 500);
        });

        try {
            await document.fonts.ready;
            const { jsPDF } = jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            if (type === 'report' && selectedClass) {
                await renderComponent(
                    <MonthlyAbsenceReportPDF
                        settings={settings}
                        classData={selectedClass}
                        students={sortedStudents}
                        monthlyAbsences={monthlyAbsences}
                        monthlyTotals={monthlyTotals}
                        month={currentMonth}
                    />
                );
            } else if (type === 'letter' && student && selectedClass) {
                await renderComponent(
                    <AbsenceWarningLetterPDF
                        settings={settings}
                        classData={selectedClass}
                        student={student}
                        totalAbsences={monthlyTotals[student.id] || 0}
                    />
                );
            } else {
                throw new Error("Invalid export configuration.");
            }
            
            const element = tempContainer.children[0] as HTMLElement;
            const canvas = await html2canvas(element, { scale: 2, useCORS: true });
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
            pdf.save(`${type}-${selectedClass.stage}-${selectedClass.section}.pdf`);

        } catch (error) {
            console.error(error);
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
            setStudentForLetter(null);
        }
    };


    return (
        <div className="bg-white p-8 rounded-xl shadow-lg">
            {isExporting && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><Loader2 className="text-white h-16 w-16 animate-spin"/></div>}
            
            {isTutorialVisible && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
                    onClick={() => setIsTutorialVisible(false)}
                >
                    <div 
                        className="bg-black p-2 rounded-lg shadow-xl w-full max-w-4xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setIsTutorialVisible(false)}
                            className="absolute -top-3 -right-3 bg-white text-black rounded-full p-2 z-10 shadow-lg hover:scale-110 transition-transform"
                            aria-label="Close video"
                        >
                            <X size={24} />
                        </button>
                        <div className="relative w-full" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
                            <iframe 
                                className="absolute top-0 left-0 w-full h-full"
                                src="https://www.youtube.com/embed/B6z29TlF9hE?autoplay=1"
                                title="شرح طريقة ادارة الغيابات" 
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-4 border-b pb-4">
                <h2 className="text-3xl font-bold text-gray-800">إدارة الغيابات</h2>
                 <button
                    onClick={() => setIsTutorialVisible(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-transform transform hover:scale-105"
                >
                    <PlayCircle size={20} />
                    شاهد العرض التوضيحي لطريقة ادارة الغيابات
                </button>
            </div>


            <div className="flex border-b mb-4">
                <button onClick={() => setActiveTab('daily')} className={`px-4 py-2 font-semibold ${activeTab === 'daily' ? 'border-b-2 border-cyan-500 text-cyan-600' : 'text-gray-500'}`}>تسجيل الغياب اليومي</button>
                <button onClick={() => setActiveTab('monthly')} className={`px-4 py-2 font-semibold ${activeTab === 'monthly' ? 'border-b-2 border-cyan-500 text-cyan-600' : 'text-gray-500'}`}>التقرير الشهري</button>
            </div>
            
            <div className="mb-4">
                <label className="font-bold">اختر الشعبة:</label>
                <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="w-full md:w-1/2 mt-1 p-2 border rounded-md">
                    <option value="">-- اختر شعبة --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.stage} - {c.section}</option>)}
                </select>
            </div>

            {!selectedClassId && <p className="text-center text-gray-500 p-8">يرجى اختيار شعبة للبدء.</p>}

            {selectedClassId && activeTab === 'daily' && (
                <div>
                    <div className="flex items-center gap-4 mb-4">
                        <label className="font-bold">التاريخ:</label>
                        <input type="date" value={currentDate} onChange={e => setCurrentDate(e.target.value)} className="p-2 border rounded-md"/>
                    </div>
                    {isLoadingDaily ? <Loader2 className="animate-spin mx-auto"/> : (
                        <div className="space-y-2 max-w-lg mx-auto">
                             {sortedStudents.map(student => (
                                 <div key={student.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                     <span className="font-semibold">{student.name}</span>
                                     <button onClick={() => handleStatusChange(student.id)} className={`w-20 text-center py-1 text-white rounded-md text-sm font-bold ${STATUS_INFO[dailyAbsences[student.id] || 'present'].color}`}>
                                        {STATUS_INFO[dailyAbsences[student.id] || 'present'].text}
                                     </button>
                                 </div>
                             ))}
                             <div className="text-center pt-4">
                                <button onClick={handleSaveDaily} className="px-8 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">حفظ الغيابات</button>
                             </div>
                        </div>
                    )}
                </div>
            )}

            {selectedClassId && activeTab === 'monthly' && (
                <div>
                     <div className="flex items-center gap-4 mb-4">
                        <label className="font-bold">الشهر:</label>
                        <input type="month" value={currentMonth} onChange={e => setCurrentMonth(e.target.value)} className="p-2 border rounded-md"/>
                        <button onClick={() => handleExport('report')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"><Printer size={18}/> طباعة التقرير</button>
                    </div>
                     {isLoadingMonthly ? <Loader2 className="animate-spin mx-auto"/> : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse border border-gray-400">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="border p-1">اسم الطالب</th>
                                        {Array.from({length: 31}, (_, i) => i + 1).map(day => <th key={day} className="border p-1 w-8">{day}</th>)}
                                        <th className="border p-1">مجموع الغياب</th>
                                        <th className="border p-1">ملاحظات</th>
                                        <th className="border p-1">إجراء</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedStudents.map(student => {
                                        const total = monthlyTotals[student.id] || 0;
                                        let warning = '';
                                        if (total >= 14) warning = 'انذار ثاني';
                                        else if (total >= 7) warning = 'انذار اول';
                                        
                                        return (
                                            <tr key={student.id} className="hover:bg-gray-50">
                                                <td className="border p-1 font-semibold">{student.name}</td>
                                                {Array.from({length: 31}, (_, i) => i + 1).map(day => {
                                                    const dayStr = String(day).padStart(2, '0');
                                                    const status = monthlyAbsences[dayStr]?.[student.id];
                                                    let symbol = '';
                                                    let colorClass = '';
                                                    if (status === 'absent') {
                                                        symbol = 'غ';
                                                        colorClass = 'text-red-600';
                                                    } else if (status === 'excused') {
                                                        symbol = 'م';
                                                        colorClass = 'text-yellow-600';
                                                    } else if (status === 'runaway') {
                                                        symbol = 'هـ';
                                                        colorClass = 'text-blue-600';
                                                    } else if (status === 'present') {
                                                        symbol = 'ح';
                                                        colorClass = 'text-green-600';
                                                    }
                                                    return <td key={day} className={`border p-1 text-center font-bold ${colorClass}`}>{symbol}</td>;
                                                })}
                                                <td className="border p-1 text-center font-bold">{total}</td>
                                                <td className={`border p-1 text-center font-semibold ${total >= 7 ? 'text-red-600' : ''}`}>{warning}</td>
                                                <td className="border p-1 text-center">
                                                    {total > 0 && 
                                                        <button onClick={() => handleExport('letter', student)} className="text-xs bg-red-500 text-white px-2 py-1 rounded">طباعة تبليغ</button>
                                                    }
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                     )}
                </div>
            )}
        </div>
    );
}