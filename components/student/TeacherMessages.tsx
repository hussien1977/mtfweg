import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { User, Conversation, ChatMessage } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { v4 as uuidv4 } from 'uuid';
import { Send, Loader2, MessageCircle, Users } from 'lucide-react';

// ===================================
// Chat Window Component
// ===================================
const ChatWindow = ({ conversation, currentUser, messages }: { conversation: Conversation, currentUser: User, messages: ChatMessage[] }) => {
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }); }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || isSending) return;
        setIsSending(true);

        const messageId = uuidv4();
        const timestamp = Date.now();
        
        try {
            const message: ChatMessage = { id: messageId, senderId: currentUser.id, senderName: currentUser.name, text: newMessage.trim(), timestamp };
            const lastMessageText = message.text;
            const conversationUpdates: Partial<Conversation> = { lastMessageText, lastMessageTimestamp: timestamp, unreadByStudent: false, unreadByStaff: true, isArchived: false };
            const updates: Record<string, any> = {};
            updates[`/conversations/${conversation.principalId}/${conversation.id}`] = { ...conversation, ...conversationUpdates };
            updates[`/messages/${conversation.id}/${messageId}`] = message;
            await db.ref().update(updates);
            setNewMessage('');
        } catch (error) { console.error(error); alert("فشل إرسال الرسالة."); } finally { setIsSending(false); }
    };
    
    return (
        <div className="flex flex-col h-full bg-white border rounded-lg shadow-inner">
            <div className="p-3 border-b bg-gray-50"><h3 className="font-bold text-lg">{conversation.groupName || `مدرس ${conversation.subjectName}`}</h3></div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-100 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md p-3 rounded-lg shadow ${msg.senderId === currentUser.id ? 'bg-cyan-500 text-white' : 'bg-white text-gray-800'}`}>
                            {msg.text && <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>}
                            <div className={`text-xs mt-1 flex items-center gap-2 ${msg.senderId === currentUser.id ? 'justify-end text-cyan-100' : 'justify-start text-gray-500'}`}>
                                {msg.editedAt && <span>(تم التعديل)</span>}
                                <span>{new Date(msg.timestamp).toLocaleTimeString('ar-EG')}</span>
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            {conversation.chatDisabled ? (<div className="p-4 border-t bg-gray-100 text-center text-gray-500 font-semibold">الدردشة معطلة من قبل المدرس.</div>) : (
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
// Main Component
// ===================================
export default function TeacherMessages({ currentUser }: { currentUser: User }) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    
    useEffect(() => {
        if (!currentUser.principalId) return;
        const convRef = db.ref(`conversations/${currentUser.principalId}`);
        const callback = (snapshot: any) => {
            const data = snapshot.val() || {};
            const convList: Conversation[] = Object.values(data);
            setConversations(
                convList
                    .filter(c => 
                        c.teacherId && // Must be from a teacher
                        (c.studentId === currentUser.id || c.classId === currentUser.classId)
                    )
                    .sort((a,b) => b.lastMessageTimestamp - a.lastMessageTimestamp)
            );
        };
        convRef.on('value', callback);
        return () => convRef.off('value', callback);
    }, [currentUser.id, currentUser.principalId, currentUser.classId]);

    useEffect(() => {
        if (activeConversation) {
            const messagesRef = db.ref(`messages/${activeConversation.id}`);
            const callback = (snapshot: any) => {
                const data = snapshot.val() || {};
                const sortedMessages = Object.values(data).sort((a: any, b: any) => a.timestamp - b.timestamp) as ChatMessage[];
                setMessages(sortedMessages);
                 if (activeConversation.unreadByStudent) {
                     db.ref(`conversations/${currentUser.principalId}/${activeConversation.id}/unreadByStudent`).set(false);
                }
            };
            messagesRef.on('value', callback);
            return () => messagesRef.off('value', callback);
        }
    }, [activeConversation, currentUser.principalId]);

    const handleConversationClick = (conv: Conversation) => {
        setActiveConversation(conv);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 11rem)' }}>
            <div className="md:col-span-1 bg-white border rounded-lg p-2 overflow-y-auto">
                <h3 className="font-bold p-2 text-center text-lg">المحادثات</h3>
                {conversations.length > 0 ? conversations.map(conv => {
                    const isActive = activeConversation?.id === conv.id;
                    return (
                        <button key={conv.id} onClick={() => handleConversationClick(conv)} className={`w-full text-right p-3 rounded-md flex justify-between items-center ${isActive ? 'bg-cyan-500 text-white' : 'hover:bg-gray-100'}`}>
                            <div className="flex items-center gap-2">
                                {conv.classId && <Users size={16} className={isActive ? 'text-white' : 'text-gray-400'} />}
                                <div>
                                    <p className="font-semibold">{conv.groupName || conv.staffName}</p>
                                    <p className={`text-sm ${isActive ? 'text-cyan-100' : 'text-gray-500'}`}>{conv.subjectName}</p>
                                </div>
                            </div>
                            {(conv.unreadByStudent) && <span className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0 ml-2 animate-pulse"></span>}
                        </button>
                    )
                }) : (
                     <div className="p-4 text-center text-gray-500">لم يبدأ أي مدرس محادثة معك بعد.</div>
                )}
            </div>
            <div className="md:col-span-2 h-full">
                {activeConversation ? (
                    <ChatWindow conversation={activeConversation} currentUser={currentUser} messages={messages}/>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full bg-gray-50 border rounded-lg text-gray-500 text-center">
                        <MessageCircle size={48} className="mb-4"/>
                        <p className="font-semibold">اختر محادثة من القائمة لعرض الرسائل.</p>
                    </div>
                )}
            </div>
        </div>
    );
}