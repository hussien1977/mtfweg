import React from 'react';
import type { SchoolSettings } from '../../types.ts';

interface Decision132PDFPageProps {
    settings: SchoolSettings;
    decisionText: string;
}

export default function Decision132PDFPage({ settings, decisionText }: Decision132PDFPageProps) {
    return (
        <div className="w-[794px] h-[1123px] bg-white p-12 flex flex-col font-['Cairo']" dir="rtl">
            <header className="text-center mb-12">
                <h1 className="text-4xl font-bold border-b-4 border-black pb-4">بسم الله الرحمن الرحيم</h1>
            </header>
            <main className="flex-grow text-2xl leading-loose">
                 <pre className="whitespace-pre-wrap font-['Cairo'] font-semibold text-right">
                    {decisionText}
                </pre>
            </main>
            <footer className="mt-auto pt-16 flex justify-end text-xl font-bold">
                <div className="text-center">
                    <p>مدير المدرسة</p>
                    <p className="mt-4">{settings.principalName}</p>
                </div>
            </footer>
        </div>
    );
}