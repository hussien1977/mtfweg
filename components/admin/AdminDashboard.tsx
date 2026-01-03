import React, { useState, useEffect, useMemo } from 'react';
import type { User, SchoolLevel, ClassData, Student } from '../../types.ts';
import { Plus, UserCog, LogOut, Copy, Check, Edit, Trash2, Save, X, RefreshCw, SendHorizonal, Users, ChevronDown, ChevronUp, Power, PowerOff } from 'lucide-react';
import { SCHOOL_LEVELS } from '../../constants.ts';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/firebase.ts';

interface AdminDashboardProps {
    currentUser: User;
    users: User[];
    addUser: (user: Omit<User, 'id'>) => User;
    updateUser: (userId: string, updater: (user: User) => User) => void;
    deleteUser: (userId: string) => void;
    onLogout: () => void;
}

const generateCode = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export default function AdminDashboard({ currentUser, users, addUser, updateUser, deleteUser, onLogout }: AdminDashboardProps) {
    const [newPrincipalName, setNewPrincipalName] = useState('');
    const [newSchoolName, setNewSchoolName] = useState('');
    const [newSchoolLevel, setNewSchoolLevel] = useState<SchoolLevel>('متوسطة');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // State for editing modal
    const [editingPrincipal, setEditingPrincipal] = useState<User | null>(null);
    const [editedName, setEditedName] = useState('');
    const [editedSchoolName, setEditedSchoolName] = useState('');
    const [editedSchoolLevel, setEditedSchoolLevel] = useState<SchoolLevel>('متوسطة');
    const [editedCode, setEditedCode] = useState('');
    const [editedEmail, setEditedEmail] = useState('');

    const principals = users.filter(u => u.role === 'principal');
    
    const handleAddPrincipal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPrincipalName.trim() || !newSchoolName.trim()) {
            alert('يرجى إدخال اسم المدير واسم المدرسة.');
            return;
        }

        const newCode = generateCode(8);
        addUser({
            name: newPrincipalName.trim(),
            schoolName: newSchoolName.trim(),
            schoolLevel: newSchoolLevel,
            role: 'principal',
            code: newCode,
        });

        setNewPrincipalName('');
        setNewSchoolName('');
        setNewSchoolLevel('متوسطة');
    };

    const handleOpenEditModal = (principal: User) => {
        setEditingPrincipal(principal);
        setEditedName(principal.name);
        setEditedSchoolName(principal.schoolName || '');
        setEditedSchoolLevel(principal.schoolLevel || 'متوسطة');
        setEditedCode(principal.code);
        setEditedEmail(principal.email || '');
    };

    const handleSaveEdit = () => {
        if (!editingPrincipal || !editedName.trim() || !editedSchoolName.trim() || !editedCode.trim()) {
            alert('يرجى ملء جميع الحقول بشكل صحيح.');
            return;
        }
        updateUser(editingPrincipal.id, (user) => ({
            ...user,
            name: editedName.trim(),
            schoolName: editedSchoolName.trim(),
            schoolLevel: editedSchoolLevel,
            code: editedCode.trim(),
            email: editedEmail.trim(),
        }));
        setEditingPrincipal(null);
    };


    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code).then(() => {
            setCopiedCode(code);
            setTimeout(() => setCopiedCode(null), 2000);
        });
    };
    
    const handleTogglePrincipalAccess = async (principal: User) => {
        const isDisabling = !principal.disabled;
        const actionText = isDisabling ? "تعطيل" : "تمكين";
        const confirmationMessage = `هل أنت متأكد من ${actionText} حساب المدير ${principal.name}؟\nسيتم ${actionText} دخول جميع المدرسين المرتبطين بهذه المدرسة.`;

        if (!window.confirm(confirmationMessage)) {
            return;
        }

        const updates: Record<string, any> = {};
        
        // 1. Update principal
        updates[`/users/${principal.id}/disabled`] = isDisabling;

        // 2. Update associated teachers
        const associatedStaff = users.filter(u => u.principalId === principal.id);
        associatedStaff.forEach(staff => {
            updates[`/users/${staff.id}/disabled`] = isDisabling;
        });

        try {
            await db.ref().update(updates);
            alert(`تم ${actionText} الحساب بنجاح وجميع الحسابات المرتبطة به.`);
        } catch (error) {
            console.error("Failed to update user statuses:", error);
            alert("حدث خطأ أثناء تحديث حالة الحسابات.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-gray-800 text-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <UserCog size={28} />
                        <div>
                            <h1 className="text-2xl font-bold">لوحة تحكم المسؤول</h1>
                            <p className="text-sm">{currentUser.name}</p>
                        </div>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                            title="تحديث التطبيق للحصول على آخر التغييرات"
                        >
                            <RefreshCw size={20} />
                        </button>
                    </div>
                    <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition">
                        <LogOut size={20} />
                        <span>تسجيل الخروج</span>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Add Principal Card */}
                    <div className="md:col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-lg h-full">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">إضافة مدير مدرسة</h2>
                            <form onSubmit={handleAddPrincipal} className="space-y-4">
                                <fieldset className="border p-4 rounded-lg">
                                    <legend className="px-2 font-semibold text-gray-700">بيانات المدير</legend>
                                    <div>
                                        <label htmlFor="principalName" className="block text-md font-medium text-gray-700 mb-2">اسم المدير</label>
                                        <input
                                            id="principalName"
                                            type="text"
                                            value={newPrincipalName}
                                            onChange={(e) => setNewPrincipalName(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
                                            placeholder="الاسم الكامل للمدير"
                                            required
                                        />
                                    </div>
                                </fieldset>

                                <fieldset className="border p-4 rounded-lg">
                                    <legend className="px-2 font-semibold text-gray-700">بيانات المدرسة</legend>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="schoolName" className="block text-md font-medium text-gray-700 mb-2">اسم المدرسة</label>
                                            <input
                                                id="schoolName"
                                                type="text"
                                                value={newSchoolName}
                                                onChange={(e) => setNewSchoolName(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
                                                placeholder="اسم المدرسة الرسمي"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="schoolLevel" className="block text-md font-medium text-gray-700 mb-2">درجة المدرسة</label>
                                            <select
                                                id="schoolLevel"
                                                value={newSchoolLevel}
                                                onChange={(e) => setNewSchoolLevel(e.target.value as SchoolLevel)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 bg-white"
                                                required
                                            >
                                                {SCHOOL_LEVELS.map(level => (
                                                    <option key={level} value={level}>{level}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </fieldset>

                                <button type="submit" className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition">
                                    <Plus size={20} />
                                    <span>إضافة</span>
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Principals List */}
                    <div className="md:col-span-2">
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">قائمة مدراء المدارس ({principals.length})</h2>
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                                {principals.length > 0 ? (
                                    principals.map(p => (
                                        <div key={p.id} className="bg-gray-50 p-4 rounded-lg border">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                <div>
                                                    <p className="font-semibold text-lg text-gray-700">{p.name}</p>
                                                    <p className="text-sm text-gray-500">{p.schoolName} <span className="font-semibold">({p.schoolLevel || 'غير محدد'})</span></p>
                                                    <div className="mt-2 text-sm bg-gray-100 p-2 rounded-md border">
                                                        <p><strong>البريد الإلكتروني:</strong> {p.email || 'لم يضف بعد'}</p>
                                                        <div className="flex items-center gap-2">
                                                            <strong>رمز الدخول:</strong>
                                                            <code className="bg-gray-200 text-gray-800 font-mono font-bold px-2 py-0.5 rounded-md text-md">{p.code}</code>
                                                            <button onClick={() => copyToClipboard(p.code)} className="p-1 text-gray-500 hover:text-cyan-600 hover:bg-cyan-100 rounded-full transition">
                                                                {copiedCode === p.code ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button 
                                                        onClick={() => handleTogglePrincipalAccess(p)}
                                                        className={`p-2 text-white rounded-md transition ${p.disabled ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`} 
                                                        title={p.disabled ? 'تمكين الدخول' : 'تعطيل الدخول'}
                                                    >
                                                        {p.disabled ? <Power size={18}/> : <PowerOff size={18}/>}
                                                    </button>
                                                    <button onClick={() => handleOpenEditModal(p)} className="p-2 text-white bg-yellow-500 rounded-md hover:bg-yellow-600 transition" title="تعديل"><Edit size={18}/></button>
                                                    <button onClick={() => deleteUser(p.id)} className="p-2 text-white bg-red-500 rounded-md hover:bg-red-600 transition" title="حذف"><Trash2 size={18}/></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-gray-500 py-8">لم يتم إضافة أي مدير بعد.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {editingPrincipal && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                        <h3 className="text-xl font-bold mb-4">تعديل بيانات المدير</h3>
                        <div className="space-y-4">
                            <fieldset className="border p-4 rounded-lg">
                                <legend className="px-2 font-semibold text-gray-700">بيانات المدير</legend>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium">اسم المدير</label>
                                        <input value={editedName} onChange={e => setEditedName(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium">البريد الإلكتروني</label>
                                        <input type="email" value={editedEmail} onChange={e => setEditedEmail(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">رمز الدخول</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <input value={editedCode} onChange={e => setEditedCode(e.target.value)} className="w-full px-3 py-2 border rounded-md font-mono" />
                                            <button 
                                                onClick={() => setEditedCode(generateCode(8))} 
                                                className="p-2 text-white bg-cyan-500 rounded-md hover:bg-cyan-600 transition" 
                                                title="إعادة توليد رمز جديد"
                                            >
                                                <RefreshCw size={18}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </fieldset>
                             <fieldset className="border p-4 rounded-lg">
                                <legend className="px-2 font-semibold text-gray-700">بيانات المدرسة والصلاحيات</legend>
                                <div className="space-y-4">
                                     <div>
                                        <label className="block text-sm font-medium">اسم المدرسة</label>
                                        <input value={editedSchoolName} onChange={e => setEditedSchoolName(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">درجة المدرسة</label>
                                        <select
                                            value={editedSchoolLevel}
                                            onChange={(e) => setEditedSchoolLevel(e.target.value as SchoolLevel)}
                                            className="w-full mt-1 px-3 py-2 border rounded-md bg-white"
                                        >
                                            {SCHOOL_LEVELS.map(level => (
                                                <option key={level} value={level}>{level}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </fieldset>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setEditingPrincipal(null)} className="px-4 py-2 bg-gray-200 rounded-md flex items-center gap-2"><X size={18} /> إلغاء</button>
                            <button onClick={handleSaveEdit} className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center gap-2"><Save size={18} /> حفظ التعديلات</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}