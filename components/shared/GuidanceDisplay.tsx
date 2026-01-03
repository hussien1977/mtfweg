import React from 'react';
import type { CounselorGuidance } from '../../types.ts';
import { BookHeart } from 'lucide-react';

interface GuidanceDisplayProps {
    guidance: CounselorGuidance;
}

const renderContent = (text: string) => {
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/;
    const facebookVideoRegex = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:watch\/?\?v=|(?:[\w.-]+\/)?videos?\/|photo.php\?v=)(\d{10,})/;
    const imageRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|svg))/i;

    return text.split('\n').map((line, index) => {
        const youtubeMatch = line.match(youtubeRegex);
        if (youtubeMatch && youtubeMatch[1]) {
            const videoId = youtubeMatch[1];
            return (
                <div key={index} className="aspect-video my-4 rounded-lg overflow-hidden shadow-lg">
                    <iframe
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen>
                    </iframe>
                </div>
            );
        }
        
        const facebookMatch = line.match(facebookVideoRegex);
        if (facebookMatch && facebookMatch[0]) {
            const videoUrl = encodeURIComponent(facebookMatch[0]);
            return (
                 <div key={index} className="aspect-video my-4 rounded-lg overflow-hidden shadow-lg bg-gray-200">
                    <iframe 
                        src={`https://www.facebook.com/plugins/video.php?href=${videoUrl}&show_text=false&autoplay=0&width=500`} 
                        className="w-full h-full"
                        style={{border:'none', overflow:'hidden'}}
                        scrolling="no" 
                        frameBorder="0" 
                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" 
                        allowFullScreen={true}>
                    </iframe>
                </div>
            );
        }

        const imageMatch = line.match(imageRegex);
        if (imageMatch && imageMatch[0]) {
            return (
                <img key={index} src={imageMatch[0]} alt="embedded content" className="my-4 rounded-lg shadow-lg max-w-full h-auto mx-auto" />
            );
        }

        return <p key={index} className="my-2 leading-relaxed">{line || '\u00A0'}</p>;
    });
};


export default function GuidanceDisplay({ guidance }: GuidanceDisplayProps) {
    return (
        <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 p-6 rounded-2xl shadow-lg border-t-4 border-cyan-400">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-cyan-100 text-cyan-600 p-3 rounded-full">
                    <BookHeart size={28} />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-800">{guidance.title}</h3>
                    <p className="text-sm text-gray-500">
                        من المرشد التربوي: {guidance.counselorName} - {new Date(guidance.createdAt).toLocaleDateString('ar-EG')}
                    </p>
                </div>
            </div>
            <div className="text-gray-700 text-lg prose max-w-none">
                {renderContent(guidance.content)}
            </div>
        </div>
    );
}