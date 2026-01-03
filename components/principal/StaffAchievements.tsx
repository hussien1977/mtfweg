
import React, { useState, useEffect, useMemo } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { User, ClassData, StudentEvaluation, Homework, BehavioralHonorBoard, BehavioralVote, Conversation, HonoredStudent } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { Loader2, Star, ClipboardEdit, Award as AwardIcon, MessageSquare, FileDown, Users } from 'lucide-react';
import StaffAchievementsPDFPage from './StaffAchievementsPDFPage.tsx';

declare const jspdf: any;
declare const html2canvas: any;

interface StaffAchievementsProps {
    principal: User;
    users: User[];
    classes: ClassData[];
}

interface RawData {
    evaluations: StudentEvaluation[];
    homeworks: Homework[];
    honorBoards: BehavioralHonorBoard[];
    conversations: Conversation[];
}

export interface TeacherStats {
    evaluations: number;
    homework: number;
    votes: number;
    individualChats: number;
    groupChats: number;
}

export default function StaffAchievements({ principal, users, classes }: StaffAchievementsProps) {
    const [rawData, setRawData] = useState<RawData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    const today = new Date();
    const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
    const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

    useEffect(() => {
        const principalId = principal.id;
        if (!principalId) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const evaluationsRef = db.ref(`evaluations/${principalId}`);
                const homeworkRef = db.ref(`homework_data/${principalId}`);
                const honorBoardsRef = db.ref(`behavioral_honor_boards/${principalId}`);
                const conversationsRef = db.ref(`conversations/${principalId}`);

                const [evalSnap, hwSnap, honorSnap, convSnap] = await Promise.all([
                    evaluationsRef.get(),
                    homeworkRef.get(),
                    honorBoardsRef.get(),
                    conversationsRef.get()
                ]);

                const evalsData = evalSnap.val() || {};
                const hwData = hwSnap.val() || {};
                const honorData = honorSnap.val() || {};
                const convData = convSnap.val() || {};

                setRawData({
                    evaluations: Object.values(evalsData).flatMap((studentEvals: any) => Object.values(studentEvals)),
                    homeworks: Object.values(hwData),
                    honorBoards: Object.values(honorData).flatMap((week: any) => Object.values(week)),
                    conversations: Object.values(convData)
                });

            } catch (error) {
                console.error("Failed to fetch achievement data", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [principal.id]);

    // Include both teachers and counselors
    const staff = useMemo(() => {
        return users.filter(u => (u.role === 'teacher' || u.role === 'counselor') && u.principalId === principal.id)
                    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [users, principal.id]);
    
    const staffStats = useMemo(() => {
        const statsMap = new Map<string, TeacherStats>();
        if (!rawData || !startDate || !endDate) return statsMap;

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const filteredEvals = rawData.evaluations.filter(e => {
            const evalDate = new Date(e.timestamp);
            return evalDate >= start && evalDate <= end;
        });
    
        const filteredHomeworks = rawData.homeworks.filter(h => {
            const hwDate = new Date(h.createdAt);
            return hwDate >= start && hwDate <= end;
        });
    
        const filteredHonorBoards = rawData.honorBoards.filter(b => {
            const boardDate = new Date(b.weekStartDate);
            const weekEnd = new Date(boardDate);
            weekEnd.setDate(weekEnd.getDate() + 7);
            return start < weekEnd && end > boardDate;
        });
    
        const filteredConversations = rawData.conversations.filter(c => {
            const convDate = new Date(c.lastMessageTimestamp);
            return convDate >= start && convDate <= end;
        });

        staff.forEach(member => {
            const evaluations = filteredEvals.filter(e => e.teacherId === member.id).length;
            const homework = filteredHomeworks.filter(h => h.teacherId === member.id).length;
            const individualChats = filteredConversations.filter(c => (c.teacherId === member.id || c.staffName === member.name) && c.studentId).length;
            const groupChats = filteredConversations.filter(c => (c.teacherId === member.id || c.staffName === member.name) && c.classId && !c.studentId).length;
            
            let votes = 0;
            filteredHonorBoards.forEach(board => {
                if (board.honoredStudents) {
                    Object.values(board.honoredStudents).forEach((student: unknown) => {
                        if ((student as HonoredStudent).votes) {
                            Object.values((student as HonoredStudent).votes).forEach((vote: unknown) => {
                                if ((vote as BehavioralVote).voterId === member.id) {
                                    votes++;
                                }
                            });
                        }
                    });
                }
            });
            
            statsMap.set(member.id, { evaluations, homework, votes, individualChats, groupChats });
        });

        return statsMap;
    }, [staff, rawData, startDate, endDate]);
    
    const handleExportPdf = async () => {
        if (staff.length === 0) {
            alert("لا يوجد كادر لتصدير بياناتهم.");
            return;
        }

        setIsExporting(true);

        const { jsPDF } = jspdf;
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        const renderComponent = (component: React.ReactElement) => new Promise<void>(resolve => {
            root.render(component);
            setTimeout(resolve, 500);
        });

        const STAFF_PER_PAGE = 9;
        const staffChunks = [];
        for (let i = 0; i < staff.length; i += STAFF_PER_PAGE) {
            staffChunks.push(staff.slice(i, i + STAFF_PER_PAGE));
        }

        try {
            await document.fonts.ready;
            for (let i = 0; i < staffChunks.length; i++) {
                const chunk = staffChunks[i];
                
                await renderComponent(
                    <StaffAchievementsPDFPage
                        teachers={chunk}
                        stats={staffStats}
                        principal={principal}
                        pageNumber={i + 1}
                        totalPages={staffChunks.length}
                    />
                );

                const reportElement = tempContainer.children[0] as HTMLElement;
                const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
            }
            pdf.save('إنجازات-الكادر.pdf');
        } catch (error) {
            console.error("PDF Export error:", error);
            alert(`حدث خطأ أثناء التصدير: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
        }
    };


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-600" />
            </div>
        );
    }
    
    return (
        <div className="bg-white p-8 rounded-xl shadow-lg">
            {isExporting && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center z-50 text-white">
                    <Loader2 className="animate-spin h-16 w-16 mb-4" />
                    <p className="text-2xl font-bold">جاري إعداد التقرير...</p>
                </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 border-b pb-4 gap-4">
                <h2 className="text-3xl font-bold text-gray-800">إنجازات الكادر (مدرسين ومرشدين)</h2>
                <button 
                    onClick={handleExportPdf}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
                    disabled={isExporting || staff.length === 0}
                >
                    <FileDown size={20} />
                    <span>تصدير PDF</span>
                </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-8 p-4 bg-gray-100 rounded-lg">
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">من تاريخ</label>
                    <input
                        type="date"
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">إلى تاريخ</label>
                    <input
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>
            </div>
            
            {staff.length === 0 ? (
                <p className="text-center text-gray-500 py-8">لم يتم إضافة أي كادر بعد.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {staff.map(member => {
                        const stats = staffStats.get(member.id) || { evaluations: 0, homework: 0, votes: 0, individualChats: 0, groupChats: 0 };
                        return (
                            <div key={member.id} className="bg-gray-50 p-6 rounded-lg border-l-4 border-cyan-500 shadow-sm">
                                <h3 className="text-xl font-bold text-gray-800 mb-1">{member.name}</h3>
                                <p className="text-sm text-gray-500 mb-4">{member.role === 'counselor' ? 'مرشد تربوي' : 'مدرس'}</p>
                                <div className="space-y-3 text-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-gray-700">
                                            <Star className="text-yellow-500" />
                                            <span>تقييمات الطلاب</span>
                                        </div>
                                        <span className="font-bold text-cyan-600 bg-cyan-100 px-3 py-1 rounded-full">{stats.evaluations}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-gray-700">
                                            <ClipboardEdit className="text-blue-500" />
                                            <span>الواجبات المرسلة</span>
                                        </div>
                                        <span className="font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">{stats.homework}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-gray-700">
                                            <AwardIcon className="text-purple-500" />
                                            <span>تصويتات لوحة الشرف</span>
                                        </div>
                                        <span className="font-bold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">{stats.votes}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-gray-700">
                                            <MessageSquare className="text-green-500" />
                                            <span>محادثات فردية</span>
                                        </div>
                                        <span className="font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full">{stats.individualChats}</span>
                                    </div>
                                     <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-gray-700">
                                            <Users className="text-teal-500" />
                                            <span>محادثات جماعية</span>
                                        </div>
                                        <span className="font-bold text-teal-600 bg-teal-100 px-3 py-1 rounded-full">{stats.groupChats}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
