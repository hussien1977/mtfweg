import React from 'react';
import type { Student, ClassData, SchoolSettings, StudentResult } from '../../types.ts';

interface DecisionStudent extends Student {
    classId: string;
    amountGranted: number;
    decisionSubjects: { name: string; points: number }[];
    remainingPoints: number;
    finalResult: StudentResult['status'];
}

interface DecisionLogReportProps {
    students: DecisionStudent[];
    classMap: Map<string, ClassData>;
    settings: SchoolSettings;
    startingIndex?: number;
}

export default function DecisionLogReport({ students, classMap, settings, startingIndex = 0 }: DecisionLogReportProps) {
    const headers = ['ت', 'اسم الطالب', 'الصف والشعبة', 'مقدار المنح', 'المواد التي حصل عليها القرار', 'المتبقي', 'النتيجة'];
    
    return (
        <table className="w-full border-collapse border border-black text-lg">
            <thead className="bg-gray-200">
                <tr>
                    {headers.map(h => <th key={h} className="border border-black p-2 font-bold">{h}</th>)}
                </tr>
            </thead>
            <tbody>
                {students.map((s, i) => (
                    <tr key={s.id} className="odd:bg-white even:bg-gray-100 h-12">
                        <td className="border border-black p-2 text-center">{startingIndex + i + 1}</td>
                        <td className="border border-black p-2 text-right">{s.name}</td>
                        <td className="border border-black p-2 text-center">{`${classMap.get(s.classId)?.stage} - ${classMap.get(s.classId)?.section}`}</td>
                        <td className="border border-black p-2 text-center font-bold text-blue-600">{s.amountGranted}</td>
                        <td className="border border-black p-2 text-center font-semibold text-green-600">{s.decisionSubjects.map(ds => `${ds.name} (${ds.points}+)`).join('، ')}</td>
                        <td className="border border-black p-2 text-center">{s.remainingPoints}</td>
                        <td className="border border-black p-2 text-center font-semibold">{s.finalResult}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}