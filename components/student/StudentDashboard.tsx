
import React, { useState, useMemo, useRef } from 'react';
import type { Student, StudentEvaluation, EvaluationRating, Homework, HomeworkSubmission } from '../../types';
import { Star, BarChart, X, Camera, Loader2, Smile, Clock, AlertTriangle } from 'lucide-react';

const RATING_MAP: Record<EvaluationRating, { value: number; color: string; }> = {
    'ممتاز': { value: 6, color: 'text-green-500' },
    'جيد جدا': { value: 5, color: 'text-cyan-500' },
    'جيد': { value: 4, color: 'text-teal-500' },
    'متوسط': { value: 3, color: 'text-blue-500' },
    'ضعيف': { value: 2, color: 'text-orange-500' },
    'ضعيف جدا': { value: 1, color: 'text-red-500' },
};

const INVERSE_RATING_MAP: Record<number, EvaluationRating> = {
    6: 'ممتاز',
    5: 'جيد جدا',
    4: 'جيد',
    3: 'متوسط',
    2: 'ضعيف',
    1: 'ضعيف جدا',
};

interface StudentDashboardProps {
    evaluations: StudentEvaluation[];
    studentData: Student | null;
    onPhotoUpdate: (photoBlob: Blob) => Promise<void>;
    onOpenMoodModal: () => void;
    activeHomeworks?: Homework[];
    submissions?: Record<string, HomeworkSubmission>;
}

export default function StudentDashboard({ evaluations, studentData, onPhotoUpdate, onOpenMoodModal, activeHomeworks = [], submissions = {} }: StudentDashboardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const overallEvaluation = useMemo(() => {
        if (evaluations.length === 0) {
            return { text: 'لا يوجد تقييم حتى الآن', color: 'text-gray-500' };
        }
        const totalValue = evaluations.reduce((sum, e) => sum + (RATING_MAP[e.rating]?.value || 0), 0);
        const averageValue = Math.round(totalValue / evaluations.length);
        const ratingText = INVERSE_RATING_MAP[averageValue] || 'متوسط';
        
        return { text: ratingText, color: RATING_MAP[ratingText]?.color || 'text-gray-500' };
    }, [evaluations]);

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            await onPhotoUpdate(file);
        } catch (error) {
            console.error("Photo update failed:", error);
            alert("فشل تحديث الصورة.");
        } finally {
            setIsUploading(false);
        }
    };

    const upcomingDeadlines = useMemo(() => {
        const now = new Date();
        return activeHomeworks
            .filter(hw => {
                const sub = submissions[hw.id];
                if (sub) return false; // Already submitted

                const deadline = new Date(hw.deadline);
                const diffTime = deadline.getTime() - now.getTime();
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                
                return diffDays >= -1 && diffDays <= 3; // Due within next 3 days or just past
            })
            .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    }, [activeHomeworks, submissions]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile & Evaluation Card */}
                <div className="lg:col-span-1 bg-white p-8 rounded-xl shadow-lg text-center h-full">
                    <div className="w-40 h-40 mx-auto mb-4 relative group">
                        <img 
                            src={studentData?.photoUrl || "https://i.imgur.com/0zjxJmi.jpeg"} 
                            alt="صورة الطالب" 
                            className="w-full h-full object-cover rounded-full border-4 border-cyan-500 bg-gray-200"
                        />
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoChange}
                            accept="image/jpeg,image/png"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <>
                                    <Camera size={32} />
                                    <span className="absolute bottom-2 text-xs font-semibold">تغيير</span>
                                </>
                            )}
                        </button>
                    </div>

                    <h1 className="text-3xl font-bold text-gray-800">{studentData?.name || 'اسم الطالب'}</h1>

                    <h2 className="text-xl font-semibold text-gray-600 mb-2 mt-6">تقييمك العام</h2>
                    <div className={`flex items-center justify-center gap-2 text-5xl font-bold ${overallEvaluation.color}`}>
                        <Star className="w-12 h-12" />
                        <span>{overallEvaluation.text}</span>
                    </div>
                    
                    <div className="flex flex-col gap-3 mt-8">
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition-transform transform hover:scale-105"
                        >
                            <BarChart size={20} />
                            عرض تقييمات المواد
                        </button>
                        <button 
                            onClick={onOpenMoodModal}
                            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-transform transform hover:scale-105"
                        >
                            <Smile size={20} />
                            تسجيل حالتي المزاجية
                        </button>
                    </div>
                </div>

                {/* Deadlines and Summary Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Deadlines Card */}
                    <div className="bg-white p-6 rounded-xl shadow-lg h-full border-r-4 border-orange-500">
                        <div className="flex items-center gap-3 mb-6">
                            <Clock className="text-orange-600" size={28} />
                            <h3 className="text-2xl font-bold text-gray-800">مواعيد نهائية قريبة</h3>
                        </div>
                        
                        {upcomingDeadlines.length > 0 ? (
                            <div className="space-y-4">
                                {upcomingDeadlines.map(hw => {
                                    const diff = new Date(hw.deadline).getTime() - new Date().getTime();
                                    const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
                                    
                                    return (
                                        <div key={hw.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200 animate-pulse-slow">
                                            <div>
                                                <h4 className="font-bold text-orange-900">{hw.title}</h4>
                                                <p className="text-sm text-orange-700">{hw.subjectName}</p>
                                            </div>
                                            <div className="text-left">
                                                <span className={`flex items-center gap-1 font-black text-sm ${diffDays < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                                                    <AlertTriangle size={14} />
                                                    {diffDays < 0 ? 'انتهى الموعد' : diffDays === 0 ? 'اليوم' : `باقي ${diffDays} يوم`}
                                                </span>
                                                <p className="text-xs text-gray-500">{new Date(hw.deadline).toLocaleDateString('ar-EG')}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-400">
                                <CheckCircleIcon className="w-16 h-16 mx-auto mb-2 opacity-20" />
                                <p>لا توجد واجبات متأخرة أو قريبة التسليم حالياً. عمل رائع!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div 
                        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="text-2xl font-bold">تقييم المواد</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X/></button>
                        </div>
                        {evaluations.length > 0 ? (
                            <div className="max-h-[60vh] overflow-y-auto">
                                <table className="w-full text-right">
                                    <thead className="sticky top-0 bg-gray-100">
                                        <tr>
                                            <th className="p-3 font-semibold">المادة الدراسية</th>
                                            <th className="p-3 font-semibold">التقييم</th>
                                            <th className="p-3 font-semibold">الأستاذ المقيم</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {evaluations.map((evaluation, index) => (
                                            <tr key={evaluation.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                                <td className="p-3 font-medium">{evaluation.subjectName}</td>
                                                <td className={`p-3 font-bold ${RATING_MAP[evaluation.rating]?.color}`}>{evaluation.rating}</td>
                                                <td className="p-3 text-gray-600">{evaluation.teacherName}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-8">لم يقم المدرسون بتقييمك في أي مادة بعد.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const CheckCircleIcon = ({className}:{className?: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
);