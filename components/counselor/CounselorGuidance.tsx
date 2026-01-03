import React, { useState, useEffect } from 'react';
import type { User, CounselorGuidance } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Save, Edit, Trash2, Loader2, X } from 'lucide-react';
import GuidanceDisplay from '../shared/GuidanceDisplay.tsx';

interface CounselorGuidanceProps {
    currentUser: User;
}

export default function CounselorGuidance({ currentUser }: CounselorGuidanceProps) {
    const [guidances, setGuidances] = useState<CounselorGuidance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingGuidance, setEditingGuidance] = useState<CounselorGuidance | null>(null);
    const [formData, setFormData] = useState({ title: '', content: '' });

    const principalId = currentUser.principalId;

    useEffect(() => {
        if (!principalId) {
            setIsLoading(false);
            return;
        }
        // جلب البيانات بدون فلترة من الخادم لتجنب تحذير الفهرسة
        const guidanceRef = db.ref(`counselor_guidance/${principalId}`);
        const callback = (snapshot: any) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.values(data) as CounselorGuidance[];
                // فرز برمجياً في المتصفح
                const sorted = list.sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                setGuidances(sorted);
            } else {
                setGuidances([]);
            }
            setIsLoading(false);
        };
        guidanceRef.on('value', callback);
        return () => guidanceRef.off('value', callback);
    }, [principalId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const resetForm = () => {
        setFormData({ title: '', content: '' });
        setEditingGuidance(null);
    };

    const handleSave = async () => {
        if (!formData.title.trim() || !formData.content.trim() || !principalId) {
            alert('يرجى ملء العنوان والمحتوى.');
            return;
        }
        setIsSubmitting(true);
        const now = new Date().toISOString();

        if (editingGuidance) {
            // Update
            const updatedGuidance = {
                ...editingGuidance,
                title: formData.title,
                content: formData.content,
                updatedAt: now,
            };
            await db.ref(`counselor_guidance/${principalId}/${editingGuidance.id}`).set(updatedGuidance);
        } else {
            // Create
            const newGuidance: CounselorGuidance = {
                id: uuidv4(),
                principalId,
                counselorId: currentUser.id,
                counselorName: currentUser.name,
                title: formData.title,
                content: formData.content,
                createdAt: now,
            };
            await db.ref(`counselor_guidance/${principalId}/${newGuidance.id}`).set(newGuidance);
        }
        setIsSubmitting(false);
        resetForm();
    };

    const handleEdit = (guidance: CounselorGuidance) => {
        setEditingGuidance(guidance);
        setFormData({ title: guidance.title, content: guidance.content });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا التوجيه؟')) {
            await db.ref(`counselor_guidance/${principalId}/${id}`).remove();
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-lg border">
                <h2 className="text-2xl font-bold mb-4">{editingGuidance ? 'تعديل التوجيه' : 'إضافة توجيه جديد'}</h2>
                <div className="space-y-4">
                    <input type="text" name="title" placeholder="عنوان التوجيه" value={formData.title} onChange={handleInputChange} className="w-full p-3 border rounded-lg" />
                    <textarea name="content" placeholder="محتوى التوجيه... يمكنك إضافة روابط يوتيوب، فيسبوك، أو صور." value={formData.content} onChange={handleInputChange} rows={8} className="w-full p-3 border rounded-lg"></textarea>
                    <div className="flex justify-end gap-3">
                        {editingGuidance && <button onClick={resetForm} className="px-6 py-2 bg-gray-200 rounded-lg flex items-center gap-2"><X /> إلغاء التعديل</button>}
                        <button onClick={handleSave} disabled={isSubmitting} className="px-6 py-2 bg-cyan-600 text-white font-bold rounded-lg flex items-center gap-2 disabled:bg-gray-400">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : (editingGuidance ? <Save /> : <Plus />)}
                            {editingGuidance ? 'حفظ التعديلات' : 'نشر التوجيه'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border">
                <h2 className="text-2xl font-bold mb-4">التوجيهات المنشورة</h2>
                {isLoading ? <div className="flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>
                 : guidances.length === 0 ? <p className="text-center text-gray-500">لا توجد توجيهات منشورة بعد.</p>
                 : (
                    <div className="space-y-6">
                        {guidances.map(guidance => (
                            <div key={guidance.id} className="p-4 rounded-lg bg-gray-50 border relative">
                                <GuidanceDisplay guidance={guidance} />
                                <div className="absolute top-2 left-2 flex gap-2">
                                    <button onClick={() => handleEdit(guidance)} className="p-2 bg-yellow-400 text-white rounded-full hover:bg-yellow-500 shadow"><Edit size={18} /></button>
                                    <button onClick={() => handleDelete(guidance.id)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                 )}
            </div>
        </div>
    );
}