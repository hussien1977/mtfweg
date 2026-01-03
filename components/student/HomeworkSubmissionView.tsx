
import React, { useState, useEffect, useRef } from 'react';
import type { User, Homework, HomeworkSubmission, HomeworkAttachment } from '../../types.ts';
import { ArrowLeft, Paperclip, Send, Loader2, CheckCircle, XCircle, Clock, Image as ImageIcon, Video, X, Trash2 } from 'lucide-react';
import { db } from '../../lib/firebase.ts';
import { v4 as uuidv4 } from 'uuid';

interface HomeworkSubmissionViewProps {
    currentUser: User;
    homework: Homework;
    submission: HomeworkSubmission | undefined;
    onBack: () => void;
}

export default function HomeworkSubmissionView({ currentUser, homework, submission, onBack }: HomeworkSubmissionViewProps) {
    const [textAnswer, setTextAnswer] = useState('');
    const [attachments, setAttachments] = useState<HomeworkAttachment[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const isSubmitted = !!submission;
    const isReadOnly = isSubmitted && submission.status !== 'pending';

    useEffect(() => {
        if (submission) {
            setTextAnswer(submission.texts?.[0] || '');
            setAttachments(submission.attachments || []);
        }
    }, [submission]);

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

    const handleSubmit = async () => {
        if (!textAnswer.trim() && attachments.length === 0) {
            alert('يرجى كتابة إجابة أو إرفاق ملف.');
            return;
        }
        setIsSubmitting(true);
        try {
            const submissionData: HomeworkSubmission = {
                id: submission?.id || uuidv4(),
                homeworkId: homework.id,
                studentId: currentUser.id,
                studentName: currentUser.name,
                classId: currentUser.classId!,
                submittedAt: new Date().toISOString(),
                texts: [textAnswer.trim()],
                attachments: attachments,
                status: 'pending'
            };

            await db.ref(`homework_submissions/${currentUser.principalId}/${currentUser.id}/${homework.id}`).set(submissionData);
            alert('تم إرسال إجابتك بنجاح.');
            onBack();

        } catch (error) {
            console.error(error);
            alert('حدث خطأ أثناء إرسال الواجب.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const renderStatusBadge = () => {
        if (!submission) return null;
        
        let statusInfo: { text: string; icon: React.ReactNode; color: string; };

        switch(submission.status) {
            case 'accepted':
                statusInfo = { text: 'تم قبول واجبك', icon: <CheckCircle/>, color: 'bg-green-100 text-green-800' };
                break;
            case 'rejected':
                statusInfo = { text: 'تم رفض واجبك', icon: <XCircle/>, color: 'bg-red-100 text-red-800' };
                break;
            default:
                 statusInfo = { text: 'تم إرسال واجبك وهو قيد المراجعة', icon: <Clock/>, color: 'bg-yellow-100 text-yellow-800' };
        }

        return (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${statusInfo.color}`}>
                {statusInfo.icon}
                <div>
                    <p className="font-bold">{statusInfo.text}</p>
                    {submission.status === 'rejected' && submission.rejectionReason && (
                        <p className="text-sm mt-1">السبب: {submission.rejectionReason}</p>
                    )}
                </div>
            </div>
        );
    };

    const renderHomeworkAttachments = () => {
        if (!Array.isArray(homework.attachments) || homework.attachments.length === 0) return null;

        return (
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
                <h4 className="font-bold mb-4 text-gray-700">مرفقات الواجب (من المدرس):</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {homework.attachments.map((att, index) => {
                        if (att.type === 'image') {
                            return (
                                <div key={index} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                                        <img src={att.url} alt={att.name} className="w-full h-48 object-cover hover:opacity-90 transition-opacity" />
                                    </a>
                                    <div className="p-2 text-sm text-gray-600 flex items-center gap-2">
                                        <ImageIcon size={16} />
                                        <span className="truncate">{att.name}</span>
                                    </div>
                                </div>
                            );
                        } else if (att.type === 'video') {
                            return (
                                <div key={index} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                                    <div className="w-full h-48 bg-black flex items-center justify-center">
                                        <video controls className="w-full h-full" src={att.url}>
                                            المتصفح لا يدعم عرض الفيديو.
                                        </video>
                                    </div>
                                    <div className="p-2 text-sm text-gray-600 flex items-center gap-2">
                                        <Video size={16} />
                                        <span className="truncate">{att.name}</span>
                                    </div>
                                </div>
                            );
                        } else {
                            return (
                                <a key={index} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-white border rounded-md hover:bg-gray-100 text-blue-600 col-span-1 sm:col-span-2">
                                    <Paperclip size={20}/> 
                                    <span>{att.name}</span>
                                </a>
                            );
                        }
                    })}
                </div>
            </div>
        );
    };

    const renderStudentAttachments = () => {
        if (attachments.length === 0 && isReadOnly) return null;

        return (
            <div className="p-4 bg-blue-50 rounded-lg mb-4 border border-blue-100">
                <h4 className="font-bold mb-2 text-blue-800">مرفقاتك:</h4>
                
                {!isReadOnly && (
                    <>
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
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-gray-400 mb-4"
                        >
                            {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Paperclip size={18} />}
                            <span>{isUploading ? 'جاري الرفع...' : 'إضافة صور أو فيديو'}</span>
                        </button>
                    </>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {attachments.map((att, index) => (
                        <div key={index} className="relative group border rounded-lg overflow-hidden bg-white shadow-sm">
                            {!isReadOnly && (
                                <button 
                                    onClick={() => handleRemoveAttachment(index)}
                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                    <X size={14} />
                                </button>
                            )}
                            <div className="aspect-video flex items-center justify-center bg-gray-100">
                                {att.type === 'image' ? (
                                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="w-full h-full">
                                        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                    </a>
                                ) : (
                                    <div className="text-center text-gray-500 w-full h-full flex flex-col items-center justify-center">
                                        <video src={att.url} className="w-full h-full object-contain" controls />
                                    </div>
                                )}
                            </div>
                            <div className="p-2 text-xs truncate text-gray-600 bg-white">{att.name}</div>
                        </div>
                    ))}
                </div>
                {!isReadOnly && <p className="text-xs text-gray-500 mt-2">يمكنك رفع صور (PNG, JPG) وفيديو (MP4, WebM).</p>}
            </div>
        );
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto">
             <button onClick={onBack} className="flex items-center gap-2 mb-4 text-cyan-600 font-semibold hover:text-cyan-800">
                <ArrowLeft size={20} />
                <span>العودة للواجبات</span>
            </button>
            
            <div className="border-b pb-4 mb-4">
                <h2 className="text-3xl font-bold">{homework.title}</h2>
                <p className="text-gray-600">{homework.subjectName}</p>
            </div>
            
            {homework.notes && (
                <div className="p-4 bg-gray-50 rounded-lg mb-4 border-r-4 border-cyan-500">
                    <h4 className="font-bold mb-2 text-cyan-700">ملاحظات المدرس:</h4>
                    <p className="whitespace-pre-wrap text-gray-800">{homework.notes}</p>
                </div>
            )}
            
            {renderHomeworkAttachments()}

            <div className="mt-8 pt-6 border-t">
                <h3 className="text-2xl font-bold mb-4 text-gray-800">إجابتك</h3>
                {renderStatusBadge()}
                
                <div className="mt-4 space-y-4">
                     {renderStudentAttachments()}

                     <textarea 
                        value={textAnswer}
                        onChange={e => setTextAnswer(e.target.value)}
                        placeholder="اكتب إجابتك هنا..."
                        rows={8}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none text-lg"
                        disabled={isReadOnly}
                    />
                    
                    {!isReadOnly && (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || isUploading}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 disabled:bg-gray-400 transition shadow-md"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin"/> : <Send/>}
                            {isSubmitting ? 'جاري الإرسال...' : (isSubmitted ? 'إعادة إرسال الواجب' : 'إرسال الواجب')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
