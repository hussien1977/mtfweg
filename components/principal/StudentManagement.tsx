import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { User, SchoolSettings, ClassData, StudentSubmission, Announcement, ParentContact, Student, StudentNotification } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { v4 as uuidv4 } from 'uuid';
import RegistrationFormPage1 from './RegistrationFormPage1.tsx';
import RegistrationFormPage2 from './RegistrationFormPage2.tsx';
import { Key, Send, ClipboardList, RefreshCw, Copy, Check, Eye, X, Edit, Trash2, FileDown, Loader2, MessageSquare, Plus, UserPlus, PlayCircle, Users as UsersIcon, Download, Sparkles, KeyRound, Settings as SettingsIcon } from 'lucide-react';
import { GRADE_LEVELS } from '../../constants.ts';
import { GoogleGenAI } from "@google/genai";
import StudentSubscriptions from './StudentSubscriptions.tsx';
import ParentCommunication from '../counselor/CounselorParentCommunication.tsx';


declare const jspdf: any;
declare const html2canvas: any;
declare const XLSX: any;

const UnderMaintenance = ({ featureName }: { featureName: string }) => (
    <div className="text-center p-8 bg-white rounded-lg shadow-lg flex flex-col items-center justify-center h-full mt-8">
        <SettingsIcon className="w-16 h-16 text-yellow-500 mb-4 animate-spin" />
        <h2 className="text-2xl font-bold text-gray-800">ميزة "{featureName}" قيد الصيانة</h2>
        <p className="mt-2 text-gray-600 max-w-md">نعمل حالياً على تحسين هذه الميزة وستعود للعمل قريباً. شكراً لتفهمكم وصبركم.</p>
    </div>
);


const generateCode = (length = 8) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};


// =================================================================================================
// TAB 1: Access Codes & Announcements
// =================================================================================================

const getRelevantGradeLevels = (schoolLevel?: SchoolSettings['schoolLevel']): string[] => {
    if (!schoolLevel) return GRADE_LEVELS;

    if (schoolLevel === 'ابتدائية') {
        return GRADE_LEVELS.filter(g => g.includes('ابتدائي'));
    }
    if (schoolLevel === 'متوسطة') {
        return GRADE_LEVELS.filter(g => g.includes('متوسط'));
    }
    if (schoolLevel.includes('اعدادي') || schoolLevel.includes('اعدادية')) {
        return GRADE_LEVELS.filter(g => g.includes('الرابع') || g.includes('الخامس') || g.includes('السادس'));
    }
    if (schoolLevel.includes('ثانوية')) {
        return GRADE_LEVELS.filter(g => g.includes('متوسط') || g.includes('الرابع') || g.includes('الخامس') || g.includes('السادس'));
    }
    return GRADE_LEVELS;
};

const CodesAndAnnouncements = ({ principal, settings, classes }: { principal: User, settings: SchoolSettings, classes: ClassData[] }) => {
    const [accessCodes, setAccessCodes] = useState<Record<string, string>>({});
    const [announcements, setAnnouncements] = useState<Record<string, Announcement>>({});
    const [newAnnouncements, setNewAnnouncements] = useState<Record<string, string>>({});
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const relevantGrades = useMemo(() => getRelevantGradeLevels(settings.schoolLevel), [settings.schoolLevel]);

     useEffect(() => {
        const codesRef = db.ref(`student_access_codes/${principal.id}`);
        const announcementsRef = db.ref(`announcements/${principal.id}`);

        const codesCallback = (snapshot: any) => setAccessCodes(snapshot.val() || {});
        const announcementsCallback = (snapshot: any) => setAnnouncements(snapshot.val() || {});

        codesRef.on('value', codesCallback);
        announcementsRef.on('value', announcementsCallback);
        return () => {
             codesRef.off('value', codesCallback);
             announcementsRef.off('value', announcementsCallback);
        }
    }, [principal.id]);

    const handleCodeChange = (stage: string, code: string) => {
        const newCode = code.toUpperCase().trim();
        db.ref(`student_access_codes/${principal.id}/${stage}`).set(newCode);
    };

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code).then(() => {
            setCopiedCode(code);
            setTimeout(() => setCopiedCode(null), 2000);
        });
    };

    const handlePublishAnnouncement = async (stage: string) => {
        const message = newAnnouncements[stage]?.trim();
        if (!message) return;
        
        const announcement: Omit<Announcement, 'id'> = {
            principalId: principal.id,
            stage: stage,
            message: message,
            timestamp: new Date().toISOString()
        };
        const announcementId = uuidv4();
        
        const updates: Record<string, any> = {};
        updates[`announcements/${principal.id}/${stage}`] = {id: announcementId, ...announcement};
        
        // Push personal notifications to all students in this stage
        const stageClasses = classes.filter(c => c.stage === stage);
        stageClasses.forEach(cls => {
            cls.students?.forEach(student => {
                const notification: Omit<StudentNotification, 'id'> = {
                    studentId: student.id,
                    message: `إعلان جديد من الإدارة لطلاب ${stage}: ${message}`,
                    timestamp: new Date().toISOString(),
                    isRead: false
                };
                const notifKey = db.ref(`student_notifications/${principal.id}/${student.id}`).push().key;
                if (notifKey) {
                    updates[`student_notifications/${principal.id}/${student.id}/${notifKey}`] = notification;
                }
            });
        });

        try {
            await db.ref().update(updates);
            setNewAnnouncements(prev => ({ ...prev, [stage]: '' }));
            alert('تم نشر الإعلان وإبلاغ الطلاب بنجاح.');
        } catch (error) {
            console.error("Failed to publish announcement:", error);
            alert('حدث خطأ أثناء النشر.');
        }
    };

    return (
        <div className="space-y-6">
            {relevantGrades.map(stage => (
                <div key={stage} className="p-4 bg-gray-50 rounded-lg border">
                    <h3 className="text-xl font-bold text-gray-700 mb-3">{stage}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="font-semibold flex items-center gap-2"><Key size={18} /> رمز دخول الطلاب (لتقديم الاستمارة)</label>
                            <div className="flex gap-2">
                                <input type="text" value={accessCodes[stage] || ''} onChange={e => handleCodeChange(stage, e.target.value)} className="flex-grow p-2 border rounded-md font-mono text-center" placeholder="لم يتم التعيين"/>
                                <button onClick={() => handleCodeChange(stage, generateCode())} className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600" title="توليد رمز جديد"><RefreshCw size={20}/></button>
                                <button onClick={() => copyToClipboard(accessCodes[stage] || '')} disabled={!accessCodes[stage]} className="p-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:bg-gray-300" title="نسخ الرمز">{copiedCode === accessCodes[stage] ? <Check size={20}/> : <Copy size={20}/>}</button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="font-semibold flex items-center gap-2"><Send size={18} /> تبليغ للطلاب</label>
                            {announcements[stage] && (<div className="p-2 bg-blue-100 text-blue-800 rounded-md text-sm"><strong>التبليغ الحالي:</strong> {announcements[stage].message}</div>)}
                            <textarea value={newAnnouncements[stage] || ''} onChange={e => setNewAnnouncements(prev => ({...prev, [stage]: e.target.value}))} rows={2} className="w-full p-2 border rounded-md" placeholder="اكتب تبليغ جديد هنا..."/>
                            <button onClick={() => handlePublishAnnouncement(stage)} className="w-full p-2 bg-green-600 text-white rounded-md hover:bg-green-700">نشر التبليغ</button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};


// =================================================================================================
// TAB 2: Received Forms
// =================================================================================================
const ReceivedForms = ({ submissions, principal }: { submissions: StudentSubmission[], principal: User }) => {
    const [modalState, setModalState] = useState<{ mode: 'view' | 'edit'; submission: StudentSubmission | null }>({ mode: 'view', submission: null });
    const [editedFormData, setEditedFormData] = useState<Record<string, string>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [exportStage, setExportStage] = useState<string>('');

    const submissionStages = useMemo(() => {
        const stages = new Set<string>();
        submissions.forEach(sub => stages.add(sub.stage));
        return Array.from(stages);
    }, [submissions]);

    const handleView = (submission: StudentSubmission) => {
        setModalState({ mode: 'view', submission });
        if (submission.status === 'pending') {
            db.ref(`student_submissions/${principal.id}/${submission.id}/status`).set('viewed');
        }
    };

    const handleEdit = (submission: StudentSubmission) => {
        setEditedFormData(submission.formData);
        setModalState({ mode: 'edit', submission });
    };

    const handleSaveEdit = async () => {
        if (!modalState.submission) return;
        setIsProcessing(true);
        try {
            await db.ref(`student_submissions/${principal.id}/${modalState.submission.id}/formData`).set(editedFormData);
            alert('تم حفظ التعديلات بنجاح.');
            setModalState({ ...modalState, mode: 'view' });
        } catch (error) {
            console.error("Error saving edits:", error);
            alert('حدث خطأ أثناء حفظ التعديلات.');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleDelete = async (submissionId: string, studentPhotoUrl: string | null) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه الاستمارة؟ لا يمكن التراجع عن هذا الإجراء.')) return;
        setIsProcessing(true);
        try {
            await db.ref(`student_submissions/${principal.id}/${submissionId}`).remove();
            alert('تم حذف الاستمارة بنجاح.');
            if (modalState.submission?.id === submissionId) {
                closeModal();
            }
        } catch (error) {
            console.error("Error deleting submission:", error);
            alert('حدث خطأ أثناء الحذف.');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleExportPdf = async (submission: StudentSubmission) => {
        setIsProcessing(true);
        
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        
        tempContainer.innerHTML = `<div id="pdf-export-p1-wrapper"></div><div id="pdf-export-p2-wrapper"></div>`;
        const p1Wrapper = tempContainer.querySelector('#pdf-export-p1-wrapper') as HTMLElement;
        const p2Wrapper = tempContainer.querySelector('#pdf-export-p2-wrapper') as HTMLElement;
        
        const root1 = ReactDOM.createRoot(p1Wrapper);
        const root2 = ReactDOM.createRoot(p2Wrapper);
    
        try {
            await new Promise<void>(resolve => {
                root1.render(<RegistrationFormPage1 formData={submission.formData} onUpdate={()=>{}} isPdfMode studentPhoto={submission.studentPhoto || null} onPhotoUpload={() => {}} />);
                root2.render(<RegistrationFormPage2 formData={submission.formData} onUpdate={()=>{}} isPdfMode />);
                setTimeout(resolve, 500);
            });
    
            const { jsPDF } = jspdf;
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            
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
            
            const page1Element = p1Wrapper.children[0] as HTMLElement;
            const page2Element = p2Wrapper.children[0] as HTMLElement;
            if (!page1Element || !page2Element) throw new Error("Could not find rendered pages for export.");

            const canvas1 = await html2canvas(page1Element, { scale: 2, useCORS: true, logging: true });
            await addCanvasToPdf(canvas1);
    
            pdf.addPage();
            const canvas2 = await html2canvas(page2Element, { scale: 2, useCORS: true });
            await addCanvasToPdf(canvas2);
    
            pdf.save(`استمارة-${submission.studentName}.pdf`);
        } catch(e) {
            console.error("PDF export from principal view failed:", e);
            alert('فشل تصدير الملف.');
        } finally {
            root1.unmount();
            root2.unmount();
            document.body.removeChild(tempContainer);
            setIsProcessing(false);
        }
    };

    const handleExportExcel = (type: 'student' | 'counselor') => {
        if (!exportStage) {
            alert('يرجى اختيار مرحلة دراسية للتصدير.');
            return;
        }
        const stageSubmissions = submissions.filter(s => s.stage === exportStage);
        if (stageSubmissions.length === 0) {
            alert('لا توجد استمارات لهذه المرحلة لتصديرها.');
            return;
        }

        const studentInfoHeaders: Record<string, string> = { fullName: "اسم الطالب الرباعي واللقب", motherName: "اسم الام الثلاثي", birthPlace: "محل الولادة", birthDate: "تاريخ الولادة", registrationId: "رقم القيد", guardianName: "اسم ولي الامر", guardianRelation: "صلة القرابة", nationalId: "رقم البطاقة الوطنية", familyId: "الرقم العائلي", nationalIdIssuer: "جهة اصدار البطاقة الوطنية", civilId: "رقم الهوية", civilRegistryNumber: "رقم السجل", civilPageNumber: "رقم الصفحة", civilIdIssuer: "جهة اصدار الهوية", guardianProfession: "مهنة ولي الامر", fatherPhone: "رقم هاتف الاب", motherPhone: "رقم هاتف الام", address: "عنوان السكن", houseNumber: "رقم الدار", nearestLandmark: "اقرب نقطة دالة", mukhtarName: "اسم المختار الثلاثي", lastSchool: "اخر مدرسة كان فيها", docCount: "عدد الوثيقة", docNumber: "رقم الوثيقة", docDate: "تاريخ اصدارها", docIssuer: "جهة اصدارها", formSequence1: "تسلسل الاستمارة (ص1)" };
        const counselorInfoHeaders: Record<string, string> = { fullName2: "اسم الطالب الرباعي واللقب", isFatherAlive: "هل الاب على قيد الحياة", fatherEducation: "التحصيل الدراسي للاب", isMotherAlive: "هل الام على قيد الحياة", motherEducation: "التحصيل الدراسي للام", familyMembers: "عدد افراد الاسرة", brothersCount: "عدد الاخوة", sistersCount: "عدد الاخوات", studentOrder: "ترتيب الطالب", monthlyIncome: "الدخل الشهري", houseType: "نوع الدار", roomCount: "عدد الغرف", livesWith: "الطالب يعيش مع", height: "الطول", weight: "الوزن", hearing: "السمع", vision: "النظر", isStudentWorking: "هل الطالب يعمل", hasChronicIllness: "هل يعاني امراض مزمنة", physicalDisabilities: "العاهات الجسمية", studentSkills: "هل للطالب مهارة", skillsDetails: "مهارات (تفاصيل)", participatedInFestivals: "هل شارك بمهرجانات او مسابقات", festivalsDetails: "مهرجانات (تفاصيل)", formSequence2: "تسلسل الاستمارة (ص2)" };

        const headers = type === 'student' ? studentInfoHeaders : counselorInfoHeaders;
        const data = stageSubmissions.map(sub => {
            const row: Record<string, any> = {};
            for (const key in headers) {
                row[headers[key as keyof typeof headers]] = sub.formData[key] || '';
            }
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'البيانات');
        const fileName = `بيانات-${type === 'student' ? 'الطلاب' : 'المرشد'}-${exportStage}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    const closeModal = () => setModalState({ mode: 'view', submission: null });

    return (
        <div>
            <div className="p-4 bg-gray-100 rounded-lg border mb-4">
                <h4 className="font-bold text-lg mb-2">تصدير بيانات الاستمارات (Excel)</h4>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-grow">
                        <label htmlFor="exportStage" className="block text-sm font-semibold text-gray-700 mb-1">اختر المرحلة الدراسية</label>
                        <select
                            id="exportStage"
                            value={exportStage}
                            onChange={e => setExportStage(e.target.value)}
                            className="w-full p-2 border rounded-md bg-white"
                        >
                            <option value="">-- اختر مرحلة --</option>
                            {submissionStages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                        </select>
                    </div>
                    <button onClick={() => handleExportExcel('student')} disabled={!exportStage} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:bg-gray-400">
                        <Download size={18} /> تصدير معلومات الطالب
                    </button>
                    <button onClick={() => handleExportExcel('counselor')} disabled={!exportStage} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400">
                        <Download size={18} /> تصدير معلومات المرشد
                    </button>
                </div>
            </div>

            {submissions.length === 0 ? (
                <p className="text-center text-gray-500 p-8">لا توجد استمارات مستلمة حالياً.</p>
            ) : (
                <div className="space-y-3">
                    {submissions.map(sub => (
                        <div key={sub.id} className="p-3 bg-gray-50 rounded-lg border flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-lg">{sub.studentName}</p>
                                <p className="text-sm text-gray-500">{sub.stage} - تم الارسال في: {new Date(sub.submittedAt).toLocaleString('ar-EG')}</p>
                            </div>
                             <div className="flex items-center gap-2">
                                <button onClick={() => handleEdit(sub)} className="p-2 text-white bg-yellow-500 rounded-md hover:bg-yellow-600" title="تعديل"><Edit size={20}/></button>
                                <button onClick={() => handleView(sub)} className="p-2 text-white bg-blue-500 rounded-md hover:bg-blue-600" title="عرض"><Eye size={20}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modalState.submission && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
                        <header className="p-4 border-b flex justify-between items-center">
                            <h3 className="text-xl font-bold">استمارة الطالب: {modalState.submission.studentName}</h3>
                            <div className="flex items-center gap-2">
                               {modalState.mode === 'view' && <button onClick={() => handleEdit(modalState.submission!)} className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-full"><Edit size={20} /></button>}
                                <button onClick={() => handleDelete(modalState.submission!.id, modalState.submission!.studentPhoto || null)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 size={20} /></button>
                                <button onClick={closeModal} className="p-2 text-gray-600 hover:bg-gray-200 rounded-full"><X /></button>
                            </div>
                        </header>
                        <main className="flex-1 overflow-y-auto p-4 bg-gray-100">
                            <div className="space-y-4">
                                <RegistrationFormPage1 
                                    formData={modalState.mode === 'edit' ? editedFormData : modalState.submission.formData} 
                                    onUpdate={(field, value) => modalState.mode === 'edit' && setEditedFormData(prev => ({ ...prev, [field]: value }))}
                                    isPdfMode={modalState.mode === 'view'}
                                    studentPhoto={modalState.submission.studentPhoto || null}
                                    onPhotoUpload={() => {}}
                                />
                                <RegistrationFormPage2 
                                    formData={modalState.mode === 'edit' ? editedFormData : modalState.submission.formData} 
                                    onUpdate={(field, value) => modalState.mode === 'edit' && setEditedFormData(prev => ({ ...prev, [field]: value }))} 
                                    isPdfMode={modalState.mode === 'view'}
                                />
                            </div>
                        </main>
                        <footer className="p-4 border-t flex items-center justify-end gap-3 bg-gray-50">
                             {modalState.mode === 'edit' ? (
                                <>
                                    <button onClick={() => setModalState({ ...modalState, mode: 'view'})} disabled={isProcessing} className="px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400">إلغاء</button>
                                    <button onClick={handleSaveEdit} disabled={isProcessing} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400">
                                        {isProcessing ? <Loader2 className="animate-spin"/> : 'حفظ التعديلات'}
                                    </button>
                                </>
                            ) : (
                                 <button onClick={() => handleExportPdf(modalState.submission!)} disabled={isProcessing} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-2">
                                     {isProcessing ? <Loader2 className="animate-spin"/> : <FileDown size={20}/>}
                                     تنزيل PDF
                                </button>
                            )}
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};


// =================================================================================================
// MAIN COMPONENT
// =================================================================================================

interface StudentManagementProps {
    principal: User;
    settings: SchoolSettings;
    classes: ClassData[];
}

type StudentManagementTab = 'codes' | 'forms' | 'parents' | 'subscriptions';

export default function StudentManagement({ principal, settings, classes }: StudentManagementProps) {
    const [activeTab, setActiveTab] = useState<StudentManagementTab>('parents');
    const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);

    useEffect(() => {
        const submissionsRef = db.ref(`student_submissions/${principal.id}`);
        const callback = (snapshot: any) => {
            const data = snapshot.val();
            const subs = data ? Object.values(data) as StudentSubmission[] : [];
            subs.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
            setSubmissions(subs);
        };
        submissionsRef.on('value', callback);
        return () => submissionsRef.off('value', callback);
    }, [principal.id]);

    const renderContent = () => {
        switch (activeTab) {
            case 'subscriptions':
                return <StudentSubscriptions principal={principal} classes={classes} settings={settings} />;
            case 'forms':
                return <ReceivedForms submissions={submissions} principal={principal} />;
            case 'codes':
                return <CodesAndAnnouncements principal={principal} settings={settings} classes={classes} />;
            case 'parents':
                return <ParentCommunication principal={principal} settings={settings} />;
            default:
                return null;
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex border-b flex-wrap">
                <button onClick={() => setActiveTab('subscriptions')} className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'subscriptions' ? 'border-b-2 border-cyan-500 text-cyan-600' : 'text-gray-500'}`}><KeyRound/> تفعيل اشتراكات الطلبة</button>
                <button onClick={() => setActiveTab('forms')} className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'forms' ? 'border-b-2 border-cyan-500 text-cyan-600' : 'text-gray-500'}`}><ClipboardList/> الاستمارات المستلمة ({submissions.length})</button>
                <button onClick={() => setActiveTab('codes')} className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'codes' ? 'border-b-2 border-cyan-500 text-cyan-600' : 'text-gray-500'}`}><Key/> رموز الدخول والتبليغات</button>
                <button onClick={() => setActiveTab('parents')} className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'parents' ? 'border-b-2 border-cyan-500 text-cyan-600' : 'text-gray-500'}`}><MessageSquare/> التواصل مع أولياء الأمور</button>
            </div>
            <div>
                {renderContent()}
            </div>
        </div>
    );
}