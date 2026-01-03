import React, { useState } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { SchoolSettings } from '../../types.ts';
import { FileDown, Loader2, Settings, TableProperties, ArrowRight } from 'lucide-react';
import AbsenceDraftPage from './AbsenceDraftPage.tsx';

declare const jspdf: any;
declare const html2canvas: any;

export interface TableRowData {
  subject: string;
  date: string;
}

interface AbsenceDraftExporterProps {
    setCurrentPageKey: (key: any) => void;
    settings: SchoolSettings;
}

const PageWrapper = ({ title, children, onPrev, onNext }: { title: string, children?: React.ReactNode, onPrev: () => void, onNext: () => void }) => (
    <div className="bg-white p-8 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
            <button onClick={onPrev} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">&larr; الصفحة السابقة</button>
            <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
            <button onClick={onNext} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">الصفحة التالية &rarr;</button>
        </div>
        {children}
    </div>
);

const EditableCell = ({ value, onSave }: { value: string; onSave: (value: string) => void; }) => {
    return (
        <div
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onSave(e.currentTarget.innerText)}
            className={`p-2 w-full h-full focus:outline-none focus:bg-yellow-100 min-h-[10rem] flex items-center justify-center text-center`}
            dangerouslySetInnerHTML={{ __html: value.replace(/\n/g, '<br />') }}
        />
    );
};

const MultiRowCell = () => (
    <div className="flex flex-col h-full">
        <div className="flex-1 border-b-2 border-black"></div>
        <div className="flex-1 border-b-2 border-black"></div>
        <div className="flex-1 border-b-2 border-black"></div>
        <div className="flex-1"></div>
    </div>
);


const AbsenceFormTable = ({ examDays, tableData, onUpdate }: { examDays: number; tableData: TableRowData[]; onUpdate: (index: number, field: keyof TableRowData, value: string) => void; }) => {
    const observerBlocks = Math.ceil(examDays / 2);

    return (
        <div className="bg-white p-4 shadow-lg rounded-lg border">
            <div className="text-center font-bold mb-4 text-2xl" style={{ fontFamily: "'Times New Roman', serif" }}>
                <h1 className="text-orange-700">استمارة الغيابات اليومية للامتحانات</h1>
            </div>
            <table className="w-full border-collapse border-2 border-black text-center">
                <thead className="bg-yellow-400 font-bold text-lg">
                    <tr>
                        <th className="border-2 border-black p-2 w-[18%]">المادة</th>
                        <th className="border-2 border-black p-2 w-[12%]">التاريخ</th>
                        <th className="border-2 border-black p-2 w-[20%]">اسم المراقب</th>
                        <th className="border-2 border-black p-2 w-[20%]">اسم الغائب</th>
                        <th className="border-2 border-black p-2 w-[10%]">رقمة الامتحاني</th>
                        <th className="border-2 border-black p-2 w-[10%]">الصف</th>
                        <th className="border-2 border-black p-2 w-[10%]">التوقيع</th>
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
                                    <td className="border-2 border-black p-0"><EditableCell value={tableData[dayIndex1]?.subject || ''} onSave={(val) => onUpdate(dayIndex1, 'subject', val)} /></td>
                                    <td className="border-2 border-black p-0"><EditableCell value={tableData[dayIndex1]?.date || ''} onSave={(val) => onUpdate(dayIndex1, 'date', val)} /></td>
                                    <td className="border-2 border-black" style={{ minWidth: '150px' }}></td>
                                    <td className="border-2 border-black p-0" style={{ minWidth: '150px' }}><MultiRowCell /></td>
                                    <td className="border-2 border-black p-0"><MultiRowCell /></td>
                                    <td className="border-2 border-black p-0"><MultiRowCell /></td>
                                    <td className="border-2 border-black"></td>
                                </tr>
                                {isDay2Present && (
                                    <tr style={{ backgroundColor: '#dbeafe' }}>
                                        <td className="border-2 border-black p-0"><EditableCell value={tableData[dayIndex2]?.subject || ''} onSave={(val) => onUpdate(dayIndex2, 'subject', val)} /></td>
                                        <td className="border-2 border-black p-0"><EditableCell value={tableData[dayIndex2]?.date || ''} onSave={(val) => onUpdate(dayIndex2, 'date', val)} /></td>
                                        <td className="border-2 border-black" style={{ minWidth: '150px' }}></td>
                                        <td className="border-2 border-black p-0" style={{ minWidth: '150px' }}><MultiRowCell /></td>
                                        <td className="border-2 border-black p-0"><MultiRowCell /></td>
                                        <td className="border-2 border-black p-0"><MultiRowCell /></td>
                                        <td className="border-2 border-black"></td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default function AbsenceDraftExporter({ setCurrentPageKey, settings }: AbsenceDraftExporterProps) {
    const [examDays, setExamDays] = useState(6);
    const [hallCount, setHallCount] = useState(1);
    const [sectorCount, setSectorCount] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [tableData, setTableData] = useState<TableRowData[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    const handleShowForm = () => {
        setTableData(Array.from({ length: examDays }, () => ({ subject: '', date: '' })));
        setShowForm(true);
    };

    const handleUpdateTableData = (index: number, field: keyof TableRowData, value: string) => {
        setTableData(prev => {
            const newData = [...prev];
            newData[index] = { ...newData[index], [field]: value };
            return newData;
        });
    };

    const handleExportPdf = async () => {
        if (!showForm) {
            alert('يرجى إنشاء النموذج أولاً.');
            return;
        }

        setIsExporting(true);

        const { jsPDF } = jspdf;
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        const renderComponent = (component: React.ReactElement) => new Promise<void>(resolve => {
            root.render(component);
            setTimeout(resolve, 500);
        });

        try {
            await document.fonts.ready;
            for (let i = 0; i < sectorCount; i++) {
                const hallNumber = Math.floor(i / hallCount) + 1;
                const sectorNumber = i + 1;
                
                await renderComponent(
                    <AbsenceDraftPage
                        hallNumber={hallNumber}
                        sectorNumber={sectorNumber}
                        examDays={examDays}
                        tableData={tableData}
                    />
                );

                const reportElement = tempContainer.children[0] as HTMLElement;
                const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
            }
            pdf.save('استمارة_الغيابات.pdf');
        } catch (error) {
            console.error("PDF Export error:", error);
            alert(`حدث خطأ أثناء التصدير: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            root.unmount();
            if(document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
            }
            setIsExporting(false);
        }
    };

    return (
        <PageWrapper
            title="استمارة الغيابات اليومية للطلبة"
            onPrev={() => setCurrentPageKey('seating_charts')}
            onNext={() => setCurrentPageKey('exam_booklets_receipt')}
        >
            <div className="bg-gray-50 p-6 rounded-lg border shadow-sm space-y-8">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                        <Settings />
                        إعداد استمارة الغيابات اليومية
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div>
                            <label className="block text-md font-bold text-gray-700 mb-2">1. عدد أيام الامتحان</label>
                            <select value={examDays} onChange={e => setExamDays(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                {Array.from({ length: 6 }, (_, i) => i + 6).map(day => (
                                    <option key={day} value={day}>{day} أيام</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-md font-bold text-gray-700 mb-2">2. عدد القاعات</label>
                            <input type="number" value={hallCount} onChange={e => setHallCount(Number(e.target.value) || 1)} min="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-md font-bold text-gray-700 mb-2">3. عدد القطاعات</label>
                            <input type="number" value={sectorCount} onChange={e => setSectorCount(Number(e.target.value) || 1)} min="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-center gap-4 mt-4 border-t pt-6">
                    <button onClick={handleShowForm} className="flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition">
                        <TableProperties size={20} />
                        <span>{showForm ? 'تحديث النموذج' : 'إنشاء نموذج للمعاينة'}</span>
                    </button>
                    {showForm && (
                        <button onClick={handleExportPdf} disabled={isExporting} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition disabled:bg-gray-400">
                            {isExporting ? <Loader2 className="animate-spin" /> : <FileDown size={20} />}
                            <span>{isExporting ? 'جاري التصدير...' : 'تصدير PDF'}</span>
                        </button>
                    )}
                </div>
            </div>

            {showForm && (
                <div className="mt-8 overflow-x-auto">
                    <p className="text-center text-blue-600 font-semibold mb-4">
                        <ArrowRight className="inline-block animate-pulse" />
                        يمكنك الآن تعديل حقول "المادة" و "التاريخ" مباشرة في الجدول.
                    </p>
                    <AbsenceFormTable examDays={examDays} tableData={tableData} onUpdate={handleUpdateTableData} />
                </div>
            )}
        </PageWrapper>
    );
}