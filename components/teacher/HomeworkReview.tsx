
import React, { useState, useEffect, useMemo } from 'react';
import type { Teacher, ClassData, Homework, HomeworkSubmission, Student, StudentNotification, HomeworkProgress } from '../../types.ts';
import { db, firebase } from '../../lib/firebase.ts';
import { Loader2, ArrowLeft, Check, X, Eye, Pencil, Trash2, Save, Paperclip, Image as ImageIcon, Video } from 'lucide-react';

interface HomeworkReviewProps {
    teacher: Teacher;
    classes: ClassData[];
}

const SubmissionModal = ({ submission, homework, onClose, onUpdateStatus }: { submission: HomeworkSubmission; homework: Homework; onClose: () => void; onUpdateStatus: (submissionId: string, status: 'accepted' | 'rejected', reason?: string) => void; }) => {
    const [rejectionReason, setRejectionReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);

    const handleReject = () => {
        if (!rejectionReason.trim()) {
            alert('يرجى كتابة سبب الرفض.');
            return;
        }
        onUpdateStatus(submission.id, 'rejected', rejectionReason);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl relative max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-2">تسليم الطالب: {submission.studentName}</h3>
                <h4 className="font-semibold text-gray-700 mb-4 border-b pb-2">عنوان الواجب: {homework.title}</h4>
                
                <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg border">
                        <p className="font-bold mb-2 text-gray-800 flex items-center gap-2"><Paperclip size={16}/> الإجابة النصية:</p>
                        <p className="whitespace-pre-wrap text-gray-700">{submission.texts?.[0] || 'لا توجد إجابة نصية.'}</p>
                    </div>

                    {submission.attachments && submission.attachments.length > 0 && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="font-bold mb-3 text-blue-800 flex items-center gap-2"><ImageIcon size={16}/> المرفقات:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {submission.attachments.map((att, idx) => (
                                    <div key={idx} className="bg-white border rounded-lg p-2 shadow-sm">
                                        <div className="aspect-video bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                                            {att.type === 'image' ? (
                                                <a href={att.url} target="_blank" rel="noopener noreferrer" className="w-full h-full">
                                                    <img src={att.url} alt={att.name} className="w-full h-full object-contain hover:scale-105 transition-transform" />
                                                </a>
                                            ) : (
                                                <video src={att.url} controls className="w-full h-full object-contain" />
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600 truncate max-w-[70%]" title={att.name}>{att.name}</span>
                                            <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-semibold">
                                                فتح الأصلي
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {submission.status === 'pending' && !isRejecting && (
                    <div className="mt-6 flex justify-end gap-4 pt-4 border-t">
                        <button onClick={() => setIsRejecting(true)} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition">رفض</button>
                        <button onClick={() => onUpdateStatus(submission.id, 'accepted')} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition">قبول</button>
                    </div>
                )}

                {isRejecting && (
                    <div className="mt-4 bg-red-50 p-4 rounded-lg border border-red-100">
                        <label className="font-semibold text-red-800 block mb-2">سبب الرفض:</label>
                        <textarea 
                            value={rejectionReason} 
                            onChange={e => setRejectionReason(e.target.value)} 
                            rows={3} 
                            className="w-full p-2 border rounded-md bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                            placeholder="يرجى توضيح سبب الرفض للطالب..."
                        ></textarea>
                        <div className="mt-3 flex justify-end gap-4">
                            <button onClick={() => setIsRejecting(false)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400">إلغاء</button>
                            <button onClick={handleReject} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">تأكيد الرفض</button>
                        </div>
                    </div>
                )}
                 <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition text-gray-600"><X size={20} /></button>
            </div>
        </div>
    );
};


export default function HomeworkReview({ teacher, classes }: HomeworkReviewProps) {
    const [allHomeworks, setAllHomeworks] = useState<Homework[]>([]);
    const [allSubmissions, setAllSubmissions] = useState<HomeworkSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedHomeworkId, setSelectedHomeworkId] = useState<string | null>(null);
    const [viewingSubmission, setViewingSubmission] = useState<HomeworkSubmission | null>(null);
    const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
    const [editFormData, setEditFormData] = useState({ title: '', notes: '', deadline: '' });


    const principalId = teacher.principalId;

    useEffect(() => {
        if (!principalId) return;
        setIsLoading(true);

        const homeworkRef = db.ref(`homework_data/${principalId}`);
        const submissionsRef = db.ref(`homework_submissions/${principalId}`);

        const homeworkCallback = (snapshot: any) => {
            const data = snapshot.val() || {};
            const teacherHomeworks = Object.values(data).filter((hw: any) => hw.teacherId === teacher.id) as Homework[];
            setAllHomeworks(teacherHomeworks.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        };
        
        const submissionsCallback = (snapshot: any) => {
            const data = snapshot.val() || {};
            const subs: HomeworkSubmission[] = Object.values(data).flatMap((studentSubs: any) => Object.values(studentSubs));
            setAllSubmissions(subs);
        };

        homeworkRef.on('value', homeworkCallback);
        submissionsRef.on('value', submissionsCallback);
        
        Promise.all([homeworkRef.get(), submissionsRef.get()]).finally(() => setIsLoading(false));

        return () => {
            homeworkRef.off('value', homeworkCallback);
            submissionsRef.off('value', submissionsCallback);
        };

    }, [principalId, teacher.id]);

    const submissionsByHomework = useMemo(() => {
        const grouped: Record<string, HomeworkSubmission[]> = {};
        const teacherHomeworkIds = new Set(allHomeworks.map(hw => hw.id));
    
        allSubmissions.forEach(sub => {
            if (teacherHomeworkIds.has(sub.homeworkId)) {
                if (!grouped[sub.homeworkId]) {
                    grouped[sub.homeworkId] = [];
                }
                grouped[sub.homeworkId].push(sub);
            }
        });
        return grouped;
    }, [allSubmissions, allHomeworks]);
    
    const selectedHomework = useMemo(() => {
        return allHomeworks.find(hw => hw.id === selectedHomeworkId);
    }, [selectedHomeworkId, allHomeworks]);

    const studentsForSelectedHomework = useMemo(() => {
        if (!selectedHomework) return [];
        return selectedHomework.classIds.flatMap(classId => classes.find(c => c.id === classId)?.students || []);
    }, [selectedHomework, classes]);

    const handleOpenEditModal = (homework: Homework) => {
        setEditingHomework(homework);
        setEditFormData({
            title: homework.title,
            notes: homework.notes,
            deadline: homework.deadline,
        });
    };

    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateHomework = async () => {
        if (!editingHomework || !principalId) return;

        const updates = {
            title: editFormData.title.trim(),
            notes: editFormData.notes.trim(),
            deadline: editFormData.deadline,
        };

        if (!updates.title || !updates.deadline) {
            alert("العنوان والموعد النهائي حقول إلزامية.");
            return;
        }

        try {
            await db.ref(`/homework_data/${principalId}/${editingHomework.id}`).update(updates);
            alert("تم تحديث الواجب بنجاح.");
            setEditingHomework(null);
        } catch (error) {
            console.error("Failed to update homework:", error);
            alert("حدث خطأ أثناء تحديث الواجب.");
        }
    };

    const handleDeleteHomework = async (homework: Homework) => {
        if (!window.confirm(`هل أنت متأكد من حذف الواجب "${homework.title}"؟ سيتم حذف جميع تسليمات الطلاب المتعلقة به أيضاً. لا يمكن التراجع عن هذا الإجراء.`)) {
            return;
        }

        const { id, principalId, classIds, subjectId } = homework;

        if (!principalId) {
            alert("خطأ: لا يمكن تحديد المدرسة.");
            return;
        }

        const updates: Record<string, any> = {};
        updates[`/homework_data/${principalId}/${id}`] = null;
        classIds.forEach(classId => {
            updates[`/active_homework/${principalId}/${classId}/${subjectId}`] = null;
        });

        const submissionsToDelete = allSubmissions.filter(sub => sub.homeworkId === id);
        const studentsWithAcceptedSubs = submissionsToDelete
            .filter(sub => sub.status === 'accepted')
            .map(sub => sub.studentId);

        submissionsToDelete.forEach(sub => {
            updates[`/homework_submissions/${principalId}/${sub.studentId}/${id}`] = null;
        });
        
        try {
            // Step 1: Get current progress for affected students
            const progressToUpdate: { studentId: string, ref: any, data: HomeworkProgress }[] = [];
            if (studentsWithAcceptedSubs.length > 0) {
                const progressPromises = studentsWithAcceptedSubs.map(studentId => 
                    db.ref(`homework_progress/${principalId}/${studentId}`).get()
                );
                const progressSnapshots = await Promise.all(progressPromises);

                progressSnapshots.forEach((snap, index) => {
                    if (snap.exists()) {
                        progressToUpdate.push({
                            studentId: studentsWithAcceptedSubs[index],
                            ref: snap.ref,
                            data: snap.val()
                        });
                    }
                });
            }

            // Step 2: Apply main deletions
            await db.ref().update(updates);
            
            // Step 3: Recalculate and update progress for affected students
            const progressUpdatePromises = progressToUpdate.map(async ({ studentId, ref }) => {
                const studentSubmissionsSnapshot = await db.ref(`homework_submissions/${principalId}/${studentId}`).get();
                const studentSubmissions: Record<string, HomeworkSubmission> = studentSubmissionsSnapshot.val() || {};

                const acceptedSubmissions = Object.values(studentSubmissions).filter(sub => sub.status === 'accepted');
                const newTotalCompleted = acceptedSubmissions.length;
                const newMonthlyCompleted: Record<string, { count: number; lastTimestamp: number }> = {};
                
                acceptedSubmissions.forEach(sub => {
                    const reviewDate = sub.reviewedAt || sub.submittedAt;
                    if (!reviewDate) return;
                    const monthKey = new Date(reviewDate).toISOString().slice(0, 7);
                    
                    if (!newMonthlyCompleted[monthKey]) {
                        newMonthlyCompleted[monthKey] = { count: 0, lastTimestamp: 0 };
                    }
                    newMonthlyCompleted[monthKey].count++;
                    newMonthlyCompleted[monthKey].lastTimestamp = Math.max(newMonthlyCompleted[monthKey].lastTimestamp, new Date(reviewDate).getTime());
                });

                const newProgress: HomeworkProgress = {
                    totalCompleted: newTotalCompleted,
                    monthlyCompleted: newMonthlyCompleted,
                };
                
                return ref.set(newProgress);
            });
            
            await Promise.all(progressUpdatePromises);

            alert("تم حذف الواجب بنجاح.");

        } catch (error) {
            console.error("Failed to delete homework:", error);
            alert("حدث خطأ أثناء حذف الواجب.");
        }
    };
    
    const handleUpdateSubmissionStatus = async (submissionId: string, status: 'accepted' | 'rejected', reason?: string) => {
        if (!viewingSubmission || !principalId) return;
    
        const oldStatus = viewingSubmission.status;
        if (oldStatus === status) {
            setViewingSubmission(null);
            return;
        }
    
        const submissionPath = `homework_submissions/${principalId}/${viewingSubmission.studentId}/${viewingSubmission.homeworkId}`;
        const updates: any = { status, reviewedAt: new Date().toISOString() };
        if (status === 'rejected') {
            updates.rejectionReason = reason;
        }
    
        try {
            // 1. Update submission status FIRST
            await db.ref(submissionPath).update(updates);
    
            // 2. If the status changes to or from 'accepted', recalculate the student's entire progress to ensure accuracy.
            if (status === 'accepted' || oldStatus === 'accepted') {
                const studentId = viewingSubmission.studentId;
                const studentSubmissionsRef = db.ref(`homework_submissions/${principalId}/${studentId}`);
                const snapshot = await studentSubmissionsRef.get();
                const studentSubmissions: Record<string, HomeworkSubmission> = snapshot.val() || {};
    
                const acceptedSubmissions = Object.values(studentSubmissions).filter(sub => sub.status === 'accepted');
    
                const newTotalCompleted = acceptedSubmissions.length;
                const newMonthlyCompleted: Record<string, { count: number; lastTimestamp: number }> = {};
                
                acceptedSubmissions.forEach(sub => {
                    const reviewDate = sub.reviewedAt || sub.submittedAt;
                    if (!reviewDate) return;
                    const monthKey = new Date(reviewDate).toISOString().slice(0, 7);
                    
                    if (!newMonthlyCompleted[monthKey]) {
                        newMonthlyCompleted[monthKey] = { count: 0, lastTimestamp: 0 };
                    }
                    newMonthlyCompleted[monthKey].count++;
                    newMonthlyCompleted[monthKey].lastTimestamp = Math.max(
                        newMonthlyCompleted[monthKey].lastTimestamp,
                        new Date(reviewDate).getTime()
                    );
                });
    
                const newProgress: HomeworkProgress = {
                    totalCompleted: newTotalCompleted,
                    monthlyCompleted: newMonthlyCompleted,
                };
                
                await db.ref(`homework_progress/${principalId}/${studentId}`).set(newProgress);
            }
            
            // 3. Send notification to student
            const studentId = viewingSubmission.studentId;
            const homeworkTitle = selectedHomework?.title || "واجب";
            const message = status === 'accepted'
                ? `تم قبول واجبك "${homeworkTitle}". أحسنت!`
                : `تم رفض واجبك "${homeworkTitle}". السبب: ${reason}`;
    
            const notification: Omit<StudentNotification, 'id'> = {
                studentId,
                message,
                timestamp: new Date().toISOString(),
                isRead: false
            };
            await db.ref(`student_notifications/${principalId}/${studentId}`).push(notification);
    
            alert('تم تحديث حالة التسليم بنجاح.');
            setViewingSubmission(null);
        } catch (error) {
            console.error(error);
            alert('حدث خطأ أثناء تحديث حالة الواجب.');
        }
    };


    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-10 w-10 text-cyan-600"/></div>
    }
    
    if (selectedHomework) {
        return (
             <div>
                {viewingSubmission && (
                    <SubmissionModal 
                        submission={viewingSubmission} 
                        homework={selectedHomework}
                        onClose={() => setViewingSubmission(null)}
                        onUpdateStatus={handleUpdateSubmissionStatus}
                    />
                )}
                <button onClick={() => setSelectedHomeworkId(null)} className="flex items-center gap-2 mb-4 text-cyan-600 font-semibold hover:text-cyan-800">
                    <ArrowLeft size={20} />
                    <span>العودة لقائمة الواجبات</span>
                </button>
                <h3 className="text-2xl font-bold text-gray-800 mb-1">{selectedHomework.title}</h3>
                <p className="text-gray-500 mb-6">{selectedHomework.subjectName}</p>
                <div className="mt-4 max-h-[70vh] overflow-y-auto border rounded-lg shadow-sm">
                    <table className="w-full">
                         <thead className="sticky top-0 bg-gray-100 z-10">
                            <tr>
                                <th className="p-3 text-right font-bold text-gray-700">اسم الطالب</th>
                                <th className="p-3 text-right font-bold text-gray-700">الشعبة</th>
                                <th className="p-3 text-center font-bold text-gray-700">الحالة</th>
                                <th className="p-3 text-center font-bold text-gray-700">الإجراء</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {studentsForSelectedHomework.map(student => {
                                const submission = submissionsByHomework[selectedHomework.id]?.find(s => s.studentId === student.id);
                                const studentClass = classes.find(c => c.students?.some(s => s.id === student.id));
                                return (
                                    <tr key={student.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="p-3 font-semibold text-gray-800">{student.name}</td>
                                        <td className="p-3 text-gray-600">{studentClass?.section}</td>
                                        <td className="p-3 text-center">
                                            {submission ? (
                                                <span className={`px-3 py-1 text-xs font-bold rounded-full inline-block min-w-[80px] ${
                                                    submission.status === 'accepted' ? 'bg-green-100 text-green-700 border border-green-200' :
                                                    submission.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                                                    'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                                }`}>
                                                    {submission.status === 'accepted' ? 'مقبول' : submission.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-sm">لم يسلم</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            {submission ? (
                                                <button onClick={() => setViewingSubmission(submission)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors" title="عرض الإجابة">
                                                    <Eye size={20} />
                                                </button>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {editingHomework && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                        <h3 className="text-xl font-bold mb-4">تعديل الواجب</h3>
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700">العنوان</label>
                                <input id="edit-title" name="title" type="text" value={editFormData.title} onChange={handleEditFormChange} className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                            <div>
                                <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700">الملاحظات</label>
                                <textarea id="edit-notes" name="notes" value={editFormData.notes} onChange={handleEditFormChange} rows={4} className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                            <div>
                                <label htmlFor="edit-deadline" className="block text-sm font-medium text-gray-700">الموعد النهائي</label>
                                <input id="edit-deadline" name="deadline" type="date" value={editFormData.deadline} onChange={handleEditFormChange} className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setEditingHomework(null)} className="px-4 py-2 bg-gray-200 rounded-md">إلغاء</button>
                            <button onClick={handleUpdateHomework} className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center gap-2"><Save size={18}/> حفظ التعديلات</button>
                        </div>
                    </div>
                </div>
            )}
            {allHomeworks.length === 0 ? (
                <p className="text-center text-gray-500 p-8">لم تقم بإرسال أي واجبات بعد.</p>
            ) : (
                allHomeworks.map(hw => {
                    const submissionCount = submissionsByHomework[hw.id]?.length || 0;
                    const isPastDeadline = new Date() > new Date(hw.deadline);
                    return (
                        <div key={hw.id} className="p-4 bg-gray-50 rounded-lg border flex flex-col sm:flex-row justify-between items-start hover:shadow-md transition-shadow">
                            <div className="flex-grow cursor-pointer p-2 -m-2 rounded-md" onClick={() => setSelectedHomeworkId(hw.id)}>
                                <h4 className="font-bold text-lg text-gray-800 mb-1">{hw.title}</h4>
                                <p className="text-sm font-semibold text-cyan-700">{hw.subjectName}</p>
                                <div className="text-xs text-gray-500 mt-2 flex gap-4">
                                    <span>📅 تاريخ الإنشاء: {new Date(hw.createdAt).toLocaleDateString('ar-EG')}</span>
                                    <span className={isPastDeadline ? "text-red-500 font-bold" : ""}>⏰ الموعد النهائي: {new Date(hw.deadline).toLocaleDateString('ar-EG')}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 mt-2 sm:mt-0 sm:ml-4 flex-shrink-0 bg-gray-100 p-2 rounded-lg">
                                <div className="text-center px-2">
                                    <p className="text-2xl font-bold text-cyan-600">{submissionCount}</p>
                                    <p className="text-xs font-semibold text-gray-500">تسليم</p>
                                </div>
                                <div className="flex flex-col gap-2 border-r pr-3 border-gray-300">
                                    {!isPastDeadline && (
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal(hw); }} className="p-1.5 text-yellow-600 hover:bg-yellow-100 rounded-full transition-colors" title="تعديل الواجب">
                                            <Pencil size={18} />
                                        </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteHomework(hw); }} className="p-1.5 text-red-600 hover:bg-red-100 rounded-full transition-colors" title="حذف الواجب">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    );
}
