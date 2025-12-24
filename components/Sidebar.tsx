
import React, { useState, useRef } from 'react';
import { BookData } from '../types';
import { analyzeImageStyle } from '../services/volcengineService';

interface SidebarProps {
  data: BookData;
  setData: (data: BookData) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ data, setData, onGenerate, isGenerating }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: keyof BookData, value: string | number) => {
    setData({ ...data, [key]: value });
  };

  const ensureApiKey = async () => {
    if (window.process?.env?.API_KEY && window.process.env.API_KEY.length > 5) return true;
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        return true; 
      }
    }
    return false;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await ensureApiKey();
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setIsAnalyzing(true);
    
    try {
      const styleDescription = await analyzeImageStyle(file);
      handleChange('stylePrompt', styleDescription);
    } catch (error: any) {
      console.error("Volcengine analyze failed:", error);
      alert(`风格分析失败: ${error.message || '请检查 API Key 和网络'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-80 h-full bg-white border-r border-gray-200 p-6 flex flex-col gap-6 overflow-y-auto shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-200">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-800 tracking-tight">MommyBook</h1>
      </div>

      <div className="space-y-4">
        <section className="bg-blue-50/50 p-4 rounded-xl border border-dashed border-blue-200">
          <div className="flex items-center justify-between mb-3 text-blue-800 font-bold text-xs uppercase">
            <span>火山方舟·画风参考</span>
          </div>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-video bg-white rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group"
          >
            {previewUrl ? (
              <img src={previewUrl} className="w-full h-full object-cover" alt="Style preview" />
            ) : (
              <div className="text-center p-4">
                <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg>
                <p className="text-[10px] text-gray-400">上传图片提取豆包视觉风格</p>
              </div>
            )}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-[10px] text-blue-600 font-bold">火山视觉分析中...</span>
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
        </section>

        <section className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">绘本名称</label>
              <input value={data.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="名称" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">绘本主题</label>
              <input value={data.theme} onChange={(e) => handleChange('theme', e.target.value)} placeholder="如：森林探险" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex justify-between">
                <span>风格提示词</span>
                <span className="text-[10px] text-blue-500">Volc-Art</span>
              </label>
              <textarea rows={2} value={data.stylePrompt} onChange={(e) => handleChange('stylePrompt', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs resize-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">简介/情节</label>
              <textarea rows={3} value={data.introduction} onChange={(e) => handleChange('introduction', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm" />
            </div>
          </div>
        </section>
      </div>

      <div className="mt-auto pt-6 space-y-3">
        <button onClick={onGenerate} disabled={isGenerating || !data.title || isAnalyzing} className={`w-full py-3 rounded-full flex items-center justify-center gap-2 font-medium transition-all ${isGenerating ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'}`}>
          {isGenerating ? <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div> : "火山生成绘本"}
        </button>
      </div>
    </div>
  );
};
