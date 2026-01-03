
import React, { useState, useEffect, useMemo } from 'react';
// FIX: Added missing type import.
import type { User, ClassData, HomeworkProgress, Student, LeaderboardEntry } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { Trophy, Crown, Loader2, Star } from 'lucide-react';

interface HallOfFameProps {
    currentUser: User;
    classes: ClassData[];
}


const RANK_STYLES = [
    { bg: 'bg-yellow-400', text: 'text-yellow-800', icon: <Crown size={24}/>, shadow: 'shadow-yellow-300' },
    { bg: 'bg-gray-300', text: 'text-gray-800', icon: <Trophy size={20}/>, shadow: 'shadow-gray-200' },
    { bg: 'bg-yellow-600', text: 'text-yellow-100', icon: <Star size={18}/>, shadow: 'shadow-yellow-500' },
];

export default function HallOfFame({ currentUser, classes }: HallOfFameProps) {
    const [leaderboard, setLeaderboard] = useState<Record<string, LeaderboardEntry[]>>({});
    const [isLoading, setIsLoading] = useState(true);

    const principalId = currentUser.principalId || (currentUser.role === 'principal' ? currentUser.id : null);
    
    useEffect(() => {
        if (!principalId) {
            setIsLoading(false);
            return;
        }

        const progressRef = db.ref(`homework_progress/${principalId}`);
        progressRef.get().then(snapshot => {
            const allProgressData = snapshot.val() || {};
            const currentMonthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"
            
            const studentScores: Omit<LeaderboardEntry, 'studentName' | 'studentPhotoUrl' | 'section'>[] = [];
            
            Object.entries(allProgressData).forEach(([studentId, progress]: [string, any]) => {
                const monthData = (progress as HomeworkProgress).monthlyCompleted?.[currentMonthKey];
                if (monthData && monthData.count > 0) {
                    studentScores.push({
                        studentId,
                        classId: '', // We'll fill this in next
                        score: monthData.count
                    });
                }
            });

            // Now, map student data (name, photo, class) to the scores
            const populatedScores: LeaderboardEntry[] = [];
            classes.forEach(cls => {
                cls.students?.forEach(student => {
                    const scoreData = studentScores.find(s => s.studentId === student.id);
                    if(scoreData) {
                        populatedScores.push({
                            ...scoreData,
                            studentName: student.name,
                            studentPhotoUrl: student.photoUrl,
                            classId: cls.id,
                            section: cls.section
                        });
                    }
                });
            });
            
            // Group by classId and get top 5 for each
            const groupedByClass = populatedScores.reduce((acc, student) => {
                if (!acc[student.classId]) {
                    acc[student.classId] = [];
                }
                acc[student.classId].push(student);
                return acc;
            }, {} as Record<string, LeaderboardEntry[]>);

            const finalLeaderboard: Record<string, LeaderboardEntry[]> = {};
            Object.entries(groupedByClass).forEach(([classId, students]) => {
                finalLeaderboard[classId] = students.sort((a,b) => b.score - a.score).slice(0, 5);
            });

            setLeaderboard(finalLeaderboard);
        }).finally(() => setIsLoading(false));

    }, [principalId, classes]);

    const displayClasses = useMemo(() => {
        if (currentUser.role === 'student' && currentUser.classId) {
            return classes.filter(c => c.id === currentUser.classId);
        }
        return classes.sort((a,b) => a.stage.localeCompare(b.stage) || a.section.localeCompare(b.section));
    }, [currentUser, classes]);


    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-10 w-10 text-cyan-600"/></div>
    }

    // FIX: Cast Object.values(leaderboard) to the correct type to allow property access and resolve sort error.
    const hasAnyLeaderboardData = (Object.values(leaderboard) as LeaderboardEntry[][]).some(arr => arr.length > 0);

    return (
        <div className="space-y-8">
             <div className="text-center bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 p-6 rounded-xl shadow-lg">
                <h1 className="text-4xl font-extrabold text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                    🏆 لوحة الأبطال الشهرية
                </h1>
                <p className="mt-2 text-white/90 font-semibold">
                    هنا نكرّم الطلاب الأكثر إنجازاً للواجبات خلال هذا الشهر. استمروا في المثابرة!
                </p>
            </div>
            
            {!hasAnyLeaderboardData && !isLoading ? (
                 <p className="text-center text-gray-500 p-8 bg-white rounded-lg">لم يكمل أي طالب واجباته بعد هذا الشهر. كن أول الأبطال!</p>
            ) : (
                displayClasses.map(cls => {
                    const classLeaderboard = leaderboard[cls.id];
                    if (!classLeaderboard || classLeaderboard.length === 0) {
                        return null; // Don't show class if no one has scores
                    }

                    return (
                        <div key={cls.id} className="bg-white p-6 rounded-xl shadow-lg">
                            <h2 className="text-2xl font-bold text-center mb-6">{cls.stage} - {cls.section}</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                                {classLeaderboard.map((entry, index) => (
                                    <div key={entry.studentId} className={`relative flex flex-col items-center p-4 rounded-xl shadow-lg border-2 ${RANK_STYLES[index]?.bg || 'bg-gray-100'} ${RANK_STYLES[index]?.shadow || 'shadow-md'}`}>
                                        <div className={`absolute -top-4 ${RANK_STYLES[index]?.text || 'text-gray-600'}`}>
                                            {RANK_STYLES[index]?.icon || <Star size={16}/>}
                                        </div>
                                        <img
                                            src={entry.studentPhotoUrl || 'https://i.imgur.com/0zjxJmi.jpeg'}
                                            alt={entry.studentName}
                                            className="w-24 h-24 rounded-full object-cover border-4 border-white bg-gray-200"
                                        />
                                        <h4 className="mt-3 text-lg font-bold text-gray-800 text-center">{entry.studentName}</h4>
                                        <div className={`mt-2 flex items-center gap-1 font-bold ${RANK_STYLES[index]?.text || 'text-gray-700'}`}>
                                            <span>{entry.score} واجب</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}