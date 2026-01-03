
import React, { useState } from 'react';
import { LogIn, Key, Loader2 } from 'lucide-react';

interface LoginProps {
    onLogin: (identifier: string, secret: string) => Promise<boolean>;
    isAuthReady?: boolean;
}

export default function Login({ onLogin, isAuthReady = true }: LoginProps) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        
        // Small artificial delay for better UX feedback if local check is too fast
        await new Promise(resolve => setTimeout(resolve, 500));

        const loginSuccess = await onLogin(code, '');
        
        if (!loginSuccess) {
            setError('رمز الدخول غير صحيح. يرجى المحاولة مرة أخرى.');
        }

        setIsSubmitting(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4" style={{ fontFamily: "'Cairo', sans-serif" }}>
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-8">
                <div className="text-center">
                    <img src="https://i.imgur.com/0zjxJmi.jpeg" alt="شعار ثانوية المتفوقين الاولى" className="mx-auto w-40 h-40 mb-4 rounded-full object-cover" />
                    <h1 className="text-4xl font-extrabold text-gray-800">
                        ادارة ثانوية المتفوقين الاولى
                    </h1>
                </div>

                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800">تسجيل الدخول</h2>
                </div>

                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="relative">
                        <input
                            type="password"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="رمز الدخول"
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 transition text-center"
                            required
                        />
                         <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                             <Key size={20} />
                         </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !isAuthReady}
                        className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition-colors shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {!isAuthReady ? (
                             <>
                                <Loader2 className="animate-spin h-5 w-5" />
                                <span>جاري الاتصال...</span>
                            </>
                        ) : isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>جاري الدخول...</span>
                            </>
                        ) : (
                            <>
                                <LogIn size={20} />
                                <span>دخول</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}