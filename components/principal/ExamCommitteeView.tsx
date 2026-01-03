import React, { useState } from 'react';
import * as ReactDOM from 'react-dom/client';
import useLocalStorage from '../../hooks/useLocalStorage.ts';
import type { SchoolSettings, User } from '../../types.ts';
import { FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ExamCommitteePDFPage from './ExamCommitteePDFPage.tsx';

declare const jspdf: any;
declare const html2canvas: any;

interface ExamCommitteeViewProps {
    setCurrentPageKey: (key: any) => void;
    settings: SchoolSettings;
    users: User[];
}

interface CommitteeMember {
    id: string;
    name: string;
    role: string;
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

const defaultTasks = `١- تهيئة القاعات الامتحانية.
٢- توزيع الطلبة على القاعات الامتحانية.
٣- توزيع المراقبين على القاعات الامتحانية.
٤- استلام وتوزيع الاسئلة الامتحانية.
٥- استلام الدفاتر الامتحانية بعد انتهاء الامتحان.
٦- الاشراف على سير الامتحانات.`;

export default function ExamCommitteeView({ setCurrentPageKey, settings, users }: ExamCommitteeViewProps) {
    const [members, setMembers] = useLocalStorage<CommitteeMember[]>('examLog_committeeMembers', [
        { id: uuidv4(), name: settings.principalName, role: 'رئيس اللجنة' },
        { id: uuidv4(), name: '', role: 'عضو' },
        { id: uuidv4(), name: '', role: 'عضو' },
    ]);
    const [tasks, setTasks] = useLocalStorage('examLog_committeeTasks', defaultTasks);
    const [isExporting, setIsExporting] = useState(false);

    const handleMemberChange = (id: string, field: 'name' | 'role', value: string) => {
        setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    };
    
    const addMember = () => {
        setMembers(prev => [...prev, { id: uuidv4(), name: '', role: 'عضو' }]);
    };

    const removeMember = (id: string) => {
        setMembers(prev => prev.filter(m => m.id !== id));
    };

    const handleExport = async () => {
        setIsExporting(true);
        await new Promise(resolve => setTimeout(resolve, 100));

        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '0' });
        document.body.appendChild(tempContainer);
        const root = ReactDOM.createRoot(tempContainer);

        const renderComponent = (component: React.ReactElement) => new Promise<void>(resolve => {
            root.render(component);
            setTimeout(resolve, 500);
        });

        try {
            await renderComponent(
                <ExamCommitteePDFPage 
                    settings={settings}
                    members={members}
                    tasks={tasks}
                />
            );
            
            const page = tempContainer.children[0] as HTMLElement;
            if(!page) throw new Error("PDF export element not found");

            const canvas = await html2canvas(page, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            
            const { jsPDF } = jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
            pdf.save('اللجنة_الامتحانية.pdf');

        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء التصدير.");
        } finally {
            root.unmount();
            document.body.removeChild(tempContainer);
            setIsExporting(false);
        }
    };

    return (
        <PageWrapper 
            title="اللجنة الامتحانية وأعمالها" 
            onPrev={() => setCurrentPageKey('signatures')}
            onNext={() => setCurrentPageKey('auditing_committee')}
        >
            <div className="bg-gray-50 p-6 rounded-lg border shadow-sm space-y-6">
                <div>
                    <h3 className="font-bold text-lg mb-2">أعضاء اللجنة الامتحانية:</h3>
                    <div className="space-y-3">
                        {members.map((member, index) => (
                            <div key={member.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center">
                                <input 
                                    type="text"
                                    value={member.name}
                                    onChange={e => handleMemberChange(member.id, 'name', e.target.value)}
                                    className="p-2 border rounded-md"
                                    placeholder={`اسم العضو ${index + 1}`}
                                />
                                <input 
                                    type="text"
                                    value={member.role}
                                    onChange={e => handleMemberChange(member.id, 'role', e.target.value)}
                                    className="p-2 border rounded-md"
                                    placeholder="المنصب (مثال: عضو)"
                                />
                                <button onClick={() => removeMember(member.id)} className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button onClick={addMember} className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 font-semibold rounded-md hover:bg-blue-200">
                        <Plus size={18} /> إضافة عضو
                    </button>
                </div>

                 <div>
                    <label className="font-bold text-lg">أعمال اللجنة:</label>
                    <textarea
                        value={tasks}
                        onChange={e => setTasks(e.target.value)}
                        rows={8}
                        className="w-full p-3 border rounded-md mt-1 font-sans text-lg leading-relaxed bg-white"
                        placeholder="اكتب مهام اللجنة هنا..."
                    />
                </div>
                <div className="text-center pt-4 border-t">
                    <button onClick={handleExport} disabled={isExporting} className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:bg-gray-400">
                        {isExporting ? <Loader2 className="animate-spin" /> : <FileText className="inline-block ml-2"/>}
                        {isExporting ? 'جاري التصدير...' : 'تصدير PDF'}
                    </button>
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-bold text-center mb-4">معاينة</h3>
                <div className="p-4 bg-gray-100 rounded-lg shadow-inner overflow-hidden">
                    <div className="transform scale-[0.8] origin-top mx-auto -my-14">
                        <ExamCommitteePDFPage 
                            settings={settings}
                            members={members}
                            tasks={tasks}
                        />
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
}