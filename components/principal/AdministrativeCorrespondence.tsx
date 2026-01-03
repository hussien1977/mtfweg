import React from 'react';
import { Send } from 'lucide-react';

export default function AdministrativeCorrespondence() {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-4xl mx-auto text-center border-t-4 border-cyan-500">
            <h2 className="text-3xl font-extrabold text-gray-800 mb-6">
                برنامج المراسلات الإدارية
            </h2>
            <p className="text-lg font-bold text-gray-700 mb-6 max-w-3xl mx-auto leading-relaxed">
                نقدم لكم برنامج مراسلات إدارية مبتكر، صمم خصيصًا لتسهيل وتبسيط المهام الإدارية لمديري المدارس. إنه بمثابة أداة ذكية تجمع تحت مظلتها مجموعة شاملة من القوالب الجاهزة لمختلف المراسلات الإدارية.
            </p>

            <div className="text-right text-md text-gray-600 space-y-2 mb-8 bg-gray-50 p-6 rounded-lg border">
                <p className="font-bold text-lg mb-4 text-cyan-700">تشمل القوالب المتوفرة نطاقًا واسعًا من السيناريوهات، منها:</p>
                <ul className="list-disc list-inside space-y-2">
                    <li><span className="font-semibold">نماذج مراسلات متنوعة:</span> قوالب لمراسلات المدارس للبنين والبنات والمختلطة.</li>
                    <li><span className="font-semibold">نماذج تأكيد وتثبيت:</span> لتثبيت درجات الطلاب، وتخرجهم، ومباشرة المعلمين والموظفين، بالإضافة إلى نماذج مباشرة العائدين من إجازة الأمومة.</li>
                    <li><span className="font-semibold">نماذج إجراءات إدارية:</span> لقوالب إعارة المعلمات والموظفات، وتثبيت استمرارية المعلمات، الموظفين، الطلاب، المحاضرين، والإداريين، بالإضافة إلى قوالب إحالة المعلمات والموظفين والطلاب.</li>
                    <li><span className="font-semibold">نماذج ترشيح وطلب:</span> لترشيح الأفراد للدورات، التفويض، طلب إعفاء المديرين والمديرات، وطلب الإجازات الخاصة.</li>
                    <li><span className="font-semibold">وظائف إضافية:</span> تفويض باستلام الكتب، الاستفسار عن الغياب والانقطاع، قبول الطالبات، وطلب الأثاث.</li>
                </ul>
                <p className="mt-4">
                    كما يوفر الموقع إعدادات مرنة للخلفيات، مما يتيح للمستخدمين تغيير خلفية النماذج وتعديل شفافيتها، أو العودة إلى الإعدادات الافتراضية. هذا البرنامج يهدف إلى تعزيز الكفاءة والدقة في إدارة المراسلات اليومية داخل البيئة التعليمية.
                </p>
            </div>
            
            <a 
                href="https://hussien1977.github.io/moga2/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xl rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out"
            >
                <div className="flex items-center justify-center gap-3">
                    <Send />
                    <span>انتقل للمراسلات</span>
                </div>
            </a>
        </div>
    );
}