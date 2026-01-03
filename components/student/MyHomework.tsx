import React, { useMemo } from 'react';
import type { User, Homework, HomeworkSubmission } from '../../types.ts';
import { Clock, CheckCircle, XCircle, AlertTriangle, ChevronLeft, Award } from 'lucide-react';

interface MyHomeworkProps {
    currentUser: User;
    activeHomeworks: Homework[];
    submissions: Record<string, HomeworkSubmission>;
    onViewHomework: (homework: Homework) => void;
    onViewProgress: () => void;
}

interface HomeworkCardProps {
    homework: Homework;
    submission?: HomeworkSubmission;
    onViewHomework: (h: Homework) => void;
}

const HomeworkCard: React.FC<HomeworkCardProps> = ({ homework, submission, onViewHomework }) => {
    const deadline = new Date(homework.deadline);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status: { text: string; icon: React.ReactNode; color: string; cardBg: string };

    if (submission) {
        switch (submission.status) {
            case 'accepted':
                status = { text: 'تم القبول', icon: <CheckCircle />, color: 'text-green-600', cardBg: 'bg-green-50 border-green-300' };
                break;
            case 'rejected':
                status = { text: 'مرفوض', icon: <XCircle />, color: 'text-red-600', cardBg: 'bg-red-50 border-red-300' };
                break;
            default:
                status = { text: 'بانتظار المراجعة', icon: <Clock />, color: 'text-yellow-600', cardBg: 'bg-yellow-50 border-yellow-300' };
        }
    } else {
        if (diffDays < 0) {
            status = { text: 'انتهى الوقت', icon: <XCircle />, color: 'text-gray-500', cardBg: 'bg-gray-100 border-gray-300' };
        } else if (diffDays <= 1) {
            status = { text: 'مستعجل', icon: <AlertTriangle />, color: 'text-orange-500', cardBg: 'bg-orange-50 border-orange-300 animate-pulse' };
        } else {
            status = { text: 'متاح', icon: <Clock />, color: 'text-blue-600', cardBg: 'bg-blue-50 border-blue-300' };
        }
    }
    
    return (
        <div 
            className={`p-4 rounded-lg border-l-4 shadow-sm cursor-pointer transition-transform transform hover:-translate-y-1 ${status.cardBg}`}
            onClick={() => onViewHomework(homework)}
        >
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg text-gray-800">{homework.title}</h3>
                    <p className="text-sm text-gray-600">{homework.subjectName}</p>
                </div>
                <div className={`flex items-center gap-2 text-sm font-semibold ${status.color}`}>
                    {status.icon}
                    <span>{status.text}</span>
                </div>
            </div>
            <div className="mt-3 pt-3 border-t text-sm text-gray-500">
                <p>الموعد النهائي: {deadline.toLocaleDateString('ar-EG')}</p>
                {diffDays >= 0 && !submission && <p>باقي: {diffDays} أيام</p>}
            </div>
        </div>
    );
};


export default function MyHomework({ currentUser, activeHomeworks, submissions, onViewHomework, onViewProgress }: MyHomeworkProps) {
  
  const sortedHomeworks = useMemo(() => {
    // Defensive check to ensure activeHomeworks is always an array before processing.
    const homeworks = Array.isArray(activeHomeworks) ? activeHomeworks : [];
    return [...homeworks].sort((a,b) => {
        const subA = submissions[a.id];
        const subB = submissions[b.id];
        // If one is submitted and the other isn't, unsubmitted comes first
        if (!!subA !== !!subB) {
            return subA ? 1 : -1;
        }
        // Otherwise, sort by deadline
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [activeHomeworks, submissions]);
  
  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-gray-800">واجباتي</h2>
            <button 
                onClick={onViewProgress}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-transform transform hover:scale-105"
            >
                <Award size={20} />
                <span>تقدمي وإنجازاتي</span>
            </button>
        </div>
        
        {sortedHomeworks.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedHomeworks.map(hw => (
                    <HomeworkCard
                        key={hw.id}
                        homework={hw}
                        submission={submissions[hw.id]}
                        onViewHomework={onViewHomework}
                    />
                ))}
            </div>
        ) : (
            <div className="text-center p-8 bg-white rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-700">لا توجد واجبات حالياً</h3>
                <p className="mt-2 text-gray-500">سيتم عرض الواجبات الجديدة هنا عند إرسالها من قبل المدرسين.</p>
            </div>
        )}
    </div>
  );
}