import React from 'react';
import type { SchoolSettings } from '../../types.ts';
import type { ReportData, StageSubjectStats, StageOverallStats } from './OverallPercentagesManager.tsx';

interface OverallPercentagesPDFProps {
    settings: SchoolSettings;
    reportData: ReportData;
    pagesToRender?: { type: string, stageName?: string }[]; // For preview/chunked rendering
}

const LiftedHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ position: 'relative', bottom: '5px' }}>{children}</div>
);

const SubjectStatsPage: React.FC<{ settings: SchoolSettings, stageName: string, stats: StageSubjectStats[] }> = ({ settings, stageName, stats }) => {
    const schoolGender = settings.schoolGender === 'بنين' ? 'للبنين' : settings.schoolGender === 'بنات' ? 'للبنات' : 'المختلطة';
    
    return (
        <div className="w-[794px] h-[1123px] p-6 bg-white font-['Cairo'] flex flex-col" dir="rtl">
            <div className="border-4 border-yellow-400 p-1 flex-grow flex flex-col">
                <div className="border-2 border-black p-4 flex-grow flex flex-col">
                    <header className="text-center">
                        <h1 className="text-3xl font-bold">{settings.schoolName} {schoolGender}</h1>
                        <h2 className="text-2xl font-bold mt-2">للعام الدراسي {settings.academicYear} الدور الاول</h2>
                        <h3 className="text-4xl font-bold mt-4">احصائية النسب الكلية</h3>
                    </header>
                    <main className="flex-grow mt-8 flex">
                        <div className="w-[10%] bg-cyan-300 border-l-2 border-black flex items-center justify-center">
                            <h4 className="font-bold text-2xl whitespace-nowrap" style={{ transform: 'rotate(-90deg)' }}>
                                {stageName}
                            </h4>
                        </div>
                        <div className="w-[90%]">
                            <table className="w-full border-collapse">
                                <thead className="bg-yellow-300 text-black text-xl font-bold">
                                    <tr>
                                        <th className="border-2 border-black p-2 w-[35%]"><LiftedHeader>المادة</LiftedHeader></th>
                                        <th className="border-2 border-black p-2"><LiftedHeader>الممتحنون</LiftedHeader></th>
                                        <th className="border-2 border-black p-2"><LiftedHeader>الناجحون</LiftedHeader></th>
                                        <th className="border-2 border-black p-2"><LiftedHeader>الراسبون</LiftedHeader></th>
                                        <th className="border-2 border-black p-2"><LiftedHeader>الغائبون</LiftedHeader></th>
                                        <th className="border-2 border-black p-2"><LiftedHeader>نسبة النجاح</LiftedHeader></th>
                                    </tr>
                                </thead>
                                <tbody className="text-lg font-semibold">
                                    {stats.map((row, index) => (
                                        <tr key={row.subjectName} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                                            <td className="border-2 border-black p-2 text-right">{row.subjectName}</td>
                                            <td className="border-2 border-black p-2 text-center">{row.examined || '---'}</td>
                                            <td className="border-2 border-black p-2 text-center">{row.successful || '---'}</td>
                                            <td className="border-2 border-black p-2 text-center">{row.failing || '---'}</td>
                                            <td className="border-2 border-black p-2 text-center">{row.absent || '---'}</td>
                                            <td className="border-2 border-black p-2 text-center">{row.successRate}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

const SummaryPage: React.FC<{ settings: SchoolSettings, overallStats: StageOverallStats[], totalStats: StageOverallStats }> = ({ settings, overallStats, totalStats }) => {
    const schoolGender = settings.schoolGender === 'بنين' ? 'للبنين' : settings.schoolGender === 'بنات' ? 'للبنات' : 'المختلطة';
    const allStats = [...overallStats];
    if (overallStats.length > 1) {
        allStats.push(totalStats);
    }
    
    return (
         <div className="w-[794px] h-[1123px] p-6 bg-white font-['Cairo'] flex flex-col" dir="rtl">
             <div className="border-4 border-yellow-400 p-1 flex-grow flex flex-col">
                <div className="border-2 border-black p-4 flex-grow flex flex-col">
                    <header className="text-center">
                        <h1 className="text-2xl font-bold">{`الإحصائية الكلية لـ${settings.schoolName} ${schoolGender} بعد إضافة ${settings.decisionPoints} درجات`}</h1>
                        <h2 className="text-xl font-bold mt-2">{`للعام الدراسي ${settings.academicYear.replace('-', '/')} الدور الاول`}</h2>
                    </header>
                    <main className="flex-grow mt-8">
                        <table className="w-full border-collapse text-sm">
                            <thead className="bg-lime-200 font-bold text-center">
                                {/* Row 1 */}
                                <tr>
                                    <th className="border-2 border-black p-1 align-middle" rowSpan={3}><LiftedHeader>الصف</LiftedHeader></th>
                                    <th className="border-2 border-black p-1 align-middle" rowSpan={3}><LiftedHeader>المشاركون</LiftedHeader></th>
                                    <th className="border-2 border-black p-1 align-middle" colSpan={7}><LiftedHeader>الممتحنون</LiftedHeader></th>
                                    <th className="border-2 border-black p-1 align-middle" rowSpan={3}><LiftedHeader>الغائبون</LiftedHeader></th>
                                    <th className="border-2 border-black p-1 align-middle" colSpan={2}><LiftedHeader>نسبة النجاح</LiftedHeader></th>
                                </tr>
                                {/* Row 2 */}
                                <tr>
                                    <th className="border-2 border-black p-1 align-middle" rowSpan={2}><LiftedHeader>الناجحون</LiftedHeader></th>
                                    <th className="border-2 border-black p-1 align-middle" colSpan={4}><LiftedHeader>المكملون</LiftedHeader></th>
                                    <th className="border-2 border-black p-1 align-middle" rowSpan={2}><LiftedHeader>الراسبون</LiftedHeader></th>
                                    <th className="border-2 border-black p-1 align-middle" rowSpan={2}><LiftedHeader>مجموع الممتحنين</LiftedHeader></th>
                                    <th className="border-2 border-black p-1 align-middle" rowSpan={2}><LiftedHeader>المشاركين</LiftedHeader></th>
                                    <th className="border-2 border-black p-1 align-middle" rowSpan={2}><LiftedHeader>الناجحين</LiftedHeader></th>
                                </tr>
                                {/* Row 3 */}
                                <tr>
                                    <th className="border-2 border-black p-1"><LiftedHeader>بدرس</LiftedHeader></th>
                                    <th className="border-2 border-black p-1"><LiftedHeader>بدرسين</LiftedHeader></th>
                                    <th className="border-2 border-black p-1"><LiftedHeader>بثلاث دروس</LiftedHeader></th>
                                    <th className="border-2 border-black p-1"><LiftedHeader>مجموع المكملون</LiftedHeader></th>
                                </tr>
                            </thead>
                            <tbody className="text-center font-semibold text-base">
                                {allStats.map((row, index) => (
                                    <tr key={index} className={row.stageName === 'المجموع' ? 'bg-orange-200 font-bold' : 'bg-orange-50'}>
                                        <td className="border-2 border-black p-2">{row.stageName}</td>
                                        <td className="border-2 border-black p-2">{row.participants}</td>
                                        <td className="border-2 border-black p-2">{row.successful}</td>
                                        <td className="border-2 border-black p-2">{row.supplementary_1}</td>
                                        <td className="border-2 border-black p-2">{row.supplementary_2}</td>
                                        <td className="border-2 border-black p-2">{row.supplementary_3}</td>
                                        <td className="border-2 border-black p-2">{row.totalSupplementary}</td>
                                        <td className="border-2 border-black p-2">{row.totalFailing}</td>
                                        <td className="border-2 border-black p-2">{row.totalExamined}</td>
                                        <td className="border-2 border-black p-2">----</td>
                                        <td className="border-2 border-black p-2">{row.successRateParticipants === '---' ? '----' : row.successRateParticipants}</td>
                                        <td className="border-2 border-black p-2">{row.successRateExamined === '---' ? '----' : row.successRateExamined}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </main>
                </div>
            </div>
        </div>
    );
};


export default function OverallPercentagesPDF({ settings, reportData, pagesToRender }: OverallPercentagesPDFProps) {
    const { subjectStats, overallStats, totalOverallStats } = reportData;
    const pages = pagesToRender || [
        ...Object.keys(subjectStats).map(stageName => ({ type: 'subjects', stageName })),
        { type: 'summary' }
    ];

    return (
        <div>
            {pages.map((page, index) => {
                if (page.type === 'subjects' && page.stageName) {
                    const stageData = subjectStats[page.stageName];
                    if (!stageData) return null;
                    return <SubjectStatsPage key={`sub-${page.stageName}`} settings={settings} stageName={page.stageName} stats={stageData} />
                }
                if (page.type === 'summary') {
                    return <SummaryPage key="summary" settings={settings} overallStats={overallStats} totalStats={totalOverallStats} />
                }
                return null;
            })}
        </div>
    );
}