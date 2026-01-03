import React, { useState, useEffect, useMemo } from 'react';
import type { User, ClassData, Mood, MoodLog } from '../../types.ts';
import { db } from '../../lib/firebase.ts';
import { Smile, Frown, Meh, Angry, AlertCircle, Loader2, CloudRain, Sun, Calendar, Search } from 'lucide-react';

interface CounselorMoodTrackerProps {
    currentUser: User;
    classes: ClassData[];
    users: User[];
}

const MOOD_CONFIG: Record<Mood, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
    'happy': { label: 'سعيد', icon: <Smile />, color: 'text-green-600', bg: 'bg-green-100' },
    'anxious': { label: 'قلق', icon: <Meh />, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    'angry': { label: 'غاضب', icon: <Angry />, color: 'text-red-600', bg: 'bg-red-100' },
    'sad': { label: 'حزين', icon: <Frown />, color: 'text-blue-600', bg: 'bg-blue-100' },
    'frustrated': { label: 'محبط', icon: <AlertCircle />, color: 'text-orange-600', bg: 'bg-orange-100' },
};

export default function CounselorMoodTracker({ currentUser, classes }: CounselorMoodTrackerProps) {
    const [selectedStage, setSelectedStage] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [moodLogs, setMoodLogs] = useState<Record<string, Record<string, MoodLog>>>({}); // { studentId: { date: MoodLog } }
    const [isLoading, setIsLoading] = useState(true);

    const principalId = currentUser.principalId;

    useEffect(() => {
        if (!principalId) return;

        setIsLoading(true);
        const logsRef = db.ref(`mood_logs/${principalId}`);
        const callback = (snapshot: any) => {
            setMoodLogs(snapshot.val() || {});
            setIsLoading(false);
        };
        logsRef.on('value', callback);
        return () => logsRef.off('value', callback);
    }, [principalId]);

    const availableStages = useMemo(() => Array.from(new Set(classes.map(c => c.stage))), [classes]);
    
    const filteredStudents = useMemo(() => {
        let students = classes.flatMap(c => c.students || []).map(s => {
             const cls = classes.find(c => c.id === classes.find(cl => cl.students?.some(stu => stu.id === s.id))?.id);
             return { ...s, classInfo: cls };
        });

        if (selectedStage) {
            students = students.filter(s => s.classInfo?.stage === selectedStage);
        }
        if (selectedClassId) {
            students = students.filter(s => s.classInfo?.id === selectedClassId);
        }
        return students;
    }, [classes, selectedStage, selectedClassId]);

    // Statistics for the selected date
    const dailyStats = useMemo(() => {
        const stats: Record<Mood, number> = { happy: 0, anxious: 0, angry: 0, sad: 0, frustrated: 0 };
        let totalLogged = 0;

        filteredStudents.forEach(student => {
            const log = moodLogs[student.id]?.[selectedDate];
            if (log) {
                stats[log.mood]++;
                totalLogged++;
            }
        });
        return { stats, totalLogged };
    }, [filteredStudents, moodLogs, selectedDate]);

    // Alert Logic: Consecutive negative moods
    const alertList = useMemo(() => {
        const negativeMoods: Mood[] = ['sad', 'angry', 'frustrated'];
        const alerts: { studentId: string; name: string; classSection: string; history: Mood[] }[] = [];
        const today = new Date();

        filteredStudents.forEach(student => {
            const history: Mood[] = [];
            let consecutiveCount = 0;
            
            // Check last 5 days
            for (let i = 0; i < 5; i++) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                const log = moodLogs[student.id]?.[dateStr];
                
                if (log) {
                    history.push(log.mood);
                    if (negativeMoods.includes(log.mood)) {
                        consecutiveCount++;
                    } else {
                         // Break consecutive count if a positive mood is found, but we still want to show history? 
                         // Logic: We want to find students who are persistently negative.
                         // Simple logic: if the last 3 *recorded* logs were negative.
                    }
                }
            }
            
            // Strict check: Are the last 3 available logs negative?
            const studentLogs = (Object.values(moodLogs[student.id] || {}) as MoodLog[]).sort((a,b) => b.timestamp - a.timestamp); // Newest first
            const last3 = studentLogs.slice(0, 3);
            if (last3.length >= 3 && last3.every(l => negativeMoods.includes(l.mood))) {
                 alerts.push({
                    studentId: student.id,
                    name: student.name,
                    classSection: `${student.classInfo?.stage} - ${student.classInfo?.section}`,
                    history: last3.map(l => l.mood)
                });
            }
        });
        return alerts;
    }, [filteredStudents, moodLogs]);

    return (
        <div className="space-y-8">
            {/* Header & Controls */}
            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-purple-500">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <CloudRain className="text-purple-600" /> مقياس المزاج المدرسي (الطقس العاطفي)
                    </h2>
                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                        <input 
                            type="date" 
                            value={selectedDate} 
                            onChange={(e) => setSelectedDate(e.target.value)} 
                            className="p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <select value={selectedStage} onChange={e => { setSelectedStage(e.target.value); setSelectedClassId(''); }} className="p-2 border rounded-lg">
                        <option value="">-- كل المراحل --</option>
                        {availableStages.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                     <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} disabled={!selectedStage} className="p-2 border rounded-lg disabled:bg-gray-100">
                        <option value="">-- كل الشعب --</option>
                        {classes.filter(c => c.stage === selectedStage).map(c => <option key={c.id} value={c.id}>{c.section}</option>)}
                    </select>
                </div>
            </div>

            {/* Daily Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(MOOD_CONFIG).map(([key, config]) => {
                    const count = dailyStats.stats[key as Mood];
                    const percentage = dailyStats.totalLogged > 0 ? Math.round((count / dailyStats.totalLogged) * 100) : 0;
                    return (
                        <div key={key} className={`p-4 rounded-xl shadow-md border-b-4 ${config.bg} border-${config.color.split('-')[1]}-500 flex flex-col items-center`}>
                            <div className={`text-3xl mb-2 ${config.color}`}>{config.icon}</div>
                            <span className="font-bold text-gray-700">{config.label}</span>
                            <span className="text-2xl font-extrabold mt-1">{count}</span>
                            <span className="text-xs text-gray-500">{percentage}%</span>
                        </div>
                    );
                })}
            </div>

            {/* Alerts Section */}
            {alertList.length > 0 && (
                <div className="bg-red-50 p-6 rounded-xl shadow-lg border border-red-200">
                    <h3 className="text-xl font-bold text-red-800 mb-4 flex items-center gap-2">
                        <AlertCircle /> حالات تستدعي الانتباه (مزاج سلبي لـ 3 أيام متتالية)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {alertList.map(alert => (
                            <div key={alert.studentId} className="bg-white p-4 rounded-lg shadow border-r-4 border-red-500">
                                <h4 className="font-bold text-lg">{alert.name}</h4>
                                <p className="text-sm text-gray-500 mb-2">{alert.classSection}</p>
                                <div className="flex gap-2 justify-end">
                                    {alert.history.map((m, i) => (
                                        <div key={i} className={`p-1 rounded-full ${MOOD_CONFIG[m].bg}`} title={MOOD_CONFIG[m].label}>
                                            {MOOD_CONFIG[m].icon}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Student List */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Search size={20}/> سجلات الطلاب ليوم {selectedDate}</h3>
                {isLoading ? <div className="text-center p-8"><Loader2 className="animate-spin h-8 w-8 mx-auto"/></div> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-gray-100 text-gray-700">
                                    <th className="p-3">الطالب</th>
                                    <th className="p-3">الصف / الشعبة</th>
                                    <th className="p-3">الحالة المزاجية</th>
                                    <th className="p-3">وقت التسجيل</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map(student => {
                                    const log = moodLogs[student.id]?.[selectedDate];
                                    return (
                                        <tr key={student.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 font-semibold">{student.name}</td>
                                            <td className="p-3 text-sm text-gray-600">{student.classInfo?.stage} - {student.classInfo?.section}</td>
                                            <td className="p-3">
                                                {log ? (
                                                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${MOOD_CONFIG[log.mood].bg} ${MOOD_CONFIG[log.mood].color}`}>
                                                        {MOOD_CONFIG[log.mood].icon} {MOOD_CONFIG[log.mood].label}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">- لم يسجل -</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-sm text-gray-500">
                                                {log ? new Date(log.timestamp).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'}) : ''}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredStudents.length === 0 && <p className="text-center p-8 text-gray-500">لا يوجد طلاب مطابقين للبحث.</p>}
                    </div>
                )}
            </div>
        </div>
    );
}