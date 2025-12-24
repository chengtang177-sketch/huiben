
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Storyboard } from './components/Storyboard';
import { PptPreview } from './components/PptPreview';
import { BookData, GeneratedScript, TabType } from './types';
import { generateBookScript, generateIllustration } from './services/volcengineService';
import { downloadPpt } from './utils/pptExport';

// 扩展 window 对象
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

  useEffect(() => {
    const checkStatus = async () => {
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

  const ensureApiKey = async () => {
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
          return true;
        }
        setApiKeyStatus('ready');
        return true;
      } catch (e) {}
    }
    setApiKeyStatus('missing');
    return false;
  };

  const handleError = async (error: any) => {
    console.error("Volcengine API Error:", error);
    const errorMessage = error.message || String(error);
    
    if (errorMessage.includes("invalid_api_key") || errorMessage.includes("401") || errorMessage.includes("403")) {
      setApiKeyStatus('missing');
      if (window.aistudio) {
        alert("火山引擎 API 认证失败。请重新配置 API Key。");
        await window.aistudio.openSelectKey();
        setApiKeyStatus('ready');
      } else {
        alert("API 认证失败，请检查 Vercel 环境变量 API_KEY。");
      }
    } else {
      alert(`火山引擎调用失败: ${errorMessage}`);
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
      alert("导出失败，请重试。");
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateFrameImage = async (frameId: string) => {
    if (!script) return;
    await ensureApiKey();
    setScript(prev => prev ? {
      ...prev,
      frames: prev.frames.map(f => f.id === frameId ? { ...f, isGeneratingImage: true } : f)
    } : null);

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
      setScript(prev => prev ? {
        ...prev,
        frames: prev.frames.map(f => f.id === frameId ? { ...f, imageUrl, isGeneratingImage: false } : f)
      } : null);
    } catch (error) {
      await handleError(error);
      setScript(prev => prev ? {
        ...prev,
        frames: prev.frames.map(f => f.id === frameId ? { ...f, isGeneratingImage: false } : f)
      } : null);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f4f7f9] overflow-hidden">
      <Sidebar data={data} setData={setData} onGenerate={handleGenerateScript} isGenerating={isGenerating} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-blue-600">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L1 21h22L12 2zm0 3.45l8.15 14.1H3.85L12 5.45z"/>
              </svg>
              <span className="text-sm font-bold tracking-tight">火山方舟引擎版</span>
            </div>
            <div className="h-4 w-px bg-gray-200"></div>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${apiKeyStatus === 'ready' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-gray-300'}`}></div>
              <span className="text-xs text-gray-500 font-medium">
                {apiKeyStatus === 'ready' ? '火山引擎已就绪' : '等待密钥配置'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {window.aistudio && (
                <button 
                  onClick={() => window.aistudio?.openSelectKey()}
                  className="text-xs px-4 py-2 rounded-lg border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 font-bold"
                >
                  配置火山 API Key
                </button>
             )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex gap-1 mb-8 bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-fit">
              <button onClick={() => setActiveTab('storyboard')} className={`px-6 py-2 rounded-lg text-sm font-bold ${activeTab === 'storyboard' ? 'bg-blue-500 text-white' : 'text-gray-500'}`}>分镜板</button>
              <button onClick={() => setActiveTab('ppt')} className={`px-6 py-2 rounded-lg text-sm font-bold ${activeTab === 'ppt' ? 'bg-blue-500 text-white' : 'text-gray-500'}`}>PPT 预览</button>
            </div>

            {!script ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                   <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86 1.341l-1.342 1.342a6.001 6.001 0 01-1.341 3.86l.477 2.387c.058.29.139.57.243.837m-2.428-2.428a2 2 0 00-.547-1.022l-2.387-.477a6 6 0 01-3.86-1.341l-1.342-1.342a6.001 6.001 0 00-1.341-3.86l.477-2.387c.058-.29.139-.57.243-.837" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">欢迎来到 MommyBook AI</h2>
                <p className="text-gray-500">基于火山引擎豆包模型，为您提供极速绘本创作体验</p>
              </div>
            ) : (
              activeTab === 'storyboard' ? (
                <Storyboard frames={script.frames} onGenerateImage={handleGenerateFrameImage} visualAnchor={data.visualAnchor} />
              ) : (
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100">
                    <h3 className="font-bold text-gray-700">导出预览</h3>
                    <button onClick={handleExportPpt} disabled={isExporting} className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-blue-700">
                      {isExporting ? '导出中...' : '下载 PPT'}
                    </button>
                  </div>
                  <PptPreview script={script} />
                </div>
              )
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
