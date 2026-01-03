import React, { useState, useEffect } from 'react';
// Fix: Added missing type imports.
import type { User, YardDutySwapRequest, YardDutySchedule } from '../../types.ts';
import { Check, X, ArrowRightLeft, Hourglass, User as UserIcon, Loader2 } from 'lucide-react';
import { db } from '../../lib/firebase.ts';

const DAY_NAMES_AR: Record<string, string> = {
    Saturday: 'السبت', Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس'
};

export default function YardDutyCollaborationPlatform({ currentUser, users }: { currentUser: User; users: User[] }) {
    const [requests, setRequests] = useState<YardDutySwapRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const usersMap = new Map(users.map(u => [u.id, u]));
    const principalId = currentUser.role === 'principal' ? currentUser.id : currentUser.principalId;

    useEffect(() => {
        const requestsRef = db.ref('yard_duty_swap_requests');
        const callback = (snapshot: any) => {
            const data = snapshot.val();
            const allRequests: YardDutySwapRequest[] = data ? Object.values(data) : [];
            
            // Filter requests relevant to the current user's school
            const relevantRequests = allRequests.filter(req => {
                const requester = usersMap.get(req.requesterId);
                return requester && (requester as any).principalId === principalId;
            });

            setRequests(relevantRequests);
            setIsLoading(false);
        };
        requestsRef.on('value', callback);
        return () => requestsRef.off('value', callback);
    }, [usersMap, principalId]);

    const myRequests = requests.filter(r => r.requesterId === currentUser.id);
    const incomingRequests = requests.filter(r => r.responderId === currentUser.id && r.status === 'pending_teacher');
    const principalApprovals = requests.filter(r => r.status === 'pending_principal' && currentUser.role === 'principal');

    const handleTeacherResponse = (request: YardDutySwapRequest, newStatus: 'pending_principal' | 'rejected') => {
        db.ref(`yard_duty_swap_requests/${request.id}`).update({ status: newStatus });
    };
    
    const handlePrincipalApproval = async (request: YardDutySwapRequest, newStatus: 'approved' | 'rejected') => {
        if (newStatus === 'approved' && principalId) {
            const scheduleRef = db.ref(`yard_duty_schedules/${principalId}`);
            try {
                const snapshot = await scheduleRef.get();
                const schedule: YardDutySchedule = snapshot.val();
                if (!schedule || !schedule.assignments) throw new Error("Schedule not found");

                const originalAssignmentIndex = schedule.assignments.findIndex(a => a.day === request.originalSlot.day && a.locationId === request.originalSlot.locationId);
                const requestedAssignmentIndex = schedule.assignments.findIndex(a => a.day === request.requestedSlot.day && a.locationId === request.requestedSlot.locationId);
                
                if (originalAssignmentIndex === -1 || requestedAssignmentIndex === -1) {
                    throw new Error("One of the swap slots not found in the schedule.");
                }

                // Swap teacher IDs
                const newAssignments = [...schedule.assignments];
                const tempTeacherId = newAssignments[originalAssignmentIndex].teacherId;
                newAssignments[originalAssignmentIndex].teacherId = newAssignments[requestedAssignmentIndex].teacherId;
                newAssignments[requestedAssignmentIndex].teacherId = tempTeacherId;

                await scheduleRef.update({ assignments: newAssignments });
                await db.ref(`yard_duty_swap_requests/${request.id}`).update({ status: 'approved' });
                alert("تمت الموافقة على التبديل وتحديث الجدول.");

            } catch (error) {
                console.error("Failed to approve swap:", error);
                alert("فشل تحديث الجدول الرئيسي. الرجاء المحاولة مرة أخرى.");
                return; // Don't update status if schedule update fails
            }
        } else {
            // Just update status for rejection
             db.ref(`yard_duty_swap_requests/${request.id}`).update({ status: 'rejected' });
        }
    };
    
    const getStatusInfo = (status: YardDutySwapRequest['status']) => {
        switch(status) {
            case 'pending_teacher': return { text: 'بانتظار موافقة المدرس', color: 'text-yellow-600', icon: <Hourglass size={18} /> };
            case 'pending_principal': return { text: 'بانتظار موافقة المدير', color: 'text-blue-600', icon: <Hourglass size={18} /> };
            case 'approved': return { text: 'تمت الموافقة', color: 'text-green-600', icon: <Check size={18} /> };
            case 'rejected': return { text: 'تم الرفض', color: 'text-red-600', icon: <X size={18} /> };
            default: return { text: status, color: 'text-gray-600', icon: <Hourglass size={18} /> };
        }
    };

    const RequestCard: React.FC<{ request: YardDutySwapRequest; children?: React.ReactNode }> = ({ request, children }) => {
        const requesterName = usersMap.get(request.requesterId)?.name || 'مدرس غير معروف';
        const responderName = usersMap.get(request.responderId)?.name || 'مدرس غير معروف';
        const statusInfo = getStatusInfo(request.status);
        
        return (
            <div className="p-4 bg-gray-50 border rounded-lg shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                    <div className="flex-1 mb-3 sm:mb-0">
                        <div className="flex items-center text-lg font-semibold text-gray-800 mb-2">
                             <UserIcon className="inline-block mr-2 text-cyan-600"/>
                             <span>{requesterName}</span>
                             <ArrowRightLeft className="inline mx-4 text-gray-400" />
                             <UserIcon className="inline-block mr-2 text-purple-600"/>
                             <span>{responderName}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                             <p>
                                <span className="font-semibold text-cyan-700">مراقبتك:</span> {DAY_NAMES_AR[request.originalSlot.day]}
                            </p>
                            <p>
                                <span className="font-semibold text-purple-700">مقابل مراقبة:</span> {DAY_NAMES_AR[request.requestedSlot.day]}
                            </p>
                        </div>
                    </div>
                     <div className="flex items-center gap-4 w-full sm:w-auto">
                        {children}
                        {!children && (
                            <div className={`flex items-center gap-2 p-2 rounded-lg text-sm font-bold ${statusInfo.color}`}>
                                {statusInfo.icon}
                                <span>{statusInfo.text}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };
    
    if (isLoading) {
         return <div className="flex justify-center items-center p-8"><Loader2 className="h-12 w-12 animate-spin text-cyan-600" /></div>;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto space-y-8">
            {currentUser.role === 'teacher' && (
                <div>
                    <h3 className="text-xl font-bold mb-4">طلبات واردة لك</h3>
                    {incomingRequests.length === 0 ? <p className="text-gray-500">لا توجد طلبات واردة حالياً.</p> : (
                        <div className="space-y-3">
                            {incomingRequests.map(req => (
                                <RequestCard key={req.id} request={req}>
                                    <div className="flex gap-2">
                                        <button title="رفض" onClick={() => handleTeacherResponse(req, 'rejected')} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"><X/></button>
                                        <button title="موافقة مبدئية" onClick={() => handleTeacherResponse(req, 'pending_principal')} className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200"><Check/></button>
                                    </div>
                                </RequestCard>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {currentUser.role === 'principal' && (
                 <div>
                    <h3 className="text-xl font-bold mb-4">طلبات بانتظار موافقتك</h3>
                    {principalApprovals.length === 0 ? <p className="text-gray-500">لا توجد طلبات تحتاج للموافقة.</p> : (
                        <div className="space-y-3">
                            {principalApprovals.map(req => (
                                <RequestCard key={req.id} request={req}>
                                     <div className="flex gap-2">
                                        <button title="رفض نهائي" onClick={() => handlePrincipalApproval(req, 'rejected')} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"><X/></button>
                                        <button title="موافقة نهائية" onClick={() => handlePrincipalApproval(req, 'approved')} className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200"><Check/></button>
                                    </div>
                                </RequestCard>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div>
                <h3 className="text-xl font-bold mb-4">طلباتك المرسلة</h3>
                {myRequests.length === 0 ? <p className="text-gray-500">لم تقم بإرسال أي طلبات تبديل.</p> : (
                    <div className="space-y-3">
                        {myRequests.map(req => (
                            <RequestCard key={req.id} request={req} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}