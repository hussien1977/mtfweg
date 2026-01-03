import React, { useRef } from 'react';
// FIX: Import Camera icon for photo upload UI.
import { Camera } from 'lucide-react';

interface FormFieldProps {
    label: string;
    name: string;
    value: string;
    onUpdate: (name: string, value: string) => void;
    className?: string;
    isPdfMode?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({ label, name, value, onUpdate, className = '', isPdfMode }) => {
    return (
        <div className={`relative w-full h-16 ${className}`} style={{ fontFamily: "'Asir', sans-serif" }}>
            <div className="absolute inset-x-0 bottom-0 h-12 bg-white border-2 border-cyan-800 rounded-2xl">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onUpdate(name, e.target.value)}
                    className="w-full h-full bg-transparent text-center text-xl font-bold focus:outline-none px-2"
                    readOnly={isPdfMode}
                />
            </div>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#8fd7d5] border-2 border-cyan-800 rounded-full text-center text-lg font-bold whitespace-nowrap">
                <span style={{ position: 'relative', top: '-8px' }}>{label}</span>
            </div>
        </div>
    );
};

// FIX: Add studentPhoto and onPhotoUpload to props to handle student photo.
interface RegistrationFormPage1Props {
    formData: Record<string, string>;
    onUpdate: (field: string, value: string) => void;
    isPdfMode?: boolean;
    studentPhoto: string | null;
    onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function RegistrationFormPage1({ formData, onUpdate, isPdfMode = false, studentPhoto, onPhotoUpload }: RegistrationFormPage1Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    return (
        <div className="w-[850px] mx-auto p-4 bg-[#fcf3d9] border-4 border-yellow-400 rounded-2xl" style={{ fontFamily: "'Asir', sans-serif" }}>
            <h1 className="text-5xl font-bold text-center text-cyan-800 mb-6" style={{
                backgroundImage: 'url(https://i.imgur.com/K9FotVM.png)',
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                paddingTop: '1rem',
                paddingBottom: '1rem',
                position: 'relative',
                top: '-16px'
            }}>
                معلومات الطالب
            </h1>

            <div className="grid grid-cols-12 gap-x-4 gap-y-10">
                {/* ID & Photo */}
                <div className="col-span-3 flex flex-col items-center space-y-4">
                    {/* FIX: Add student photo upload and display UI. */}
                    <div 
                        onClick={() => !isPdfMode && fileInputRef.current?.click()}
                        className={`w-40 h-48 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center bg-gray-50 ${!isPdfMode ? 'hover:bg-gray-100 cursor-pointer' : ''}`}
                    >
                        {studentPhoto ? (
                            <img src={studentPhoto} alt="صورة الطالب" className="w-full h-full object-contain rounded-lg p-1" />
                        ) : (
                            <div className="text-center text-gray-500">
                                <Camera size={48} />
                                <p>صورة الطالب</p>
                            </div>
                        )}
                    </div>
                    <input ref={fileInputRef} type="file" onChange={onPhotoUpload} accept="image/*" className="hidden" disabled={isPdfMode}/>
                    <FormField label="رقم القيد" name="registrationId" value={formData.registrationId || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                </div>

                {/* Main Info */}
                <div className="col-span-9">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-8">
                        <FormField label="اسم الطالب الرباعي واللقب" name="fullName" value={formData.fullName || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                        <FormField label="اسم الام الثلاثي" name="motherName" value={formData.motherName || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                        <FormField label="محل الولادة" name="birthPlace" value={formData.birthPlace || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                        <FormField label="تاريخ الولادة" name="birthDate" value={formData.birthDate || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                        <FormField label="اسم ولي الامر" name="guardianName" value={formData.guardianName || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                        <FormField label="صلة القرابة" name="guardianRelation" value={formData.guardianRelation || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                    </div>
                </div>

                {/* IDs */}
                <div className="col-span-12 grid grid-cols-3 gap-x-4 gap-y-8">
                    <FormField label="رقم البطاقة الوطنية" name="nationalId" value={formData.nationalId || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                    <FormField label="الرقم العائلي" name="familyId" value={formData.familyId || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                    <FormField label="جهة الاصدار" name="nationalIdIssuer" value={formData.nationalIdIssuer || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                    
                    <FormField label="رقم الهوية" name="civilId" value={formData.civilId || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                    <div className="grid grid-cols-2 gap-x-2">
                        <FormField label="رقم السجل" name="civilRegistryNumber" value={formData.civilRegistryNumber || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                        <FormField label="رقم الصفحة" name="civilPageNumber" value={formData.civilPageNumber || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                    </div>
                    <FormField label="جهة الاصدار" name="civilIdIssuer" value={formData.civilIdIssuer || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                </div>
                
                {/* Contact and Address */}
                <div className="col-span-12 grid grid-cols-3 gap-x-4 gap-y-8">
                     <FormField label="مهنة ولي الامر" name="guardianProfession" value={formData.guardianProfession || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                     <FormField label="رقم هاتف الاب" name="fatherPhone" value={formData.fatherPhone || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                     <FormField label="رقم هاتف الام" name="motherPhone" value={formData.motherPhone || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />

                     <FormField label="عنوان السكن" name="address" value={formData.address || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                     <FormField label="رقم الدار" name="houseNumber" value={formData.houseNumber || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                     <FormField label="اقرب نقطة دالة" name="nearestLandmark" value={formData.nearestLandmark || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                </div>

                {/* School Info */}
                <div className="col-span-12 grid grid-cols-2 gap-x-4 gap-y-8">
                     <FormField label="اسم المختار الثلاثي" name="mukhtarName" value={formData.mukhtarName || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                     <div className="relative w-full h-16">
                        <div className="absolute inset-x-0 bottom-0 h-12 bg-white border-2 border-cyan-800 rounded-2xl">
                             <input type="text" value={formData.lastSchool || ''} onChange={(e) => onUpdate('lastSchool', e.target.value)} className="w-full h-full bg-transparent text-center text-xl font-bold focus:outline-none px-2" readOnly={isPdfMode} />
                        </div>
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#ffb654] border-2 border-cyan-800 rounded-full text-center text-lg font-bold whitespace-nowrap">
                            <span style={{ position: 'relative', top: '-8px' }}>اخر مدرسة كان فيها</span>
                        </div>
                    </div>
                </div>

                {/* Document Info */}
                <div className="col-span-12 grid grid-cols-4 gap-x-4 gap-y-8">
                     <FormField label="عدد الوثيقة" name="docCount" value={formData.docCount || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                     <FormField label="رقم الوثيقة" name="docNumber" value={formData.docNumber || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                     <FormField label="تاريخ اصدارها" name="docDate" value={formData.docDate || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                     <FormField label="جهة اصدارها" name="docIssuer" value={formData.docIssuer || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                </div>
                
                 {/* Form Sequence */}
                <div className="col-start-5 col-span-4 mt-4">
                     <FormField label="تسلسل الاستمارة" name="formSequence1" value={formData.formSequence1 || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                </div>
            </div>
        </div>
    );
}