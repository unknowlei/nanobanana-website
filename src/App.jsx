import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, X, Edit2, Trash2, ChevronDown, 
  Image as ImageIcon, FolderPlus, Save, Unlock, Lock,
  Download, Upload, RefreshCw, Cloud, GripVertical, Check, UploadCloud
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
  const [isAdmin, setIsAdmin] = useState(true); 
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [commonTags, setCommonTags] = useState(INITIAL_TAGS);
  
  // 界面状态
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  
  // --- 拖拽核心状态 ---
  const [draggedItem, setDraggedItem] = useState(null); // 当前被拖拽的对象 { type: 'PROMPT'|'SECTION', data: ... }
  const [dragOverTarget, setDragOverTarget] = useState(null); // 当前鼠标悬停的目标 ID (用于高亮显示)
  
  // 弹窗状态
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [targetSectionId, setTargetSectionId] = useState(null);

  // --- 初始化与数据加载 ---
  useEffect(() => {
    const localSections = localStorage.getItem('nanobanana_sections');
    const localTags = localStorage.getItem('nanobanana_tags');
    if (localSections) setSections(JSON.parse(localSections));
    if (localTags) setCommonTags(JSON.parse(localTags));
    else if (DATA_SOURCE_URL && DATA_SOURCE_URL.includes("http")) fetchCloudData();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      localStorage.setItem('nanobanana_sections', JSON.stringify(sections));
      localStorage.setItem('nanobanana_tags', JSON.stringify(commonTags));
    }
  }, [sections, commonTags, isAdmin]);

  const fetchCloudData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${DATA_SOURCE_URL}?t=${new Date().getTime()}`);
      if (!response.ok) throw new Error("连接失败");
      const data = await response.json();
      setSections(data.sections || []);
      setCommonTags(data.commonTags || []);
    } catch (err) {
      console.error(err);
      setLoadError("离线模式");
    } finally {
      setIsLoading(false);
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

  // --- 核心拖拽逻辑 (Mobile Style) ---

  // 1. 开始拖拽
  const handleDragStart = (e, type, item, sourceSecId = null) => {
    if (!isAdmin) {
      e.preventDefault();
      return;
    }
    setDraggedItem({ type, data: item, sourceSecId });
    e.dataTransfer.effectAllowed = "move";
    // 稍微延迟一点设置透明度，防止拖拽预览图也变透明
    setTimeout(() => {
      if(e.target) e.target.style.opacity = '0.4';
    }, 0);
  };

  // 2. 拖拽结束 (重置样式)
  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItem(null);
    setDragOverTarget(null);
  };

  // 3. 拖拽悬停 (高亮反馈)
  const handleDragEnter = (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    // 只有类型匹配时才高亮 (防止把提示词拖到分区标题上产生误导)
    if (draggedItem?.type === 'SECTION' && targetId.startsWith('sec-')) {
       setDragOverTarget(targetId);
    } else if (draggedItem?.type === 'PROMPT') {
       setDragOverTarget(targetId);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // 必须阻止默认行为才能 Drop
    e.dataTransfer.dropEffect = "move";
  };

  // 4. 放置 (Drop) - 核心逻辑
  const handleDrop = (e, targetId, targetType, targetSecId = null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);

    if (!draggedItem) return;

    const newSections = JSON.parse(JSON.stringify(sections));

    // A. 拖拽分区 (Section Reorder)
    if (draggedItem.type === 'SECTION' && targetType === 'SECTION') {
       const sourceIndex = newSections.findIndex(s => s.id === draggedItem.data.id);
       const targetIndex = newSections.findIndex(s => s.id === targetId);
       if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return;

       // 移动数组元素
       const [moved] = newSections.splice(sourceIndex, 1);
       newSections.splice(targetIndex, 0, moved);
       setSections(newSections);
    }

    // B. 拖拽提示词 (Prompt Reorder & Move)
    else if (draggedItem.type === 'PROMPT') {
       // 1. 先从源分区里把它拿出来
       const sourceSec = newSections.find(s => s.id === draggedItem.sourceSecId);
       const pIndex = sourceSec.prompts.findIndex(p => p.id === draggedItem.data.id);
       if (pIndex === -1) return;
       const [movedPrompt] = sourceSec.prompts.splice(pIndex, 1);

       // 2. 决定插入哪里
       if (targetType === 'PROMPT') {
          // 插到目标提示词所在的分区，目标提示词的前面
          const targetSec = newSections.find(s => s.id === targetSecId);
          const targetPIndex = targetSec.prompts.findIndex(p => p.id === targetId);
          // 如果拖到自己身上，或者找不到，就放回原处（或不做操作）
          // 这里我们简单处理：插入到目标位置
          targetSec.prompts.splice(targetPIndex, 0, movedPrompt);
       } else if (targetType === 'SECTION_AREA') {
          // 拖到了分区的空白处 -> 放到该分区最后
          const targetSec = newSections.find(s => s.id === targetId); // targetId 这里就是 sectionId
          targetSec.prompts.push(movedPrompt);
       }

       setSections(newSections);
    }
  };

  // --- CRUD 操作 ---
  const handleSavePrompt = (promptData) => {
    const newPrompt = { ...promptData, id: promptData.id || Date.now().toString() };
    setSections(prev => {
      // 编辑
      if (editingPrompt && editingPrompt.id) {
        return prev.map(sec => ({ ...sec, prompts: sec.prompts.map(p => p.id === newPrompt.id ? newPrompt : p) }));
      }
      // 新建
      const targetId = targetSectionId || prev[0].id;
      return prev.map(sec => {
        if (sec.id === targetId) return { ...sec, prompts: [...sec.prompts, newPrompt] };
        return sec;
      });
    });
    setIsPromptModalOpen(false);
    setEditingPrompt(null);
  };

  // 导出/导入/删除 (保持不变)
  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ sections, commonTags }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `data.json`; a.click();
  };
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
         try {
            const d = JSON.parse(ev.target.result);
            if(confirm("确定覆盖当前数据?")) { setSections(d.sections||[]); setCommonTags(d.commonTags||[]); }
         } catch(err){ alert("文件无效"); }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* 顶部导航 */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center text-white font-bold">N</div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block">Nanobanana</h1>
          </div>

          <div className="flex items-center space-x-3">
            {isLoading && <span className="text-xs text-indigo-500 animate-pulse flex items-center"><RefreshCw size={10} className="animate-spin mr-1"/>同步中</span>}
            
            <button onClick={() => setIsAdmin(!isAdmin)} className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium border ${isAdmin ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>
              {isAdmin ? <Unlock size={12} className="mr-1"/> : <Lock size={12} className="mr-1"/>}
              <span>{isAdmin ? '编辑模式' : '访客模式'}</span>
            </button>

            {isAdmin && (
              <>
                <div className="h-4 w-px bg-slate-200"></div>
                <button onClick={handleExport} className="p-2 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-slate-100"><Download size={18}/></button>
                <label className="p-2 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-slate-100 cursor-pointer"><Upload size={18}/><input type="file" accept=".json" className="hidden" onChange={handleImport}/></label>
                <button onClick={() => { setEditingPrompt(null); setTargetSectionId(sections[0]?.id || 'default'); setIsPromptModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 shadow-md">
                  <Plus size={14} /> <span>新建</span>
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* 搜索栏 */}
        <div className="border-t border-slate-100 bg-white/50 px-4 py-3 max-w-7xl mx-auto flex flex-col sm:flex-row gap-4">
           <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="搜索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
           </div>
           <div className="flex gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar py-1">
              {commonTags.map(tag => (
                <Tag key={tag} label={tag} isActive={selectedTags.includes(tag)} onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])} />
              ))}
           </div>
        </div>
      </header>

      {/* 主体 */}
      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        {loadError && !isAdmin && <div className="mb-4 p-3 bg-amber-50 text-amber-600 text-sm rounded-lg flex items-center"><Cloud size={16} className="mr-2"/> {loadError}</div>}

        {filteredSections.map(section => (
          <div 
            key={section.id} 
            // 只有当拖拽对象是 SECTION 时，这里才是有效的 Drop 区域
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, section.id)}
            onDrop={(e) => handleDrop(e, section.id, 'SECTION')}
            className={`mb-8 bg-white rounded-2xl p-6 shadow-sm border transition-all duration-200 ${dragOverTarget === section.id && draggedItem?.type === 'SECTION' ? 'border-indigo-500 ring-2 ring-indigo-100 transform scale-[1.01]' : 'border-slate-100'}`}
          >
            {/* 分区标题栏 */}
            <div className="flex justify-between items-center mb-4 select-none">
              <div className="flex items-center flex-1">
                {/* 🔴 只有按住这个把手才能拖动分区 */}
                {isAdmin && (
                  <div 
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'SECTION', section)}
                    onDragEnd={handleDragEnd}
                    className="mr-2 text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing p-1"
                  >
                    <GripVertical size={20} />
                  </div>
                )}
                <div onClick={() => setSections(prev => prev.map(s => s.id === section.id ? { ...s, isCollapsed: !s.isCollapsed } : s))} className="flex items-center cursor-pointer">
                   <ChevronDown size={16} className={`text-slate-500 mr-2 transition-transform ${section.isCollapsed ? '-rotate-90' : ''}`} />
                   <h2 className="text-lg font-bold text-slate-800">{section.title}</h2>
                   <span className="ml-2 bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full">{section.prompts.length}</span>
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                   <button onClick={() => { setEditingSection(section); setIsSectionModalOpen(true); }} className="text-slate-400 hover:text-indigo-500 p-1"><Edit2 size={14}/></button>
                   <button onClick={() => { if(confirm("删除分区?")) setSections(prev => prev.filter(s => s.id !== section.id)); }} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                </div>
              )}
            </div>
            
            {/* 提示词列表区域 */}
            {!section.isCollapsed && (
              <div 
                // 整个列表区域也是一个 Drop Zone，用于接收拖到空白处的提示词
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, section.id)} // 复用ID，但在 Drop 中通过 Type 区分
                onDrop={(e) => handleDrop(e, section.id, 'SECTION_AREA')}
                className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 min-h-[120px] transition-all rounded-xl p-2 ${dragOverTarget === section.id && draggedItem?.type === 'PROMPT' ? 'bg-indigo-50/50 ring-2 ring-indigo-200 border-dashed border-2 border-indigo-300' : ''}`}
              >
                {section.prompts.map(prompt => (
                  <div 
                    key={prompt.id} 
                    draggable={isAdmin}
                    onDragStart={(e) => handleDragStart(e, 'PROMPT', prompt, section.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, prompt.id)}
                    onDrop={(e) => handleDrop(e, prompt.id, 'PROMPT', section.id)}
                    onClick={(e) => { e.stopPropagation(); setEditingPrompt(prompt); setIsPromptModalOpen(true); }} 
                    className={`
                      group bg-slate-50 border rounded-xl overflow-hidden hover:shadow-md cursor-pointer transition-all aspect-[3/4] flex flex-col relative
                      ${dragOverTarget === prompt.id && draggedItem?.type === 'PROMPT' ? 'border-indigo-500 ring-2 ring-indigo-200 transform -translate-y-1 z-10' : 'border-slate-200'}
                      ${draggedItem?.data?.id === prompt.id ? 'opacity-30' : ''}
                    `}
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
                
                {/* 空状态占位 */}
                {section.prompts.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center text-slate-400 text-sm pointer-events-none">
                    <UploadCloud size={24} className="mb-2 opacity-50"/>
                    <span>{isAdmin ? '拖拽提示词到这里' : '暂无内容'}</span>
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

      {/* 弹窗：提示词编辑 */}
      {isPromptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col p-6 shadow-2xl">
            <div className="flex justify-between mb-4 border-b border-slate-100 pb-2">
               <h3 className="font-bold text-lg">{editingPrompt && !isAdmin ? editingPrompt.title : (editingPrompt ? '编辑' : '新建')}</h3>
               <button onClick={() => setIsPromptModalOpen(false)}><X size={20} className="text-slate-400"/></button>
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
                  <div className="p-4 bg-slate-50 rounded-lg font-mono text-sm border border-slate-200 select-all">{editingPrompt.content}</div>
                  <div className="flex gap-2">{editingPrompt.tags.map(t => <span key={t} className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs rounded">#{t}</span>)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 弹窗：分区编辑 */}
      {isSectionModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-80 shadow-xl">
               <h3 className="font-bold mb-4">分区名称</h3>
               <input id="sec-input" autoFocus defaultValue={editingSection?.title} className="w-full border p-2 rounded mb-4 outline-none focus:border-indigo-500" />
               <div className="flex justify-end gap-2">
                  <button onClick={() => setIsSectionModalOpen(false)} className="px-3 py-1 text-sm text-slate-500">取消</button>
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
                  }} className="px-3 py-1 text-sm bg-indigo-600 text-white rounded">确定</button>
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
         if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
         canvas.width = width; canvas.height = height;
         ctx.drawImage(img, 0, 0, width, height);
         setFormData(prev => ({ ...prev, image: canvas.toDataURL('image/jpeg', 0.7) }));
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
