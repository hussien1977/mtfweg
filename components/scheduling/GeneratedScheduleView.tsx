import React, { useMemo, useRef, useState } from 'react';
// Fix: Added missing type imports.
import type { User, ClassData, ScheduleData, Subject, ScheduleAssignment, SchoolSettings } from '../../types.ts';
import { Download, PlusCircle, Loader2 } from 'lucide-react';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import * as ReactDOM from 'react-dom/client';
import ClassSchedulePDFPage from './ClassSchedulePDFPage.tsx';

declare const jspdf: any;
declare const html2canvas: any;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const DAY_NAMES_AR: Record<string, string> = {
    Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس'
};

const getClassNameKey = (stage: string, section: string): string => `${stage.replace(/ /g, '-')}-${section}`;


const DraggableItem: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
    const style: React.CSSProperties = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 100,
        cursor: 'grabbing',
    } : { cursor: 'grab' };

    if (isDragging) {
        style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
        style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    }

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            {children}
        </div>
    );
};

interface DroppableCellProps {
    id: string;
    assignment: ScheduleAssignment | undefined;
    children: React.ReactNode;
    onAddClick: (cellId: string) => void;
}

const DroppableCell: React.FC<DroppableCellProps> = ({ id, assignment, children, onAddClick }) => {
    const { isOver, setNodeRef } = useDroppable({ id });
    const hoverColor = 'bg-cyan-100/50';

    return (
        <td
            ref={setNodeRef}
            className={`border border-gray-300 p-0 align-middle h-24 relative group ${isOver ? hoverColor : ''}`}
            style={{ transition: 'background-color 0.2s ease-in-out' }}
        >
            {children}
            {!assignment && (
                <button
                    onClick={() => onAddClick(id)}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-cyan-600"
                    aria-label="Add lesson"
                >
                    <PlusCircle size={28} />
                </button>
            )}
        </td>
    );
};

interface StageScheduleTableProps {
    stageName: string;
    classesInStage: ClassData[];
    scheduleData: ScheduleData;
    maxPeriods: number;
    onAddClick: (cellId: string) => void;
};


const StageScheduleTable: React.FC<StageScheduleTableProps> = ({ stageName, classesInStage, scheduleData, maxPeriods, onAddClick }) => {
    return (
        <div className="mb-10 schedule-table-container bg-white" id={`schedule-${stageName}`}>
            <h3 className="text-2xl font-bold text-center my-4 bg-gray-100 p-2 rounded-t-lg">{stageName}</h3>
            <table className="w-full border-collapse text-center" style={{ border: '2px solid black' }}>
                <thead className="font-bold text-lg">
                    <tr className="bg-gray-100">
                        <th className="border-2 border-black p-2 w-32">الشعبة</th>
                        {DAYS.map(day => (
                             <th key={day} className="border-2 border-black p-2 bg-gray-200">{DAY_NAMES_AR[day]}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {classesInStage.sort((a,b) => a.section.localeCompare(b.section, 'ar-IQ')).map(c => (
                        <React.Fragment key={c.id}>
                             {Array.from({ length: maxPeriods }, (_, i) => i + 1).map(period => (
                                 <tr key={`${c.id}-${period}`} className={period === 1 ? 'border-t-4 border-blue-200' : ''}>
                                    {period === 1 && <td rowSpan={maxPeriods} className="border-2 border-black p-2 font-bold text-xl bg-cyan-100 align-middle">
                                        {c.stage} {c.section}
                                    </td>}
                                    {DAYS.map(day => {
                                        const classNameKey = getClassNameKey(c.stage, c.section);
                                        const assignmentsForDay = scheduleData[day] || [];
                                        const assignment = assignmentsForDay.find(p => p.period === period)?.assignments?.[classNameKey];
                                        const cellId = `${day}|${period}|${classNameKey}`;

                                        return (
                                            <DroppableCell key={cellId} id={cellId} assignment={assignment} onAddClick={onAddClick}>
                                                {assignment ? (
                                                    <DraggableItem id={cellId}>
                                                        <div className="w-full h-full flex flex-col justify-center items-center p-1 rounded-md">
                                                            <span className="font-bold text-xl">{assignment.subject}</span>
                                                            <span className="text-md text-gray-700">{assignment.teacher}</span>
                                                        </div>
                                                    </DraggableItem>
                                                ) : <div className="w-full h-full"></div>}
                                            </DroppableCell>
                                        );
                                    })}
                                </tr>
                             ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

interface GeneratedScheduleViewProps {
    scheduleData: ScheduleData;
    onUpdateSchedule: (newSchedule: ScheduleData) => void;
    classes: ClassData[];
    teachers: User[];
    settings: SchoolSettings;
}

export default function GeneratedScheduleView({ scheduleData, onUpdateSchedule, classes, teachers, settings }: GeneratedScheduleViewProps) {
    const [addMenu, setAddMenu] = useState<{ cellId: string, classInfo: ClassData } | null>(null);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    const stages = useMemo(() => {
        const grouped: Record<string, ClassData[]> = {};
        classes
// FIX: Filter classes more robustly to prevent errors with incomplete data from Firebase.
            .filter(c => c && c.id && c.stage) // Filter out null/undefined/empty objects and ensure stage exists
            .forEach(c => {
            if (!grouped[c.stage]) {
                grouped[c.stage] = [];
            }
            grouped[c.stage].push(c);
        });
        return grouped;
    }, [classes]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const newScheduleData = JSON.parse(JSON.stringify(scheduleData));
            
            const [sourceDay, sourcePeriodStr, sourceClassKey] = (active.id as string).split('|');
            const [targetDay, targetPeriodStr, targetClassKey] = (over.id as string).split('|');
            const sourcePeriod = parseInt(sourcePeriodStr, 10);
            const targetPeriod = parseInt(targetPeriodStr, 10);

            const sourcePeriodObj = newScheduleData[sourceDay]?.find((p: any) => p.period === sourcePeriod);
            const targetPeriodObj = newScheduleData[targetDay]?.find((p: any) => p.period === targetPeriod);
            
            if (!sourcePeriodObj || !targetPeriodObj) return;

            const sourceAssignment = sourcePeriodObj.assignments?.[sourceClassKey];
            const targetAssignment = targetPeriodObj.assignments?.[targetClassKey];
            
            // Conflict check
            const checkTeacherConflict = (day: string, period: number, teacher: string, classKeyToIgnore: string) => {
                const periodAssignments = newScheduleData[day]?.find((p: any) => p.period === period)?.assignments || {};
                return Object.entries(periodAssignments).some(([key, a]: [string, any]) => 
                    key !== classKeyToIgnore && a.teacher === teacher
                );
            };
            
            if (targetAssignment && checkTeacherConflict(sourceDay, sourcePeriod, targetAssignment.teacher, sourceClassKey)) {
                alert(`يوجد تعارض لا يمكن تدريس شعبتين في نفس الوقت. المدرس ${targetAssignment.teacher} لديه حصة أخرى.`);
                return;
            }
             if (sourceAssignment && checkTeacherConflict(targetDay, targetPeriod, sourceAssignment.teacher, targetClassKey)) {
                alert(`يوجد تعارض لا يمكن تدريس شعبتين في نفس الوقت. المدرس ${sourceAssignment.teacher} لديه حصة أخرى.`);
                return;
            }

            // Soft-rule check: same subject, same day, same class
            if (sourceAssignment && targetAssignment && sourceDay === targetDay && sourceClassKey === targetClassKey && sourceAssignment.subject === targetAssignment.subject) {
                 alert(`تنبيه: سيتم تدريس مادة "${sourceAssignment.subject}" مرتين في نفس اليوم لهذه الشعبة.`);
            }

            // Perform Swap
            if (targetAssignment) {
                 sourcePeriodObj.assignments[sourceClassKey] = targetAssignment;
            } else {
                 delete sourcePeriodObj.assignments[sourceClassKey];
            }
            if (sourceAssignment) {
                targetPeriodObj.assignments[targetClassKey] = sourceAssignment;
            } else {
                 delete targetPeriodObj.assignments[targetClassKey];
            }

            onUpdateSchedule(newScheduleData);
        }
    };

    const handleAddClick = (cellId: string) => {
        const [, , classKey] = cellId.split('|');
        const classInfo = classes.find(c => getClassNameKey(c.stage, c.section) === classKey);
        if (classInfo) {
            setAddMenu({ cellId, classInfo });
        }
    };
    
    const handleAddSubject = (subject: Subject) => {
        if (!addMenu) return;

        const { cellId, classInfo } = addMenu;
        
        // Find teacher for this subject and class
        const teacherForSubject = teachers.find(t => 
            (t.assignments || []).some(a => a.classId === classInfo.id && a.subjectId === subject.id)
        );

        if (!teacherForSubject) {
            alert(`لم يتم العثور على مدرس لمادة ${subject.name} في هذه الشعبة.`);
            setAddMenu(null);
            return;
        }

        const newAssignment: ScheduleAssignment = {
            subject: subject.name,
            teacher: teacherForSubject.name,
        };

        const newScheduleData = JSON.parse(JSON.stringify(scheduleData));
        const [day, periodStr, classKey] = cellId.split('|');
        const period = parseInt(periodStr);

        const periodObj = newScheduleData[day]?.find((p: any) => p.period === period);
        if (periodObj) {
            if (!periodObj.assignments) periodObj.assignments = {};
            periodObj.assignments[classKey] = newAssignment;
            onUpdateSchedule(newScheduleData);
        }
        
        setAddMenu(null);
    };
    
    const handleExportPdf = async () => {
        // FIX: Explicitly cast Object.values(...).flat() to the correct type to resolve TS error.
        const allVisibleClasses: ClassData[] = (Object.values(stages) as ClassData[][]).flat();
        if (allVisibleClasses.length === 0) {
            alert("لا توجد شعب متاحة للتصدير.");
            return;
        }
        
        setIsExportingPdf(true);
        setExportProgress(0);

        const { jsPDF } = jspdf;
        const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
        
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, {
            position: 'absolute',
            left: '-9999px',
            top: '0',
        });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        const renderComponent = (component: React.ReactElement) => new Promise<void>(resolve => {
            root.render(component);
            setTimeout(resolve, 500); // Allow render and font loading
        });
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const effectiveDate = tomorrow.toLocaleDateString('ar-EG-u-nu-latn', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        try {
            await document.fonts.ready;
            
            for (let i = 0; i < allVisibleClasses.length; i++) {
                const classInfo = allVisibleClasses[i];
                if (!classInfo?.id) continue;

                await renderComponent(
                    <ClassSchedulePDFPage
                        classInfo={classInfo}
                        scheduleData={scheduleData}
                        settings={settings}
                        effectiveDate={effectiveDate}
                    />
                );

                const pageElement = tempContainer.children[0] as HTMLElement;
                const canvas = await html2canvas(pageElement, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
                setExportProgress(Math.round(((i + 1) / allVisibleClasses.length) * 100));
            }
            pdf.save(`جدول_الحصص_بالشعب.pdf`);
        } catch (error) {
            console.error("PDF Export error:", error);
            alert(`حدث خطأ أثناء التصدير: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            root.unmount();
            if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
            }
            setIsExportingPdf(false);
        }
    };

    const maxPeriods = 7; // Always show 7 periods as per request

    return (
        <DndContext onDragEnd={handleDragEnd}>
            {isExportingPdf && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center z-[100] text-white">
                    <Loader2 className="animate-spin h-16 w-16 mb-4" />
                    <p className="text-2xl font-bold mb-2">جاري تصدير PDF...</p>
                    <div className="w-1/2 bg-gray-600 rounded-full h-4">
                        <div className="bg-cyan-500 h-4 rounded-full" style={{ width: `${exportProgress}%` }}></div>
                    </div>
                    <p className="mt-2 text-lg">{exportProgress}%</p>
                </div>
            )}
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold">معاينة وتعديل الجدول (اضغط Ctrl+Z للتراجع)</h2>
                <button 
                    onClick={handleExportPdf}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-wait w-44"
                    disabled={isExportingPdf}
                >
                    {isExportingPdf ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>جاري التصدير...</span>
                        </>
                    ) : (
                        <>
                            <Download size={18} />
                            <span>تصدير PDF</span>
                        </>
                    )}
                </button>
            </div>
            
            {addMenu && (
                <div className="fixed inset-0 bg-black bg-opacity-25 z-20" onClick={() => setAddMenu(null)}>
                    <div className="absolute bg-white rounded-lg shadow-xl p-2 z-30" style={{top: '50%', left: '50%', transform: 'translate(-50%, -50%)'}} onClick={e => e.stopPropagation()}>
                        <h4 className="font-bold text-center mb-2">اختر مادة</h4>
                        <div className="max-h-60 overflow-y-auto flex flex-col gap-1">
                            {(addMenu.classInfo.subjects || []).map(subject => (
                                <button
                                    key={subject.id}
                                    onClick={() => handleAddSubject(subject)}
                                    className="block w-full text-right px-3 py-2 hover:bg-gray-100 rounded-md"
                                >
                                    {subject.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div>
                {Object.entries(stages).sort(([stageA], [stageB]) => stageA.localeCompare(stageB, 'ar-IQ')).map(([stageName, classesInStage]) => (
                    <StageScheduleTable
                        key={stageName}
                        stageName={stageName}
                        classesInStage={classesInStage}
                        scheduleData={scheduleData}
                        maxPeriods={maxPeriods}
                        onAddClick={handleAddClick}
                    />
                ))}
            </div>
        </DndContext>
    );
}