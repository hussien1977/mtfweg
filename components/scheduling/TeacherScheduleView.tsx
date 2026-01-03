import React, { useState, useEffect, useMemo } from 'react';
// Fix: Added missing type imports.
import type { User, ScheduleData, ClassData, SwapRequest } from '../../types';
import { db } from '../../lib/firebase';
import { Loader2, Send } from 'lucide-react';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { v4 as uuidv4 } from 'uuid';

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const DAY_NAMES_AR: Record<string, string> = {
    Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس'
};

interface TeacherScheduleViewProps {
    currentUser: User;
    users: User[];
}

const getClassNameKey = (stage: string, section: string): string => `${stage.replace(/ /g, '-')}-${section}`;

const DraggableItem: React.FC<{ id: string; isMyClass: boolean; children: React.ReactNode }> = ({ id, isMyClass, children }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: id,
        disabled: !isMyClass
    });
    const style: React.CSSProperties = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 100,
    } : {};
    
    if (isDragging) {
        style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
        style.cursor = 'grabbing';
    }

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            {children}
        </div>
    );
}

const DroppableCell: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
    const { isOver, setNodeRef } = useDroppable({ id });
    const style: React.CSSProperties = {
        transition: 'background-color 0.2s ease',
        backgroundColor: isOver ? 'rgba(34, 197, 94, 0.2)' : undefined, // Light green for drop target
    };
    return (
        <td ref={setNodeRef} style={style} className="border border-gray-300 p-0 align-middle h-24">
            {children}
        </td>
    );
};

export default function TeacherScheduleView({ currentUser, users }: TeacherScheduleViewProps) {
    const [schedule, setSchedule] = useState<ScheduleData | null>(null);
    const [allClasses, setAllClasses] = useState<ClassData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [swapCandidate, setSwapCandidate] = useState<{ sourceId: string; targetId: string } | null>(null);

    useEffect(() => {
        if (!currentUser.principalId) {
            setIsLoading(false);
            return;
        }
        const scheduleRef = db.ref(`schedules/${currentUser.principalId}`);
        const classesRef = db.ref('classes');

        const scheduleCallback = (snapshot: any) => setSchedule(snapshot.val());
        const classesCallback = (snapshot: any) => {
            const data = snapshot.val();
            const principalClasses = Object.values(data || {}).filter((c: any) => c.principalId === currentUser.principalId) as ClassData[];
            setAllClasses(principalClasses);
        };
        scheduleRef.on('value', scheduleCallback);
        classesRef.on('value', classesCallback);

        Promise.all([scheduleRef.get(), classesRef.get()]).finally(() => setIsLoading(false));

        return () => {
            scheduleRef.off('value', scheduleCallback);
            classesRef.off('value', classesCallback);
        };
    }, [currentUser.principalId]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSwapCandidate({ sourceId: active.id as string, targetId: over.id as string });
        }
    };

    const confirmSwap = () => {
        if (!swapCandidate || !schedule) return;

        const { sourceId, targetId } = swapCandidate;
        const [sDay, sPeriodStr, sClass] = sourceId.split('|');
        const [tDay, tPeriodStr, tClass] = targetId.split('|');
        
        const sourcePeriod = parseInt(sPeriodStr, 10);
        const targetPeriod = parseInt(tPeriodStr, 10);

        const sourceAssignment = schedule[sDay]?.find(p => p.period === sourcePeriod)?.assignments?.[sClass];
        const targetAssignment = schedule[tDay]?.find(p => p.period === targetPeriod)?.assignments?.[tClass];

        if (!sourceAssignment || !targetAssignment || sourceAssignment.teacher === targetAssignment.teacher) {
            alert("لا يمكن التبديل مع نفسك أو مع خانة فارغة.");
            setSwapCandidate(null);
            return;
        }
        
        const responder = users.find(u => u.name === targetAssignment.teacher);
        if (!responder) {
            alert("لم يتم العثور على المدرس المستهدف للتبديل.");
            setSwapCandidate(null);
            return;
        }

        const newSwapRequest: SwapRequest = {
            id: uuidv4(),
            requesterId: currentUser.id,
            responderId: responder.id,
            originalSlot: { classId: sClass, day: sDay, period: sourcePeriod },
            requestedSlot: { classId: tClass, day: tDay, period: targetPeriod },
            status: 'pending_teacher',
        };
        
        db.ref(`swap_requests/${newSwapRequest.id}`).set(newSwapRequest)
            .then(() => {
                alert("تم إرسال طلب التبديل بنجاح!");
                setSwapCandidate(null);
            })
            .catch(error => {
                console.error("Error sending swap request:", error);
                alert("فشل إرسال طلب التبديل.");
            });
    };
    
    const stages = useMemo(() => {
        const grouped: Record<string, ClassData[]> = {};
        allClasses.forEach(c => {
            if (!grouped[c.stage]) grouped[c.stage] = [];
            grouped[c.stage].push(c);
        });
        return grouped;
    }, [allClasses]) as Record<string, ClassData[]>;
    
    const maxPeriods = 7;

    if (isLoading) return <div className="flex justify-center items-center p-8"><Loader2 className="h-12 w-12 animate-spin text-cyan-600" /></div>;
    if (!schedule) return <div className="bg-white p-6 rounded-xl shadow-lg text-center"><p>لم يتم نشر جدول دراسي بعد.</p></div>;

    const abbreviateStageName = (name: string) => {
        const stageMap: Record<string, string> = { 'الاول متوسط': 'الأول', 'الثاني متوسط': 'الثاني', 'الثالث متوسط': 'الثالث' };
        return stageMap[name] || name;
    }

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <div className="bg-white p-6 rounded-xl shadow-lg">
                 {swapCandidate && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-xl text-center">
                            <h3 className="text-lg font-bold mb-4">تأكيد طلب التبديل</h3>
                            <p className="mb-6">هل أنت متأكد من رغبتك في إرسال طلب لتبديل هذه الحصة؟</p>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setSwapCandidate(null)} className="px-6 py-2 bg-gray-300 rounded-lg">إلغاء</button>
                                <button onClick={confirmSwap} className="px-6 py-2 bg-green-500 text-white rounded-lg flex items-center gap-2">
                                    <Send size={18}/> نعم، أرسل الطلب
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <p className="text-center text-gray-600 mb-4">اسحب حصتك (<span className="p-1 bg-pink-200 rounded mx-1">باللون الوردي</span>) وأفلتها على حصة زميل لاقتراح تبديل.</p>
                <div className="overflow-x-auto">
                    {Object.entries(stages).sort(([stageA], [stageB]) => stageA.localeCompare(stageB, 'ar-IQ')).map(([stageName, classesInStage]) => (
                        <div key={stageName} className="mb-10">
                            <h3 className="text-2xl font-bold text-center mb-2 bg-gray-100 p-2 rounded">{stageName}</h3>
                            <table className="w-full border-collapse border border-black text-center">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="border-2 border-black p-2 w-16">اليوم</th>
                                        {DAYS.map(day => <th key={day} className="border-2 border-black p-2">{DAY_NAMES_AR[day]}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {classesInStage.sort((a,b) => a.section.localeCompare(b.section)).map(c => (
                                        <React.Fragment key={c.id}>
                                            {Array.from({ length: maxPeriods }, (_, i) => i + 1).map(period => (
                                                <tr key={`${c.id}-${period}`} className={period === 1 ? 'border-t-4 border-blue-200' : ''}>
                                                    {period === 1 && <td rowSpan={maxPeriods} className="border-2 border-black p-2 font-bold text-xl align-middle bg-gray-100">
                                                        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                                          {abbreviateStageName(c.stage)} {c.section}
                                                        </div>
                                                    </td>}
                                                    {DAYS.map(day => {
                                                        const classNameKey = getClassNameKey(c.stage, c.section);
                                                        const assignment = schedule[day]?.find(p => p.period === period)?.assignments?.[classNameKey];
                                                        const id = `${day}|${period}|${classNameKey}`;
                                                        const isMyClass = assignment?.teacher === currentUser.name;
                                                        
                                                        return (
                                                            <DroppableCell key={id} id={id}>
                                                                {assignment ? (
                                                                    <DraggableItem id={id} isMyClass={isMyClass}>
                                                                        <div className={`w-full h-full flex flex-col justify-center items-center p-1 rounded-md ${isMyClass ? 'bg-pink-200 cursor-grab' : 'bg-sky-100'}`}>
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
                    ))}
                </div>
            </div>
        </DndContext>
    );
}