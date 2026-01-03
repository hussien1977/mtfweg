import React, { useMemo } from 'react';
import type { User, HomeworkProgress, ClassData, Award } from '../../types.ts';
import { Trophy, ArrowLeft, Star, Book, Zap } from 'lucide-react';

interface MyProgressProps {
    currentUser: User;
    progress: HomeworkProgress | null;
    allClasses: ClassData[];
    onBack: () => void;
}

const AWARDS: Award[] = [
    { id: 'first_step', name: 'الخطوة الأولى', description: 'أكملت واجبك الأول بنجاح!', icon: '🌟', minCompletions: 1 },
    { id: 'diligent', name: 'المجتهد', description: 'أكملت 5 واجبات! عمل رائع.', icon: '📚', minCompletions: 5 },
    { id: 'committed', name: 'الملتزم', description: 'أكملت 10 واجبات! استمر في التقدم.', icon: '🎯', minCompletions: 10 },
    { id: 'star_student', name: 'الطالب النجم', description: 'أكملت 25 واجباً! أنت مذهل.', icon: '⭐', minCompletions: 25 },
    { id: 'unstoppable', name: 'الذي لا يوقَف', description: 'أكملت 50 واجباً! إنجاز استثنائي.', icon: '🚀', minCompletions: 50 },
    { id: 'homework_hero', name: 'بطل الواجبات', description: 'أكملت 100 واجب! أنت أسطورة.', icon: '🏆', minCompletions: 100 },
];


export default function MyProgress({ currentUser, progress, allClasses, onBack }: MyProgressProps) {
    
    const totalCompleted = progress?.totalCompleted || 0;
    
    const earnedAwards = useMemo(() => {
        return AWARDS.filter(award => totalCompleted >= award.minCompletions);
    }, [totalCompleted]);

    const monthlyData = useMemo(() => {
        if (!progress?.monthlyCompleted) return [];
        return Object.entries(progress.monthlyCompleted)
            .map(([month, data]: [string, { count: number }]) => ({ month, count: data.count }))
            .sort((a,b) => a.month.localeCompare(b.month));
    }, [progress]);

    const maxMonthlyCount = Math.max(...monthlyData.map(d => d.count), 0);

    return (
        <div>
             <button onClick={onBack} className="flex items-center gap-2 mb-4 text-cyan-600 font-semibold hover:text-cyan-800">
                <ArrowLeft size={20} />
                <span>العودة للواجبات</span>
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6">
                    <div className="p-6 bg-white rounded-xl shadow-lg text-center">
                        <h3 className="text-lg font-semibold text-gray-600">إجمالي الواجبات المنجزة</h3>
                        <p className="text-6xl font-bold text-cyan-600 mt-2">{totalCompleted}</p>
                    </div>
                    <div className="p-6 bg-white rounded-xl shadow-lg">
                        <h3 className="text-lg font-bold text-gray-700 mb-4">أوسمتي</h3>
                        <div className="space-y-3">
                            {earnedAwards.length > 0 ? earnedAwards.map(award => (
                                <div key={award.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <span className="text-3xl">{award.icon}</span>
                                    <div>
                                        <p className="font-bold text-yellow-800">{award.name}</p>
                                        <p className="text-sm text-yellow-700">{award.description}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center text-gray-500">لم تحصل على أي أوسمة بعد. أكمل واجبك الأول لتبدأ!</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 p-6 bg-white rounded-xl shadow-lg">
                    <h3 className="text-lg font-bold text-gray-700 mb-4">التقدم الشهري</h3>
                    {monthlyData.length > 0 ? (
                         <div className="space-y-4">
                            {monthlyData.map(({ month, count }) => (
                                <div key={month} className="flex items-center gap-3">
                                    <span className="w-24 font-semibold text-gray-600">{month}</span>
                                    <div className="flex-grow bg-gray-200 rounded-full h-6">
                                        <div 
                                            className="bg-cyan-500 h-6 rounded-full flex items-center justify-end px-2 text-white font-bold"
                                            style={{ width: `${(count / (maxMonthlyCount || 1)) * 100}%` }}
                                        >
                                           {count}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">لا توجد بيانات للتقدم الشهري بعد.</p>
                    )}
                </div>
            </div>
        </div>
    );
}