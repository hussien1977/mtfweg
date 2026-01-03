import React, { useState, useRef, useEffect } from 'react';
import { db } from '../../lib/firebase.ts';
import { v4 as uuidv4 } from 'uuid';
import RegistrationFormPage1 from '../principal/RegistrationFormPage1.tsx';
import RegistrationFormPage2 from '../principal/RegistrationFormPage2.tsx';
import { Loader2, Send, FileDown, LogOut, Info, CheckCircle } from 'lucide-react';
import type { Announcement } from '../../types.ts';

declare const jspdf: any;
declare const html2canvas: any;

interface StudentSubmissionFormProps {
    submissionInfo: {
        principalId: string;
        stage: string;
    };
    onLogout: () => void;
}

export default function StudentSubmissionForm({ submissionInfo, onLogout }: StudentSubmissionFormProps) {
    const [formData, setFormData] = useState<Record<string, string>>({
        stage: submissionInfo.stage,
    });
    const [studentPhoto, setStudentPhoto] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionSuccess, setSubmissionSuccess] = useState(false);
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [schoolName, setSchoolName] = useState<string>('');
    const [isExporting, setIsExporting] = useState(false);
    const [pdfExported, setPdfExported] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fetch announcement
        const announcementRef = db.ref(`announcements/${submissionInfo.principalId}/${submissionInfo.stage}`);
        announcementRef.get().then((snapshot: any) => {
            if (snapshot.exists()) {
                setAnnouncement(snapshot.val());
            }
        });

        // Fetch school name
        const schoolNameRef = db.ref(`settings/${submissionInfo.principalId}/schoolName`);
        schoolNameRef.get().then((snapshot: any) => {
            if(snapshot.exists()) {
                setSchoolName(snapshot.val());
            }
        });
    }, [submissionInfo]);
    
    const handleUpdate = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setStudentPhoto(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const validateForm = (): boolean => {
        const { fullName, motherName, fatherPhone, motherPhone } = formData;
        const errors = [];

        if (!fullName || !fullName.trim()) {
            errors.push("اسم الطالب الرباعي");
        }
        if (!motherName || !motherName.trim()) {
            errors.push("اسم الام الثلاثي");
        }
        if ((!fatherPhone || !fatherPhone.trim()) && (!motherPhone || !motherPhone.trim())) {
            errors.push("رقم هاتف الاب او رقم هاتف الام");
        }
        
        if (errors.length > 0) {
            alert(`يرجى ملء الحقول التالية قبل المتابعة:\n- ${errors.join('\n- ')}`);
            return false;
        }
        return true;
    };


    const handleExportPdf = async () => {
        if (!validateForm()) {
            return;
        }
        setIsExporting(true);
        
        const page1Container = document.getElementById('pdf-page-1');
        const page2Container = document.getElementById('pdf-page-2');

        const page1Element = page1Container?.firstElementChild as HTMLElement;
        const page2Element = page2Container?.firstElementChild as HTMLElement;

        if (!page1Element || !page2Element) {
            alert("خطأ: تعذر العثور على عناصر الصفحة للتصدير.");
            setIsExporting(false);
            return;
        }

        const allButtons = document.querySelectorAll('button');
        allButtons.forEach(btn => ((btn as HTMLElement).style.visibility = 'hidden'));
        
        try {
            const { jsPDF } = jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const addCanvasToPdf = async (canvas: HTMLCanvasElement) => {
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const canvasAspectRatio = canvas.width / canvas.height;
                const MARGIN_MM = 5;
                const availableWidth = pdfWidth - (MARGIN_MM * 2);
                const availableHeight = pdfHeight - (MARGIN_MM * 2);
                let imgWidth, imgHeight;

                if ((availableWidth / canvas.width) * canvas.height < availableHeight) {
                    imgWidth = availableWidth;
                    imgHeight = imgWidth / canvasAspectRatio;
                } else {
                    imgHeight = availableHeight;
                    imgWidth = imgHeight * canvasAspectRatio;
                }

                const xPos = (pdfWidth - imgWidth) / 2;
                const yPos = (pdfHeight - imgHeight) / 2;
                
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', xPos, yPos, imgWidth, imgHeight, undefined, 'FAST');
            };
            
            const canvas1 = await html2canvas(page1Element, { scale: 2, useCORS: true, logging: true });
            await addCanvasToPdf(canvas1);
    
            pdf.addPage();
            const canvas2 = await html2canvas(page2Element, { scale: 2, useCORS: true });
            await addCanvasToPdf(canvas2);
    
            pdf.save(`استمارة-${formData.fullName || 'طالب'}.pdf`);
            setPdfExported(true);

        } catch(e) {
            console.error("PDF export from principal view failed:", e);
            alert('فشل تصدير الملف.');
        } finally {
            allButtons.forEach(btn => ((btn as HTMLElement).style.visibility = 'visible'));
            setIsExporting(false);
        }
    };


    const handleSubmit = async () => {
        if (!validateForm()) return;
        setIsSubmitting(true);
        
        try {
            const submissionId = uuidv4();
            const submissionData = {
                id: submissionId,
                principalId: submissionInfo.principalId,
                studentName: formData.fullName,
                stage: submissionInfo.stage,
                formData: formData,
                studentPhoto: studentPhoto,
                submittedAt: new Date().toISOString(),
                status: 'pending'
            };

            await db.ref(`student_submissions/${submissionInfo.principalId}/${submissionId}`).set(submissionData);
            setSubmissionSuccess(true);
        } catch (error) {
            console.error("Submission failed:", error);
            alert("حدث خطأ أثناء إرسال الاستمارة. يرجى المحاولة مرة أخرى.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-100 p-4 sm:p-8">
             <header className="max-w-[882px] mx-auto bg-white p-4 rounded-t-xl shadow-md flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">{schoolName || 'استمارة التسجيل'}</h1>
                    <p className="text-sm text-gray-500">المرحلة: {submissionInfo.stage}</p>
                </div>
                <button onClick={onLogout} className="px-4 py-2 bg-red-600 text-white rounded-md flex items-center gap-2">
                    <LogOut size={18} />
                    تسجيل الخروج
                </button>
            </header>

             {announcement && (
                <div className="max-w-[882px] mx-auto bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 mb-4 rounded-md flex items-start gap-3 shadow-sm">
                    <Info className="w-6 h-6 flex-shrink-0 mt-1" />
                    <div>
                        <p className="font-bold">تبليغ من الإدارة:</p>
                        <p>{announcement.message}</p>
                    </div>
                </div>
            )}

            <div ref={formRef}>
                <div className="space-y-8">
                     <div id="pdf-page-1">
                        <RegistrationFormPage1 
                            formData={formData} 
                            onUpdate={handleUpdate} 
                            studentPhoto={studentPhoto}
                            onPhotoUpload={handlePhotoUpload}
                        />
                    </div>
                    <div id="pdf-page-2">
                        <RegistrationFormPage2 
                            formData={formData} 
                            onUpdate={handleUpdate} 
                        />
                    </div>
                </div>
                
                <div className="mt-8 text-center space-y-4 max-w-[882px] mx-auto">
                    {!pdfExported && !submissionSuccess && (
                        <button 
                            type="button"
                            onClick={handleExportPdf}
                            disabled={isExporting}
                            className="w-full px-8 py-4 bg-red-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-red-700 disabled:bg-gray-400 transition"
                        >
                            {isExporting ? (
                                <Loader2 className="animate-spin inline-block" />
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <FileDown />
                                    <span>تصدير ملف PDF</span>
                                </div>
                            )}
                        </button>
                    )}
                    
                    {pdfExported && !submissionSuccess && (
                        <div className="p-4 bg-yellow-100 border-2 border-yellow-300 rounded-lg">
                            <p className="font-semibold text-red-600 mb-4 text-lg">
                                يجب ارسال الملف الى الادارة لتكتمل اجراءات تسجيل الطالب
                            </p>
                            <button 
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full px-12 py-4 bg-green-600 text-white font-bold text-xl rounded-lg shadow-lg hover:bg-green-700 disabled:bg-gray-400 transition"
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="animate-spin" />
                                        <span>جاري الإرسال...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        <Send />
                                        <span>ارسال الملف الى الادارة</span>
                                    </div>
                                )}
                            </button>
                        </div>
                    )}

                    {submissionSuccess && (
                        <div className="w-full flex items-center justify-center gap-2 px-12 py-4 bg-green-600 text-white font-bold text-xl rounded-lg shadow-lg cursor-not-allowed">
                            <CheckCircle />
                            <span>تم الارسال بنجاح</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}