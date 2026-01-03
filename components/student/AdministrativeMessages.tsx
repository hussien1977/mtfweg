import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { User, Conversation, ChatMessage } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { v4 as uuidv4 } from 'uuid';
import { Send, Loader2, Users, MessageCircle } from 'lucide-react';

// ===================================
// Chat Window Component
// ===================================
const ChatWindow = ({ conversation, currentUser, messages }: { conversation: Conversation, currentUser: User, messages: ChatMessage[] }) => {
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }); }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || isSending || !currentUser.principalId) return;
        setIsSending(true);

        const principalUserSnap = await db.ref(`users/${currentUser.principalId}`).get();
        const principalName = principalUserSnap.val()?.name || 'المدير';
        
        const convExists = conversation && conversation.lastMessageTimestamp > 0;
        let currentConv = conversation;
        if (!convExists) {
             currentConv = {
                id: `p_${currentUser.principalId}__s_${currentUser.id}`, principalId: currentUser.principalId!, studentId: currentUser.id, studentName: currentUser.name,
                staffName: principalName, lastMessageText: '', lastMessageTimestamp: 0,
                unreadByStudent: false, unreadByStaff: false, isArchived: false, chatDisabled: false,
            };
        }
        
        const messageId = uuidv4();
        const timestamp = Date.now();

        try {
            const message: ChatMessage = { id: messageId, senderId: currentUser.id, senderName: currentUser.name, text: newMessage.trim(), timestamp };
            const lastMessageText = message.text;
            const conversationUpdates: Partial<Conversation> = { lastMessageText, lastMessageTimestamp: timestamp, unreadByStudent: false, unreadByStaff: true, isArchived: false };
            
            const updates: Record<string, any> = {};
            updates[`/conversations/${currentUser.principalId}/${currentConv.id}`] = { ...currentConv, ...conversationUpdates };
            updates[`/messages/${currentConv.id}/${messageId}`] = message;

            await db.ref().update(updates);
            setNewMessage('');
        } catch (error) { console.error(error); alert("فشل إرسال الرسالة."); } finally { setIsSending(false); }
    };

    return (
        <div className="flex flex-col h-full bg-white border rounded-lg shadow-lg">
            <div className="p-3 border-b bg-gray-50"><h3 className="font-bold text-lg">{conversation.groupName || conversation.staffName || 'الإدارة'}</h3></div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-100 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md p-3 rounded-lg shadow ${msg.senderId === currentUser.id ? 'bg-cyan-500 text-white' : 'bg-white text-gray-800'}`}>
                            {msg.text && <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>}
                            <p className={`text-xs mt-1 text-right ${msg.senderId === currentUser.id ? 'text-cyan-100' : 'text-gray-500'}`}>{new Date(msg.timestamp).toLocaleTimeString('ar-EG')}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
             {conversation?.chatDisabled ? (
                <div className="p-4 border-t bg-gray-100 text-center text-gray-500 font-semibold">الدردشة معطلة من قبل الإدارة.</div>
            ) : (
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


interface AdministrativeMessagesProps {
    currentUser: User;
}

export default function AdministrativeMessages({ currentUser }: AdministrativeMessagesProps) {
    const [allConversations, setAllConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [principalName, setPrincipalName] = useState('الإدارة');

    useEffect(() => {
        if (!currentUser.principalId) {
            setIsLoading(false);
            return;
        }
        
        db.ref(`users/${currentUser.principalId}`).get().then(snap => {
            if (snap.exists()) {
                setPrincipalName(snap.val().name);
            }
        });

        const convRef = db.ref(`conversations/${currentUser.principalId}`);
        const callback = (snapshot: any) => {
            const data = snapshot.val() || {};
            const convList: Conversation[] = Object.values(data);
            setAllConversations(convList);
            setIsLoading(false);
        };
        convRef.on('value', callback);

        return () => convRef.off('value', callback);
    }, [currentUser.principalId]);

    useEffect(() => {
        if (activeConversation) {
            const messagesRef = db.ref(`messages/${activeConversation.id}`);
            const callback = (snapshot: any) => {
                const data = snapshot.val() || {};
                setMessages((Object.values(data) as ChatMessage[]).sort((a, b) => a.timestamp - b.timestamp));
                
                if (activeConversation.unreadByStudent) {
                    db.ref(`conversations/${currentUser.principalId}/${activeConversation.id}/unreadByStudent`).set(false);
                }
            };
            messagesRef.on('value', callback);
            return () => messagesRef.off('value', callback);
        } else {
            setMessages([]);
        }
    }, [activeConversation, currentUser.principalId]);

    const handleSelectPrincipalChat = () => {
        const principalConvId = `p_${currentUser.principalId}__s_${currentUser.id}`;
        const existingConv = allConversations.find(c => c.id === principalConvId);

        if (existingConv) {
            setActiveConversation(existingConv);
        } else {
            const newConv: Conversation = {
                id: principalConvId,
                principalId: currentUser.principalId!,
                studentId: currentUser.id,
                studentName: currentUser.name,
                staffName: principalName,
                lastMessageText: '',
                lastMessageTimestamp: 0,
                unreadByStudent: false,
                unreadByStaff: false,
                isArchived: false,
                chatDisabled: false,
            };
            setActiveConversation(newConv);
        }
    };

    const groupConvs = useMemo(() => {
        return allConversations
            .filter(c => !c.teacherId && c.classId === currentUser.classId)
            .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
    }, [allConversations, currentUser.classId]);

    const principalConvForUnread = allConversations.find(c => c.id === `p_${currentUser.principalId}__s_${currentUser.id}`);
    const hasUnreadPrincipalMessage = principalConvForUnread?.unreadByStudent;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 11rem)' }}>
            <div className="md:col-span-1 bg-white border rounded-lg p-2 overflow-y-auto">
                <h3 className="font-bold p-2 text-center text-lg">محادثات الإدارة</h3>
                
                <button onClick={handleSelectPrincipalChat} className={`w-full text-right p-3 rounded-md flex justify-between items-center ${activeConversation?.id === `p_${currentUser.principalId}__s_${currentUser.id}` ? 'bg-cyan-500 text-white' : 'hover:bg-gray-100'}`}>
                    <div className="flex items-center gap-2">
                        <div>
                            <p className="font-semibold">{principalName}</p>
                        </div>
                    </div>
                    {hasUnreadPrincipalMessage && <span className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0 ml-2 animate-pulse"></span>}
                </button>
                
                {groupConvs.map(conv => {
                    const isActive = activeConversation?.id === conv.id;
                    return (
                        <button key={conv.id} onClick={() => setActiveConversation(conv)} className={`w-full text-right p-3 rounded-md flex justify-between items-center ${isActive ? 'bg-cyan-500 text-white' : 'hover:bg-gray-100'}`}>
                            <div className="flex items-center gap-2 overflow-hidden">
                                {conv.classId && <Users size={16} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />}
                                <div className="truncate">
                                    <p className="font-semibold truncate">{conv.groupName || conv.staffName}</p>
                                </div>
                            </div>
                            {conv.unreadByStudent && <span className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0 ml-2 animate-pulse"></span>}
                        </button>
                    )
                })}
            </div>
            <div className="md:col-span-2 h-full">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin h-10 w-10"/></div>
                ) : activeConversation ? (
                    <ChatWindow conversation={activeConversation} currentUser={currentUser} messages={messages} />
                ) : (
                     <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 bg-gray-50 rounded-lg">
                        <MessageCircle size={48} className="mb-4"/>
                        <p className="font-semibold">اختر محادثة لعرض الرسائل.</p>
                        <p className="text-sm mt-2">يمكنك بدء محادثة جديدة مع الإدارة بالضغط على اسم المدير.</p>
                    </div>
                )}
            </div>
        </div>
    );
}