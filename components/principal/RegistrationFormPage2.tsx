import React from 'react';

interface FormFieldProps {
    label: string;
    name: string;
    value: string;
    onUpdate: (name: string, value: string) => void;
    className?: string;
    labelColor?: string;
    isPdfMode?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({ label, name, value, onUpdate, className = '', labelColor = '#d9d7fc', isPdfMode }) => {
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
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 border-2 border-cyan-800 rounded-full text-center text-lg font-bold whitespace-nowrap" style={{ backgroundColor: labelColor }}>
                <span style={{ position: 'relative', top: '-8px' }}>{label}</span>
            </div>
        </div>
    );
};

interface RegistrationFormPage2Props {
    formData: Record<string, string>;
    onUpdate: (field: string, value: string) => void;
    isPdfMode?: boolean;
}

export default function RegistrationFormPage2({ formData, onUpdate, isPdfMode = false }: RegistrationFormPage2Props) {
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
                معلومات تخص المرشد التربوي
            </h1>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 mb-8">
                <FormField label="اسم الطالب الرباعي واللقب" name="fullName2" value={formData.fullName2 || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                <div />
                <FormField label="هل الاب على قيد الحياة" name="isFatherAlive" value={formData.isFatherAlive || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                <FormField label="التحصيل الدراسي للاب" name="fatherEducation" value={formData.fatherEducation || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} labelColor="#d6bcfb"/>
                <FormField label="هل الام على قيد الحياة" name="isMotherAlive" value={formData.isMotherAlive || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                <FormField label="التحصيل الدراسي للام" name="motherEducation" value={formData.motherEducation || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} labelColor="#d6bcfb"/>
            </div>

            <div className="grid grid-cols-4 gap-x-4 gap-y-8 mb-8">
                <FormField label="عدد افراد الاسرة" name="familyMembers" value={formData.familyMembers || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                <FormField label="عدد الاخوة" name="brothersCount" value={formData.brothersCount || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                <FormField label="عدد الاخوات" name="sistersCount" value={formData.sistersCount || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                <FormField label="ترتيب الطالب" name="studentOrder" value={formData.studentOrder || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                
                <FormField label="الدخل الشهري" name="monthlyIncome" value={formData.monthlyIncome || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                <FormField label="نوع الدار" name="houseType" value={formData.houseType || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                <FormField label="عدد الغرف" name="roomCount" value={formData.roomCount || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                <FormField label="الطالب يعيش مع" name="livesWith" value={formData.livesWith || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />

                <FormField label="الطول" name="height" value={formData.height || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                <FormField label="الوزن" name="weight" value={formData.weight || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                <FormField label="السمع" name="hearing" value={formData.hearing || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
                <FormField label="النظر" name="vision" value={formData.vision || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
            </div>

            <div className="grid grid-cols-3 gap-x-4 gap-y-8 mb-8">
                <FormField label="هل الطالب يعمل" name="isStudentWorking" value={formData.isStudentWorking || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} labelColor="#fab4b3"/>
                <FormField label="هل يعاني امراض مزمنة" name="hasChronicIllness" value={formData.hasChronicIllness || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} labelColor="#fab4b3"/>
                <FormField label="العاهات الجسمية" name="physicalDisabilities" value={formData.physicalDisabilities || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} labelColor="#fab4b3"/>
            </div>
            
             <div className="grid grid-cols-2 gap-x-4 gap-y-8 mb-8">
                <FormField label="هل للطالب مهارة" name="studentSkills" value={formData.studentSkills || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} labelColor="#86cbcc"/>
                <FormField label="تذكر ان وجدت" name="skillsDetails" value={formData.skillsDetails || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} labelColor="#86cbcc"/>
             </div>

             <div className="grid grid-cols-2 gap-x-4 gap-y-8 mb-8">
                <FormField label="هل شارك بمهرجانات او مسابقات" name="participatedInFestivals" value={formData.participatedInFestivals || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} labelColor="#c7e1ae"/>
                <FormField label="تذكر ان وجدت" name="festivalsDetails" value={formData.festivalsDetails || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} labelColor="#c7e1ae"/>
             </div>

             <div className="col-start-2 col-span-2 mt-4 w-1/3 mx-auto">
                <FormField label="تسلسل الاستمارة" name="formSequence2" value={formData.formSequence2 || ''} onUpdate={onUpdate} isPdfMode={isPdfMode} />
            </div>

        </div>
    );
}