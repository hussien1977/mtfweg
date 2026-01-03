import React, { useState, useRef } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { SchoolSettings } from '../../types.ts';
import { GRADE_LEVELS } from '../../constants.ts';
import { Upload, Printer, Loader2 } from 'lucide-react';

declare const jspdf: any;
declare const html2canvas: any;

interface ExaminationRecordProps {
    settings: SchoolSettings;
}

// Editable inline span
const EditableSpan = ({ value, onChange, className = '' }: { value: string, onChange: (val: string) => void, className?: string }) => {
    return (
        <span
            contentEditable
            suppressContentEditableWarning
            onBlur={e => onChange(e.currentTarget.innerText)}
            className={`px-2 py-1 rounded-sm focus:outline-none focus:bg-yellow-100 min-w-[50px] inline-block border-b-2 border-dotted border-gray-400 focus:border-solid ${className}`}
        >{value}</span>
    );
};

// Logo Uploader component
const LogoUploader = ({ logo, onLogoChange, label, isExporting }: { logo: string | null, onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void, label: string, isExporting: boolean }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (isExporting) {
        return (
            <div className="w-32 h-32 rounded-full flex items-center justify-center">
                {logo ? <img src={logo} alt={label} className="w-full h-full object-contain rounded-full" /> : <div className="w-32 h-32"></div>}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            <div
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 rounded-full border-2 border-black flex items-center justify-center text-center cursor-pointer bg-white hover:bg-gray-100"
            >
                {logo ? (
                    <img src={logo} alt={label} className="w-full h-full object-contain rounded-full" />
                ) : (
                    <span className="text-gray-500">{label}</span>
                )}
            </div>
            <input type="file" ref={fileInputRef} onChange={onLogoChange} accept="image/*" className="hidden" />
        </div>
    );
};

export default function ExaminationRecord({ settings }: ExaminationRecordProps) {
    const [ministryLogo, setMinistryLogo] = useState<string | null>(null);
    const [educationLogo, setEducationLogo] = useState<string | null>(null);
    const [material, setMaterial] = useState('...........');
    const [date, setDate] = useState({ day: '..', month: '..', year: '٢٠٢' });
    const [selectedStage, setSelectedStage] = useState('الاول متوسط');
    const [selectedRole, setSelectedRole] = useState('الاول');
    const [isExporting, setIsExporting] = useState(false);
    
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'ministry' | 'education') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                if (type === 'ministry') setMinistryLogo(result);
                else setEducationLogo(result);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleExportPdf = async () => {
        setIsExporting(true);
        // Allow React to re-render based on isExporting state
        await new Promise(resolve => setTimeout(resolve, 100));

        const elementToPrint = document.getElementById('examination-record-pdf');
        if (!elementToPrint) {
            setIsExporting(false);
            return;
        }
         
        try {
            await document.fonts.ready;
            const canvas = await html2canvas(elementToPrint, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            
            const { jsPDF } = jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
            pdf.save(`محضر_فحص_وتدقيق.pdf`);
        } catch (error) {
            console.error(error);
            alert("An error occurred during PDF export.");
        } finally {
            setIsExporting(false);
        }
    };

    const recordRef = useRef(null);

    return (
        <div>
            <div className="mb-4 p-4 bg-white rounded-lg shadow-md flex justify-end items-center no-print">
                <button onClick={handleExportPdf} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">
                    {isExporting ? <Loader2 className="animate-spin" /> : <Printer size={18} />}
                    تصدير PDF
                </button>
            </div>
            
            <div id="examination-record-pdf" ref={recordRef} className="bg-white p-4" style={{ border: '12px double black', fontFamily: "'Asir', sans-serif" }}>
                <div className="flex justify-between items-start mb-4">
                    <LogoUploader logo={ministryLogo} onLogoChange={(e) => handleLogoChange(e, 'ministry')} label="شعار الوزارة" isExporting={isExporting} />
                    <div className="flex-grow">
                        <h1 className="text-4xl font-bold text-center">بسم الله الرحمن الرحيم</h1>
                        <h2 className="text-2xl font-bold mt-2 text-center">المديرية العامة للتربية {settings.directorate}</h2>
                        <h3 className="text-2xl font-bold mt-2 text-center">ادارة: {settings.schoolName}</h3>
                        <h4 className="text-6xl font-bold my-4 text-center" style={{ color: 'red', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>محضر فحص وتدقيق</h4>
                    </div>
                    <LogoUploader logo={educationLogo} onLogoChange={(e) => handleLogoChange(e, 'education')} label="شعار التربية" isExporting={isExporting} />
                </div>

                <div className="text-center text-xl font-bold my-6 space-x-2 space-x-reverse">
                    <span>اجتمعت لجنة مادة</span>
                    <span>(</span><EditableSpan value={material} onChange={setMaterial} className="text-blue-600" /><span>)</span>
                    <span>بتاريخ</span>
                    <EditableSpan value={date.day} onChange={v => setDate(p => ({...p, day: v}))} className="w-12 text-center" />
                    <span>/</span>
                    <EditableSpan value={date.month} onChange={v => setDate(p => ({...p, month: v}))} className="w-12 text-center" />
                    <span>/</span>
                    <EditableSpan value={date.year} onChange={v => setDate(p => ({...p, year: v}))} className="w-20 text-center" />
                    <span>لفحص وتدقيق</span>
                </div>

                <div className="text-center text-xl font-bold my-6">
                    <span>الدفاتر الامتحانية للصف</span>
                     {isExporting ? (
                        <span className="mx-2 text-blue-600 font-bold">{selectedStage}</span>
                    ) : (
                        <select value={selectedStage} onChange={e => setSelectedStage(e.target.value)} className="mx-2 px-2 py-1 rounded-md border-2 border-dotted border-gray-400 focus:border-solid bg-transparent text-blue-600 font-bold appearance-none">
                            {GRADE_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                        </select>
                    )}
                    <span>لامتحانات نهاية السنة</span>
                </div>

                <div className="text-center text-xl font-bold my-6">
                    <span>الدور</span>
                    {isExporting ? (
                        <span className="mx-2 text-blue-600 font-bold">{selectedRole}</span>
                    ) : (
                        <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="mx-2 px-2 py-1 rounded-md border-2 border-dotted border-gray-400 focus:border-solid bg-transparent text-blue-600 font-bold appearance-none">
                            <option value="الاول">الاول</option>
                            <option value="الثاني">الثاني</option>
                        </select>
                    )}
                    <span>للعام الدراسي {settings.academicYear}</span>
                </div>

                <table className="w-full border-collapse border-2 border-black my-8 text-lg">
                    <thead className="font-bold">
                        <tr className="bg-yellow-300">
                            <th className="border-2 border-black p-2 w-[28%]"></th>
                            <th className="border-2 border-black p-2">س١</th>
                            <th className="border-2 border-black p-2">س٢</th>
                            <th className="border-2 border-black p-2">س٣</th>
                            <th className="border-2 border-black p-2">س٤</th>
                            <th className="border-2 border-black p-2">س٥</th>
                            <th className="border-2 border-black p-2">س٦</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="bg-lime-300">
                            <td className="border-2 border-black p-2 font-bold text-right">اسم الفاحص</td>
                            {[...Array(6)].map((_, i) => <td key={i} className="border-2 border-black h-12"></td>)}
                        </tr>
                        <tr>
                            <td className="border-2 border-black p-2 font-bold text-right">اسم المدقق</td>
                            {[...Array(6)].map((_, i) => <td key={i} className="border-2 border-black h-12"></td>)}
                        </tr>
                    </tbody>
                </table>
                
                <div className="text-xl font-bold my-6 text-blue-700">
                    <p className="my-3">اسم جامع الدرجات على الغلاف :</p>
                    <p className="my-3">اسم مدقق الجمع :</p>
                </div>

                <div className="flex justify-between items-start my-8">
                    <div className="w-1/3">
                        <table className="w-full border-collapse border-2 border-black text-lg">
                             <thead className="font-bold">
                                <tr className="bg-yellow-300">
                                    <th className="border-2 border-black p-2" colSpan={2}>نسبة النجاح للمادة:</th>
                                </tr>
                             </thead>
                             <tbody>
                                 <tr>
                                     <td className="border-2 border-black p-2 h-10 text-right font-bold">المشتركون</td>
                                     <td className="border-2 border-black p-2 h-10"></td>
                                 </tr>
                                  <tr>
                                     <td className="border-2 border-black p-2 h-10 text-right font-bold bg-amber-100">الناجحون</td>
                                     <td className="border-2 border-black p-2 h-10 bg-amber-100"></td>
                                 </tr>
                                  <tr>
                                     <td className="border-2 border-black p-2 h-10 text-right font-bold">الراسبون</td>
                                     <td className="border-2 border-black p-2 h-10"></td>
                                 </tr>
                                  <tr>
                                     <td className="border-2 border-black p-2 h-10 text-right font-bold bg-amber-100">النسبة الكلية</td>
                                     <td className="border-2 border-black p-2 h-10 bg-amber-100"></td>
                                 </tr>
                             </tbody>
                        </table>
                    </div>
                    <div className="w-2/3 pr-8">
                         <p className="text-center font-bold text-lg mb-2">اسماء اعضاء لجنة الفحص والتدقيق</p>
                         <table className="w-full border-collapse border-2 border-black text-lg">
                             <thead className="font-bold">
                                 <tr className="bg-yellow-300">
                                     <th className="border-2 border-black p-2 w-12">ت</th>
                                     <th className="border-2 border-black p-2">الاسم الثلاثي</th>
                                     <th className="border-2 border-black p-2">التوقيع</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {[...Array(8)].map((_, i) => (
                                     <tr key={i} className={(i % 2 !== 0) ? 'bg-amber-100' : ''}>
                                         <td className="border-2 border-black text-center font-bold p-2 h-10">{i+1} .</td>
                                         <td className="border-2 border-black"></td>
                                         <td className="border-2 border-black"></td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                    </div>
                </div>

                <div className="flex justify-end mt-16">
                    <div className="w-1/3 border-4 border-black p-4 text-center">
                        <p className="font-bold text-xl">اسم رئيس اللجنه وتوقيعه</p>
                    </div>
                </div>
            </div>
        </div>
    );
}