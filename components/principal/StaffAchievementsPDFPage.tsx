import React from 'react';
import type { User } from '../../types.ts';
import type { TeacherStats } from './StaffAchievements.tsx';
import { Star, ClipboardEdit, Award as AwardIcon, MessageSquare, Users } from 'lucide-react';

interface StaffAchievementsPDFPageProps {
    teachers: User[];
    stats: Map<string, TeacherStats>;
    principal: User;
    pageNumber: number;
    totalPages: number;
}

const StatCard: React.FC<{ teacher: User, stats: TeacherStats }> = ({ teacher, stats }) => (
    <div className="bg-white p-4 rounded-lg border-2 border-cyan-800 shadow-md flex flex-col h-full">
        <h3 className="text-xl font-bold text-gray-800 mb-3 text-center border-b pb-2">{teacher.name}</h3>
        <div className="space-y-3 text-base flex-grow flex flex-col justify-around">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700">
                    <Star size={20} className="text-yellow-500" />
                    <span>تقييمات الطلاب</span>
                </div>
                <span className="font-bold text-cyan-700">{stats.evaluations}</span>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700">
                    <ClipboardEdit size={20} className="text-blue-500" />
                    <span>الواجبات المرسلة</span>
                </div>
                <span className="font-bold text-blue-700">{stats.homework}</span>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700">
                    <AwardIcon size={20} className="text-purple-500" />
                    <span>تصويتات لوحة الشرف</span>
                </div>
                <span className="font-bold text-purple-700">{stats.votes}</span>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700">
                    <MessageSquare size={20} className="text-green-500" />
                    <span>محادثات فردية</span>
                </div>
                <span className="font-bold text-green-700">{stats.individualChats}</span>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700">
                    <Users size={20} className="text-teal-500" />
                    <span>محادثات جماعية</span>
                </div>
                <span className="font-bold text-teal-700">{stats.groupChats}</span>
            </div>
        </div>
    </div>
);

export default function StaffAchievementsPDFPage({ teachers, stats, principal, pageNumber, totalPages }: StaffAchievementsPDFPageProps) {
    return (
        <div className="w-[794px] h-[1123px] p-8 bg-gray-50 flex flex-col font-['Cairo']" dir="rtl">
            <header className="text-center mb-6 border-b-2 border-gray-300 pb-4">
                <h1 className="text-3xl font-bold text-gray-800">{principal.schoolName || 'المدرسة'}</h1>
                <h2 className="text-2xl font-semibold text-gray-600 mt-2">تقرير إنجازات الكادر التدريسي</h2>
            </header>

            <main className="flex-grow grid grid-cols-3 grid-rows-3 gap-5">
                {teachers.map(teacher => {
                    const teacherStats = stats.get(teacher.id) || { evaluations: 0, homework: 0, votes: 0, individualChats: 0, groupChats: 0 };
                    return <StatCard key={teacher.id} teacher={teacher} stats={teacherStats} />;
                })}
            </main>

            <footer className="mt-auto pt-4 text-center text-gray-500">
                صفحة {pageNumber} من {totalPages}
            </footer>
        </div>
    );
}