import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { User, ForumMessage, ForumMessageAttachment, PollData, PollOption, ForumReport, StudentNotification, ClassData } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { Send, Loader2, Lock, Unlock, User as UserIcon, Shield, GraduationCap, Users, MessageSquare, Eye, Trash2, Edit2, X, Check, Pin, PinOff, Paperclip, Image as ImageIcon, Video, BarChart2, Plus, Smile, Reply, Settings, Flag, AlertTriangle, Ban, CheckCircle, AtSign } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface SchoolForumProps {
    currentUser: User;
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '👏'];
const DEFAULT_BANNED_WORDS = ["غبي", "احمق", "حيوان", "كلب", "سافل", "تافه", "زفت", "حقير", "مجنون", "طز", "وقح"];

const RoleBadge = ({ role }: { role: string }) => {
    switch (role) {
        case 'principal':
            return <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"><Shield size={10} /> المدير</span>;
        case 'teacher':
            return <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"><Users size={10} /> مدرس</span>;
        case 'counselor':
            return <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"><UserIcon size={10} /> مرشد</span>;
        case 'student':
            return <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"><GraduationCap size={10} /> طالب</span>;
        default:
            return null;
    }
};

// --- Poll Component ---
const PollView = ({ message, currentUser, isPrincipal, onVote, onToggleStatus, onDelete }: { message: ForumMessage, currentUser: User, isPrincipal: boolean, onVote: (msgId: string, optionId: string) => void, onToggleStatus: (msgId: string) => void, onDelete: (msgId: string) => void }) => {
    if (!message.poll) return null;
    
    const { question, options, isActive } = message.poll;
    
    const totalVotes = options.reduce((acc, opt) => acc + (opt.voterIds?.length || 0), 0);
    const myVoteOptionId = options.find(opt => opt.voterIds?.includes(currentUser.id))?.id;
    const canControl = isPrincipal || message.senderId === currentUser.id;

    return (
        <div className="w-full max-w-md bg-white rounded-xl border-2 border-indigo-100 shadow-sm overflow-hidden mt-2">
            <div className="bg-indigo-50 p-3 border-b border-indigo-100 flex justify-between items-start">
                <div>
                     <h4 className="font-bold text-indigo-900 text-lg leading-tight">{question}</h4>
                     <p className="text-xs text-indigo-500 mt-1">
                        {isActive ? '📊 استطلاع رأي مفتوح' : '🔒 استطلاع رأي مغلق'} • {totalVotes} صوت
                     </p>
                </div>
                {canControl && (
                     <div className="flex gap-1">
                        <button onClick={() => onToggleStatus(message.id)} className={`p-1.5 rounded-full ${isActive ? 'text-amber-600 hover:bg-amber-100' : 'text-green-600 hover:bg-green-100'}`} title={isActive ? 'إغلاق التصويت' : 'فتح التصويت'}>
                            {isActive ? <Lock size={14}/> : <Unlock size={14}/>}
                        </button>
                        <button onClick={() => onDelete(message.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full" title="حذف">
                            <Trash2 size={14} />
                        </button>
                     </div>
                )}
            </div>
            <div className="p-3 space-y-2">
                {options.map(option => {
                    const votes = option.voterIds?.length || 0;
                    const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                    const isSelected = myVoteOptionId === option.id;
                    
                    return (
                        <button
                            key={option.id}
                            onClick={() => isActive && onVote(message.id, option.id)}
                            disabled={!isActive}
                            className={`relative w-full text-right p-2 rounded-lg border transition-all ${
                                isSelected 
                                ? 'border-indigo-500 bg-indigo-50' 
                                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                            } ${!isActive ? 'cursor-not-allowed opacity-80' : ''}`}
                        >
                             {/* Progress Bar Background */}
                             <div 
                                className={`absolute top-0 right-0 bottom-0 rounded-lg transition-all duration-500 ${isSelected ? 'bg-indigo-200/50' : 'bg-gray-100/50'}`} 
                                style={{ width: `${percentage}%`, right: 0, left: 'auto' }} // RTL support
                            ></div>
                            
                            <div className="relative z-10 flex justify-between items-center">
                                <span className={`font-medium ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>
                                    {option.text}
                                </span>
                                <div className="flex items-center gap-2">
                                    {isSelected && <CheckCircleIcon className="w-4 h-4 text-indigo-600"/>}
                                    <span className="text-xs font-bold text-gray-500">{percentage}%</span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const CheckCircleIcon = ({className}:{className?: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
);

// --- Mention Helper: Highlight Text ---
const HighlightedText = ({ text }: { text: string }) => {
    // Split text by spaces to preserve words, then check for mentions
    const parts = text.split(/(\s+)/); 
    
    return (
        <span>
            {parts.map((part, i) => {
                if (part.startsWith('@') && part.length > 1) {
                    return <span key={i} className="text-blue-600 font-bold bg-blue-50 rounded px-1">{part}</span>;
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
};

export default function SchoolForum({ currentUser }: SchoolForumProps) {
    const [messages, setMessages] = useState<ForumMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Banned Words State
    const [bannedWords, setBannedWords] = useState<string[]>(DEFAULT_BANNED_WORDS);
    const [isModerationModalOpen, setIsModerationModalOpen] = useState(false);
    const [newBannedWord, setNewBannedWord] = useState('');
    
    // Banned Users State
    const [bannedUsers, setBannedUsers] = useState<string[]>([]);

    // Reports State
    const [reports, setReports] = useState<ForumReport[]>([]);
    const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [activeReportMessage, setActiveReportMessage] = useState<ForumMessage | null>(null);

    // Reply State
    const [replyingTo, setReplyingTo] = useState<ForumMessage | null>(null);

    // Attachment State
    const [attachment, setAttachment] = useState<ForumMessageAttachment | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    // Edit state
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    // Poll Creation State
    const [isPollModalOpen, setIsPollModalOpen] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState<string[]>(['', '']); // Start with 2 options

    // Reaction State
    const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);

    // Mentions State
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [showMentionList, setShowMentionList] = useState(false);
    
    // View Readers State
    const [viewingReadersForMessageId, setViewingReadersForMessageId] = useState<string | null>(null);

    // Determine the correct principal ID (School ID)
    const schoolId = useMemo(() => 
        currentUser.role === 'principal' ? currentUser.id : currentUser.principalId, 
    [currentUser]);

    const isPrincipal = currentUser.role === 'principal';
    const isStaff = ['principal', 'teacher', 'counselor'].includes(currentUser.role);
    const isBanned = bannedUsers.includes(currentUser.id);

    // Helper function to check profanity using the current state
    const hasProfanity = (text: string) => {
        return bannedWords.some(word => text.includes(word));
    };

    // Fetch Users (Staff and Students) for Mentions and Reader Lists
    useEffect(() => {
        if (!schoolId) return;
        
        const fetchAllParticipants = async () => {
            try {
                const [usersSnap, classesSnap] = await Promise.all([
                    db.ref('users').once('value'),
                    db.ref('classes').once('value')
                ]);

                const usersData = usersSnap.val();
                const classesData = classesSnap.val();
                
                let combinedUsers: User[] = [];

                // 1. Add Staff from 'users' node
                if (usersData) {
                    const usersList = Object.values(usersData) as User[];
                    const schoolStaff = usersList.filter(u => u.id === schoolId || u.principalId === schoolId);
                    combinedUsers = [...schoolStaff];
                }

                // 2. Add Students from 'classes' node
                if (classesData) {
                    const classesList = Object.values(classesData) as ClassData[];
                    const schoolClasses = classesList.filter(c => c.principalId === schoolId);
                    
                    schoolClasses.forEach(cls => {
                        if (cls.students) {
                            cls.students.forEach(s => {
                                // Check if student is already added (unlikely but good safety)
                                if (!combinedUsers.some(u => u.id === s.id)) {
                                    combinedUsers.push({
                                        id: s.id,
                                        name: s.name,
                                        role: 'student',
                                        code: '', // dummy
                                        principalId: schoolId,
                                        classId: cls.id,
                                        stage: cls.stage,
                                        section: cls.section
                                    });
                                }
                            });
                        }
                    });
                }

                setAllUsers(combinedUsers);
            } catch (error) {
                console.error("Error fetching forum participants:", error);
            }
        };

        fetchAllParticipants();
    }, [schoolId]);

    // Fetch Messages and Settings
    useEffect(() => {
        if (!schoolId) return;

        const forumRef = db.ref(`school_forum/${schoolId}`);
        const settingsRef = db.ref(`school_forum_settings/${schoolId}`);
        const reportsRef = db.ref(`school_forum_reports/${schoolId}`);

        const handleForumData = (snapshot: any) => {
            const data = snapshot.val() || {};
            setIsLocked(data.isLocked || false);
            if (data.messages) {
                const msgs = Object.values(data.messages) as ForumMessage[];
                setMessages(msgs.sort((a, b) => a.timestamp - b.timestamp));
            } else {
                setMessages([]);
            }
            setIsLoading(false);
        };

        const handleSettingsData = (snapshot: any) => {
            const data = snapshot.val();
            if (data) {
                 if (data.bannedWords && Array.isArray(data.bannedWords)) setBannedWords(data.bannedWords);
                 if (data.bannedUsers && Array.isArray(data.bannedUsers)) setBannedUsers(data.bannedUsers);
            } else {
                if (isPrincipal) settingsRef.child('bannedWords').set(DEFAULT_BANNED_WORDS);
                setBannedWords(DEFAULT_BANNED_WORDS);
            }
        };
        
        const handleReportsData = (snapshot: any) => {
            if (isPrincipal) {
                const data = snapshot.val();
                setReports(data ? Object.values(data) : []);
            }
        };

        forumRef.on('value', handleForumData);
        settingsRef.on('value', handleSettingsData);
        if (isPrincipal) reportsRef.on('value', handleReportsData);
        
        return () => {
            forumRef.off('value', handleForumData);
            settingsRef.off('value', handleSettingsData);
            if (isPrincipal) reportsRef.off('value', handleReportsData);
        };
    }, [schoolId, isPrincipal]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    // Mark messages as read logic
    useEffect(() => {
        if (!schoolId || messages.length === 0) return;
        const unreadMessages = messages.filter(msg => !msg.readBy?.[currentUser.id]);
        if (unreadMessages.length > 0) {
            const updates: Record<string, any> = {};
            unreadMessages.forEach(msg => {
                updates[`messages/${msg.id}/readBy/${currentUser.id}`] = true;
            });
            db.ref(`school_forum/${schoolId}`).update(updates).catch(err => console.error("Error marking read:", err));
        }
    }, [messages, schoolId, currentUser.id]);

    // --- Mention Input Handler ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewMessage(value);

        const lastAtPos = value.lastIndexOf('@');
        if (lastAtPos !== -1) {
            const textAfterAt = value.substring(lastAtPos + 1);
            if (!textAfterAt.includes('  ')) { 
                setMentionQuery(textAfterAt);
                setShowMentionList(true);
                return;
            }
        }
        setShowMentionList(false);
    };

    const handleSelectUserForMention = (user: User) => {
        const lastAtPos = newMessage.lastIndexOf('@');
        if (lastAtPos !== -1) {
            const prefix = newMessage.substring(0, lastAtPos);
            const newText = prefix + `@${user.name} `;
            setNewMessage(newText);
            setShowMentionList(false);
        }
    };

    const filteredUsers = useMemo(() => {
        if (!mentionQuery) return [];
        return allUsers.filter(u => 
            u.name.toLowerCase().includes(mentionQuery.toLowerCase()) && 
            u.id !== currentUser.id // Don't mention self
        ).slice(0, 5); // Limit to 5 suggestions
    }, [allUsers, mentionQuery, currentUser.id]);

    // ---------------------------

    const uploadToImgur = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('type', 'file');
        if (file.type.startsWith('video/')) formData.append('disable_audio', '0');
        const clientId = "546c25a59c58ad7"; 
        try {
            const response = await fetch('https://api.imgur.com/3/upload', {
                method: 'POST', headers: { Authorization: `Client-ID ${clientId}` }, body: formData,
            });
            const data = await response.json();
            if (!data.success) throw new Error(typeof data.data.error === 'string' ? data.data.error : (data.data.error?.message || "Upload failed"));
            return data.data.link;
        } catch (error: any) {
            let displayMessage = error.message || "Upload failed";
            if (displayMessage.includes("We don't support that file type")) displayMessage = "File type not supported.";
            throw new Error(displayMessage);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const url = await uploadToImgur(file);
            setAttachment({ type: file.type.startsWith('image/') ? 'image' : 'video', url: url, name: file.name });
        } catch (err: any) { alert(`فشل رفع الملف: ${err.message}`); } 
        finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const handleSendMessage = async () => {
        if ((!newMessage.trim() && !attachment) || !schoolId) return;
        // Lock logic update: Only restrict students when locked.
        if (isLocked && currentUser.role === 'student') { alert("الدردشة مغلقة حالياً للطلاب من قبل الإدارة."); return; }
        if (hasProfanity(newMessage)) { alert("عذراً، تحتوي الرسالة على كلمات محظورة."); return; }
        if (isBanned) { alert("أنت محظور من الكتابة في المنتدى."); return; }

        setIsSending(true);
        const messageId = uuidv4();
        const messageText = newMessage.trim();
        
        // FIX: Construct object conditionally to avoid 'undefined' values which cause Firebase errors
        const message: any = {
            id: messageId, 
            senderId: currentUser.id, 
            senderName: currentUser.name, 
            senderRole: currentUser.role,
            text: messageText, 
            timestamp: Date.now(), 
            readBy: { [currentUser.id]: true },
            isPinned: false
        };

        if (attachment) {
            message.attachment = attachment;
        }

        if (replyingTo) {
            message.replyTo = { 
                id: replyingTo.id, 
                senderName: replyingTo.senderName, 
                text: replyingTo.text || (replyingTo.attachment ? 'مرفق' : (replyingTo.poll ? 'استطلاع رأي' : 'رسالة')) 
            };
        }

        try {
            await db.ref(`school_forum/${schoolId}/messages/${messageId}`).set(message);
            
            // --- Mention Notification Logic ---
            const mentionedUsers = allUsers.filter(u => messageText.includes(`@${u.name}`));
            if (mentionedUsers.length > 0) {
                const updates: Record<string, any> = {};
                mentionedUsers.forEach(u => {
                    const notification: Omit<StudentNotification, 'id'> = {
                        studentId: u.id, // Used for all users basically
                        message: `تمت الإشارة إليك في منتدى المدرسة بواسطة ${currentUser.name}: "${messageText.substring(0, 50)}..."`,
                        timestamp: new Date().toISOString(),
                        isRead: false
                    };
                    const notifKey = db.ref(`student_notifications/${schoolId}/${u.id}`).push().key;
                    if(notifKey) updates[`student_notifications/${schoolId}/${u.id}/${notifKey}`] = notification;
                });
                if (Object.keys(updates).length > 0) {
                    await db.ref().update(updates);
                }
            }
            // -----------------------------------

            setNewMessage(''); setAttachment(null); setReplyingTo(null); setShowMentionList(false);
        } catch (error) { console.error("Failed to send message:", error); alert("فشل إرسال الرسالة."); } 
        finally { setIsSending(false); }
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (!confirm("هل أنت متأكد من حذف هذه الرسالة؟")) return;
        try { await db.ref(`school_forum/${schoolId}/messages/${messageId}`).remove(); } catch (error) { console.error("Failed to delete message:", error); }
    };
    
    const togglePinMessage = async (msg: ForumMessage) => {
        if (!isPrincipal || !schoolId) return;
        try { await db.ref(`school_forum/${schoolId}/messages/${msg.id}`).update({ isPinned: !msg.isPinned }); } catch (error) { console.error("Failed to toggle pin:", error); }
    };
    
    const handleToggleReaction = async (messageId: string, emoji: string) => {
        if (!schoolId) return;
        const messageRef = db.ref(`school_forum/${schoolId}/messages/${messageId}`);
        try {
            const snapshot = await messageRef.child(`reactions/${emoji}`).get();
            let users = snapshot.val() || [];
            const usersArray = (Array.isArray(users) ? users : []) as string[];
            if (usersArray.includes(currentUser.id)) users = usersArray.filter((uid) => uid !== currentUser.id);
            else users = [...usersArray, currentUser.id];
            await messageRef.child(`reactions/${emoji}`).set(users);
            setActiveReactionMessageId(null);
        } catch (error) { console.error("Failed to toggle reaction:", error); }
    };

    const handleEditMessage = (msg: ForumMessage) => { setEditingMessageId(msg.id); setEditText(msg.text); };
    const submitEdit = async (messageId: string) => {
        if (!editText.trim() || hasProfanity(editText)) { alert(hasProfanity(editText) ? "تحتوي الرسالة على كلمات محظورة" : "الرسالة فارغة"); return; }
        try {
            await db.ref(`school_forum/${schoolId}/messages/${messageId}/text`).set(editText.trim());
            setEditingMessageId(null); setEditText('');
        } catch (error) { console.error("Failed to update message:", error); }
    };
    
    const toggleLock = async () => {
        if (!isPrincipal || !schoolId) return;
        try { await db.ref(`school_forum/${schoolId}/isLocked`).set(!isLocked); } catch (error) { console.error("Failed to toggle lock:", error); }
    };

    // --- Poll Logic ---
    const handleCreatePoll = async () => {
        if (!pollQuestion.trim() || pollOptions.some(opt => !opt.trim()) || hasProfanity(pollQuestion) || pollOptions.some(opt => hasProfanity(opt))) {
             alert("يرجى التحقق من البيانات (الحقول فارغة أو تحتوي على كلمات محظورة)."); return;
        }
        setIsSending(true);
        const messageId = uuidv4();
        const pollOptionsData: PollOption[] = pollOptions.map(text => ({ id: uuidv4(), text: text.trim(), voterIds: [] }));
        
        // Fix: Construct poll message carefully
        const message: any = {
            id: messageId, 
            senderId: currentUser.id, 
            senderName: currentUser.name, 
            senderRole: currentUser.role,
            text: '', // Empty text for poll messages
            timestamp: Date.now(), 
            readBy: { [currentUser.id]: true },
            poll: { question: pollQuestion.trim(), options: pollOptionsData, isActive: true }, 
            // Removed empty reactions object
        };

        try {
            await db.ref(`school_forum/${schoolId}/messages/${messageId}`).set(message);
            setIsPollModalOpen(false); setPollQuestion(''); setPollOptions(['', '']);
        } catch (error) { console.error("Failed to create poll:", error); } finally { setIsSending(false); }
    };

    const handleVote = async (messageId: string, optionId: string) => {
        if (!schoolId) return;
        const messageRef = db.ref(`school_forum/${schoolId}/messages/${messageId}`);
        messageRef.once('value', snapshot => {
            const msg = snapshot.val() as ForumMessage;
            if (!msg || !msg.poll || !msg.poll.isActive) return;
            const updatedOptions = msg.poll.options.map(opt => {
                const currentVoters = opt.voterIds || [];
                const newVoters = currentVoters.filter(id => id !== currentUser.id);
                if (opt.id === optionId) newVoters.push(currentUser.id);
                return { ...opt, voterIds: newVoters };
            });
            messageRef.child('poll/options').set(updatedOptions);
        });
    };

    const handleTogglePollStatus = (messageId: string) => { if (!schoolId) return; db.ref(`school_forum/${schoolId}/messages/${messageId}/poll/isActive`).transaction((current) => !current); };
    
    // --- Moderation Logic ---
    const handleAddBannedWord = async () => {
        if (!newBannedWord.trim() || bannedWords.includes(newBannedWord.trim())) return;
        try { await db.ref(`school_forum_settings/${schoolId}/bannedWords`).set([...bannedWords, newBannedWord.trim()]); setNewBannedWord(''); } catch (e) { console.error(e); }
    };
    const handleRemoveBannedWord = async (word: string) => {
        try { await db.ref(`school_forum_settings/${schoolId}/bannedWords`).set(bannedWords.filter(w => w !== word)); } catch (e) { console.error(e); }
    };

    // --- Reporting Logic ---
    const handleOpenReportModal = (msg: ForumMessage) => {
        setActiveReportMessage(msg);
        setReportReason('');
    };

    const handleSubmitReport = async () => {
        if (!activeReportMessage || !reportReason.trim() || !schoolId) return;
        const reportId = uuidv4();
        const report: ForumReport = {
            id: reportId,
            messageId: activeReportMessage.id,
            messageContent: activeReportMessage.text || 'محتوى وسائط/استطلاع',
            reportedUserId: activeReportMessage.senderId,
            reportedUserName: activeReportMessage.senderName,
            reporterId: currentUser.id,
            reporterName: currentUser.name,
            reason: reportReason.trim(),
            timestamp: Date.now()
        };

        try {
            await db.ref(`school_forum_reports/${schoolId}/${reportId}`).set(report);
            alert("تم إرسال البلاغ للإدارة.");
            setActiveReportMessage(null);
        } catch (error) {
            console.error("Failed to submit report:", error);
            alert("فشل إرسال البلاغ.");
        }
    };

    const handleBanUser = async (userId: string) => {
        if (!schoolId) return;
        if (confirm("هل أنت متأكد من حظر هذا المستخدم من الكتابة في المنتدى؟")) {
            const newBannedList = [...bannedUsers, userId];
            try {
                await db.ref(`school_forum_settings/${schoolId}/bannedUsers`).set(newBannedList);
                alert("تم حظر المستخدم.");
            } catch (e) { console.error(e); alert("فشل الحظر."); }
        }
    };

    const handleDismissReport = async (reportId: string) => {
         if (!schoolId) return;
         try {
            await db.ref(`school_forum_reports/${schoolId}/${reportId}`).remove();
         } catch (e) { console.error(e); }
    };
    
    const handleDeleteReportedMessage = async (report: ForumReport) => {
         if (!schoolId) return;
         if (confirm("هل أنت متأكد من حذف الرسالة وإغلاق البلاغ؟")) {
             try {
                 await db.ref(`school_forum/${schoolId}/messages/${report.messageId}`).remove();
                 await db.ref(`school_forum_reports/${schoolId}/${report.id}`).remove();
             } catch (e) { console.error(e); }
         }
    };

    const getMessageClass = (msg: ForumMessage, isMe: boolean) => {
        if (msg.isPinned) return 'bg-amber-50 border-2 border-amber-300 text-gray-900 rounded-2xl shadow-md';
        if (isMe) return 'bg-cyan-600 text-white rounded-2xl rounded-tr-none shadow-sm';
        switch (msg.senderRole) {
            case 'principal': return 'bg-yellow-50 border-2 border-yellow-400 text-gray-900 rounded-2xl rounded-tl-none shadow-md';
            case 'teacher': return 'bg-blue-50 border border-blue-300 text-gray-900 rounded-2xl rounded-tl-none shadow-sm';
            case 'counselor': return 'bg-purple-50 border border-purple-300 text-gray-900 rounded-2xl rounded-tl-none shadow-sm';
            default: return 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-none shadow-sm';
        }
    };
    
    const pinnedMessages = useMemo(() => messages.filter(m => m.isPinned), [messages]);

    if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8 text-cyan-600" /></div>;

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-gray-50 rounded-xl border shadow-lg overflow-hidden relative">
             {/* Readers List Modal */}
             {viewingReadersForMessageId && (
                <div className="fixed inset-0 z-[150] bg-black bg-opacity-60 flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-0 flex flex-col max-h-[60vh]">
                         <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Eye size={18} className="text-cyan-600"/> تمت المشاهدة بواسطة</h3>
                            <button onClick={() => setViewingReadersForMessageId(null)} className="text-gray-500 hover:text-gray-700"><X size={20}/></button>
                         </div>
                         <div className="flex-1 overflow-y-auto p-2">
                            {(() => {
                                const msg = messages.find(m => m.id === viewingReadersForMessageId);
                                if (!msg || !msg.readBy) return <p className="text-center text-gray-500 p-4">لم يشاهد أحد الرسالة بعد.</p>;
                                const readerIds = Object.keys(msg.readBy);
                                if (readerIds.length === 0) return <p className="text-center text-gray-500 p-4">لم يشاهد أحد الرسالة بعد.</p>;
                                
                                return (
                                    <div className="space-y-1">
                                        {readerIds.map(id => {
                                            const user = allUsers.find(u => u.id === id);
                                            return (
                                                <div key={id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md border-b last:border-0 border-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm">
                                                            {user ? user.name.charAt(0) : '?'}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-800">{user ? user.name : 'مستخدم غير معروف'}</span>
                                                    </div>
                                                    {user && <RoleBadge role={user.role} />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                         </div>
                    </div>
                </div>
             )}

             {/* Report Reason Modal */}
             {activeReportMessage && (
                 <div className="fixed inset-0 z-[130] bg-black bg-opacity-60 flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4 text-red-600 flex items-center gap-2"><Flag/> الإبلاغ عن رسالة</h3>
                        <p className="text-sm text-gray-600 mb-2">الرسالة: {activeReportMessage.text || 'محتوى وسائط'}</p>
                        <textarea 
                            value={reportReason} 
                            onChange={e => setReportReason(e.target.value)} 
                            placeholder="سبب الإبلاغ..." 
                            className="w-full p-2 border rounded-md mb-4" 
                            rows={3}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setActiveReportMessage(null)} className="px-4 py-2 bg-gray-200 rounded-md">إلغاء</button>
                            <button onClick={handleSubmitReport} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">إرسال البلاغ</button>
                        </div>
                    </div>
                 </div>
             )}
             
             {/* Reports Management Modal (Principal) */}
             {isReportsModalOpen && (
                 <div className="fixed inset-0 z-[120] bg-black bg-opacity-60 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 relative max-h-[90vh] flex flex-col">
                        <button onClick={() => setIsReportsModalOpen(false)} className="absolute top-4 left-4 p-1 hover:bg-gray-100 rounded-full"><X/></button>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Shield className="text-red-600"/> إدارة البلاغات ({reports.length})</h3>
                        <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-gray-50 border rounded-lg">
                            {reports.length === 0 ? <p className="text-center text-gray-500 p-4">لا توجد بلاغات جديدة.</p> : reports.map(report => (
                                <div key={report.id} className="bg-white p-4 rounded-lg border shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-bold text-gray-800">المبلغ: <span className="font-normal">{report.reporterName}</span></p>
                                            <p className="font-bold text-red-800">المبلغ عنه: <span className="font-normal">{report.reportedUserName}</span></p>
                                        </div>
                                        <span className="text-xs text-gray-500">{new Date(report.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <div className="bg-gray-100 p-2 rounded mb-2 text-sm">
                                        <p><strong>الرسالة:</strong> {report.messageContent}</p>
                                        <p className="mt-1 text-red-600"><strong>السبب:</strong> {report.reason}</p>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => handleDismissReport(report.id)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">تجاهل</button>
                                        <button onClick={() => handleDeleteReportedMessage(report)} className="px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200">حذف الرسالة</button>
                                        <button onClick={() => { handleBanUser(report.reportedUserId); handleDismissReport(report.id); }} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">حظر المستخدم</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
             )}

            {/* Poll Creation Modal */}
            {isPollModalOpen && (
                <div className="fixed inset-0 z-[110] bg-black bg-opacity-60 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
                        <button onClick={() => setIsPollModalOpen(false)} className="absolute top-4 left-4 text-gray-500 hover:bg-gray-100 rounded-full p-1"><X size={20} /></button>
                        <h3 className="text-xl font-bold mb-4 text-indigo-700 flex items-center gap-2"><BarChart2 /> إنشاء استطلاع رأي</h3>
                        <div className="space-y-4">
                            <input type="text" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="السؤال" className="w-full p-3 border rounded-lg" autoFocus />
                            <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                                {pollOptions.map((opt, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input type="text" value={opt} onChange={(e) => { const newOpts = [...pollOptions]; newOpts[idx] = e.target.value; setPollOptions(newOpts); }} placeholder={`خيار ${idx + 1}`} className="flex-1 p-2 border rounded-md"/>
                                        {pollOptions.length > 2 && <button onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))} className="text-red-500"><Trash2 size={18}/></button>}
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-sm text-indigo-600 hover:underline flex items-center gap-1"><Plus size={16}/> خيار آخر</button>
                            <button onClick={handleCreatePoll} disabled={isSending} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 flex justify-center items-center gap-2">{isSending ? <Loader2 className="animate-spin"/> : <Check />} نشر</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Moderation Settings Modal */}
            {isModerationModalOpen && (
                <div className="fixed inset-0 z-[120] bg-black bg-opacity-60 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative max-h-[90vh] flex flex-col">
                        <button onClick={() => setIsModerationModalOpen(false)} className="absolute top-4 left-4 text-gray-500 hover:bg-gray-100 rounded-full p-1"><X size={20} /></button>
                        <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2"><Shield className="text-red-600" /> إعدادات الإشراف</h3>
                        <div className="flex gap-2 mb-4">
                            <input type="text" value={newBannedWord} onChange={(e) => setNewBannedWord(e.target.value)} placeholder="أضف كلمة محظورة..." className="flex-1 p-2 border rounded-md"/>
                            <button onClick={handleAddBannedWord} className="px-4 py-2 bg-red-600 text-white rounded-md">إضافة</button>
                        </div>
                        <div className="flex-1 overflow-y-auto border rounded-lg p-2 bg-gray-50 flex flex-wrap gap-2">
                            {bannedWords.map((word, index) => (
                                <span key={index} className="bg-white border px-2 py-1 rounded-full text-sm flex items-center gap-1">{word}<button onClick={() => handleRemoveBannedWord(word)} className="text-red-500"><X size={12}/></button></span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox */}
            {zoomedImage && (<div className="fixed inset-0 z-[100] bg-black bg-opacity-90 flex justify-center items-center p-4" onClick={() => setZoomedImage(null)}><button className="absolute top-4 right-4 text-white"><X size={32} /></button><img src={zoomedImage} alt="Full view" className="max-w-full max-h-full object-contain rounded-md shadow-2xl" onClick={e => e.stopPropagation()} /></div>)}

            {/* Header */}
            <div className="bg-white p-4 border-b flex justify-between items-center shadow-sm z-10">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Users className="text-cyan-600" /> منتدى المدرسة</h2>
                    <p className={`text-xs font-semibold flex items-center gap-1 mt-1 ${isLocked ? 'text-red-500' : 'text-green-500'}`}>{isLocked ? <Lock size={12} /> : <Unlock size={12} />} {isLocked ? 'مغلقة للطلاب' : 'مفتوحة للجميع'}</p>
                </div>
                {isPrincipal && (
                    <div className="flex gap-2">
                         <button onClick={() => setIsReportsModalOpen(true)} className="px-3 py-2 rounded-lg text-sm font-bold bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-2 relative" title="البلاغات">
                            <Flag size={16} /> {reports.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{reports.length}</span>} <span className="hidden sm:inline">البلاغات</span>
                        </button>
                        <button onClick={() => setIsModerationModalOpen(true)} className="px-3 py-2 rounded-lg text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2" title="الإشراف"><Settings size={16} /> <span className="hidden sm:inline">الإشراف</span></button>
                        <button onClick={toggleLock} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${isLocked ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>{isLocked ? <Unlock size={16} /> : <Lock size={16} />} {isLocked ? 'فتح' : 'إغلاق'}</button>
                    </div>
                )}
            </div>

            {/* Pinned */}
            {pinnedMessages.length > 0 && (
                <div className="bg-amber-50 border-b-2 border-amber-200 shadow-sm p-3 z-0 max-h-40 overflow-y-auto">
                    <h3 className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1"><Pin size={12} className="fill-amber-800" /> رسائل مثبتة</h3>
                    <div className="space-y-2">
                        {pinnedMessages.map(msg => (
                            <div key={msg.id} className="bg-white p-2 rounded border border-amber-100 text-sm flex justify-between items-start gap-2">
                                <div className="flex-1"><span className="font-bold text-xs text-amber-900 block mb-1">{msg.senderName}:</span> {msg.poll ? <div className="text-indigo-800 font-semibold text-xs bg-indigo-50 p-1 rounded inline-block">📊 {msg.poll.question}</div> : <p className="text-gray-800 whitespace-pre-wrap leading-snug"><HighlightedText text={msg.text} /></p>}</div>
                                {isPrincipal && <button onClick={() => togglePinMessage(msg)} className="text-amber-400 hover:text-amber-600"><PinOff size={14} /></button>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
                {messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    const isEditing = editingMessageId === msg.id;
                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-start' : 'items-end'} group`}>
                            <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row' : 'flex-row-reverse'}`}><span className="text-xs font-bold text-gray-700">{msg.senderName}</span><RoleBadge role={msg.senderRole} /><span className="text-[10px] text-gray-400">{new Date(msg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>{msg.isPinned && <Pin size={12} className="text-amber-500 fill-amber-500 transform rotate-45" />}</div>
                            <div className={`relative max-w-[90%] sm:max-w-[75%] min-w-[150px]`}>
                                {!isEditing && (
                                    <div className={`absolute -top-8 ${isMe ? 'left-0' : 'right-0'} flex gap-1 bg-white/90 p-1 rounded-lg shadow-sm border z-20 opacity-0 group-hover:opacity-100 transition-opacity`}>
                                        <button onClick={() => setActiveReactionMessageId(activeReactionMessageId === msg.id ? null : msg.id)} className="p-1.5 text-gray-500 hover:text-yellow-500"><Smile size={14}/></button>
                                        <button onClick={() => setReplyingTo(msg)} className="p-1.5 text-gray-500 hover:text-blue-500"><Reply size={14}/></button>
                                        {!isMe && <button onClick={() => handleOpenReportModal(msg)} className="p-1.5 text-gray-500 hover:text-red-600" title="إبلاغ"><Flag size={14}/></button>}
                                        {isPrincipal && <button onClick={() => togglePinMessage(msg)} className="p-1.5 text-gray-500 hover:text-amber-500">{msg.isPinned ? <PinOff size={14}/> : <Pin size={14}/>}</button>}
                                        {(isMe && !msg.poll) && <button onClick={() => handleEditMessage(msg)} className="p-1.5 text-blue-500"><Edit2 size={14}/></button>}
                                        {(isMe || isPrincipal) && <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 text-red-500"><Trash2 size={14}/></button>}
                                        {activeReactionMessageId === msg.id && <div className={`absolute top-full mt-1 ${isMe ? 'left-0' : 'right-0'} bg-white border shadow-xl rounded-full p-1 flex gap-1 z-50`}>{REACTIONS.map(emoji => <button key={emoji} onClick={() => handleToggleReaction(msg.id, emoji)} className="text-lg hover:scale-125 p-1">{emoji}</button>)}</div>}
                                    </div>
                                )}
                                {isEditing ? (
                                    <div className="flex flex-col gap-2 bg-white p-2 rounded-xl border shadow-md min-w-[250px]"><textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full p-2 border rounded-md text-sm" rows={3}/><div className="flex justify-end gap-2"><button onClick={() => setEditingMessageId(null)} className="p-1 text-red-500"><X size={16}/></button><button onClick={() => submitEdit(msg.id)} className="p-1 text-green-600"><Check size={16}/></button></div></div>
                                ) : (
                                    msg.poll ? <PollView message={msg} currentUser={currentUser} isPrincipal={isPrincipal} onVote={handleVote} onToggleStatus={handleTogglePollStatus} onDelete={handleDeleteMessage}/> : (
                                        <div className={`px-4 py-3 text-sm shadow-sm break-words relative ${getMessageClass(msg, isMe)}`}>
                                            {msg.replyTo && <div className={`mb-2 text-xs p-2 rounded border-r-4 ${isMe ? 'bg-cyan-700/50 border-cyan-300 text-cyan-50' : 'bg-gray-100/50 border-gray-400/50 text-gray-600'}`}><span className="font-bold block mb-0.5">{msg.replyTo.senderName}</span><p className="truncate opacity-80">{msg.replyTo.text}</p></div>}
                                            {msg.attachment && <div className="mb-2 mt-1">{msg.attachment.type === 'image' ? <img src={msg.attachment.url} alt="مرفق" className="rounded-lg max-h-72 w-full object-cover cursor-pointer border" onClick={() => setZoomedImage(msg.attachment!.url)}/> : <div className="w-full rounded-lg overflow-hidden bg-black/10"><video src={msg.attachment.url} controls className="w-full max-h-72 object-contain"/></div>}</div>}
                                            <span className="leading-relaxed whitespace-pre-wrap"><HighlightedText text={msg.text} /></span>
                                            {msg.reactions && Object.keys(msg.reactions).length > 0 && <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/20 justify-end">{Object.entries(msg.reactions).map(([emoji, users]) => <button key={emoji} onClick={() => handleToggleReaction(msg.id, emoji)} className={`text-xs px-1.5 py-0.5 rounded-full border flex items-center gap-1 transition-all ${(users as string[]).includes(currentUser.id) ? 'bg-blue-100 border-blue-300 text-blue-800 scale-105' : 'bg-white/80'}`}><span>{emoji}</span><span className="font-bold">{(users as string[]).length}</span></button>)}</div>}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setViewingReadersForMessageId(msg.id); }}
                                                className={`absolute bottom-1 ${isMe ? 'left-3 text-cyan-100 hover:text-white' : 'right-3 text-gray-400 hover:text-gray-600'} text-[10px] flex items-center gap-1 hover:underline cursor-pointer`}
                                                title="مشاهدة من قرأ الرسالة"
                                            >
                                                <Eye size={10}/><span>{msg.readBy ? Object.keys(msg.readBy).length : 0}</span>
                                            </button>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Mention List Popup */}
            {showMentionList && filteredUsers.length > 0 && (
                <div className="absolute bottom-20 left-4 z-30 bg-white border rounded-xl shadow-2xl max-h-48 overflow-y-auto w-64 animate-in slide-in-from-bottom-2">
                    <h4 className="p-2 bg-gray-100 text-xs font-bold text-gray-600 border-b">إشارة إلى...</h4>
                    {filteredUsers.map(user => (
                        <button
                            key={user.id}
                            onClick={() => handleSelectUserForMention(user)}
                            className="w-full text-right px-4 py-2 hover:bg-cyan-50 text-sm font-semibold text-gray-700 border-b last:border-0 flex items-center gap-2"
                        >
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                                {user.name.charAt(0)}
                            </div>
                            {user.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Input Area */}
            {isBanned ? (
                 <div className="p-4 bg-red-100 text-red-800 text-center font-bold border-t border-red-200 flex items-center justify-center gap-2">
                    <Ban /> لقد تم حظرك من المشاركة في المنتدى بسبب مخالفة القوانين.
                 </div>
            ) : (
                <div className="bg-white p-3 border-t z-10 relative">
                    {replyingTo && <div className="flex justify-between items-center bg-gray-50 p-2 text-xs border-r-4 border-cyan-500 mb-2 rounded animate-in slide-in-from-bottom-2"><div><span className="font-bold text-cyan-700 block mb-1">الرد على {replyingTo.senderName}</span><p className="text-gray-500 line-clamp-1">{replyingTo.text || '...'}</p></div><button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-200 rounded-full text-gray-500"><X size={14}/></button></div>}
                    {(isLocked && currentUser.role === 'student') ? <div className="text-center text-red-500 font-bold p-2 bg-red-50 rounded-lg border border-red-100 flex items-center justify-center gap-2"><Lock size={16}/> تم إغلاق الدردشة للطلاب من قبل الإدارة.</div> : (
                        <div className="space-y-2">
                            {attachment && <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg border relative animate-in fade-in"><button onClick={() => setAttachment(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={14}/></button>{attachment.type === 'image' ? <img src={attachment.url} alt="Preview" className="h-16 w-16 object-cover rounded-md"/> : <div className="h-16 w-16 bg-black flex items-center justify-center rounded-md text-white"><Video size={24}/></div>}<span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">جاهز للإرسال</span></div>}
                            <div className="flex items-center gap-2">
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileSelect}/>
                                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading || isSending} className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 disabled:opacity-50" title="إرفاق"><Paperclip size={20}/></button>
                                {isStaff && <button onClick={() => setIsPollModalOpen(true)} disabled={isUploading || isSending} className="p-3 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 disabled:opacity-50" title="استطلاع"><BarChart2 size={20}/></button>}
                                
                                <div className="flex-1 relative">
                                    <input 
                                        type="text" 
                                        value={newMessage} 
                                        onChange={handleInputChange} 
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()} 
                                        placeholder={showMentionList ? "ابحث عن الاسم..." : "اكتب رسالتك هنا... (@ للإشارة)"}
                                        className="w-full p-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-gray-50 pr-4" 
                                        disabled={isSending || isUploading}
                                        autoComplete="off"
                                    />
                                    {showMentionList && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><AtSign size={16}/></div>}
                                </div>

                                <button onClick={handleSendMessage} disabled={(!newMessage.trim() && !attachment) || isSending || isUploading} className="p-3 bg-cyan-600 text-white rounded-full hover:bg-cyan-700 disabled:bg-gray-300 shadow-md">{isSending ? <Loader2 className="animate-spin" size={20}/> : <Send size={20} className="ml-0.5"/>}</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}