
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
    aistudio?: AIStudio;
    process?: any;
  }
}

// Fix: Complete the component definition and add the missing default export
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
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'ready' | 'missing'>('checking');

  // 部署后的初始化检查
  useEffect(() => {
    const checkStatus = async () => {
      // 检查 process.env.API_KEY 是否存在且有效
      const hasEnvKey = !!(window.process?.env?.API_KEY && window.process.env.API_KEY.length > 5);
      
      if (hasEnvKey) {
        setApiKeyStatus('ready');
        return;
      }

      if (window.aistudio) {
        try {
          const hasSelected = await window.aistudio.hasSelectedApiKey();
          setApiKeyStatus(hasSelected ? 'ready' : 'missing');
        } catch (e) {
          setApiKeyStatus('missing');
        }
      } else {
        setApiKeyStatus('missing');
      }
    };
    checkStatus();
  }, []);

  // 检查并请求 API Key
  const ensureApiKey = async () => {
    // 优先使用环境变量
    if (window.process?.env?.API_KEY && window.process.env.API_KEY.length > 5) {
      setApiKeyStatus('ready');
      return true;
    }

    if (window.aistudio) {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await window.aistudio.openSelectKey();
          setApiKeyStatus('ready');
          return true; // 假设选择成功并继续
        }
        setApiKeyStatus('ready');
        return true;
      } catch (e) {
        console.error("AI Studio key selection failed:", e);
      }
    }
    
    setApiKeyStatus('missing');
    return false;
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
      setApiKeyStatus('missing');
      if (window.aistudio) {
        alert("API 认证失败。请重新选择有效的付费项目密钥。");
        await window.aistudio.openSelectKey();
        setApiKeyStatus('ready');
      } else {
        alert("API 调用失败。请确保部署环境的 API_KEY 变量已配置。");
      }
    } else {
      alert(`操作失败: ${errorMessage}`);
    }
  };

  const handleGenerateScript = async () => {
    if (!data.title) return;
    const isReady = await ensureApiKey();
    if (!isReady && !window.process?.env?.API_KEY) {
      alert("未检测到 API 密钥。如果您在 Vercel 部署，请添加 API_KEY 环境变量。");
      return;
    }
    
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
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${apiKeyStatus === 'ready' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : apiKeyStatus === 'checking' ? 'bg-yellow-400 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                {apiKeyStatus === 'ready' ? 'API 已就绪' : apiKeyStatus === 'checking' ? '正在连接...' : '未连接 API'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {window.aistudio ? (
                <button 
                  onClick={async () => {
                    await window.aistudio?.openSelectKey();
                    setApiKeyStatus('ready');
                  }}
                  className={`text-xs px-4 py-2 rounded-lg border transition-all font-bold ${apiKeyStatus === 'ready' ? 'text-gray-500 border-gray-200 hover:bg-gray-50' : 'text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 shadow-sm shadow-blue-100'}`}
                >
                  {apiKeyStatus === 'ready' ? '更换密钥' : '配置 API Key'}
                </button>
             ) : (
               apiKeyStatus === 'missing' && (
                 <a 
                   href="https://ai.google.dev/gemini-api/docs/billing"
                   target="_blank"
                   rel="noreferrer"
                   className="text-xs text-blue-500 underline"
                 >
                   设置结算账户
                 </a>
               )
             )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {/* Tab Navigation */}
            <div className="flex gap-1 mb-8 bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-fit">
              <button 
                onClick={() => setActiveTab('storyboard')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'storyboard' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                分镜板
              </button>
              <button 
                onClick={() => setActiveTab('ppt')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ppt' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                PPT 预览
              </button>
            </div>

            {!script ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <div className="w-24 h-24 bg-pink-50 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-12 h-12 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">准备好创作你的绘本了吗？</h2>
                <p className="text-gray-500 max-w-md mx-auto">
                  在左侧填写绘本信息，AI 将为你生成专业的分镜剧本和精美的插画。
                </p>
              </div>
            ) : (
              <>
                {activeTab === 'storyboard' && (
                  <Storyboard 
                    frames={script.frames} 
                    onGenerateImage={handleGenerateFrameImage}
                    visualAnchor={data.visualAnchor}
                  />
                )}
                {activeTab === 'ppt' && (
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100">
                       <div className="flex items-center gap-4">
                         <h3 className="font-bold text-gray-700">PPT 导出预览</h3>
                         <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400">比例</span>
                            <button 
                              onClick={() => setCoverAspectRatio("16:9")}
                              className={`text-[10px] px-2 py-0.5 rounded ${coverAspectRatio === '16:9' ? 'bg-white shadow-sm text-pink-500' : 'text-gray-400'}`}
                            >16:9</button>
                            <button 
                              onClick={() => setCoverAspectRatio("9:16")}
                              className={`text-[10px] px-2 py-0.5 rounded ${coverAspectRatio === '9:16' ? 'bg-white shadow-sm text-pink-500' : 'text-gray-400'}`}
                            >9:16</button>
                         </div>
                       </div>
                       <button 
                        onClick={handleExportPpt}
                        disabled={isExporting}
                        className="flex items-center gap-2 bg-gray-800 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-900 transition-all disabled:bg-gray-300"
                      >
                        {isExporting ? '导出中...' : '下载 PPT (.pptx)'}
                      </button>
                    </div>
                    <PptPreview script={script} />
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
