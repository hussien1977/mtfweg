
import React, { useState, useMemo } from 'react';
import * as ReactDOM from 'react-dom/client';
// FIX: Add missing type imports
import type { User, SchoolSettings, LeaveRequest, StudentNotification } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { Loader2, Check, X, Eye, Send, PlayCircle } from 'lucide-react';
import LeaveRequestPDF from '../teacher/LeaveRequestPDF.tsx';
import LeaveApprovalPDF from './LeaveApprovalPDF.tsx';

declare const jspdf: any;
declare const html2canvas: any;

interface LeaveRequestManagerProps {
    principal: User;
    settings: SchoolSettings;
    requests: LeaveRequest[];
}

const TOTAL_LEAVE_DAYS = 7;

export default function LeaveRequestManager({ principal, settings, requests }: LeaveRequestManagerProps) {
    const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
    const [modalType, setModalType] = useState<'approve' | 'reject' | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [approvalBody, setApprovalBody] = useState('');
    const [daysDeducted, setDaysDeducted] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    
    const teacherLeaveBalances = useMemo(() => {
        const balances: Record<string, number> = {};
        requests.forEach(req => {
            if (req.status === 'approved' && req.daysDeducted) {
                if (!balances[req.teacherId]) {
                    balances[req.teacherId] = TOTAL_LEAVE_DAYS;
                }
                balances[req.teacherId] -= req.daysDeducted;
            }
        });
        return balances;
    }, [requests]);

    const handleViewRequest = (request: LeaveRequest) => {
        setSelectedRequest(request);
    };

    const handleOpenApproveModal = () => {
        if (!selectedRequest) return;
        const teacherTerm = settings.schoolLevel === 'ابتدائية' ? 'معلم' : 'مدرس';
        const defaultApprovalBody = `بسم الله الرحمن الرحيم
تحية طيبة...
استنادا للصلاحية المخولة الينا تقرر منح السيد/ة (${selectedRequest.teacherName}) ${teacherTerm} مادة (.....) من مدرستنا اجازة خاصة امدها يوم واحد واعتبارا من يوم (.....) الموافق (  /   / 202  )
1- انفك بتاريخ (  /     /     202  )
2- باشر بتاريخ (   /   /     202 )
3- رصيد الاجازة الممنوحة ( ${daysDeducted} ) يوما

ختم المدرسة                                                          
${settings.principalName}
مدير المدرسة
`;
        setApprovalBody(defaultApprovalBody);
        setModalType('approve');
    };
    
    const handleResolveRequest = async () => {
        if (!selectedRequest) return;

        setIsProcessing(true);
        const updates: Record<string, any> = {};
        const resolutionTime = new Date().toISOString();
        const basePath = `leave_requests/${principal.id}/${selectedRequest.id}`;
        
        let notificationMessage = '';

        if (modalType === 'approve') {
            updates[`${basePath}/status`] = 'approved';
            updates[`${basePath}/approvalBody`] = approvalBody;
            updates[`${basePath}/daysDeducted`] = daysDeducted;
            updates[`${basePath}/resolvedAt`] = resolutionTime;
            notificationMessage = `تمت الموافقة على طلب الإجازة الخاص بك. تم خصم ${daysDeducted} يوم.`;
        } else if (modalType === 'reject') {
            if (!rejectionReason.trim()) {
                alert('يرجى كتابة سبب الرفض.');
                setIsProcessing(false);
                return;
            }
            updates[`${basePath}/status`] = 'rejected';
            updates[`${basePath}/rejectionReason`] = rejectionReason;
            updates[`${basePath}/resolvedAt`] = resolutionTime;
            notificationMessage = `تم رفض طلب الإجازة الخاص بك. السبب: ${rejectionReason}`;
        }
        
        // Push notification to teacher
        const notification: Omit<StudentNotification, 'id'> = {
            studentId: selectedRequest.teacherId, // Using teacherId in studentId field
            message: notificationMessage,
            timestamp: resolutionTime,
            isRead: false
        };
        const newNotifKey = db.ref(`student_notifications/${principal.id}/${selectedRequest.teacherId}`).push().key;
        updates[`student_notifications/${principal.id}/${selectedRequest.teacherId}/${newNotifKey}`] = notification;

        try {
            await db.ref().update(updates);
            alert('تم تحديث حالة الطلب وإرسال إشعار للمدرس.');
            setModalType(null);
            setSelectedRequest(null);
            setRejectionReason('');
        } catch (error) {
            console.error(error);
            alert('فشل تحديث حالة الطلب.');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const closeModal = () => {
        setSelectedRequest(null);
        setModalType(null);
        setRejectionReason('');
    };

    const renderRequestList = () => (
        <div className="space-y-4">
            {requests.length > 0 ? (
                <>
                    <button
                        onClick={() => setIsVideoModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition shadow-md mb-6"
                    >
                        <PlayCircle />
                        <span>شاهد طريقة طلب الاجازة الكترونيا</span>
                    </button>
                    <div className="bg-green-50 border-r-4 border-green-500 text-green-800 p-4 mb-6 rounded-md shadow-sm">
                        <h4 className="font-bold text-lg">لمسة قائد: تقدير الجهود</h4>
                        <p className="mt-1">إن الموافقة على إجازة مستحقة هي أسمى أشكال التقدير لجهود كادرك. هي رسالة دعم تزرع في نفوسهم الولاء، وتجدد شغفهم بالعطاء، مما ينعكس إيجاباً على بيئة المدرسة بأكملها.</p>
                    </div>
                    {requests.map(req => (
                        <div key={req.id} className="p-4 border rounded-lg flex justify-between items-center bg-gray-50">
                            <div>
                                <p className="font-bold">{req.teacherName}</p>
                                <p className="text-sm text-gray-500">تاريخ الطلب: {new Date(req.requestedAt).toLocaleDateString('ar-EG')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    req.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    'bg-red-100 text-red-800'
                                }`}>{req.status === 'pending' ? 'قيد الانتظار' : req.status === 'approved' ? 'موافق عليه' : 'مرفوض'}</span>
                                <button onClick={() => handleViewRequest(req)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"><Eye /></button>
                            </div>
                        </div>
                    ))}
                </>
            ) : (
                <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed">
                    <button
                        onClick={() => setIsVideoModalOpen(true)}
                        className="w-full max-w-md mx-auto flex items-center justify-center gap-2 p-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition shadow-md mb-6"
                    >
                        <PlayCircle />
                        <span>شاهد طريقة طلب الاجازة الكترونيا</span>
                    </button>
                    <h3 className="text-2xl font-bold text-cyan-700">منصة إدارة الإجازات: استثمار في راحة الكادر التعليمي</h3>
                    <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
                        تُدرك القيادة الحكيمة أن منح الموظف وقتاً للراحة ليس مجرد إجراء إداري، بل هو استثمار مباشر في طاقته الإيجابية وتجديد لشغفه. الإجازة هي حق يعزز الولاء ويحفز على العطاء، وعندما يعود الموظف من إجازته، يعود بنفسية متجددة وعطاء أكبر.
                    </p>
                    <div className="mt-6 text-right bg-white p-4 rounded-md inline-block shadow-sm border">
                        <p className="font-bold mb-2">عندما يقدم أحد أعضاء كادرك الموقر طلبًا، ستظهر جميع الطلبات هنا وستتمكن من:</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li><strong>الموافقة أو الرفض:</strong> مع إمكانية توضيح سبب الرفض لتعزيز الشفافية.</li>
                            <li><strong>متابعة الأرصدة:</strong> الاطلاع الفوري على رصيد الإجازات المتبقي لكل مدرس.</li>
                            <li><strong>خصم تلقائي:</strong> سيقوم النظام بخصم أيام الإجازة الموافق عليها من الرصيد الكلي تلقائياً.</li>
                            <li><strong>تصدير المستندات:</strong> يمكنك تصدير نموذج الطلب والموافقة بصيغة PDF بضغطة زر.</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
    
    const renderRequestDetails = () => {
        if (!selectedRequest) return null;
        const teacherBalance = teacherLeaveBalances[selectedRequest.teacherId] ?? TOTAL_LEAVE_DAYS;
        return (
            <div className="space-y-4">
                 <button onClick={() => setSelectedRequest(null)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">&larr; العودة للقائمة</button>
                 <div className="p-4 border rounded-lg bg-blue-50">
                    <h3 className="font-bold text-lg">طلب المدرس: {selectedRequest.teacherName}</h3>
                    <p className="font-semibold">الرصيد المتبقي: <span className="text-blue-600">{teacherBalance}</span> أيام</p>
                    <pre className="mt-2 p-3 bg-white border rounded-md whitespace-pre-wrap font-sans">{selectedRequest.requestBody}</pre>
                 </div>
                 {selectedRequest.status === 'pending' && (
                     <div className="flex justify-end gap-4">
                        <button onClick={() => setModalType('reject')} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">رفض</button>
                        <button onClick={handleOpenApproveModal} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">موافقة</button>
                     </div>
                 )}
            </div>
        );
    };

    return (
        <div>
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
            {selectedRequest ? renderRequestDetails() : renderRequestList()}
            {modalType && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
                        <h3 className="text-xl font-bold mb-4">{modalType === 'approve' ? 'موافقة على طلب إجازة' : 'رفض طلب إجازة'}</h3>
                        {modalType === 'approve' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="font-semibold">نص الموافقة (قابل للتعديل):</label>
                                    <textarea value={approvalBody} onChange={e => setApprovalBody(e.target.value)} rows={12} className="w-full p-2 border rounded-md mt-1 font-sans"></textarea>
                                </div>
                                 <div>
                                    <label className="font-semibold">عدد أيام الخصم من الرصيد:</label>
                                    <input type="number" value={daysDeducted} onChange={e => setDaysDeducted(parseInt(e.target.value) || 1)} min="1" max="7" className="w-full p-2 border rounded-md mt-1" />
                                </div>
                            </div>
                        )}
                        {modalType === 'reject' && (
                            <div>
                                <label className="font-semibold">سبب الرفض:</label>
                                <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={5} className="w-full p-2 border rounded-md mt-1" placeholder="اكتب سبب الرفض هنا..."></textarea>
                            </div>
                        )}
                         <div className="mt-6 flex justify-end gap-3">
                            <button onClick={closeModal} disabled={isProcessing} className="px-4 py-2 bg-gray-300 rounded-md">إلغاء</button>
                            <button onClick={handleResolveRequest} disabled={isProcessing} className="px-4 py-2 bg-cyan-600 text-white rounded-md flex items-center gap-2">
                                {isProcessing ? <Loader2 className="animate-spin" /> : <Send />}
                                إرسال الرد
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
