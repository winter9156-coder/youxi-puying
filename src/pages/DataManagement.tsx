import { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, Cloud, Users, FileText, Eye, Lightbulb, MessageSquare, ChevronDown, ChevronRight, BookUser, Camera, Image, X, GraduationCap, Baby } from 'lucide-react';

const API = '';

const tableLabels: Record<string, string> = {
  children: '幼儿档案', observations: '观察记录', analysis_reports: '分析报告',
  education_plans: '教育方案', communication_records: '沟通记录',
  teachers: '教师账号', classes: '班级', app_settings: '系统设置',
};

export default function DataManagement() {
  const [data, setData] = useState<Record<string, any[]> | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [userData, setUserData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const [mode, setMode] = useState<'content' | 'tables'>('content');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [mediaCache, setMediaCache] = useState<Record<string, string>>({});
  const [loadingMedia, setLoadingMedia] = useState<Record<string, boolean>>({});

  const token = localStorage.getItem('edu_token');
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const fetchData = async () => {
    setLoading(true); setErrMsg('');
    try {
      const [dataRes, statsRes, usersRes] = await Promise.all([
        fetch(`${API}/api/admin/data`, { headers }),
        fetch(`${API}/api/admin/stats`, { headers }),
        fetch(`${API}/api/admin/users`, { headers }),
      ]);
      if (!dataRes.ok || !statsRes.ok || !usersRes.ok) { setErrMsg('数据加载失败'); setLoading(false); return; }
      const d = await dataRes.json();
      const s = await statsRes.json();
      const u = await usersRes.json();
      setData(d); setStats(s); setUserData(u.users || []);
    } catch (e) { setErrMsg('请求失败: ' + (e as Error).message); }
    setLoading(false);
  };

  const downloadAll = async () => {
    const res = await fetch(`${API}/api/admin/data/download`, { headers });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `youxi-full-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const downloadUserData = () => {
    const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `用户数据包-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const backupToCOS = async () => {
    setBackupMsg('备份中...');
    try {
      const res = await fetch(`${API}/api/admin/backup-to-cos`, { method: 'POST', headers });
      const d = await res.json();
      setBackupMsg(d.success ? '备份成功！已保存到 COS' : `备份失败: ${d.error}`);
    } catch (e) { setBackupMsg(`备份失败: ${(e as Error).message}`); }
    setTimeout(() => setBackupMsg(''), 5000);
  };

  useEffect(() => { fetchData(); }, []);

  // 数据加载后自动加载所有观察记录的媒体
  useEffect(() => {
    if (!data?.observations) return;
    data.observations.forEach((o: any) => {
      if (o.mediaUrls?.length) loadMediaForObs(o);
    });
  }, [data, loadMediaForObs]);

  // 按班级统计幼儿
  function getClassChildren() {
    if (!data) return {};
    const children = data.children || [];
    const map: Record<string, any[]> = {};
    children.forEach((c: any) => {
      const cls = c.class || '未分班';
      if (!map[cls]) map[cls] = [];
      map[cls].push(c);
    });
    return map;
  }

  // 按班级统计教师
  function getClassTeachers() {
    const map: Record<string, any[]> = {};
    userData.forEach(u => {
      if (u.role === 'admin') return;
      const cls = u.data?.班级 || '未分班';
      if (!map[cls]) map[cls] = [];
      map[cls].push(u);
    });
    return map;
  }

  const classChildren = getClassChildren();
  const classTeachers = getClassTeachers();
  const allClasses = Array.from(new Set([...Object.keys(classChildren), ...Object.keys(classTeachers)])).sort();

  const loadMediaForObs = useCallback(async (obs: any): Promise<string[]> => {
    if (!obs?.mediaUrls?.length) return [];
    const urls: string[] = [];
    for (const mediaId of obs.mediaUrls) {
      if (mediaCache[mediaId]) { urls.push(mediaCache[mediaId]); continue; }
      try {
        const res = await fetch(`/api/media/${mediaId}`);
        if (!res.ok) throw new Error('加载失败');
        const blob = await res.blob();
        if (blob) {
          const url = URL.createObjectURL(blob);
          setMediaCache(prev => ({ ...prev, [mediaId]: url }));
          urls.push(url);
        }
      } catch (e) { console.error('加载媒体失败', mediaId, e); }
    }
    return urls;
  }, [mediaCache]);

  const downloadMedia = useCallback(async (mediaId: string, index: number) => {
    try {
      const res = await fetch(`/api/media/${mediaId}`);
      if (!res.ok) { alert('文件不存在'); return; }
      const blob = await res.blob();
      const ext = blob.type.includes('png') ? 'png' : blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg' : 'bin';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `观察照片_${index + 1}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: any) { alert('下载失败: ' + e.message); }
  }, []);

  const downloadObsMedia = useCallback(async (obs: any) => {
    if (!obs?.mediaUrls?.length) return;
    for (let i = 0; i < obs.mediaUrls.length; i++) {
      await downloadMedia(obs.mediaUrls[i], i);
    }
  }, [downloadMedia]);

  useEffect(() => {
    return () => { Object.values(mediaCache).forEach(url => URL.revokeObjectURL(url)); };
  }, []);

  const obsCount = data?.observations?.length || 0;
  const reportsCount = data?.analysis_reports?.length || 0;
  const plansCount = data?.education_plans?.length || 0;
  const commsCount = data?.communication_records?.length || 0;
  const childrenCount = data?.children?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-main)]">数据管理</h1>
          <p className="text-sm text-[var(--color-text-light)] mt-1">
            {userData.length} 个用户 · {allClasses.length} 个班级 · {childrenCount} 名幼儿 ·{' '}
            {obsCount} 条观察 · {reportsCount} 份报告
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadUserData}
            className="flex items-center gap-1.5 px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm font-medium hover:bg-[var(--color-warm-bg)] transition-colors">
            <Users className="w-4 h-4" /> 下载用户包
          </button>
          <button onClick={downloadAll}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors">
            <Download className="w-4 h-4" /> 下载全部
          </button>
          <button onClick={backupToCOS}
            className="flex items-center gap-1.5 px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm font-medium hover:bg-[var(--color-warm-bg)] transition-colors">
            <Cloud className="w-4 h-4" /> COS备份
          </button>
          <button onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm font-medium hover:bg-[var(--color-warm-bg)] transition-colors">
            <RefreshCw className="w-4 h-4" /> 刷新
          </button>
        </div>
      </div>

      {backupMsg && <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm">{backupMsg}</div>}

      {/* 模式切换 */}
      <div className="flex gap-2">
        <button onClick={() => setMode('content')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${mode === 'content' ? 'bg-[var(--color-primary)] text-white' : 'bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-warm-bg)]'}`}>
          <FileText className="w-4 h-4 inline mr-1.5" />数据总览
        </button>
        <button onClick={() => setMode('tables')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${mode === 'tables' ? 'bg-[var(--color-primary)] text-white' : 'bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-warm-bg)]'}`}>
          <Users className="w-4 h-4 inline mr-1.5" />用户数据包
        </button>
      </div>

      {/* ===== 数据总览 ===== */}
      {mode === 'content' && data && (
        <div className="space-y-4">
          {/* 数据概览卡片 */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { icon: GraduationCap, label: '班级', count: allClasses.length, color: 'text-indigo-600 bg-indigo-50' },
              { icon: Baby, label: '幼儿', count: childrenCount, color: 'text-blue-600 bg-blue-50' },
              { icon: Eye, label: '观察记录', count: obsCount, color: 'text-green-600 bg-green-50' },
              { icon: FileText, label: '分析报告', count: reportsCount, color: 'text-purple-600 bg-purple-50' },
              { icon: Lightbulb, label: '教育方案', count: plansCount, color: 'text-orange-600 bg-orange-50' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-xl p-4 border border-[var(--color-border)]">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="text-xl font-bold text-[var(--color-text-main)]">{item.count}</div>
                <div className="text-xs text-[var(--color-text-light)] mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>

          {/* 按班级汇总 */}
          {allClasses.length > 0 && (
            <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--color-border)]">
                <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                  <GraduationCap className="w-4 h-4 inline mr-1.5" />
                  班级汇总（{allClasses.length}个班级）
                </h3>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {allClasses.map(cls => (
                  <div key={cls}>
                    <button onClick={() => setExpandedUser(expandedUser === `cls-${cls}` ? null : `cls-${cls}`)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--color-warm-bg)] transition-colors text-left">
                      <div className="flex items-center gap-3">
                        {expandedUser === `cls-${cls}` ? <ChevronDown className="w-4 h-4 text-[var(--color-text-light)]" /> : <ChevronRight className="w-4 h-4 text-[var(--color-text-light)]" />}
                        <span className="text-sm font-medium text-[var(--color-text-main)]">{cls}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{(classChildren[cls] || []).length} 名幼儿</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">{(classTeachers[cls] || []).length} 名教师</span>
                      </div>
                    </button>
                    {expandedUser === `cls-${cls}` && (
                      <div className="px-5 pb-3 pl-14 space-y-2">
                        {/* 教师列表 */}
                        {(classTeachers[cls] || []).length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-[var(--color-text-light)]">教师：</span>
                            {(classTeachers[cls] || []).map((t: any) => (
                              <span key={t.name} className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700">{t.name}</span>
                            ))}
                          </div>
                        )}
                        {/* 幼儿列表 */}
                        {(classChildren[cls] || []).length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-[var(--color-text-light)]">幼儿：</span>
                            {(classChildren[cls] || []).map((c: any) => (
                              <span key={c.id} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">{c.name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 观察记录详情 */}
          {data.observations && data.observations.length > 0 && (
            <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--color-border)]">
                <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                  <Eye className="w-4 h-4 inline mr-1.5" />
                  观察记录（{data.observations.length}条）
                </h3>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {data.observations.map((o: any) => (
                  <div key={o.id} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded">
                        {o.date}
                      </span>
                      {o.context && (
                        <span className="text-xs text-[var(--color-text-light)]">{o.context}</span>
                      )}
                      {o.teacherName && (
                        <span className="text-xs text-[var(--color-text-secondary)] bg-gray-100 px-2 py-0.5 rounded">
                          {o.teacherName}
                        </span>
                      )}
                      {o.mediaUrls?.length > 0 && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          {o.mediaUrls.length} 张
                        </span>
                      )}
                    </div>
                    {o.whiteDescription && (
                      <p className="text-sm text-[var(--color-text-main)] line-clamp-3 leading-relaxed mb-2">
                        {o.whiteDescription}
                      </p>
                    )}
                    {o.mediaUrls?.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        {o.mediaUrls.map((mediaId: string, i: number) => (
                          <div key={mediaId} className="relative">
                            {mediaCache[mediaId] ? (
                              <img src={mediaCache[mediaId]} alt={`照片${i+1}`}
                                className="w-14 h-14 object-cover rounded border border-[var(--color-border)] cursor-pointer hover:opacity-80"
                                onClick={(e) => { e.stopPropagation(); window.open(mediaCache[mediaId], '_blank'); }}
                              />
                            ) : (
                              <div className="w-14 h-14 bg-gray-100 rounded border border-[var(--color-border)] flex items-center justify-center text-xs text-gray-400">
                                加载中
                              </div>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={(e) => { e.stopPropagation(); downloadObsMedia(o); }}
                          className="ml-1 text-xs text-[var(--color-primary)] hover:underline flex items-center gap-0.5 self-end pb-1"
                        >
                          下载全部
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 分析报告详情 */}
          {data.analysis_reports && data.analysis_reports.length > 0 && (
            <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--color-border)]">
                <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                  <FileText className="w-4 h-4 inline mr-1.5" />
                  分析报告（{data.analysis_reports.length}份）
                </h3>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {data.analysis_reports.map((r: any) => (
                  <div key={r.id} className="px-5 py-4">
                    {r.caseAnalysis && (
                      <div className="text-sm text-[var(--color-text-main)] whitespace-pre-wrap line-clamp-4 leading-relaxed bg-[var(--color-warm-bg)] rounded-xl p-3">
                        {r.caseAnalysis.substring(0, 300)}
                        {r.caseAnalysis.length > 300 && '...'}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        r.status === 'confirmed' ? 'bg-green-100 text-green-700' : r.status === 'modified' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {r.status === 'confirmed' ? '已确认' : r.status === 'modified' ? '已修改' : '草稿'}
                      </span>
                      {r.createdAt && <span className="text-[10px] text-[var(--color-text-light)]">{r.createdAt}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 全部幼儿列表 */}
          {data.children && data.children.length > 0 && (
            <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--color-border)]">
                <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                  <Baby className="w-4 h-4 inline mr-1.5" />
                  全部幼儿（{data.children.length}名）
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-px bg-[var(--color-border)]">
                {data.children.map((c: any) => (
                  <div key={c.id} className="bg-white px-4 py-3">
                    <div className="text-sm font-medium text-[var(--color-text-main)]">{c.name}</div>
                    <div className="text-xs text-[var(--color-text-light)] mt-0.5">{c.class || '未分班'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 无数据提示 */}
          {childrenCount === 0 && obsCount === 0 && reportsCount === 0 && (
            <div className="text-center py-12 text-sm text-[var(--color-text-light)] bg-white rounded-xl border border-[var(--color-border)]">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>暂无数据</p>
              <p className="text-xs mt-1">教师使用幼析或育见创建内容后，将在这里展示</p>
            </div>
          )}
        </div>
      )}

      {/* ===== 用户数据包 ===== */}
      {mode === 'tables' && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <h2 className="text-base font-bold text-[var(--color-text-main)]">
              <Users className="w-4 h-4 inline mr-1.5" />
              用户数据包（{userData.length}人）
            </h2>
            <button onClick={downloadUserData} className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
              <Download className="w-3 h-3" /> 下载JSON
            </button>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {userData.map((u: any) => (
              <div key={u.name}>
                <button onClick={() => setExpandedUser(expandedUser === u.name ? null : u.name)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--color-warm-bg)] transition-colors text-left">
                  <div className="flex items-center gap-3">
                    {expandedUser === u.name ? <ChevronDown className="w-4 h-4 text-[var(--color-text-light)]" /> : <ChevronRight className="w-4 h-4 text-[var(--color-text-light)]" />}
                    <span className="text-sm font-medium text-[var(--color-text-main)]">{u.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {u.role === 'admin' ? '管理员' : '教师'}
                    </span>
                    {u.data?.班级 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">{u.data.班级}</span>
                    )}
                  </div>
                </button>
                {expandedUser === u.name && u.data && (
                  <div className="px-5 pb-3 pl-14">
                    <div className="bg-[var(--color-warm-bg)] rounded-xl p-3">
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(u.data).map(([key, val]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-xs text-[var(--color-text-light)]">{key}：</span>
                            <span className="text-xs font-medium text-[var(--color-text-main)]">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {errMsg && (
        <div className="text-center py-12">
          <p className="text-sm text-red-500 mb-4">{errMsg}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm">重新加载</button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 mr-2 animate-spin text-[var(--color-primary)]" />
          <span className="text-sm text-[var(--color-text-light)]">加载中...</span>
        </div>
      )}
    </div>
  );
}
