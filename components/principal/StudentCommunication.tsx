import React from 'react';
import type { User, SchoolSettings, ClassData } from '../../types';

interface StudentCommunicationProps {
    principal: User;
    settings: SchoolSettings;
    classes: ClassData[];
}

export default function StudentCommunication({ principal, settings, classes }: StudentCommunicationProps) {
    return (
        <div className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold">التواصل مع الطلبة</h2>
            <p className="mt-4 text-gray-600">هذه الميزة قيد التطوير حالياً.</p>
        </div>
    );
}
