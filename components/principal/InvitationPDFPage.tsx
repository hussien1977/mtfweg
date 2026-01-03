import React from 'react';
import type { Student, ClassData, SchoolSettings } from '../../types.ts';
import ParentInvitationCard from './ParentInvitationCard.tsx';

interface InvitationPDFPageProps {
    studentsChunk: Student[];
    classMap: Map<string, ClassData>; // Map studentId to their class
    settings: SchoolSettings;
    meetingTime: string;
    meetingDay: string;
    schoolLogo: string | null;
}

export default function InvitationPDFPage({ studentsChunk, classMap, settings, meetingTime, meetingDay, schoolLogo }: InvitationPDFPageProps) {
    // Fill the chunk with placeholders to ensure a 2x2 grid is always rendered
    const displayItems = [...studentsChunk];
    while (displayItems.length < 4) {
        displayItems.push(null);
    }
    
    return (
        <div 
            className="w-[794px] h-[1123px] bg-white p-2 grid grid-cols-2 grid-rows-2 gap-2 justify-items-center items-center" 
            style={{ direction: 'rtl' }}
        >
            {displayItems.map((student, index) => {
                if (!student) {
                    return <div key={`placeholder-${index}`} className="w-[370px] h-[520px]"></div>;
                }
                const classData = classMap.get(student.id);
                if (!classData) return null;
                return (
                    <div key={student.id}>
                        <ParentInvitationCard
                            student={student}
                            classData={classData}
                            settings={settings}
                            meetingTime={meetingTime}
                            meetingDay={meetingDay}
                            schoolLogo={schoolLogo}
                        />
                    </div>
                );
            })}
        </div>
    );
}