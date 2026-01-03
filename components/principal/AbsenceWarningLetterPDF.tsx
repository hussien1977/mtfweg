import React from 'react';
import type { SchoolSettings, ClassData, Student } from '../../types.ts';

interface AbsenceWarningLetterPDFProps {
    settings: SchoolSettings;
    classData: ClassData;
    student: Student;
    totalAbsences: number;
}

const today = new Date().toLocaleDateString('ar-EG-u-nu-latn', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

export default function AbsenceWarningLetterPDF({ settings, classData, student, totalAbsences }: AbsenceWarningLetterPDFProps) {
    
    const Letter = () => (
         <div className="w-full h-full p-12 flex flex-col justify-between font-['Cairo'] text-lg" dir="rtl">
            <header className="flex justify-between items-start">
                <div className="w-1/3 text-right">
                    <p className="font-bold">{settings.schoolName}</p>
                </div>
                <div className="w-1/3 flex justify-center">
                    <div className="w-24 h-24"></div> {/* Placeholder for logo */}
                </div>
                <div className="w-1/3 text-left">
                    <p>العدد /</p>
                    <p>التاريخ / {today}</p>
                </div>
            </header>

            <main className="flex-grow mt-16 space-y-8">
                <p className="font-bold">إلى ولي أمر الطالب / {student.name}</p>
                <p className="font-bold text-center">م / غيابات طالب</p>

                <p className="leading-relaxed">
                    لقد بلغ مجموع الايام التي تغيبها ولدكم ( {student.name} ) في الصف ( {classData.stage} / {classData.section} ) عن المدرسة لغاية
                    <span className="px-3">/</span>
                    <span className="px-3">/</span>
                    ۲۰۲ ، ( {totalAbsences} ) يوم ، فخصمت منه ( {totalAbsences * 2} ) درجة من الدوام ، فإذا بلغت الدرجات المخصومة منه ٥١ % من درجات الدوام فسيعتبر راسباً في صفه لهذا العام عملاً بمنطوق المادة ١٤ المعدلة من نظام المدارس الثانوية رقم ٢ لسنة ١٩٧٧ .
                </p>
                
                <p>تم التبليغ بواسطة : ....................................</p>
            </main>

            <footer className="text-left font-bold">
                <p>مدير المدرسة</p>
                <p>{settings.principalName}</p>
            </footer>
        </div>
    );

    return (
        <div className="w-[794px] h-[1123px] bg-white p-6 flex flex-col">
            <div className="border-2 border-black flex-grow mb-4">
                <Letter />
            </div>
            <div className="border-t-4 border-dashed border-gray-400 my-4"></div>
            <div className="border-2 border-black flex-grow mt-4">
                <Letter />
            </div>
        </div>
    );
}