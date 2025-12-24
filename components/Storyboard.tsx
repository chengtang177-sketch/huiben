
import React from 'react';
import { StoryFrame } from '../types';

interface StoryboardProps {
  frames: StoryFrame[];
  onGenerateImage: (id: string) => void;
  visualAnchor: string;
}

export const Storyboard: React.FC<StoryboardProps> = ({ frames, onGenerateImage, visualAnchor }) => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      {frames.map((frame, index) => (
        <div key={frame.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Frame {String(index + 1).padStart(2, '0')}
            </div>
            <div className="aspect-[16/9] bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden group w-full mx-auto">
              {frame.imageUrl ? (
                <img src={frame.imageUrl} alt={`Scene ${index + 1}`} className="w-full h-full object-contain bg-gray-100" />
              ) : (
                <div className="text-center p-4">
                  {frame.isGeneratingImage ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-3 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
                      <span className="text-xs text-gray-500">AI 正在绘制...</span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onGenerateImage(frame.id)}
                        className="px-4 py-2 bg-pink-50 text-pink-600 text-sm font-medium rounded-lg hover:bg-pink-100 transition-colors"
                      >
                        AI 生成
                      </button>
                      <button className="px-4 py-2 bg-gray-50 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">
                        上传
                      </button>
                    </div>
                  )}
                </div>
              )}
              {frame.imageUrl && !frame.isGeneratingImage && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button 
                    onClick={() => onGenerateImage(frame.id)}
                    className="p-2 bg-white rounded-full text-pink-500 hover:bg-pink-50 shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
               <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest border-l-2 border-pink-200 pl-2">Story Text</div>
               <p className="text-sm text-gray-800 leading-relaxed font-medium italic">
                 "{frame.storyText}"
               </p>
             </div>

             <div className="space-y-2">
                <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest border-l-2 border-gray-200 pl-2">Scene Description</div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {frame.sceneDescription}
                </p>
             </div>
          </div>
        </div>
      ))}
    </div>
  );
};
