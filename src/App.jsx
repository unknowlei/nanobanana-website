import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, X, Edit2, Trash2, ChevronDown, 
  Image as ImageIcon, FolderPlus, Save, Unlock, Lock,
  Download, Upload, RefreshCw, Cloud, Move, GripVertical, Check
} from 'lucide-react';

/**
 * ==============================================================================
 * 👇👇👇 请再次将你的 RAW 链接粘贴到下面的引号里 👇👇👇
 * ==============================================================================
 */
const DATA_SOURCE_URL = "在此处粘贴你的GitHub Raw链接"; 

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

// 标签组件
const Tag = ({ label, onClick, isActive }) => (
  <span onClick={onClick} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer select-none ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
    {label}
  </span>
);

export default function PromptBoxApp() {
  // 默认开启管理员模式
  const [isAdmin, setIsAdmin] = useState(true); 
  
  // 数据状态
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [commonTags, setCommonTags] = useState(INITIAL_TAGS);
  
  // 界面状态
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  
  // 拖拽状态 (新增核心)
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedType, setDraggedType] = useState(null); // 'SECTION' | 'PROMPT'
  const [dragSourceSectionId, setDragSourceSectionId] = useState(null);
  
  // 弹窗控制
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [targetSectionId, setTargetSectionId] = useState(null);

  // --- 初始化与自动保存 ---
  useEffect(() => {
    const localSections = localStorage.getItem('nanobanana_sections');
    const localTags = localStorage.getItem('nanobanana_tags');

    if (localSections) {
      setSections(JSON.parse(localSections));
      if (localTags) setCommonTags(JSON.parse(localTags));
    } else {
      if (DATA_SOURCE_URL && DATA_SOURCE_URL.includes("http")) {
        fetchCloudData();
      }
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      localStorage.setItem('nanobanana_sections', JSON.stringify(sections));
      localStorage.setItem('nanobanana_tags', JSON.stringify(commonTags));
    }
  }, [sections, commonTags, isAdmin]);

  const fetchCloudData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`${DATA_SOURCE_URL}?t=${new Date().getTime()}`);
      if (!response.ok) throw new Error("连接失败");
      const data = await response.json();
      setSections(data.sections || []);
      setCommonTags(data.commonTags || []);
    } catch (err) {
      console.error(err);
      setLoadError("无法连接云端，当前为离线模式");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 核心修复：更智能的搜索逻辑 ---
  // 现在会同时搜索：标题、内容、以及标签名
  const filteredSections = sections.map(section => ({
    ...section,
    prompts: section.prompts.filter(p => {
      const query = searchQuery.toLowerCase();
      // 1. 关键字匹配 (标题 OR 内容 OR 标签包含关键字)
      const matchesSearch = p.title.toLowerCase().includes(query) || 
                            p.content.toLowerCase().includes(query) ||
                            p.tags.some(t => t.toLowerCase().includes(query));
      
      // 2. 标签按钮筛选
      const matchesTags = selectedTags.length === 0 || selectedTags.every(t => p.tags.includes(t));
      
      return matchesSearch && matchesTags;
    })
  })).filter(section => section.prompts.length > 0 || (searchQuery === '' && selectedTags.length === 0));

  // --- 拖拽逻辑：提示词排序 + 分区排序 ---

  // 1. 开始拖拽
  const handleDragStart = (e, type, item, sourceSecId = null) => {
    if (!isAdmin) return;
    setDraggedItem(item);
    setDraggedType(type);
    if (sourceSecId) setDragSourceSectionId(sourceSecId);
    e.dataTransfer.effectAllowed = "move";
    // 拖拽时稍微降低透明度
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItem(null);
    setDraggedType(null);
    setDragSourceSectionId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // 允许放置
  };

  // 2. 放置处理 (最复杂的逻辑)
  
  // A. 放置在【分区标题】上 (用于分区重排 或 提示词跨区移动)
  const handleDropOnSection = (e, targetSecId) => {
    e.preventDefault();
    e.stopPropagation();

    // 情况1：拖拽的是分区 -> 进行分区排序
    if (draggedType === 'SECTION') {
       if (draggedItem.id === targetSecId) return;
       const newSections = [...sections];
       const sourceIndex = newSections.findIndex(s => s.id === draggedItem.id);
       const targetIndex = newSections.findIndex(s => s.id === targetSecId);
       // 移动元素
       const [moved] = newSections.splice(sourceIndex, 1);
       newSections.splice(targetIndex, 0, moved);
       setSections(newSections);
    } 
    // 情况2：拖拽的是提示词 -> 移动到该分区末尾
    else if (draggedType === 'PROMPT') {
       movePrompt(draggedItem, dragSourceSectionId, targetSecId, null);
    }
  };

  // B. 放置在【提示词卡片】上 (用于提示词插队排序)
  const handleDropOnPrompt = (e, targetSecId, targetPromptId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedType === 'PROMPT') {
      if (draggedItem.id === targetPromptId) return;
      movePrompt(draggedItem, dragSourceSectionId, targetSecId, targetPromptId);
    }
  };

  // 通用函数：移动提示词
  const movePrompt = (promptItem, sourceSecId, targetSecId, targetPromptId) => {
    const newSections = JSON.parse(JSON.stringify(sections));
    
    // 1. 从旧分区移除
    const sourceSec = newSections.find(s => s.id === sourceSecId);
    const itemIndex = sourceSec.prompts.findIndex(p => p.id === promptItem.id);
    if (itemIndex === -1) return; // 没找到，中止
    const [movedPrompt] = sourceSec.prompts.splice(itemIndex, 1);

    // 2. 插入新分区
    const targetSec = newSections.find(s => s.id === targetSecId);
    
    if (targetPromptId) {
      // 插在目标提示词前面
      const targetIndex = targetSec.prompts.findIndex(p => p.id === targetPromptId);
      targetSec.prompts.splice(targetIndex, 0, movedPrompt);
    } else {
      // 没指定目标，直接放到最后
      targetSec.prompts.push(movedPrompt);
    }

    setSections(newSections);
  };

  // --- 增删改查逻辑 ---
  const handleSavePrompt = (promptData) => {
    const newPrompt = { ...promptData, id: promptData.id || Date.now().toString() };
    setSections(prev => {
      if (editingPrompt && editingPrompt.id) {
        return prev.map(sec => ({ ...sec, prompts: sec.prompts.map(p => p.id === newPrompt.id ? newPrompt : p) }));
      }
      const targetId = targetSectionId || prev[0].id;
      return prev.map(sec => {
        if (sec.id === targetId) return { ...sec, prompts: [...sec.prompts, newPrompt] };
        return sec;
      });
    });
    setIsPromptModalOpen(false);
    setEditingPrompt(null);
  };

  const handleExport = () => {
    const data = { sections, commonTags };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if(confirm("导入将覆盖当前屏幕上的内容，确定吗？")) {
            setSections(data.sections || []);
            setCommonTags(data.commonTags || []);
          }
        } catch (error) {
          alert("文件解析失败");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-indigo-100">
      
      {/* 顶部导航 */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center text-white font-bold">N</div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block">Nanobanana</h1>
          </div>

          <div className="flex items-center space-x-3">
            {isLoading && <span className="text-xs text-indigo-500 animate-pulse flex items-center"><RefreshCw size={10} className="animate-spin mr-1"/>同步中</span>}
            
            <button 
              onClick={() => setIsAdmin(!isAdmin)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium border ${isAdmin ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}
            >
              {isAdmin ? <Unlock size={12} className="mr-1"/> : <Lock size={12} className="mr-1"/>}
              <span>{isAdmin ? '编辑模式' : '访客模式'}</span>
            </button>

            {isAdmin && (
              <>
                <div className="h-4 w-px bg-slate-200"></div>
                <button onClick={handleExport} title="导出数据" className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                  <Download size={14} /> <span>导出</span>
                </button>
                <label title="导入备份" className="p-2 text-slate-400 hover:text-indigo-600 cursor-pointer">
                  <Upload size={16} />
                  <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                </label>
                <button 
                  onClick={() => { 
                    setEditingPrompt(null); 
                    setTargetSectionId(sections.length > 0 ? sections[0].id : null); 
                    setIsPromptModalOpen(true); 
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 shadow-md shadow-indigo-200"
                >
                  <Plus size={14} /> <span>新建</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="border-t border-slate-100 bg-white/50 px-4 py-3 max-w-7xl mx-auto flex flex-col sm:flex-row gap-4">
           <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="搜索标题、内容或标签..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-200 transition-all" 
              />
           </div>
           <div className="flex gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar py-1">
              {commonTags.map(tag => (
                <Tag key={tag} label={tag} isActive={selectedTags.includes(tag)} onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])} />
              ))}
           </div>
        </div>
      </header>

      {/* 主体内容 */}
      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        {loadError && !isAdmin && (
           <div className="mb-4 p-3 bg-amber-50 text-amber-600 text-sm rounded-lg border border-amber-100 flex items-center">
             <Cloud size={16} className="mr-2"/> {loadError}
           </div>
        )}

        {filteredSections.map(section => (
          <div 
            key={section.id} 
            className={`mb-8 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 transition-all ${draggedItem?.id === section.id ? 'opacity-50 scale-95 border-indigo-300 border-dashed' : ''}`}
            // --- 分区拖拽属性 ---
            draggable={isAdmin} 
            onDragStart={(e) => handleDragStart(e, 'SECTION', section)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropOnSection(e, section.id)}
          >
            {/* 分区标题栏 */}
            <div className="flex justify-between items-center mb-4 cursor-pointer select-none">
              <div 
                className="flex items-center flex-1"
                onClick={() => setSections(prev => prev.map(s => s.id === section.id ? { ...s, isCollapsed: !s.isCollapsed } : s))}
              >
                {isAdmin && <GripVertical size={16} className="text-slate-300 mr-2 cursor-grab active:cursor-grabbing" />}
                <ChevronDown size={16} className={`text-slate-500 mr-2 transition-transform ${section.isCollapsed ? '-rotate-90' : ''}`} />
                <h2 className="text-lg font-bold text-slate-800">{section.title}</h2>
                <span className="ml-2 bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full">{section.prompts.length}</span>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                   <button onClick={(e) => { e.stopPropagation(); setEditingSection(section); setIsSectionModalOpen(true); }} className="text-slate-400 hover:text-indigo-500 p-1"><Edit2 size={14}/></button>
                   <button onClick={(e) => { e.stopPropagation(); if(confirm("删除分区?")) setSections(prev => prev.filter(s => s.id !== section.id)); }} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                </div>
              )}
            </div>
            
            {!section.isCollapsed && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 min-h-[100px]">
                {section.prompts.map(prompt => (
                  <div 
                    key={prompt.id} 
                    onClick={(e) => { e.stopPropagation(); setEditingPrompt(prompt); setIsPromptModalOpen(true); }} 
                    className={`group bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:shadow-md cursor-pointer transition-all aspect-[3/4] flex flex-col relative ${draggedItem?.id === prompt.id ? 'opacity-30' : ''}`}
                    // --- 提示词拖拽属性 ---
                    draggable={isAdmin}
                    onDragStart={(e) => handleDragStart(e, 'PROMPT', prompt, section.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnPrompt(e, section.id, prompt.id)}
                  >
                    <div className="flex-1 bg-slate-200 relative overflow-hidden pointer-events-none">
                      {prompt.image ? <img src={prompt.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={24}/></div>}
                    </div>
                    <div className="p-3 bg-white h-16 pointer-events-none">
                      <h3 className="font-bold text-sm truncate text-slate-800">{prompt.title}</h3>
                      <p className="text-[10px] text-slate-400 truncate mt-1">{prompt.tags.join(' ')}</p>
                    </div>
                  </div>
                ))}
                {section.prompts.length === 0 && (
                  <div className="col-span-full py-8 text-center text-slate-400 text-sm border-2 border-dashed rounded-xl flex items-center justify-center">
                    {isAdmin ? '拖拽提示词到这里' : '暂无内容'}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {isAdmin && (
          <button onClick={() => { setEditingSection({title: ''}); setIsSectionModalOpen(true); }} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 flex items-center justify-center gap-2 transition-all">
            <FolderPlus size={18}/> 新建分区
          </button>
        )}
      </main>

      {/* 提示词 编辑弹窗 (带压缩功能) */}
      {isPromptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col p-6 shadow-2xl">
            <div className="flex justify-between mb-4 border-b border-slate-100 pb-2">
               <h3 className="font-bold text-lg">{editingPrompt && !isAdmin ? editingPrompt.title : (editingPrompt ? '编辑提示词' : '新建提示词')}</h3>
               <button onClick={() => setIsPromptModalOpen(false)}><X size={20} className="text-slate-400 hover:text-red-500"/></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isAdmin ? (
                <PromptForm 
                  initialData={editingPrompt} 
                  commonTags={commonTags} 
                  setCommonTags={setCommonTags}
                  onSave={handleSavePrompt} 
                  onDelete={(id) => {
                     setSections(prev => prev.map(s => ({ ...s, prompts: s.prompts.filter(p => p.id !== id) })));
                     setIsPromptModalOpen(false);
                  }}
                />
              ) : (
                <div className="space-y-4">
                  {editingPrompt.image && <img src={editingPrompt.image} className="w-full max-h-80 object-contain bg-slate-100 rounded-lg"/>}
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1">PROMPT</div>
                    <div className="p-4 bg-slate-50 rounded-lg font-mono text-sm border border-slate-200 select-all">{editingPrompt.content}</div>
                  </div>
                  <div className="flex gap-2">{editingPrompt.tags.map(t => <span key={t} className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs rounded font-medium">#{t}</span>)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 分区名称 编辑弹窗 */}
      {isSectionModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-80 shadow-xl animate-fade-in-up">
               <h3 className="font-bold mb-4 text-slate-700">分区名称</h3>
               <input id="sec-input" autoFocus defaultValue={editingSection?.title} className="w-full border p-2 rounded-lg mb-4 outline-none focus:border-indigo-500 ring-2 ring-transparent focus:ring-indigo-100 transition-all" />
               <div className="flex justify-end gap-2">
                  <button onClick={() => setIsSectionModalOpen(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">取消</button>
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
                  }} className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">确定</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}

// --- 表单组件 (含图片压缩) ---
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
         let width = img.width;
         let height = img.height;

         if (width > MAX_WIDTH) {
           height *= MAX_WIDTH / width;
           width = MAX_WIDTH;
         }

         canvas.width = width;
         canvas.height = height;
         ctx.drawImage(img, 0, 0, width, height);
         const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);

         setFormData(prev => ({ ...prev, image: compressedDataUrl }));
         setIsCompressing(false);
       };
     };
   };

   return (
      <div className="space-y-4">
         <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">标题</label>
            <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border border-slate-200 p-2 rounded-lg outline-none focus:border-indigo-500" placeholder="例如: 赛博朋克少女" />
         </div>
         <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">提示词内容</label>
            <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="输入英文 Prompt..." rows={4} className="w-full border border-slate-200 p-2 rounded-lg font-mono text-sm outline-none focus:border-indigo-500" />
         </div>
         <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">配图 (自动压缩)</label>
            <div className="flex flex-col gap-3">
              {formData.image ? (
                <div className="relative w-full h-48 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group">
                  <img src={formData.image} className="w-full h-full object-contain" alt="Preview" />
                  <button onClick={() => setFormData({...formData, image: ''})} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><Trash2 size={16} /></button>
                </div>
              ) : (
                <div className="w-full h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-sm bg-slate-50">{isCompressing ? '处理中...' : '暂无图片'}</div>
              )}
              <div className="flex gap-2">
                <label className={`flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-colors border border-indigo-200 ${isCompressing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Upload size={18} />
                  <span className="text-sm font-medium">{isCompressing ? '压缩中...' : '上传本地图片'}</span>
                  <input type="file" className="hidden" accept="image/*" disabled={isCompressing} onChange={handleImageUpload} />
                </label>
                <input value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} placeholder="或粘贴链接" className="flex-1 border border-slate-200 px-3 rounded-lg text-sm outline-none focus:border-indigo-500" />
              </div>
            </div>
         </div>
         <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">标签</label>
            <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
               {commonTags.map(t => <button key={t} onClick={() => setFormData(p => ({...p, tags: p.tags.includes(t)?p.tags.filter(x=>x!==t):[...p.tags, t]}))} className={`text-xs px-2 py-1 rounded transition-colors ${formData.tags.includes(t)?'bg-indigo-500 text-white shadow-md':'bg-white text-slate-600 border border-slate-200'}`}>{t}</button>)}
               <input value={tagInput} onChange={e=>setTagInput(e.target.value)} placeholder="+新建" className="w-20 text-xs bg-transparent border-b border-slate-300 outline-none focus:border-indigo-500 px-1" onKeyDown={e=>{if(e.key==='Enter'&&tagInput){setCommonTags([...commonTags, tagInput]); setTagInput('');}}}/>
            </div>
         </div>
         <div className="flex justify-between pt-4 mt-4 border-t border-slate-100">
            {initialData && initialData.id && <button onClick={() => onDelete(initialData.id)} className="text-red-500 text-sm hover:underline">删除</button>}
            <button disabled={isCompressing} onClick={() => { if(!formData.title) return alert("请至少填写标题！"); onSave(formData); }} className={`bg-indigo-600 text-white px-8 py-2 rounded-lg text-sm ml-auto hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 ${isCompressing ? 'opacity-50' : ''}`}>
              <Check size={16} /> 保存
            </button>
         </div>
      </div>
   );
}
