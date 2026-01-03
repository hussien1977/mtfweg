import React from 'react';
import { Edit2 } from 'lucide-react';

export default function CoverEditor() {
    return (
        <div className="bg-gray-100 p-4 sm:p-8 rounded-lg flex items-center justify-center">
            <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-2xl max-w-4xl mx-auto text-center border-t-8 border-pink-200">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-800 mb-6">
                    محرر صور المستندات المدرسية
                </h2>
                <p className="text-md sm:text-lg text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                    أداة تعليمية مبتكرة تسهّل على المعلمين والإداريين تصميم أغلفة احترافية لسجلاتهم التعليمية مثل سجل الدرجات، الخطط، الملازم والسجلات الإدارية. اختر من تصاميم جاهزة، وخصصها بسهولة عبر تعديل النصوص والمعلومات كاسم المعلم، الصف، المادة والتاريخ، ضع صورتك الشخصية في الغلاف او شعار مدرستك بثواني معدوده. دون الحاجة لأي خبرة في التصميم.
                </p>

                <div className="my-8 p-4 bg-white rounded-lg shadow-inner border border-gray-200">
                     <p className="text-xl sm:text-2xl font-bold text-pink-600 flex items-center justify-center gap-3">
                        <span role="img" aria-label="pen">📌</span>
                        <span>ابدأ الآن واصنع مستنداتك بأسلوب يليق برسالتك التعليمية!</span>
                    </p>
                </div>

                <a 
                    href="https://service-58570933966.us-west1.run.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-10 py-4 bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold text-xl sm:text-2xl rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1.5 transition-all duration-300 ease-in-out"
                >
                    <div className="flex items-center justify-center gap-3">
                        <Edit2 size={28} />
                        <span>ابدأ تصميم الغلاف</span>
                    </div>
                </a>
            </div>
        </div>
    );
}