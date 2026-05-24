import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Calendar, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { getAllObservations, deleteObservation, getChild, getAllChildren } from '../../db';
import type { Observation, Child } from '../../types';

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

export default function ObservationList() {
  const navigate = useNavigate();
  const [observations, setObservations] = useState<(Observation & { childNames?: string })[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  const userStr = localStorage.getItem('edu_user');
  let userRole = 'teacher';
  let teacherClass = '';
  try {
    const u = JSON.parse(userStr || '{}');
    userRole = u.role || 'teacher';
    if (userRole === 'teacher') teacherClass = u.data?.班级 || '';
  } catch {}
  const isAdmin = userRole === 'admin';

  const load = async () => {
    const [list, allChildren] = await Promise.all([
      getAllObservations(),
      getAllChildren(),
    ]);
    setChildren(allChildren);
    const enriched = await Promise.all(
      list.map(async (obs) => {
        const names = (await Promise.all(
          obs.childIds.map(id => getChild(id))
        )).filter(Boolean).map(c => c!.name).join('、');
        return { ...obs, childNames: names || '未选择幼儿' };
      })
    );
    setObservations(enriched);
  };

  useEffect(() => { load(); }, []);

  const filtered = observations.filter(o =>
    (!search || o.whiteDescription.includes(search) || o.context?.includes(search) || (o.childNames?.includes(search))) &&
    (!classFilter || o.childIds.some(cid => {
      const ch = children.find(c => c.id === cid);
      return ch?.class === classFilter;
    })) &&
    (!teacherClass || o.childIds.some(cid => {
      const ch = children.find(c => c.id === cid);
      return ch?.class === teacherClass;
    }))
  );

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    try { await deleteObservation(id); load(); }
    catch (err) { console.error('删除失败:', err); }
  };

  const downloadObservationWord = async (obs: any) => {
    try {
      const res = await fetch('/api/download-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName: obs.childNames || '未命名',
          context: obs.context || '',
          date: formatDate(obs.date),
          description: obs.whiteDescription || '',
          childExpression: obs.childExpression || '',
          teacherDialogue: obs.teacherDialogue || '',
          summary: '',
          analysis: '',
          strategy: '',
          photos: [],
        }),
      });
      if (!res.ok) { alert('Word下载失败'); return; }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `观察记录_${obs.childNames || '未命名'}_${obs.date}.docx`;
      a.click();
    } catch { alert('Word下载失败'); }
  };

  // 按班级分组（管理员视图）
  const classes = [...new Set(children.map(c => c.class).filter(Boolean))].sort();
  const visibleClasses = isAdmin ? classes : (teacherClass ? [teacherClass] : []);
  const observationsByClass: Record<string, typeof filtered> = {};
  if (isAdmin || teacherClass) {
    visibleClasses.forEach(cls => {
      const obsForClass = filtered.filter(o =>
        o.childIds.some(cid => children.find(c => c.id === cid)?.class === cls)
      );
      if (obsForClass.length > 0) observationsByClass[cls] = obsForClass;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-main)]">
            幼析
            {isAdmin && <span className="text-sm font-normal ml-2 text-[var(--color-text-light)]">（全部教师 · 按班级查看）</span>}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {isAdmin ? `共 ${observations.length} 条观察记录` : '观察记录与分析报告'}
          </p>
        </div>
        <button onClick={() => navigate('/幼析/新建')}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-dark)] transition-colors font-medium">
          <Plus className="w-4 h-4" /> 新建观察
        </button>
      </div>

      {/* 搜索 + 班级筛选 */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-light)]" />
          <input type="text" placeholder={isAdmin ? "搜索观察记录..." : "搜索观察记录..."}
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-primary)]" />
        </div>
        {isAdmin && classes.length > 0 && (
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
            className="px-3 py-2.5 bg-white border border-[var(--color-border)] rounded-xl text-sm focus:outline-none min-w-[120px]">
            <option value="">全部班级</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {isAdmin && (
        <>
          {/* 管理员视图：按班级折叠展示 */}
          {Object.keys(observationsByClass).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(observationsByClass).map(([cls, obsList]) => (
                <div key={cls} className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
                  <button onClick={() => setExpandedClass(expandedClass === cls ? null : cls)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--color-warm-bg)] transition-colors text-left">
                    <div className="flex items-center gap-3">
                      {expandedClass === cls ? <ChevronDown className="w-4 h-4 text-[var(--color-text-light)]" /> : <ChevronRight className="w-4 h-4 text-[var(--color-text-light)]" />}
                      <span className="text-sm font-bold text-[var(--color-text-main)]">{cls}</span>
                      <span className="text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-full">{obsList.length} 条</span>
                    </div>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      const json = JSON.stringify(obsList, null, 2);
                      const blob = new Blob([json], { type: 'application/json' });
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = `观察记录_${cls}.json`;
                      a.click();
                    }}
                      className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
                      <Download className="w-3 h-3" /> 下载该班
                    </button>
                  </button>
                  {expandedClass === cls && (
                    <div className="divide-y divide-[var(--color-border)]">
                      {obsList.map(obs => (
                        <div key={obs.id} className="px-5 py-4 hover:bg-[var(--color-warm-bg)] cursor-pointer"
                          onClick={() => navigate(`/幼析/分析/${obs.id}`)}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-sm font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                                  {obs.childNames}
                                </span>
                                {obs.teacherName && (
                                  <span className="text-xs text-[var(--color-text-light)] bg-gray-100 px-2 py-0.5 rounded">
                                    👩‍🏫 {obs.teacherName}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-xs text-[var(--color-text-light)]">
                                  <Calendar className="w-3 h-3" /> {formatDate(obs.date)}
                                </span>
                              </div>
                              <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">{obs.whiteDescription.slice(0, 150)}...</p>
                            </div>
                            <div className="flex items-center gap-1 ml-3 shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); downloadObservationWord(obs); }}
                                className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-[var(--color-text-light)] hover:text-blue-500" title="下载">
                                <Download className="w-4 h-4" />
                              </button>
                              <button onClick={(e) => { navigate(`/幼析/分析/${obs.id}`); e.stopPropagation(); }}
                                className="p-1.5 hover:bg-[var(--color-warm-bg)] rounded-lg transition-colors" title="查看分析">
                                <Eye className="w-4 h-4 text-[var(--color-text-secondary)]" />
                              </button>
                              <button onClick={(e) => handleDelete(e, obs.id)}
                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-[var(--color-text-light)] hover:text-red-500" title="删除">
                                ×
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-[var(--color-text-light)] bg-white rounded-2xl border border-[var(--color-border)]">
              <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>暂无观察记录</p>
              <p className="text-xs mt-1">教师创建观察记录后将在这里按班级展示</p>
              <button onClick={() => navigate('/幼析/新建')}
                className="mt-3 px-4 py-2 bg-[var(--color-primary)] text-white text-sm rounded-xl hover:bg-[var(--color-primary-dark)]">
                新建观察
              </button>
            </div>
          )}
        </>
      )}

      {!isAdmin && (
        /* 普通教师：列表视图 */
        <div className="space-y-3">
          {filtered.map(obs => (
            <div key={obs.id}
              className="bg-white rounded-2xl p-5 border border-[var(--color-border)] hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2.5 py-0.5 rounded-full">
                      {obs.childNames}
                    </span>
                    {obs.teacherName && (
                      <span className="text-xs text-[var(--color-text-light)] bg-gray-100 px-2 py-0.5 rounded">
                        👩‍🏫 {obs.teacherName}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-[var(--color-text-light)]">
                      <Calendar className="w-3 h-3" /> {formatDate(obs.date)}
                    </span>
                    {obs.mediaUrls && obs.mediaUrls.length > 0 && (
                      <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">📷 {obs.mediaUrls.length}</span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">{obs.whiteDescription.slice(0, 150)}...</p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button onClick={() => navigate(`/幼析/分析/${obs.id}`)}
                    className="p-2 hover:bg-[var(--color-warm-bg)] rounded-lg transition-colors" title="查看分析">
                    <Eye className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  </button>
                  <button onClick={(e) => handleDelete(e, obs.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors text-[var(--color-text-light)] hover:text-red-500" title="删除">
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[var(--color-text-light)]">
              还没有观察记录，点击右上角「新建观察」开始吧
            </div>
          )}
        </div>
      )}
    </div>
  );
}
