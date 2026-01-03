import React from 'react';
import { Sparkles, BookCopy, Edit, CheckSquare, FileText, ImageIcon, BrainCircuit, BookOpen } from 'lucide-react';

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-cyan-200/50 hover:border-cyan-400 transition-all duration-300">
        <div className="flex items-center gap-4 mb-3">
            <div className="bg-cyan-100 text-cyan-600 p-3 rounded-full">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        </div>
        <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
);

export default function TeacherPlatform() {
    return (
        <div className="bg-gradient-to-br from-gray-50 to-cyan-50 p-8 rounded-2xl shadow-xl max-w-6xl mx-auto border-t-4 border-cyan-500">
            <div className="text-center mb-10">
                <Sparkles className="w-16 h-16 text-cyan-500 mx-auto mb-4 animate-pulse" />
                <h2 className="text-5xl font-extrabold text-gray-800">
                    تربوي تك الأستاذ
                </h2>
                <p className="mt-4 text-2xl font-semibold text-gray-600">
                    موقع وتطبيق متكامل لكل ما يحتاجه المدرس في مختلف الاختصاصات للمراحل الثانوية.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                <FeatureCard 
                    icon={<BookCopy size={28} />}
                    title="توليد خطط يومية احترافية"
                    description="أنشئ خططًا دراسية يومية متكاملة بضغطة زر، مصممة لتلبية احتياجات طلابك وتحقيق أفضل النتائج."
                />
                <FeatureCard 
                    icon={<Edit size={28} />}
                    title="إنشاء أسئلة الامتحانات"
                    description="صمم أسئلة امتحانية شاملة ومتنوعة بسهولة، مع خيارات متعددة لتغطية كافة جوانب المنهج الدراسي."
                />
                <FeatureCard 
                    icon={<CheckSquare size={28} />}
                    title="اختبارات يومية مع فحص تلقائي"
                    description="وفر وقتك وجهدك عبر إنشاء اختبارات يومية مصغرة يتم تصحيحها تلقائيًا، مع تزويدك بتحليلات فورية لأداء الطلاب."
                />
                 <FeatureCard 
                    icon={<FileText size={28} />}
                    title="تكوين سجلات الدرجات"
                    description="نظم درجات طلابك وأصدر سجلات دقيقة واحترافية بسهولة، مما يسهل عليك متابعة تقدمهم الأكاديمي."
                />
                <FeatureCard 
                    icon={<ImageIcon size={28} />}
                    title="تصميم أغلفة السجلات المدرسية"
                    description="أضف لمسة إبداعية لمستنداتك عبر تصميم أغلفة جذابة ومخصصة لسجلاتك ودفاترك المدرسية."
                />
                <FeatureCard 
                    icon={<BrainCircuit size={28} />}
                    title="موسوعات ومسابقات تفاعلية"
                    description="حوّل المادة الدراسية إلى تجربة ممتعة عبر موسوعات غنية ومسابقات تفاعلية تزيد من حماس الطلاب وتعمّق فهمهم."
                />
            </div>
            
            <p className="text-center text-xl text-gray-700 font-semibold mb-8">
                كل هذا وأكثر تجدونه في تطبيق واحد... تربوي تك الأستاذ، الخيار الأمثل لكل تربوي.
            </p>

            <div className="text-center">
                <a 
                    href="https://service-870494691428.us-west1.run.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-12 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-2xl rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 ease-in-out"
                >
                    <div className="flex items-center justify-center gap-3">
                        <BookOpen />
                        <span>جرب التطبيق الان</span>
                    </div>
                </a>
                <div className="mt-8 text-gray-600 bg-yellow-100 border-l-4 border-yellow-400 p-4 rounded-md inline-block">
                    <p>من أجل التعرف على طريقة التفعيل وفواتير الاشتراك، يرجى مراسلتنا على واتساب:</p>
                    <a 
                        href="https://wa.me/9647883315837"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-2 text-2xl font-bold text-green-600 tracking-wider hover:text-green-700"
                    >
                        9647883315837
                    </a>
                </div>
            </div>
        </div>
    );
}