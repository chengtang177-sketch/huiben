
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Storyboard } from './components/Storyboard';
import { PptPreview } from './components/PptPreview';
import { BookData, GeneratedScript, TabType } from './types';
import { generateBookScript, generateIllustration } from './services/geminiService';
import { downloadPpt } from './utils/pptExport';

// 扩展 window 对象以支持 AI Studio 特有方法
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    // Fix: Use optional modifier to match potential existing declarations and avoid "identical modifiers" error
    aistudio?: AIStudio;
    process?: any;
  }
}

const App: React.FC = () => {
  const [data, setData] = useState<BookData>({
    title: '',
    theme: '',
    wordCount: 800,
    visualAnchor: '',
    stylePrompt: 'Warm, hand-drawn digital watercolor children\'s book style',
    introduction: ''
  });

  const [activeTab, setActiveTab] = useState<TabType>('storyboard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [coverAspectRatio, setCoverAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [script, setScript] = useState<GeneratedScript | null>(null);

  // 部署后的初始化检查
  useEffect(() => {
    const checkStatus = async () => {
      // 检查 API_KEY 是否存在于 process.env 中（Vercel 注入）
      const hasEnvKey = !!(window.process?.env?.API_KEY);
      
      if (!hasEnvKey && window.aistudio) {
        const hasSelected = await window.aistudio.hasSelectedApiKey();
        if (!hasSelected) {
           console.log("未检测到 API_KEY 环境变量，引导用户通过 AI Studio 选择 Key");
        }
      }
    };
    checkStatus();
  }, []);

  // 检查并请求 API Key
  const ensureApiKey = async () => {
    // 优先使用环境变量
    if (window.process?.env?.API_KEY) return true;

    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        return true; 
      }
    }
    return true;
  };

  const handleError = async (error: any) => {
    console.error("API Error:", error);
    const errorMessage = error.message || String(error);
    
    // 如果是密钥相关错误，引导用户重新选择
    if (errorMessage.includes("Requested entity was not found") || 
        errorMessage.includes("API_KEY") || 
        errorMessage.includes("403") || 
        errorMessage.includes("401") ||
        errorMessage.includes("API key not valid")) {
      if (window.aistudio) {
        alert("API 认证失败。如果您已在 Vercel 配置了 API_KEY，请检查是否生效；或者在此重新选择有效的付费项目密钥。");
        await window.aistudio.openSelectKey();
      } else {
        alert("API 调用失败，请检查部署环境的 API_KEY 变量是否配置正确。");
      }
    } else {
      alert(`操作失败: ${errorMessage}`);
    }
  };

  const handleGenerateScript = async () => {
    if (!data.title) return;
    await ensureApiKey();
    setIsGenerating(true);
    try {
      const generated = await generateBookScript(data);
      setScript(generated);
      setActiveTab('storyboard');
    } catch (error) {
      await handleError(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPpt = async () => {
    if (!script) return;
    setIsExporting(true);
    try {
      await downloadPpt(script);
    } catch (error) {
      console.error("PPT export failed:", error);
      alert("导出 PPT 失败，请检查是否已生成所有图片。");
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateFrameImage = async (frameId: string) => {
    if (!script) return;
    await ensureApiKey();
    
    setScript(prev => {
      if (!prev) return null;
      return {
        ...prev,
        frames: prev.frames.map(f => f.id === frameId ? { ...f, isGeneratingImage: true } : f)
      };
    });

    try {
      const frame = script.frames.find(f => f.id === frameId);
      if (!frame) return;

      const imageUrl = await generateIllustration(
        frame.sceneDescription, 
        data.stylePrompt,
        data.visualAnchor, 
        script.characterDesign,
        "16:9"
      );
      
      setScript(prev => {
        if (!prev) return null;
        return {
          ...prev,
          frames: prev.frames.map(f => f.id === frameId ? { ...f, imageUrl, isGeneratingImage: false } : f)
        };
      });
    } catch (error) {
      await handleError(error);
      setScript(prev => {
        if (!prev) return null;
        return {
          ...prev,
          frames: prev.frames.map(f => f.id === frameId ? { ...f, isGeneratingImage: false } : f)
        };
      });
    }
  };

  const handleGenerateCover = async () => {
    if (!script) return;
    await ensureApiKey();
    setIsGeneratingCover(true);
    try {
      const enhancedCoverPrompt = `${script.coverPrompt}. Focus exclusively on the main characters. No text, no letters, no titles, no Chinese characters, pure visual illustration only.`;
      
      const url = await generateIllustration(
        enhancedCoverPrompt, 
        data.stylePrompt, 
        data.visualAnchor, 
        script.characterDesign,
        coverAspectRatio
      );
      setScript(prev => prev ? { ...prev, coverUrl: url } : null);
    } catch (error) {
      await handleError(error);
    } finally {
      setIsGeneratingCover(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f4f7f9] overflow-hidden">
      <Sidebar 
        data={data} 
        setData={setData} 
        onGenerate={handleGenerateScript} 
        isGenerating={isGenerating} 
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-pink-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">用爱读懂每一本绘本</span>
            </div>
            <div className="h-4 w-px bg-gray-200"></div>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span>文</span>
              <span>中文</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {window.aistudio && (
                <button 
                  onClick={() => window.aistudio?.openSelectKey()}
                  className="text-xs text-blue-500 hover:underline font-medium"
                >
                  配置 API Key
                </button>
             )}
             <button className="flex items-center gap-2 text-gray-600 text-sm hover:text-gray-900 font-medium">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               历史
             </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          {!script && !isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
              <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <p>填写左侧信息，开始生成您的绘本导读作品</p>
            </div>
          ) : isGenerating ? (
             <div className="h-full flex flex-col items-center justify-center gap-6">
                <div className="relative">
                   <div className="w-24 h-24 border-4 border-pink-100 border-t-pink-500 rounded-full animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-8 h-8 text-pink-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                   </div>
                </div>
                <div className="text-center space-y-2">
                   <h3 className="text-xl font-bold text-gray-800">正在酝酿灵感...</h3>
                   <p className="text-gray-500">AI 正在为您编写故事、设计分镜和构思画面</p>
                </div>
             </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                 <div className="space-y-1">
                    <span className="text-xs font-bold text-pink-500 bg-pink-50 px-2 py-0.5 rounded">生成的作品</span>
                    <h2 className="text-2xl font-bold text-gray-800">{script?.title}</h2>
                 </div>
                 <button 
                  onClick={handleExportPpt}
                  disabled={isExporting}
                  className={`bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all ${isExporting ? 'opacity-70 cursor-not-allowed' : ''}`}
                 >
                    {isExporting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    )}
                    {isExporting ? '导出中...' : '导出 PPT'}
                 </button>
              </div>

              <div className="flex gap-8 border-b border-gray-200">
                {(['script', 'cover', 'storyboard', 'ppt'] as TabType[]).map((tab) => {
                  const labels: Record<TabType, string> = {
                    script: '文案',
                    cover: '封面',
                    storyboard: '分镜脚本',
                    ppt: 'PPT 预览'
                  };
                  const icons: Record<TabType, React.ReactNode> = {
                    script: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
                    cover: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
                    storyboard: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
                    ppt: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                  };
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`pb-4 px-2 flex items-center gap-2 text-sm font-medium transition-colors relative ${
                        activeTab === tab ? 'text-pink-500' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {icons[tab]}
                      {labels[tab]}
                      {activeTab === tab && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-pink-500 rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'storyboard' && script && (
                  <Storyboard 
                    frames={script.frames} 
                    onGenerateImage={handleGenerateFrameImage}
                    visualAnchor={data.visualAnchor}
                  />
                )}
                
                {activeTab === 'script' && script && (
                   <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-3xl mx-auto space-y-6">
                      <div className="bg-pink-50/50 p-4 rounded-lg border border-pink-100">
                        <h4 className="text-sm font-bold text-pink-600 mb-1 flex items-center gap-2">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                           角色视觉设定
                        </h4>
                        <p className="text-xs text-pink-800 italic">{script.characterDesign}</p>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-gray-800">绘本简介</h3>
                        <p className="text-gray-600 leading-relaxed">{script.introduction}</p>
                      </div>
                      <div className="h-px bg-gray-100"></div>
                      <div className="space-y-6">
                        <h3 className="text-xl font-bold text-gray-800">完整分集内容</h3>
                        {script.frames.map((frame, i) => (
                          <div key={frame.id} className="space-y-2">
                            <span className="text-xs font-bold text-gray-300">分镜 {i + 1}</span>
                            <p className="text-gray-700 leading-relaxed font-medium">"{frame.storyText}"</p>
                          </div>
                        ))}
                      </div>
                   </div>
                )}

                {activeTab === 'cover' && script && (
                   <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-4xl mx-auto flex flex-col gap-8">
                      <div className="flex justify-center items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <span className="text-sm font-bold text-gray-600">封面尺寸选择:</span>
                        <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                          <button 
                            onClick={() => setCoverAspectRatio("16:9")}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${coverAspectRatio === "16:9" ? "bg-pink-500 text-white shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                          >
                            横版 (16:9)
                          </button>
                          <button 
                            onClick={() => setCoverAspectRatio("9:16")}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${coverAspectRatio === "9:16" ? "bg-pink-500 text-white shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                          >
                            竖版 (9:16)
                          </button>
                        </div>
                        <button 
                          onClick={handleGenerateCover}
                          disabled={isGeneratingCover}
                          className="ml-auto px-6 py-2 bg-pink-500 text-white font-medium rounded-lg hover:bg-pink-600 shadow-md shadow-pink-200 active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:shadow-none flex items-center gap-2"
                        >
                          {isGeneratingCover ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          )}
                          {script.coverUrl ? '重新生成' : '生成封面'}
                        </button>
                      </div>

                      <div className="flex justify-center">
                        <div className={`relative overflow-hidden bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 shadow-inner flex items-center justify-center ${coverAspectRatio === '16:9' ? 'aspect-[16/9] w-full max-w-2xl' : 'aspect-[9/16] h-[600px]'}`}>
                          {script.coverUrl ? (
                            <img src={script.coverUrl} className="w-full h-full object-contain bg-white" alt="Book Cover" />
                          ) : isGeneratingCover ? (
                            <div className="flex flex-col items-center gap-4 text-pink-500">
                               <div className="w-12 h-12 border-4 border-pink-100 border-t-pink-500 rounded-full animate-spin"></div>
                               <span className="text-sm font-bold">AI 正在精心构图...</span>
                            </div>
                          ) : (
                            <div className="text-center p-8 space-y-4">
                              <div className="w-16 h-16 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center mx-auto text-gray-200">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </div>
                              <p className="text-gray-400 text-sm">选择好尺寸后，点击上方按钮生成绘本封面</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-center space-y-3 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                         <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{script.title}</h2>
                         <div className="h-px w-24 bg-pink-100 mx-auto"></div>
                         <p className="text-gray-500 max-w-lg mx-auto italic text-sm leading-relaxed">"{script.coverPrompt}"</p>
                      </div>
                   </div>
                )}

                {activeTab === 'ppt' && script && (
                  <PptPreview script={script} />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
