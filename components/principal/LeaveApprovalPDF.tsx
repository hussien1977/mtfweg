import React from 'react';

interface LeaveApprovalPDFProps {
    approvalBody: string;
}

export default function LeaveApprovalPDF({ approvalBody }: LeaveApprovalPDFProps) {
    return (
        <div className="w-[794px] h-[1123px] p-12 bg-white font-['Cairo'] flex flex-col" dir="rtl">
            <pre className="w-full h-full text-xl leading-relaxed whitespace-pre-wrap font-['Cairo']">
                {approvalBody}
            </pre>
        </div>
    );
}