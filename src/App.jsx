import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, X, Edit2, Trash2, ChevronDown, 
  Image as ImageIcon, FolderPlus, Save, Unlock, Lock,
  Download, Upload, RefreshCw, Cloud, GripVertical, Check, 
  UploadCloud, Sparkles, MessageSquare, FileText 
} from 'lucide-react';

/**
 * ==============================================================================
 * 👇👇👇 请再次将你的 RAW 链接粘贴到下面的引号里 👇👇👇
 * ==============================================================================
 */
const DATA_SOURCE_URL = ""; 

// --- 初始演示数据 ---
const INITIAL_TAGS = ["示例标签"];
const INITIAL_SECTIONS = [
  {
    id: 'demo',
    title: '默认分区',
    isCollapsed: false,
    prompts: []
  }
];
const INITIAL_NOTES = "欢迎来到大香蕉提示词收纳盒！\n在这里记录你的灵感。";

// --- 内部样式注入 (保证动画生效) ---
const AnimationStyles = () => (
  <style>{`
    @keyframes blob {
      0% { transform: translate(0px, 0px) scale(1); }
      33% { transform: translate(30px, -50px) scale(1.1); }
      66% { transform: translate(-20px, 20px) scale(0.9); }
      100% { transform: translate(0px, 0px) scale(1); }
    }
    .animate-blob {
      animation: blob 7s infinite;
    }
    .animation-delay-2000 {
      animation-delay: 2s;
    }
    .animation-delay-4000 {
      animation-delay: 4s;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background-color: rgba(156, 163, 175, 0.5);
      border-radius: 20px;
    }
  `}</style>
);

// --- 组件：高级感标签 ---
const Tag = ({ label, onClick, isActive }) => (
  <span 
    onClick={onClick} 
    className={`
      inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer select-none transition-all duration-300 border
      ${isActive 
        ? 'bg-indigo-500/90 text-white shadow-lg shadow-indigo-500/30 border-indigo-400 scale-105' 
        : 'bg-white/60 text-slate-600 border-white/40 hover:bg-white/90 hover:shadow-md hover:-translate-y-0.5 backdrop-blur-sm'}
    `}
  >
    {label}
  </span>
);

export default function PromptBoxApp() {
  const [isAdmin, setIsAdmin] = useState(false); // 默认访客模式
  const [clickCount, setClickCount] = useState(0); // 点击计数器 (隐形)
  
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [commonTags, setCommonTags] = useState(INITIAL_TAGS);
  const [siteNotes, setSiteNotes] = useState(INITIAL_NOTES); 
  
  // 界面状态
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  
  // 拖拽状态
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  
  // 弹窗状态
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isNotesEditing, setIsNotesEditing] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [targetSectionId, setTargetSectionId] = useState(null);

  // --- 初始化与数据加载 ---
  useEffect(() => {
    const localSections = localStorage.getItem('nanobanana_sections');
    const localTags = localStorage.getItem('nanobanana_tags');
    const localNotes = localStorage.getItem('nanobanana_notes');

    if (localSections) {
      setSections(JSON.parse(localSections));
      if (localTags) setCommonTags(JSON.parse(localTags));
      if (localNotes) setSiteNotes(JSON.parse(localNotes));
    } else if (DATA_SOURCE_URL && DATA_SOURCE_URL.includes("http")) {
      fetchCloudData();
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      localStorage.setItem('nanobanana_sections', JSON.stringify(sections));
      localStorage.setItem('nanobanana_tags', JSON.stringify(commonTags));
      localStorage.setItem('nanobanana_notes', JSON.stringify(siteNotes));
    }
  }, [sections, commonTags, siteNotes, isAdmin]);

  const fetchCloudData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${DATA_SOURCE_URL}?t=${new Date().getTime()}`);
      if (!response.ok) throw new Error("连接失败");
      const data = await response.json();
      setSections(data.sections || []);
      setCommonTags(data.commonTags || []);
      if (data.siteNotes) setSiteNotes(data.siteNotes);
    } catch (err) {
      console.error(err);
      setLoadError("离线模式");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 核心功能：隐形5连击解锁 ---
  const handleModeToggle = () => {
    if (isAdmin) {
      setIsAdmin(false);
      setClickCount(0);
    } else {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      if (newCount >= 5) {
        setIsAdmin(true);
        setClickCount(0);
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }
  };

  // --- 智能搜索 ---
  const filteredSections = sections.map(section => ({
    ...section,
    prompts: section.prompts.filter(p => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = p.title.toLowerCase().includes(query) || 
                            p.content.toLowerCase().includes(query) ||
                            p.tags.some(t => t.toLowerCase().includes(query));
      const matchesTags = selectedTags.length === 0 || selectedTags.every(t => p.tags.includes(t));
      return matchesSearch && matchesTags;
    })
  })).filter(section => section.prompts.length > 0 || (searchQuery === '' && selectedTags.length === 0));

  // --- 拖拽核心逻辑 ---
  const handleDragStart = (e, type, item, sourceSecId = null) => {
    if (!isAdmin) { e.preventDefault(); return; }
    setDraggedItem({ type, data: item, sourceSecId });
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => { if(e.target) e.target.style.opacity = '0.4'; }, 0);
  };
  const handleDragEnd = (e) => { e.target.style.opacity = '1'; setDraggedItem(null); setDragOverTarget(null); };
  const handleDragEnter = (e, targetId) => {
    e.preventDefault(); e.stopPropagation();
    if ((draggedItem?.type === 'SECTION' && targetId.startsWith('sec-')) || draggedItem?.type === 'PROMPT') {
       setDragOverTarget(targetId);
    }
  };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = (e, targetId, targetType, targetSecId = null) => {
    e.preventDefault(); e.stopPropagation(); setDragOverTarget(null);
    if (!draggedItem) return;
    const newSections = JSON.parse(JSON.stringify(sections));

    if (draggedItem.type === 'SECTION' && targetType === 'SECTION') {
       const sIdx = newSections.findIndex(s => s.id === draggedItem.data.id);
       const tIdx = newSections.findIndex(s => s.id === targetId);
       if (sIdx !== -1 && tIdx !== -1 && sIdx !== tIdx) {
         const [moved] = newSections.splice(sIdx, 1);
         newSections.splice(tIdx, 0, moved);
         setSections(newSections);
       }
    } else if (draggedItem.type === 'PROMPT') {
       const sSec = newSections.find(s => s.id === draggedItem.sourceSecId);
       if (!sSec) return;
       const pIdx = sSec.prompts.findIndex(p => p.id === draggedItem.data.id);
       if (pIdx === -1) return;
       const [moved] = sSec.prompts.splice(pIdx, 1);
       
       if (targetType === 'PROMPT') {
          const tSec = newSections.find(s => s.id === targetSecId);
          const tPIdx = tSec.prompts.findIndex(p => p.id === targetId);
          tSec.prompts.splice(tPIdx, 0, moved);
       } else if (targetType === 'SECTION_AREA') {
          const tSec = newSections.find(s => s.id === targetId);
          tSec.prompts.push(moved);
       }
       setSections(newSections);
    }
  };

  // --- CRUD 操作 ---
  const handleSavePrompt = (promptData) => {
    const newPrompt = { ...promptData, id: promptData.id || Date.now().toString() };
    setSections(prev => {
      if (editingPrompt && editingPrompt.id) {
        return prev.map(sec => ({ ...sec, prompts: sec.prompts.map(p => p.id === newPrompt.id ? newPrompt : p) }));
      }
      const targetId = targetSectionId || prev[0].id;
      return prev.map(sec => { if (sec.id === targetId) return { ...sec, prompts: [...sec.prompts, newPrompt] }; return sec; });
    });
    setIsPromptModalOpen(false); setEditingPrompt(null);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ sections, commonTags, siteNotes }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `data.json`; a.click();
  };
  
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
         try {
            const d = JSON.parse(ev.target.result);
            if(confirm("覆盖当前数据?")) { 
              setSections(d.sections||[]); 
              setCommonTags(d.commonTags||[]); 
              if(d.siteNotes) setSiteNotes(d.siteNotes);
            }
         } catch(err){ alert("文件无效"); }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-800 relative overflow-x-hidden">
      <AnimationStyles />
      {/* 极光背景 */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-200/40 blur-[120px] mix-blend-multiply animate-blob pointer-events-none z-0"></div>
      <div className="fixed top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-200/40 blur-[120px] mix-blend-multiply animate-blob animation-delay-2000 pointer-events-none z-0"></div>
      <div className="fixed bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-pink-200/40 blur-[120px] mix-blend-multiply animate-blob animation-delay-4000 pointer-events-none z-0"></div>

      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-default">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-2xl shadow-lg shadow-orange-500/20 flex items-center justify-center text-white font-bold transform transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
              🍌
            </div>
            <div>
               <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
                 大香蕉
               </h1>
               <span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">Prompt Box</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isLoading && <span className="text-xs text-indigo-500 animate-pulse flex items-center bg-indigo-50 px-2 py-1 rounded-full"><RefreshCw size={10} className="animate-spin mr-1"/>同步中</span>}
            
            <button 
              onClick={handleModeToggle} 
              className={`relative flex items-center space-x-1 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 border shadow-sm hover:shadow-md active:scale-95 select-none ${isAdmin ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-white'}`}
              title="Mode Switch"
            >
              {isAdmin ? <Unlock size={12} className="mr-1"/> : <Lock size={12} className="mr-1"/>}
              <span>{isAdmin ? '管理员' : '访客'}</span>
            </button>

            {isAdmin && (
              <>
                <div className="h-5 w-px bg-slate-300/50 mx-1"></div>
                <button onClick={handleExport} title="导出" className="p-2 text-slate-600 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors"><Download size={18}/></button>
                <label title="导入" className="p-2 text-slate-600 hover:text-indigo-600 rounded-full hover:bg-indigo-50 cursor-pointer transition-colors"><Upload size={18}/><input type="file" accept=".json" className="hidden" onChange={handleImport}/></label>
                <button onClick={() => { setEditingPrompt(null); setTargetSectionId(sections.length>0?sections[0].id:null); setIsPromptModalOpen(true); }} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0">
                  <Plus size={14} /> <span>新建提示词</span>
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* 搜索栏 */}
        <div className="border-t border-white/20 bg-white/40 px-4 py-3 max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 backdrop-blur-md">
           <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
              <input type="text" placeholder="搜索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white/60 border border-white/40 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all shadow-sm" />
           </div>
           <div className="flex gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar py-1 items-center">
              <Sparkles size={14} className="text-yellow-500 mr-1 flex-shrink-0" />
              {commonTags.map(tag => (
                <Tag key={tag} label={tag} isActive={selectedTags.includes(tag)} onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])} />
              ))}
           </div>
        </div>
      </header>

      {/* 主体 */}
      <main className="max-w-7xl mx-auto px-4 py-8 pb-24 relative z-10">
        {loadError && !isAdmin && <div className="mb-6 p-3 bg-red-50/80 backdrop-blur border border-red-100 text-red-600 text-sm rounded-xl flex items-center shadow-sm"><Cloud size={16} className="mr-2"/> {loadError}</div>}

        {/* 公告板 */}
        <div className="mb-10 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow duration-300">
           <div className="flex items-start gap-4 relative z-10">
              <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-500">
                <MessageSquare size={24} /> 
              </div>
              <div className="flex-1">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-slate-700 text-lg">关于本站</h3>
                    {isAdmin && !isNotesEditing && (
                      <button onClick={() => setIsNotesEditing(true)} className="text-xs text-indigo-600 hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit2 size={12}/> 编辑公告
                      </button>
                    )}
                 </div>
                 
                 {isNotesEditing ? (
                   <div className="animate-fade-in-up">
                      <textarea 
                        className="w-full bg-white/80 border border-indigo-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        rows={3}
                        value={siteNotes}
                        onChange={(e) => setSiteNotes(e.target.value)}
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setIsNotesEditing(false)} className="px-3 py-1 text-xs text-slate-500 hover:bg-white rounded-lg">完成</button>
                      </div>
                   </div>
                 ) : (
                   <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                     {siteNotes || "暂无公告..."}
                   </div>
                 )}
              </div>
           </div>
           <FileText className="absolute right-[-20px] bottom-[-20px] text-indigo-100 rotate-12" size={120} />
        </div>

        {/* 分区列表 */}
        {filteredSections.map(section => (
          <div 
            key={section.id} 
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, section.id)}
            onDrop={(e) => handleDrop(e, section.id, 'SECTION')}
            className={`
              mb-8 bg-white/70 backdrop-blur-lg rounded-3xl p-6 border transition-all duration-500 ease-out
              ${dragOverTarget === section.id && draggedItem?.type === 'SECTION' 
                ? 'border-indigo-400 shadow-[0_0_0_4px_rgba(99,102,241,0.1)] scale-[1.01]' 
                : 'border-white/50 shadow-sm hover:shadow-xl hover:bg-white/80'}
            `}
          >
            <div className="flex justify-between items-center mb-6 select-none">
              <div className="flex items-center flex-1">
                {isAdmin && (
                  <div 
                    draggable onDragStart={(e) => handleDragStart(e, 'SECTION', section)} onDragEnd={handleDragEnd}
                    className="mr-3 text-slate-300 hover:text-indigo-400 cursor-grab active:cursor-grabbing p-1 transition-colors"
                  >
                    <GripVertical size={20} />
                  </div>
                )}
                <div onClick={() => setSections(prev => prev.map(s => s.id === section.id ? { ...s, isCollapsed: !s.isCollapsed } : s))} className="flex items-center cursor-pointer group/title">
                   <div className={`mr-3 p-1.5 rounded-full bg-white shadow-sm text-slate-400 group-hover/title:text-indigo-500 transition-all duration-300 ${section.isCollapsed ? '-rotate-90' : ''}`}>
                      <ChevronDown size={14} />
                   </div>
                   <h2 className="text-lg font-bold text-slate-800 tracking-tight">{section.title}</h2>
                   <span className="ml-3 bg-slate-100/80 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-inner">{section.prompts.length}</span>
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                   <button onClick={(e) => { e.stopPropagation(); setEditingSection(section); setIsSectionModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={14}/></button>
                   <button onClick={(e) => { e.stopPropagation(); if(confirm("删除分区?")) setSections(prev => prev.filter(s => s.id !== section.id)); }} className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
                </div>
              )}
            </div>
            
            {!section.isCollapsed && (
              <div 
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, section.id)}
                onDrop={(e) => handleDrop(e, section.id, 'SECTION_AREA')}
                className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5 min-h-[120px] transition-all rounded-2xl p-2 -m-2 ${dragOverTarget === section.id && draggedItem?.type === 'PROMPT' ? 'bg-indigo-50/50 ring-2 ring-indigo-200 ring-offset-2' : ''}`}
              >
                {section.prompts.map(prompt => (
                  <div 
                    key={prompt.id} 
                    draggable={isAdmin}
                    onDragStart={(e) => handleDragStart(e, 'PROMPT', prompt, section.id)}
                    onDragEnd={handleDragEnd} onDragOver={handleDragOver} onDragEnter={(e) => handleDragEnter(e, prompt.id)} onDrop={(e) => handleDrop(e, prompt.id, 'PROMPT', section.id)}
                    onClick={(e) => { e.stopPropagation(); setEditingPrompt(prompt); setIsPromptModalOpen(true); }} 
                    className={`
                      group bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ease-out aspect-[3/4] flex flex-col relative
                      ${dragOverTarget === prompt.id && draggedItem?.type === 'PROMPT' ? 'ring-2 ring-indigo-500 transform scale-105 z-20 shadow-xl' : 'shadow-sm hover:shadow-xl hover:-translate-y-1 hover:ring-2 hover:ring-indigo-100'}
                      ${draggedItem?.data?.id === prompt.id ? 'opacity-30 grayscale' : ''}
                    `}
                  >
                    <div className="flex-1 bg-slate-100 relative overflow-hidden pointer-events-none">
                      {prompt.image ? (
                        <img src={prompt.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50">
                           <div className="p-3 bg-white rounded-full shadow-sm mb-2"><ImageIcon size={20}/></div>
                           <span className="text-[10px]">No Image</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <div className="p-4 bg-white h-20 flex flex-col justify-center border-t border-slate-50 pointer-events-none relative z-10">
                      <h3 className="font-bold text-sm truncate text-slate-800 mb-1.5">{prompt.title}</h3>
                      <div className="flex gap-1 overflow-hidden opacity-70 group-hover:opacity-100 transition-opacity">
                        {prompt.tags.slice(0, 2).map(t => <span key={t} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{t}</span>)}
                      </div>
                    </div>
                  </div>
                ))}
                
                {section.prompts.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center text-slate-400 text-sm pointer-events-none py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <UploadCloud size={32} className="mb-2 opacity-50 text-indigo-300"/>
                    <span className="text-slate-400">{isAdmin ? '拖拽提示词到这里' : '空空如也'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {isAdmin && (
          <button onClick={() => { setEditingSection({title: ''}); setIsSectionModalOpen(true); }} className="w-full py-5 border-2 border-dashed border-slate-300/50 rounded-3xl text-slate-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50/50 flex items-center justify-center gap-2 transition-all duration-300 group">
            <div className="p-2 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform"><FolderPlus size={18}/></div>
            <span className="font-medium">新建一个分区</span>
          </button>
        )}
      </main>

      {/* 弹窗：提示词编辑 */}
      {isPromptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-all duration-300">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-3xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col p-8 shadow-2xl ring-1 ring-white/50 animate-fade-in-up">
            <div className="flex justify-between mb-6 border-b border-slate-100 pb-4">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600"><Edit2 size={20}/></div>
                 <h3 className="font-bold text-xl text-slate-800">{editingPrompt && !isAdmin ? editingPrompt.title : (editingPrompt ? '编辑盒子' : '新建盒子')}</h3>
               </div>
               <button onClick={() => setIsPromptModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"><X size={18} className="text-slate-500"/></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {isAdmin ? (
                <PromptForm initialData={editingPrompt} commonTags={commonTags} setCommonTags={setCommonTags} onSave={handleSavePrompt} 
                  onDelete={(id) => { setSections(prev => prev.map(s => ({ ...s, prompts: s.prompts.filter(p => p.id !== id) }))); setIsPromptModalOpen(false); }}
                />
              ) : (
                <div className="space-y-6">
                  {editingPrompt.image && (
                     <div className="w-full max-h-[400px] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center">
                        <img src={editingPrompt.image} className="h-full object-contain" />
                     </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-2 tracking-wider flex items-center gap-1"><FileText size={12}/> PROMPT CONTENT</div>
                    <div className="p-5 bg-slate-50 rounded-2xl font-mono text-sm border border-slate-200 select-all text-slate-700 leading-relaxed shadow-sm">{editingPrompt.content}</div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                     {editingPrompt.tags.map(t => <span key={t} className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg border border-indigo-100">#{t}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 弹窗：分区编辑 */}
      {isSectionModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl w-96 shadow-2xl animate-fade-in-up ring-1 ring-white/50">
               <h3 className="font-bold mb-6 text-xl text-slate-800">分区名称</h3>
               <input id="sec-input" autoFocus defaultValue={editingSection?.title} className="w-full border-2 border-slate-100 p-3 rounded-xl mb-6 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-medium text-slate-700" placeholder="给分区起个名字..." />
               <div className="flex justify-end gap-3">
                  <button onClick={() => setIsSectionModalOpen(false)} className="px-5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">取消</button>
                  <button onClick={() => {
                     const val = document.getElementById('sec-input').value;
                     if(val) {
                        if(editingSection.id) {
                           setSections(prev => prev.map(s => s.id === editingSection.id ? { ...s, title: val } : s));
                        } else {
                           setSections([...sections, { id: `s-${Date.now()}`, title: val, isCollapsed: false, prompts: [] }]);
                        }
                        setIsSectionModalOpen(false);
                     }
                  }} className="px-6 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transform hover:-translate-y-0.5 transition-all">确定</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}

// --- 表单组件 (新增标签删除功能) ---
function PromptForm({ initialData, commonTags, setCommonTags, onSave, onDelete }) {
   const [formData, setFormData] = useState(initialData || { title: '', content: '', image: '', tags: [] });
   const [tagInput, setTagInput] = useState('');
   const [isCompressing, setIsCompressing] = useState(false);

   const handleImageUpload = (e) => {
     const file = e.target.files[0];
     if (!file) return;
     setIsCompressing(true);
     const reader = new FileReader();
     reader.readAsDataURL(file);
     reader.onload = (event) => {
       const img = new Image();
       img.src = event.target.result;
       img.onload = () => {
         const canvas = document.createElement('canvas');
         const ctx = canvas.getContext('2d');
         const MAX_WIDTH = 800; 
         let width = img.width; let height = img.height;
         if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
         canvas.width = width; canvas.height = height;
         ctx.drawImage(img, 0, 0, width, height);
         setFormData(prev => ({ ...prev, image: canvas.toDataURL('image/jpeg', 0.7) }));
         setIsCompressing(false);
       };
     };
   };

   // 🔴 新增：删除常驻标签功能
   const removeCommonTag = (tagToDelete) => {
     if (window.confirm(`确定要永久删除标签 "${tagToDelete}" 吗？`)) {
       setCommonTags(prev => prev.filter(t => t !== tagToDelete));
     }
   };

   return (
      <div className="space-y-6">
         <div>
            <label className="text-xs font-bold text-slate-400 block mb-2 uppercase tracking-wide">标题</label>
            <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all font-bold text-slate-700" placeholder="例如: 赛博朋克少女" />
         </div>
         <div>
            <label className="text-xs font-bold text-slate-400 block mb-2 uppercase tracking-wide">提示词</label>
            <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="输入英文 Prompt..." rows={5} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-mono text-sm outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all" />
         </div>
         <div>
            <label className="text-xs font-bold text-slate-400 block mb-2 uppercase tracking-wide">配图</label>
            <div className="flex flex-col gap-4">
              {formData.image ? (
                <div className="relative w-full h-56 bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 group shadow-inner flex items-center justify-center">
                  <img src={formData.image} className="h-full object-contain" alt="Preview" />
                  <button onClick={() => setFormData({...formData, image: ''})} className="absolute top-3 right-3 bg-white/90 backdrop-blur text-red-500 p-2 rounded-xl shadow-lg hover:scale-110 transition-transform"><Trash2 size={18} /></button>
                </div>
              ) : (
                <div className="w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-sm bg-slate-50/50">
                   {isCompressing ? <RefreshCw className="animate-spin mb-2 text-indigo-500"/> : <ImageIcon className="mb-2 opacity-50" size={24} />}
                   {isCompressing ? '正在压缩处理...' : '暂无图片'}
                </div>
              )}
              <div className="flex gap-3">
                <label className={`flex-1 bg-white hover:bg-indigo-50 text-indigo-600 px-4 py-3 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all border border-indigo-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${isCompressing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Upload size={18} />
                  <span className="text-sm font-bold">{isCompressing ? '处理中...' : '上传本地图片'}</span>
                  <input type="file" className="hidden" accept="image/*" disabled={isCompressing} onChange={handleImageUpload} />
                </label>
                <input value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} placeholder="或粘贴图片链接" className="flex-1 bg-slate-50 border border-slate-200 px-4 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all" />
              </div>
            </div>
         </div>
         <div>
            <label className="text-xs font-bold text-slate-400 block mb-2 uppercase tracking-wide">标签</label>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
               {commonTags.map(t => (
                 <span key={t} className={`group inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all font-medium cursor-pointer border ${formData.tags.includes(t)?'bg-indigo-500 text-white shadow-md border-indigo-500':'bg-white text-slate-600 border-slate-200 hover:bg-white/80'}`}>
                    {/* 标签文字区域：点击切换选中 */}
                    <span onClick={() => setFormData(p => ({...p, tags: p.tags.includes(t)?p.tags.filter(x=>x!==t):[...p.tags, t]}))}>{t}</span>
                    {/* 🔴 删除按钮：鼠标悬停时显示 */}
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); removeCommonTag(t); }} 
                      className={`p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white ${formData.tags.includes(t) ? 'text-indigo-200' : 'text-slate-400'}`}
                      title="删除此标签"
                    >
                      <X size={10} />
                    </button>
                 </span>
               ))}
               <input value={tagInput} onChange={e=>setTagInput(e.target.value)} placeholder="+新建" className="w-24 text-xs bg-transparent border-b-2 border-slate-200 outline-none focus:border-indigo-500 px-2 py-1 transition-colors" onKeyDown={e=>{if(e.key==='Enter'&&tagInput){setCommonTags([...commonTags, tagInput]); setTagInput('');}}}/>
            </div>
         </div>
         <div className="flex justify-between pt-6 mt-2 border-t border-slate-100">
            {initialData && initialData.id && <button onClick={() => onDelete(initialData.id)} className="text-red-500 text-sm font-medium hover:bg-red-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"><Trash2 size={16}/> 删除</button>}
            <button disabled={isCompressing} onClick={() => { if(!formData.title) return alert("请至少填写标题！"); onSave(formData); }} className={`bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold ml-auto hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 ${isCompressing ? 'opacity-50' : ''}`}>
              <Check size={18} /> 保存盒子
            </button>
         </div>
      </div>
   );
}
