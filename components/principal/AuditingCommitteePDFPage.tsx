import React from 'react';
import type { SchoolSettings } from '../../types.ts';

interface CommitteeMember {
    id: string;
    name: string;
    role: string;
}

interface AuditingCommitteePDFPageProps {
    settings: SchoolSettings;
    members: CommitteeMember[];
    tasks: string;
}

export default function AuditingCommitteePDFPage({ settings, members, tasks }: AuditingCommitteePDFPageProps) {
    return (
        <div className="w-[794px] h-[1123px] bg-white p-12 flex flex-col font-['Cairo']" dir="rtl">
            <header className="text-center mb-10">
                <h1 className="text-3xl font-bold">
                    لجنة التدقيق واعمالها للعام الدراسي {settings.academicYear}
                </h1>
            </header>

            <main className="flex-grow">
                <h2 className="text-2xl font-bold mb-4">أعضاء لجنة التدقيق:</h2>
                <table className="w-full border-collapse border-2 border-black text-xl mb-10">
                    <thead className="bg-yellow-200">
                        <tr>
                            <th className="border-2 border-black p-2 w-16">ت</th>
                            <th className="border-2 border-black p-2">الاسم الثلاثي واللقب</th>
                            <th className="border-2 border-black p-2 w-48">العمل</th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.map((member, index) => (
                            <tr key={member.id}>
                                <td className="border-2 border-black p-2 text-center h-12">{index + 1}</td>
                                <td className="border-2 border-black p-2 font-semibold">{member.name}</td>
                                <td className="border-2 border-black p-2 text-center">{member.role}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                <h2 className="text-2xl font-bold mb-4">أعمال اللجنة:</h2>
                <div className="text-xl leading-loose whitespace-pre-wrap p-4 border-2 border-gray-200 rounded-lg">
                    {tasks}
                </div>
            </main>

            <footer className="mt-auto pt-16 flex justify-end text-xl font-bold">
                <div className="text-center">
                    <p>توقيع رئيس اللجنة</p>
                    <p className="mt-20">{settings.principalName}</p>
                </div>
            </footer>
        </div>
    );
}