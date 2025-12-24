
import React, { useState, useRef } from 'react';
import { BookData } from '../types';
import { analyzeImageStyle } from '../services/geminiService';

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    setIsAnalyzing(true);
    try {
      const styleDescription = await analyzeImageStyle(file);
      // 将分析结果填入 stylePrompt 文本框，而不是 visualAnchor
      handleChange('stylePrompt', styleDescription);
    } catch (error) {
      console.error("Style analysis failed:", error);
      alert("风格分析失败，请稍后重试。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setData({
      title: '',
      theme: '',
      wordCount: 800,
      visualAnchor: '',
      stylePrompt: '',
      introduction: ''
    });
    setPreviewUrl(null);
  };

  return (
    <div className="w-80 h-full bg-white border-r border-gray-200 p-6 flex flex-col gap-6 overflow-y-auto shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-pink-500 p-2 rounded-lg shadow-lg shadow-pink-200">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-800">MommyBook AI</h1>
      </div>

      <div className="space-y-4">
        {/* 风格参考上传区 (可选) */}
        <section className="bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-gray-700 font-bold text-xs uppercase tracking-wider">
              <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span>画风参考图</span>
            </div>
            <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-bold">可选</span>
          </div>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-video bg-white rounded-lg border-2 border-dashed border-gray-200 hover:border-pink-300 hover:bg-pink-50/30 transition-all cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group"
          >
            {previewUrl ? (
              <>
                <img src={previewUrl} className="w-full h-full object-cover" alt="Style preview" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-white text-xs font-medium">更换参考图</span>
                </div>
              </>
            ) : (
              <div className="text-center p-4">
                <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg>
                <p className="text-[10px] text-gray-400">点击上传参考图，AI 自动提取画风</p>
              </div>
            )}
            
            {isAnalyzing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-pink-100 border-t-pink-500 rounded-full animate-spin"></div>
                <span className="text-[10px] text-pink-600 font-bold animate-pulse">风格提取中...</span>
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-pink-500 font-medium mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            <span>基本配置</span>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <span className="text-red-400">□</span> 绘本名称
              </label>
              <input 
                value={data.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="例如：大灰狼的一天"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <span className="text-red-400">◇</span> 绘本主题
              </label>
              <input 
                value={data.theme}
                onChange={(e) => handleChange('theme', e.target.value)}
                placeholder="例如：勇气、友谊"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex justify-between items-center">
                <span className="flex items-center gap-1"><span className="text-red-400">#</span> 期望字数</span>
                <span className="text-xs font-bold text-pink-500 bg-pink-50 px-2 py-0.5 rounded">{data.wordCount} 字</span>
              </label>
              <input 
                type="range" min="200" max="2000" step="50" value={data.wordCount}
                onChange={(e) => handleChange('wordCount', parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex justify-between items-center">
                <span className="flex items-center gap-1"><span className="text-red-400">🎨</span> 风格提示词 (Style)</span>
              </label>
              <textarea 
                rows={2}
                value={data.stylePrompt}
                onChange={(e) => handleChange('stylePrompt', e.target.value)}
                placeholder="描述画风，如：水彩风格、柔和光影..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500/20 resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex justify-between items-center">
                <span className="flex items-center gap-1"><span className="text-red-400">☀</span> 视觉锚点 (Consistency)</span>
              </label>
              <textarea 
                rows={2}
                value={data.visualAnchor}
                onChange={(e) => handleChange('visualAnchor', e.target.value)}
                placeholder="固定视觉特征，如：主角总是戴着黄色围巾..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500/20 resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex justify-between items-center">
                <span className="flex items-center gap-1"><span className="text-red-400">目</span> 简介/关键情节</span>
              </label>
              <textarea 
                rows={3}
                value={data.introduction}
                onChange={(e) => handleChange('introduction', e.target.value)}
                placeholder="简单描述一下故事内容..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 resize-none"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="mt-auto pt-6 space-y-3">
        <button 
          onClick={onGenerate}
          disabled={isGenerating || !data.title || isAnalyzing}
          className={`w-full py-3 rounded-full flex items-center justify-center gap-2 font-medium transition-all shadow-lg ${
            isGenerating || isAnalyzing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-pink-500 text-white hover:bg-pink-600 active:scale-[0.98] shadow-pink-200'
          }`}
        >
          {isGenerating ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-pink-500 rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          )}
          生成绘本
        </button>
        <button 
          onClick={handleClear}
          className="w-full py-3 rounded-full border border-gray-200 text-gray-600 flex items-center justify-center gap-2 font-medium hover:bg-gray-50 transition-all active:scale-[0.98]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          重新开始
        </button>
      </div>
    </div>
  );
};
