import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookUser, Plus, ChevronDown, X, Users, Trash2, AlertTriangle } from 'lucide-react';
import { getAllChildren, saveChild, deleteChild } from '../../db';
import type { Child } from '../../types';
import { CLASS_LIST } from '../../constants';

export default function ChildList() {
  const navigate = useNavigate();

  // 读取当前教师的班级（必须在 useState 之前）
  let teacherClass = '';
  try {
    const u = JSON.parse(localStorage.getItem('edu_user') || '{}');
    if (u.role === 'teacher') teacherClass = u.data?.班级 || '';
  } catch {}

  const [children, setChildren] = useState<Child[]>([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickClass, setQuickClass] = useState(teacherClass || '');
  const [showBatchAdd, setShowBatchAdd] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchClass, setBatchClass] = useState(teacherClass || '');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const activeClassFilter = classFilter || teacherClass;

  const load = async () => setChildren(await getAllChildren());
  useEffect(() => { load(); }, []);

  // 快速添加单个
  const addQuick = async () => {
    if (!quickName.trim()) return;
    const child: Child = {
      id: crypto.randomUUID(),
      name: quickName.trim(),
      birthDate: '',
      class: quickClass,
      tags: [],
      notes: '',
      createdAt: new Date().toISOString(),
    };
    await saveChild(child);
    setQuickName('');
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteChild(id);
    setDeleteConfirm(null);
    load();
  };

  // 批量添加
  const addBatch = async () => {
    const names = batchText.split('\n').map(s => s.trim()).filter(Boolean);
    if (names.length === 0) return;
    const defaultClass = batchClass;
    for (const name of names) {
      const child: Child = {
        id: crypto.randomUUID(),
        name,
        birthDate: '',
        class: defaultClass,
        tags: [],
        notes: '',
        createdAt: new Date().toISOString(),
      };
      await saveChild(child);
    }
    setBatchText('');
    setShowBatchAdd(false);
    load();
  };

  const classes = CLASS_LIST.slice();

  const filtered = children.filter(c =>
    (c.name.includes(search)) &&
    (!activeClassFilter || c.class === activeClassFilter)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-main)]">幼儿档案</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            共 {filtered.length} 名幼儿{teacherClass ? ` · ${teacherClass}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowBatchAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-xl hover:bg-[var(--color-warm-bg)] transition-colors">
            <Users className="w-4 h-4" /> 批量添加
          </button>
          <button onClick={() => setShowQuickAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-dark)] transition-colors font-medium">
            <Plus className="w-4 h-4" /> 添加幼儿
          </button>
        </div>
      </div>

      {/* 搜索 + 班级筛选（教师只能看自己班，不显示筛选） */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-light)]" />
          <input type="text" placeholder="搜索幼儿姓名..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)]" />
        </div>
        {!teacherClass && (
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
            className="px-3 py-2.5 bg-white border border-[var(--color-border)] rounded-xl text-sm focus:outline-none">
            <option value="">全部班级</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* 快速添加栏 — 输入姓名按回车即添加 */}
      {showQuickAdd && (
        <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)] mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[var(--color-text-main)]">快速添加</span>
            <button onClick={() => setShowQuickAdd(false)} className="text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="输入幼儿姓名，按回车添加"
              value={quickName} onChange={e => setQuickName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addQuick()}
              className="flex-1 px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)]"
              autoFocus
            />
            <select value={quickClass}
              onChange={e => setQuickClass(e.target.value)}
              className="w-32 px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none">
              <option value="">选择班级</option>
              {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={addQuick} disabled={!quickName.trim()}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-dark)] disabled:opacity-50 text-sm">
              添加
            </button>
          </div>
          <p className="text-xs text-[var(--color-text-light)] mt-1.5">提示：输入姓名后按回车即可连续添加</p>
        </div>
      )}

      {/* 批量添加弹窗 */}
      {showBatchAdd && (
        <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)] mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[var(--color-text-main)]">批量添加幼儿</h3>
            <button onClick={() => setShowBatchAdd(false)} className="text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mb-3">
            <select value={batchClass}
              onChange={e => setBatchClass(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none mb-2">
              <option value="">选择班级（可选）</option>
              {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <textarea
              placeholder={'每行输入一个幼儿姓名，例如：\n张三\n李四\n王五'}
              value={batchText} onChange={e => setBatchText(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm resize-none focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
          <div className="flex gap-2 justify-between items-center">
            <span className="text-xs text-[var(--color-text-light)]">
              {batchText.split('\n').filter(s => s.trim()).length > 0
                ? `将添加 ${batchText.split('\n').filter(s => s.trim()).length} 名幼儿`
                : '请输入幼儿姓名'}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setShowBatchAdd(false)}
                className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-warm-bg)] rounded-lg">取消</button>
              <button onClick={addBatch} disabled={!batchText.trim()}
                className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] disabled:opacity-50">确认添加</button>
            </div>
          </div>
        </div>
      )}

      {/* 幼儿列表 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="relative group">
            <div onClick={() => navigate(`/幼儿档案/${c.id}`)}
              className="bg-white rounded-2xl p-5 border border-[var(--color-border)] hover:shadow-sm transition-shadow cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)] flex items-center justify-center mb-3 overflow-hidden">
                {c.avatar ? (
                  <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-[var(--color-primary-dark)]">{c.name[0]}</span>
                )}
              </div>
              <div className="font-semibold text-[var(--color-text-main)]">{c.name}</div>
              <div className="text-xs text-[var(--color-text-light)] mt-1">{c.class || '未设置班级'}</div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c.id); }}
              className="absolute top-2 right-2 w-7 h-7 bg-red-50 border border-red-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all text-red-400 hover:text-red-600"
              title="删除此幼儿">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-[var(--color-text-light)]">
            <BookUser className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">还没有幼儿档案</p>
            <button onClick={() => setShowQuickAdd(true)}
              className="mt-3 px-4 py-2 bg-[var(--color-primary)] text-white text-sm rounded-xl hover:bg-[var(--color-primary-dark)]">
              添加第一位幼儿
            </button>
          </div>
        )}
      </div>

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--color-text-main)]">确认删除</h3>
                <p className="text-xs text-[var(--color-text-light)] mt-0.5">此操作不可撤销</p>
              </div>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-5">
              确定要删除该幼儿及所有相关数据吗？包括观察记录、分析报告等数据将一并删除。
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-warm-bg)]">
                取消
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600">
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
