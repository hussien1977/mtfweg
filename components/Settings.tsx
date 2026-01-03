
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { SchoolSettings, User } from '../types.ts';
import { SCHOOL_TYPES, SCHOOL_GENDERS, SCHOOL_LEVELS, GOVERNORATES } from '../constants.ts';
import { Users, Database, ExternalLink, RefreshCw, Loader2, Download, Upload, AlertTriangle, History, ShieldCheck } from 'lucide-react';
import { db } from '../lib/firebase.ts';

interface SettingsProps {
    currentSettings: SchoolSettings;
    onSave: (settings: SchoolSettings) => void;
    currentUser: User;
    updateUser: (userId: string, updater: (user: User) => User) => void;
}

export default function Settings({ currentSettings, onSave, currentUser, updateUser }: SettingsProps): React.ReactNode {
    const [settings, setSettings] = useState<SchoolSettings>(currentSettings);
    const [onlineUsersCount, setOnlineUsersCount] = useState<number | null>(null);
    const [dbSize, setDbSize] = useState<string | null>(null);
    const [isCalculatingSize, setIsCalculatingSize] = useState(false);
    const [isBackupLoading, setIsBackupLoading] = useState(false);
    const [isRestoreLoading, setIsRestoreLoading] = useState(false);
    
    const isPrincipal = currentUser.role === 'principal';
    const isFormDisabled = currentUser.role === 'teacher';
    const areNameFieldsDisabled = currentUser.role === 'principal' || currentUser.role === 'teacher';

    const principalId = isPrincipal ? currentUser.id : currentUser.principalId;

    // Effect for online users count
    useEffect(() => {
        if (!isPrincipal) return;

        const statusRef = db.ref('status');
        const onStatusChange = (snapshot: any) => {
            setOnlineUsersCount(snapshot.numChildren());
        };

        statusRef.on('value', onStatusChange);

        return () => {
            statusRef.off('value', onStatusChange);
        };
    }, [isPrincipal]);

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['بايت', 'كيلوبايت', 'ميكابايت', 'جيكابايت'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const getEstimatedDbSize = useCallback(async () => {
        if (!isPrincipal) return;

        setIsCalculatingSize(true);
        setDbSize(null);

        const nodesToMeasure = [
            'classes', 'users', 'settings', 'teacher_submissions',
            'student_submissions', 'evaluations', 'absences', 'behavior_deductions',
            'homework_data', 'homework_submissions', 'schedules', 'xo_games'
        ];
        let totalBytes = 0;

        try {
            const snapshots = await Promise.all(
                nodesToMeasure.map(node => db.ref(node).get())
            );

            snapshots.forEach(snapshot => {
                if (snapshot.exists()) {
                    totalBytes += JSON.stringify(snapshot.val()).length;
                }
            });

            setDbSize(formatBytes(totalBytes));
        } catch (error) {
            console.error("Error calculating DB size:", error);
            setDbSize('فشل الحساب');
        } finally {
            setIsCalculatingSize(false);
        }
    }, [isPrincipal]);

    useEffect(() => {
        getEstimatedDbSize();
    }, [getEstimatedDbSize]);

    const handleExportBackup = async () => {
        if (!isPrincipal || !principalId) return;
        setIsBackupLoading(true);

        try {
            // Define all data points to backup
            const backupPaths = {
                settings: `settings/${principalId}`,
                classes: `classes`, // We will filter this locally
                evaluations: `evaluations/${principalId}`,
                absences: `absences/${principalId}`,
                behavior_deductions: `behavior_deductions/${principalId}`,
                homework_data: `homework_data/${principalId}`,
                homework_submissions: `homework_submissions/${principalId}`,
                homework_progress: `homework_progress/${principalId}`,
                published_monthly_results: `published_monthly_results/${principalId}`,
                counselor_guidance: `counselor_guidance/${principalId}`,
                announcements: `announcements/${principalId}`,
                student_access_codes: `student_access_codes/${principalId}`,
                student_access_codes_individual: `student_access_codes_individual`, // Filtered
                student_notifications: `student_notifications/${principalId}`,
                conversations: `conversations/${principalId}`,
                schedules: `schedules/${principalId}`,
                student_schedules: `student_schedules/${principalId}`
            };

            const backupData: Record<string, any> = {};
            const snapshots = await Promise.all(
                Object.entries(backupPaths).map(async ([key, path]) => {
                    const snap = await db.ref(path).get();
                    return { key, val: snap.val() };
                })
            );

            snapshots.forEach(({ key, val }) => {
                if (key === 'classes' && val) {
                    // Filter classes belonging only to this principal
                    backupData[key] = Object.values(val).filter((c: any) => c.principalId === principalId);
                } else if (key === 'student_access_codes_individual' && val) {
                    // Filter individual codes belonging only to this principal
                    const filteredCodes: Record<string, any> = {};
                    Object.entries(val).forEach(([code, data]: [string, any]) => {
                        if (data.principalId === principalId) filteredCodes[code] = data;
                    });
                    backupData[key] = filteredCodes;
                } else {
                    backupData[key] = val;
                }
            });

            // Create JSON and trigger download
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `نقطة_استعادة_مدرسة_${settings.schoolName || 'غير_مسمى'}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Backup failed:", error);
            alert("فشل إنشاء نسخة احتياطية.");
        } finally {
            setIsBackupLoading(false);
        }
    };

    const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !isPrincipal || !principalId) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                
                if (!confirm("تحذير: سيؤدي هذا الإجراء إلى مسح جميع البيانات الحالية للمدرسة (الطلاب، الدرجات، الإعدادات) واستبدالها ببيانات نقطة الاستعادة. هل تريد المتابعة؟")) {
                    return;
                }

                setIsRestoreLoading(true);
                const updates: Record<string, any> = {};

                // Map backup data back to Firebase paths
                Object.entries(data).forEach(([key, val]) => {
                    if (val === null || val === undefined) return;

                    if (key === 'classes') {
                        (val as any[]).forEach(cls => {
                            if (cls.id) updates[`classes/${cls.id}`] = cls;
                        });
                    } else if (key === 'student_access_codes_individual') {
                        Object.entries(val).forEach(([code, codeData]) => {
                            updates[`student_access_codes_individual/${code}`] = codeData;
                        });
                    } else if (key === 'settings') {
                        updates[`settings/${principalId}`] = val;
                    } else {
                        // generic structure keys like evaluations, absences etc are already nested by principalId in the backup
                        updates[`${key}/${principalId}`] = val;
                    }
                });

                await db.ref().update(updates);
                alert("تم استعادة البيانات بنجاح! سيتم إعادة تحميل الصفحة لتطبيق التغييرات.");
                window.location.reload();

            } catch (error) {
                console.error("Restore failed:", error);
                alert("فشل استعادة البيانات. تأكد من أن الملف صحيح.");
            } finally {
                setIsRestoreLoading(false);
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumberInput = e.target instanceof HTMLInputElement && e.target.type === 'number';
        setSettings(prev => ({
            ...prev,
            [name]: isNumberInput ? (parseInt(value, 10) || 0) : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(settings);
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">الإعدادات العامة</h2>
            
            {isPrincipal && (
                <div className="space-y-8 mb-12">
                    {/* System Stats Section */}
                    <div className="p-6 bg-gray-50 rounded-xl border">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                             <Database size={20} className="text-cyan-600" /> إحصائيات النظام
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Online Users Card */}
                            <div className="bg-white p-4 rounded-lg shadow-sm flex items-center gap-4 border">
                                <div className="bg-green-100 text-green-600 p-3 rounded-full">
                                    <Users size={28} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">المستخدمون المتصلون</p>
                                    <p className="text-3xl font-bold">
                                        {onlineUsersCount === null ? <Loader2 className="animate-spin" /> : onlineUsersCount}
                                    </p>
                                </div>
                            </div>
                            {/* Database Size Card */}
                            <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col justify-between border">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
                                        <Database size={28} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">حجم بيانات المدرسة</p>
                                        <p className="text-3xl font-bold">
                                            {isCalculatingSize ? <Loader2 className="animate-spin" /> : dbSize}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 text-xs text-gray-500 mt-2">
                                    <button onClick={getEstimatedDbSize} disabled={isCalculatingSize} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                                        <RefreshCw size={14} className={isCalculatingSize ? 'animate-spin' : ''} />
                                    </button>
                                    <span>تحديث تلقائي</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Backup & Restore Section */}
                    <div className="p-6 bg-cyan-50 rounded-xl border border-cyan-200">
                        <h3 className="text-xl font-bold text-cyan-800 mb-2 flex items-center gap-2">
                             <History size={20} /> نقطة استعادة النظام
                        </h3>
                        <p className="text-sm text-cyan-700 mb-6">يمكنك تحميل نسخة كاملة من بيانات المدرسة للاحتفاظ بها كـ "نقطة استعادة" يمكنك الرجوع إليها في حال حدوث خطأ أو حذف غير مقصود.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <button 
                                onClick={handleExportBackup}
                                disabled={isBackupLoading}
                                className="flex flex-col items-center justify-center gap-3 p-6 bg-white border-2 border-cyan-500 rounded-2xl hover:bg-cyan-500 hover:text-white transition-all group shadow-sm"
                            >
                                {isBackupLoading ? <Loader2 className="animate-spin h-8 w-8" /> : <Download size={32} className="text-cyan-500 group-hover:text-white" />}
                                <div className="text-center">
                                    <p className="font-bold text-lg">إنشاء نقطة استعادة</p>
                                    <p className="text-xs opacity-70">تحميل ملف JSON لجميع بيانات المدرسة</p>
                                </div>
                            </button>

                            <label className="flex flex-col items-center justify-center gap-3 p-6 bg-white border-2 border-amber-500 rounded-2xl hover:bg-amber-500 hover:text-white transition-all group shadow-sm cursor-pointer">
                                {isRestoreLoading ? <Loader2 className="animate-spin h-8 w-8" /> : <Upload size={32} className="text-amber-500 group-hover:text-white" />}
                                <div className="text-center">
                                    <p className="font-bold text-lg">استرجاع من ملف</p>
                                    <p className="text-xs opacity-70">رفع ملف نقطة استعادة سابق</p>
                                </div>
                                <input type="file" className="hidden" accept=".json" onChange={handleImportBackup} disabled={isRestoreLoading} />
                            </label>
                        </div>

                        {(isBackupLoading || isRestoreLoading) && (
                            <div className="mt-4 flex items-center justify-center gap-3 text-cyan-800 font-bold animate-pulse">
                                <ShieldCheck className="text-cyan-600" />
                                <span>جاري معالجة البيانات بأمان...</span>
                            </div>
                        )}
                        
                        <div className="mt-6 flex items-start gap-2 text-xs text-amber-700 font-bold bg-amber-100 p-3 rounded-lg border border-amber-200">
                            <AlertTriangle size={14} className="flex-shrink-0" />
                            <p>تنبيه: عملية الاستعادة ستمسح البيانات الحالية وتعوضها ببيانات الملف المختار. يرجى التأكد من اختيار الملف الصحيح.</p>
                        </div>
                    </div>
                </div>
            )}

            {isFormDisabled && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
                    <p className="font-bold">وضع القراءة فقط</p>
                    <p>ليس لديك صلاحية لتغيير هذه الإعدادات.</p>
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputField label="اسم المدرسة" name="schoolName" value={settings.schoolName} onChange={handleChange} disabled={areNameFieldsDisabled} />
                    <InputField label="اسم مدير المدرسة" name="principalName" value={settings.principalName} onChange={handleChange} disabled={areNameFieldsDisabled} />
                    <InputField label="العام الدراسي" name="academicYear" value={settings.academicYear} onChange={handleChange} placeholder="مثال: 2023-2024" disabled={isFormDisabled}/>
                    <SelectField label="المحافظة" name="governorateName" value={settings.governorateName || ''} onChange={handleChange} options={GOVERNORATES} disabled={isFormDisabled} />
                    <InputField label="المديرية" name="directorate" value={settings.directorate} onChange={handleChange} disabled={isFormDisabled} />
                    <InputField label="القضاء" name="district" value={settings.district || ''} onChange={handleChange} disabled={isFormDisabled} />
                    <InputField label="الناحية" name="subdistrict" value={settings.subdistrict || ''} onChange={handleChange} disabled={isFormDisabled} />
                    <InputField label="رمز المحافظة" name="governorateCode" value={settings.governorateCode || ''} onChange={handleChange} disabled={isFormDisabled} />
                    <InputField label="رمز المدرسة" name="schoolCode" value={settings.schoolCode || ''} onChange={handleChange} disabled={isFormDisabled} />
                    <SelectField label="نوع المدرسة" name="schoolType" value={settings.schoolType || ''} onChange={handleChange} options={SCHOOL_TYPES} disabled={isFormDisabled} />
                    <SelectField label="جنس المدرسة" name="schoolGender" value={settings.schoolGender || ''} onChange={handleChange} options={SCHOOL_GENDERS} disabled={isFormDisabled} />
                    <SelectField label="درجة المدرسة" name="schoolLevel" value={settings.schoolLevel || ''} onChange={handleChange} options={SCHOOL_LEVELS} disabled={areNameFieldsDisabled} />
                    <InputField label="رقم موبايل المدير" name="principalPhone" value={settings.principalPhone || ''} onChange={handleChange} disabled={isFormDisabled} type="tel" />
                    <InputField label="عدد مواد الإكمال" name="supplementarySubjectsCount" type="number" value={settings.supplementarySubjectsCount} onChange={handleChange} disabled={isFormDisabled} />
                    <InputField label="درجة القرار" name="decisionPoints" type="number" value={settings.decisionPoints} onChange={handleChange} disabled={isFormDisabled} />
                </div>
                <div className="flex justify-end pt-6">
                    <button 
                        type="submit" 
                        className="px-8 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={isFormDisabled}
                    >
                        حفظ الإعدادات
                    </button>
                </div>
            </form>
        </div>
    );
}

// Helper components for form fields
interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    name: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, value, onChange, type = 'text', placeholder, disabled }) => (
    <div>
        <label htmlFor={name} className="block text-md font-medium text-gray-700 mb-2">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-200"
            required
            disabled={disabled}
        />
    </div>
);

interface SelectFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: string[];
    disabled?: boolean;
}

const SelectField: React.FC<SelectFieldProps> = ({ label, name, value, onChange, options, disabled }) => (
    <div>
        <label htmlFor={name} className="block text-md font-medium text-gray-700 mb-2">{label}</label>
        <select
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-200 bg-white"
            required
            disabled={disabled}
        >
            {options.map(option => (
                <option key={option} value={option}>{option}</option>
            ))}
        </select>
    </div>
);
