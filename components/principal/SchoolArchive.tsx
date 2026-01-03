import React, { useState } from 'react';
import { Archive, ArrowLeft, X, PlayCircle } from 'lucide-react';

export default function SchoolArchive() {
    const [isArchiveVisible, setIsArchiveVisible] = useState(false);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

    if (isArchiveVisible) {
        return (
            <div className="relative w-full h-full bg-gray-800 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 10rem)' }}>
                <iframe
                    src="https://hussien1977.github.io/arshee/"
                    className="w-full h-full border-0"
                    title="تطبيق الأرشيف المدرسي"
                ></iframe>
                <button
                    onClick={() => setIsArchiveVisible(false)}
                    className="absolute top-4 right-4 bg-red-600 text-white rounded-full p-3 shadow-lg hover:bg-red-700 transition-transform transform hover:scale-110 z-10"
                    aria-label="الخروج من الأرشيف"
                >
                    <X size={24} />
                </button>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-gray-100 to-blue-100 p-8 rounded-2xl shadow-2xl max-w-4xl mx-auto text-center border-t-4 border-blue-500">
            {isVideoModalOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[100] p-4"
                    onClick={() => setIsVideoModalOpen(false)}
                >
                    <div 
                        className="bg-black p-2 rounded-lg shadow-xl w-full max-w-4xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setIsVideoModalOpen(false)}
                            className="absolute -top-3 -right-3 bg-white text-black rounded-full p-2 z-10 shadow-lg hover:scale-110 transition-transform"
                            aria-label="Close video"
                        >
                            <X size={24} />
                        </button>
                        <div className="relative w-full" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
                            <iframe
                                src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2F61578356680977%2Fvideos%2F4349473952043149%2F&show_text=false&autoplay=1&mute=0"
                                className="absolute top-0 left-0 w-full h-full"
                                style={{ border: 'none', overflow: 'hidden' }}
                                title="Facebook video player"
                                frameBorder="0"
                                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                allowFullScreen={true}>
                            </iframe>
                        </div>
                    </div>
                </div>
            )}

            <Archive className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-4xl font-extrabold text-gray-800 mb-4">
                تطبيق الأرشيف المدرسي
            </h2>
            
            <button
                onClick={() => setIsVideoModalOpen(true)}
                className="mb-6 inline-flex items-center gap-2 px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-transform transform hover:scale-105"
            >
                <PlayCircle size={20} />
                شاهد عرض توضيحي لتطبيق الارشيف المدرسي
            </button>

            <div className="text-lg text-gray-700 space-y-4 max-w-3xl mx-auto leading-relaxed text-right bg-white p-6 rounded-lg shadow-inner">
                <p>هل تعبت من فوضى الأوراق والمستندات في مدرستك؟ هل تبحث عن طريقة لإنهاء معاناة البحث عن ورقة رسمية بين أكوام الملفات؟</p>
                <p className="font-bold text-2xl text-blue-600 my-4 text-center">📚✨ وداعاً للأرشيف الورقي! ✨📚</p>
                <p>نقدم لك تطبيق الأرشيف المدرسي، الحل الأمثل لإدارة وتنظيم جميع مستندات مدرستك بذكاء وسهولة.</p>
                <p>هذا النظام المتكامل يمنحك القوة لتتحكم بجميع وثائقك الرسمية:</p>
                <ul className="list-disc list-inside space-y-2 pr-5 mt-4">
                    <li><span className="font-semibold">الأرشيف العام:</span> قم بأرشفة جميع كتبك الرسمية، البريد الوارد، والمستندات العامة في مكان رقمي واحد آمن ومنظم. وداعاً للبحث اليدوي!</li>
                    <li><span className="font-semibold">ملفات المعلمين:</span> خصص لكل معلم مجلداً خاصاً به، مما يضمن تنظيم المراسلات والوثائق الشخصية بشكل لا يصدق.</li>
                </ul>
                <p className="mt-4">وفر وقتك وجهدك، واجعل عملك الإداري أكثر احترافية.</p>
            </div>
            <button
                onClick={() => setIsArchiveVisible(true)}
                className="mt-10 inline-block px-12 py-5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold text-2xl rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 ease-in-out"
            >
                <div className="flex items-center justify-center gap-3">
                    <span>دخول التطبيق</span>
                    <ArrowLeft />
                </div>
            </button>
        </div>
    );
}