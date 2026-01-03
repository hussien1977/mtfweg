import React from 'react';
import type { SchoolSettings } from '../../types.ts';

interface CommitteeMember {
    id: string;
    name: string;
}

type CommitteesBySubject = Record<string, CommitteeMember[]>;

interface SpecializationCommitteesPDFPageProps {
    settings: SchoolSettings;
    committees: CommitteesBySubject;
}

const CommitteeTablePDF: React.FC<{ subject: string, members: CommitteeMember[] }> = ({ subject, members }) => (
     <div>
        <h3 className="text-xl font-bold bg-yellow-200 text-center p-2 border-2 border-black">لجنة {subject}</h3>
        <table className="w-full border-collapse border-2 border-black text-lg">
            <thead>
                <tr>
                    <th className="border-2 border-black p-2 w-[50%]">الاسم الثلاثي</th>
                    <th className="border-2 border-black p-2 w-[25%]">المنصب</th>
                    <th className="border-2 border-black p-2 w-[25%]">التوقيع</th>
                </tr>
            </thead>
            <tbody>
                {members.map((member, index) => (
                    <tr key={member.id}>
                        <td className="border-2 border-black p-2 font-semibold h-14">{member.name}</td>
                        <td className="border-2 border-black p-2 text-center">{index === 0 ? 'رئيساً' : 'عضو'}</td>
                        <td className="border-2 border-black p-2"></td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);


export default function SpecializationCommitteesPDFPage({ settings, committees }: SpecializationCommitteesPDFPageProps) {
    const committeeEntries = Object.entries(committees).filter(([, members]) => members.length > 0)
                               .sort(([subjectA], [subjectB]) => subjectA.localeCompare(subjectB, 'ar'));
                               
    const half = Math.ceil(committeeEntries.length / 2);
    const firstColumn = committeeEntries.slice(0, half);
    const secondColumn = committeeEntries.slice(half);

    return (
        <div className="w-[794px] h-[1123px] bg-white p-12 flex flex-col font-['Cairo']" dir="rtl">
            <header className="text-center mb-10">
                <h1 className="text-3xl font-bold">
                    لجان الفحص حسب الاختصاص للعام الدراسي {settings.academicYear}
                </h1>
                <h2 className="text-2xl font-semibold mt-2">{settings.schoolName}</h2>
            </header>

            <main className="flex-grow flex gap-8">
                <div className="w-1/2 space-y-6">
                    {firstColumn.map(([subject, members]) => (
                        <CommitteeTablePDF key={subject} subject={subject} members={members} />
                    ))}
                </div>
                <div className="w-1/2 space-y-6">
                    {secondColumn.map(([subject, members]) => (
                        <CommitteeTablePDF key={subject} subject={subject} members={members} />
                    ))}
                </div>
            </main>

            <footer className="mt-auto pt-16 flex justify-end text-xl font-bold">
                <div className="text-center">
                    <p>مدير المدرسة</p>
                    <p className="mt-20">{settings.principalName}</p>
                </div>
            </footer>
        </div>
    );
}