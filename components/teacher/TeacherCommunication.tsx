import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { User, Teacher, ClassData, Conversation, ChatMessage, Student, Subject } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { v4 as uuidv4 } from 'uuid';
import { Send, Loader2, MessageSquare, Search, X, User as UserIcon, Plus, Users, ShieldCheck, ShieldOff, Trash2, Pencil, Save } from 'lucide-react';

// ===================================
// Chat Window Component
// ===================================
const ChatWindow = ({ conversation, currentUser, messages, onClose }: { conversation: Conversation, currentUser: Teacher, messages: ChatMessage[], onClose: () => void; }) => {
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [editingMessage, setEditingMessage] = useState<{ id: string, text: string } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || isSending) return;
        setIsSending(true);

        const message: ChatMessage = {
            id: uuidv4(),
            senderId: currentUser.id,
            senderName: currentUser.name,
            text: newMessage.trim(),
            timestamp: Date.now(),
        };

        const conversationUpdates: Partial<Conversation> = {
            lastMessageText: message.text,
            lastMessageTimestamp: message.timestamp,
            unreadByStudent: true,
            unreadByStaff: false,
            isArchived: false,
        };
        
        const updates: Record<string, any> = {};
        updates[`/conversations/${conversation.principalId}/${conversation.id}`] = { ...conversation, ...conversationUpdates };
        updates[`/messages/${conversation.id}/${message.id}`] = message;

        try {
            await db.ref().update(updates);
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message:", error);
            alert('فشل إرسال الرسالة.');
        } finally {
            setIsSending(false);
        }
    };
    
    const handleToggleChatLock = async () => {
        try {
            await db.ref(`conversations/${conversation.principalId}/${conversation.id}/chatDisabled`).set(!conversation.chatDisabled);
        } catch (error) {
            console.error("Failed to toggle chat lock:", error);
            alert('فشل تغيير حالة الدردشة.');
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذه الرسالة؟')) {
            try {
                await db.ref(`messages/${conversation.id}/${messageId}`).remove();
            } catch (error) {
                console.error("Failed to delete message:", error);
                alert('فشل حذف الرسالة.');
            }
        }
    };

    const handleSaveEdit = async () => {
        if (!editingMessage || !editingMessage.text.trim()) return;
        try {
            await db.ref(`messages/${conversation.id}/${editingMessage.id}`).update({
                text: editingMessage.text.trim(),
                editedAt: Date.now()
            });
            setEditingMessage(null);
        } catch (error) {
            console.error("Failed to save edited message:", error);
            alert('فشل حفظ التعديل.');
        }
    };


    return (
        <div className="flex flex-col h-full bg-white border rounded-lg shadow-inner">
             <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg">{conversation.groupName || conversation.studentName}</h3>
                    <p className="text-sm text-gray-500">{conversation.subjectName}</p>
                    {conversation.chatDisabled && (
                        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                            الدردشة معطلة للطلاب
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleToggleChatLock} 
                        className={`p-2 rounded-full transition-colors ${
                            conversation.chatDisabled 
                            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                            : 'text-gray-500 hover:bg-gray-200'
                        }`} 
                        title={conversation.chatDisabled ? 'تمكين الدردشة للطلاب' : 'تعطيل الدردشة للطلاب'}
                    >
                        {conversation.chatDisabled ? <ShieldOff /> : <ShieldCheck />}
                    </button>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full">
                        <X size={20} />
                    </button>
                </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-100 space-y-4">
                {messages.map(msg => {
                    const isMyMessage = msg.senderId === currentUser.id;
                    if (editingMessage && editingMessage.id === msg.id) {
                        return (
                             <div key={msg.id} className="flex justify-end">
                                <div className="w-full max-w-xs lg:max-w-md p-2 rounded-lg shadow bg-cyan-600">
                                    <textarea
                                        value={editingMessage.text}
                                        onChange={(e) => setEditingMessage({ ...editingMessage, text: e.target.value })}
                                        className="w-full p-2 border rounded-md bg-white text-black"
                                        rows={3}
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button onClick={() => setEditingMessage(null)} className="px-3 py-1 bg-gray-200 text-black rounded-md text-sm">إلغاء</button>
                                        <button onClick={handleSaveEdit} className="px-3 py-1 bg-green-500 text-white rounded-md text-sm">حفظ</button>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                    return (
                        <div key={msg.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                            <div className={`group relative max-w-xs lg:max-w-md p-3 rounded-lg shadow ${isMyMessage ? 'bg-cyan-500 text-white' : 'bg-white text-gray-800'}`}>
                                {msg.text && <p className="text-sm break-words whitespace-pre-wrap pb-4">{msg.text}</p>}
                                <div className={`text-xs mt-1 flex items-center gap-2 ${isMyMessage ? 'justify-end text-cyan-100' : 'justify-start text-gray-500'}`}>
                                    {msg.editedAt && <span>(تم التعديل)</span>}
                                    <span>{new Date(msg.timestamp).toLocaleTimeString('ar-EG')}</span>
                                </div>
                                {isMyMessage && !editingMessage && (
                                    <div className="absolute bottom-1 left-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingMessage({ id: msg.id, text: msg.text })} className="p-1 text-cyan-200 hover:text-white rounded-full bg-black/20 hover:bg-black/40" title="تعديل">
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => handleDeleteMessage(msg.id)} className="p-1 text-cyan-200 hover:text-white rounded-full bg-black/20 hover:bg-black/40" title="حذف">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>
            {conversation.chatDisabled && conversation.studentId ? (<div className="p-4 border-t bg-gray-100 text-center text-gray-500 font-semibold">الدردشة معطلة لهذا الطالب.</div>) : (
                <div className="p-2 border-t bg-white">
                    <div className="flex items-center gap-2">
                        <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} placeholder="اكتب رسالتك..." className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                        <button onClick={handleSendMessage} disabled={isSending} className="p-3 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:bg-gray-400">{isSending ? <Loader2 className="animate-spin"/> : <Send/>}</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ===================================
// New Conversation Modals
// ===================================
const NewIndividualModal = ({ teacher, classes, onClose, onSelectStudent }: { teacher: Teacher; classes: ClassData[]; onClose: () => void; onSelectStudent: (student: Student, classInfo: ClassData) => void; }) => {
    const [search, setSearch] = useState('');
    const studentsByClass = useMemo(() => {
        // ... (implementation is fine)
        const grouped: Record<string, Student[]> = {};
        (teacher.assignments || []).forEach(assignment => {
            const classInfo = classes.find(c => c.id === assignment.classId);
            if (classInfo && classInfo.students) {
                if (!grouped[classInfo.id]) { grouped[classInfo.id] = []; }
                classInfo.students.forEach(student => {
                    if (!grouped[classInfo.id].some(s => s.id === student.id)) {
                        grouped[classInfo.id].push(student);
                    }
                });
            }
        });
        Object.values(grouped).forEach(students => students.sort((a,b) => a.name.localeCompare(b.name, 'ar')));
        return grouped;
    }, [teacher, classes]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg flex flex-col h-[70vh]" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">بدء محادثة فردية</h3>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن طالب..." className="w-full p-2 border rounded-md mb-4"/>
                <div className="flex-1 overflow-y-auto">
                    {Object.entries(studentsByClass).map(([classId, students]) => {
                        const classInfo = classes.find(c => c.id === classId);
                        // FIX: Cast `students` to `Student[]` to fix `Property 'filter' does not exist on type 'unknown'` error.
                        const filteredStudents = (students as Student[]).filter(s => s.name.includes(search));
                        if (filteredStudents.length === 0) return null;
                        return (
                            <div key={classId}>
                                <h4 className="font-bold bg-gray-100 p-2 rounded sticky top-0">{classInfo?.stage} - {classInfo?.section}</h4>
                                {filteredStudents.map(student => (
                                    <button key={student.id} onClick={() => onSelectStudent(student, classInfo!)} className="w-full text-right p-3 hover:bg-gray-100 rounded-md">{student.name}</button>
                                ))}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

const NewGroupModal = ({ teacher, classes, onClose, onCreateGroup }: { teacher: Teacher; classes: ClassData[]; onClose: () => void; onCreateGroup: (classInfo: ClassData, subjectInfo: Subject) => void; }) => {
    const assignments = useMemo(() => {
        const unique = new Map<string, { classInfo: ClassData, subjectInfo: Subject }>();
        (teacher.assignments || []).forEach(a => {
            const classInfo = classes.find(c => c.id === a.classId);
            const subjectInfo = classInfo?.subjects.find(s => s.id === a.subjectId);
            if (classInfo && subjectInfo) {
                unique.set(`${classInfo.id}-${subjectInfo.id}`, { classInfo, subjectInfo });
            }
        });
        return Array.from(unique.values());
    }, [teacher, classes]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg flex flex-col h-[70vh]" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">بدء محادثة جماعية</h3>
                <div className="flex-1 overflow-y-auto">
                    {assignments.map(({ classInfo, subjectInfo }) => (
                        <button key={`${classInfo.id}-${subjectInfo.id}`} onClick={() => onCreateGroup(classInfo, subjectInfo)} className="w-full text-right p-3 hover:bg-gray-100 rounded-md">
                            <span className="font-bold">{subjectInfo.name}</span> - <span>{classInfo.stage} / {classInfo.section}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ===================================
// Main Component
// ===================================
export default function TeacherCommunication({ teacher, classes, users }: { teacher: Teacher, classes: ClassData[], users: User[] }) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isNewIndividualModalOpen, setIsNewIndividualModalOpen] = useState(false);
    const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
    const [chatType, setChatType] = useState<'individual' | 'group'>('individual');

    useEffect(() => {
        if (!teacher.principalId) { setIsLoading(false); return; }
        const convRef = db.ref(`conversations/${teacher.principalId}`);
        const callback = (snapshot: any) => {
            // FIX: The value from snapshot.val() can be null if there's no data.
            // Using `|| {}` ensures `data` is always an object, which prevents `Object.values` from throwing an error.
            const data = snapshot.val() || {};
            // FIX: Ensure data is an object before using Object.values, and filter out any null/falsy entries
            // that might come from Firebase arrays with empty slots. This resolves the reported runtime error.
            // Also, cast the result to Conversation[] to fix the TypeScript error.
            const convList: Conversation[] = data && typeof data === 'object' ? Object.values(data).filter(Boolean) as Conversation[] : [];
            setConversations(convList);
            setIsLoading(false);
        };
        convRef.on('value', callback);
        return () => convRef.off('value', callback);
    }, [teacher.principalId]);

    const individualConvs = useMemo(() => conversations.filter(c => c.teacherId === teacher.id && c.studentId).sort((a,b) => b.lastMessageTimestamp - a.lastMessageTimestamp), [conversations, teacher.id]);
    const groupConvs = useMemo(() => conversations.filter(c => c.teacherId === teacher.id && c.classId && !c.studentId).sort((a,b) => b.lastMessageTimestamp - a.lastMessageTimestamp), [conversations, teacher.id]);
    
    useEffect(() => {
        if (activeConversation) {
            const messagesRef = db.ref(`messages/${activeConversation.id}`);
            const callback = (snapshot: any) => {
                const data = snapshot.val() || {};
                setMessages(Object.values(data).sort((a: any, b: any) => a.timestamp - b.timestamp) as ChatMessage[]);
                if (activeConversation.unreadByStaff) {
                    db.ref(`conversations/${teacher.principalId}/${activeConversation.id}/unreadByStaff`).set(false);
                }
            };
            messagesRef.on('value', callback);
            return () => messagesRef.off('value', callback);
        }
    }, [activeConversation, teacher.principalId]);

    const handleSelectStudent = (student: Student, classInfo: ClassData) => {
        const convId = `t_${teacher.id}__s_${student.id}`;
        const existingConv = conversations.find(c => c.id === convId);
        if (existingConv) { setActiveConversation(existingConv); } 
        else {
            const newConv: Conversation = {
                id: convId, principalId: teacher.principalId!, teacherId: teacher.id,
                studentId: student.id, studentName: student.name, staffName: teacher.name,
                classId: classInfo.id,
                subjectName: individualConvs.find(c => c.classId === classInfo.id)?.subjectName || '',
                lastMessageText: '', lastMessageTimestamp: 0, unreadByStudent: false, unreadByStaff: false,
                isArchived: false, chatDisabled: false, groupName: `${classInfo.stage} - ${classInfo.section}`
            };
            setActiveConversation(newConv);
        }
        setIsNewIndividualModalOpen(false);
    };

    const handleCreateGroupChat = (classInfo: ClassData, subjectInfo: Subject) => {
        const convId = `g__c_${classInfo.id}__sub_${subjectInfo.id}__t_${teacher.id}`;
        const existingConv = conversations.find(c => c.id === convId);
        if (existingConv) { setActiveConversation(existingConv); }
        else {
            const timestamp = Date.now();
            const newConv: Conversation = {
                id: convId, principalId: teacher.principalId!, teacherId: teacher.id, studentId: '', studentName: '',
                staffName: teacher.name, classId: classInfo.id, subjectId: subjectInfo.id, subjectName: subjectInfo.name,
                groupName: `مجموعة ${subjectInfo.name} - ${classInfo.stage} / ${classInfo.section}`,
                lastMessageText: 'تم إنشاء المجموعة.', lastMessageTimestamp: timestamp,
                unreadByStudent: true, unreadByStaff: false, isArchived: false, chatDisabled: false,
            };
            const initialMessage: ChatMessage = { id: uuidv4(), senderId: teacher.id, senderName: teacher.name, text: 'تم إنشاء المجموعة.', timestamp };
            const updates: Record<string, any> = {};
            updates[`/conversations/${teacher.principalId}/${convId}`] = newConv;
            updates[`/messages/${convId}/${initialMessage.id}`] = initialMessage;
            db.ref().update(updates);
            setActiveConversation(newConv);
        }
        setIsNewGroupModalOpen(false);
    };
    
    const myConversations = useMemo(() => chatType === 'individual' ? individualConvs : groupConvs, [chatType, individualConvs, groupConvs]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 11rem)' }}>
            {isNewIndividualModalOpen && <NewIndividualModal teacher={teacher} classes={classes} onClose={() => setIsNewIndividualModalOpen(false)} onSelectStudent={handleSelectStudent} />}
            {isNewGroupModalOpen && <NewGroupModal teacher={teacher} classes={classes} onClose={() => setIsNewGroupModalOpen(false)} onCreateGroup={handleCreateGroupChat} />}
            
            <div className="md:col-span-1 bg-white border rounded-lg p-2 flex flex-col">
                 <div className="p-2 flex-shrink-0 grid grid-cols-2 gap-2">
                    <button onClick={() => setIsNewIndividualModalOpen(true)} className="w-full flex items-center justify-center gap-2 p-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600"><UserIcon /> فردية</button>
                    <button onClick={() => setIsNewGroupModalOpen(true)} className="w-full flex items-center justify-center gap-2 p-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600"><Users /> جماعية</button>
                 </div>
                 <div className="flex border-b mt-2">
                    <button onClick={() => setChatType('individual')} className={`flex-1 py-2 font-semibold ${chatType === 'individual' ? 'border-b-2 border-cyan-500 text-cyan-600' : 'text-gray-500'}`}>فردي ({individualConvs.length})</button>
                    <button onClick={() => setChatType('group')} className={`flex-1 py-2 font-semibold ${chatType === 'group' ? 'border-b-2 border-cyan-500 text-cyan-600' : 'text-gray-500'}`}>جماعي ({groupConvs.length})</button>
                </div>
                <div className="overflow-y-auto flex-grow">
                    {isLoading ? <Loader2 className="animate-spin mx-auto mt-8"/> : myConversations.map(conv => {
                        const isActive = activeConversation?.id === conv.id;
                        return (
                             <button key={conv.id} onClick={() => setActiveConversation(conv)} className={`w-full text-right p-3 rounded-md flex justify-between items-center ${isActive ? 'bg-cyan-500 text-white' : 'hover:bg-gray-100'}`}>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`p-2 rounded-full ${isActive ? 'bg-cyan-400' : 'bg-gray-200'}`}>{conv.studentId ? <UserIcon size={16}/> : <Users size={16}/>}</div>
                                    <div className="truncate">
                                        <p className="font-semibold truncate">{conv.studentName || conv.groupName}</p>
                                        <p className={`text-sm truncate max-w-[150px] ${isActive ? 'text-cyan-100' : 'text-gray-500'}`}>{conv.lastMessageText}</p>
                                    </div>
                                </div>
                                {conv.unreadByStaff && <span className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0 ml-2 animate-pulse"></span>}
                            </button>
                        )
                    })}
                </div>
            </div>
            <div className="md:col-span-2 h-full">
                {activeConversation ? (
                    <ChatWindow conversation={activeConversation} currentUser={teacher} messages={messages} onClose={() => setActiveConversation(null)} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 bg-gray-50 rounded-lg">
                        <MessageSquare size={48} className="mb-4"/>
                        <p className="font-semibold">اختر محادثة من القائمة أو ابدأ محادثة جديدة.</p>
                    </div>
                )}
            </div>
        </div>
    );
}