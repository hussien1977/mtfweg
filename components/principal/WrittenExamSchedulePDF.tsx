import React from 'react';
import type { SchoolSettings } from '../../types.ts';
import type { ScheduleState, ScheduleConfig } from './WrittenExamScheduleView.tsx';

interface WrittenExamSchedulePDFProps {
    settings: SchoolSettings;
    config: ScheduleConfig;
    schedule: ScheduleState;
    schoolLogo: string | null;
}

export default function WrittenExamSchedulePDF({ settings, config, schedule, schoolLogo }: WrittenExamSchedulePDFProps) {
    const liftStyle = { position: 'relative', bottom: '7px' } as React.CSSProperties;
    const notes = [
        'تمنع الاستعارة داخل القاعة الامتحانية',
        'الالتزام بالزي المناسب واللائق وسوف يحرم من الامتحان الطالب غير الملتزم',
        'كل من غش او حاول الغش يعتبر راسبا في جميع الدروس الذي غش فيه',
        'الالتزام بالنظام والهدوء داخل القاعة الامتحانية وبخلافة يعتبر عرقلة لسير الامتحانات ويعتبر الطالب المثير للفوضى راسبا في ذلك الدرس كما تنص التعليمات الامتحانية للمدارس الثانوية على ذلك',
        'يمنع منعا باتا ادخال اجهزة الموبايل والحاسبات العلمية الى قاعة الامتحان',
        'ينقل امتحان اليوم الذي يحل فيه عطله رسمية الى اليوم الذي يليه وبنفس الجدول الامتحاني المعلن',
    ];

    return (
        <div id="pdf-export-page" className="w-[794px] min-h-[1123px] bg-white p-6 font-['Cairo'] flex flex-col" dir="rtl">
            <div className="border-4 p-2 bg-white flex-grow flex flex-col">
                <div className="flex justify-between items-center text-center p-4">
                    <img src="https://i.imgur.com/JNUggOC.png" alt="شعار الوزارة" className="h-24 w-24 object-contain"/>
                    {schoolLogo ? (
                        <img src={schoolLogo} alt="School Logo" className="h-24 w-24 object-contain rounded-full border-2 p-1" />
                    ) : (
                        <div className="w-24 h-24"></div> /* Placeholder to maintain layout */
                    )}
                    <img src="https://i.imgur.com/nkaYlwI.png" alt="شعار النسر" className="h-24 w-24 object-contain"/>
                </div>
                <h2 className="text-2xl font-bold text-center">جدول امتحانات {config.examType}</h2>
                <h3 className="text-xl font-bold text-center">العام الدراسي {settings.academicYear} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; الدور : {config.examRound}</h3>
                

                <table className="w-full border-collapse border border-black my-4">
                    <thead>
                        <tr style={{ backgroundColor: '#fde047' }}> {/* Yellow */}
                            {schedule.columns.map((col, index) => (
                                <th key={col} className={`border border-black p-2 font-bold`} style={index === 2 ? { backgroundColor: '#bae6fd' } : {}}>
                                    <div style={liftStyle}>{col}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.values(schedule.tableData).map((rowData, rowIndex) => (
                            <tr key={rowIndex}>
                                {schedule.columns.map(colKey => (
                                    <td key={`${rowIndex}-${colKey}`} className="border border-black p-2 h-12 text-center align-middle font-semibold">
                                        <div style={liftStyle}>{rowData[colKey]}</div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                <div className="mt-4 flex-grow flex flex-col">
                    <p className="font-bold text-red-600 text-lg">
                        <div style={liftStyle}>
                             ملاحظة مهمة جدا" : يبدأ الامتحان الساعة {schedule.examTime}
                        </div>
                    </p>
                    <div className="pr-4 mt-2 space-y-1 font-semibold">
                        {notes.map((note, index) => (
                            <div key={index} className="flex items-start">
                                <span className="font-bold pl-2">{index + 1}-</span>
                                <div style={liftStyle}>{note}</div>
                            </div>
                        ))}
                    </div>
                    <div className="text-left mt-auto font-bold text-lg">
                        <p><div style={liftStyle}>مدير المدرسة</div></p>
                        <p><div style={liftStyle}>{settings.principalName}</div></p>
                    </div>
                </div>
            </div>
             <div className="h-8"></div>
        </div>
    );
}