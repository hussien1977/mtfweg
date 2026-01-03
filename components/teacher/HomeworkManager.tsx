import React, { useState, useMemo, useRef } from 'react';
import type { Teacher, ClassData, Homework, HomeworkAttachment, StudentNotification } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { v4 as uuidv4 } from 'uuid';
import { Send, ClipboardList, Loader2, Image as ImageIcon, Video, X, Paperclip } from 'lucide-react';
import HomeworkReview from './HomeworkReview.tsx';

interface HomeworkManagerProps {
    teacher: Teacher;
    classes: ClassData[];
}

export default function HomeworkManager({ teacher, classes }: HomeworkManagerProps) {
    const [activeTab, setActiveTab] = useState<'send' | 'review'>('send');
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [deadline, setDeadline] = useState('');
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    
    // Upload states
    const [attachments, setAttachments] = useState<HomeworkAttachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const teacherAssignments = useMemo(() => {
        const uniqueSubjects = new Map<string, { subjectId: string, subjectName: string, classIds: string[] }>();
        (teacher.assignments || []).forEach(a => {
            const classInfo = classes.find(c => c.id === a.classId);
            const subjectInfo = classInfo?.subjects.find(s => s.id === a.subjectId);
            if (subjectInfo) {
                if (uniqueSubjects.has(subjectInfo.id)) {
                    uniqueSubjects.get(subjectInfo.id)!.classIds.push(a.classId);
                } else {
                    uniqueSubjects.set(subjectInfo.id, { subjectId: subjectInfo.id, subjectName: subjectInfo.name, classIds: [a.classId] });
                }
            }
        });
        return Array.from(uniqueSubjects.values());
    }, [teacher.assignments, classes]);

    const classesForSubject = useMemo(() => {
        if (!selectedSubjectId) return [];
        const assignment = teacherAssignments.find(a => a.subjectId === selectedSubjectId);
        return assignment ? assignment.classIds : [];
    }, [selectedSubjectId, teacherAssignments]);

    const uploadToImgur = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('type', 'file');

        if (file.type.startsWith('video/')) {
             formData.append('disable_audio', '0');
        }

        const clientId = "546c25a59c58ad7"; 
        
        try {
            const response = await fetch('https://api.imgur.com/3/upload', {
                method: 'POST',
                headers: {
                    Authorization: `Client-ID ${clientId}`,
                },
                body: formData,
            });
            
            const data = await response.json();
            if (!data.success) {
                console.error("Imgur Error:", JSON.stringify(data));
                const errorMessage = typeof data.data.error === 'string' 
                    ? data.data.error 
                    : (data.data.error?.message || JSON.stringify(data.data.error));
                    
                throw new Error(errorMessage || "فشل الرفع إلى Imgur");
            }
            return data.data.link;
        } catch (error: any) {
            console.error("Upload request failed:", error);
            let displayMessage = error.message || "خطأ في الاتصال بخدمة رفع الملفات";
            if (displayMessage.includes("We don't support that file type") || displayMessage.includes("File type invalid")) {
                displayMessage = "عذراً، نوع الملف غير مدعوم من قبل الخادم (يرجى استخدام MP4 للفيديو و PNG/JPG للصور).";
            }
            throw new Error(displayMessage);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        const newAttachments: HomeworkAttachment[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const isImage = file.type.startsWith('image/');
                const isVideo = file.type.startsWith('video/');

                if (!isImage && !isVideo) {
                    alert(`الملف ${file.name} ليس صورة أو فيديو. تم تجاهله.`);
                    continue;
                }

                try {
                    const url = await uploadToImgur(file);
                    newAttachments.push({
                        name: file.name,
                        url: url,
                        type: isVideo ? 'video' : 'image'
                    });
                } catch (err: any) {
                    alert(`فشل رفع الملف ${file.name}: ${err.message}`);
                }
            }
            setAttachments(prev => [...prev, ...newAttachments]);
        } catch (error) {
            console.error("Global Upload error:", error);
            alert("حدث خطأ غير متوقع أثناء رفع الملفات.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSendHomework = async () => {
        if (!title.trim() || !deadline || selectedClassIds.length === 0 || !selectedSubjectId) {
            alert('يرجى اختيار مادة، وملء العنوان، والموعد النهائي، واختيار شعبة واحدة على الأقل.');
            return;
        }
        
        const assignment = teacherAssignments.find(a => a.subjectId === selectedSubjectId);
        if (!assignment) {
            alert('لا يمكنك إرسال واجب بدون تعيين مادة لك.');
            return;
        }

        setIsSending(true);

        try {
            const homeworkId = uuidv4();
            const newHomework: Omit<Homework, 'texts'> = {
                id: homeworkId,
                principalId: teacher.principalId!,
                teacherId: teacher.id,
                classIds: selectedClassIds,
                subjectId: assignment.subjectId,
                subjectName: assignment.subjectName,
                title: title.trim(),
                notes: notes.trim(),
                deadline,
                createdAt: new Date().toISOString(),
                attachments: attachments
            };
            
            const updates: Record<string, any> = {};
            updates[`/homework_data/${teacher.principalId}/${homeworkId}`] = newHomework;
            
            selectedClassIds.forEach(classId => {
                updates[`/active_homework/${teacher.principalId}/${classId}/${assignment.subjectId}`] = { homeworkId };
                
                // Add notifications for all students in the selected classes
                const classData = classes.find(c => c.id === classId);
                if (classData && classData.students) {
                    classData.students.forEach(student => {
                        const notification: Omit<StudentNotification, 'id'> = {
                            studentId: student.id,
                            message: `واجب جديد في مادة ${assignment.subjectName}: ${title.trim()}. الموعد النهائي للتقديم: ${deadline}`,
                            timestamp: new Date().toISOString(),
                            isRead: false
                        };
                        const notifKey = db.ref(`student_notifications/${teacher.principalId}/${student.id}`).push().key;
                        if (notifKey) {
                            updates[`student_notifications/${teacher.principalId}/${student.id}/${notifKey}`] = notification;
                        }
                    });
                }
            });

            await db.ref().update(updates);
            alert('تم إرسال الواجب وإرسال إشعارات للطلاب بنجاح.');
            // Reset form
            setTitle(''); 
            setNotes(''); 
            setDeadline(''); 
            setSelectedClassIds([]);
            setAttachments([]);

        } catch (error) {
            console.error(error);
            alert('حدث خطأ أثناء إرسال الواجب.');
        } finally {
            setIsSending(false);
        }
    };

    const renderSendTab = () => (
        <div className="space-y-6 max-w-2xl mx-auto">
            <select value={selectedSubjectId} onChange={e => { setSelectedSubjectId(e.target.value); setSelectedClassIds([]); }} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500">
                <option value="">-- اختر المادة --</option>
                {teacherAssignments.map(a => <option key={a.subjectId} value={a.subjectId}>{a.subjectName}</option>)}
            </select>
            {selectedSubjectId && (
                <>
                    <input type="text" placeholder="عنوان الواجب" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"/>
                    <textarea placeholder="ملاحظات أو نص الواجب (اختياري)" value={notes} onChange={e => setNotes(e.target.value)} rows={5} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"/>
                    
                    <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-bold mb-2 text-gray-700">المرفقات (صور وفيديو):</h4>
                        
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            multiple
                            accept="image/png,image/jpeg,image/gif,video/mp4,video/webm" 
                        />
                        
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition disabled:bg-gray-400 mb-4"
                        >
                            {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Paperclip size={18} />}
                            <span>{isUploading ? 'جاري الرفع...' : 'إرفاق ملفات (Imgur)'}</span>
                        </button>

                        {attachments.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {attachments.map((att, index) => (
                                    <div key={index} className="relative group border rounded-lg overflow-hidden bg-white shadow-sm">
                                        <button 
                                            onClick={() => handleRemoveAttachment(index)}
                                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        >
                                            <X size={14} />
                                        </button>
                                        <div className="aspect-video flex items-center justify-center bg-gray-100">
                                            {att.type === 'image' ? (
                                                <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center text-gray-500">
                                                    <Video size={32} className="mx-auto mb-1"/>
                                                    <span className="text-xs">فيديو</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-2 text-xs truncate text-gray-600">{att.name}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">ملاحظة: يتم رفع الصور والفيديوهات على سيرفرات Imgur العامة.</p>
                    </div>

                    <div>
                        <label className="block text-md font-medium text-gray-700 mb-1">الموعد النهائي للتسليم</label>
                        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"/>
                    </div>
                    <div>
                        <label className="block text-md font-medium text-gray-700 mb-2">إرسال إلى الشعب:</label>
                        <div className="space-y-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                            {classesForSubject.map(classId => {
                                const classInfo = classes.find(c => c.id === classId);
                                if (!classInfo) return null;
                                return (
                                    <label key={classId} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                        <input type="checkbox" checked={selectedClassIds.includes(classId)} onChange={e => {
                                            if (e.target.checked) setSelectedClassIds(p => [...p, classId]);
                                            else setSelectedClassIds(p => p.filter(id => id !== classId));
                                        }} className="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"/>
                                        <span className="font-semibold">{classInfo.stage} - {classInfo.section}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                    <button onClick={handleSendHomework} disabled={isSending || isUploading} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-cyan-600 text-white font-extrabold text-lg rounded-lg hover:bg-cyan-700 disabled:bg-gray-400 shadow-lg">
                        {isSending ? <Loader2 className="animate-spin"/> : <Send/>} {isSending ? 'جاري الإرسال...' : 'إرسال الواجب'}
                    </button>
                </>
            )}
        </div>
    );

    const renderReviewTab = () => {
        return <HomeworkReview teacher={teacher} classes={classes} />;
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex border-b mb-6">
                <button onClick={() => setActiveTab('send')} className={`px-6 py-3 font-semibold flex items-center gap-2 text-lg ${activeTab === 'send' ? 'border-b-2 border-cyan-500 text-cyan-600' : 'text-gray-500'}`}><Send/> إرسال واجب</button>
                <button onClick={() => setActiveTab('review')} className={`px-6 py-3 font-semibold flex items-center gap-2 text-lg ${activeTab === 'review' ? 'border-b-2 border-cyan-500 text-cyan-600' : 'text-gray-500'}`}><ClipboardList/> متابعة التسليمات</button>
            </div>
            {activeTab === 'send' ? renderSendTab() : renderReviewTab()}
        </div>
    );
}