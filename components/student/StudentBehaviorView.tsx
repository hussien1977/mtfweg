import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase.ts';
import type { User, BehaviorDeduction, SchoolSettings } from '../../types.ts';
import { ShieldAlert, ShieldCheck, ShieldBan, FileText } from 'lucide-react';

interface StudentBehaviorViewProps {
    currentUser: User;
    deductions: BehaviorDeduction[];
}

const BEHAVIOR_SCORE_BASE = 100;
const FAILING_THRESHOLD = 51;

export default function StudentBehaviorView({ currentUser, deductions }: StudentBehaviorViewProps) {
    const [settings, setSettings] = useState<SchoolSettings | null>(null);
    
    useEffect(() => {
        if (currentUser.principalId) {
            db.ref(`settings/${currentUser.principalId}`).get().then(snapshot => {
                if (snapshot.exists()) {
                    setSettings(snapshot.val());
                }
            });
        }
    }, [currentUser.principalId]);

    const totalDeducted = useMemo(() => {
        return deductions.reduce((sum, d) => sum + d.pointsDeducted, 0);
    }, [deductions]);

    const remainingScore = BEHAVIOR_SCORE_BASE - totalDeducted;
    const isFailing = totalDeducted >= FAILING_THRESHOLD;
    const pointsToFail = FAILING_THRESHOLD - totalDeducted;
    const studentLabel = settings?.schoolLevel === 'ابتدائية' ? 'التلميذ' : 'الطالب';


    const renderStatus = () => {
        // Case 1: Failing
        if (isFailing) {
            return (
                <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
                    <div className="flex items-center gap-3">
                        <ShieldBan className="w-8 h-8" />
                        <div>
                            <p className="font-bold text-lg">تنبيه هام: حالة الرسوب</p>
                            <p>لقد تجاوزت الحد المسموح به من خصومات السلوك. تعتبر راسباً في صفك لهذا العام الدراسي.</p>
                        </div>
                    </div>
                </div>
            );
        }

        // Case 2: Perfect behavior (as requested by the user)
        if (totalDeducted === 0) {
            return (
                 <div className="p-4 bg-green-100 border-l-4 border-green-500 text-green-700">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8" />
                        <div>
                            <p className="font-bold text-lg">سلوكك جيد</p>
                            <p>استمر في الحفاظ على سلوك منضبط داخل المدرسة.</p>
                        </div>
                    </div>
                </div>
            );
        }

        // Case 3: Any deduction > 0 but not failing yet
        const warningMessage = pointsToFail <= 20 
            ? `متبقي لك ${pointsToFail} درجات فقط قبل الوصول إلى حد الرسوب. يرجى الالتزام.` 
            : `تم خصم ${totalDeducted} درجات من رصيد سلوكك. انتبه، فالوصول إلى ${FAILING_THRESHOLD} درجة خصم يعني الرسوب.`;
            
        return (
            <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
                 <div className="flex items-center gap-3">
                    <ShieldAlert className="w-8 h-8" />
                    <div>
                        <p className="font-bold text-lg">تنبيه سلوك</p>
                        <p>{warningMessage}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-lg text-center">
                    <h3 className="text-lg font-semibold text-gray-600">مجموع الخصومات</h3>
                    <p className="text-5xl font-bold text-red-500 mt-2">{totalDeducted}</p>
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-lg text-center">
                    <h3 className="text-lg font-semibold text-gray-600">الرصيد المتبقي من السلوك</h3>
                    <p className="text-5xl font-bold text-green-500 mt-2">{remainingScore} / {BEHAVIOR_SCORE_BASE}</p>
                </div>
            </div>
            
            {renderStatus()}
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><FileText />سجل المخالفات</h3>
                 <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                    {deductions.length > 0 ? deductions.map(d => (
                        <div key={d.id} className="p-3 bg-gray-50 rounded-lg border-l-4 border-red-400">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-red-600">خصم {d.pointsDeducted} درجات</span>
                                <span className="text-gray-500">{new Date(d.timestamp).toLocaleDateString('ar-EG')}</span>
                            </div>
                            <p className="mt-2 text-gray-800">{d.reason}</p>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 p-8">لا توجد مخالفات مسجلة.</p>
                    )}
                </div>
            </div>
        </div>
    );
}