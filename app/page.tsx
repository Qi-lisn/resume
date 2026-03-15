'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

type LoadingState = 'idle' | 'analyzing' | 'optimizing' | 'completed';

type ParseStatus = {
  isParsing: boolean;
  message: string;
  progress?: number;
};

type OptimizationProgress = {
  isProcessing: boolean;
  currentStep: number;
  totalSteps: number;
  steps: { name: string; status: 'pending' | 'inProgress' | 'completed' }[];
};

type OptimizationTab = 'rewrite' | 'star' | 'keyword' | 'score' | 'all';

type OptimizationData = {
  keywordMatch: string;
  contentRewrite: string;
  starPrinciple: string;
  atsScore: number;
  suggestions: string[];
};

type ResultTab = 'resume' | 'study' | 'interview';

type StudyPlanData = {
  learningPoints: string[];
  recommendedResources: string[];
};

type InterviewData = {
  questions: Array<{
    question: string;
    answer: string;
    analysis: string;
  }>;
};

// 文件上传组件
function FileUpload({
  onFileSelect,
  accept,
  acceptText,
  disabled
}: {
  onFileSelect: (file: File) => void;
  accept: string;
  acceptText: string;
  disabled?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect, disabled]);

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        p-4 rounded-lg border-2 border-dashed transition-all duration-200
        ${isDragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            onFileSelect(files[0]);
          }
        }}
        className="hidden"
        disabled={disabled}
      />
      <div className="text-center">
        <svg
          className="mx-auto h-8 w-8 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          点击上传或拖拽文件到此处
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          支持格式: {acceptText}
        </p>
      </div>
    </div>
  );
}

// 优化结果标签页组件
function OptimizationTabs({
  activeTab,
  onTabChange,
  hasData
}: {
  activeTab: OptimizationTab;
  onTabChange: (tab: OptimizationTab) => void;
  hasData: boolean;
}) {
  const tabs = [
    { key: 'all' as OptimizationTab, label: '全部' },
    { key: 'keyword' as OptimizationTab, label: '关键词匹配' },
    { key: 'rewrite' as OptimizationTab, label: '简历重写' },
    { key: 'star' as OptimizationTab, label: 'STAR 原则' },
    { key: 'score' as OptimizationTab, label: 'ATS 评分' },
  ];

  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => hasData ? onTabChange(tab.key) : undefined}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${
              !hasData
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                : activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }
          `}
          disabled={!hasData}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ATS 评分卡片组件
function ATSScoreCard({ score }: { score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-600 dark:text-green-400';
    if (s >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (s >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return '优秀';
    if (s >= 60) return '良好';
    if (s >= 40) return '中等';
    return '需改进';
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 mb-4">
      <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">ATS 评分</h3>
      <div className="flex items-center gap-6">
        <div className="text-6xl font-bold" style={{ color: getScoreColor(score) }}>
          {score}
        </div>
        <div className="text-center">
          <div className="text-sm text-slate-600 dark:text-slate-300">评分等级</div>
          <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
            {getScoreLabel(score)}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2 text-xs text-slate-600 dark:text-slate-300">
        <div className="text-center p-2 bg-white dark:bg-slate-700 rounded">
          <div className="font-semibold mb-1">关键词匹配</div>
          <div>{score * 0.3.toFixed(0)}/30</div>
        </div>
        <div className="text-center p-2 bg-white dark:bg-slate-700 rounded">
          <div className="font-semibold mb-1">格式规范</div>
          <div>{score * 0.2.toFixed(0)}/20</div>
        </div>
        <div className="text-center p-2 bg-white dark:bg-slate-700 rounded">
          <div className="font-semibold mb-1">内容完整</div>
          <div>{score * 0.2.toFixed(0)}/20</div>
        </div>
        <div className="text-center p-2 bg-white dark:bg-slate-700 rounded">
          <div className="font-semibold mb-1">表达清晰</div>
          <div>{score * 0.15.toFixed(0)}/15</div>
        </div>
        <div className="text-center p-2 bg-white dark:bg-slate-700 rounded">
          <div className="font-semibold mb-1">专业术语</div>
          <div>{score * 0.15.toFixed(0)}/15</div>
        </div>
      </div>
    </div>
  );
}

// 建议列表组件
function SuggestionsList({ suggestions }: { suggestions: string[] }) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-6 mb-4">
      <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">改进建议</h3>
      <ul className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="text-amber-600 dark:text-amber-400 font-bold text-lg">
              {index + 1}.
            </span>
            <span className="text-slate-700 dark:text-slate-300">
              {suggestion}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Home() {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [parseStatus, setParseStatus] = useState<ParseStatus>({ isParsing: false, message: '' });
  const [optimizationProgress, setOptimizationProgress] = useState<OptimizationProgress>({
    isProcessing: false,
    currentStep: 0,
    totalSteps: 5,
    steps: [
      { name: '关键词匹配分析', status: 'pending' },
      { name: '简历内容重写', status: 'pending' },
      { name: 'STAR 原则优化', status: 'pending' },
      { name: 'ATS 评分计算', status: 'pending' },
      { name: '生成改进建议', status: 'pending' },
    ]
  });
  const jdTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [optimizedData, setOptimizedData] = useState<OptimizationData | null>(null);
  const [activeTab, setActiveTab] = useState<OptimizationTab>('all');
  const [resultTab, setResultTab] = useState<ResultTab>('resume');
  const [studyPlanData, setStudyPlanData] = useState<StudyPlanData | null>(null);
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [isGeneratingStudyPlan, setIsGeneratingStudyPlan] = useState(false);
  const [isGeneratingInterview, setIsGeneratingInterview] = useState(false);
  const resumeContentRef = useRef<HTMLDivElement>(null);

  const startOptimization = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      setParseStatus({
        isParsing: false,
        message: '请先输入简历内容和职位描述'
      });
      setTimeout(() => setParseStatus({ isParsing: false, message: '' }), 3000);
      return;
    }

    setLoadingState('analyzing');
    setOptimizationProgress(prev => ({
      ...prev,
      isProcessing: true,
      currentStep: 0,
      steps: prev.steps.map((s, i) => ({
        ...s,
        status: i === 0 ? 'inProgress' : 'pending' as const
      }))
    }));

    // 使用 useRef 来存储定时器 ID
    const timerRef = { current: null as NodeJS.Timeout | null };

    // 设置进度更新定时器（每 5 秒更新一次进度）
    timerRef.current = setInterval(() => {
      setOptimizationProgress(prev => {
        if (prev.currentStep >= prev.totalSteps - 1) return prev;

        const nextStep = prev.currentStep + 1;
        return {
          ...prev,
          currentStep: nextStep,
          steps: prev.steps.map((step, i) => ({
            ...step,
            status: i < nextStep ? 'completed' : i === nextStep ? 'inProgress' : 'pending' as const
          }))
        };
      });
    }, 5000);

    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText,
          jobDescription,
        }),
      });

      // 清除定时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      const result = await response.json();

      if (result.success) {
        setOptimizationProgress(prev => ({
          ...prev,
          isProcessing: false,
          currentStep: prev.totalSteps,
          steps: prev.steps.map(s => ({ ...s, status: 'completed' as const }))
        }));
        setOptimizedData(result.data);
        setLoadingState('completed');

        // 简历优化完成后，立即在后台触发学习计划和面试生成
        // 静默调用，不阻塞用户界面
        setTimeout(() => {
          generateStudyPlan();
          generateInterview();
        }, 100);
      } else {
        throw new Error(result.error || '优化失败');
      }
    } catch (error) {
      console.error('优化错误:', error);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setLoadingState('idle');
      setOptimizationProgress(prev => ({
        ...prev,
        isProcessing: false
      }));
      setParseStatus({
        isParsing: false,
        message: `优化失败: ${(error as Error).message}`
      });
      setTimeout(() => setParseStatus({ isParsing: false, message: '' }), 3000);
    }
  };

  // 生成学习计划
  const generateStudyPlan = async () => {
    setIsGeneratingStudyPlan(true);
    try {
      const response = await fetch('/api/study-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText,
          jobDescription,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStudyPlanData(result.data);
      }
    } catch (error) {
      console.error('学习计划生成错误:', error);
    } finally {
      setIsGeneratingStudyPlan(false);
    }
  };

  // 生成面试题
  const generateInterview = async () => {
    setIsGeneratingInterview(true);
    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          optimizedResume: optimizedData?.contentRewrite || '',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setInterviewData(result.data);
      }
    } catch (error) {
      console.error('面试题生成错误:', error);
    } finally {
      setIsGeneratingInterview(false);
    }
  };

  // PDF 下载函数
  const downloadAsPDF = async () => {
    if (!resumeContentRef.current) {
      setParseStatus({
        isParsing: false,
        message: '无法导出 PDF：简历内容未加载'
      });
      setTimeout(() => setParseStatus({ isParsing: false, message: '' }), 3000);
      return;
    }

    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(resumeContentRef.current, {
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      while (heightLeft >= 0) {
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, Math.min(imgHeight, heightLeft));
        heightLeft -= pageHeight;
        position -= pageHeight;
      }

      pdf.save('ATS优化简历.pdf');
      setParseStatus({
        isParsing: false,
        message: 'PDF 下载成功'
      });
      setTimeout(() => setParseStatus({ isParsing: false, message: '' }), 3000);
    } catch (error) {
      console.error('PDF 导出错误:', error);
      setParseStatus({
        isParsing: false,
        message: `PDF 导出失败: ${(error as Error).message}`
      });
      setTimeout(() => setParseStatus({ isParsing: false, message: '' }), 3000);
    }
  };

  // 前端 OCR 函数
  const performOCR = async (file: File, targetField: 'resume' | 'jd') => {
    try {
      setParseStatus({
        isParsing: true,
        message: '正在初始化 OCR...',
        progress: 0
      });

      // 动态导入 tesseract.js
      const Tesseract = (await import('tesseract.js')).default;

      // 前端 OCR 识别
      const result = await Tesseract.recognize(
        file,
        'chi_sim+eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text' && m.progress !== undefined) {
              setParseStatus({
                isParsing: true,
                message: `正在识别文字... ${Math.round(m.progress * 100)}%`,
                progress: m.progress
              });
            } else if (m.status === 'loading tesseract core') {
              setParseStatus({
                isParsing: true,
                message: '正在加载 OCR 核心组件...',
                progress: 0.1
              });
            } else if (m.status === 'initializing tesseract') {
              setParseStatus({
                isParsing: true,
                message: '正在初始化 OCR 引擎...',
                progress: 0.2
              });
            } else if (m.status === 'loading language traineddata') {
              setParseStatus({
                isParsing: true,
                message: '正在下载语言包...',
                progress: 0.3
              });
            }
          }
        }
      );

      const text = result.data.text;

      if (targetField === 'resume') {
        setResumeText(text);
      } else {
        setJobDescription(text);
      }

      setParseStatus({ isParsing: false, message: '' });
    } catch (error) {
      console.error('图片识别错误:', error);
      setParseStatus({
        isParsing: false,
        message: `识别失败: ${(error as Error).message}`
      });
      setTimeout(() => setParseStatus({ isParsing: false, message: '' }), 3000);
    }
  };

  // 解析文件（Word 用后端，图片用前端 OCR）
  const parseFile = async (file: File, targetField: 'resume' | 'jd') => {
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

      // 暂时只支持 Word 和图片，PDF 解析功能暂时禁用
      if (fileExtension === 'pdf') {
        setParseStatus({
          isParsing: false,
          message: 'PDF 解析功能暂时不可用，请使用 Word 文档或图片，或直接粘贴文本'
        });
        setTimeout(() => setParseStatus({ isParsing: false, message: '' }), 5000);
        return;
      }

      // 图片使用前端 OCR
      if (['png', 'jpg', 'jpeg'].includes(fileExtension)) {
        await performOCR(file, targetField);
        return;
      }

      // Word 文档使用后端解析
      if (fileExtension === 'docx') {
        setParseStatus({ isParsing: true, message: '正在解析 Word 文档...', progress: 0.5 });

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/parse', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || '解析失败');
        }

        if (targetField === 'resume') {
          setResumeText(result.text);
        } else {
          setJobDescription(result.text);
        }

        setParseStatus({ isParsing: false, message: '' });
      }
    } catch (error) {
      console.error('文件解析错误:', error);
      setParseStatus({
        isParsing: false,
        message: `解析失败: ${(error as Error).message}`
      });
      setTimeout(() => setParseStatus({ isParsing: false, message: '' }), 3000);
    }
  };

  // 简历上传区域的图片解析（目标字段为 'resume'）
  const parseImageFile = async (file: File) => {
    await performOCR(file, 'jd');
  };

  // 剪贴板粘贴功能
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await parseImageFile(file);
          }
          break;
        }
      }
    };

    const textarea = jdTextareaRef.current;
    if (textarea) {
      textarea.addEventListener('paste', handlePaste);
      return () => {
        textarea.removeEventListener('paste', handlePaste);
      };
    }
  }, []);

  // 根据当前标签渲染内容
  const renderOptimizationContent = () => {
    if (!optimizedData) return null;

    const showAll = activeTab === 'all';

    return (
      <div className="space-y-4">
        {/* ATS 评分 */}
        {(showAll || activeTab === 'score') && <ATSScoreCard score={optimizedData.atsScore} />}

        {/* 建议列表 */}
        {(showAll || activeTab === 'score') && <SuggestionsList suggestions={optimizedData.suggestions} />}

        {/* 关键词匹配 */}
        {(showAll || activeTab === 'keyword') && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">关键词匹配分析</h3>
            <div className="prose dark:prose-invert max-w-none text-sm">
              <ReactMarkdown>{optimizedData.keywordMatch}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* 简历重写 */}
        {(showAll || activeTab === 'rewrite') && (
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">简历内容重写</h3>
            <div className="prose dark:prose-invert max-w-none text-sm">
              <ReactMarkdown>{optimizedData.contentRewrite}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* STAR 原则 */}
        {(showAll || activeTab === 'star') && (
          <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">STAR 原则优化</h3>
            <div className="prose dark:prose-invert max-w-none text-sm">
              <ReactMarkdown>{optimizedData.starPrinciple}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
            ATS 简历优化工具
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-2">
            AI 驱动的智能简历优化
          </p>
        </header>

        {parseStatus.message && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2">
              {parseStatus.isParsing ? (
                <span className="animate-spin">⚙️</span>
              ) : (
                <span>ℹ️</span>
              )}
              <span className="text-sm text-blue-800 dark:text-blue-200">
                {parseStatus.message}
              </span>
            </div>
            {parseStatus.isParsing && parseStatus.progress !== undefined && (
              <div className="mt-3">
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                  <div
                    className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(2, parseStatus.progress * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-6 h-[calc(100vh-200px)]">
          <div className="w-1/2 flex flex-col gap-4">
            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                原简历文本
              </label>

              <FileUpload
                onFileSelect={(file) => parseFile(file, 'resume')}
                accept=".docx,.png,.jpg,.jpeg"
                acceptText="Word (前端解析), PNG/JPG (前端 OCR)"
                disabled={parseStatus.isParsing || loadingState !== 'idle'}
              />

              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="请粘贴您的原始简历内容，或上传文件自动提取..."
                className="flex-1 w-full p-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-800 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mt-2"
                disabled={parseStatus.isParsing || loadingState !== 'idle'}
              />
            </div>

            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                目标岗位 JD
              </label>

              <FileUpload
                onFileSelect={parseImageFile}
                accept=".png,.jpg,.jpeg"
                acceptText="PNG/JPG (前端 OCR, 支持 Ctrl+V / Cmd+V 粘贴截图)"
                disabled={parseStatus.isParsing || loadingState !== 'idle'}
              />

              <textarea
                ref={jdTextareaRef}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="请粘贴目标岗位的职位描述，或上传图片自动识别..."
                className="flex-1 w-full p-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-800 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mt-2"
                disabled={parseStatus.isParsing || loadingState !== 'idle'}
              />
            </div>

            <button
              onClick={startOptimization}
              disabled={parseStatus.isParsing || loadingState !== 'idle'}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {loadingState === 'analyzing' && (
                <>
                  <span className="animate-spin">⚙️</span>
                  分析中...
                </>
              )}
              {loadingState === 'optimizing' && (
                <>
                  <span className="animate-spin">⚙️</span>
                  优化中...
                </>
              )}
              {loadingState === 'idle' && '开始优化'}
              {loadingState === 'completed' && '优化完成'}
            </button>
          </div>

          <div className="w-1/2 flex flex-col">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              优化结果
            </label>

            {/* 选项卡 */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setResultTab('resume')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  resultTab === 'resume'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-600 border border-slate-200 dark:border-slate-600'
                }`}
              >
                📄 优化后简历
              </button>
              <button
                onClick={() => setResultTab('study')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  resultTab === 'study'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-600 border border-slate-200 dark:border-slate-600'
                }`}
              >
                📚 核心学习计划
              </button>
              <button
                onClick={() => setResultTab('interview')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  resultTab === 'interview'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-600 border border-slate-200 dark:border-slate-600'
                }`}
              >
                🎤 定制面试题
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-800">
              {/* 优化进度显示 */}
              {optimizationProgress.isProcessing && (
                <div className="p-6">
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="animate-spin">⚙️</span>
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          正在优化中... ({optimizationProgress.currentStep}/{optimizationProgress.totalSteps})
                        </span>
                      </div>
                      <span className="text-xs text-blue-600 dark:text-blue-300">
                        {Math.round((optimizationProgress.currentStep / optimizationProgress.totalSteps) * 100)}%
                      </span>
                    </div>
                    {/* 进度条 */}
                    <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mb-3">
                      <div
                        className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(optimizationProgress.currentStep / optimizationProgress.totalSteps) * 100}%` }}
                      />
                    </div>
                    {/* 步骤列表 */}
                    <div className="space-y-2">
                      {optimizationProgress.steps.map((step, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          {step.status === 'completed' && (
                            <span className="text-green-600 dark:text-green-400">✓</span>
                          )}
                          {step.status === 'inProgress' && (
                            <span className="animate-spin text-blue-600 dark:text-blue-400">⚙️</span>
                          )}
                          {step.status === 'pending' && (
                            <span className="text-slate-400 dark:text-slate-500">○</span>
                          )}
                          <span className={
                            step.status === 'completed'
                              ? 'text-green-700 dark:text-green-300 font-medium'
                              : step.status === 'inProgress'
                              ? 'text-blue-700 dark:text-blue-300 font-medium'
                              : 'text-slate-600 dark:text-slate-400'
                          }>
                            {step.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 空状态 */}
              {!optimizedData && loadingState === 'idle' && !optimizationProgress.isProcessing && (
                <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                  <p>优化结果将在这里显示</p>
                </div>
              )}

              {/* 选项卡内容 */}
              {optimizedData && (
                <>
                  {/* 简历选项卡 */}
                  {resultTab === 'resume' && (
                    <div className="p-6">
                      {/* PDF 下载按钮 */}
                      <div className="mb-4">
                        <button
                          onClick={downloadAsPDF}
                          disabled={!optimizedData.contentRewrite}
                          className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
                        >
                          📥 下载 ATS 友好版 PDF
                        </button>
                      </div>

                      {/* 简历内容区域（用于 PDF 导出） */}
                      <div ref={resumeContentRef} className="prose dark:prose-invert max-w-none bg-white dark:bg-gray-900 p-6 rounded-lg">
                        <ReactMarkdown>{optimizedData.contentRewrite}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* 学习计划选项卡 */}
                  {resultTab === 'study' && (
                    <div className="p-6">
                      {isGeneratingStudyPlan ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <span className="animate-spin text-6xl mb-4">🦞</span>
                          <p className="text-purple-700 dark:text-purple-300 font-medium">
                            龙虾正在为您定制学习计划...
                          </p>
                        </div>
                      ) : studyPlanData ? (
                        <div className="space-y-6">
                          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
                            <h3 className="text-lg font-semibold mb-4 text-purple-800 dark:text-purple-200 flex items-center gap-2">
                              <span>📚</span>
                              学习重点
                            </h3>
                            <ul className="space-y-3">
                              {studyPlanData.learningPoints.map((point, index) => (
                                <li key={index} className="flex items-start gap-3">
                                  <span className="text-purple-600 dark:text-purple-400 font-bold mt-1">{index + 1}.</span>
                                  <span className="text-slate-700 dark:text-slate-300">{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6">
                            <h3 className="text-lg font-semibold mb-4 text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                              <span>💻</span>
                              推荐资源
                            </h3>
                            <ul className="space-y-2">
                              {studyPlanData.recommendedResources.map((resource, index) => (
                                <li key={index} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                                  <span className="text-indigo-600 dark:text-indigo-400">•</span>
                                  {resource}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
                          <p>等待简历优化完成后生成学习计划...</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 面试题选项卡 */}
                  {resultTab === 'interview' && (
                    <div className="p-6">
                      {isGeneratingInterview ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <span className="animate-spin text-6xl mb-4">🦞</span>
                          <p className="text-rose-700 dark:text-rose-300 font-medium">
                            龙虾正在为您定制面试题...
                          </p>
                        </div>
                      ) : interviewData ? (
                        <div className="space-y-4">
                          {interviewData.questions.map((qa, index) => (
                            <div key={index} className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-6">
                              <div className="flex items-start gap-2 mb-3">
                                <span className="flex-shrink-0 w-8 h-8 bg-rose-600 dark:bg-rose-400 text-white rounded-full flex items-center justify-center font-bold">
                                  {index + 1}
                                </span>
                                <div className="flex-1">
                                  <h4 className="text-base font-semibold text-rose-800 dark:text-rose-200 mb-2">
                                    {qa.question}
                                  </h4>
                                </div>
                              </div>
                              <div className="space-y-3 ml-10">
                                <div>
                                  <span className="text-sm font-semibold text-green-700 dark:text-green-400 mb-1">
                                    💡 推荐回答：
                                  </span>
                                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                                    {qa.answer}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1">
                                    🎯 深挖点解析：
                                  </span>
                                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                                    {qa.analysis}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
                          <p>等待简历优化完成后生成面试题...</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
