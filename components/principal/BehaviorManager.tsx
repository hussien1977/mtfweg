

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase.ts';
// FIX: Add missing type imports
import type { User, SchoolSettings, ClassData, Student, BehaviorDeduction, StudentNotification } from '../../types.ts';
import { Loader2, ShieldBan, Send, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface BehaviorManagerProps {
    principal: User;
    settings: SchoolSettings;
    classes: ClassData[];
}

export default function BehaviorManager({ principal, settings, classes }: BehaviorManagerProps) {
    const [selectedStage, setSelectedStage] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [allDeductions, setAllDeductions] = useState<Record<string, BehaviorDeduction[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [deductionAmount, setDeductionAmount] = useState<5 | 10 | 15 | 0>(5);
    const [deductionReason, setDeductionReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        const deductionsRef = db.ref(`behavior_deductions/${principal.id}`);
        const callback = (snapshot: any) => {
            const data = snapshot.val() || {};
            const deductionsByStudent: Record<string, BehaviorDeduction[]> = {};
            Object.keys(data).forEach(studentId => {
                deductionsByStudent[studentId] = Object.values(data[studentId]);
            });
            setAllDeductions(deductionsByStudent);
            setIsLoading(false);
        };
        deductionsRef.on('value', callback);
        return () => deductionsRef.off('value', callback);
    }, [principal.id]);
    
    const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
    const studentLabel = settings.schoolLevel === 'ابتدائية' ? 'التلميذ' : 'الطالب';

    const studentTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        Object.entries(allDeductions).forEach(([studentId, deductions]) => {
            totals[studentId] = (deductions as BehaviorDeduction[]).reduce((sum, d) => sum + d.pointsDeducted, 0);
        });
        return totals;
    }, [allDeductions]);

    const handleDeduct = async () => {
        if (!selectedStudentId || !deductionReason.trim() || !selectedClass) {
            alert('يرجى اختيار طالب وكتابة سبب الخصم.');
            return;
        }
        setIsSubmitting(true);
        const student = selectedClass.students.find(s => s.id === selectedStudentId);
        if (!student) {
             setIsSubmitting(false);
             return;
        }

        const newDeduction: BehaviorDeduction = {
            id: uuidv4(),
            principalId: principal.id,
            studentId: selectedStudentId,
            classId: selectedClassId,
            pointsDeducted: deductionAmount,
            reason: deductionReason.trim(),
            timestamp: new Date().toISOString()
        };
        
        const noticeMessage = deductionAmount > 0
            ? `
تنبيه سلوك
التاريخ: ${new Date().toLocaleDateString('ar-EG')}
إلى ولي أمر ${studentLabel} / ${student.name}
الصف والشعبة: ${selectedClass.stage} / ${selectedClass.section}

نود إبلاغكم بأن ${studentLabel} (${student.name}) قد صدر منه سلوك غير لائق داخل المدرسة بتاريخ ${new Date().toLocaleDateString('ar-EG')}، تمثل في (${deductionReason.trim()}). وبناءً عليه تم خصم ${deductionAmount} درجات من رصيد سلوكه.

نحن في إدارة المدرسة نحرص على تربية الطلبة على الانضباط والاحترام المتبادل، ونأمل منكم التعاون معنا في مناقشة الأمر مع ابنكم، وتوجيهه لضرورة الالتزام بأنظمة وقوانين المدرسة.

شاكرين تعاونكم وتفهمكم.

التوقيع:
مدير المدرسة / ${settings.principalName}
        `.trim()
            : `
تنبيه سلوك
التاريخ: ${new Date().toLocaleDateString('ar-EG')}
إلى ولي أمر ${studentLabel} / ${student.name}
الصف والشعبة: ${selectedClass.stage} / ${selectedClass.section}

نود إبلاغكم بأن ${studentLabel} (${student.name}) قد صدر منه سلوك غير لائق داخل المدرسة بتاريخ ${new Date().toLocaleDateString('ar-EG')}، تمثل في (${deductionReason.trim()}). وبناءً عليه تم تنبيهه وتوجيهه وفي حال تكرار المخالفة سوف يتم الخصم من درجات السلوك.

نحن في إدارة المدرسة نحرص على تربية الطلبة على الانضباط والاحترام المتبادل، ونأمل منكم التعاون معنا في مناقشة الأمر مع ابنكم، وتوجيهه لضرورة الالتزام بأنظمة وقوانين المدرسة.

شاكرين تعاونكم وتفهمكم.

التوقيع:
مدير المدرسة / ${settings.principalName}
        `.trim();

        const newNotification: Omit<StudentNotification, 'id'> = {
            studentId: selectedStudentId,
            message: noticeMessage,
            timestamp: new Date().toISOString(),
            isRead: false
        };

        try {
            await db.ref(`behavior_deductions/${principal.id}/${selectedStudentId}/${newDeduction.id}`).set(newDeduction);
            await db.ref(`student_notifications/${principal.id}/${selectedStudentId}`).push(newNotification);
            alert(deductionAmount > 0 ? 'تم خصم الدرجات وإبلاغ الطالب بنجاح.' : 'تم إرسال التنبيه وإبلاغ الطالب بنجاح.');
            setSelectedStudentId(null);
            setDeductionReason('');
        } catch (error) {
            console.error("Failed to deduct points:", error);
            alert('حدث خطأ أثناء عملية الخصم.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="flex items-center gap-3 text-2xl font-bold text-gray-800 mb-6 border-b pb-4">
                <ShieldBan className="w-8 h-8 text-red-500" />
                <h2>إدارة درجات السلوك</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <select value={selectedStage} onChange={e => { setSelectedStage(e.target.value); setSelectedClassId(''); }} className="w-full p-2 border rounded-md">
                    <option value="">-- اختر المرحلة --</option>
                    {Array.from(new Set(classes.map(c => c.stage))).map(stage => <option key={stage} value={stage}>{stage}</option>)}
                </select>
                <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} disabled={!selectedStage} className="w-full p-2 border rounded-md">
                    <option value="">-- اختر الشعبة --</option>
                    {classes.filter(c => c.stage === selectedStage).map(c => <option key={c.id} value={c.id}>{c.section}</option>)}
                </select>
            </div>
            
            {isLoading ? <Loader2 className="animate-spin mx-auto"/> : (
                selectedClass ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <h3 className="text-lg font-bold">قائمة {studentLabel === 'الطالب' ? 'الطلاب' : 'التلاميذ'}</h3>
                            <div className="max-h-[60vh] overflow-y-auto border rounded-lg p-2 bg-gray-50">
                                {(selectedClass.students || []).map(student => (
                                    <div key={student.id} onClick={() => setSelectedStudentId(student.id)} className={`p-3 rounded-md cursor-pointer ${selectedStudentId === student.id ? 'bg-cyan-500 text-white' : 'hover:bg-cyan-100'}`}>
                                        <p className="font-semibold">{student.name}</p>
                                        <p className="text-sm">مجموع الخصم: <span className="font-bold">{studentTotals[student.id] || 0}</span></p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                             {selectedStudentId ? (
                                <div className="p-4 border rounded-lg shadow-inner bg-blue-50">
                                    <h3 className="text-lg font-bold mb-4">خصم درجات من: <span className="text-cyan-700">{selectedClass.students.find(s=>s.id === selectedStudentId)?.name}</span></h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="font-semibold">مقدار الخصم:</label>
                                            <div className="flex gap-2 mt-1">
                                                {[5, 10, 15].map(amount => (
                                                    <button key={amount} onClick={() => setDeductionAmount(amount as 5|10|15)} className={`px-4 py-2 rounded-md font-bold ${deductionAmount === amount ? 'bg-red-600 text-white' : 'bg-white border'}`}>
                                                        {amount} درجات
                                                    </button>
                                                ))}
                                                <button onClick={() => setDeductionAmount(0)} className={`px-4 py-2 rounded-md font-bold ${deductionAmount === 0 ? 'bg-yellow-500 text-white' : 'bg-white border'}`}>
                                                    تنبيه
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="reason" className="font-semibold">سبب الخصم (سيظهر في التبليغ):</label>
                                            <textarea id="reason" value={deductionReason} onChange={e => setDeductionReason(e.target.value)} rows={4} className="w-full mt-1 p-2 border rounded-md" required/>
                                        </div>
                                        <button onClick={handleDeduct} disabled={isSubmitting} className="w-full flex justify-center items-center gap-2 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:bg-gray-400">
                                            {isSubmitting ? <Loader2 className="animate-spin"/> : <Send/>}
                                            {deductionAmount > 0 ? 'خصم وإبلاغ' : 'تنبيه وإبلاغ'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg p-4">
                                    <p className="text-gray-500">اختر {studentLabel} من القائمة لخصم الدرجات.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-gray-500 p-8">يرجى اختيار مرحلة وشعبة لعرض الطلاب.</p>
                )
            )}
        </div>
    );
}