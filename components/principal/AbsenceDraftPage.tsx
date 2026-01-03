import React from 'react';

export interface TableRowData {
  subject: string;
  date: string;
}

interface AbsenceFormPDFPageProps {
    hallNumber: number;
    sectorNumber: number;
    examDays: number;
    tableData: TableRowData[];
}

const ShiftedCell = ({ children, className = "" }: { children?: React.ReactNode; className?: string; }) => {
    const liftStyle = { position: 'relative', top: '-7px', textAlign: 'center' } as React.CSSProperties;
    const content = typeof children === 'string' ? children.split('\n').map((line, i) => <div key={i}>{line}</div>) : children;
    
    return (
        <div className={`w-full h-full flex items-center justify-center p-1 ${className}`}>
          <div style={liftStyle}>{content}</div>
        </div>
    );
};

const MultiRowCell = () => (
    <div className="flex flex-col h-full">
        <div className="flex-1 border-b-2 border-black h-[23.5px]"></div>
        <div className="flex-1 border-b-2 border-black h-[23.5px]"></div>
        <div className="flex-1 border-b-2 border-black h-[23.5px]"></div>
        <div className="flex-1 h-[23.5px]"></div>
    </div>
);

export default function AbsenceFormPDFPage({ hallNumber, sectorNumber, examDays, tableData }: AbsenceFormPDFPageProps) {
    const observerBlocks = Math.ceil(examDays / 2);

    return (
        <div className="w-[794px] h-[1123px] bg-white p-6 flex flex-col font-['Cairo']" dir="rtl">
            <header className="flex justify-between items-center text-lg font-bold mb-4">
                <span className="w-1/3 text-left">رقم القاعة ( {hallNumber} )</span>
                <h1 className="w-1/3 text-center text-xl text-orange-700" style={{ fontFamily: "'Times New Roman', serif" }}>استمارة الغيابات اليومية للامتحانات</h1>
                <span className="w-1/3 text-right">رقم القطاع ( {sectorNumber} )</span>
            </header>

            <main className="flex-grow">
                 <table className="w-full border-collapse border-2 border-black text-center text-[10pt]">
                    <thead className="bg-yellow-400 font-bold">
                        <tr>
                            <th className="border-2 border-black p-1 w-[18%]"><ShiftedCell>المادة</ShiftedCell></th>
                            <th className="border-2 border-black p-1 w-[12%]"><ShiftedCell>التاريخ</ShiftedCell></th>
                            <th className="border-2 border-black p-1 w-[20%]"><ShiftedCell>اسم المراقب</ShiftedCell></th>
                            <th className="border-2 border-black p-1 w-[20%]"><ShiftedCell>اسم الغائب</ShiftedCell></th>
                            <th className="border-2 border-black p-1 w-[10%]"><ShiftedCell>رقمة الامتحاني</ShiftedCell></th>
                            <th className="border-2 border-black p-1 w-[10%]"><ShiftedCell>الصف</ShiftedCell></th>
                            <th className="border-2 border-black p-1 w-[10%]"><ShiftedCell>التوقيع</ShiftedCell></th>
                        </tr>
                    </thead>
                    <tbody>
                         {Array.from({ length: observerBlocks }).map((_, blockIndex) => {
                            const dayIndex1 = blockIndex * 2;
                            const dayIndex2 = dayIndex1 + 1;
                            const isDay2Present = dayIndex2 < examDays;

                            return (
                                <React.Fragment key={blockIndex}>
                                    <tr style={{ backgroundColor: '#fef9c3' }}>
                                        <td className="border-2 border-black font-bold h-[94px]"><ShiftedCell>{tableData[dayIndex1]?.subject}</ShiftedCell></td>
                                        <td className="border-2 border-black font-bold h-[94px]"><ShiftedCell>{tableData[dayIndex1]?.date}</ShiftedCell></td>
                                        <td className="border-2 border-black h-[94px]"></td>
                                        <td className="border-2 border-black p-0 h-[94px]"><MultiRowCell /></td>
                                        <td className="border-2 border-black p-0 h-[94px]"><MultiRowCell /></td>
                                        <td className="border-2 border-black p-0 h-[94px]"><MultiRowCell /></td>
                                        <td className="border-2 border-black h-[94px]"></td>
                                    </tr>
                                    {isDay2Present && (
                                        <tr style={{ backgroundColor: '#dbeafe' }}>
                                            <td className="border-2 border-black font-bold h-[94px]"><ShiftedCell>{tableData[dayIndex2]?.subject}</ShiftedCell></td>
                                            <td className="border-2 border-black font-bold h-[94px]"><ShiftedCell>{tableData[dayIndex2]?.date}</ShiftedCell></td>
                                            <td className="border-2 border-black h-[94px]"></td>
                                            <td className="border-2 border-black p-0 h-[94px]"><MultiRowCell /></td>
                                            <td className="border-2 border-black p-0 h-[94px]"><MultiRowCell /></td>
                                            <td className="border-2 border-black p-0 h-[94px]"><MultiRowCell /></td>
                                            <td className="border-2 border-black h-[94px]"></td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </main>
            <footer className="h-10"></footer>
        </div>
    );
}