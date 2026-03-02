import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
  Plus, Search, X, Edit2, Trash2, ChevronDown,
  Image as ImageIcon, FolderPlus, Save, Unlock, Lock,
  Download, Upload, RefreshCw, Cloud, GripVertical, Check,
  UploadCloud, Sparkles, MessageSquare, FileText, ChevronLeft, ChevronRight,
  Layers, Play, Pause, Grid, Scissors, MousePointer2, ArrowUp, ArrowDown, MoveRight, Film,
  CheckSquare, Square, Settings, Link as LinkIcon, Send, Mail, Loader2, ClipboardCopy, Smile, User, AlertCircle, AlertTriangle, Eye, EyeOff, FolderInput, Copy, FilePlus,
  Heart, PanelRightOpen, PanelRightClose, GripHorizontal, CopyPlus, Edit3, Clock, CheckCircle, XCircle, Archive, FolderOutput,
  ArrowUpCircle, List, History
} from 'lucide-react';
import { submitPrompt, getPendingSubmissions, setSubmissionStatus, deleteSubmissionForever, uploadImageToFirebase, loginWithGoogle, logout, onAuthChange } from './firebase';

/**
 * ==============================================================================
 * 👇👇👇 核心配置区 👇👇👇
 * ==============================================================================
 */
const DATA_SOURCE_URL = "https://raw.githubusercontent.com/unknowlei/nanobanana-website/main/public/data.json";

// 📧 投稿接收配置 (FormSubmit.co Token)
const SUBMISSION_EMAIL = "8b5a6ba41156391e628299f7b2c258d0"; 

const IMGBB_API_KEY = "d24f035fac70f7c113badcb1f800b248"; 

// --- 1. 全局工具函数 ---

const useGifshot = () => {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (window.gifshot) { setLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gifshot/0.3.2/gifshot.min.js';
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
  }, []);
  return loaded;
};

// 🟢 自适应弹出框 - 图片尺寸检测 Hook
const useImageDimensions = (imageUrl) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, aspectRatio: 1, orientation: 'square' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!imageUrl) {
      setDimensions({ width: 0, height: 0, aspectRatio: 1, orientation: 'square' });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const img = new Image();
    
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const aspectRatio = width / height;
      
      let orientation = 'square';
      if (aspectRatio > 1.2) orientation = 'landscape';
      else if (aspectRatio < 0.8) orientation = 'portrait';
      
      setDimensions({ width, height, aspectRatio, orientation });
      setIsLoading(false);
    };

    img.onerror = () => {
      setDimensions({ width: 0, height: 0, aspectRatio: 1, orientation: 'square' });
      setIsLoading(false);
    };

    // 使用优化后的 URL 来检测尺寸
    img.src = imageUrl;
  }, [imageUrl]);

  return { ...dimensions, isLoading };
};

// 🟢 计算自适应弹出框尺寸 - 确保图片完整显示无需滚动
// 支持横图（上下布局）和竖图/正方形（左右布局）
// 📱 手机端强制使用上下布局
const getAdaptiveModalStyle = (orientation, aspectRatio, imageWidth, imageHeight) => {
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  
  // 📱 检测是否是手机端（宽度小于768px）
  const isMobile = viewportWidth < 768;
  
  // 弹窗边距：距离视口边缘的最小间距
  const viewportPadding = isMobile ? 12 : 24;
  
  // 弹窗内部 padding
  const modalPadding = isMobile ? 16 : 24; // 手机端减少内边距
  
  // 📱 手机端强制使用上下布局，不使用左右布局
  // 判断是否使用左右布局（正方形或竖图）- 仅限桌面端
  const useSideLayout = !isMobile && (orientation === 'portrait' || orientation === 'square');
  
  if (useSideLayout) {
    // 🟢 左右布局：图片在左，内容在右（仅桌面端）
    // 可用的最大高度（留更多空间给图片）
    const maxAvailableHeight = viewportHeight - viewportPadding * 2 - modalPadding * 2 - 80; // 80px 标题栏
    
    // 计算图片区域的高度（占据大部分可用高度）
    let calculatedImageHeight = Math.min(maxAvailableHeight * 0.95, 800);
    let calculatedImageWidth = calculatedImageHeight * aspectRatio;
    
    // 右侧内容区域最小宽度
    const minContentWidth = 350;
    
    // 可用的最大宽度
    const maxAvailableWidth = viewportWidth - viewportPadding * 2;
    
    // 确保图片宽度不超过可用宽度的55%（留45%给内容区）
    const maxImageWidth = (maxAvailableWidth - modalPadding * 2) * 0.55;
    if (calculatedImageWidth > maxImageWidth) {
      calculatedImageWidth = maxImageWidth;
      calculatedImageHeight = calculatedImageWidth / aspectRatio;
    }
    
    // 弹窗总宽度 = 图片宽度 + 内容宽度 + 间距
    let modalWidth = calculatedImageWidth + minContentWidth + modalPadding * 3;
    
    // 最大宽度限制
    const maxModalWidth = Math.min(maxAvailableWidth, 1400);
    modalWidth = Math.min(modalWidth, maxModalWidth);
    
    // 最小宽度
    modalWidth = Math.max(modalWidth, 700);
    
    return {
      maxWidth: `${modalWidth}px`,
      width: 'auto',
      '--adaptive-image-max-height': `${Math.max(calculatedImageHeight, 300)}px`,
      '--adaptive-layout': 'side', // 标记为左右布局
      '--adaptive-image-width': `${calculatedImageWidth}px`,
    };
  } else {
    // 🟢 上下布局：横图使用传统布局，手机端所有图片都使用此布局
    // 减少固定内容高度估算，给图片更多空间
    // 标题栏: ~60px, 其他内容区: ~200px（减少了）
    const fixedContentHeight = isMobile ? 200 : 260;
    
    // 可用于显示图片的最大高度（增加了）
    const maxAvailableImageHeight = viewportHeight - viewportPadding * 2 - fixedContentHeight - modalPadding * 2;
    
    // 可用的最大宽度
    const maxAvailableWidth = viewportWidth - viewportPadding * 2;
    
    // 📱 手机端图片最大高度限制更小
    const maxImageHeightLimit = isMobile ? 400 : 700;
    
    // 根据图片比例计算合适的尺寸
    let calculatedImageHeight = Math.min(maxAvailableImageHeight, maxImageHeightLimit);
    let calculatedImageWidth = calculatedImageHeight * aspectRatio;
    
    // 如果计算出的宽度超过可用宽度，则以宽度为准重新计算
    if (calculatedImageWidth > maxAvailableWidth - modalPadding * 2) {
      calculatedImageWidth = maxAvailableWidth - modalPadding * 2;
      calculatedImageHeight = calculatedImageWidth / aspectRatio;
    }
    
    // 图片区域额外需要的宽度（左右内边距）
    const imageAreaExtraPadding = isMobile ? 16 : 32;
    
    // 计算弹窗的最终宽度
    let modalWidth = calculatedImageWidth + modalPadding * 2 + imageAreaExtraPadding;
    
    // 📱 手机端最小宽度更小
    const minModalWidth = isMobile ? 280 : 500;
    modalWidth = Math.max(modalWidth, minModalWidth);
    
    // 最大宽度限制
    const maxModalWidth = Math.min(maxAvailableWidth, 1400);
    modalWidth = Math.min(modalWidth, maxModalWidth);
    
    return {
      maxWidth: isMobile ? '100%' : `${modalWidth}px`, // 📱 手机端使用100%宽度
      width: isMobile ? '100%' : 'auto',
      '--adaptive-image-max-height': `${Math.max(calculatedImageHeight, isMobile ? 200 : 300)}px`,
      '--adaptive-layout': 'stack', // 标记为上下布局
      '--is-mobile': isMobile ? 'true' : 'false', // 传递手机端标记
    };
  }
};

// 🟢 智能图片处理
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      if (file.size < 1.5 * 1024 * 1024) {
        resolve(event.target.result); 
        return;
      }
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_WIDTH = 1600; 
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
    };
  });
};

// 🟢 全球 CDN 图片加速
const getOptimizedUrl = (url, width = 400) => {
  if (!url || typeof url !== 'string') return "";
  if (!url.startsWith('http')) return null; 
  if (url.includes('wsrv.nl')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=90&output=webp`;
};

const AnimationStyles = () => (
  <style>{`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.5); border-radius: 20px; }
    .pixelated { image-rendering: pixelated; }
    .cursor-zoom-in { cursor: zoom-in; }
    .gpu-accelerated { transform: translateZ(0); backface-visibility: hidden; perspective: 1000px; }
    .static-gradient { background: linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%); }
    .font-traditional { font-family: "PMingLiU", "MingLiU", "Microsoft JhengHei", sans-serif; }
  `}</style>
);

// --- 2. 基础组件 ---

const Tag = memo(({ label, onClick, isActive }) => (
  <span onClick={onClick} className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer select-none transition-all duration-200 border ${isActive ? 'bg-indigo-500/90 text-white shadow-md border-indigo-400 scale-105' : 'bg-white/60 text-slate-600 border-white/40 hover:bg-white/90 hover:shadow-sm'}`}>{typeof label === 'string' ? label : 'Tag'}</span>
));

const LazyImage = memo(({ src, alt, className, width = 400, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const optimizedSrc = useMemo(() => getOptimizedUrl(src, width), [src, width]);
  
  if (!optimizedSrc) return <div className={`flex items-center justify-center bg-slate-100 text-slate-300 ${className}`}><ImageIcon size={20} /></div>;

  return (
    <div className={`relative overflow-hidden bg-slate-50 ${className}`}>
      {!isLoaded && <div className="absolute inset-0 bg-slate-100 animate-pulse z-10" />}
      <img 
        src={optimizedSrc} 
        alt={alt} 
        loading="lazy" 
        decoding="async" 
        onLoad={() => setIsLoaded(true)} 
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
        {...props} 
      />
    </div>
  );
});

// --- 3. 业务组件 (必须在 App 之前) ---

// 🟢 动图工坊
const GifMakerModule = () => {
  const gifshotLoaded = useGifshot();
  const [sourceImages, setSourceImages] = useState([]); 
  const [framePool, setFramePool] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [selectedFrameIds, setSelectedFrameIds] = useState(new Set());
  const [autoAddToTimeline, setAutoAddToTimeline] = useState(false);
  const [rows, setRows] = useState(4); const [cols, setCols] = useState(4); const [fps, setFps] = useState(10); const [isPlaying, setIsPlaying] = useState(false); const [previewIndex, setPreviewIndex] = useState(0); const [generatedGif, setGeneratedGif] = useState(null); const [isGenerating, setIsGenerating] = useState(false); const [isSlicing, setIsSlicing] = useState(false);
  const [cropTarget, setCropTarget] = useState(null); const [selection, setSelection] = useState(null); const [isSelecting, setIsSelecting] = useState(false); const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const intervalRef = useRef(null); const cropImgRef = useRef(null); const cropContainerRef = useRef(null); 

  const handleSourceUpload = (e) => { const files = Array.from(e.target.files); if (files.length === 0) return; files.forEach(file => { const reader = new FileReader(); reader.onload = (event) => { setSourceImages(prev => [...prev, { id: `src-${Date.now()}-${Math.random()}`, src: event.target.result, name: file.name }]); }; reader.readAsDataURL(file); }); e.target.value = ''; };
  const handleMultiUpload = (e) => { const files = Array.from(e.target.files); let processedCount = 0; files.forEach((file, index) => { const reader = new FileReader(); reader.onload = (event) => { const uniqueId = `upload-${Date.now()}-${index}-${Math.random()}`; const frame = { id: uniqueId, src: event.target.result, source: 'upload' }; processedCount++; setFramePool(prev => { const newPool = [...prev, frame]; if(autoAddToTimeline && processedCount === files.length) { setTimeline(t => [...t, ...newPool.slice(-files.length).map(f=>({...f, uniqueId: `auto-${f.id}-${Math.random()}`}))]); } return newPool; }); }; reader.readAsDataURL(file); }); e.target.value = ''; };
  const processSingleImage = (imgData, r, c) => { return new Promise((resolve) => { const image = new Image(); image.onload = () => { const frameW = image.width / c; const frameH = image.height / r; const newFrames = []; const canvas = document.createElement('canvas'); canvas.width = frameW; canvas.height = frameH; const ctx = canvas.getContext('2d'); for (let y = 0; y < r; y++) { for (let x = 0; x < c; x++) { ctx.clearRect(0, 0, frameW, frameH); ctx.drawImage(image, x * frameW, y * frameH, frameW, frameH, 0, 0, frameW, frameH); newFrames.push({ id: `slice-${Date.now()}-${x}-${y}-${Math.random()}`, src: canvas.toDataURL('image/png') }); } } resolve(newFrames); }; image.onerror = () => resolve([]); image.src = imgData.src; }); };
  const handleBatchSlice = async () => { if (sourceImages.length === 0) return; setIsSlicing(true); const allResults = await Promise.all(sourceImages.map(img => processSingleImage(img, rows, cols))); const allNewFrames = allResults.flat(); setFramePool(prev => [...prev, ...allNewFrames]); if (autoAddToTimeline) { const timelineFrames = allNewFrames.map(f => ({ ...f, uniqueId: `auto-${f.id}-${Math.random()}` })); setTimeline(prev => [...prev, ...timelineFrames]); } setIsSlicing(false); };
  const moveSourceImage = (index, direction) => { if ((direction === -1 && index === 0) || (direction === 1 && index === sourceImages.length - 1)) return; setSourceImages(prev => { const n = [...prev]; [n[index], n[index + direction]] = [n[index + direction], n[index]]; return n; }); };
  const addToTimeline = (frame) => { setTimeline(prev => [...prev, { ...frame, uniqueId: `add-${Date.now()}-${Math.random()}` }]); };
  const addSelectedToTimeline = () => { const selectedFrames = framePool.filter(f => selectedFrameIds.has(f.id)); const newTimelineFrames = selectedFrames.map(f => ({ ...f, uniqueId: `batch-${Date.now()}-${Math.random()}` })); setTimeline(prev => [...prev, ...newTimelineFrames]); };
  const moveFrame = (index, direction) => { if ((direction === -1 && index === 0) || (direction === 1 && index === timeline.length - 1)) return; setTimeline(prev => { const n = [...prev]; [n[index], n[index + direction]] = [n[index + direction], n[index]]; return n; }); };
  const handleMouseDown = (e) => { if (!cropContainerRef.current) return; const rect = cropContainerRef.current.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; setStartPos({ x, y }); setSelection({ x, y, w: 0, h: 0 }); setIsSelecting(true); };
  const handleMouseMove = (e) => { if (!isSelecting || !cropContainerRef.current) return; const rect = cropContainerRef.current.getBoundingClientRect(); const currentX = e.clientX - rect.left; const currentY = e.clientY - rect.top; const width = Math.abs(currentX - startPos.x); const height = Math.abs(currentY - startPos.y); const x = Math.min(currentX, startPos.x); const y = Math.min(currentY, startPos.y); setSelection({ x, y, w: width, h: height }); };
  const confirmCropSelection = () => { if (!selection || !cropImgRef.current) return; const img = cropImgRef.current; const scaleX = img.naturalWidth / img.clientWidth; const scaleY = img.naturalHeight / img.clientHeight; const canvas = document.createElement('canvas'); canvas.width = selection.w * scaleX; canvas.height = selection.h * scaleY; const ctx = canvas.getContext('2d'); ctx.drawImage(img, selection.x * scaleX, selection.y * scaleY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height); const newFrame = { id: `manual-${Date.now()}`, src: canvas.toDataURL('image/png') }; setFramePool(prev => [...prev, newFrame]); if(autoAddToTimeline) addToTimeline(newFrame); setSelection(null); };
  useEffect(() => { if (isPlaying && timeline.length > 0) { intervalRef.current = setInterval(() => { setPreviewIndex(prev => (prev + 1) % timeline.length); }, 1000 / fps); } else { clearInterval(intervalRef.current); } return () => clearInterval(intervalRef.current); }, [isPlaying, fps, timeline.length]);
  const generateGIF = () => { if (!gifshotLoaded || timeline.length === 0) return; setIsGenerating(true); setGeneratedGif(null); window.gifshot.createGIF({ images: timeline.map(f => f.src), interval: 1 / fps, gifWidth: 300, gifHeight: 300 }, (obj) => { if (!obj.error) setGeneratedGif(obj.image); setIsGenerating(false); }); };

  return (
    <div className="animate-fade-in-up">
      {cropTarget && <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-4"><div className="bg-white rounded-2xl p-2 shadow-2xl max-w-4xl w-full border border-white/20 relative"><div className="absolute top-4 right-4 z-20 flex gap-2"><button onClick={confirmCropSelection} disabled={!selection || selection.w < 5} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 flex items-center"><Check size={16} className="mr-1"/> 确认裁剪</button><button onClick={() => {setCropTarget(null); setSelection(null);}} className="p-2 bg-white/80 hover:bg-slate-100 rounded-xl text-slate-600 transition-all"><X size={20}/></button></div><div className="relative overflow-hidden rounded-xl bg-slate-100 select-none flex items-center justify-center min-h-[400px]" ref={cropContainerRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={() => setIsSelecting(false)} onMouseLeave={() => setIsSelecting(false)}><img ref={cropImgRef} src={cropTarget} className="max-h-[70vh] object-contain pointer-events-none pixelated" />{selection && <div className="absolute border-2 border-green-500 bg-green-500/20 pointer-events-none" style={{ left: selection.x, top: selection.y, width: selection.w, height: selection.h }} />}{!selection && !isSelecting && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="bg-black/50 text-white px-4 py-2 rounded-full flex items-center backdrop-blur-md"><MousePointer2 size={16} className="mr-2"/> 拖拽框选</div></div>}</div></div></div>}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-white/70 backdrop-blur-md border border-white/50 rounded-3xl p-6 shadow-sm">
                <h2 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center justify-between"><span className="flex items-center"><ImageIcon className="w-4 h-4 mr-2 text-blue-500" /> 模式 A: 角色素材处理</span></h2>
                <div className="space-y-4">
                    <div className="relative group"><input type="file" accept="image/*" multiple onChange={handleSourceUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/><div className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-2xl p-6 text-center hover:border-indigo-400 transition-all"><div className="flex flex-col items-center text-indigo-400"><Upload className="w-8 h-8 mb-2" /><span className="text-xs font-bold">上传大图 (支持多选)</span></div></div></div>
                    {sourceImages.length > 0 && (<div className="bg-white/50 rounded-xl border border-indigo-100 overflow-hidden"><div className="px-3 py-2 bg-indigo-50/50 border-b border-indigo-100 text-xs font-bold text-indigo-400 flex justify-between"><span>待处理列表 ({sourceImages.length})</span></div><div className="max-h-[150px] overflow-y-auto p-2 space-y-2 custom-scrollbar">{sourceImages.map((img, idx) => (<div key={img.id} className="flex items-center bg-white p-2 rounded-lg border border-slate-100 group shadow-sm"><img src={img.src} className="w-8 h-8 object-cover rounded bg-slate-100 mr-3 pixelated"/><div className="flex-1 min-w-0"><div className="text-xs text-slate-600 truncate font-medium">{img.name}</div></div><div className="flex items-center space-x-1"><button onClick={() => {setCropTarget(img.src); setSelection(null);}} className="p-1.5 bg-indigo-100 hover:bg-indigo-500 text-indigo-600 hover:text-white rounded transition-colors mr-1" title="手动切片"><Scissors className="w-3 h-3"/></button><div className="flex items-center space-x-0.5 opacity-60 group-hover:opacity-100 transition-opacity"><button onClick={() => moveSourceImage(idx, -1)} disabled={idx === 0} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowUp className="w-3 h-3"/></button><button onClick={() => moveSourceImage(idx, 1)} disabled={idx === sourceImages.length - 1} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowDown className="w-3 h-3"/></button><button onClick={() => setSourceImages(p => p.filter(i => i.id !== img.id))} className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-500 ml-1"><Trash2 className="w-3 h-3"/></button></div></div></div>))}</div></div>)}
                    <div className="bg-white/50 p-3 rounded-xl border border-indigo-100"><div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-slate-500">网格切片设置</span><label className="flex items-center space-x-2 cursor-pointer select-none group"><div onClick={() => setAutoAddToTimeline(!autoAddToTimeline)} className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${autoAddToTimeline ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 bg-white'}`}>{autoAddToTimeline && <Check className="w-2.5 h-2.5 text-white" />}</div><span className="text-[10px] text-slate-400">自动加入序列</span></label></div><div className="grid grid-cols-2 gap-3 mb-3"><div><label className="text-[10px] text-slate-400 mb-1 block">列 (Cols)</label><input type="number" value={cols} onChange={(e) => setCols(Math.max(1, Number(e.target.value)))} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:border-indigo-500 outline-none"/></div><div><label className="text-[10px] text-slate-400 mb-1 block">行 (Rows)</label><input type="number" value={rows} onChange={(e) => setRows(Math.max(1, Number(e.target.value)))} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:border-indigo-500 outline-none"/></div></div><button onClick={handleBatchSlice} disabled={sourceImages.length === 0 || isSlicing} className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 text-xs font-bold rounded-lg flex items-center justify-center transition-all shadow-md shadow-indigo-200">{isSlicing ? <><RefreshCw className="w-3 h-3 mr-2 animate-spin" /> 切割中...</> : <><Grid className="w-3 h-3 mr-2" /> 自动网格切割</>}</button></div>
                    <div className="relative flex items-center py-1"><div className="flex-grow border-t border-slate-200"></div><span className="flex-shrink-0 mx-4 text-slate-400 text-[10px] font-bold">OR</span><div className="flex-grow border-t border-slate-200"></div></div>
                    <div><h2 className="text-xs font-bold text-slate-500 mb-2 flex items-center justify-between"><span>模式 B: 直接导入素材</span></h2><label className="flex items-center justify-center w-full py-2.5 bg-white hover:bg-slate-50 text-indigo-500 font-bold rounded-xl cursor-pointer transition-all border border-indigo-100 shadow-sm"><Plus className="w-4 h-4 mr-2" /><span className="text-xs">导入单张图片 (可多选)</span><input type="file" multiple accept="image/*" onChange={handleMultiUpload} className="hidden"/></label></div>
                </div>
            </div>
            <div className="bg-white/70 backdrop-blur-md border border-white/50 rounded-3xl p-6 shadow-sm sticky top-24">
                <h2 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center"><Film className="w-4 h-4 mr-2 text-pink-500" /> 预览与导出</h2>
                <div className="flex flex-col items-center justify-center bg-slate-100/80 rounded-2xl p-4 mb-4 border border-slate-200 min-h-[180px] relative overflow-hidden">{timeline.length > 0 ? (<img src={timeline[previewIndex % timeline.length]?.src} className="max-w-full max-h-[160px] object-contain pixelated" alt="Preview"/>) : (<div className="text-slate-400 text-xs">时间轴为空</div>)}{timeline.length > 0 && <div className="mt-2 text-[10px] font-mono text-slate-500 absolute bottom-2 right-2 bg-white/80 px-2 py-0.5 rounded-full border border-slate-100">#{previewIndex + 1}</div>}</div>
                <div className="space-y-4"><div><div className="flex justify-between text-xs text-slate-400 mb-1 font-bold"><span>速度</span><span>{fps} FPS</span></div><input type="range" min="1" max="30" value={fps} onChange={(e) => setFps(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-500"/></div><div className="flex gap-2"><button onClick={() => setIsPlaying(!isPlaying)} className={`flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${isPlaying ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>{isPlaying ? <><Pause className="w-4 h-4 mr-1" /> 暂停</> : <><Play className="w-4 h-4 mr-1" /> 播放</>}</button><button onClick={generateGIF} disabled={timeline.length === 0 || isGenerating} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center transition-all shadow-lg shadow-indigo-200">{isGenerating ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />} {isGenerating ? '生成中' : '生成 GIF'}</button></div>{generatedGif && (<div className="pt-4 border-t border-slate-100 text-center animate-fade-in-up"><div className="text-center mb-2 text-green-500 font-bold text-xs">生成成功!</div><div className="flex flex-col items-center"><img src={generatedGif} className="border-2 border-white shadow-md rounded-lg max-h-32 mb-3" alt="Result" /><a href={generatedGif} download={`banana-anim-${Date.now()}.gif`} className="text-xs bg-slate-800 hover:bg-black text-white px-4 py-1.5 rounded-full flex items-center transition-colors"><Download className="w-3 h-3 mr-1" /> 下载文件</a></div></div>)}</div>
            </div>
        </div>
        <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-white/70 backdrop-blur-md border border-white/50 rounded-3xl overflow-hidden shadow-sm flex flex-col min-h-[350px]">
                <div className="p-4 border-b border-slate-100 bg-white/40 flex justify-between items-center sticky top-0 z-20">
                    <div className="flex items-center space-x-4"><h2 className="text-sm font-bold text-slate-500 flex items-center"><Layers className="w-4 h-4 mr-2 text-blue-500" /> 素材池</h2>{framePool.length > 0 && (<div className="flex items-center space-x-2 text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded-lg"><button onClick={() => setSelectedFrameIds(selectedFrameIds.size === framePool.length ? new Set() : new Set(framePool.map(f => f.id)))} className="hover:text-blue-500 flex items-center font-bold">{selectedFrameIds.size === framePool.length && framePool.length > 0 ? <CheckSquare className="w-3 h-3 mr-1"/> : <Square className="w-3 h-3 mr-1"/>} 全选</button><span className="w-[1px] h-3 bg-slate-300"></span><span>已选 {selectedFrameIds.size}</span></div>)}</div>
                    <div className="flex space-x-2">{selectedFrameIds.size > 0 ? (<><button onClick={() => { setFramePool(prev => prev.filter(f => !selectedFrameIds.has(f.id))); setSelectedFrameIds(new Set()); }} className="text-xs text-red-500 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors flex items-center font-bold"><Trash2 className="w-3 h-3 mr-1" /> 删除</button><button onClick={addSelectedToTimeline} className="text-xs text-white bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded-lg transition-colors flex items-center font-bold shadow-md shadow-blue-200"><Plus className="w-3 h-3 mr-1" /> 添加</button></>) : (framePool.length > 0 && <button onClick={() => setFramePool([])} className="text-xs text-slate-400 hover:text-red-400 px-2 py-1 rounded hover:bg-red-50 transition-colors">清空所有</button>)}</div>
                </div>
                <div className="p-4 bg-slate-50/50 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
                    {framePool.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-12"><Layers className="w-12 h-12 opacity-20 text-indigo-300" /><p className="text-xs">暂无素材，请先在左侧上传</p></div>) : (<div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-3 select-none">{framePool.map((frame, idx) => { const isSelected = selectedFrameIds.has(frame.id); return (<div key={frame.id} onClick={() => { const n = new Set(selectedFrameIds); n.has(frame.id) ? n.delete(frame.id) : n.add(frame.id); setSelectedFrameIds(n); }} onDoubleClick={() => addToTimeline(frame)} className={`aspect-square rounded-xl border-2 relative group transition-all cursor-pointer overflow-hidden shadow-sm ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-white bg-white hover:border-blue-200'}`}><img src={frame.src} className="w-full h-full object-contain p-1 pixelated" alt={`Frame ${idx}`} />{isSelected && <div className="absolute top-1 left-1 bg-blue-500 text-white p-0.5 rounded-full shadow-md"><Check className="w-2 h-2" /></div>}<div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div><div className="absolute bottom-0 right-0 p-1 opacity-0 group-hover:opacity-100 flex gap-1 z-10 transition-opacity"><button onClick={(e) => { e.stopPropagation(); addToTimeline(frame); }} className="bg-blue-500 text-white p-1 rounded-md shadow hover:bg-blue-600" title="添加"><Plus className="w-3 h-3" /></button></div></div>); })}</div>)}
                </div>
            </div>
            <div className="bg-white/70 backdrop-blur-md border border-white/50 rounded-3xl overflow-hidden shadow-sm flex flex-col flex-1">
                 <div className="p-4 border-b border-slate-100 bg-white/40 flex justify-between items-center"><h2 className="text-sm font-bold text-slate-500 flex items-center"><MoveRight className="w-4 h-4 mr-2 text-green-500" /> 时间轴 <span className="ml-2 text-[10px] bg-white px-2 py-0.5 rounded-full border border-slate-100 text-slate-400">{timeline.length} 帧</span></h2><button onClick={() => setTimeline([])} disabled={timeline.length === 0} className="text-xs text-red-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50 font-bold"><Trash2 className="w-3 h-3 inline mr-1" /> 清空</button></div>
                <div className="p-4 overflow-x-auto whitespace-nowrap min-h-[160px] bg-slate-50/50 flex items-center space-x-3 custom-scrollbar">
                    {timeline.length === 0 ? (<div className="w-full text-center text-slate-400 text-xs py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">从上方素材池双击图片或点击"+"号添加</div>) : (timeline.map((frame, index) => (<div key={frame.uniqueId} className={`inline-flex flex-col w-20 bg-white rounded-xl border shadow-sm relative group flex-shrink-0 transition-all ${index === previewIndex && isPlaying ? 'border-green-500 ring-2 ring-green-100 scale-105 z-10' : 'border-slate-200 hover:border-blue-300'}`}><div className="h-20 w-full flex items-center justify-center p-1"><img src={frame.src} className="max-w-full max-h-full object-contain pixelated" alt={`Seq ${index}`}/></div><div className="h-7 flex items-center justify-between px-1 bg-slate-50/50 rounded-b-xl border-t border-slate-100"><div className="flex space-x-0.5"><button onClick={() => moveFrame(index, -1)} disabled={index===0} className="p-0.5 hover:bg-white rounded text-slate-400 hover:text-blue-500 disabled:opacity-20"><ChevronLeft className="w-3 h-3"/></button><button onClick={() => moveFrame(index, 1)} disabled={index===timeline.length-1} className="p-0.5 hover:bg-white rounded text-slate-400 hover:text-blue-500 disabled:opacity-20"><ChevronRight className="w-3 h-3"/></button></div><button onClick={() => setTimeline(p => p.filter((_, i) => i !== index))} className="p-0.5 hover:bg-red-100 text-slate-300 hover:text-red-500 rounded"><X className="w-3 h-3" /></button></div><div className="absolute top-0 left-0 bg-slate-100/90 text-slate-500 text-[9px] px-1.5 py-0.5 rounded-br-lg font-mono border-r border-b border-slate-200">{index + 1}</div></div>)))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

// --- 🟢 4. 游客投稿弹窗 (支持 修改 和 变体) ---
const SubmissionModal = ({ onClose, commonTags = [], mode = 'create', initialData = null, onLocalSubmit = null }) => {
  const [formData, setFormData] = useState({ title: '', content: '', images: [], tags: [], contributor: '', notes: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [urlInput, setUrlInput] = useState(''); 
  const [isDragOver, setIsDragOver] = useState(false);
  const [contributorHistory, setContributorHistory] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('nanobanana_contributor_history');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setContributorHistory(parsed.filter(v => typeof v === 'string').slice(0, 3));
      }
    } catch (e) {}
  }, []);

  // 初始化表单数据
  useEffect(() => {
      if (initialData) {
          if (mode === 'edit') {
              // 编辑模式：全量预填
              setFormData({
                  title: initialData.title,
                  content: initialData.content,
                  images: initialData.images || (initialData.image ? [initialData.image] : []),
                  tags: Array.isArray(initialData.tags) ? initialData.tags : [],
                  contributor: initialData.contributor || '',
                  notes: initialData.notes || ''
              });
          } else if (mode === 'edit-variant') {
              // 编辑变体模式：预填变体数据
              const variantData = initialData.variantData || {};
              setFormData({
                  title: initialData.title + ` (变体 ${initialData.variantIndex + 1})`,
                  content: variantData.content || '',
                  images: initialData.images || (initialData.image ? [initialData.image] : []),
                  tags: Array.isArray(initialData.tags) ? initialData.tags : [],
                  contributor: variantData.contributor || '',
                  notes: variantData.notes || ''
              });
          } else if (mode === 'variant') {
              // 变体模式：预填标题(只读)、标签、保留父级图片(逻辑上在后端处理，这里仅展示或允许新增)
              // 注意：用户说"除了名字和之前的图片不能修改之外都可以修改，也可以新增图片"
              // 因此这里我们加载原图，允许添加新图
              setFormData({
                  title: initialData.title + " (变体)", // 稍后会被强制覆盖或作为参考
                  content: "", // 内容清空，等待填入变体内容
                  images: initialData.images || (initialData.image ? [initialData.image] : []),
                  tags: Array.isArray(initialData.tags) ? initialData.tags : [],
                  contributor: '',
                  notes: ''
              });
          }
      }
  }, [initialData, mode]);

  const processFiles = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const fullBase64 = await compressImage(file);
        const base64Body = fullBase64.split(',')[1];
        try {
            const res = await fetch('/api/catbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: base64Body }) });
            const json = await res.json();
            if (json.success) { setFormData(prev => ({ ...prev, images: [...prev.images, json.url] })); continue; }
        } catch(e) { console.warn("Catbox failed, fallback to ImgBB"); }
        const formData = new FormData(); formData.append('image', base64Body);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
        const json = await res.json();
        if (json.success) setFormData(prev => ({ ...prev, images: [...prev.images, json.data.url] }));
        else alert("上传失败");
      } catch (err) { alert("网络错误"); }
    }
    setIsUploading(false);
  };

  const handleFileSelect = (e) => processFiles(e.target.files);
  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragOver(false); processFiles(e.dataTransfer.files); };
  const handleAddUrl = () => { if(!urlInput.trim()) return; setFormData(prev => ({ ...prev, images: [...prev.images, urlInput.trim()] })); setUrlInput(''); };
  const removeImage = (idx) => { 
      // 变体模式下，不允许删除原有的图片（假设原图是前几个）
      // 这里简化处理：允许用户在界面上删，但在后端逻辑中，变体是 append 到 similar，并不直接改原图
      // 但用户说"之前的图片不能修改"，所以这里应该做个限制
      if (mode === 'variant' && initialData && idx < (initialData.images?.length || 0)) {
          alert("变体模式下，原图不可删除");
          return;
      }
      setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) })); 
  };
  const toggleTag = (tag) => { setFormData(prev => { const tags = prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]; return { ...prev, tags }; }); };

  const handleDirectSubmit = async () => {
    if (!formData.content) return alert("请至少填写【Prompt 内容】");

    setIsSending(true);
    
    try {
      // 构造扩展的 Submission Object
      const actionType = mode === 'edit-variant' ? 'edit-variant' : mode;
      const submissionData = {
          title: (mode === 'variant' || mode === 'edit-variant') ? initialData.title : formData.title,
          content: formData.content,
          images: formData.images,
          tags: formData.tags,
          contributor: formData.contributor || "匿名",
          notes: formData.notes || "",
          action: actionType,
          targetId: initialData ? initialData.id : null,
          variantIndex: mode === 'edit-variant' ? initialData.variantIndex : null,
          originalTitle: initialData ? initialData.title : null,
          submissionType: mode === 'edit-variant' ? '修改变体' : mode === 'variant' ? '新增变体' : mode === 'edit' ? '修改原贴' : '全新投稿'
      };

      const result = await submitPrompt(submissionData);
      
      if (result.success) { 
        const trimmedContributor = (formData.contributor || '').trim();
        if (trimmedContributor) {
          const nextHistory = [trimmedContributor, ...contributorHistory.filter(v => v !== trimmedContributor)].slice(0, 3);
          setContributorHistory(nextHistory);
          localStorage.setItem('nanobanana_contributor_history', JSON.stringify(nextHistory));
        }
        if (typeof onLocalSubmit === 'function') {
          onLocalSubmit(submissionData, initialData);
        }
        alert("🎉 投稿成功！管理员审核后将生效。"); 
        onClose(); 
      } else { 
        throw new Error(result.error || "提交失败"); 
      }
    } catch (error) { 
      alert("投稿失败，请检查网络或稍后重试。"); 
      console.error(error); 
    } finally { 
      setIsSending(false); 
    }
  };

  const safeCommonTags = Array.isArray(commonTags) ? commonTags.filter(t => typeof t === 'string') : [];
  const modalTitle = mode === 'edit-variant' ? '修改变体投稿' : mode === 'variant' ? '新增变体投稿' : mode === 'edit' ? '修改原投稿' : '投稿提示词';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
       <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl p-8 shadow-2xl border border-white/50">
          <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-slate-800 flex items-center"><Send className="w-5 h-5 mr-2 text-indigo-500"/> {modalTitle}</h3><button onClick={onClose}><X className="text-slate-400 hover:text-slate-600"/></button></div>
          <div className="space-y-5">
             <div><label className="text-xs font-bold text-slate-500 block mb-1">标题 {mode !== 'create' && '(不可修改)'}</label><input value={mode === 'variant' ? initialData.title : formData.title} disabled={mode !== 'create'} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed" placeholder="给你的灵感起个名"/></div>
             <div><label className="text-xs font-bold text-slate-500 block mb-1">投稿人 ID (选填)</label><div className="relative"><Smile className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"/><input list="contributor-history-list" value={formData.contributor} onChange={e=>setFormData({...formData, contributor: e.target.value})} className="w-full bg-slate-50 border border-slate-200 pl-9 p-2 rounded-xl outline-none focus:border-indigo-500 text-sm" placeholder="无投稿人"/><datalist id="contributor-history-list">{contributorHistory.map((item, idx) => <option key={`${item}-${idx}`} value={item} />)}</datalist></div></div>
             <div><label className="text-xs font-bold text-slate-500 block mb-1">Prompt 内容 <span className="text-red-500">*</span></label><textarea value={formData.content} onChange={e=>setFormData({...formData, content: e.target.value})} rows={4} className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none focus:border-indigo-500 font-mono text-sm" placeholder={mode === 'variant' ? "请输入变体 prompt..." : "必填..."}/></div>
             <div><label className="text-xs font-bold text-slate-500 block mb-1">作者备注 (选填)</label><textarea value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} rows={2} className="w-full bg-amber-50 border border-amber-200 p-2 rounded-xl outline-none focus:border-amber-400 text-sm" placeholder="添加备注说明、使用技巧等..."/></div>
             <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`rounded-xl border-2 border-dashed p-2 transition-all ${isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}><label className="text-xs font-bold text-slate-500 block mb-1 px-1">配图 ({formData.images.length}) - {mode==='variant'?'新增图片':'拖拽/多选'}</label><div className="grid grid-cols-3 gap-2 mb-2">{formData.images.map((img, idx) => (<div key={idx} className="relative aspect-square rounded-lg overflow-hidden border group bg-slate-100"><img src={getOptimizedUrl(img, 200)} className="w-full h-full object-cover" /><button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button></div>))}<label className={`aspect-square bg-indigo-50 text-indigo-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-100 transition-all border-2 border-dashed border-indigo-200 ${isUploading ? 'opacity-50' : ''}`}>{isUploading ? <Loader2 className="animate-spin w-5 h-5"/> : <Plus className="w-6 h-6"/>}<span className="text-[10px] font-bold mt-1 text-center px-1">{isUploading ? '上传中' : '点击/拖入'}</span><input type="file" accept="image/*" multiple className="hidden" disabled={isUploading} onChange={handleFileSelect}/></label></div><div className="flex gap-2"><input value={urlInput} onChange={e=>setUrlInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAddUrl()} placeholder="粘贴链接" className="flex-1 bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs outline-none"/><button onClick={handleAddUrl} disabled={!urlInput.trim()} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg disabled:opacity-50">添加</button></div></div>
             <div><label className="text-xs font-bold text-slate-500 block mb-2">标签 (选填)</label>{safeCommonTags.length > 0 ? (<div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-32 overflow-y-auto custom-scrollbar">{safeCommonTags.map(t => (<span key={t} onClick={() => toggleTag(t)} className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all select-none border ${formData.tags.includes(t) ? 'bg-indigo-500 text-white border-indigo-500 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>{t}</span>))}</div>) : (<div className="text-xs text-slate-400 p-2 bg-slate-50 rounded-xl text-center">暂无可用标签</div>)}</div>
             <button onClick={handleDirectSubmit} disabled={isUploading || isSending} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center">{isSending ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : <Send className="mr-2 w-4 h-4"/>} {isSending ? '投递中...' : '立即投稿'}</button>
          </div>
       </div>
    </div>
  );
};

// --- 5. 提示词卡片 ---
const PromptCard = memo(({ prompt, isAdmin, draggedItem, dragOverTarget, handleDragStart, handleDragEnd, handleDragOver, handleDragEnter, handleDrop, onClick, isFavorite, onToggleFavorite, isNew }) => {
  const tags = Array.isArray(prompt.tags) ? prompt.tags : [];
  const images = Array.isArray(prompt.images) && prompt.images.length > 0 ? prompt.images : (prompt.image ? [prompt.image] : []);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const hoverTimeout = useRef(null);

  const handleMouseEnter = () => { hoverTimeout.current = setTimeout(() => setIsHovering(true), 200); };
  const handleMouseLeave = () => { if (hoverTimeout.current) clearTimeout(hoverTimeout.current); setIsHovering(false); setCurrentImgIdx(0); };

  useEffect(() => {
    if (images.length <= 1 || !isHovering) return; 
    const interval = setInterval(() => { setCurrentImgIdx(prev => (prev + 1) % images.length); }, 1200); 
    return () => clearInterval(interval);
  }, [images.length, isHovering]);

  const isDragTarget = dragOverTarget === prompt.id && draggedItem?.type === 'PROMPT';
  const isBeingDragged = draggedItem?.data?.id === prompt.id;

  return (
    <div 
      draggable={isAdmin} 
      onDragStart={(e) => handleDragStart(e, 'PROMPT', prompt)} 
      onDragEnd={handleDragEnd} 
      onDragOver={handleDragOver} 
      onDragEnter={(e) => handleDragEnter(e, prompt.id)} 
      onDrop={(e) => handleDrop(e, prompt.id, 'PROMPT')} 
      onClick={(e) => { e.stopPropagation(); onClick(prompt); }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ease-out aspect-[3/4] flex flex-col relative ${isDragTarget ? 'ring-2 ring-indigo-500 transform scale-105 z-20 shadow-xl' : 'shadow-sm hover:shadow-lg hover:-translate-y-0.5'} ${isBeingDragged ? 'opacity-30 grayscale' : ''} gpu-accelerated`}
    >
      <div className="flex-1 bg-slate-100 relative overflow-hidden pointer-events-none">
        {images.length > 0 ? (
          <>
             <LazyImage src={images[currentImgIdx]} width={600} alt={prompt.title} className="absolute inset-0 w-full h-full" />
             {images.length > 1 && (
               <div className={`absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 transition-opacity duration-300 ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
                 <Layers size={10}/> {currentImgIdx + 1}/{images.length}
               </div>
             )}
             {prompt.similar && prompt.similar.length > 0 && (
                 <div className="absolute top-2 right-2 bg-indigo-500/80 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold shadow-sm">
                     +{prompt.similar.length} 变体
                 </div>
             )}
          </>
        ) : (<div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50"><div className="p-3 bg-white rounded-full shadow-sm mb-2"><ImageIcon size={20}/></div><span className="text-[10px]">No Image</span></div>)}
      </div>
      <div className="p-4 bg-white h-20 flex flex-col justify-center border-t border-slate-50 pointer-events-none relative z-10">
        <h3 className="font-bold text-sm truncate text-slate-800 mb-1.5">{prompt.title}</h3>
        <div className="flex gap-1 overflow-hidden opacity-70 group-hover:opacity-100 transition-opacity">{tags.slice(0, 2).map(t => (typeof t === 'string' ? <span key={t} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{t}</span> : null))}</div>
      </div>
      
      {isNew && <div className="absolute bottom-4 right-12 z-20 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm animate-pulse pointer-events-none select-none">NEW</div>}

      <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(prompt); }} className={`absolute bottom-3 right-3 p-2 rounded-full z-20 transition-all active:scale-90 hover:bg-slate-100 ${isFavorite ? 'text-pink-500 bg-pink-50' : 'text-slate-300 bg-white/80'}`} title={isFavorite ? "取消收藏" : "收藏"}><Heart size={16} fill={isFavorite ? "currentColor" : "none"} className={isFavorite ? "animate-pulse-once" : ""} /></button>
    </div>
  );
});

// --- 6. 提示词详情页 (支持变体切换 + 投稿变体/修改入口 + 左右布局 + 作者备注 + 变体独立图片) ---
// 🔴 新增 isFromFavorite 和 onLocalAction props，区分本地收藏和云端提示词
const PromptViewer = memo(({ prompt, onSubmissionAction, orientation = 'landscape', isFromFavorite = false, onLocalAction }) => {
  const tags = Array.isArray(prompt.tags) ? prompt.tags : [];
  // 🟢 主提示词的图片
  const mainImages = Array.isArray(prompt.images) && prompt.images.length > 0 ? prompt.images : (prompt.image ? [prompt.image] : []);
  const [idx, setIdx] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  
  // 📱 检测是否是手机端
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  
  // 📱 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 🟢 判断是否使用左右布局（竖图或正方形）- 📱 手机端强制使用上下布局
  const useSideLayout = !isMobile && (orientation === 'portrait' || orientation === 'square');
  
  // 🟢 计算当前 Tab 的图片（变体可能有自己的图片）
  const currentImages = useMemo(() => {
      if (activeTab === 0) return mainImages;
      const variant = prompt.similar?.[activeTab - 1];
      // 如果变体有自己的图片，使用变体图片；否则使用主图
      if (variant && Array.isArray(variant.images) && variant.images.length > 0) {
          return variant.images;
      }
      return mainImages;
  }, [prompt, activeTab, mainImages]);
  
  // 🟢 切换 Tab 时：只有当变体有自己的图片时，才自动跳转到第一张
  // 对于主提示词或没有独立图片的变体，保持当前图片索引不变
  useEffect(() => {
      if (activeTab !== 0) {
          const variant = prompt.similar?.[activeTab - 1];
          // 如果变体有自己的图片，跳到第一张
          if (variant && Array.isArray(variant.images) && variant.images.length > 0) {
              setIdx(0);
          }
      }
  }, [activeTab, prompt.similar]);
  
  const currentContent = useMemo(() => {
      if (activeTab === 0) return prompt.content;
      return prompt.similar?.[activeTab - 1]?.content || "";
  }, [prompt, activeTab]);

  // 新增：计算当前展示的投稿人
  const currentContributor = useMemo(() => {
      if (activeTab === 0) return prompt.contributor;
      return prompt.similar?.[activeTab - 1]?.contributor;
  }, [prompt, activeTab]);

  // 🟢 新增：计算当前展示的作者备注
  const currentNotes = useMemo(() => {
      if (activeTab === 0) return prompt.notes || "";
      return prompt.similar?.[activeTab - 1]?.notes || "";
  }, [prompt, activeTab]);

  const handleDoubleClick = () => { if (currentImages.length > 0) window.open(currentImages[idx], '_blank'); };

  // 🟢 图片区域组件 - 使用 currentImages 以支持变体独立图片
  const ImageSection = () => (
    currentImages.length > 0 ? (
       <div className="relative w-full bg-slate-50/50 rounded-2xl overflow-hidden border border-slate-200/60 shadow-inner flex items-center justify-center group" style={{ minHeight: useSideLayout ? '300px' : '200px', maxHeight: 'var(--adaptive-image-max-height, 70vh)' }}>
          <LazyImage src={currentImages[idx]} width={1200} className="w-auto h-auto max-w-full object-contain cursor-zoom-in transition-transform duration-300" style={{ maxHeight: 'var(--adaptive-image-max-height, 70vh)' }} onDoubleClick={handleDoubleClick} title="双击查看原图" />
          {currentImages.length > 1 && (
            <>
              <button onClick={(e)=>{e?.stopPropagation();setIdx((p)=>(p-1+currentImages.length)%currentImages.length)}} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/10 hover:bg-black/30 text-white transition-all opacity-0 group-hover:opacity-100 z-50"><ChevronLeft size={24}/></button>
              <button onClick={(e)=>{e?.stopPropagation();setIdx((p)=>(p+1)%currentImages.length)}} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/10 hover:bg-black/30 text-white transition-all opacity-0 group-hover:opacity-100 z-50"><ChevronRight size={24}/></button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-50">{currentImages.map((_, i) => (<div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/40'}`} />))}</div>
            </>
          )}
       </div>
    ) : (<div className="w-full h-48 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">暂无配图</div>)
  );

  // 🟢 内容区域组件
  const ContentSection = () => (
    <div className={`space-y-4 ${useSideLayout ? 'flex-1 min-w-0 flex flex-col' : ''}`}>
      {/* 标签和操作按钮 */}
      <div className={`flex flex-wrap items-center justify-between gap-4 ${isMobile ? 'gap-2' : ''}`}>
          <div className={`flex flex-wrap gap-2 ${isMobile ? 'gap-1' : ''}`}>
              {tags.map(t => (typeof t === 'string' ? <span key={t} className={`bg-indigo-50 text-indigo-600 font-bold rounded-lg border border-indigo-100 ${isMobile ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}`}>#{t}</span> : null))}
          </div>
          
          {/* 🔴 游客创作入口 - 区分本地收藏和云端提示词 */}
          <div className={`flex gap-2 ${isMobile ? 'gap-1 flex-wrap' : ''}`}>
              {isFromFavorite ? (
                  // 🟢 本地收藏：显示本地操作按钮
                  <>
                      <button onClick={() => onLocalAction && onLocalAction('local-variant', prompt)} className={`flex items-center gap-1 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 font-bold rounded-lg transition-colors border border-green-100 ${isMobile ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'}`}>
                          <CopyPlus size={isMobile ? 12 : 14}/> 添加变体
                      </button>
                      <button onClick={() => {
                          if (activeTab === 0) {
                              onLocalAction && onLocalAction('local-edit', prompt);
                          } else {
                              const variant = prompt.similar?.[activeTab - 1];
                              if (variant) {
                                  onLocalAction && onLocalAction('local-edit-variant', { ...prompt, variantIndex: activeTab - 1, variantData: variant });
                              }
                          }
                      }} className={`flex items-center gap-1 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 font-bold rounded-lg transition-colors border border-amber-100 ${isMobile ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'}`}>
                          <Edit3 size={isMobile ? 12 : 14}/> {activeTab === 0 ? '编辑' : '编辑变体'}
                      </button>
                      <button onClick={() => onLocalAction && onLocalAction('local-delete', prompt)} className={`flex items-center gap-1 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 font-bold rounded-lg transition-colors border border-rose-100 ${isMobile ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'}`}>
                          <Trash2 size={isMobile ? 12 : 14}/> 删除本地
                      </button>
                  </>
              ) : (
                  // 🟢 云端提示词：显示投稿按钮
                  <>
                      <button onClick={() => onSubmissionAction('variant', prompt)} className={`flex items-center gap-1 bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700 font-bold rounded-lg transition-colors border border-purple-100 ${isMobile ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'}`}>
                          <CopyPlus size={isMobile ? 12 : 14}/> 投稿变体
                      </button>
                      <button onClick={() => {
                          if (activeTab === 0) {
                              onSubmissionAction('edit', prompt);
                          } else {
                              const variant = prompt.similar?.[activeTab - 1];
                              if (variant) {
                                  onSubmissionAction('edit-variant', { ...prompt, variantIndex: activeTab - 1, variantData: variant });
                              }
                          }
                      }} className={`flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 font-bold rounded-lg transition-colors border border-blue-100 ${isMobile ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'}`}>
                          <Edit3 size={isMobile ? 12 : 14}/> {activeTab === 0 ? '修改投稿' : '修改变体'}
                      </button>
                  </>
              )}
          </div>
      </div>

      {/* 投稿人 */}
      {currentContributor && (<div className={`flex items-center gap-2 text-indigo-600 bg-indigo-50 rounded-lg font-bold ${isMobile ? 'text-xs px-2 py-1.5' : 'text-sm px-3 py-2'}`}><Smile size={isMobile ? 14 : 16} /><span>投稿人：{currentContributor}</span></div>)}
      
      {/* Prompt 内容 - 当无备注时自动扩展高度 */}
      <div className={currentNotes ? '' : 'flex-1 flex flex-col'}>
          <div className={`font-bold text-slate-400 mb-2 tracking-wider flex items-center gap-1 ${isMobile ? 'text-[10px]' : 'text-xs'}`}><FileText size={isMobile ? 10 : 12}/> PROMPT CONTENT</div>
          <div className={`bg-slate-50 rounded-2xl font-mono border border-slate-200 select-all text-slate-700 leading-relaxed shadow-sm whitespace-pre-wrap overflow-y-auto custom-scrollbar ${isMobile ? 'p-3 text-xs' : 'p-4 text-sm'} ${currentNotes ? (isMobile ? 'max-h-[150px]' : 'max-h-[200px]') : (isMobile ? 'flex-1 min-h-[100px] max-h-[250px]' : 'flex-1 min-h-[150px] max-h-[400px]')}`}>{currentContent}</div>
      </div>

      {/* 🟢 作者备注区域 */}
      {currentNotes && (
        <div>
            <div className={`font-bold text-amber-500 mb-2 tracking-wider flex items-center gap-1 ${isMobile ? 'text-[10px]' : 'text-xs'}`}><MessageSquare size={isMobile ? 10 : 12}/> 作者备注</div>
            <div className={`bg-amber-50 rounded-xl font-sans border border-amber-200 text-amber-800 leading-relaxed shadow-sm whitespace-pre-wrap overflow-y-auto custom-scrollbar ${isMobile ? 'p-2 text-xs max-h-[80px]' : 'p-3 text-sm max-h-[100px]'}`}>{currentNotes}</div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`space-y-4 ${isMobile ? 'space-y-3' : ''}`}>
      {/* 变体切换标签 */}
      {prompt.similar && prompt.similar.length > 0 && (
          <div className={`flex overflow-x-auto pb-2 no-scrollbar border-b border-slate-100 ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
              <button onClick={() => setActiveTab(0)} className={`rounded-full font-bold transition-all whitespace-nowrap ${isMobile ? 'px-3 py-1 text-[10px]' : 'px-4 py-1.5 text-xs'} ${activeTab === 0 ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>主提示词</button>
              {prompt.similar.map((_, i) => (
                  <button key={i} onClick={() => setActiveTab(i + 1)} className={`rounded-full font-bold transition-all whitespace-nowrap ${isMobile ? 'px-3 py-1 text-[10px]' : 'px-4 py-1.5 text-xs'} ${activeTab === i + 1 ? 'bg-purple-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>变体 {i + 1}</button>
              ))}
          </div>
      )}

      {/* 🟢 根据图片方向选择布局 */}
      {useSideLayout ? (
        // 左右布局：图片在左，内容在右
        <div className="flex gap-6" style={{ minHeight: 'var(--adaptive-image-max-height, 400px)' }}>
          <div className="flex-shrink-0" style={{ width: 'var(--adaptive-image-width, 45%)' }}>
            <ImageSection />
          </div>
          <ContentSection />
        </div>
      ) : (
        // 上下布局：传统布局
        <>
          <ImageSection />
          <ContentSection />
        </>
      )}
    </div>
  );
});

// --- 7. 管理员待审核界面组件 ---
const PendingSubmissionsPanel = ({ sections, onApprove, onReject, onEdit, onViewSubmission, refreshKey }) => {
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSubmissions = async () => {
    setIsLoading(true);
    const result = await getPendingSubmissions();
    if (result.success) {
      setSubmissions(result.data);
    } else {
      alert("加载失败: " + result.error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadSubmissions();
  }, [refreshKey]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-slate-500">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-700 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-orange-500" />
          待处理投稿 ({submissions.length})
        </h3>
        <button onClick={loadSubmissions} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Archive className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>暂无待处理投稿</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              onClick={() => onViewSubmission(sub)}
              className="group relative bg-white rounded-2xl overflow-hidden border-2 border-slate-200 hover:border-indigo-400 transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1"
            >
              <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden">
                {sub.images && sub.images.length > 0 ? (
                  <img src={getOptimizedUrl(sub.images[0], 300)} className="w-full h-full object-cover" alt={sub.title} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-slate-300" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-bold shadow-lg ${
                    sub.action === 'create' ? 'bg-green-500 text-white' :
                    sub.action === 'edit' ? 'bg-blue-500 text-white' :
                    'bg-purple-500 text-white'
                  }`}>
                    {sub.action === 'create' ? '新建' : sub.action === 'edit' ? '修改' : '变体'}
                  </span>
                </div>
              </div>
              <div className="p-3">
                <h4 className="font-bold text-sm text-slate-800 truncate mb-1">{sub.title || "未命名"}</h4>
                <div className="flex items-center text-xs text-slate-500">
                  <User size={10} className="mr-1" />
                  <span className="truncate">{sub.contributor}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- 8. 管理员表单组件 (修复版 + 作者备注支持) ---
function PromptForm({ initialData, commonTags, setCommonTags, onSave, onDelete }) {
   const getInitialImages = () => { if (initialData?.images && initialData.images.length > 0) return initialData.images; if (initialData?.image) return [initialData.image]; return []; };
   const [formData, setFormData] = useState({ id: initialData?.id || '', title: initialData?.title || '', tags: initialData?.tags || [], contributor: initialData?.contributor || '', content: initialData?.content || '', notes: initialData?.notes || '', images: getInitialImages(), similar: initialData?.similar || [] });
   const [activeTab, setActiveTab] = useState(0);
   const [tagInput, setTagInput] = useState('');
   const [isCompressing, setIsCompressing] = useState(false);
   const [urlInput, setUrlInput] = useState('');
   const [isDragOver, setIsDragOver] = useState(false);
   
   const currentContent = useMemo(() => { if (activeTab === 0) return formData.content; return formData.similar[activeTab - 1]?.content || ""; }, [formData, activeTab]);
   
   // 🔴 修复：获取当前Tab的投稿人
   const currentContributor = useMemo(() => { if (activeTab === 0) return formData.contributor; return formData.similar[activeTab - 1]?.contributor || ""; }, [formData, activeTab]);

   // 🟢 新增：获取当前Tab的作者备注
   const currentNotes = useMemo(() => { if (activeTab === 0) return formData.notes || ''; return formData.similar[activeTab - 1]?.notes || ""; }, [formData, activeTab]);

   const updateContent = (val) => { setFormData(prev => { if (activeTab === 0) return { ...prev, content: val }; const newSimilar = [...prev.similar]; if (!newSimilar[activeTab - 1]) newSimilar[activeTab - 1] = { content: '' }; newSimilar[activeTab - 1].content = val; return { ...prev, similar: newSimilar }; }); };
   
   // 🔴 修复：更新当前Tab的投稿人
   const updateContributor = (val) => { setFormData(prev => { if (activeTab === 0) return { ...prev, contributor: val }; const newSimilar = [...prev.similar]; if (!newSimilar[activeTab - 1]) newSimilar[activeTab - 1] = { content: '', contributor: '' }; newSimilar[activeTab - 1] = { ...newSimilar[activeTab - 1], contributor: val }; return { ...prev, similar: newSimilar }; }); };

   // 🟢 新增：更新当前Tab的作者备注
   const updateNotes = (val) => { setFormData(prev => { if (activeTab === 0) return { ...prev, notes: val }; const newSimilar = [...prev.similar]; if (!newSimilar[activeTab - 1]) newSimilar[activeTab - 1] = { content: '', notes: '' }; newSimilar[activeTab - 1] = { ...newSimilar[activeTab - 1], notes: val }; return { ...prev, similar: newSimilar }; }); };

   const addSimilarPage = () => { setFormData(prev => ({ ...prev, similar: [...prev.similar, { content: '' }] })); setActiveTab(formData.similar.length + 1); };
   const removeSimilarPage = (index) => { if(!confirm("确定删除此变体页面？")) return; setFormData(prev => ({ ...prev, similar: prev.similar.filter((_, i) => i !== index) })); setActiveTab(0); };
   const processFiles = async (files) => { if (!files || files.length === 0) return; setIsCompressing(true); for (let i = 0; i < files.length; i++) { const file = files[i]; try { const fullBase64 = await compressImage(file); const base64Data = fullBase64.split(',')[1]; try { const res = await fetch('/api/catbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: base64Data }) }); const json = await res.json(); if (json.success) { setFormData(prev => ({ ...prev, images: [...prev.images, json.url] })); continue; } } catch(e) {} const formData = new FormData(); formData.append('image', base64Data); const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData }); const json = await res.json(); if(json.success) setFormData(prev => ({ ...prev, images: [...prev.images, json.data.url] })); else alert("上传失败"); } catch (err) { alert("网络错误"); } } setIsCompressing(false); };
   const handleFileSelect = (e) => processFiles(e.target.files);
   const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
   const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); };
   const handleDrop = (e) => { e.preventDefault(); setIsDragOver(false); processFiles(e.dataTransfer.files); };
   const handleAddUrl = () => { if (!urlInput.trim()) return; setFormData(prev => ({ ...prev, images: [...prev.images, urlInput.trim()] })); setUrlInput(''); };
   const removeImage = (idxToRemove) => { setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idxToRemove) })); };
   const removeCommonTag = (t) => { if(confirm(`删除标签 "${t}"?`)) setCommonTags(p => p.filter(x => x !== t)); };
   
   return ( <div className="space-y-6"><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-400 block mb-1">标题</label><input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none focus:border-indigo-500 text-sm" /></div><div><label className="text-xs font-bold text-slate-400 block mb-1">投稿人 ({activeTab===0 ? '主' : `变体 ${activeTab}`})</label><input value={currentContributor} onChange={e => updateContributor(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none focus:border-indigo-500 text-sm" /></div></div><div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100"><button onClick={() => setActiveTab(0)} className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab===0 ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>主页面</button>{formData.similar.map((_, idx) => (<div key={idx} className="relative group"><button onClick={() => setActiveTab(idx + 1)} className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab===idx+1 ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-500'}`}>变体 {idx + 1}</button><button onClick={(e) => { e.stopPropagation(); removeSimilarPage(idx); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X size={8}/></button></div>))}<button onClick={addSimilarPage} className="px-2 py-1 rounded-lg bg-slate-100 text-slate-400 hover:bg-green-100 hover:text-green-600 transition-all"><Plus size={14}/></button></div><div><label className="text-xs font-bold text-slate-400 block mb-2 uppercase tracking-wide">提示词 ({activeTab===0 ? '主' : `变体 ${activeTab}`})</label><textarea value={currentContent} onChange={e => updateContent(e.target.value)} rows={5} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-mono text-sm outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all" /></div><div><label className="text-xs font-bold text-amber-500 block mb-2 uppercase tracking-wide flex items-center gap-1"><MessageSquare size={12}/> 作者备注 ({activeTab===0 ? '主' : `变体 ${activeTab}`})</label><textarea value={currentNotes} onChange={e => updateNotes(e.target.value)} rows={2} className="w-full bg-amber-50 border border-amber-200 p-3 rounded-xl text-sm outline-none focus:bg-amber-100 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 transition-all" placeholder="添加备注说明、使用技巧等..." /></div><div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`rounded-xl border-2 border-dashed p-2 transition-all ${isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-indigo-200 hover:border-indigo-400'}`}><label className="text-xs font-bold text-slate-400 block mb-2 uppercase tracking-wide">配图 ({formData.images.length}) - 全局共享</label><div className="flex flex-col gap-4"><div className="grid grid-cols-3 gap-3">{formData.images.map((img, idx) => (<div key={idx} className="relative aspect-square bg-slate-50 rounded-xl overflow-hidden border border-slate-200 group shadow-sm"><img src={getOptimizedUrl(img, 200)} className="w-full h-full object-cover" /><button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-md"><X size={14} /></button></div>))}<label className={`aspect-square bg-white hover:bg-indigo-50 text-indigo-400 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1 transition-all border-2 border-dashed border-indigo-200 hover:border-indigo-400 ${isCompressing ? 'opacity-50' : ''}`}>{isCompressing ? <RefreshCw className="animate-spin" size={20}/> : <Plus size={24} />}<span className="text-[10px] font-bold">{isCompressing ? '处理中' : '添加/拖入'}</span><input type="file" className="hidden" accept="image/*" disabled={isCompressing} multiple onChange={handleFileSelect} /></label></div><div className="flex gap-2 items-center"><div className="flex-1 relative"><LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" /><input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()} placeholder="粘贴图片链接" className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"/></div><button onClick={handleAddUrl} disabled={!urlInput.trim()} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl hover:bg-indigo-100 hover:text-indigo-600 disabled:opacity-50 disabled:hover:bg-slate-100 disabled:hover:text-slate-600 transition-colors">添加链接</button></div></div></div><div><label className="text-xs font-bold text-slate-400 block mb-2 uppercase tracking-wide">标签</label><div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">{commonTags.map(t => (<span key={t} className={`group inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all font-medium cursor-pointer border ${formData.tags.includes(t)?'bg-indigo-500 text-white shadow-md border-indigo-500':'bg-white text-slate-600 border-slate-200 hover:bg-white/80'}`}><span onClick={() => setFormData(p => ({...p, tags: p.tags.includes(t)?p.tags.filter(x=>x!==t):[...p.tags, t]}))}>{t}</span><button type="button" onClick={(e) => { e.stopPropagation(); removeCommonTag(t); }} className={`p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white ${formData.tags.includes(t) ? 'text-indigo-200' : 'text-slate-400'}`}><X size={10} /></button></span>))}<input value={tagInput} onChange={e=>setTagInput(e.target.value)} placeholder="+新建" className="w-24 text-xs bg-transparent border-b-2 border-slate-200 outline-none focus:border-indigo-500 px-2 py-1 transition-colors" onKeyDown={e=>{if(e.key==='Enter'&&tagInput){setCommonTags([...commonTags, tagInput]); setTagInput('');}}}/></div></div><div className="flex justify-between pt-6 mt-2 border-t border-slate-100">{initialData && initialData.id && <button onClick={() => onDelete(initialData.id)} className="text-red-500 text-sm font-medium hover:bg-red-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"><Trash2 size={16}/> 删除</button>}<button disabled={isCompressing} onClick={() => { if(!formData.title) return alert("标题必填"); onSave(formData); }} className={`bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold ml-auto hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 ${isCompressing ? 'opacity-50' : ''}`}><Check size={18} /> 保存盒子</button></div></div>);
}

// 🟢 管理员移动提示词到其他分区的弹窗组件
const MoveToSectionModal = ({ prompt, sections, currentSectionId, onMove, onClose }) => {
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/50" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center">
            <FolderOutput className="w-5 h-5 mr-2 text-indigo-500"/> 移动到其他分区
          </h3>
          <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">将 <span className="font-bold text-slate-700">"{prompt.title}"</span> 移动到：</p>
        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar space-y-2">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setSelectedSectionId(section.id)}
              disabled={section.id === currentSectionId}
              className={`w-full text-left px-4 py-3 rounded-xl transition-colors font-medium text-sm flex items-center justify-between group ${
                section.id === currentSectionId
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : selectedSectionId === section.id
                    ? 'bg-indigo-500 text-white shadow-md'
                    : 'bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600'
              }`}
            >
              <span className="flex items-center gap-2">
                {section.title}
                {section.id === currentSectionId && <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">当前</span>}
              </span>
              <span className={`text-xs ${selectedSectionId === section.id ? 'text-indigo-200' : 'text-slate-400 group-hover:text-indigo-400'}`}>
                {section.prompts.length} 个
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm">取消</button>
          <button
            onClick={() => { if(selectedSectionId) { onMove(prompt.id, currentSectionId, selectedSectionId); onClose(); } }}
            disabled={!selectedSectionId}
            className="flex-1 py-2.5 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-1"
          >
            <FolderOutput size={14}/> 确认移动
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 8. 主程序入口 ---

const INITIAL_TAGS = ["示例标签"];
const INITIAL_SECTIONS = [{ id: 'demo', title: '默认分区', isCollapsed: false, prompts: [] }];
const INITIAL_NOTES = "欢迎来到大香蕉提示词收纳盒！\n在这里记录你的灵感。";
const ITEMS_PER_PAGE = 24;

export default function App() {
  const [currentView, setCurrentView] = useState('PROMPTS'); 
  const [isAdmin, setIsAdmin] = useState(false); 
  const [clickCount, setClickCount] = useState(0);
  const [storageError, setStorageError] = useState(false);
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [commonTags, setCommonTags] = useState(INITIAL_TAGS);
  const [siteNotes, setSiteNotes] = useState(INITIAL_NOTES); 
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isNotesEditing, setIsNotesEditing] = useState(false);
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false); 
  const [isImportModalOpen, setIsImportModalOpen] = useState(false); 
  const [pendingImportPrompt, setPendingImportPrompt] = useState(null); 
  
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [targetSectionId, setTargetSectionId] = useState(null);
  const [pendingRestrictedSectionId, setPendingRestrictedSectionId] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // 🔴 标记当前查看的提示词是否来自本地收藏
  const [isViewingFavorite, setIsViewingFavorite] = useState(false);
  // 🔴 标记是否正在编辑本地收藏（显示 PromptForm 而非 PromptViewer）
  const [isLocalEditing, setIsLocalEditing] = useState(false);
  const [isPendingPanelOpen, setIsPendingPanelOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320); 
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const sidebarRef = useRef(null);

  // 🔴 投稿相关状态 (Submission State)
  const [submissionMode, setSubmissionMode] = useState('create'); // 'create', 'edit', 'variant'
  const [submissionTarget, setSubmissionTarget] = useState(null);
  
  // 🔴 待审核弹窗状态
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [pendingRefreshKey, setPendingRefreshKey] = useState(0);
  const [reviewImageUrlInput, setReviewImageUrlInput] = useState('');
  const [isReviewImageUploading, setIsReviewImageUploading] = useState(false);
  const [isReviewImageDragOver, setIsReviewImageDragOver] = useState(false);
  const [reviewDraggingImageIndex, setReviewDraggingImageIndex] = useState(null);
  const [rejectedSubmissions, setRejectedSubmissions] = useState([]);
  const [isRejectedBinOpen, setIsRejectedBinOpen] = useState(false);
  const [isRejectedBinLoading, setIsRejectedBinLoading] = useState(false);

  // 🔴 用户认证状态
  const [currentUser, setCurrentUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // 🔴 NEW! 区折叠状态（默认折叠）
  const [isNewSectionCollapsed, setIsNewSectionCollapsed] = useState(true);
  
  // 🟢 软删除：存储已删除的提示词（保留一周）
  const [deletedPrompts, setDeletedPrompts] = useState([]);
  
  // 🟢 移动提示词弹窗状态
  const [moveModalData, setMoveModalData] = useState(null); // { prompt, currentSectionId }
  
  // 🟢 回收站弹窗状态
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
  
  // 🟢 回顶按钮状态
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollingUp, setScrollingUp] = useState(false);
  
  // 🟢 子区跳转下拉菜单状态
  const [isSectionNavOpen, setIsSectionNavOpen] = useState(false);
  const sectionNavRef = useRef(null);
  
  // 🟢 搜索历史记录
  const [searchHistory, setSearchHistory] = useState([]);
  const [isSearchHistoryOpen, setIsSearchHistoryOpen] = useState(false);
  const [searchMode, setSearchMode] = useState('content'); // content | title | author
  const searchInputRef = useRef(null);

  // 🟢 自适应弹窗：获取 editingPrompt 的第一张图片 URL
  const editingPromptFirstImage = useMemo(() => {
    if (!editingPrompt) return null;
    const images = Array.isArray(editingPrompt.images) && editingPrompt.images.length > 0
      ? editingPrompt.images
      : (editingPrompt.image ? [editingPrompt.image] : []);
    return images.length > 0 ? images[0] : null;
  }, [editingPrompt]);

  // 🟢 自适应弹窗：检测第一张图片的尺寸
  const { orientation: imageOrientation, aspectRatio: imageAspectRatio, isLoading: isImageLoading } = useImageDimensions(editingPromptFirstImage);

  // 🟢 自适应弹窗：计算弹窗样式
  const adaptiveModalStyle = useMemo(() => {
    if (!editingPromptFirstImage || isImageLoading) {
      return { maxWidth: '768px' }; // 默认 max-w-3xl
    }
    return getAdaptiveModalStyle(imageOrientation, imageAspectRatio);
  }, [editingPromptFirstImage, imageOrientation, imageAspectRatio, isImageLoading]);

  const [lastVisit, setLastVisit] = useState(() => {
      const storedLastVisit = localStorage.getItem('nanobanana_last_visit');
      if (storedLastVisit) return parseInt(storedLastVisit, 10);
      return Date.now();
  });

  useEffect(() => {
    localStorage.setItem('nanobanana_last_visit', Date.now().toString());
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) setVisibleCount(prev => prev + ITEMS_PER_PAGE);
      
      // 🟢 回顶按钮逻辑：向上滚动时显示
      const currentScrollY = window.scrollY;
      if (currentScrollY < lastScrollY && currentScrollY > 200) {
        setScrollingUp(true);
        setShowBackToTop(true);
      } else if (currentScrollY > lastScrollY) {
        setScrollingUp(false);
        // 延迟隐藏，给用户反应时间
        setTimeout(() => {
          if (!scrollingUp) setShowBackToTop(false);
        }, 1000);
      }
      if (currentScrollY <= 100) {
        setShowBackToTop(false);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, scrollingUp]);

  // 🟢 回顶功能
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowBackToTop(false);
  }, []);

  // 🟢 点击子区导航外部关闭
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sectionNavRef.current && !sectionNavRef.current.contains(e.target)) {
        setIsSectionNavOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🟢 加载搜索历史
  useEffect(() => {
    const storedHistory = localStorage.getItem('nanobanana_search_history');
    if (storedHistory) {
      setSearchHistory(JSON.parse(storedHistory));
    }
  }, []);

  // 🟢 保存搜索历史
  const saveSearchHistory = useCallback((query) => {
    if (!query.trim()) return;
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h !== query.trim());
      const newHistory = [query.trim(), ...filtered].slice(0, 5);
      localStorage.setItem('nanobanana_search_history', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  // 🟢 删除单条搜索历史
  const removeSearchHistory = useCallback((query) => {
    setSearchHistory(prev => {
      const newHistory = prev.filter(h => h !== query);
      localStorage.setItem('nanobanana_search_history', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  // 🟢 跳转到指定分区
  const scrollToSection = useCallback((sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    
    // 如果是猎奇区且非管理员，弹出警告
    if (section.isRestricted && !isAdmin) {
      setPendingRestrictedSectionId(sectionId);
      setIsSectionNavOpen(false);
      return;
    }
    
    // 如果折叠了，先展开
    if (section.isCollapsed) {
      setSections(prev => prev.map(s => s.id === sectionId ? { ...s, isCollapsed: false } : s));
    }
    
    // 延迟滚动以等待DOM更新
    setTimeout(() => {
      const element = document.getElementById(`section-${sectionId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    
    setIsSectionNavOpen(false);
  }, [sections, isAdmin]);

  useEffect(() => {
    const localSections = localStorage.getItem('nanobanana_sections');
    const localTags = localStorage.getItem('nanobanana_tags');
    const localNotes = localStorage.getItem('nanobanana_notes');
    const localFavorites = localStorage.getItem('nanobanana_favorites');
    if (localSections) { 
        const parsed = JSON.parse(localSections);
        const initializedSections = parsed.map(s => ({ ...s, isCollapsed: (s.isRestricted || s.defaultCollapsed) ? true : s.isCollapsed }));
        setSections(initializedSections); 
        if (localTags) setCommonTags(JSON.parse(localTags)); 
        if (localNotes) setSiteNotes(JSON.parse(localNotes)); 
    } else if (DATA_SOURCE_URL && DATA_SOURCE_URL.includes("http")) fetchCloudData(false); 
    if (localFavorites) setFavorites(JSON.parse(localFavorites));
    
    // 🟢 加载软删除数据并清理超过一周的
    const localDeleted = localStorage.getItem('nanobanana_deleted');
    if (localDeleted) {
      const parsed = JSON.parse(localDeleted);
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const validDeleted = parsed.filter(item => item.deletedAt > oneWeekAgo);
      setDeletedPrompts(validDeleted);
      // 如果有过期的，更新存储
      if (validDeleted.length !== parsed.length) {
        localStorage.setItem('nanobanana_deleted', JSON.stringify(validDeleted));
      }
    }
  }, []);

  // 🔴 Firebase Authentication 监听器
  useEffect(() => {
    const unsubscribe = onAuthChange((user, isAdminUser) => {
      setCurrentUser(user);
      if (isAdminUser) {
        setIsAdmin(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      try {
        localStorage.setItem('nanobanana_sections', JSON.stringify(sections));
        localStorage.setItem('nanobanana_tags', JSON.stringify(commonTags));
        localStorage.setItem('nanobanana_notes', JSON.stringify(siteNotes));
        setStorageError(false);
      } catch (e) { if (e.name === 'QuotaExceededError') setStorageError(true); }
    }
    localStorage.setItem('nanobanana_favorites', JSON.stringify(favorites));
    // 🟢 保存软删除数据
    localStorage.setItem('nanobanana_deleted', JSON.stringify(deletedPrompts));
  }, [sections, commonTags, siteNotes, isAdmin, favorites, deletedPrompts]);

  // 🔴 打开投稿窗口的处理函数
  const openSubmissionModal = useCallback((mode = 'create', data = null) => {
      setSubmissionMode(mode);
      setSubmissionTarget(data);
      setIsSubmissionOpen(true);
      setIsPromptModalOpen(false); 
  }, []);

  // 🔴 通过 ID 或标题查找原提示词
  const findPromptByIdOrTitle = useCallback((targetId, originalTitle) => {
    for (const section of sections) {
      // 先按 ID 查找
      const byId = section.prompts.find(p => p.id === targetId);
      if (byId) return { prompt: byId, section };
      
      // 如果 ID 找不到，尝试按标题查找
      if (originalTitle) {
        const byTitle = section.prompts.find(p => p.title === originalTitle);
        if (byTitle) return { prompt: byTitle, section };
      }
    }
    return null;
  }, [sections]);

  const applySubmissionToPrompt = useCallback((basePrompt, submission) => {
    const submissionImages = Array.isArray(submission.images) ? submission.images : [];
    const submissionTags = Array.isArray(submission.tags) ? submission.tags : [];
    const mergedBase = {
      ...basePrompt,
      images: Array.isArray(basePrompt.images) ? basePrompt.images : [],
      tags: Array.isArray(basePrompt.tags) ? basePrompt.tags : [],
      similar: Array.isArray(basePrompt.similar) ? basePrompt.similar : []
    };

    if (submission.action === 'edit') {
      return {
        ...mergedBase,
        title: submission.title || mergedBase.title,
        content: submission.content || mergedBase.content || "",
        images: submissionImages.length > 0 ? submissionImages : mergedBase.images,
        tags: submissionTags.length > 0 ? submissionTags : mergedBase.tags,
        contributor: submission.contributor || mergedBase.contributor || "匿名",
        notes: submission.notes ?? mergedBase.notes ?? ""
      };
    }

    if (submission.action === 'variant' || submission.action === 'edit-variant') {
      const mainImages = mergedBase.images;
      const variantImages = submissionImages.filter(img => !mainImages.includes(img));
      const newVariant = {
        content: submission.content || "",
        contributor: submission.contributor || "匿名",
        notes: submission.notes || "",
        ...(variantImages.length > 0 ? { images: variantImages } : {})
      };
      const updatedSimilar = [...mergedBase.similar];
      if (
        submission.action === 'edit-variant' &&
        submission.variantIndex !== null &&
        submission.variantIndex !== undefined &&
        updatedSimilar[submission.variantIndex]
      ) {
        updatedSimilar[submission.variantIndex] = newVariant;
      } else {
        updatedSimilar.push(newVariant);
      }
      return { ...mergedBase, similar: updatedSimilar };
    }

    return {
      id: `local-sub-${Date.now()}`,
      title: submission.title || "未命名提示词",
      content: submission.content || "",
      images: submissionImages,
      tags: submissionTags,
      contributor: submission.contributor || "匿名",
      notes: submission.notes || "",
      similar: []
    };
  }, []);

  const handleLocalSubmissionSuccess = useCallback((submissionData, sourcePrompt = null) => {
    const localId = `local-sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    let localPrompt;
    if (submissionData.action === 'create') {
      localPrompt = {
        id: localId,
        title: submissionData.title || "未命名提示词",
        content: submissionData.content || "",
        images: Array.isArray(submissionData.images) ? submissionData.images : [],
        tags: Array.isArray(submissionData.tags) ? submissionData.tags : [],
        contributor: submissionData.contributor || "匿名",
        notes: submissionData.notes || "",
        similar: []
      };
    } else {
      const fallbackPrompt = {
        id: localId,
        title: submissionData.originalTitle || submissionData.title || "未命名提示词",
        content: "",
        images: [],
        tags: [],
        similar: []
      };
      const basePrompt = sourcePrompt || fallbackPrompt;
      localPrompt = applySubmissionToPrompt(basePrompt, submissionData);
      localPrompt.id = localId;
    }

    const finalLocalPrompt = {
      ...localPrompt,
      _localSubmission: true
    };

    setFavorites(prev => {
      const existingIndex = prev.findIndex(item => item.id === finalLocalPrompt.id);
      if (existingIndex === -1) {
        return [finalLocalPrompt, ...prev];
      }
      const next = [...prev];
      next[existingIndex] = { ...next[existingIndex], ...finalLocalPrompt };
      return next;
    });

    if (!isSidebarOpen) setIsSidebarOpen(true);
  }, [applySubmissionToPrompt, isSidebarOpen]);

  // 🔴 处理批准投稿
  const handleApproveSubmission = useCallback((submission, sectionId) => {
    const newPrompt = {
      id: `u-${Date.now()}`,
      title: submission.title,
      content: submission.content,
      images: submission.images || [],
      tags: submission.tags || [],
      contributor: submission.contributor || "匿名",
      notes: submission.notes || ""
    };

    if (submission.action === 'create') {
      // 新建投稿：添加到指定分区
      setSections(prev => prev.map(sec => {
        if (sec.id === sectionId) {
          return { ...sec, prompts: [newPrompt, ...sec.prompts] };
        }
        return sec;
      }));
      alert("✅ 投稿已批准并添加到分区！");
    } else if (submission.action === 'edit' && submission.targetId) {
      // 🔴 修复：修改投稿时保持原 ID 不变，只更新内容
      // 先查找原提示词
      const found = findPromptByIdOrTitle(submission.targetId, submission.originalTitle);
      
      if (!found) {
        alert("❌ 未找到原提示词，请手动选择目标分区后作为新建处理");
        // 作为新建处理
        setSections(prev => prev.map(sec => {
          if (sec.id === sectionId) {
            return { ...sec, prompts: [newPrompt, ...sec.prompts] };
          }
          return sec;
        }));
        return;
      }
      
      const originalId = found.prompt.id; // 保留原 ID
      const originalSectionId = found.section.id;
      
      setSections(prev => {
        // 如果目标分区与原分区相同，直接原地更新
        if (sectionId === originalSectionId) {
          return prev.map(sec => {
            if (sec.id === sectionId) {
              return {
                ...sec,
                prompts: sec.prompts.map(p => {
                  if (p.id === originalId) {
                    // 🔴 关键修复：保持原 ID 不变
                    return {
                      ...p,
                      title: submission.title,
                      content: submission.content,
                      images: submission.images || p.images,
                      tags: submission.tags || p.tags,
                      contributor: submission.contributor || p.contributor,
                      notes: submission.notes || p.notes
                    };
                  }
                  return p;
                })
              };
            }
            return sec;
          });
        } else {
          // 跨分区移动：从原分区移除，添加到目标分区（保持原 ID）
          const movedPrompt = {
            ...found.prompt,
            title: submission.title,
            content: submission.content,
            images: submission.images || found.prompt.images,
            tags: submission.tags || found.prompt.tags,
            contributor: submission.contributor || found.prompt.contributor,
            notes: submission.notes || found.prompt.notes
            // 🔴 ID 保持不变
          };
          
          return prev.map(sec => {
            if (sec.id === originalSectionId) {
              return { ...sec, prompts: sec.prompts.filter(p => p.id !== originalId) };
            }
            if (sec.id === sectionId) {
              return { ...sec, prompts: [movedPrompt, ...sec.prompts] };
            }
            return sec;
          });
        }
      });
      alert("✅ 修改已批准并更新！");
    } else if ((submission.action === 'variant' || submission.action === 'edit-variant') && submission.targetId) {
      // 🟢 变体投稿 & 修改变体：添加/更新原提示词的similar数组
      // 先查找原提示词
      const found = findPromptByIdOrTitle(submission.targetId, submission.originalTitle);
      
      if (!found) {
        alert("❌ 未找到原提示词！无法添加变体。请检查原提示词是否还存在。");
        return;
      }
      
      const originalId = found.prompt.id;
      
      setSections(prev => prev.map(sec => ({
        ...sec,
        prompts: sec.prompts.map(p => {
          if (p.id === originalId) {
            // 计算变体独有的图片（不包含主提示词的图片）
            const mainImages = p.images || [];
            const variantImages = (submission.images || []).filter(img => !mainImages.includes(img));
            
            const newVariant = {
              content: submission.content,
              contributor: submission.contributor,
              notes: submission.notes || '',
              // 🟢 只有当变体有新图片时才保存到变体的 images 字段
              ...(variantImages.length > 0 ? { images: variantImages } : {})
            };
            
            // 🔴 处理 edit-variant：更新已有变体
            if (submission.action === 'edit-variant' && submission.variantIndex !== null && submission.variantIndex !== undefined) {
              const updatedSimilar = [...(p.similar || [])];
              if (updatedSimilar[submission.variantIndex]) {
                updatedSimilar[submission.variantIndex] = newVariant;
              } else {
                // 如果索引不存在，作为新变体添加
                updatedSimilar.push(newVariant);
              }
              return { ...p, similar: updatedSimilar };
            }
            
            // 普通变体：追加
            return {
              ...p,
              similar: [...(p.similar || []), newVariant]
            };
          }
          return p;
        })
      })));
      alert(submission.action === 'edit-variant' ? "✅ 变体已更新！" : "✅ 变体已批准并添加！");
    }
  }, [findPromptByIdOrTitle]);

  // 🔴 处理编辑投稿（保持待处理分区打开）
  const handleEditSubmission = useCallback((submission) => {
    setEditingPrompt({
      id: submission.targetId || `u-${Date.now()}`,
      title: submission.title,
      content: submission.content,
      images: submission.images || [],
      tags: submission.tags || [],
      contributor: submission.contributor || "匿名",
      _submissionId: submission.id,
      _action: submission.action
    });
    setIsPromptModalOpen(true);
  }, []);

  // 🔴 查找原分区
  const findOriginalSection = useCallback((targetId) => {
    if (!targetId) return null;
    for (const section of sections) {
      const prompt = section.prompts.find(p => p.id === targetId);
      if (prompt) return section;
    }
    return null;
  }, [sections]);

  const uploadReviewImages = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    setIsReviewImageUploading(true);
    try {
      const uploadResults = await Promise.all(Array.from(files).map((file) => uploadImageToFirebase(file)));
      const validUrls = uploadResults.filter((item) => item && item.success && item.url).map((item) => item.url);
      if (validUrls.length > 0) {
        setViewingSubmission((prev) => ({
          ...prev,
          images: [...(Array.isArray(prev?.images) ? prev.images : []), ...validUrls]
        }));
      }
    } catch (error) {
      alert("❌ 图片上传失败");
    } finally {
      setIsReviewImageUploading(false);
    }
  }, []);

  const removeReviewImage = useCallback((idx) => {
    setViewingSubmission((prev) => ({
      ...prev,
      images: (Array.isArray(prev?.images) ? prev.images : []).filter((_, i) => i !== idx)
    }));
  }, []);

  const addReviewImageByUrl = useCallback(() => {
    const url = reviewImageUrlInput.trim();
    if (!url) return;
    setViewingSubmission((prev) => ({
      ...prev,
      images: [...(Array.isArray(prev?.images) ? prev.images : []), url]
    }));
    setReviewImageUrlInput('');
  }, [reviewImageUrlInput]);

  const loadRejectedSubmissions = useCallback(async () => {
    if (!isAdmin) return;
    setIsRejectedBinLoading(true);
    const result = await getPendingSubmissions('rejected');
    if (!result.success) {
      setIsRejectedBinLoading(false);
      return;
    }

    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const items = Array.isArray(result.data) ? result.data : [];

    const expired = items.filter((item) => {
      const base = item.processedAt || item.createdAt;
      const time = base ? new Date(base).getTime() : 0;
      return time > 0 && (now - time) > oneWeekMs;
    });

    if (expired.length > 0) {
      await Promise.all(expired.map((item) => deleteSubmissionForever(item.id)));
    }

    const valid = items.filter((item) => {
      const base = item.processedAt || item.createdAt;
      const time = base ? new Date(base).getTime() : 0;
      if (!time) return true;
      return (now - time) <= oneWeekMs;
    });

    setRejectedSubmissions(valid);
    setIsRejectedBinLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setRejectedSubmissions([]);
      setIsRejectedBinOpen(false);
      return;
    }
    loadRejectedSubmissions();
  }, [isAdmin, pendingRefreshKey, loadRejectedSubmissions]);

  // 🔴 处理批准投稿（带分区选择）
  const handleApproveWithSection = useCallback(async (submission, sectionId) => {
    const result = await setSubmissionStatus(submission.id, 'approved');
    if (!result.success) {
      alert("❌ 更新投稿状态失败: " + (result.error || "未知错误"));
      return;
    }
    handleApproveSubmission(submission, sectionId);
    setViewingSubmission(null);
    setSelectedSection(null);
    setPendingRefreshKey(prev => prev + 1);
  }, [handleApproveSubmission]);

  // 🔴 处理拒绝投稿
  const handleRejectSubmission = useCallback(async (submissionId) => {
    if (!confirm("确定拒绝此投稿？")) return;
    const result = await setSubmissionStatus(submissionId, 'rejected');
    if (!result.success) {
      alert("❌ 更新投稿状态失败: " + (result.error || "未知错误"));
      return;
    }
    setViewingSubmission(null);
    setPendingRefreshKey(prev => prev + 1);
  }, []);

  const handleRestoreRejectedSubmission = useCallback(async (submissionId) => {
    const result = await setSubmissionStatus(submissionId, 'pending');
    if (!result.success) {
      alert("❌ 恢复失败: " + (result.error || "未知错误"));
      return;
    }
    setRejectedSubmissions((prev) => prev.filter((item) => item.id !== submissionId));
    setPendingRefreshKey((prev) => prev + 1);
  }, []);

  const handleDeleteRejectedForever = useCallback(async (submissionId) => {
    if (!confirm("确定彻底删除该驳回投稿吗？此操作不可恢复。")) return;
    const result = await deleteSubmissionForever(submissionId);
    if (!result.success) {
      alert("❌ 删除失败: " + (result.error || "未知错误"));
      return;
    }
    setRejectedSubmissions((prev) => prev.filter((item) => item.id !== submissionId));
  }, []);

  // 🔴 处理登录
  const handleLogin = async () => {
    const result = await loginWithGoogle();
    if (result.success) {
      if (result.isAdmin) {
        alert("✅ 管理员登录成功！");
      } else {
        alert("❌ 您不是管理员账户");
        await logout();
      }
    } else {
      alert("登录失败: " + result.error);
    }
  };

  // 🔴 处理登出
  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      setIsAdmin(false);
      setCurrentUser(null);
      alert("✅ 已登出");
    }
  };

  // 🔴 同步到 GitHub
  const handleSyncToGitHub = async () => {
    if (!confirm("确定要同步当前数据到 GitHub 吗？")) return;
    
    setIsSyncing(true);
    try {
      const response = await fetch('/api/sync-github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sections,
          commonTags,
          siteNotes
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert("✅ 同步成功！数据已上传到 GitHub");
      } else {
        alert("❌ 同步失败: " + result.error);
      }
    } catch (error) {
      alert("❌ 同步失败: " + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // ... (GifMakerModule 省略相关代码，保持不变) ...
  // ... (Clipboard Import Logic 升级) ...

  const processImportText = (text) => {
       let jsonStr = text.trim();
       const bracketMatch = text.match(/【(.*?)】/s);
       if (bracketMatch) jsonStr = bracketMatch[1];
       jsonStr = jsonStr.replace(/&quot;/g, '"');
       try {
           const data = JSON.parse(jsonStr);
           
           // 🔴 智能导入逻辑 (Smart Import for Edit/Variant)
           if (data.action && data.targetId) {
               const newTimestamp = Date.now().toString(); // 强制更新时间戳以触发 NEW
               
               let targetFound = false;
               const updatedSections = sections.map(sec => ({
                   ...sec,
                   prompts: sec.prompts.map(p => {
                       if (p.id === data.targetId) {
                           targetFound = true;
                           // 核心修改逻辑
                           if (data.action === 'edit') {
                               // 修改模式：直接替换字段，并更新ID
                               return { ...p, ...data, id: newTimestamp, notes: data.notes || p.notes || '' };
                           } else if (data.action === 'variant') {
                               // 变体模式：添加到 similar，更新ID
                               // 🟢 计算变体独有的图片（不包含主提示词的图片）
                               const mainImages = p.images || [];
                               const variantImages = (data.images || []).filter(img => !mainImages.includes(img));
                               
                               const newVariant = {
                                   content: data.content,
                                   contributor: data.contributor,
                                   notes: data.notes || '',
                                   // 🟢 只有当变体有新图片时才保存到变体的 images 字段
                                   ...(variantImages.length > 0 ? { images: variantImages } : {})
                               };
                               
                               return {
                                   ...p,
                                   id: newTimestamp, // 更新时间戳
                                   similar: [...(p.similar || []), newVariant]
                               };
                           }
                       }
                       return p;
                   })
               }));

               if (targetFound) {
                   setSections(updatedSections);
                   alert(`✅ 成功处理：${data.action === 'edit' ? '修改原贴' : '新增变体'} (已标记为 NEW)`);
                   return; // 结束，不弹窗
               } else {
                   alert("⚠️ 未找到目标 ID，将作为新提示词导入。");
               }
           }

           // 常规导入逻辑
           if (!data.content && !data.title) throw new Error("无效数据");
           const newPrompt = {
              id: `imported-${Date.now()}`,
              title: data.title || "未命名提示词",
              content: data.content,
              images: Array.isArray(data.images) ? data.images : (data.image ? [data.image] : []),
              tags: Array.isArray(data.tags) ? data.tags : [],
              contributor: data.contributor || "",
              notes: data.notes || ""
           };
           setPendingImportPrompt(newPrompt);
           setIsImportModalOpen(true);
       } catch (e) { alert("无法识别 JSON 内容，请确保复制了正确的代码块。"); }
  };

  // ... (其余逻辑保持不变) ...
  
  // 🔴 侧边栏调整宽度逻辑
  useEffect(() => {
      const handleMouseMove = (e) => {
          if (!isResizingSidebar) return;
          const newWidth = window.innerWidth - e.clientX;
          if (newWidth > 200 && newWidth < window.innerWidth - 100) {
              setSidebarWidth(newWidth);
          }
      };
      const handleMouseUp = () => setIsResizingSidebar(false);
      if (isResizingSidebar) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); document.body.style.cursor = 'ew-resize'; document.body.style.userSelect = 'none'; } else { document.body.style.cursor = ''; document.body.style.userSelect = ''; }
      return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isResizingSidebar]);

  const fetchCloudData = async (force = true) => {
    if (force && !window.confirm("将强制从 GitHub 拉取最新数据并覆盖本地缓存，确定吗？")) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${DATA_SOURCE_URL}?t=${new Date().getTime()}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      const cleanSections = (d.sections || []).map(s => ({
        ...s,
        isCollapsed: (s.isRestricted || s.defaultCollapsed) ? true : s.isCollapsed,
        prompts: s.prompts.map(p => ({
          ...p,
          tags: Array.isArray(p.tags) ? p.tags : [],
          images: (Array.isArray(p.images) ? p.images : (p.image ? [p.image] : [])).filter(url => url.length < 5000)
        }))
      }));

      setSections(cleanSections);
      setCommonTags(d.commonTags || []);
      if (d.siteNotes) setSiteNotes(d.siteNotes);

      if (force) {
        try {
          localStorage.setItem('nanobanana_sections', JSON.stringify(cleanSections));
          localStorage.setItem('nanobanana_tags', JSON.stringify(d.commonTags || []));
          localStorage.setItem('nanobanana_notes', JSON.stringify(d.siteNotes || ""));
          alert("已强制从云端同步最新数据！");
        } catch (e) {
          alert("云端数据太大，无法存入本地缓存。");
        }
      }
    } catch (err) {
      if (force) alert("同步失败，请检查配置");
      setLoadError("离线模式");
    } finally {
      setIsLoading(false);
    }
  };
  // 🔴 修改 handleCardClick，添加第二个参数标记是否来自本地收藏
  const handleCardClick = useCallback((prompt, fromFavorite = false) => { setEditingPrompt(prompt); setIsViewingFavorite(fromFavorite); setIsPromptModalOpen(true); }, []);
  
  // 🔴 处理本地收藏的编辑/变体操作（不触发投稿）
  const handleLocalAction = useCallback((action, data) => {
    if (action === 'local-edit') {
      // 🟢 直接进入编辑模式，显示 PromptForm
      setEditingPrompt(data);
      setIsViewingFavorite(true);
      setIsLocalEditing(true); // 标记为本地编辑模式
    } else if (action === 'local-variant') {
      // 🟢 添加本地变体后进入编辑模式
      const newVariant = { content: '', contributor: '', notes: '' };
      const updatedPrompt = {
        ...data,
        similar: [...(data.similar || []), newVariant]
      };
      setFavorites(prev => prev.map(f => f.id === data.id ? updatedPrompt : f));
      setEditingPrompt(updatedPrompt);
      setIsViewingFavorite(true);
      setIsLocalEditing(true); // 进入编辑模式
    } else if (action === 'local-edit-variant') {
      // 🟢 编辑本地变体 - 直接进入编辑模式
      setEditingPrompt(data);
      setIsViewingFavorite(true);
      setIsLocalEditing(true); // 标记为本地编辑模式
    } else if (action === 'local-delete') {
      setFavorites(prev => prev.filter(f => f.id !== data.id));
      if (editingPrompt?.id === data.id) {
        setIsPromptModalOpen(false);
        setEditingPrompt(null);
        setIsViewingFavorite(false);
        setIsLocalEditing(false);
      }
      alert("已从本地收藏删除");
    }
  }, [editingPrompt]);
  // 🔴 修复：移除点击5次进入管理员模式的逻辑，只能通过 Google 登录进入管理员模式
  const handleModeToggle = () => {
    if (isAdmin) {
      // 退出管理员模式（保留此功能用于临时退出）
      setIsAdmin(false);
      setClickCount(0);
    }
    // 🔴 不再允许点击进入管理员模式，必须通过 Google 登录
  };
  
  // 🟢 处理移动提示词到其他分区
  const handleMovePrompt = useCallback((promptId, fromSectionId, toSectionId) => {
    setSections(prev => {
      const newSections = JSON.parse(JSON.stringify(prev));
      const fromSection = newSections.find(s => s.id === fromSectionId);
      const toSection = newSections.find(s => s.id === toSectionId);
      
      if (!fromSection || !toSection) return prev;
      
      const promptIndex = fromSection.prompts.findIndex(p => p.id === promptId);
      if (promptIndex === -1) return prev;
      
      const [movedPrompt] = fromSection.prompts.splice(promptIndex, 1);
      // 🟢 放到目标分区的第一个位置
      toSection.prompts.unshift(movedPrompt);
      
      return newSections;
    });
    alert("✅ 已移动到目标分区！");
  }, []);
  
  // 🟢 软删除：删除提示词时保留到回收站
  const handleSoftDelete = useCallback((promptId, sectionId) => {
    // 找到要删除的提示词
    let deletedPrompt = null;
    sections.forEach(sec => {
      if (sec.id === sectionId) {
        deletedPrompt = sec.prompts.find(p => p.id === promptId);
      }
    });
    
    if (deletedPrompt) {
      // 添加到软删除列表
      setDeletedPrompts(prev => [...prev, {
        ...deletedPrompt,
        deletedAt: Date.now(),
        fromSectionId: sectionId
      }]);
    }
    
    // 从分区中移除
    setSections(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return { ...sec, prompts: sec.prompts.filter(p => p.id !== promptId) };
      }
      return sec;
    }));
  }, [sections]);
  
  // 🟢 恢复软删除的提示词
  const handleRestoreDeleted = useCallback((deletedItem) => {
    const { deletedAt, fromSectionId, ...prompt } = deletedItem;
    
    // 恢复到原分区（如果存在）或第一个分区
    setSections(prev => {
      const targetSection = prev.find(s => s.id === fromSectionId) || prev[0];
      return prev.map(sec => {
        if (sec.id === targetSection.id) {
          return { ...sec, prompts: [prompt, ...sec.prompts] };
        }
        return sec;
      });
    });
    
    // 从软删除列表移除
    setDeletedPrompts(prev => prev.filter(item => item.id !== deletedItem.id));
    alert("✅ 已恢复！");
  }, []);
  const handleClipboardImport = async () => { try { const text = await navigator.clipboard.readText(); processImportText(text); } catch(e) { const manualInput = prompt("无法自动读取剪贴板。\n请在此手动粘贴 (Ctrl+V) 代码："); if (manualInput) processImportText(manualInput); } };
  const confirmImportToSection = (sectionId) => { if (!pendingImportPrompt) return; setSections(prev => prev.map(sec => { if (sec.id === sectionId) return { ...sec, prompts: [pendingImportPrompt, ...sec.prompts] }; return sec; })); setIsImportModalOpen(false); setPendingImportPrompt(null); alert(`成功导入到分区！`); };
  const handleSectionToggle = (section) => { if (section.isCollapsed && section.isRestricted && !isAdmin) { setPendingRestrictedSectionId(section.id); return; } setSections(prev => prev.map(s => s.id === section.id ? { ...s, isCollapsed: !s.isCollapsed } : s)); };
  const confirmRestrictedOpen = () => { if (pendingRestrictedSectionId) { setSections(prev => prev.map(s => s.id === pendingRestrictedSectionId ? { ...s, isCollapsed: false } : s)); setPendingRestrictedSectionId(null); } };
  const toggleFavorite = (prompt) => { setFavorites(prev => { const exists = prev.find(p => p.id === prompt.id); if (exists) return prev.filter(p => p.id !== prompt.id); return [prompt, ...prev]; }); if (!isSidebarOpen) setIsSidebarOpen(true); };
  const isFavorite = (promptId) => favorites.some(f => f.id === promptId);
  const isNewItem = useCallback((id) => { if (!id || typeof id !== 'string') return false; let timestamp = null; if (/^\d{13}$/.test(id)) { timestamp = parseInt(id, 10); } else if (id.startsWith('imported-')) { const part = id.split('-')[1]; if (/^\d{13}$/.test(part)) timestamp = parseInt(part, 10); } else if (id.startsWith('u-')) { const part = id.split('-')[1]; if (/^\d{13}$/.test(part)) timestamp = parseInt(part, 10); } if (timestamp && timestamp > lastVisit) { return true; } return false; }, [lastVisit]);
  const handleFavoriteDrop = (draggedId, targetId) => { const draggedIndex = favorites.findIndex(f => f.id === draggedId); const targetIndex = favorites.findIndex(f => f.id === targetId); if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return; const newFavorites = [...favorites]; const [removed] = newFavorites.splice(draggedIndex, 1); newFavorites.splice(targetIndex, 0, removed); setFavorites(newFavorites); };
  const filteredSections = useMemo(() => {
    return sections
      .map(section => ({
        ...section,
        prompts: section.prompts.filter(p => {
          const q = searchQuery.toLowerCase();
          const tags = Array.isArray(p.tags) ? p.tags : [];
          const titleText = (p.title || '').toLowerCase();
          const contentText = (Array.isArray(p.content) ? p.content.join(' ') : (p.content || '')).toLowerCase();
          const contributorText = (p.contributor || '').toLowerCase();

          let matchesSearch = true;
          if (q) {
            if (searchMode === 'author') {
              matchesSearch = contributorText.includes(q);
            } else if (searchMode === 'title') {
              matchesSearch = titleText.includes(q);
            } else {
              // 按内容搜索：实际匹配标题 + 内容
              matchesSearch = titleText.includes(q) || contentText.includes(q);
            }
          }

          const matchesTags = selectedTags.length === 0 || selectedTags.every(t => tags.includes(t));
          return matchesSearch && matchesTags;
        })
      }))
      .filter(section => section.prompts.length > 0 || (searchQuery === '' && selectedTags.length === 0));
  }, [sections, searchQuery, selectedTags, searchMode]);
  
  // 🔴 收集所有 NEW 提示词（排除重口/猎奇区）
  const newPrompts = useMemo(() => {
    const result = [];
    sections.forEach(section => {
      if (section.isRestricted) return; // 排除重口/猎奇区
      section.prompts.forEach(prompt => {
        if (isNewItem(prompt.id)) {
          result.push({ ...prompt, fromSection: section.title });
        }
      });
    });
    return result;
  }, [sections, isNewItem]);

  const handleDragStart = useCallback((e, type, item, sourceSecId = null) => { if (!isAdmin && type !== 'FAVORITE_ITEM') { e.preventDefault(); return; } setDraggedItem({ type, data: item, sourceSecId }); e.dataTransfer.effectAllowed = "move"; setTimeout(() => { if(e.target) e.target.style.opacity = '0.4'; }, 0); }, [isAdmin]);
  const handleDragEnd = useCallback((e) => { e.target.style.opacity = '1'; setDraggedItem(null); setDragOverTarget(null); }, []);
  const handleDragEnter = useCallback((e, targetId) => { e.preventDefault(); e.stopPropagation(); if ((draggedItem?.type === 'SECTION' && targetId.startsWith('sec-')) || draggedItem?.type === 'PROMPT' || draggedItem?.type === 'FAVORITE_ITEM') setDragOverTarget(targetId); }, [draggedItem]);
  const handleDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; const scrollThreshold = 100; const scrollSpeed = 15; if (e.clientY < scrollThreshold) { window.scrollBy(0, -scrollSpeed); } else if (window.innerHeight - e.clientY < scrollThreshold) { window.scrollBy(0, scrollSpeed); } }, []);
  const handleDrop = useCallback((e, targetId, targetType, targetSecId = null) => { e.preventDefault(); e.stopPropagation(); setDragOverTarget(null); if (!draggedItem) return; if (draggedItem.type === 'FAVORITE_ITEM' && targetType === 'FAVORITE_ITEM') { handleFavoriteDrop(draggedItem.data.id, targetId); return; } if (!isAdmin) return; setSections(prev => { const newSections = JSON.parse(JSON.stringify(prev)); if (draggedItem.type === 'SECTION' && targetType === 'SECTION') { const sIdx = newSections.findIndex(s => s.id === draggedItem.data.id); const tIdx = newSections.findIndex(s => s.id === targetId); if (sIdx !== -1 && tIdx !== -1 && sIdx !== tIdx) { const [moved] = newSections.splice(sIdx, 1); newSections.splice(tIdx, 0, moved); } } else if (draggedItem.type === 'PROMPT') { const sSec = newSections.find(s => s.id === draggedItem.sourceSecId); if (!sSec) return prev; const pIdx = sSec.prompts.findIndex(p => p.id === draggedItem.data.id); if (pIdx === -1) return prev; const [moved] = sSec.prompts.splice(pIdx, 1); if (targetType === 'PROMPT') { const tSec = newSections.find(s => s.id === targetSecId); const tPIdx = tSec.prompts.findIndex(p => p.id === targetId); tSec.prompts.splice(tPIdx, 0, moved); } else if (targetType === 'SECTION_AREA') { const tSec = newSections.find(s => s.id === targetId); tSec.prompts.push(moved); } } return newSections; }); }, [draggedItem, isAdmin, favorites]);
  // 🟢 修复：管理员新建投稿放在分区第一个（而非最后）
  const handleSavePrompt = useCallback((promptData) => {
    const newPrompt = { ...promptData, id: promptData.id || `u-${Date.now()}` };
    if (isAdmin) {
      setSections(prev => {
        if (editingPrompt && editingPrompt.id) {
          let found = false;
          const updated = prev.map(sec => ({
            ...sec,
            prompts: sec.prompts.map(p => {
              if (p.id === editingPrompt.id) {
                found = true;
                return newPrompt;
              }
              return p;
            })
          }));
          if (found) return updated;
        }
        const targetId = targetSectionId || prev[0].id;
        return prev.map(sec => {
          if (sec.id === targetId) {
            // 🟢 修复：新建时放到第一个位置
            return { ...sec, prompts: [newPrompt, ...sec.prompts] };
          }
          return sec;
        });
      });
    } else {
      setFavorites(prev => {
        const exists = prev.find(p => p.id === newPrompt.id);
        if (exists) return prev.map(p => p.id === newPrompt.id ? newPrompt : p);
        return [newPrompt, ...prev];
      });
      if (!isSidebarOpen) setIsSidebarOpen(true);
      if (isLocalEditing) {
        alert("本地收藏已更新！");
      } else {
        alert("创作成功！已保存到右侧收藏栏。");
      }
    }
    setIsPromptModalOpen(false);
    setEditingPrompt(null);
    setIsLocalEditing(false);
  }, [editingPrompt, targetSectionId, isAdmin, isSidebarOpen, isLocalEditing]);
  const handleExport = () => { const blob = new Blob([JSON.stringify({ sections, commonTags, siteNotes }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `data.json`; a.click(); };
  const handleImport = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => { try { const d = JSON.parse(ev.target.result); if(confirm("覆盖当前数据?")) { setSections(d.sections||[]); setCommonTags(d.commonTags||[]); if(d.siteNotes) setSiteNotes(d.siteNotes); } } catch(err){ alert("文件无效"); } }; reader.readAsText(file); } };
  const handleCreateSection = () => { setEditingSection({ title: '' }); setIsSectionModalOpen(true); };

  let renderedCount = 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-800 relative overflow-x-hidden">
      <AnimationStyles />
      <div className="fixed inset-0 z-0 pointer-events-none bg-[#f8fafc] static-gradient"></div>
      
      <div ref={sidebarRef} className={`fixed top-0 right-0 h-full bg-white/95 backdrop-blur-xl shadow-2xl z-40 transition-transform duration-300 ease-in-out flex flex-col border-l border-indigo-100 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ width: window.innerWidth < 768 ? '85%' : `${sidebarWidth}px` }} > <div className="hidden md:block absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-indigo-400/50 transition-colors z-50" onMouseDown={() => setIsResizingSidebar(true)}></div> <div className="p-4 border-b border-indigo-50 flex justify-between items-center bg-indigo-50/30"> <h3 className="font-bold text-slate-700 flex items-center"><Heart className="w-4 h-4 mr-2 text-pink-500 fill-pink-500"/> 我的收藏 ({favorites.length})</h3> <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><ChevronRight size={20} className="text-slate-400"/></button> </div> <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar"> {favorites.length === 0 ? ( <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm space-y-4"> <div className="p-4 bg-slate-50 rounded-full"><Heart size={32} className="text-slate-300"/></div> <p>点击卡片爱心收藏</p> <button onClick={() => { setEditingPrompt(null); setIsViewingFavorite(false); setIsPromptModalOpen(true); }} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors">新建一个</button> </div> ) : ( favorites.map((fav, index) => ( <div key={fav.id} draggable onDragStart={(e) => handleDragStart(e, 'FAVORITE_ITEM', fav)} onDragOver={handleDragOver} onDragEnter={(e) => handleDragEnter(e, fav.id)} onDrop={(e) => handleDrop(e, fav.id, 'FAVORITE_ITEM')} onClick={() => handleCardClick(fav, true)} className={`bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex gap-3 relative ${dragOverTarget === fav.id ? 'ring-2 ring-indigo-400 bg-indigo-50' : ''}`} > <div className="w-16 h-16 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden"> {fav.images && fav.images.length > 0 ? ( <img src={getOptimizedUrl(fav.images[0], 100)} className="w-full h-full object-cover pixelated" /> ) : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={16}/></div>} </div> <div className="flex-1 min-w-0 flex flex-col justify-center"> <h4 className="font-bold text-sm text-slate-700 truncate mb-1">{fav.title}</h4> <p className="text-[10px] text-slate-400 line-clamp-2">{fav.content}</p> </div> <button onClick={(e) => { e.stopPropagation(); toggleFavorite(fav); }} className="absolute top-2 right-2 p-1.5 text-pink-400 hover:text-pink-600 hover:bg-pink-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button> <div className="absolute right-2 bottom-2 text-slate-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100"><GripHorizontal size={14}/></div> </div> )) )} </div> </div>
      {!isSidebarOpen && ( <button onClick={() => setIsSidebarOpen(true)} className="fixed right-0 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur border border-slate-200 shadow-lg p-2 rounded-l-xl z-30 hover:pl-3 transition-all group" > <ChevronLeft size={20} className="text-slate-400 group-hover:text-indigo-500" /> </button> )}

      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-md border-b border-white/40 shadow-sm transition-all duration-300">
        {/* Header content omitted for brevity, logic unchanged */}
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setCurrentView('PROMPTS')} title="返回首页"><div className="w-10 h-10 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-2xl shadow-lg shadow-orange-500/20 flex items-center justify-center text-white font-bold text-xl transform transition-transform group-hover:scale-110">🍌</div><div><h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">大香蕉</h1><span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">Prompt Box</span></div></div>
            <nav className="flex space-x-1 bg-slate-100/50 p-1 rounded-xl border border-white/50 backdrop-blur-md hidden sm:flex"><button onClick={() => setCurrentView('PROMPTS')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView==='PROMPTS' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>提示词</button><button onClick={() => setCurrentView('GIF_MAKER')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView==='GIF_MAKER' ? 'bg-white shadow text-pink-600' : 'text-slate-500 hover:text-slate-700'}`}>动图</button></nav>
          </div>
          <div className="flex items-center space-x-3">
            {isLoading && <span className="text-xs text-indigo-500 animate-pulse flex items-center bg-indigo-50 px-2 py-1 rounded-full"><RefreshCw size={10} className="animate-spin mr-1"/>同步中</span>}
            {isSyncing && <span className="text-xs text-green-500 animate-pulse flex items-center bg-green-50 px-2 py-1 rounded-full"><Upload size={10} className="animate-pulse mr-1"/>同步中</span>}
            
            {/* 登录/登出按钮 */}
            {!currentUser ? (
              <button onClick={handleLogin} className="relative flex items-center space-x-1 px-4 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm hover:shadow-md active:scale-95 bg-white/80 border-slate-200 text-slate-600 hover:bg-white">
                <Lock size={12} className="mr-1"/>
                <span>登录</span>
              </button>
            ) : (
              <button onClick={handleLogout} className="relative flex items-center space-x-1 px-4 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm hover:shadow-md active:scale-95 bg-indigo-500 border-indigo-500 text-white">
                <Unlock size={12} className="mr-1"/>
                <span>{isAdmin ? '管理员' : currentUser.email}</span>
              </button>
            )}
            
            {!isAdmin && (<button onClick={() => openSubmissionModal('create')} className="flex items-center space-x-1 px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-full text-xs font-bold transition-colors shadow-lg shadow-pink-200/50 ml-2"><Send size={12} /> <span className="hidden sm:inline">投稿</span></button>)}
            <div className="h-5 w-px bg-slate-300/50 mx-1"></div>
            <button onClick={() => fetchCloudData(true)} title="从GitHub拉取" className="p-2 text-blue-500 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors shadow-sm"><Download size={18} className="text-blue-600" /></button>
            {isAdmin && (
              <button onClick={handleSyncToGitHub} disabled={isSyncing} title="同步到GitHub" className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-full transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <Upload size={18} />
              </button>
            )}
            {currentView === 'PROMPTS' && (
                <button onClick={() => { setEditingPrompt(null); setTargetSectionId(sections.length>0?sections[0].id:null); setIsPromptModalOpen(true); }} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0"><Plus size={14} /> <span className="hidden sm:inline">新建</span></button>
            )}
            {isAdmin && (
              <>
                {/* 🟢 回收站按钮 - 移到右上角 */}
                {deletedPrompts.length > 0 && (
                  <button
                    onClick={() => setIsRecycleBinOpen(true)}
                    className="relative p-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-full transition-colors shadow-sm"
                    title="回收站"
                  >
                    <Archive size={18} />
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {deletedPrompts.length > 9 ? '9+' : deletedPrompts.length}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsRejectedBinOpen(true);
                    loadRejectedSubmissions();
                  }}
                  className="relative p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-full transition-colors shadow-sm"
                  title="驳回垃圾桶"
                >
                  <Trash2 size={18} />
                  {rejectedSubmissions.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                      {rejectedSubmissions.length > 9 ? '9+' : rejectedSubmissions.length}
                    </span>
                  )}
                </button>
                <button onClick={() => setIsPendingPanelOpen(!isPendingPanelOpen)} className={`p-2 rounded-full transition-colors shadow-sm ${isPendingPanelOpen ? 'bg-orange-500 text-white' : 'text-orange-600 bg-orange-50 hover:bg-orange-100'}`} title="待审核投稿"><Clock size={18} /></button>
                <button onClick={handleClipboardImport} title="剪贴板一键导入" className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-full transition-colors shadow-sm hidden sm:flex"><ClipboardCopy size={18} /></button>
                <button onClick={handleExport} title="导出" className="p-2 text-slate-600 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors hidden sm:flex"><Download size={18}/></button>
                <label title="导入" className="p-2 text-slate-600 hover:text-indigo-600 rounded-full hover:bg-indigo-50 cursor-pointer transition-colors hidden sm:flex"><Upload size={18}/><input type="file" accept=".json" className="hidden" onChange={handleImport}/></label>
              </>
            )}
          </div>
        </div>
        {currentView === 'PROMPTS' && (
          <div className="border-t border-white/20 bg-white/40 px-4 py-3 max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 backdrop-blur-md animate-fade-in-up">
            {/* 🟢 搜索框 + 历史记录 */}
            <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchMode === 'author' ? '按作者搜索...' : searchMode === 'title' ? '按标题搜索...' : '按内容搜索（标题+内容）...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchHistoryOpen(true)}
                onBlur={() => setTimeout(() => setIsSearchHistoryOpen(false), 200)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    saveSearchHistory(searchQuery);
                    setIsSearchHistoryOpen(false);
                  }
                }}
                className="w-full pl-9 pr-10 py-2 bg-white/60 border border-white/40 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
              {/* 🟢 搜索历史下拉 */}
              {isSearchHistoryOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <div className="text-[11px] font-bold text-slate-400 mb-2">搜索类型</div>
                    <div className="flex gap-2">
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setSearchMode('author')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${searchMode === 'author' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        按作者搜索
                      </button>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setSearchMode('title')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${searchMode === 'title' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        按标题搜索
                      </button>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setSearchMode('content')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${searchMode === 'content' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        按内容搜索
                      </button>
                    </div>
                  </div>
                  <div className="px-3 py-2 text-xs font-bold text-slate-400 flex items-center gap-1 border-b border-slate-100">
                    <History size={12} /> 搜索历史
                  </div>
                  {searchHistory.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-slate-400">暂无搜索历史</div>
                  ) : (
                    searchHistory.map((history, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-2 hover:bg-indigo-50 cursor-pointer group"
                        onClick={() => {
                          setSearchQuery(history);
                          setIsSearchHistoryOpen(false);
                        }}
                      >
                        <span className="text-sm text-slate-600 truncate">{history}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSearchHistory(history);
                          }}
                          className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            {/* 🟢 子区快捷跳转 */}
            <div className="relative" ref={sectionNavRef}>
              <button
                onClick={() => setIsSectionNavOpen(!isSectionNavOpen)}
                className="flex items-center gap-1 px-3 py-2 bg-white/60 border border-white/40 rounded-xl text-sm font-medium text-slate-600 hover:bg-white hover:text-indigo-600 transition-all shadow-sm"
              >
                <List size={14} />
                <span className="hidden sm:inline">子区导航</span>
                <ChevronDown size={14} className={`transition-transform ${isSectionNavOpen ? 'rotate-180' : ''}`} />
              </button>
              {isSectionNavOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 z-50 min-w-[200px] max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <div className="px-3 py-2 text-xs font-bold text-slate-400 border-b border-slate-100">快速跳转</div>
                  {sections.map(section => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 flex items-center justify-between group transition-colors"
                    >
                      <span className="text-sm text-slate-600 group-hover:text-indigo-600 flex items-center gap-2">
                        {section.title}
                        {section.isRestricted && <AlertTriangle size={12} className="text-pink-500" />}
                      </span>
                      <span className="text-xs text-slate-400">{section.prompts.length}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* 🟢 标签筛选 */}
            <div className="flex gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar py-1 items-center flex-1">
              <Sparkles size={14} className="text-yellow-500 mr-1 flex-shrink-0" />
              {commonTags.map(tag => (
                <Tag key={tag} label={tag} isActive={selectedTags.includes(tag)} onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])} />
              ))}
            </div>
          </div>
        )}
      </header>

      {/* 🔴 修复布局偏移问题：仅当 Sidebar 打开且在宽屏下才应用 marginRight */}
      <main className="max-w-7xl mx-auto px-4 py-8 pb-24 relative z-10 transition-all duration-300" style={isSidebarOpen && window.innerWidth >= 768 ? { marginRight: `${sidebarWidth}px` } : {}}>
        {loadError && !isAdmin && <div className="mb-6 p-3 bg-red-50/80 backdrop-blur border border-red-100 text-red-600 text-sm rounded-xl flex items-center shadow-sm"><Cloud size={16} className="mr-2"/> {loadError}</div>}
        {storageError && (<div className="mb-6 p-3 bg-amber-50/80 backdrop-blur border border-amber-200 text-amber-700 text-sm rounded-xl flex items-center shadow-sm animate-pulse"><CheckSquare size={16} className="mr-2"/> <span>本地缓存已满！请尽快点击右上角【导出按钮】保存数据。</span></div>)}
        {currentView === 'GIF_MAKER' ? (<GifMakerModule />) : (<>
            <div className="mb-10 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow duration-300 animate-fade-in-up"><div className="flex items-start gap-4 relative z-10"><div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-500"><MessageSquare size={24} /></div><div className="flex-1"><div className="flex justify-between items-center mb-2"><h3 className="font-bold text-slate-700 text-lg">关于本站</h3>{isAdmin && !isNotesEditing && (<button onClick={() => setIsNotesEditing(true)} className="text-xs text-indigo-600 hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={12}/> 编辑公告</button>)}</div>{isNotesEditing ? (<div className="animate-fade-in-up"><textarea className="w-full bg-white/80 border border-indigo-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" rows={3} value={siteNotes} onChange={(e) => setSiteNotes(e.target.value)} /><div className="flex justify-end gap-2 mt-2"><button onClick={() => setIsNotesEditing(false)} className="px-3 py-1 text-xs text-slate-500 hover:bg-white rounded-lg">完成</button></div></div>) : (<div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">{siteNotes || "暂无公告..."}</div>)}</div></div><FileText className="absolute right-[-20px] bottom-[-20px] text-indigo-100 rotate-12" size={120} /></div>
            
            {/* 🔴 NEW! 区 - 显示所有新提示词（排除猎奇区） */}
            {newPrompts.length > 0 && (
              <div className="mb-8 bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-md border border-green-200/50 rounded-2xl p-6 shadow-sm animate-fade-in-up">
                <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => setIsNewSectionCollapsed(!isNewSectionCollapsed)}>
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full bg-white shadow-sm text-green-500 transition-all duration-300 ${isNewSectionCollapsed ? '-rotate-90' : ''}`}>
                      <ChevronDown size={14} />
                    </div>
                    <h3 className="font-bold text-green-700 text-lg flex items-center gap-2">
                      NEW! <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">{newPrompts.length}</span>
                    </h3>
                  </div>
                </div>
                {!isNewSectionCollapsed && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {newPrompts.map(prompt => (
                      <PromptCard 
                        key={`new-${prompt.id}`} 
                        prompt={prompt} 
                        isAdmin={isAdmin} 
                        draggedItem={null} 
                        dragOverTarget={null} 
                        handleDragStart={() => {}} 
                        handleDragEnd={() => {}} 
                        handleDragOver={() => {}} 
                        handleDragEnter={() => {}} 
                        handleDrop={() => {}} 
                        onClick={handleCardClick} 
                        isFavorite={isFavorite(prompt.id)} 
                        onToggleFavorite={toggleFavorite} 
                        isNew={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {isAdmin && isPendingPanelOpen && (
              <div className="mb-8 bg-gradient-to-r from-orange-50/80 to-amber-50/80 backdrop-blur-md border border-orange-200/50 rounded-2xl p-6 shadow-lg animate-fade-in-up">
                <PendingSubmissionsPanel 
                  sections={sections}
                  onApprove={handleApproveSubmission}
                  onReject={() => {}}
                  onEdit={handleEditSubmission}
                  onViewSubmission={setViewingSubmission}
                  refreshKey={pendingRefreshKey}
                />
              </div>
            )}
            {filteredSections.map(section => (<div id={`section-${section.id}`} key={section.id} className={`group mb-8 bg-white/70 backdrop-blur-lg rounded-3xl p-6 border transition-all duration-500 ease-out ${dragOverTarget === section.id && draggedItem?.type === 'SECTION' ? 'border-indigo-400 shadow-[0_0_0_4px_rgba(99,102,241,0.1)] scale-[1.01]' : 'border-white/50 shadow-sm hover:shadow-xl hover:bg-white/80'}`} onDragOver={handleDragOver} onDragEnter={(e) => handleDragEnter(e, section.id)} onDrop={(e) => handleDrop(e, section.id, 'SECTION')}><div className="flex justify-between items-center mb-6 select-none"><div className="flex items-center flex-1">{isAdmin && (<div draggable onDragStart={(e) => handleDragStart(e, 'SECTION', section)} onDragEnd={handleDragEnd} className="mr-3 text-slate-300 hover:text-indigo-400 cursor-grab active:cursor-grabbing p-1 transition-colors"><GripVertical size={20} /></div>)}
            <div onClick={() => handleSectionToggle(section)} className="flex items-center cursor-pointer group/title"><div className={`mr-3 p-1.5 rounded-full bg-white shadow-sm text-slate-400 group-hover/title:text-indigo-500 transition-all duration-300 ${section.isCollapsed ? '-rotate-90' : ''}`}><ChevronDown size={14} /></div><h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center">{section.title} {section.isRestricted && <span className="ml-2 text-[9px] bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded border border-pink-200">重口</span>}</h2><span className="ml-3 bg-slate-100/80 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-inner">{section.prompts.length}</span></div></div>{isAdmin && (<div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"><button onClick={(e) => { e.stopPropagation(); setEditingSection(section); setIsSectionModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={14}/></button><button onClick={(e) => { e.stopPropagation(); if(confirm("删除分区?")) setSections(prev => prev.filter(s => s.id !== section.id)); }} className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button></div>)}</div>{!section.isCollapsed && (<div onDragOver={handleDragOver} onDragEnter={(e) => handleDragEnter(e, section.id)} onDrop={(e) => handleDrop(e, section.id, 'SECTION_AREA')} className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 min-h-[120px] transition-all rounded-2xl p-2 -m-2 ${dragOverTarget === section.id && draggedItem?.type === 'PROMPT' ? 'bg-indigo-50/50 ring-2 ring-indigo-200 ring-offset-2' : ''}`}>{section.prompts.map(prompt => { if (renderedCount >= visibleCount) return null; renderedCount++; return (
            <PromptCard key={prompt.id} prompt={prompt} isAdmin={isAdmin} draggedItem={draggedItem} dragOverTarget={dragOverTarget} handleDragStart={(e, type, item) => handleDragStart(e, type, item, section.id)} handleDragEnd={handleDragEnd} handleDragOver={handleDragOver} handleDragEnter={handleDragEnter} handleDrop={(e, targetId, type) => handleDrop(e, targetId, type, section.id)} onClick={handleCardClick} isFavorite={isFavorite(prompt.id)} onToggleFavorite={toggleFavorite} isNew={isNewItem(prompt.id)}/> 
            ); })}{section.prompts.length === 0 && (<div className="col-span-full flex flex-col items-center justify-center text-slate-400 text-sm pointer-events-none py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50"><UploadCloud size={32} className="mb-2 opacity-50 text-indigo-300"/><span className="text-slate-400">{isAdmin ? '拖拽提示词到这里' : '空空如也'}</span></div>)}</div>)}</div>))}
            {isAdmin && <button onClick={handleCreateSection} className="w-full py-5 border-2 border-dashed border-slate-300/50 rounded-3xl text-slate-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50/50 flex items-center justify-center gap-2 transition-all duration-300 group mb-8"><div className="p-2 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform"><FolderPlus size={18}/></div><span className="font-medium">新建一个分区</span></button>}
            {renderedCount >= visibleCount && (<div className="text-center py-8 text-slate-400 text-sm animate-pulse">下滑加载更多...</div>)}
          </>
        )}
      </main>

      {/* Modals */}
      {isSubmissionOpen && <SubmissionModal onClose={() => setIsSubmissionOpen(false)} commonTags={commonTags} mode={submissionMode} initialData={submissionTarget} onLocalSubmit={handleLocalSubmissionSuccess} />}
      
      {/* 待审核投稿详情弹窗（可编辑） */}
      {viewingSubmission && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up overflow-y-auto" onClick={() => setViewingSubmission(null)}>
          <div className="bg-white w-full max-w-4xl my-8 rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white border-b border-slate-200 p-5 flex justify-between items-start rounded-t-3xl">
              <div className="flex-1">
                <input
                  type="text"
                  value={viewingSubmission.title || ""}
                  onChange={(e) => setViewingSubmission({...viewingSubmission, title: e.target.value})}
                  className="text-xl font-bold text-slate-800 w-full border-2 border-transparent hover:border-slate-200 focus:border-indigo-400 rounded-lg px-2 py-1 outline-none transition-colors"
                  placeholder="输入标题"
                />
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                    viewingSubmission.action === 'create' ? 'bg-green-100 text-green-600' :
                    viewingSubmission.action === 'edit' ? 'bg-blue-100 text-blue-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    {viewingSubmission.submissionType}
                  </span>
                  <span className="text-xs text-slate-500">投稿人: {viewingSubmission.contributor}</span>
                </div>
              </div>
              <button onClick={() => setViewingSubmission(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsReviewImageDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsReviewImageDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsReviewImageDragOver(false);
                  uploadReviewImages(e.dataTransfer.files);
                }}
                className={`rounded-2xl border-2 border-dashed p-3 transition-all ${
                  isReviewImageDragOver ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs font-bold text-slate-500">
                    配图 ({Array.isArray(viewingSubmission.images) ? viewingSubmission.images.length : 0})
                  </div>
                  <div className="text-[10px] text-slate-400">拖拽上传 / 粘贴链接 / 拖拽排序</div>
                </div>

                {Array.isArray(viewingSubmission.images) && viewingSubmission.images.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                    {viewingSubmission.images.map((img, idx) => (
                      <div
                        key={`${img}-${idx}`}
                        draggable
                        onDragStart={() => setReviewDraggingImageIndex(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (reviewDraggingImageIndex === null || reviewDraggingImageIndex === idx) return;
                          setViewingSubmission((prev) => {
                            const next = Array.isArray(prev?.images) ? [...prev.images] : [];
                            const [moved] = next.splice(reviewDraggingImageIndex, 1);
                            next.splice(idx, 0, moved);
                            return { ...prev, images: next };
                          });
                          setReviewDraggingImageIndex(null);
                        }}
                        onDragEnd={() => setReviewDraggingImageIndex(null)}
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-200 bg-white"
                      >
                        <img src={img} className="w-full h-full object-cover" alt={`preview-${idx}`} />
                        <button
                          type="button"
                          onClick={() => removeReviewImage(idx)}
                          className="absolute top-1 right-1 p-1 rounded bg-black/60 hover:bg-red-500 text-white"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    <label className="aspect-square rounded-lg border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center cursor-pointer transition-all hover:border-indigo-400 hover:bg-indigo-50">
                      {isReviewImageUploading ? <RefreshCw size={20} className="animate-spin mb-1" /> : <Plus size={24} className="mb-1" />}
                      <span className="text-[10px] font-bold">{isReviewImageUploading ? '上传中...' : '点击添加'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        disabled={isReviewImageUploading}
                        onChange={(e) => uploadReviewImages(e.target.files)}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="h-28 rounded-lg border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center cursor-pointer transition-all mb-3 hover:border-indigo-400 hover:bg-indigo-50">
                    {isReviewImageUploading ? <RefreshCw size={20} className="animate-spin mb-1" /> : <UploadCloud size={24} className="mb-1" />}
                    <span className="text-xs font-bold">{isReviewImageUploading ? '上传中...' : '点击或拖拽上传图片'}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      disabled={isReviewImageUploading}
                      onChange={(e) => uploadReviewImages(e.target.files)}
                    />
                  </label>
                )}

                <div className="flex gap-2">
                  <input
                    value={reviewImageUrlInput}
                    onChange={(e) => setReviewImageUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addReviewImageByUrl()}
                    placeholder="粘贴图片链接"
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-indigo-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={addReviewImageByUrl}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600"
                  >
                    添加
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Prompt 内容</div>
                <textarea
                  value={viewingSubmission.content || ""}
                  onChange={(e) => setViewingSubmission({...viewingSubmission, content: e.target.value})}
                  className="w-full bg-slate-50 rounded-lg p-3 text-sm text-slate-700 font-mono leading-relaxed border-2 border-slate-200 focus:border-indigo-400 outline-none transition-colors resize-none"
                  rows={6}
                  placeholder="输入 Prompt 内容"
                />
              </div>

              {/* 🟢 作者备注区域 */}
              <div>
                <div className="text-xs font-bold text-amber-500 mb-2 uppercase tracking-wide flex items-center gap-1"><MessageSquare size={12}/> 作者备注</div>
                <textarea
                  value={viewingSubmission.notes || ""}
                  onChange={(e) => setViewingSubmission({...viewingSubmission, notes: e.target.value})}
                  className="w-full bg-amber-50 rounded-lg p-3 text-sm text-amber-800 font-sans leading-relaxed border-2 border-amber-200 focus:border-amber-400 outline-none transition-colors resize-none"
                  rows={3}
                  placeholder="输入作者备注..."
                />
              </div>

              <div>
                <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">标签</div>
                <div className="flex flex-wrap gap-2">
                  {viewingSubmission.tags && viewingSubmission.tags.map((tag, idx) => (
                    <span key={idx} className="bg-slate-100 px-2 py-1 rounded text-xs flex items-center gap-1">
                      {tag}
                      <button onClick={() => setViewingSubmission({
                        ...viewingSubmission,
                        tags: viewingSubmission.tags.filter((_, i) => i !== idx)
                      })} className="hover:text-red-500">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* 🔴 变体/修改投稿：显示目标提示词状态 */}
              {(viewingSubmission.action === 'variant' || viewingSubmission.action === 'edit-variant' || viewingSubmission.action === 'edit') && viewingSubmission.targetId && (() => {
                const found = findPromptByIdOrTitle(viewingSubmission.targetId, viewingSubmission.originalTitle);
                const isVariant = viewingSubmission.action === 'variant' || viewingSubmission.action === 'edit-variant';
                
                return (
                  <div className={`border-t border-slate-200 pt-4 ${!found ? 'bg-red-50 -mx-5 px-5 py-4' : ''}`}>
                    <div className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      {isVariant ? '目标提示词' : '原提示词'}
                      {!found && <AlertTriangle size={14} className="text-red-500" />}
                    </div>
                    
                    {found ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                        <div className="flex items-center gap-3">
                          {found.prompt.images && found.prompt.images.length > 0 && (
                            <img src={getOptimizedUrl(found.prompt.images[0], 80)} className="w-12 h-12 rounded-lg object-cover" />
                          )}
                          <div>
                            <div className="font-bold text-sm text-green-800">{found.prompt.title}</div>
                            <div className="text-xs text-green-600">所在分区：{found.section.title}</div>
                            {found.prompt.similar && found.prompt.similar.length > 0 && (
                              <div className="text-xs text-green-500">已有 {found.prompt.similar.length} 个变体</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 mb-4">
                        <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-sm text-red-700">
                          <div className="font-bold flex items-center gap-1 mb-1">
                            <AlertCircle size={14} /> 未找到原提示词！
                          </div>
                          <div className="text-xs">
                            原 ID: <code className="bg-red-200 px-1 rounded">{viewingSubmission.targetId}</code>
                            {viewingSubmission.originalTitle && (
                              <> | 原标题: <span className="font-medium">{viewingSubmission.originalTitle}</span></>
                            )}
                          </div>
                          <div className="mt-2 text-xs text-red-600">
                            可能原因：原提示词已被其他修改投稿更新（ID 变化），或已被删除。
                          </div>
                        </div>
                        
                        {isVariant && (
                          <div>
                            <div className="text-xs font-bold text-slate-600 mb-2">手动选择目标提示词：</div>
                            <select
                              className="w-full p-2 border-2 border-slate-200 rounded-lg text-sm focus:border-indigo-400 outline-none"
                              value={viewingSubmission.targetId}
                              onChange={(e) => {
                                const newTargetId = e.target.value;
                                // 找到选中的提示词以获取其标题
                                let newTitle = '';
                                sections.forEach(sec => {
                                  const p = sec.prompts.find(p => p.id === newTargetId);
                                  if (p) newTitle = p.title;
                                });
                                setViewingSubmission({
                                  ...viewingSubmission,
                                  targetId: newTargetId,
                                  originalTitle: newTitle
                                });
                              }}
                            >
                              <option value="">-- 请选择 --</option>
                              {sections.map(section => (
                                <optgroup key={section.id} label={section.title}>
                                  {section.prompts.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.title} {p.similar && p.similar.length > 0 ? `(+${p.similar.length}变体)` : ''}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="border-t border-slate-200 pt-4">
                <div className="text-sm font-bold text-slate-700 mb-2">选择目标分区</div>
                {viewingSubmission.action !== 'create' && viewingSubmission.targetId && (
                  <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    <span className="font-bold">原分区：</span>
                    {findOriginalSection(viewingSubmission.targetId)?.title || findPromptByIdOrTitle(viewingSubmission.targetId, viewingSubmission.originalTitle)?.section?.title || '未知分区'}
                  </div>
                )}
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-[150px] overflow-y-auto custom-scrollbar p-1">
                  {sections.map(section => (
                    <button
                      key={section.id}
                      onClick={() => setSelectedSection(section.id)}
                      className={`p-2 rounded-lg border-2 transition-all text-left ${
                        selectedSection === section.id
                          ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                          : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-800 truncate">{section.title}</div>
                      <div className="text-[10px] text-slate-500">{section.prompts.length} 个</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => selectedSection && handleApproveWithSection(viewingSubmission, selectedSection)}
                  disabled={!selectedSection}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all text-sm"
                >
                  <CheckCircle size={16} /> 批准到选中分区
                </button>
                <button
                  onClick={() => handleRejectSubmission(viewingSubmission.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-all text-sm"
                >
                  <Trash2 size={16} /> 删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isPromptModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-4 p-2 bg-slate-900/40 backdrop-blur-md transition-all duration-300"><div className="bg-white/95 backdrop-blur-md w-full max-h-[94vh] md:max-h-[94vh] max-h-[90vh] rounded-3xl md:rounded-3xl rounded-2xl overflow-hidden flex flex-col p-6 md:p-6 p-4 shadow-2xl ring-1 ring-white/50 animate-fade-in-up transition-all duration-300" style={adaptiveModalStyle}><div className="flex justify-between mb-4 md:mb-4 mb-3 border-b border-slate-100 pb-3 md:pb-3 pb-2"><div className="flex items-center gap-3 md:gap-3 gap-2 flex-1 min-w-0"><div className="w-9 h-9 md:w-9 md:h-9 w-7 h-7 bg-indigo-50 rounded-xl md:rounded-xl rounded-lg flex items-center justify-center text-indigo-600 flex-shrink-0"><Edit2 size={18} className="md:w-[18px] md:h-[18px] w-4 h-4"/></div><h3 className="font-bold text-lg md:text-lg text-base text-slate-800 truncate">{editingPrompt && !isAdmin && !isLocalEditing ? editingPrompt.title : (editingPrompt ? '编辑盒子' : '新建盒子')}{isViewingFavorite && editingPrompt && <span className="ml-2 text-xs md:text-xs text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full hidden sm:inline">本地收藏</span>}</h3></div>{/* 🟢 管理员模式下显示移动按钮 */}{isAdmin && editingPrompt && editingPrompt.id && (<button onClick={() => { const currentSection = sections.find(s => s.prompts.some(p => p.id === editingPrompt.id)); if(currentSection) setMoveModalData({ prompt: editingPrompt, currentSectionId: currentSection.id }); }} className="px-3 py-1.5 md:px-3 md:py-1.5 px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs md:text-xs text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 mr-2 flex-shrink-0"><FolderOutput size={14} className="md:w-[14px] md:h-[14px] w-3 h-3"/> <span className="hidden sm:inline">移动分区</span><span className="sm:hidden">移动</span></button>)}<button onClick={() => { setIsPromptModalOpen(false); setIsViewingFavorite(false); setIsLocalEditing(false); }} className="w-8 h-8 md:w-8 md:h-8 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors flex-shrink-0"><X size={18} className="text-slate-500 md:w-[18px] md:h-[18px] w-4 h-4"/></button></div><div className="flex-1 overflow-y-auto custom-scrollbar pr-2 md:pr-2 pr-1">{isAdmin ? <PromptForm initialData={editingPrompt} commonTags={commonTags} setCommonTags={setCommonTags} onSave={handleSavePrompt} onDelete={(id) => { const currentSection = sections.find(s => s.prompts.some(p => p.id === id)); if(currentSection) handleSoftDelete(id, currentSection.id); setIsPromptModalOpen(false); }}/> : (isLocalEditing ? <PromptForm initialData={editingPrompt} commonTags={commonTags} setCommonTags={setCommonTags} onSave={handleSavePrompt} /> : (editingPrompt && !isViewingFavorite ? <PromptViewer prompt={editingPrompt} onSubmissionAction={openSubmissionModal} orientation={imageOrientation} isFromFavorite={false} /> : (editingPrompt && isViewingFavorite ? <PromptViewer prompt={editingPrompt} onSubmissionAction={openSubmissionModal} orientation={imageOrientation} isFromFavorite={true} onLocalAction={handleLocalAction} /> : <PromptForm initialData={null} commonTags={commonTags} setCommonTags={setCommonTags} onSave={handleSavePrompt} />)))}</div></div></div>)}
      
      {/* 🟢 移动提示词到其他分区的弹窗 */}
      {moveModalData && (
        <MoveToSectionModal
          prompt={moveModalData.prompt}
          sections={sections}
          currentSectionId={moveModalData.currentSectionId}
          onMove={handleMovePrompt}
          onClose={() => setMoveModalData(null)}
        />
      )}
      {pendingRestrictedSectionId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
              <div className="bg-pink-50 w-full max-w-lg rounded-3xl p-6 shadow-2xl border-2 border-pink-200">
                 <div className="flex items-center justify-center text-pink-600 mb-4">
                     <AlertTriangle size={48} />
                 </div>
                 <h3 className="text-xl font-bold text-pink-700 text-center mb-4">此子区已被標記為重口（官方聲明）</h3>
                 <div className="text-sm font-medium text-pink-800/80 leading-relaxed space-y-2 mb-6 text-center font-traditional">
                    <p>請注意，這子区的內容過於重口味，可能會使人產生惡心、頭暈等不適症狀，亦有可能使閣下情緒有負面影響，因此我們認為這個本子不適合任何人仕觀看。</p>
                    <p>如閣下仍然執意決定要觀看，請閣下自行承受觀看後的後果。若有任何不適症狀，請立刻停止觀看並及時向醫師尋求幫助</p>
                 </div>
                 <div className="flex gap-3">
                     <button onClick={() => setPendingRestrictedSectionId(null)} className="flex-1 py-3 bg-white text-pink-600 font-bold rounded-xl border border-pink-200 hover:bg-pink-100 transition-colors">取消 / Cancel</button>
                     <button onClick={confirmRestrictedOpen} className="flex-1 py-3 bg-pink-600 text-white font-bold rounded-xl shadow-lg shadow-pink-200 hover:bg-pink-700 transition-colors">我已了解，继续观看</button>
                 </div>
              </div>
          </div>
      )}
      {/* 🟢 回收站弹窗（仅管理员可见） */}
      {isRejectedBinOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up"
          onClick={() => setIsRejectedBinOpen(false)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-white/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Trash2 size={20} className="text-rose-500" />
                驳回投稿 ({rejectedSubmissions.length})
                <span className="text-xs text-slate-400 font-normal">保留 7 天自动清空</span>
              </h3>
              <button
                onClick={() => setIsRejectedBinOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="p-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
              {isRejectedBinLoading ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw size={20} className="animate-spin" />
                  <span>加载中...</span>
                </div>
              ) : rejectedSubmissions.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Trash2 size={40} className="mx-auto mb-2 opacity-30" />
                  <p>暂无驳回投稿</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rejectedSubmissions.map((item) => (
                    <div key={item.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-800 truncate">{item.title || '未命名投稿'}</div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            投稿人: {item.contributor || '匿名'} | 驳回时间: {item.processedAt ? new Date(item.processedAt).toLocaleString() : '-'}
                          </div>
                          <div className="text-xs text-slate-500 mt-2 line-clamp-2">{item.content || ''}</div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleRestoreRejectedSubmission(item.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold hover:bg-emerald-200 transition-colors"
                          >
                            恢复待审
                          </button>
                          <button
                            onClick={() => handleDeleteRejectedForever(item.id)}
                            className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 text-xs font-bold hover:bg-rose-200 transition-colors"
                          >
                            彻底删除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {isRecycleBinOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up" onClick={() => setIsRecycleBinOpen(false)}>
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-white/50" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Archive size={20} className="text-orange-500"/> 回收站 ({deletedPrompts.length})
                <span className="text-xs text-slate-400 font-normal">7天内可恢复</span>
              </h3>
              <button onClick={() => setIsRecycleBinOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {deletedPrompts.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Archive size={48} className="mx-auto mb-2 opacity-30" />
                  <p>回收站是空的</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deletedPrompts.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {item.images && item.images.length > 0 ? (
                          <img src={getOptimizedUrl(item.images[0], 80)} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                            <ImageIcon size={16} className="text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-700 truncate">{item.title}</h4>
                          <p className="text-[10px] text-slate-400">
                            删除于 {new Date(item.deletedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          handleRestoreDeleted(item);
                          if (deletedPrompts.length <= 1) setIsRecycleBinOpen(false);
                        }}
                        className="px-3 py-1.5 bg-green-100 text-green-600 rounded-lg font-bold text-xs hover:bg-green-200 transition-colors ml-2"
                      >
                        恢复
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* 🟢 回顶按钮 */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-300/50 transition-all hover:scale-110 active:scale-95 animate-fade-in-up md:bottom-8 md:right-8"
          title="回到顶部"
        >
          <ArrowUpCircle size={24} />
        </button>
      )}
      
      {/* ... Other Modals ... */}
      {isImportModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in-up"><div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/50"><div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-slate-800 flex items-center"><FolderInput className="w-5 h-5 mr-2 text-purple-500"/> 选择导入分区</h3><button onClick={() => { setIsImportModalOpen(false); setPendingImportPrompt(null); }}><X className="text-slate-400 hover:text-slate-600"/></button></div><div className="max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2">{sections.map(section => (<button key={section.id} onClick={() => confirmImportToSection(section.id)} className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 transition-colors font-medium text-sm text-slate-600 flex items-center justify-between group"><span>{section.title}</span><span className="text-xs text-slate-400 group-hover:text-indigo-400">{section.prompts.length} 个</span></button>))}</div></div></div>)}
      {isSectionModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm"><div className="bg-white p-8 rounded-3xl w-96 shadow-2xl animate-fade-in-up ring-1 ring-white/50"><h3 className="font-bold mb-6 text-xl text-slate-800">分区设置</h3><div className="space-y-4 mb-6"><div><label className="text-xs font-bold text-slate-500 block mb-1">分区名称</label><input value={editingSection.title} onChange={e => setEditingSection({...editingSection, title: e.target.value})} className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-medium text-slate-700" /></div><label className="flex items-center p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"><input type="checkbox" checked={editingSection.defaultCollapsed || false} onChange={e => setEditingSection({...editingSection, defaultCollapsed: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"/><span className="ml-2 text-sm font-bold text-slate-600">默认折叠 (游客模式)</span></label><label className="flex items-center p-3 bg-pink-50 border border-pink-100 rounded-xl cursor-pointer hover:bg-pink-100 transition-colors"><input type="checkbox" checked={editingSection.isRestricted || false} onChange={e => setEditingSection({...editingSection, isRestricted: e.target.checked})} className="w-4 h-4 text-pink-600 rounded border-pink-300 focus:ring-pink-500"/><span className="ml-2 text-sm font-bold text-pink-600 flex items-center"><AlertTriangle size={14} className="mr-1"/> 设为猎奇/重口分区 (警示)</span></label></div><div className="flex justify-end gap-3"><button onClick={() => setIsSectionModalOpen(false)} className="px-5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">取消</button><button onClick={() => { if(editingSection.title) { const isRestricted = editingSection.isRestricted || false; const finalDefaultCollapsed = isRestricted ? true : (editingSection.defaultCollapsed || false); if(editingSection.id) { setSections(prev => prev.map(s => s.id === editingSection.id ? { ...s, title: editingSection.title, defaultCollapsed: finalDefaultCollapsed, isRestricted: isRestricted, isCollapsed: finalDefaultCollapsed ? true : s.isCollapsed } : s)); } else { setSections([...sections, { id: `s-${Date.now()}`, title: editingSection.title, isCollapsed: finalDefaultCollapsed, defaultCollapsed: finalDefaultCollapsed, isRestricted: isRestricted, prompts: [] }]); } setIsSectionModalOpen(false); } }} className="px-6 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transform hover:-translate-y-0.5 transition-all">确定</button></div></div></div>)}
    </div>
  );
}
