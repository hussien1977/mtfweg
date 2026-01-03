
import React from 'react';
import type { User } from '../../types.ts';

interface TeacherCodesPDFProps {
    teachers: User[];
}

export default function TeacherCodesPDF({ teachers }: TeacherCodesPDFProps) {
    const rows = Array.from({ length: 22 });
    const firstHalf = teachers.slice(0, 22);
    const secondHalf = teachers.slice(22, 44);

    return (
        <div className="w-[794px] h-[1123px] p-8 bg-white font-['Cairo']" dir="rtl">
            <h1 className="text-2xl font-bold text-center mb-4">الأرقام السرية للكادر (مدرسين ومرشدين)</h1>
            <table className="w-full border-collapse border border-black text-lg">
                <thead className="bg-gray-200">
                    <tr>
                        <th className="border border-black p-2 font-bold w-2/6">الاسم</th>
                        <th className="border border-black p-2 font-bold w-1/6">الرقم السري</th>
                        <th className="border border-black p-2 font-bold w-2/6">الاسم</th>
                        <th className="border border-black p-2 font-bold w-1/6">الرقم السري</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((_, index) => {
                        const teacher1 = firstHalf[index];
                        const teacher2 = secondHalf[index];
                        return (
                            <tr key={index} className="h-[44px]">
                                <td className="border border-black p-2 align-top" style={{ paddingTop: '6px' }}>{teacher1 ? teacher1.name : ''} {teacher1?.role === 'counselor' ? '(مرشد)' : ''}</td>
                                <td className="border border-black p-2 align-top text-center font-mono" style={{ paddingTop: '6px' }}>{teacher1 ? teacher1.code : ''}</td>
                                <td className="border border-black p-2 align-top" style={{ paddingTop: '6px' }}>{teacher2 ? teacher2.name : ''} {teacher2?.role === 'counselor' ? '(مرشد)' : ''}</td>
                                <td className="border border-black p-2 align-top text-center font-mono" style={{ paddingTop: '6px' }}>{teacher2 ? teacher2.code : ''}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
