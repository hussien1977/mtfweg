import React from 'react';
import { Map as MapIcon } from 'lucide-react';

interface SeatingChartsManagerProps {
    setCurrentPageKey: (key: any) => void;
}

const PageWrapper = ({ title, children, onPrev, onNext }: { title: string, children?: React.ReactNode, onPrev: () => void, onNext: () => void }) => (
    <div className="bg-white p-8 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
            <button onClick={onPrev} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">&larr; الصفحة السابقة</button>
            <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
            <button onClick={onNext} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">الصفحة التالية &rarr;</button>
        </div>
        {children}
    </div>
);

export default function SeatingChartsManager({ setCurrentPageKey }: SeatingChartsManagerProps) {
    return (
        <PageWrapper 
            title="خرائط جلوس الطلبة"
            onPrev={() => setCurrentPageKey('questions_answers_receipt')}
            onNext={() => setCurrentPageKey('absence_form')}
        >
            <div className="bg-gradient-to-b from-fuchsia-50 via-purple-50 to-indigo-100 p-8 rounded-2xl shadow-2xl border border-purple-200 text-center">
                <h2 className="text-4xl font-extrabold text-gray-800 mb-4">
                    نظام إدارة مخططات الجلوس الامتحانية
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                    تستطيع تكوين خرائط جلوس الطلبة الان من خلال ( نظام إدارة مخططات الجلوس الامتحانية )
                </p>
                <p className="text-md text-gray-700 max-w-2xl mx-auto leading-relaxed mb-8">
                    سوف تمكنك اداتنا المتطورة ان تنشئ قاعات امتحانية بكفائة عالية مع رمز QR لكل طالب تستطيع مسحه باستخدام كامرة الموبايل او الكامرة المرتبطة بالحاسوب لتسجيل غيابات الطلاب والتلاميذ. قم بتصدير اوراق القاعات وارفاقها مع سجل السيطرة الامتحانية. اتحنا لك اضافة لمساتك الخاصة على القاعات المصدرة ليكون سجل السيطرة الامتحانية لديك مميزا.
                </p>
                <a 
                    href="https://hussien1977.github.io/qait/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-3 mt-8 px-10 py-5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-xl rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
                >
                    <MapIcon size={28} />
                    <span>انشئ قاعاتك الامتحانية الان</span>
                </a>
            </div>
        </PageWrapper>
    );
}