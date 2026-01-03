
import React, { useState } from 'react';
import type { Mood } from '../../types.ts';
import { Smile, Frown, Meh, Angry, AlertCircle, Loader2, X } from 'lucide-react';
import { db } from '../../lib/firebase.ts';

interface MoodCheckInModalProps {
    currentUser: { id: string; principalId: string | undefined };
    onComplete: () => void;
}

const MOODS: { type: Mood; label: string; icon: React.ReactNode; color: string }[] = [
    { type: 'happy', label: 'سعيد', icon: <Smile className="w-16 h-16" />, color: 'text-green-500 hover:bg-green-50' },
    { type: 'anxious', label: 'قلق', icon: <Meh className="w-16 h-16" />, color: 'text-yellow-500 hover:bg-yellow-50' },
    { type: 'angry', label: 'غاضب', icon: <Angry className="w-16 h-16" />, color: 'text-red-500 hover:bg-red-50' },
    { type: 'sad', label: 'حزين', icon: <Frown className="w-16 h-16" />, color: 'text-blue-500 hover:bg-blue-50' },
    { type: 'frustrated', label: 'محبط', icon: <AlertCircle className="w-16 h-16" />, color: 'text-orange-500 hover:bg-orange-50' },
];

export default function MoodCheckInModal({ currentUser, onComplete }: MoodCheckInModalProps) {
    const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedMood || !currentUser.principalId) return;

        setIsSubmitting(true);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        try {
            await db.ref(`mood_logs/${currentUser.principalId}/${currentUser.id}/${today}`).set({
                mood: selectedMood,
                timestamp: Date.now(),
                date: today
            });
            onComplete();
        } catch (error) {
            console.error("Failed to save mood:", error);
            alert("حدث خطأ أثناء حفظ حالتك المزاجية.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black bg-opacity-90 flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 text-center relative overflow-hidden">
                <button 
                    onClick={onComplete}
                    className="absolute top-4 right-4 p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors z-10"
                    aria-label="إغلاق (اختياري)"
                >
                    <X size={24} />
                </button>

                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"></div>
                
                <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-2">صندوق المشاعر</h2>
                <p className="text-lg text-gray-600 mb-8">كيف تشعر اليوم؟</p>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    {MOODS.map((m) => (
                        <button
                            key={m.type}
                            onClick={() => setSelectedMood(m.type)}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 transform ${
                                selectedMood === m.type 
                                ? 'border-cyan-500 scale-110 shadow-xl bg-gray-50' 
                                : 'border-transparent hover:scale-105'
                            } ${m.color}`}
                        >
                            <div className={`transition-transform duration-500 ${selectedMood === m.type ? 'animate-bounce' : ''}`}>
                                {m.icon}
                            </div>
                            <span className={`mt-2 font-bold text-lg ${selectedMood === m.type ? 'text-gray-900' : 'text-gray-500'}`}>{m.label}</span>
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={!selectedMood || isSubmitting}
                    className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xl rounded-xl shadow-lg hover:shadow-xl hover:from-cyan-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'تسجيل حالتي اليوم'}
                </button>
                
                <p className="mt-4 text-xs text-gray-400">مشاركتك تساعدنا في دعمك بشكل أفضل (اختياري).</p>
            </div>
        </div>
    );
}
