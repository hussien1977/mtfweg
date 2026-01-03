
import React from 'react';
import { Map as MapIcon } from 'lucide-react';

export default function ExamHallsManager() {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-4xl mx-auto text-center border-t-4 border-cyan-500 animate-in fade-in zoom-in duration-300">
            <h2 className="text-4xl font-extrabold text-gray-800 mb-4">
                نظام إدارة مخططات الجلوس الامتحانية
            </h2>
            <p className="text-lg text-gray-700 mb-6 font-semibold">
                تستطيع تكوين خرائط جلوس الطلبة الان من خلال ( نظام إدارة مخططات الجلوس الامتحانية )
            </p>
            
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-inner mb-8 text-right">
                <p className="text-md text-gray-600 max-w-3xl mx-auto leading-relaxed font-medium">
                    سوف تمكنك اداتنا المتطورة ان تنشئ قاعات امتحانية بكفائة عالية مع رمز QR لكل طالب تستطيع مسحه باستخدام كامرة الموبايل او الكامرة المرتبطة بالحاسوب لتسجيل غيابات الطلاب والتلاميذ. قم بتصدير اوراق القاعات وارفاقها مع سجل السيطرة الامتحانية. اتحنا لك اضافة لمساتك الخاصة على القاعات المصدرة ليكون سجل السيطرة الامتحانية لديك مميزا.
                </p>
            </div>
            
            <div className="flex justify-center">
                <a 
                    href="https://hussien1977.github.io/qait/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-purple-500 via-indigo-600 to-blue-600 text-white font-black text-2xl rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1.5 active:scale-95 transition-all duration-300"
                >
                    <span>انشئ قاعاتك الامتحانية الان</span>
                    <MapIcon size={32} />
                </a>
            </div>
        </div>
    );
}
