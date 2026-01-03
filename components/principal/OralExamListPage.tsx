import React from 'react';
import type { ClassData, SchoolSettings, Student } from '../../types.ts';

interface OralExamListPageProps {
    settings: SchoolSettings;
    logos: { school: string | null; ministry: string | null };
    students: Student[];
    classData?: ClassData;
    subjectName: string;
    pageInfo: {
        pageNumber: number;
        totalPages: number;
    };
    isExporting: boolean;
    committeeMemberName?: string;
    committeeHeadName?: string;
    examRound: string;
    examType: string;
    startingIndex: number;
}

const LiftedCellContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ position: 'relative', bottom: '6px' }}>{children}</div>
);

export default function OralExamListPage({ settings, logos, students, classData, subjectName, pageInfo, isExporting, committeeMemberName = '', committeeHeadName = '', examRound, examType, startingIndex }: OralExamListPageProps) {
    if (!classData) return <div>لا توجد بيانات للصف</div>;

    const templateType = subjectName === 'اللغة العربية' ? 'arabic' : (subjectName === 'اللغة الانكليزية' ? 'english' : (subjectName === 'التربية الاسلامية' ? 'islamic' : (subjectName === 'الحاسوب' ? 'computer' : (subjectName === 'اللغة الفرنسية' ? 'french' : 'default'))));
    
    const displayRows = students;

    const cellContentStyle: React.CSSProperties = { position: 'relative', bottom: '6px' };
    const liftedHeaderContentStyle: React.CSSProperties = { position: 'relative', bottom: '5px' };
    const islamicLiftedHeaderContentStyle: React.CSSProperties = { position: 'relative', bottom: '6px' };

    const PageHeader = () => (
        <header className="mb-4">
            <div className="flex justify-between items-start mb-2">
                <div className="w-1/4 flex flex-col items-center">
                    <div className="w-16 h-16 border-2 border-black rounded-full flex items-center justify-center mb-1">
                        {logos.ministry ? <img src={logos.ministry} alt="شعار الوزارة" className="h-full w-full object-contain p-1 rounded-full" /> : <span className="text-[10px]">شعار الوزارة</span>}
                    </div>
                    <p className="text-[9px] font-bold">جمهورية العراق</p>
                    <p className="text-xs font-bold">وزارة التربية</p>
                </div>

                <div className="flex-grow text-center">
                    <h1 className="text-xl font-bold text-red-600">درجات الامتحان الشفهي</h1>
                    <p className="text-sm font-bold mt-1">للعام الدراسي ( {settings.academicYear} ) الدور {examRound} - {examType}</p>
                    <div className="mt-2 bg-cyan-100 border-y border-cyan-800 py-1 flex justify-center gap-8 font-bold text-cyan-900 shadow-sm">
                        <span>المادة: {subjectName}</span>
                        <span>الصف: {classData.stage}</span>
                        <span>الشعبة: {classData.section}</span>
                    </div>
                </div>

                <div className="w-1/4 flex flex-col items-center">
                    <div className="w-16 h-16 border-2 border-black rounded-full flex items-center justify-center mb-1">
                        {logos.school ? <img src={logos.school} alt="شعار المدرسة" className="h-full w-full object-contain p-1 rounded-full" /> : <span className="text-[10px]">شعار المدرسة</span>}
                    </div>
                    <p className="text-xs font-bold">{settings.schoolName}</p>
                </div>
            </div>
        </header>
    );

    const PageFooter = () => (
        <footer className="mt-6 border-t-2 border-dashed border-gray-400 pt-4 pb-2">
            <div className="flex justify-between items-end font-bold text-sm px-4">
                <div className="text-center">
                    <p className="mb-12">مدرس المادة</p>
                    <p className="border-t border-black pt-1 px-4">..................................</p>
                </div>
                <div className="text-center">
                    <p className="mb-12">عضو لجنة</p>
                    <p className="border-t border-black pt-1 px-4">..................................</p>
                </div>
                <div className="text-center">
                    <p className="mb-12">عضو لجنة</p>
                    <p className="border-t border-black pt-1 px-4">..................................</p>
                </div>
                <div className="text-center">
                    <p className="text-gray-600 mb-1">مدير المدرسة</p>
                    <p className="text-lg font-black mb-12">{settings.principalName}</p>
                    <p className="border-t border-black pt-1 px-4">التوقيع والختم</p>
                </div>
            </div>
            <div className="text-center text-[10px] text-gray-400 mt-4">
                صفحة {pageInfo.pageNumber} من {pageInfo.totalPages} | نظام تربوي تك للإدارة المدرسية
            </div>
        </footer>
    );

    const renderFrenchTemplate = () => (
        <div className="w-[794px] h-[1123px] p-6 bg-white flex flex-col font-['Cairo'] border-2 border-black" dir="rtl">
            <PageHeader />
            <main className="flex-grow">
                <table className="w-full border-collapse border-2 border-black text-sm">
                    <thead className="font-bold text-center" style={{ backgroundColor: '#fbe9e7' }}>
                        <tr>
                            <th rowSpan={2} className="border-2 border-black p-1 w-[4%] align-middle"><LiftedCellContent>ت</LiftedCellContent></th>
                            <th rowSpan={2} className="border-2 border-black p-1 w-[25%] align-middle"><LiftedCellContent>اسم الطالب</LiftedCellContent></th>
                            <th className="border-2 border-black p-1 w-[7%]"><LiftedCellContent>G.q.</LiftedCellContent></th>
                            <th className="border-2 border-black p-1 w-[7%]"><LiftedCellContent>V.</LiftedCellContent></th>
                            <th className="border-2 border-black p-1 w-[7%]"><LiftedCellContent>P.</LiftedCellContent></th>
                            <th className="border-2 border-black p-1 w-[7%]"><LiftedCellContent>D.</LiftedCellContent></th>
                            <th colSpan={2} className="border-2 border-black p-1"><LiftedCellContent>الدرجة النهائية</LiftedCellContent></th>
                            <th rowSpan={2} className="border-2 border-black p-1 align-middle"><LiftedCellContent>الملاحظات</LiftedCellContent></th>
                        </tr>
                        <tr style={{ backgroundColor: '#fbe9e7' }}>
                            <th className="border-2 border-black p-1 font-normal">10</th>
                            <th className="border-2 border-black p-1 font-normal">10</th>
                            <th className="border-2 border-black p-1 font-normal">10</th>
                            <th className="border-2 border-black p-1 font-normal">10</th>
                            <th className="border-2 border-black p-1 font-normal w-[7%]">رقما</th>
                            <th className="border-2 border-black p-1 font-normal w-[15%]">كتابة</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayRows.map((student, index) => (
                             <tr key={student.id} className="h-9" style={{ backgroundColor: index % 2 !== 0 ? '#fff3e0' : 'white' }}>
                                <td className="border-2 border-black text-center font-black bg-yellow-300"><LiftedCellContent>{startingIndex + index + 1}</LiftedCellContent></td>
                                <td className="border-2 border-black px-2 text-right font-semibold whitespace-nowrap"><LiftedCellContent>{student.name}</LiftedCellContent></td>
                                <td className="border-2 border-black"></td>
                                <td className="border-2 border-black"></td>
                                <td className="border-2 border-black"></td>
                                <td className="border-2 border-black"></td>
                                <td className="border-2 border-black"></td>
                                <td className="border-2 border-black"></td>
                                <td className="border-2 border-black"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>
            <PageFooter />
        </div>
    );

    const renderComputerTemplate = () => (
        <div className="w-[794px] h-[1123px] p-6 bg-white flex flex-col font-['Cairo'] border-2 border-black" dir="rtl">
            <PageHeader />
            <main className="flex-grow">
                <table className="w-full border-collapse border-2 border-black text-sm">
                    <thead className="font-bold text-center">
                        <tr className="bg-pink-200">
                            <th rowSpan={2} className="border-2 border-black p-1 w-[4%] align-middle"><LiftedCellContent>ت</LiftedCellContent></th>
                            <th rowSpan={2} className="border-2 border-black p-1 w-[36%] align-middle"><LiftedCellContent>اسم الطالب</LiftedCellContent></th>
                            <th colSpan={2} className="border-2 border-black p-1"><LiftedCellContent>الدرجة</LiftedCellContent></th>
                            <th rowSpan={2} className="border-2 border-black p-1 align-middle"><LiftedCellContent>الملاحظات</LiftedCellContent></th>
                        </tr>
                        <tr className="bg-pink-100">
                            <th className="border-2 border-black p-1 w-[15%]"><LiftedCellContent>رقما</LiftedCellContent></th>
                            <th className="border-2 border-black p-1 w-[25%]"><LiftedCellContent>كتابة</LiftedCellContent></th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayRows.map((student, index) => (
                            <tr key={student.id} className="h-9" style={{ backgroundColor: index % 2 !== 0 ? '#fdf2f8' : 'white' }}>
                                <td className="border-2 border-black text-center font-black bg-yellow-300"><LiftedCellContent>{startingIndex + index + 1}</LiftedCellContent></td>
                                <td className="border-2 border-black px-2 text-right font-semibold whitespace-nowrap"><LiftedCellContent>{student.name}</LiftedCellContent></td>
                                <td className="border-2 border-black"></td>
                                <td className="border-2 border-black"></td>
                                <td className="border-2 border-black"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>
            <PageFooter />
        </div>
    );

    const renderIslamicTemplate = () => (
        <table className="w-full border-collapse border-2 border-black text-sm">
            <thead className="font-bold text-center">
                <tr style={{ backgroundColor: '#fde047' }}>
                    <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[4%]" style={{ position: 'relative', zIndex: 10 }}>ت</th>
                    <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[24%]" style={{ position: 'relative', zIndex: 10 }}>اسم الطالب</th>
                    <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[8%]" style={{ position: 'relative', zIndex: 10 }}>الرقم<br/>الامتحاني</th>
                    
                    <th className="border-2 border-black p-1" style={{backgroundColor: '#bbf7d0'}}><div style={islamicLiftedHeaderContentStyle}>الحفظ</div></th>
                    <th className="border-2 border-black p-1" style={{backgroundColor: '#bbf7d0'}}><div style={islamicLiftedHeaderContentStyle}>التلاوة</div></th>
                    <th className="border-2 border-black p-1" style={{backgroundColor: '#bbf7d0'}}><div style={islamicLiftedHeaderContentStyle}>المعاني</div></th>
                    <th className="border-2 border-black p-1" style={{backgroundColor: '#bbf7d0'}}><div style={islamicLiftedHeaderContentStyle}>التفسير</div></th>

                    <th colSpan={2} className="border-2 border-black p-1" style={{backgroundColor: '#fed7aa'}}><div style={islamicLiftedHeaderContentStyle}>الدرجة</div></th>
                    
                    <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[20%]" style={{backgroundColor: '#fde68a', position: 'relative', zIndex: 10 }}>الملاحظات</th>
                </tr>
                <tr style={{ backgroundColor: '#fde047' }}>
                    <th className="border-2 border-black p-1 font-normal w-[6%]" style={{backgroundColor: '#bbf7d0'}}>3</th>
                    <th className="border-2 border-black p-1 font-normal w-[6%]" style={{backgroundColor: '#bbf7d0'}}>3</th>
                    <th className="border-2 border-black p-1 font-normal w-[6%]" style={{backgroundColor: '#bbf7d0'}}>2</th>
                    <th className="border-2 border-black p-1 font-normal w-[6%]" style={{backgroundColor: '#bbf7d0'}}>2</th>
                    
                    <th className="border-2 border-black p-1 font-normal w-[8%]" style={{backgroundColor: '#fed7aa'}}>رقما"</th>
                    <th className="border-2 border-black p-1 font-normal w-[12%]" style={{backgroundColor: '#fed7aa'}}>كتابة</th>
                </tr>
            </thead>
            <tbody>
                {displayRows.map((student, index) => (
                    <tr key={student.id} className="h-9" style={{backgroundColor: index % 2 === 0 ? '#fefce8' : '#eff6ff'}}>
                        <td className="border-2 border-black text-center w-[4%] font-black bg-yellow-300"><div style={cellContentStyle}>{startingIndex + index + 1}</div></td>
                        <td className="border-2 border-black px-2 text-right font-semibold w-[24%] whitespace-nowrap"><div style={cellContentStyle}>{student.name}</div></td>
                        <td className="border-2 border-black px-2 text-center w-[8%] font-black bg-yellow-300"><div style={cellContentStyle}>{student.examId}</div></td>
                        <td className="border-2 border-black w-[6%]"></td>
                        <td className="border-2 border-black w-[6%]"></td>
                        <td className="border-2 border-black w-[6%]"></td>
                        <td className="border-2 border-black w-[6%]"></td>
                        <td className="border-2 border-black w-[8%]"></td>
                        <td className="border-2 border-black w-[12%]"></td>
                        <td className="border-2 border-black w-[20%]"></td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderArabicFirstTemplateHeaders = () => (
        <thead className="font-bold text-center">
            <tr className="bg-orange-300">
                <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[4%]" style={{ position: 'relative', zIndex: 10 }}>ت</th>
                <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[25%]" style={{ position: 'relative', zIndex: 10 }}>اسم الطالب</th>
                <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[6%]" style={{ position: 'relative', zIndex: 10 }}>الرقم<br/>الامتحاني</th>
                <th className="border-2 border-black p-1" style={{backgroundColor: '#dcfce7'}}><div style={liftedHeaderContentStyle}>القراءة</div></th>
                <th className="border-2 border-black p-1" style={{backgroundColor: '#dcfce7'}}><div style={liftedHeaderContentStyle}>القواعد</div></th>
                <th className="border-2 border-black p-1" style={{backgroundColor: '#dcfce7'}}><div style={liftedHeaderContentStyle}>المعاني</div></th>
                <th className="border-2 border-black p-1" style={{backgroundColor: '#dcfce7'}}><div style={liftedHeaderContentStyle}>المحفوظات</div></th>
                <th colSpan={2} className="border-2 border-black p-1" style={{backgroundColor: '#dcfce7'}}><div style={liftedHeaderContentStyle}>المجموع</div></th>
                <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[25%]" style={{ position: 'relative', zIndex: 10 }}>الملاحظات</th>
            </tr>
            <tr className="bg-orange-300">
                <th className="border-2 border-black p-1 font-normal w-[5%]"><div>5</div><div>درجات</div></th>
                <th className="border-2 border-black p-1 font-normal w-[5%]"><div>5</div><div>درجات</div></th>
                <th className="border-2 border-black p-1 font-normal w-[5%]"><div>5</div><div>درجات</div></th>
                <th className="border-2 border-black p-1 font-normal w-[5%]"><div>5</div><div>درجات</div></th>
                <th className="border-2 border-black p-1 font-normal w-[5%]">رقما"</th>
                <th className="border-2 border-black p-1 font-normal w-[15%]">كتابة</th>
            </tr>
        </thead>
    );

    const renderArabicSecondTemplateHeaders = () => (
         <thead className="font-bold text-center">
            <tr className="bg-orange-300">
                <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[4%]" style={{ position: 'relative', zIndex: 10 }}>ت</th>
                <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[25%]" style={{ position: 'relative', zIndex: 10 }}>اسم الطالب</th>
                <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[6%]" style={{ position: 'relative', zIndex: 10 }}>الرقم<br/>الامتحاني</th>
                <th className="border-2 border-black p-1" style={{backgroundColor: '#dcfce7'}}><div style={liftedHeaderContentStyle}>القراءة</div></th>
                <th className="border-2 border-black p-1" style={{backgroundColor: '#dcfce7'}}><div style={liftedHeaderContentStyle}>القواعد</div></th>
                <th className="border-2 border-black p-1" style={{backgroundColor: '#dcfce7'}}><div style={liftedHeaderContentStyle}>المعاني</div></th>
                <th colSpan={2} className="border-2 border-black p-1" style={{backgroundColor: '#dcfce7'}}><div style={liftedHeaderContentStyle}>المجموع</div></th>
                <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[20%]" style={{ position: 'relative', zIndex: 10 }}>الملاحظات</th>
            </tr>
            <tr className="bg-orange-300">
                <th className="border-2 border-black p-1 font-normal w-[6%]"><div>۱۰</div><div>درجات</div></th>
                <th className="border-2 border-black p-1 font-normal w-[6%]"><div>٥</div><div>درجات</div></th>
                <th className="border-2 border-black p-1 font-normal w-[6%]"><div>٥</div><div>درجات</div></th>
                <th className="border-2 border-black p-1 font-normal w-[6%]">رقما"</th>
                <th className="border-2 border-black p-1 font-normal w-[15%]">كتابة</th>
            </tr>
        </thead>
    );

    const renderEnglishTemplateHeaders = () => (
        <thead className="font-bold text-center">
            <tr style={{ backgroundColor: '#ccfbf1' }}>
                <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[4%]" style={{ position: 'relative', zIndex: 10 }}>ت</th>
                <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[25%]" style={{ position: 'relative', zIndex: 10 }}>اسم الطالب</th>
                <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[8%]" style={{ position: 'relative', zIndex: 10 }}>الرقم<br/>الامتحاني</th>
                <th className="border-2 border-black p-1" style={{backgroundColor: '#bbf7d0'}}>S</th>
                <th className="border-2 border-black p-1" style={{backgroundColor: '#bbf7d0'}}>R</th>
                <th className="border-2 border-black p-1" style={{backgroundColor: '#bbf7d0'}}>L</th>
                <th className="border-2 border-black p-1" style={{backgroundColor: '#bbf7d0'}}>Total</th>
                <th className="border-2 border-black p-1" style={{backgroundColor: '#fed7aa'}}>المجموع</th>
                <th rowSpan={2} className="border-2 border-black p-1 align-middle w-[20%]" style={{backgroundColor: '#fef08a', position: 'relative', zIndex: 10 }}>الملاحظات</th>
            </tr>
            <tr style={{ backgroundColor: '#ccfbf1' }}>
                <th className="border-2 border-black p-1 font-normal w-[6%]" style={{backgroundColor: '#bbf7d0'}}>10</th>
                <th className="border-2 border-black p-1 font-normal w-[6%]" style={{backgroundColor: '#bbf7d0'}}>10</th>
                <th className="border-2 border-black p-1 font-normal w-[6%]" style={{backgroundColor: '#bbf7d0'}}>10</th>
                <th className="border-2 border-black p-1 font-normal w-[6%]" style={{backgroundColor: '#bbf7d0'}}>30</th>
                <th className="border-2 border-black p-1 font-normal w-[15%]" style={{backgroundColor: '#fed7aa'}}>كتابة</th>
            </tr>
        </thead>
    );

    const renderTable = () => {
        switch (templateType) {
            case 'french':
                return renderFrenchTemplate();
            case 'computer':
                return renderComputerTemplate();
            case 'islamic':
                return renderIslamicTemplate();
            case 'english':
                return (
                    <table className="w-full border-collapse border-2 border-black text-sm">
                        {renderEnglishTemplateHeaders()}
                        <tbody>
                            {displayRows.map((student, index) => (
                                <tr key={student.id} className="h-9" style={{backgroundColor: index % 2 === 0 ? '#fefce8' : '#eff6ff'}}>
                                    <td className="border-2 border-black text-center w-[4%] font-black bg-yellow-300"><div style={cellContentStyle}>{startingIndex + index + 1}</div></td>
                                    <td className="border-2 border-black px-2 text-right font-semibold w-[25%] whitespace-nowrap"><div style={cellContentStyle}>{student.name}</div></td>
                                    <td className="border-2 border-black px-2 text-center w-[8%] font-black bg-yellow-300"><div style={cellContentStyle}>{student.examId}</div></td>
                                    <td className="border-2 border-black w-[6%]"></td>
                                    <td className="border-2 border-black w-[6%]"></td>
                                    <td className="border-2 border-black w-[6%]"></td>
                                    <td className="border-2 border-black w-[6%]"></td>
                                    <td className="border-2 border-black w-[15%]"></td>
                                    <td className="border-2 border-black w-[20%]"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'arabic':
                const useFirstArabicTemplate = classData.stage === 'الاول متوسط' || classData.stage === 'الثاني متوسط';
                return (
                    <table className="w-full border-collapse border-2 border-black text-sm">
                        {useFirstArabicTemplate ? renderArabicFirstTemplateHeaders() : renderArabicSecondTemplateHeaders()}
                        <tbody>
                            {displayRows.map((student, index) => (
                                <tr key={student.id} className="h-9" style={{backgroundColor: index % 2 === 0 ? '#fefce8' : '#eff6ff'}}>
                                    <td className="border-2 border-black text-center w-[4%] font-black bg-yellow-300"><div style={cellContentStyle}>{startingIndex + index + 1}</div></td>
                                    <td className="border-2 border-black px-2 text-right font-semibold w-[25%] whitespace-nowrap"><div style={cellContentStyle}>{student.name}</div></td>
                                    <td className="border-2 border-black px-2 text-center w-[6%] font-black bg-yellow-300"><div style={cellContentStyle}>{student.examId}</div></td>
                                    <td className={`border-2 border-black ${useFirstArabicTemplate ? 'w-[5%]' : 'w-[6%]'}`}></td>
                                    <td className={`border-2 border-black ${useFirstArabicTemplate ? 'w-[5%]' : 'w-[6%]'}`}></td>
                                    <td className={`border-2 border-black ${useFirstArabicTemplate ? 'w-[5%]' : 'w-[6%]'}`}></td>
                                    {useFirstArabicTemplate && <td className="border-2 border-black w-[5%]"></td>}
                                    <td className={`border-2 border-black ${useFirstArabicTemplate ? 'w-[5%]' : 'w-[6%]'}`}></td>
                                    <td className="border-2 border-black w-[15%]"></td>
                                    <td className={`border-2 border-black ${useFirstArabicTemplate ? 'w-[25%]' : 'w-[20%]'}`}></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            default:
                return <p>No specific template available for this subject.</p>;
        }
    };
    
    const MainContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <div className="w-[794px] h-[1123px] p-6 bg-white flex flex-col font-['Cairo'] border-2 border-black" dir="rtl">
            {children}
        </div>
    );

    if (templateType === 'computer' || templateType === 'french') {
        return renderTable();
    }

    return (
        <MainContainer>
            <PageHeader />
            <main className="flex-grow">
                {renderTable()}
            </main>
            <PageFooter />
        </MainContainer>
    );
}
