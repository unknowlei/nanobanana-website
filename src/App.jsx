import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, X, Edit2, Trash2, ChevronDown, 
  Image as ImageIcon, FolderPlus, Save, Unlock, Lock,
  Download, Upload, RefreshCw, Cloud, Github
} from 'lucide-react';

/**
 * ==============================================================================
 * 👇👇👇 请将你在第一阶段获取的 RAW 链接粘贴到下面的引号里 👇👇👇
 * ==============================================================================
 */
const DATA_SOURCE_URL = "在此处粘贴你的链接"; 
// 例如: "https://raw.githubusercontent.com/zhangsan/nanobanana-data/main/data.json"

// --- 初始演示数据 ---
const INITIAL_TAGS = ["示例标签"];
const INITIAL_SECTIONS = [
  {
    id: 'demo',
    title: '👋 欢迎使用',
    isCollapsed: false,
    prompts: [
      {
        id: 'p1',
        title: '请配置数据源',
        content: '请按照教程将 GitHub data.json 的 Raw 链接填入 App.jsx 代码中。',
        image: '',
        tags: ['必读']
      }
    ]
  }
];

const Tag = ({ label, onClick, isActive }) => (
  <span onClick={onClick} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer select-none ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
    {label}
  </span>
);

export default function PromptBoxApp() {
  // 默认开启管理员模式，方便你本地第一次使用
  const [isAdmin, setIsAdmin] = useState(true); 
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [commonTags, setCommonTags] = useState(INITIAL_TAGS);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  
  // 模态框状态
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [targetSectionId, setTargetSectionId] = useState(null);

  // --- 1. 读取云端数据 ---
  useEffect(() => {
    // 只有当配置了有效链接，且当前不是刚刷新页面的瞬间，才尝试拉取
    if (DATA_SOURCE_URL && DATA_SOURCE_URL.includes("http")) {
      fetchCloudData();
    }
  }, []); // 只在页面加载时拉取一次

  const fetchCloudData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // 加上时间戳 ?t=... 强制浏览器不读取缓存，获取最新数据
      const response = await fetch(`${DATA_SOURCE_URL}?t=${new Date().getTime()}`);
      if (!response.ok) throw new Error("连接失败");
      const data = await response.json();
      
      if (data.sections) setSections(data.sections);
      if (data.commonTags) setCommonTags(data.commonTags);
      
      console.log("云端数据同步成功");
    } catch (err) {
      console.error(err);
      setLoadError("无法同步云端数据，正在使用本地/缓存数据");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. 导出数据 (生成 JSON 供上传) ---
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
    alert("数据已导出！\n请将下载的 data.json 上传到你的 GitHub 'nanobanana-data' 仓库中覆盖原文件，即可完成更新。");
  };

  // --- 3. 导入数据 (本地读取备份) ---
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if(confirm("确定要导入这份备份数据吗？当前页面内容将被覆盖。")) {
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

  // 搜索逻辑
  const filteredSections = sections.map(section => ({
    ...section,
    prompts: section.prompts.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags = selectedTags.length === 0 || selectedTags.every(t => p.tags.includes(t));
      return matchesSearch && matchesTags;
    })
  })).filter(section => section.prompts.length > 0 || (searchQuery === '' && selectedTags.length === 0));

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
                <button onClick={handleExport} title="第一步：导出数据" className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                  <Download size={14} /> <span>导出</span>
                </button>
                <label title="从备份恢复" className="p-2 text-slate-400 hover:text-indigo-600 cursor-pointer">
                  <Upload size={16} />
                  <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                </label>
                <button 
                  onClick={() => { setEditingPrompt(null); setTargetSectionId(sections[0]?.id || 'default'); setIsPromptModalOpen(true); }}
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
              <input type="text" placeholder="搜索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
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
          <div key={section.id} className="mb-8 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4 cursor-pointer select-none" onClick={() => {
                setSections(prev => prev.map(s => s.id === section.id ? { ...s, isCollapsed: !s.isCollapsed } : s));
            }}>
              <div className="flex items-center">
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
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {section.prompts.map(prompt => (
                  <div key={prompt.id} onClick={() => { setEditingPrompt(prompt); setIsPromptModalOpen(true); }} className="group bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:shadow-md cursor-pointer transition-all hover:-translate-y-1 aspect-[3/4] flex flex-col">
                    <div className="flex-1 bg-slate-200 relative overflow-hidden">
                      {prompt.image ? <img src={prompt.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={24}/></div>}
                    </div>
                    <div className="p-3 bg-white h-16">
                      <h3 className="font-bold text-sm truncate text-slate-800">{prompt.title}</h3>
                      <p className="text-[10px] text-slate-400 truncate mt-1">{prompt.tags.join(' ')}</p>
                    </div>
                  </div>
                ))}
                {section.prompts.length === 0 && <div className="col-span-full py-8 text-center text-slate-400 text-sm border-2 border-dashed rounded-xl">暂无内容，请新建</div>}
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

      {/* 编辑弹窗 */}
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
                  onSave={(data) => {
                     const newP = { ...data, id: data.id || Date.now().toString() };
                     setSections(prev => {
                        // 如果是编辑现有
                        if (editingPrompt && editingPrompt.id) {
                           return prev.map(s => ({ ...s, prompts: s.prompts.map(p => p.id === editingPrompt.id ? newP : p) }));
                        }
                        // 如果是新建
                        return prev.map(s => {
                           if(s.id === (targetSectionId || prev[0].id)) {
                              return { ...s, prompts: [...s.prompts, newP] };
                           }
                           return s;
                        });
                     });
                     setIsPromptModalOpen(false);
                  }} 
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

      {/* 分区名称编辑弹窗 */}
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

function PromptForm({ initialData, commonTags, setCommonTags, onSave, onDelete }) {
   const [formData, setFormData] = useState(initialData || { title: '', content: '', image: '', tags: [] });
   const [tagInput, setTagInput] = useState('');
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
            <label className="text-xs font-bold text-slate-500 block mb-1">配图链接</label>
            <div className="flex gap-2">
              <input value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} placeholder="推荐使用图片链接 (更稳定)" className="flex-1 border border-slate-200 p-2 rounded-lg text-sm outline-none focus:border-indigo-500" />
            </div>
            {/* 警告：直接上传大图可能导致 JSON 文件过大，建议用外链 */}
            <div className="mt-1 text-[10px] text-slate-400">为了保持数据轻便，建议填写图片网址。</div>
         </div>
         <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">标签</label>
            <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
               {commonTags.map(t => <button key={t} onClick={() => setFormData(p => ({...p, tags: p.tags.includes(t)?p.tags.filter(x=>x!==t):[...p.tags, t]}))} className={`text-xs px-2 py-1 rounded transition-colors ${formData.tags.includes(t)?'bg-indigo-500 text-white shadow-md':'bg-white text-slate-600 border border-slate-200'}`}>{t}</button>)}
               <input value={tagInput} onChange={e=>setTagInput(e.target.value)} placeholder="+新建标签" className="w-20 text-xs bg-transparent border-b border-slate-300 outline-none focus:border-indigo-500 px-1" onKeyDown={e=>{if(e.key==='Enter'&&tagInput){setCommonTags([...commonTags, tagInput]); setTagInput('');}}}/>
            </div>
         </div>
         <div className="flex justify-between pt-4 mt-4 border-t border-slate-100">
            {initialData && initialData.id && <button onClick={() => onDelete(initialData.id)} className="text-red-500 text-sm hover:underline">删除此卡片</button>}
            <button onClick={() => onSave(formData)} className="bg-indigo-600 text-white px-8 py-2 rounded-lg text-sm ml-auto hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">保存</button>
         </div>
      </div>
   );
}
