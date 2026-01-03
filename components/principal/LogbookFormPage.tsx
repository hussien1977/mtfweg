import React, { useState, useEffect } from 'react';
import type { SchoolSettings } from '../../types.ts';

interface LogbookStudent {
    id: string;
    seq: number;
    firstName: string;
    fatherName: string;
    grandFatherName: string;
    greatGrandFatherName: string;
    birthYear: string;
    motherName: string;
    motherFatherName: string;
    notMuslim: string;
    languages: string;
    visionStatus: string;
    gender: string;
}
interface LogbookPage {
    students: LogbookStudent[];
}

interface LogbookFormPageProps {
    settings: SchoolSettings;
    pageData: LogbookPage;
    totalStudents: number;
    ministryLogo: string | null;
    onUpdate: (studentIndex: number, field: keyof LogbookStudent, value: string) => void;
    isPdfMode?: boolean;
}

const EditableCell: React.FC<{ value: string, onUpdate: (newValue: string), isPdfMode?: boolean, className?: string }> = ({ value, onUpdate, isPdfMode, className="" }) => {
    return (
        <td 
            className={`border-r border-black px-1 text-center font-semibold align-top ${className}`}
            contentEditable={!isPdfMode}
            suppressContentEditableWarning
            onBlur={(e) => onUpdate(e.currentTarget.innerText)}
        >
            {value}
        </td>
    );
};

const VerticalHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <th className={`p-0 text-xs w-[4%] h-20 relative ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
            <div 
                className="transform -rotate-90 whitespace-nowrap"
                style={{ direction: 'ltr' }}
            >
                {children}
            </div>
        </div>
    </th>
);


export default function LogbookFormPage({ settings, pageData, totalStudents, ministryLogo, onUpdate, isPdfMode = false }: LogbookFormPageProps) {

    return (
        <div className="w-[794px] h-[1123px] p-6 bg-white font-['Cairo'] flex flex-col" dir="rtl">
            
            <header className="text-lg">
                <div className="flex justify-between items-start">
                    <div className="text-center font-bold">
                        <p>وزارة التربية</p>
                        <p>اللجنة الدائمة للامتحانات العامة</p>
                    </div>
                    {ministryLogo ? (
                         <img src={ministryLogo} alt="شعار الوزارة" className="h-24 w-24 object-contain" />
                    ) : (
                        <div className="h-24 w-24"></div> // Placeholder to maintain layout
                    )}
                    <div className="text-center font-bold">
                        <p>مركز فحص الدراسة المتوسطة</p>
                        <p>بغداد / الكرخ</p>
                    </div>
                </div>
                <h1 className="text-center font-bold text-xl mt-2">
                    استمارة المعلومات الخاصة بالطلبة المشمولين بالامتحانات العامة للدراسة المتوسطة للعام الدراسي {settings.academicYear}
                </h1>
                <div className="flex justify-between font-bold mt-2">
                    <span>رمز المحافظة: {settings.governorateCode}</span>
                    <span>رمز المدرسة: {settings.schoolCode}</span>
                </div>
                 <div className="flex justify-between font-bold">
                    <span>اسم المحافظة: {settings.governorateName}</span>
                    <span>اسم المدرسة: {settings.schoolName}</span>
                </div>
            </header>

            <div className="border-2 border-black mt-2">
                <table className="w-full border-collapse text-base font-bold text-center font-['Calibri']">
                    <tbody>
                        <tr>
                            <td className="border-l-2 border-black w-[10%] align-top p-0">
                                <div className="h-full flex flex-col">
                                    <div className="p-1 border-b-2 border-black flex-1 flex items-start justify-center">
                                       {settings.schoolType === 'نهاري' && '✔ ' }نهاري
                                    </div>
                                    <div className="p-1 border-b-2 border-black flex-1 flex items-start justify-center">
                                       {settings.schoolType === 'مسائي' && '✔ ' }مسائي
                                    </div>
                                    <div className="p-1 flex-1 flex items-start justify-center">
                                       {settings.schoolType === 'خارجي' && '✔ ' }خارجي
                                    </div>
                                </div>
                            </td>
                            <td className="border-l-2 border-black w-[25%] p-0 align-top">
                                <div className="h-full flex flex-col">
                                    <div className="p-1 border-b-2 border-black flex-1 flex items-start justify-start text-right px-2">
                                        اسم المدير:<br />{settings.principalName}
                                    </div>
                                    <div className="p-1 flex-1 flex items-start justify-start text-right px-2">
                                        موبايل المدير:<br />{settings.principalPhone}
                                    </div>
                                </div>
                            </td>
                            <td className="border-l-2 border-black w-[15%] p-0 align-top">
                                <div className="h-full flex flex-col justify-start">
                                    <div className="border-b-2 border-black p-1 text-center">
                                        درجة المدرسة
                                    </div>
                                    <div className="flex text-center">
                                        <div className="w-1/2 p-1 border-l-2 border-black">
                                            <div>ثانوية</div>
                                            <div className="h-5 flex items-center justify-center">{settings.schoolLevel === 'ثانوية' ? '✔' : ''}</div>
                                        </div>
                                        <div className="w-1/2 p-1">
                                            <div>متوسطة</div>
                                            <div className="h-5 flex items-center justify-center">{settings.schoolLevel === 'متوسطة' ? '✔' : ''}</div>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="border-l-2 border-black w-[15%] p-0 align-top">
                                 <div className="h-full flex flex-col justify-start">
                                    <div className="border-b-2 border-black p-1 text-center">جنس المدرسة</div>
                                    <div className="flex text-center">
                                        <div className="w-1/3 p-1 border-l-2 border-black">
                                            <div>مختلط</div>
                                            <div className="h-5 flex items-center justify-center">{settings.schoolGender === 'مختلط' ? '✔' : ''}</div>
                                        </div>
                                        <div className="w-1/3 p-1 border-l-2 border-black">
                                            <div>بنات</div>
                                            <div className="h-5 flex items-center justify-center">{settings.schoolGender === 'بنات' ? '✔' : ''}</div>
                                        </div>
                                        <div className="w-1/3 p-1">
                                            <div>بنين</div>
                                            <div className="h-5 flex items-center justify-center">{settings.schoolGender === 'بنين' ? '✔' : ''}</div>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="border-l-2 border-black w-[10%] p-0 align-top">
                                <div className="h-full flex flex-col justify-start">
                                    <div className="p-1 border-b-2 border-black">القضاء</div>
                                    <div className="p-1">{settings.district}</div>
                                </div>
                            </td>
                            <td className="border-l-2 border-black w-[10%] p-0 align-top">
                                <div className="h-full flex flex-col justify-start">
                                    <div className="p-1 border-b-2 border-black">الناحية</div>
                                    <div className="p-1">{settings.subdistrict}</div>
                                </div>
                            </td>
                            <td className="w-[15%] p-0 align-top">
                                <div className="h-full flex flex-col justify-start">
                                    <div className="border-b-2 border-black p-1 text-center">عدد الطلاب</div>
                                    <div className="flex border-b-2 border-black">
                                        <div className="w-1/2 p-1 border-l-2 border-black">اناث</div>
                                        <div className="w-1/2 p-1">ذكور</div>
                                    </div>
                                    <div className="flex">
                                        <div className="w-1/2 p-1 border-l-2 border-black">{settings.schoolGender === 'بنات' ? totalStudents : ''}</div>
                                        <div className="w-1/2 p-1">{settings.schoolGender !== 'بنات' ? totalStudents : ''}</div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <main className="flex-grow mt-2">
                <table className="w-full border-collapse border-2 border-black text-sm font-['Calibri']">
                    <thead className="font-bold">
                        <tr className="divide-x-2 divide-black bg-gray-100">
                            <th className="p-1 w-[3%]">ت</th>
                            <th className="p-1 w-[11%]">اسم الطالب</th>
                            <th className="p-1 w-[11%]">اسم الاب</th>
                            <th className="p-1 w-[11%]">اسم الجد</th>
                            <th className="p-1 w-[11%]">اسم اب الجد</th>
                            <th className="p-1 w-[8%]">سنة التولد</th>
                            <th className="p-1 w-[11%]">اسم الام</th>
                            <th className="p-1 w-[11%]">اسم اب الام</th>
                            <VerticalHeader>غير مسلم 2</VerticalHeader>
                            <VerticalHeader>اللغات 3</VerticalHeader>
                            <VerticalHeader>البصير 9</VerticalHeader>
                            <th className="p-0 text-[10px] w-[4%] h-20 border-x-2 border-black">
                                <div className="h-full flex flex-col items-center justify-around font-bold leading-tight">
                                    <span>ذكر</span>
                                    <span>۱</span>
                                    <span className="w-1/2 border-b border-black my-0.5"></span>
                                    <span>انثى</span>
                                    <span>۲</span>
                                </div>
                            </th>
                            <th className="p-1 w-[7%]">الملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageData.students.map((s, index) => (
                             <tr key={s.id} className="h-7 border-t-2 border-black">
                                <td className={`border-r border-black text-center align-top`}>{s.seq}</td>
                                <EditableCell value={s.firstName} onUpdate={v => onUpdate(index, 'firstName', v)} isPdfMode={isPdfMode} className="w-[11%]" />
                                <EditableCell value={s.fatherName} onUpdate={v => onUpdate(index, 'fatherName', v)} isPdfMode={isPdfMode} className="w-[11%]" />
                                <EditableCell value={s.grandFatherName} onUpdate={v => onUpdate(index, 'grandFatherName', v)} isPdfMode={isPdfMode} className="w-[11%]" />
                                <EditableCell value={s.greatGrandFatherName} onUpdate={v => onUpdate(index, 'greatGrandFatherName', v)} isPdfMode={isPdfMode} className="w-[11%]" />
                                <EditableCell value={s.birthYear} onUpdate={v => onUpdate(index, 'birthYear', v)} isPdfMode={isPdfMode} className="w-[8%]" />
                                <EditableCell value={s.motherName} onUpdate={v => onUpdate(index, 'motherName', v)} isPdfMode={isPdfMode} className="w-[11%]" />
                                <EditableCell value={s.motherFatherName} onUpdate={v => onUpdate(index, 'motherFatherName', v)} isPdfMode={isPdfMode} className="w-[11%]" />
                                <EditableCell value={s.notMuslim} onUpdate={v => onUpdate(index, 'notMuslim', v)} isPdfMode={isPdfMode} />
                                <EditableCell value={s.languages} onUpdate={v => onUpdate(index, 'languages', v)} isPdfMode={isPdfMode} />
                                <EditableCell value={s.visionStatus} onUpdate={v => onUpdate(index, 'visionStatus', v)} isPdfMode={isPdfMode} />
                                <EditableCell value={s.gender} onUpdate={v => onUpdate(index, 'gender', v)} isPdfMode={isPdfMode} />
                                <td className={`border-r border-black text-center align-top`}></td>
                            </tr>
                        ))}
                        {/* Render empty rows to fill the page */}
                        {Array.from({ length: 25 - pageData.students.length }).map((_, i) => (
                             <tr key={`empty-${i}`} className="h-7 border-t-2 border-black">
                                <td className={`border-r border-black text-center align-top`}>{pageData.students.length > 0 ? pageData.students[0].seq + pageData.students.length + i : i+1}</td>
                                 {[...Array(12)].map((_, j) => <td key={j} className={`border-r border-black align-top`}></td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>
        </div>
    );
}
