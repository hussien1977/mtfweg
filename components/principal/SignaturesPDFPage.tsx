import React from 'react';
import type { SchoolSettings, User } from '../../types.ts';

interface SignaturesPDFPageProps {
    settings: SchoolSettings;
    teachers: User[];
}

const ROWS_ON_PAGE = 25;

export default function SignaturesPDFPage({ settings, teachers }: SignaturesPDFPageProps) {
    const displayTeachers = [...teachers];
    while (displayTeachers.length < ROWS_ON_PAGE) {
        displayTeachers.push({ id: `placeholder-${displayTeachers.length}`, name: '', role: 'teacher', code: '' });
    }

    return (
        <div className="w-[794px] h-[1123px] bg-white p-12 flex flex-col font-['Cairo']" dir="rtl">
            <header className="text-center mb-10">
                <h1 className="text-2xl font-bold">بسم الله الرحمن الرحيم</h1>
                <h2 className="text-xl font-semibold mt-4">
                    قائمة بأسماء الهيئة التعليمية المستلمة للقرار الوزاري المرقم (١٣٢)
                </h2>
                <div className="flex justify-between items-center text-lg mt-6">
                    <span>{settings.schoolName}</span>
                    <span>للعام الدراسي {settings.academicYear}</span>
                </div>
            </header>

            <main className="flex-grow">
                <table className="w-full border-collapse border-2 border-black text-xl">
                    <thead className="bg-yellow-200">
                        <tr>
                            <th className="border-2 border-black p-2 w-16">ت</th>
                            <th className="border-2 border-black p-2">الاسم الثلاثي واللقب</th>
                            <th className="border-2 border-black p-2 w-48">التوقيع</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayTeachers.slice(0, ROWS_ON_PAGE).map((teacher, index) => (
                            <tr key={teacher.id}>
                                <td className="border-2 border-black p-2 text-center h-12">{index + 1}</td>
                                <td className="border-2 border-black p-2 font-semibold">{teacher.name}</td>
                                <td className="border-2 border-black p-2"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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