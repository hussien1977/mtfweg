


import React from 'react';
import type { StudentNotification } from '../../types.ts';
import { X, Bell } from 'lucide-react';

interface StudentNotificationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: StudentNotification[];
}

export default function StudentNotificationsModal({ isOpen, onClose, notifications }: StudentNotificationsModalProps) {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[101] p-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col"
                style={{ maxHeight: '80vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b">
                    <div className="flex items-center gap-3">
                        <Bell className="text-cyan-600" />
                        <h2 className="text-xl font-bold text-gray-800">الإشعارات</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full">
                        <X size={24} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4">
                    {notifications.length > 0 ? (
                        <div className="space-y-3">
                            {notifications.map(notification => (
                                <div key={notification.id} className={`p-3 rounded-lg border-l-4 ${notification.isRead ? 'bg-gray-50 border-gray-300' : 'bg-blue-50 border-blue-400'}`}>
                                    <p className="text-gray-800">{notification.message}</p>
                                    <p className="text-xs text-gray-500 text-left mt-2">
                                        {new Date(notification.timestamp).toLocaleString('ar-EG', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">لا توجد إشعارات لعرضها.</p>
                    )}
                </div>

                 <footer className="p-4 border-t">
                     <button 
                        onClick={onClose} 
                        className="w-full px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300"
                    >
                        إغلاق
                    </button>
                </footer>
            </div>
        </div>
    );
}