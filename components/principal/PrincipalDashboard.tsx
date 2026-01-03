
import React, { useState, useMemo } from 'react';
import * as ReactDOM from 'react-dom/client';
import type { User, ClassData, TeacherAssignment } from '../../types.ts';
import { Plus, UserPlus, Copy, Check, Trash2, Edit, Save, X, Download, Loader2, Shield, PlayCircle, GraduationCap, Users } from 'lucide-react';
import TeacherCodesPDF from './TeacherCodesPDF.tsx';
import { db } from '../../lib/firebase.ts';
import { GRADE_LEVELS } from '../../constants.ts';

declare const jspdf: any;
declare const html2canvas: any;

interface PrincipalDashboardProps {
    principal: User;
    classes: ClassData[];
    users: User[];
    addUser: (user: Omit<User, 'id' | 'assignments'> & { assignments: TeacherAssignment[] }) => User;
    updateUser: (userId: string, updater: (user: User) => User) => void;
    deleteUser: (userId: string) => void;
}

const generateCode = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export default function PrincipalDashboard({ principal, classes, users, addUser, updateUser, deleteUser }: PrincipalDashboardProps) {
    const [newUserName, setNewUserName] = useState('');
    const [newUserRole, setNewUserRole] = useState<'teacher' | 'counselor'>('teacher');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [editingTeacher, setEditingTeacher] = useState<User | null>(null);
    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
    const [isExportingCodes, setIsExportingCodes] = useState(false);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

    const staff = users.filter(u => (u.role === 'teacher' || u.role === 'counselor') && u.principalId === principal.id);
    const teachersAndCounselors = staff.sort((a, b) => a.name.localeCompare(b.name, 'ar-IQ'));
    
    const teachersCount = staff.filter(u => u.role === 'teacher').length;
    const counselorsCount = staff.filter(u => u.role === 'counselor').length;

    const sortedClassesForModal = useMemo(() => {
        return [...classes].sort((a, b) => {
            const stageAIndex = GRADE_LEVELS.indexOf(a.stage);
            const stageBIndex = GRADE_LEVELS.indexOf(b.stage);
    
            if (stageAIndex === -1 && stageBIndex !== -1) return 1;
            if (stageAIndex !== -1 && stageBIndex === -1) return -1;
            
            if (stageAIndex !== stageBIndex) {
                return stageAIndex - stageBIndex;
            }
    
            return a.section.localeCompare(b.section, 'ar-IQ');
        });
    }, [classes]);

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserName.trim()) return;

        addUser({
            name: newUserName.trim(),
            role: newUserRole,
            code: generateCode(7),
            principalId: principal.id,
            assignments: [],
        });

        setNewUserName('');
        setNewUserRole('teacher');
    };

    const handleEditAssignments = (teacher: User) => {
        setEditingTeacher(teacher);
        setAssignments(teacher.assignments || []);
    };
    
    const handleAssignmentChange = (classId: string, subjectId: string, isChecked: boolean) => {
        setAssignments(prev => {
            if (isChecked) {
                return [...prev, { classId, subjectId }];
            } else {
                return prev.filter(a => !(a.classId === classId && a.subjectId === subjectId));
            }
        });
    };

    const handleSaveAssignments = () => {
        if (!editingTeacher) return;
        updateUser(editingTeacher.id, user => ({ ...user, assignments }));
        setEditingTeacher(null);
    };


    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code).then(() => {
            setCopiedCode(code);
            setTimeout(() => setCopiedCode(null), 2000);
        });
    };
    
    const handleExportCodes = async () => {
        const staffToExport = teachersAndCounselors;
        if (staffToExport.length === 0) {
            alert("لا يوجد كادر لتصدير أرقامهم.");
            return;
        }
        setIsExportingCodes(true);

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
            await renderComponent(<TeacherCodesPDF teachers={staffToExport} />);

            const pdfElement = tempContainer.children[0] as HTMLElement;
            const canvas = await html2canvas(pdfElement, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');

            const { jsPDF } = jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
            pdf.save(`staff_codes_${principal.schoolName}.pdf`);
        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("حدث خطأ أثناء تصدير الأرقام السرية.");
        } finally {
            root.unmount();
            if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
            }
            setIsExportingCodes(false);
        }
    };
    
    const getRoleName = (role: 'teacher' | 'counselor') => {
        if (role === 'teacher') return 'مدرس';
        if (role === 'counselor') return 'مرشد تربوي';
        return '';
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg">
             {isVideoModalOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[100] p-4"
                    onClick={() => setIsVideoModalOpen(false)}
                >
                    <div 
                        className="bg-black p-2 rounded-lg shadow-xl w-full max-w-4xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setIsVideoModalOpen(false)}
                            className="absolute -top-3 -right-3 bg-white text-black rounded-full p-2 z-10 shadow-lg hover:scale-110 transition-transform"
                            aria-label="Close video"
                        >
                            <X size={24} />
                        </button>
                        <div className="relative w-full" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
                            <iframe
                                src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2F61578356680977%2Fvideos%2F643783455430949%2F&show_text=false&autoplay=1&mute=0"
                                className="absolute top-0 left-0 w-full h-full"
                                style={{ border: 'none', overflow: 'hidden' }}
                                title="Facebook video player"
                                frameBorder="0"
                                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                allowFullScreen={true}>
                            </iframe>
                        </div>
                    </div>
                </div>
            )}
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">لوحة تحكم المدير</h2>
             <div className="mb-6">
                <button
                    onClick={() => setIsVideoModalOpen(true)}
                    className="w-full flex items-center gap-4 p-3 bg-red-100 rounded-lg hover:bg-red-200 transition-all duration-300 hover:shadow-md text-red-700"
                >
                    <PlayCircle className="w-12 h-12 text-red-600" />
                    <div>
                        <h4 className="font-bold text-red-800">طريقة اضافة المدرس مع جولة سريعة</h4>
                        <p className="text-sm text-red-600">شاهد عرض الفيديو التوضيحي للخطوات بالتفصيل.</p>
                    </div>
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <h3 className="text-xl font-bold text-gray-700 mb-4">إضافة كادر جديد</h3>
                    <form onSubmit={handleAddUser} className="space-y-4 bg-gray-50 p-4 rounded-lg">
                        <div>
                            <label className="block text-md font-medium text-gray-700 mb-2">اسم الكادر</label>
                            <input
                                type="text"
                                value={newUserName}
                                onChange={(e) => setNewUserName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                placeholder="الاسم الكامل"
                                required
                            />
                        </div>
                         <div>
                            <label className="block text-md font-medium text-gray-700 mb-2">الدور</label>
                            <select
                                value={newUserRole}
                                onChange={(e) => setNewUserRole(e.target.value as 'teacher' | 'counselor')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                            >
                                <option value="teacher">مدرس</option>
                                <option value="counselor">مرشد تربوي</option>
                            </select>
                        </div>
                        <button type="submit" className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700">
                            <Plus size={20} />
                            <span>إضافة</span>
                        </button>
                    </form>
                    <div className="mt-6">
                        <button 
                            onClick={handleExportCodes}
                            disabled={isExportingCodes}
                            className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                        >
                            {isExportingCodes ? <Loader2 className="animate-spin" /> : <Download size={20} />}
                            {isExportingCodes ? "جاري التصدير..." : "تصدير أرقام الدخول"}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-700">قائمة الكادر ({staff.length})</h3>
                        <div className="flex gap-2 text-sm font-semibold">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">مدرسين: {teachersCount}</span>
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">مرشدين: {counselorsCount}</span>
                        </div>
                    </div>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                        {teachersAndCounselors.length > 0 ? teachersAndCounselors.map(t => (
                            <div key={t.id} className="p-4 bg-gray-50 rounded-lg border flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2">
                                        {t.role === 'teacher' ? <Users size={16} className="text-blue-600"/> : <GraduationCap size={16} className="text-purple-600"/>}
                                        <p className="font-semibold text-lg">{t.name}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${t.role === 'teacher' ? 'bg-blue-200 text-blue-800' : 'bg-purple-200 text-purple-800'}`}>
                                            {getRoleName(t.role as 'teacher' | 'counselor')}
                                        </span>
                                        <code className="bg-gray-200 text-gray-800 font-mono px-2 py-0.5 rounded text-sm">{t.code}</code>
                                        <button onClick={() => copyToClipboard(t.code)} className="p-1 text-gray-500 hover:text-cyan-600">
                                            {copiedCode === t.code ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {t.role === 'teacher' && (
                                        <button onClick={() => handleEditAssignments(t)} className="p-2 text-white bg-yellow-500 rounded-md hover:bg-yellow-600" title="تعيين مواد"><Shield size={18}/></button>
                                    )}
                                    <button onClick={() => deleteUser(t.id)} className="p-2 text-white bg-red-500 rounded-md hover:bg-red-600" title="حذف"><Trash2 size={18}/></button>
                                </div>
                            </div>
                        )) : <p className="text-center text-gray-500 py-8">لم يتم إضافة أي كادر بعد.</p>}
                    </div>
                </div>
            </div>

            {editingTeacher && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
                        <h3 className="text-xl font-bold mb-4">تعيين مواد للمدرس: {editingTeacher.name}</h3>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                            {sortedClassesForModal.map(cls => (
                                <div key={cls.id} className="p-3 bg-gray-50 rounded-lg border">
                                    <h4 className="font-semibold text-lg">{cls.stage} - {cls.section}</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                                        {cls.subjects.map(subj => (
                                            <label key={subj.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-200">
                                                <input
                                                    type="checkbox"
                                                    checked={assignments.some(a => a.classId === cls.id && a.subjectId === subj.id)}
                                                    onChange={e => handleAssignmentChange(cls.id, subj.id, e.target.checked)}
                                                    className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                                />
                                                <span>{subj.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
                            <button onClick={() => setEditingTeacher(null)} className="px-4 py-2 bg-gray-200 rounded-md flex items-center gap-2"><X size={18} /> إلغاء</button>
                            <button onClick={handleSaveAssignments} className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center gap-2"><Save size={18} /> حفظ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
