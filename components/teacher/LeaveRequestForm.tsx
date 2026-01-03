import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { Teacher, SchoolSettings, ClassData, LeaveRequest } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { v4 as uuidv4 } from 'uuid';
import { Send, FileText, Loader2, Clock, CheckCircle, XCircle, PlayCircle, X } from 'lucide-react';
import LeaveRequestPDF from './LeaveRequestPDF.tsx';
import LeaveApprovalPDF from '../principal/LeaveApprovalPDF.tsx';

declare const jspdf: any;
declare const html2canvas: any;

interface LeaveRequestFormProps {
    teacher: Teacher;
    settings: SchoolSettings;
    classes: ClassData[];
}

const TOTAL_LEAVE_DAYS = 7;

export default function LeaveRequestForm({ teacher, settings, classes }: LeaveRequestFormProps) {
    
    const [requestBody, setRequestBody] = useState(() => {
        const teacherTerm = settings.schoolLevel === 'ابتدائية' ? 'المعلم/ة' : 'المدرس/ة';
        
        const getSpecialization = () => {
            const specializations = new Set<string>();
            (teacher.assignments || []).forEach(assignment => {
                const classInfo = classes.find(c => c.id === assignment.classId);
                const subject = classInfo?.subjects.find(s => s.id === assignment.subjectId);
                if (subject) {
                    specializations.add(subject.name);
                }
            });
            return Array.from(specializations).join('، ') || 'غير محدد';
        };

        return `بسم الله الرحمن الرحيم
السيد مدير/ة مدرسة ${settings.schoolName} المحترم
السلام عليكم ورحمة الله وبركاته
اني ${teacherTerm} (${teacher.name}) اتقدم بطلبي هذا بالموافقة على منحي اجازة اعتيادية امدها (.....) اعتبارا من يوم (.....) الموافق (  /  /   202 ) وذلك بسبب (.....) ولكم الشكر والتقدير.

التوقيع: ..................................
الاختصاص: ${getSpecialization()}
التاريخ: ${new Date().toLocaleDateString('ar-EG')}

البديل الاول: ............................
البديل الثاني: ............................`;
    });
    
    const [history, setHistory] = useState<LeaveRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);


    useEffect(() => {
        if (!teacher.principalId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const requestsRef = db.ref(`leave_requests/${teacher.principalId}`);
        const callback = (snapshot: any) => {
            const data = snapshot.val() || {};
            const allRequests: LeaveRequest[] = Object.values(data);
            const teacherRequests = allRequests
                .filter(req => req.teacherId === teacher.id)
                .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
            setHistory(teacherRequests);
            setIsLoading(false);
        };
        requestsRef.on('value', callback);
        return () => requestsRef.off('value', callback);
    }, [teacher.id, teacher.principalId]);

    const leaveBalance = useMemo(() => {
        const approvedDays = history
            .filter(req => req.status === 'approved' && req.daysDeducted)
            .reduce((sum, req) => sum + req.daysDeducted!, 0);
        return TOTAL_LEAVE_DAYS - approvedDays;
    }, [history]);
    
    const handleSubmit = async () => {
        if (!requestBody.trim()) {
            alert('يرجى ملء نص طلب الإجازة.');
            return;
        }
        if (!teacher.principalId) {
            alert('خطأ: لم يتم العثور على معرّف المدير.');
            return;
        }
        setIsSubmitting(true);
        const newRequest: LeaveRequest = {
            id: uuidv4(),
            teacherId: teacher.id,
            principalId: teacher.principalId,
            teacherName: teacher.name,
            requestedAt: new Date().toISOString(),
            status: 'pending',
            requestBody: requestBody.trim()
        };

        try {
            await db.ref(`leave_requests/${teacher.principalId}/${newRequest.id}`).set(newRequest);
            alert('تم إرسال طلب الإجازة بنجاح.');
        } catch (error) {
            console.error(error);
            alert('فشل إرسال الطلب.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleExport = async (request: LeaveRequest, type: 'request' | 'approval') => {
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
            if (type === 'request') {
                await renderComponent(<LeaveRequestPDF requestBody={request.requestBody} />);
            } else if (type === 'approval' && request.approvalBody) {
                await renderComponent(<LeaveApprovalPDF approvalBody={request.approvalBody} />);
            } else {
                return; // Nothing to export
            }

            const element = tempContainer.children[0] as HTMLElement;
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');

            const { jsPDF } = jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
            pdf.save(`طلب_اجازة_${type}.pdf`);
        } catch (error) {
            console.error("PDF Export Error:", error);
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
        }
    };
    
    const getStatusIcon = (status: LeaveRequest['status']) => {
        if (status === 'approved') return <CheckCircle className="text-green-500"/>;
        if (status === 'rejected') return <XCircle className="text-red-500"/>;
        return <Clock className="text-yellow-500"/>;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {isExporting && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><Loader2 className="text-white h-16 w-16 animate-spin"/></div>}
            {isVideoModalOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[100] p-4"
                    onClick={() => setIsVideoModalOpen(false)}
                >
                    <div 
                        className="bg-black p-2 rounded-lg shadow-xl w-full max-w-4xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setIsVideoModalOpen(false)}
                            className="absolute -top-3 -right-3 bg-white text-black rounded-full p-2 z-10 shadow-lg hover:scale-110 transition-transform"
                            aria-label="Close video"
                        >
                            <X size={24} />
                        </button>
                        <div className="relative w-full" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
                            <iframe
                                src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2F61578356680977%2Fvideos%2F2303429510072462%2F&show_text=false&autoplay=1&mute=0"
                                className="absolute top-0 left-0 w-full h-full"
                                style={{ border: 'none', overflow: 'hidden' }}
                                title="Facebook video player"
                                frameBorder="0"
                                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                allowFullScreen={true}>
                            </iframe>
                        </div>
                    </div>
                </div>
            )}
            <div className="md:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <button
                        onClick={() => setIsVideoModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition shadow-md mb-6"
                    >
                        <PlayCircle />
                        <span>شاهد طريقة طلب الاجازة الكترونيا</span>
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">طلب إجازة جديد</h2>
                    <textarea
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                        rows={15}
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 leading-relaxed font-sans"
                        placeholder="اكتب طلبك هنا..."
                    />
                    <div className="flex justify-end gap-4 mt-4">
                        <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 disabled:bg-gray-400">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
                            إرسال الطلب
                        </button>
                    </div>
                </div>
            </div>
            <div className="md:col-span-1 space-y-6">
                 <div className="bg-white p-6 rounded-xl shadow-lg text-center sticky top-8">
                     <h3 className="text-lg font-semibold text-gray-600">الرصيد الكلي</h3>
                     <p className="text-5xl font-bold text-blue-600 mt-1">{TOTAL_LEAVE_DAYS}</p>
                     <p className="text-sm">أيام</p>
                     <div className="my-4 h-px bg-gray-200"></div>
                     <h3 className="text-lg font-semibold text-gray-600">الرصيد المتبقي</h3>
                     <p className={`text-6xl font-bold mt-2 ${leaveBalance <= 2 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>{leaveBalance}</p>
                     <p className="text-sm">أيام</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">سجل الطلبات</h2>
                     {isLoading ? <Loader2 className="animate-spin mx-auto" /> : (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {history.length === 0 ? <p className="text-gray-500">لا توجد طلبات سابقة.</p> : history.map(req => (
                                <div key={req.id} className="p-4 border rounded-lg bg-gray-50">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2 font-bold">{getStatusIcon(req.status)} {new Date(req.requestedAt).toLocaleDateString('ar-EG')}</div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleExport(req, 'request')} className="text-sm flex items-center gap-1 text-blue-600 hover:underline"><FileText size={14}/> طلب</button>
                                            {req.status === 'approved' && <button onClick={() => handleExport(req, 'approval')} className="text-sm flex items-center gap-1 text-green-600 hover:underline"><FileText size={14}/> موافقة</button>}
                                        </div>
                                    </div>
                                    {req.status === 'rejected' && <p className="text-sm text-red-600 mt-2"><b>سبب الرفض:</b> {req.rejectionReason}</p>}
                                </div>
                            ))}
                        </div>
                     )}
                </div>
            </div>
        </div>
    );
}