import React, { useState, useEffect, useMemo } from 'react';
// Fix: Added missing type imports.
import type { User, YardDutySchedule, YardDutyLocation, YardDutyAssignment, YardDutySwapRequest } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { v4 as uuidv4 } from 'uuid';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { Loader2, Download, Upload, Send } from 'lucide-react';

declare const html2canvas: any;

const YARD_DUTY_DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const DAY_NAMES_AR: Record<string, string> = {
    Saturday: 'السبت', Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس'
};

const DEFAULT_LOCATIONS: YardDutyLocation[] = Array.from({ length: 6 }, (_, i) => ({
    id: uuidv4(),
    name: `الموقع ${i + 1}`
}));

const DraggableItem: React.FC<{ id: string; isMyAssignment: boolean; children: React.ReactNode }> = ({ id, isMyAssignment, children }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: id,
        disabled: !isMyAssignment
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
        backgroundColor: isOver ? 'rgba(34, 197, 94, 0.2)' : 'white',
    };
    return <div ref={setNodeRef} style={style}>{children}</div>;
};


export default function YardDutyManager({ currentUser, users }: { currentUser: User; users: User[] }) {
    const [schedule, setSchedule] = useState<YardDutySchedule | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPublishing, setIsPublishing] = useState(false);
    const [swapCandidate, setSwapCandidate] = useState<{ sourceId: string; targetId: string } | null>(null);

    const principalId = currentUser.role === 'principal' ? currentUser.id : currentUser.principalId;
    const teachers = useMemo(() => users.filter(u => u.role === 'teacher' && u.principalId === principalId), [users, principalId]);
    const usersMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);

    useEffect(() => {
        if (!principalId) {
            setIsLoading(false);
            return;
        }
        const scheduleRef = db.ref(`yard_duty_schedules/${principalId}`);
        const callback = (snapshot: any) => {
            if (snapshot.exists()) {
                const data = snapshot.val() || {};
                setSchedule({ 
                    principalId: data.principalId || principalId,
                    locations: data.locations || DEFAULT_LOCATIONS,
                    assignments: data.assignments || []
                });
            } else {
                setSchedule({ principalId, locations: DEFAULT_LOCATIONS, assignments: [] });
            }
            setIsLoading(false);
        };
        scheduleRef.on('value', callback);
        return () => scheduleRef.off('value', callback);
    }, [principalId]);

    const updateSchedule = (newSchedule: YardDutySchedule) => {
        if (principalId) {
            db.ref(`yard_duty_schedules/${principalId}`).set(newSchedule);
        }
    };
    
    const handleLocationNameChange = (locationId: string, newName: string) => {
        if (!schedule) return;
        const newLocations = schedule.locations.map(loc => loc.id === locationId ? { ...loc, name: newName } : loc);
        updateSchedule({ ...schedule, locations: newLocations });
    };

    const handleAssignmentChange = (day: string, locationId: string, teacherId: string) => {
        if (!schedule) return;
        const newAssignments = schedule.assignments.filter(a => !(a.day === day && a.locationId === locationId));
        if (teacherId) {
            newAssignments.push({ day, locationId, teacherId });
        }
        updateSchedule({ ...schedule, assignments: newAssignments });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const [, sourceDay] = (active.id as string).split('|');
            const [, targetDay] = (over.id as string).split('|');
            if (sourceDay === targetDay) {
                alert("لا يمكن المبادلة في نفس اليوم. يرجى اختيار يوم آخر.");
                return;
            }
            setSwapCandidate({ sourceId: active.id as string, targetId: over.id as string });
        }
    };

    const confirmSwap = () => {
        if (!swapCandidate || !schedule || !principalId) return;
        const { sourceId, targetId } = swapCandidate;
        const [sLocId, sDay] = sourceId.split('|');
        const [tLocId, tDay] = targetId.split('|');

        const targetAssignment = schedule.assignments.find(a => a.day === tDay && a.locationId === tLocId);
        if (!targetAssignment) {
            alert("لا يمكن المبادلة مع خانة فارغة.");
            setSwapCandidate(null);
            return;
        }
        
        const newSwapRequest: YardDutySwapRequest = {
            id: uuidv4(),
            requesterId: currentUser.id,
            responderId: targetAssignment.teacherId,
            originalSlot: { day: sDay, locationId: sLocId },
            requestedSlot: { day: tDay, locationId: tLocId },
            status: 'pending_teacher',
        };

        db.ref(`yard_duty_swap_requests/${newSwapRequest.id}`).set(newSwapRequest)
            .then(() => {
                alert("تم إرسال طلب التبديل بنجاح!");
                setSwapCandidate(null);
            });
    };
    
    const handlePublish = () => {
        if (!schedule) return;
        setIsPublishing(true);
        updateSchedule(schedule); // Just re-saving it
        setTimeout(() => {
             alert("تم نشر الجدول بنجاح!");
             setIsPublishing(false);
        }, 1000);
    }
    
    const handleExport = () => {
        const table = document.getElementById('yard-duty-table');
        if (table) {
            html2canvas(table).then(canvas => {
                const link = document.createElement('a');
                link.download = 'جدول-المراقبة.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        }
    };

    if (isLoading) return <div className="flex justify-center items-center p-8"><Loader2 className="h-12 w-12 animate-spin text-cyan-600" /></div>;
    if (!schedule) return <p>لا يوجد جدول مراقبة.</p>;

    const isPrincipal = currentUser.role === 'principal';

    return (
        <DndContext onDragEnd={handleDragEnd}>
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
            <div className="bg-white p-6 rounded-xl shadow-lg" id="yard-duty-table" style={{border: '4px solid #4a4a4a'}}>
                <div className="flex justify-center mb-4">
                    <div className="p-2 bg-white border-4 border-red-500 rounded-lg inline-block">
                        <h2 className="text-3xl font-bold text-center" style={{ position: 'relative', bottom: '10px' }}>جدول المراقبة اليومي</h2>
                    </div>
                </div>
                <table className="w-full border-collapse border-2 border-black">
                    <thead>
                        <tr>
                            <th className="border-2 border-black p-2 bg-gray-200">أيام الاسبوع</th>
                            {schedule.locations.map(loc => (
                                <th key={loc.id} className="border-2 border-black p-2 bg-gray-200">
                                    {isPrincipal ? (
                                        <input 
                                            type="text"
                                            value={loc.name}
                                            onChange={(e) => handleLocationNameChange(loc.id, e.target.value)}
                                            className="w-full text-center bg-transparent font-bold"
                                        />
                                    ) : loc.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {YARD_DUTY_DAYS.map(day => (
                            <tr key={day}>
                                <td className="border-2 border-black p-2 font-bold bg-gray-100">{DAY_NAMES_AR[day]}</td>
                                {schedule.locations.map(loc => {
                                    const assignment = schedule.assignments.find(a => a.day === day && a.locationId === loc.id);
                                    const teacherName = assignment ? usersMap.get(assignment.teacherId) : '';
                                    const id = `${loc.id}|${day}`;
                                    const isMyAssignment = assignment?.teacherId === currentUser.id;

                                    return (
                                        <td key={loc.id} className="border-2 border-black p-1 h-20">
                                            {isPrincipal ? (
                                                <select
                                                    value={assignment?.teacherId || ''}
                                                    onChange={(e) => handleAssignmentChange(day, loc.id, e.target.value)}
                                                    className="w-full h-full bg-transparent border-0 text-center font-semibold"
                                                >
                                                    <option value="">-- اختر --</option>
                                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                            ) : (
                                                <DroppableCell id={id}>
                                                    <DraggableItem id={id} isMyAssignment={isMyAssignment}>
                                                         <div className={`w-full h-full flex justify-center items-center p-1 rounded-md text-lg font-semibold ${isMyAssignment ? 'bg-pink-100 cursor-grab' : 'bg-sky-100'}`}>
                                                            {teacherName || ''}
                                                        </div>
                                                    </DraggableItem>
                                                </DroppableCell>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                 <div className="mt-4 border-2 border-black p-4 bg-gray-50">
                    <h4 className="font-bold text-red-600 mb-2">واجبات المعلم (المدرس) المراقب:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>الالتزام بحضور جميع المراقبين قبل نصف ساعة من الدوام الرسمي لاستقبال التلاميذ ( الطلبة ).</li>
                        <li>الالتزام بتوقيتات الدرس وفق الجرس المدرسي والفرصة حسب التوقيتات</li>
                        <li>الاشراف على دخول التلاميذ ( الطلاب ) وانصرافهم من الباب الخارجي و التاكد من خلو المدرسة قبل المغادرة .</li>
                        <li>تبليغ الادارة في حال وجود شاغر</li>
                        <li>مراقبة سلوك الطلاب في ساحات المدرسة والتاكد من سلامتهم</li>
                        <li>عدم السماح لاي مدرس الخروج يوم المراقبة او الاجازه الا بتقديم البديل عنه.</li>
                        <li>الحرص على عدم دخول الطلبة الى ادارة المدرسة اثناء الفرصة .</li>
                    </ol>
                </div>
            </div>
            {isPrincipal && (
                 <div className="flex justify-center items-center gap-4 mt-6">
                    <button onClick={handlePublish} disabled={isPublishing} className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">
                        {isPublishing ? <Loader2 className="animate-spin" /> : <Upload />}
                        نشر للمعاينة
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">
                        <Download />
                        تصدير كصورة
                    </button>
                 </div>
            )}
        </DndContext>
    );
}