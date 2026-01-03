import React, { useState, useEffect } from 'react';
import { initialPrimaryPlan, initialIntermediatePlan, initialPreparatoryPlan } from '../../data/studyPlans.ts';
// Fix: Added missing type import.
import type { StudyPlan, SchoolLevel } from '../../types.ts';
import { Plus, Save, Trash2 } from 'lucide-react';

interface StudyPlanEditorProps {
    schoolLevel: SchoolLevel;
    onSave: (plans: Record<string, StudyPlan>) => void;
    savedPlans: Record<string, StudyPlan> | null;
}

const EditablePlanTable: React.FC<{ 
    title: string; 
    planData: StudyPlan;
    updatePlan: (grade: string, subjectName: string, count: number) => void;
    addSubject: (grade: string, subjectName: string) => void;
    deleteSubject: (grade: string, subjectName: string) => void;
    deleteGrade: (grade: string) => void;
}> = ({ title, planData, updatePlan, addSubject, deleteSubject, deleteGrade }) => {
    
    const [newSubjects, setNewSubjects] = useState<Record<string, string>>({});

    const handleAddSubject = (grade: string) => {
        const newSubjectName = newSubjects[grade];
        if (newSubjectName && newSubjectName.trim() !== "") {
            addSubject(grade, newSubjectName.trim());
            setNewSubjects(prev => ({...prev, [grade]: ''}));
        }
    };
    
    const tableHeader = () => (
        <thead>
            <tr className="bg-gray-200">
                {Object.keys(planData.grades).map(gradeName => (
                    <th key={gradeName} className="border p-2 font-bold" colSpan={2}>
                        <div className="flex justify-between items-center">
                           <span>{gradeName}</span>
                            <button onClick={() => deleteGrade(gradeName)} className="p-1 text-red-500 hover:bg-red-100 rounded-full" title={`حذف مرحلة ${gradeName} بالكامل`}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </th>
                ))}
            </tr>
            <tr className="bg-gray-100">
                {Object.keys(planData.grades).map(grade => (
                    <React.Fragment key={grade}>
                        <th className="border p-2">المادة الدراسية</th>
                        <th className="border p-2 w-24">عدد الحصص</th>
                    </React.Fragment>
                ))}
            </tr>
        </thead>
    );

    const maxRows = Math.max(...Object.values(planData.grades).map((g: any) => Object.keys(g.subjects).length));
    
    return (
        <div className="bg-white p-4 rounded-lg shadow-md border">
            <h3 className="text-xl font-bold text-center text-cyan-700 mb-4">{title}</h3>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    {tableHeader()}
                    <tbody>
                        {Array.from({ length: maxRows }).map((_, rowIndex) => (
                            <tr key={rowIndex}>
                                {Object.entries(planData.grades).map(([gradeName, gradeData]) => {
                                    const subjectName = Object.keys((gradeData as any).subjects)[rowIndex];
                                    const count = subjectName ? (gradeData as any).subjects[subjectName] : undefined;
                                    return (
                                        <React.Fragment key={gradeName}>
                                            <td className="border p-1">
                                                {subjectName && (
                                                    <div className="flex items-center">
                                                        <span className="flex-grow px-2">{subjectName}</span>
                                                        <button onClick={() => deleteSubject(gradeName, subjectName)} className="p-1 text-red-500 hover:bg-red-100 rounded-full">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="border p-1">
                                                {count !== undefined && (
                                                    <input 
                                                        type="number"
                                                        value={count}
                                                        onChange={(e) => updatePlan(gradeName, subjectName, parseInt(e.target.value) || 0)}
                                                        className="w-full text-center p-1 rounded border-gray-300"
                                                    />
                                                )}
                                            </td>
                                        </React.Fragment>
                                    );
                                })}
                            </tr>
                        ))}
                         {/* Row for adding new subjects */}
                        <tr>
                            {Object.keys(planData.grades).map(gradeName => (
                                <td key={gradeName} colSpan={2} className="border p-1">
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            placeholder="إضافة مادة..."
                                            value={newSubjects[gradeName] || ''}
                                            onChange={(e) => setNewSubjects(prev => ({...prev, [gradeName]: e.target.value}))}
                                            className="w-full text-center p-1 rounded border-gray-300"
                                        />
                                        <button onClick={() => handleAddSubject(gradeName)} className="p-2 bg-green-500 text-white rounded hover:bg-green-600">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-200 font-bold">
                             {Object.entries(planData.grades).map(([gradeName, gradeData]) => (
                                <React.Fragment key={gradeName}>
                                    <td className="border p-2 text-center">مجموع الحصص</td>
                                    <td className="border p-2 text-center">{(gradeData as any).total}</td>
                                </React.Fragment>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

// Helper function to filter a study plan
const filterStudyPlan = (originalPlan: StudyPlan, gradesToKeep: string[]): StudyPlan => {
    const newGrades: StudyPlan['grades'] = {};
    for (const gradeName of gradesToKeep) {
        if (originalPlan.grades[gradeName]) {
            newGrades[gradeName] = originalPlan.grades[gradeName];
        }
    }
    return { grades: newGrades };
};


export default function StudyPlanEditor({ schoolLevel, onSave, savedPlans }: StudyPlanEditorProps) {
    const [plans, setPlans] = useState<Record<string, StudyPlan>>({});

    useEffect(() => {
        const getExpectedPlanKeys = (level: SchoolLevel): string[] => {
            switch(level) {
                case 'ابتدائية': return ['primary'];
                case 'متوسطة': return ['intermediate'];
                case 'اعدادية': return ['preparatory'];
                case 'ثانوية': return ['intermediate', 'preparatory'];
                case 'اعدادي علمي': return ['preparatory'];
                case 'اعدادي ادبي': return ['preparatory'];
                case 'ثانوية علمي': return ['intermediate', 'preparatory'];
                case 'ثانوية ادبي': return ['intermediate', 'preparatory'];
                default: return [];
            }
        };

        const expectedKeys = getExpectedPlanKeys(schoolLevel);
        const savedKeys = savedPlans ? Object.keys(savedPlans) : [];
        const isCompatible = expectedKeys.length > 0 && expectedKeys.every(k => savedKeys.includes(k));

        if (savedPlans && isCompatible) {
            setPlans(JSON.parse(JSON.stringify(savedPlans)));
            return;
        }

        const initialPlans: Record<string, StudyPlan> = {};

        const scientificGrades = ["الرابع العلمي", "الخامس العلمي", "السادس العلمي"];
        const literaryGrades = ["الرابع الادبي", "الخامس الادبي", "السادس الادبي"];

        const scientificPreparatoryPlan = filterStudyPlan(initialPreparatoryPlan, scientificGrades);
        const literaryPreparatoryPlan = filterStudyPlan(initialPreparatoryPlan, literaryGrades);

        switch(schoolLevel) {
            case 'ابتدائية':
                initialPlans.primary = JSON.parse(JSON.stringify(initialPrimaryPlan));
                break;
            case 'متوسطة':
                initialPlans.intermediate = JSON.parse(JSON.stringify(initialIntermediatePlan));
                break;
            case 'اعدادية':
                initialPlans.preparatory = JSON.parse(JSON.stringify(initialPreparatoryPlan));
                break;
            case 'ثانوية':
                initialPlans.intermediate = JSON.parse(JSON.stringify(initialIntermediatePlan));
                initialPlans.preparatory = JSON.parse(JSON.stringify(initialPreparatoryPlan));
                break;
            case 'اعدادي علمي':
                initialPlans.preparatory = scientificPreparatoryPlan;
                break;
            case 'اعدادي ادبي':
                initialPlans.preparatory = literaryPreparatoryPlan;
                break;
            case 'ثانوية علمي':
                initialPlans.intermediate = JSON.parse(JSON.stringify(initialIntermediatePlan));
                initialPlans.preparatory = scientificPreparatoryPlan;
                break;
            case 'ثانوية ادبي':
                initialPlans.intermediate = JSON.parse(JSON.stringify(initialIntermediatePlan));
                initialPlans.preparatory = literaryPreparatoryPlan;
                break;
        }
        
        setPlans(initialPlans);
    }, [schoolLevel, savedPlans]);

    const updatePlanData = (planType: string, grade: string, subject: string, count: number) => {
        setPlans(prevPlans => {
            const newPlans = { ...prevPlans };
            if (newPlans[planType]) {
                const newPlan = JSON.parse(JSON.stringify(newPlans[planType]));
                if(newPlan.grades[grade]) {
                    newPlan.grades[grade].subjects[subject] = count;
                    newPlan.grades[grade].total = Object.values(newPlan.grades[grade].subjects).reduce((sum: number, val: any) => sum + (val as number), 0);
                    newPlans[planType] = newPlan;
                }
            }
            return newPlans;
        });
    };
    
    const addSubjectToPlan = (planType: string, grade: string, subjectName: string) => {
        setPlans(prevPlans => {
            const newPlans = {...prevPlans};
            if(newPlans[planType] && newPlans[planType].grades[grade] && !newPlans[planType].grades[grade].subjects[subjectName]){
                 const newPlan = JSON.parse(JSON.stringify(newPlans[planType]));
                 newPlan.grades[grade].subjects[subjectName] = 0; // Default count
                 newPlans[planType] = newPlan;
            }
            return newPlans;
        });
    };
    
    const deleteSubjectFromPlan = (planType: string, grade: string, subjectName: string) => {
         if (window.confirm(`هل أنت متأكد من حذف مادة "${subjectName}" من الصف ${grade}؟`)) {
            setPlans(prevPlans => {
                const newPlans = { ...prevPlans };
                const targetPlan = newPlans[planType];
                if (targetPlan && targetPlan.grades[grade]) {
                    const newPlan = JSON.parse(JSON.stringify(targetPlan));
                    delete newPlan.grades[grade].subjects[subjectName];
                    // Recalculate total
                    newPlan.grades[grade].total = Object.values(newPlan.grades[grade].subjects).reduce((sum: number, val: any) => sum + (val as number), 0);
                    newPlans[planType] = newPlan;
                }
                return newPlans;
            });
         }
    };
    
    const deleteGradeFromPlan = (planType: string, gradeToDelete: string) => {
        if (window.confirm(`هل أنت متأكد من حذف مرحلة "${gradeToDelete}" بالكامل من الخطة؟`)) {
            setPlans(prevPlans => {
                const newPlans = { ...prevPlans };
                const targetPlan = newPlans[planType];
                if (targetPlan && targetPlan.grades[gradeToDelete]) {
                    const newPlan = JSON.parse(JSON.stringify(targetPlan));
                    delete newPlan.grades[gradeToDelete];
                    newPlans[planType] = newPlan;
                }
                return newPlans;
            });
        }
    };

    return (
        <div className="space-y-6">
            {plans.primary && (
                <EditablePlanTable
                    title="الخطة الدراسية للمرحلة الابتدائية"
                    planData={plans.primary}
                    updatePlan={(grade, subject, count) => updatePlanData('primary', grade, subject, count)}
                    addSubject={(grade, subject) => addSubjectToPlan('primary', grade, subject)}
                    deleteSubject={(grade, subject) => deleteSubjectFromPlan('primary', grade, subject)}
                    deleteGrade={(grade) => deleteGradeFromPlan('primary', grade)}
                />
            )}
            {plans.intermediate && (
                <EditablePlanTable
                    title="الخطة الدراسية للمرحلة المتوسطة"
                    planData={plans.intermediate}
                    updatePlan={(grade, subject, count) => updatePlanData('intermediate', grade, subject, count)}
                    addSubject={(grade, subject) => addSubjectToPlan('intermediate', grade, subject)}
                    deleteSubject={(grade, subject) => deleteSubjectFromPlan('intermediate', grade, subject)}
                    deleteGrade={(grade) => deleteGradeFromPlan('intermediate', grade)}
                />
            )}
            {plans.preparatory && (
                <EditablePlanTable
                    title="الخطة الدراسية للمرحلة الاعدادية"
                    planData={plans.preparatory}
                    updatePlan={(grade, subject, count) => updatePlanData('preparatory', grade, subject, count)}
                    addSubject={(grade, subject) => addSubjectToPlan('preparatory', grade, subject)}
                    deleteSubject={(grade, subject) => deleteSubjectFromPlan('preparatory', grade, subject)}
                    deleteGrade={(grade) => deleteGradeFromPlan('preparatory', grade)}
                />
            )}
            <div className="flex justify-center mt-6">
                <button 
                    onClick={() => onSave(plans)}
                    className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                    <Save size={20} />
                    حفظ الخطة الدراسية
                </button>
            </div>
        </div>
    );
}
