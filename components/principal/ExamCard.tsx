
import React from 'react';
import type { SchoolSettings } from '../../types.ts';

interface StudentCardData {
    fullName: string;
    motherName: string;
    birthDate: string;
    examId: string;
    governorate: string;
}

interface ExamCardProps {
    student: StudentCardData;
    settings: SchoolSettings;
}

const Text: React.FC<{ children?: React.ReactNode; top: string; right: string; fontSize?: string; className?: string }> = ({ children, top, right, fontSize = '22px', className = '' }) => (
    <p style={{ position: 'absolute', top, right, fontSize, fontWeight: 'bold' }} className={className}>
        {children}
    </p>
);

const CenteredText: React.FC<{ children?: React.ReactNode; top: string; fontSize?: string; className?: string }> = ({ children, top, fontSize = '22px', className = '' }) => (
    <p style={{ position: 'absolute', top, left: '50%', transform: 'translateX(-50%)', fontSize, fontWeight: 'bold', width: '100%', textAlign: 'center' }} className={className}>
        {children}
    </p>
);

export default function ExamCard({ student, settings }: ExamCardProps) {
    const cardStyle: React.CSSProperties = {
        width: '780px',
        height: '514px',
        backgroundImage: 'url(https://i.imgur.com/JqOqBl6.png)',
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        fontFamily: '"Times New Roman", Times, serif',
        color: 'black',
        direction: 'rtl',
    };

    return (
        <div style={cardStyle}>
            {/* Right-aligned Data */}
            <Text top="218px" right="221px">{student.fullName}</Text>
            <Text top="246px" right="221px">{student.motherName}</Text>
            <Text top="276px" right="221px">{student.birthDate}</Text>
            <Text top="306px" right="221px">{settings.schoolName}</Text>
            <Text top="334px" right="221px">{student.examId}</Text>
            <Text top="367px" right="221px">{student.governorate}</Text>

            {/* Left-side Data */}
                <Text top="388px" right="543px">{settings.principalName}</Text>
        </div>
    );
}