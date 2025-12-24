
import React from 'react';
import { GeneratedScript } from '../types';

interface PptPreviewProps {
  script: GeneratedScript;
}

export const PptPreview: React.FC<PptPreviewProps> = ({ script }) => {
  return (
    <div className="flex flex-col items-center gap-12 py-8 bg-gray-200/30 rounded-2xl">
      {/* Title Slide Preview */}
      <div className="w-full max-w-4xl aspect-[16/9] bg-white shadow-xl rounded-lg overflow-hidden flex flex-col items-center justify-center p-12 text-center border border-gray-100 relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-pink-500"></div>
        <h1 className="text-5xl font-extrabold text-gray-900 mb-6">{script.title}</h1>
        <p className="text-xl text-gray-600 max-w-2xl leading-relaxed">{script.introduction}</p>
        <div className="mt-12 text-sm text-gray-400 font-medium tracking-widest uppercase">MommyBook AI Presentation</div>
      </div>

      {/* Story Slides Preview */}
      {script.frames.map((frame, index) => (
        <div key={frame.id} className="w-full max-w-4xl aspect-[16/9] bg-white shadow-xl rounded-lg overflow-hidden flex flex-col border border-gray-100 relative">
          <div className="flex-1 bg-gray-50 flex items-center justify-center overflow-hidden">
            {frame.imageUrl ? (
              <img src={frame.imageUrl} alt={`Slide ${index + 1}`} className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-300">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">未生成图片</span>
              </div>
            )}
          </div>
          <div className="h-1/4 bg-white p-6 flex items-center justify-center text-center border-t border-gray-50">
            <p className="text-lg text-gray-800 font-medium italic leading-snug max-w-2xl">
              {frame.storyText}
            </p>
          </div>
          <div className="absolute bottom-4 right-6 text-xs text-gray-300 font-bold">
            {index + 1} / {script.frames.length}
          </div>
        </div>
      ))}
    </div>
  );
};
