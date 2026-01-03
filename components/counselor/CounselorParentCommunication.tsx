import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { User, SchoolSettings, ParentContact } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { Send, Plus, Upload, UserPlus, MessageSquare, Trash2, Loader2, X, Users } from 'lucide-react';
import { GRADE_LEVELS } from '../../constants.ts';
import { v4 as uuidv4 } from 'uuid';

declare const XLSX: any;

interface ParentCommunicationProps {
    principal: User;
    settings: SchoolSettings;
}

const getRelevantGradeLevels = (schoolLevel?: SchoolSettings['schoolLevel']): string[] => {
    if (!schoolLevel) return GRADE_LEVELS;
    if (schoolLevel === 'ابتدائية') return GRADE_LEVELS.filter(g => g.includes('ابتدائي'));
    if (schoolLevel === 'متوسطة') return GRADE_LEVELS.filter(g => g.includes('متوسط'));
    if (schoolLevel.includes('اعدادي') || schoolLevel.includes('اعدادية')) return GRADE_LEVELS.filter(g => g.includes('الرابع') || g.includes('الخامس') || g.includes('السادس'));
    if (schoolLevel.includes('ثانوية')) return GRADE_LEVELS.filter(g => g.includes('متوسط') || g.includes('الرابع') || g.includes('الخامس') || g.includes('السادس'));
    return GRADE_LEVELS;
};

export default function ParentCommunication({ principal, settings }: ParentCommunicationProps) {
    const [contacts, setContacts] = useState<ParentContact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [filterStage, setFilterStage] = useState('');
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [modalTargets, setModalTargets] = useState<ParentContact[]>([]);
    const [modalMessage, setModalMessage] = useState('');
    const [modalView, setModalView] = useState<'compose' | 'send-list'>('compose');

    const relevantGrades = useMemo(() => getRelevantGradeLevels(settings.schoolLevel), [settings.schoolLevel]);

    useEffect(() => {
        const contactsRef = db.ref(`parent_contacts/${principal.id}`);
        const callback = (snapshot: any) => {
            const data = snapshot.val() || {};
            const contactList: ParentContact[] = Object.entries(data).map(([id, value]) => ({ id, ...(value as Omit<ParentContact, 'id'>) }));
            setContacts(contactList.sort((a, b) => a.studentName.localeCompare(b.studentName, 'ar')));
            setIsLoading(false);
        };
        contactsRef.on('value', callback);
        return () => contactsRef.off('value', callback);
    }, [principal.id]);

    const filteredContacts = useMemo(() => {
        let filtered = filterStage ? contacts.filter(c => c.stage === filterStage) : contacts;
        return filtered;
    }, [contacts, filterStage]);

    const handleToggleSelect = (contactId: string) => {
        setSelectedContactIds(prev => prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]);
    };
    
    const handleSelectAllFiltered = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedContactIds(filteredContacts.map(c => c.id));
        } else {
            setSelectedContactIds([]);
        }
    };
    
    const handleDeleteContact = async (contactId: string) => {
        if (window.confirm('هل أنت متأكد من حذف جهة الاتصال هذه؟')) {
            await db.ref(`parent_contacts/${principal.id}/${contactId}`).remove();
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedContactIds.length === 0) return;
        if (window.confirm(`هل أنت متأكد من حذف ${selectedContactIds.length} جهة اتصال محددة؟`)) {
            const updates: Record<string, null> = {};
            selectedContactIds.forEach(id => {
                updates[id] = null;
            });
            await db.ref(`parent_contacts/${principal.id}`).update(updates);
            setSelectedContactIds([]);
        }
    };

    const normalizePhoneNumberForWhatsApp = (phone: string): string => {
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
        if (!cleaned.startsWith('964')) return '964' + cleaned;
        return cleaned;
    };

    const openMessageModal = (targets: ParentContact[]) => {
        if (targets.length === 0) {
            alert('يرجى تحديد جهة اتصال واحدة على الأقل.');
            return;
        }
        setModalTargets(targets);
        setModalMessage('عزيزي ولي الأمر، تحية طيبة وبعد،');
        setModalView('compose');
        setIsMessageModalOpen(true);
    };

    const handleSendSingleMessage = (contact: ParentContact) => {
        if (!modalMessage.trim()) { alert('الرسالة فارغة.'); return; }
        const encodedMessage = encodeURIComponent(modalMessage);
        const phone = normalizePhoneNumberForWhatsApp(contact.parentPhone);
        window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
    };

    // AddContactModal Component
    const AddContactModal = () => {
        const [addMode, setAddMode] = useState<'manual' | 'excel'>('manual');
        const [newContact, setNewContact] = useState({ studentName: '', parentPhone: '964', stage: '' });
        const [isSubmitting, setIsSubmitting] = useState(false);
        const fileInputRef = useRef<HTMLInputElement>(null);

        const handleAdd = async () => {
            if (!newContact.studentName.trim() || !newContact.parentPhone.trim() || !newContact.stage) {
                alert('يرجى ملء جميع الحقول.');
                return;
            }
            setIsSubmitting(true);
            const newId = uuidv4();
            const contactToAdd = { principalId: principal.id, studentName: newContact.studentName.trim(), parentPhone: newContact.parentPhone.trim(), stage: newContact.stage };
            await db.ref(`parent_contacts/${principal.id}/${newId}`).set(contactToAdd);
            setNewContact({ studentName: '', parentPhone: '964', stage: newContact.stage });
            setIsSubmitting(false);
            alert('تمت إضافة جهة الاتصال بنجاح.');
        };

        const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file || !newContact.stage) {
                if(!newContact.stage) alert('يرجى اختيار المرحلة الدراسية أولاً.');
                return;
            };

            setIsSubmitting(true);
            const reader = new FileReader();
            reader.onload = async (event) => {
                let success = false;
                try {
                    const data = new Uint8Array(event.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    const newContactsFromExcel: any[] = json.slice(1).map(row => ({
                        studentName: String(row[0] || '').trim(),
                        parentPhone: String(row[1] || '').trim(),
                    })).filter(c => c.studentName && c.parentPhone);

                    if (newContactsFromExcel.length > 0) {
                        const updates: Record<string, any> = {};
                        newContactsFromExcel.forEach(contact => {
                            const newId = uuidv4();
                            updates[newId] = { principalId: principal.id, ...contact, stage: newContact.stage };
                        });
                        await db.ref(`parent_contacts/${principal.id}`).update(updates);
                        alert(`تمت إضافة ${newContactsFromExcel.length} جهة اتصال بنجاح.`);
                        success = true;
                    } else {
                        alert('لم يتم العثور على بيانات صالحة في الملف.');
                    }
                } catch (err) { alert('حدث خطأ أثناء معالجة الملف.'); } 
                finally { 
                    setIsSubmitting(false);
                    if (success) {
                        setIsAddModalOpen(false);
                    }
                }
            };
            reader.readAsArrayBuffer(file);
        };
        
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                    <header className="p-4 border-b flex justify-between items-center"><h3 className="text-xl font-bold">إضافة جهات اتصال جديدة</h3><button onClick={() => setIsAddModalOpen(false)}><X/></button></header>
                    <div className="p-4">
                        <div className="flex border-b mb-4"><button onClick={() => setAddMode('manual')} className={`px-4 py-2 font-semibold ${addMode === 'manual' ? 'border-b-2 border-cyan-500' : ''}`}>إضافة يدوية</button><button onClick={() => setAddMode('excel')} className={`px-4 py-2 font-semibold ${addMode === 'excel' ? 'border-b-2 border-cyan-500' : ''}`}>رفع من Excel</button></div>
                        <div className="space-y-4">
                            <select value={newContact.stage} onChange={e => setNewContact(p => ({ ...p, stage: e.target.value }))} className="w-full p-2 border rounded-md" required>
                                <option value="">-- اختر المرحلة الدراسية --</option>
                                {relevantGrades.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                            </select>
                            {addMode === 'manual' && (
                                <>
                                    <input type="text" placeholder="اسم الطالب" value={newContact.studentName} onChange={e => setNewContact(p => ({ ...p, studentName: e.target.value }))} className="w-full p-2 border rounded-md"/>
                                    <input type="text" placeholder="رقم هاتف ولي الأمر" value={newContact.parentPhone} onChange={e => setNewContact(p => ({ ...p, parentPhone: e.target.value }))} className="w-full p-2 border rounded-md" dir="ltr"/>
                                    <button onClick={handleAdd} disabled={isSubmitting} className="w-full p-2 bg-blue-600 text-white rounded-md flex items-center justify-center gap-2">{isSubmitting ? <Loader2 className="animate-spin"/> : <UserPlus/>} إضافة</button>
                                </>
                            )}
                            {addMode === 'excel' && (
                                <div className="p-4 border-dashed border-2 rounded-lg text-center">
                                    <p className="text-sm mb-2">الملف يجب أن يحتوي على عمودين بالترتيب: 1. اسم الطالب، 2. رقم ولي الأمر.</p>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden"/>
                                    <button onClick={() => fileInputRef.current?.click()} disabled={isSubmitting || !newContact.stage} className="p-2 bg-green-600 text-white rounded-md flex items-center justify-center gap-2 disabled:bg-gray-400">{isSubmitting ? <Loader2 className="animate-spin"/> : <Upload/>} اختر ملف و ارفع</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            {isAddModalOpen && <AddContactModal />}
            {isMessageModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        <header className="p-4 border-b flex justify-between items-center"><h3 className="text-lg font-bold">إرسال رسالة</h3><button onClick={() => setIsMessageModalOpen(false)}><X/></button></header>
                        <div className="p-4">
                            {modalView === 'compose' ? (<textarea value={modalMessage} onChange={e => setModalMessage(e.target.value)} rows={8} className="w-full p-2 border rounded-md" placeholder="اكتب رسالتك هنا..."/>) : (
                                <>
                                    <p className="p-3 bg-gray-100 rounded-md mb-4 whitespace-pre-wrap max-h-40 overflow-y-auto">{modalMessage}</p>
                                    <h4 className="font-bold mb-2">قائمة المستلمين ({modalTargets.length}):</h4>
                                    <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
                                        {modalTargets.map(contact => (
                                            <div key={contact.id} className="flex justify-between items-center p-2 bg-gray-50 rounded"><span>{contact.studentName}</span><button onClick={() => handleSendSingleMessage(contact)} className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">إرسال</button></div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <footer className="p-4 border-t flex justify-end gap-2">
                            {modalView === 'compose' ? (
                                <>
                                    <button onClick={() => setIsMessageModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md">إلغاء</button>
                                    <button onClick={() => setModalView('send-list')} className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700">متابعة للإرسال</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setModalView('compose')} className="px-4 py-2 bg-gray-200 rounded-md">تعديل الرسالة</button>
                                    <button onClick={() => setIsMessageModalOpen(false)} className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700">إغلاق</button>
                                </>
                            )}
                        </footer>
                    </div>
                </div>
            )}
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">مخاطبة أولياء الأمور</h2>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md"><Plus/> إضافة جهات اتصال</button>
                <button onClick={() => openMessageModal(contacts.filter(c => selectedContactIds.includes(c.id)))} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md disabled:bg-gray-400" disabled={selectedContactIds.length === 0}><Send/> إرسال إلى ({selectedContactIds.length})</button>
                <button onClick={handleDeleteSelected} className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md disabled:bg-gray-400" disabled={selectedContactIds.length === 0}><Trash2/> حذف المحدد ({selectedContactIds.length})</button>
                <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="sm:ml-auto p-2 border rounded-md"><option value="">-- كل المراحل --</option>{relevantGrades.map(stage => <option key={stage} value={stage}>{stage}</option>)}</select>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full">
                    <thead className="sticky top-0 bg-gray-100"><tr>
                        <th className="p-2 w-10"><input type="checkbox" onChange={handleSelectAllFiltered} checked={filteredContacts.length > 0 && selectedContactIds.length === filteredContacts.length}/></th>
                        <th className="p-2 text-right">اسم الطالب</th><th className="p-2 text-right">رقم هاتف ولي الأمر</th><th className="p-2 text-center">إجراءات</th>
                    </tr></thead>
                    <tbody>
                        {isLoading ? (<tr><td colSpan={4} className="text-center p-8"><Loader2 className="animate-spin h-8 w-8 mx-auto"/></td></tr>) : filteredContacts.map(contact => (
                            <tr key={contact.id} className="hover:bg-gray-50 border-b">
                                <td className="p-2 text-center"><input type="checkbox" checked={selectedContactIds.includes(contact.id)} onChange={() => handleToggleSelect(contact.id)} className="h-5 w-5"/></td>
                                <td className="p-2"><span className="font-semibold">{contact.studentName}</span> <span className="text-sm text-gray-500">({contact.stage})</span></td>
                                <td className="p-2 text-right font-mono" dir="ltr">{contact.parentPhone}</td>
                                <td className="p-2 text-center flex justify-center gap-2">
                                    <button onClick={() => openMessageModal([contact])} className="p-2 text-green-600 hover:bg-green-100 rounded-full" title="مراسلة"><MessageSquare size={18}/></button>
                                    <button onClick={() => handleDeleteContact(contact.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full" title="حذف"><Trash2 size={18}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredContacts.length === 0 && !isLoading && <p className="text-center p-8 text-gray-500">لا توجد جهات اتصال لعرضها.</p>}
            </div>
        </div>
    );
}