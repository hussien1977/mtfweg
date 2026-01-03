import React from 'react';
import type { Student, ClassData, SchoolSettings } from '../../types';

interface ParentInvitationCardProps {
    student: Student;
    classData: ClassData;
    settings: SchoolSettings;
    meetingTime: string;
    meetingDay: string;
    schoolLogo: string | null;
}

export default function ParentInvitationCard({ student, classData, settings, meetingTime, meetingDay, schoolLogo }: ParentInvitationCardProps) {
    
    const cardStyle: React.CSSProperties = {
        width: '370px',
        height: '520px',
        backgroundImage: 'url(https://i.imgur.com/9tZ8dYb.jpeg)',
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        fontFamily: "'Cairo', sans-serif",
        color: 'black',
        position: 'relative',
        direction: 'rtl',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '10px 20px 30px 20px' // Adjusted padding to move content up
    };

    return (
        <div style={cardStyle}>
            {/* Top section - adjusted margin */}
            <div className="text-center" style={{ marginTop: '45px' }}>
                <p className="text-xl font-bold" style={{ marginBottom: '35px' }}>ادارة : {settings.schoolName}</p>
                
                 <div className="mx-auto bg-white/50 rounded-full w-24 h-24 flex items-center justify-center p-1" style={{ position: 'relative', top: '15px' }}>
                    {schoolLogo ? (
                         <img src={schoolLogo} alt="شعار" className="w-full h-full object-contain rounded-full" />
                    ) : (
                        <span className="font-bold">شعار</span>
                    )}
                </div>
            </div>

            {/* Middle section - adjusted font sizes */}
            <div className="text-center px-4" style={{ marginTop: '15px' }}>
                <p className="text-base font-bold">الى ولي امر الطالب / {student.name}</p>
                <p className="text-base font-bold">{classData.stage} / {classData.section}</p>
                
                <p className="text-lg font-bold mt-3" style={{ color: '#C70039' }}>
                    لأننا نؤمن بأن  نجاح الطالب ثمرة تعاون
                </p>
                <p className="text-lg font-bold" style={{ color: '#C70039' }}>
                      البيت والمدرسة
                </p>
                
                <p className="text-base font-semibold mt-3">
                    تتشرف إدارة مدرستنا بدعوتكم لحضور
                </p>
                <p className="text-xl font-bold" style={{ color: '#2563EB' }}>
                    اجتماع مجلس أولياء الأمور
                </p>
            </div>
            
            {/* Bottom section - adjusted margin */}
            <div className="text-center font-bold text-base mb-4" style={{ position: 'relative', bottom: '15px' }}>
                <p>يوم: {meetingDay}</p>
                <p>الساعة: {meetingTime}</p>
            </div>
        </div>
    );
}