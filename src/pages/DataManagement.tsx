import { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, Cloud, Users, FileText, Eye, Lightbulb, ChevronDown, ChevronRight, GraduationCap, Baby, Camera, X, ZoomIn } from 'lucide-react';

const API = '';

interface MediaItem {
  id: string;
  url: string;
  loading: boolean;
  error: boolean;
}

export default function DataManagement() {
  const [data, setData] = useState<Record<string, any[]> | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [userData, setUserData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const [mode, setMode] = useState<'content' | 'tables'>('content');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [mediaMap, setMediaMap] = useState<Record<string, MediaItem>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const token = localStorage.getItem('edu_token');
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const [dataRes, statsRes, usersRes] = await Promise.all([
        fetch(`${API}/api/admin/data`, { headers }),
        fetch(`${API}/api/admin/stats`, { headers }),
        fetch(`${API}/api/admin/users`, { headers }),
      ]);
      if (!dataRes.ok || !statsRes.ok || !usersRes.ok) {
        setErrMsg(`数据加载失败 (${[dataRes.status, statsRes.status, usersRes.status].join('/')})`);
        setLoading(false);
        return;
      }
      const d = await dataRes.json();
      const s = await statsRes.json();
      const u = await usersRes.json();
      setData(d);
      setStats(s);
      setUserData(Array.isArray(u.users) ? u.users : []);
    } catch (e: any) {
      setErrMsg('请求失败: ' + (e?.message || '未知错误'));
    }
    setLoading(false);
  }, []);

  const loadMediaForObs = useCallback(async (obs: any) => {
    if (!obs?.mediaUrls?.length) return;
    for (const mediaId of obs.mediaUrls) {
      if (mediaMap[mediaId]?.url) continue;
      setMediaMap(prev => ({ ...prev, [mediaId]: { id: mediaId, url: '', loading: true, error: false } }));
      try {
        const res = await fetch(`/api/media/${mediaId}`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const blob = await res.blob();
        if (blob && blob.size > 0) {
          const url = URL.createObjectURL(blob);
          setMediaMap(prev => ({ ...prev, [mediaId]: { id: mediaId, url, loading: false, error: false } }));
        } else {
          setMediaMap(prev => ({ ...prev, [mediaId]: { id: mediaId, url: '', loading: false, error: true } }));
        }
      } catch {
        setMediaMap(prev => ({ ...prev, [mediaId]: { id: mediaId, url: '', loading: false, error: true } }));
      }
    }
  }, [mediaMap]);

  const downloadSingleMedia = useCallback(async (mediaId: string, filename: string) => {
    try {
      const res = await fetch(`/api/media/${mediaId}`);
      if (!res.ok) { alert('文件不存在或已过期'); return; }
      const blob = await res.blob();
      const ct = blob.type || '';
      const ext = ct.includes('png') ? 'png' : ct.includes('jpeg') || ct.includes('jpg') ? 'jpg' : ct.includes('gif') ? 'gif' : ct.includes('webp') ? 'webp' : 'bin';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename + '.' + ext;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (e: any) {
      alert('下载失败: ' + (e?.message || ''));
    }
  }, []);

  const downloadAllMedia = useCallback(async (obs: any) => {
    if (!obs?.mediaUrls?.length) { alert('该记录没有附件'); return; }
    const teacherName = obs.teacherName || '未知教师';
    const date = obs.date || 'unknown';
    for (let i = 0; i < obs.mediaUrls.length; i++) {
      await downloadSingleMedia(obs.mediaUrls[i], `${teacherName}_${date}_照片${i + 1}`);
    }
  }, [downloadSingleMedia]);

  const downloadAll = async () => {
    try {
      const res = await fetch(`${API}/api/admin/data/download`, { headers });
      if (!res.ok) { alert('下载失败'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `幼析育见-全量数据-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (e: any) {
      alert('下载失败: ' + (e?.message || ''));
    }
  };

  const downloadUserData = () => {
    const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `用户数据包-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  const backupToCOS = async () => {
    setBackupMsg('备份中...');
    try {
      const res = await fetch(`${API}/api/admin/backup-to-cos`, { method: 'POST', headers });
      const d = await res.json();
      setBackupMsg(d.success ? '备份成功！已保存到 COS' : `备份失败: ${d.error}`);
    } catch (e: any) { setBackupMsg(`备份失败: ${(e as Error).message}`); }
    setTimeout(() => setBackupMsg(''), 5000);
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  // 数据加载后自动加载所有观察记录的媒体
  useEffect(() => {
    if (!data?.observations?.length) return;
    data.observations.forEach((o: any) => {
      if (o.mediaUrls?.length) loadMediaForObs(o);
    });
  }, [data, loadMediaForObs]);

  // 清理 media URLs
  useEffect(() => {
    return () => {
      Object.values(mediaMap).forEach(m => {
        if (m.url) URL.revokeObjectURL(m.url);
      });
    };
  }, []);

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

  const obsCount = data?.observations?.length || 0;
  const reportsCount = data?.analysis_reports?.length || 0;
  const plansCount = data?.education_plans?.length || 0;
  const commsCount = data?.communication_records?.length || 0;
  const childrenCount = data?.children?.length || 0;

  return (
    <div className="space-y-6">
      {/* 图片预览弹窗 */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-8"
          onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-full">
            <button onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm flex items-center gap-1">
              <X className="w-4 h-4" /> 关闭
            </button>
            <img src={previewImage} alt="预览" className="max-w-full max-h-[80vh] rounded-lg shadow-2xl" />
          </div>
        </div>
      )}

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
            <Users className="w-4 h-4" /> 用户包
          </button>
          <button onClick={downloadAll}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors">
            <Download className="w-4 h-4" /> 全部数据
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

      {backupMsg && (
        <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">{backupMsg}</div>
      )}

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

      {/* 加载中 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 mr-2 animate-spin text-[var(--color-primary)]" />
          <span className="text-sm text-[var(--color-text-light)]">加载数据中...</span>
        </div>
      )}

      {/* 错误 */}
      {errMsg && !loading && (
        <div className="text-center py-12">
          <p className="text-sm text-red-500 mb-4">{errMsg}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm">重新加载</button>
        </div>
      )}

      {/* ===== 数据总览 ===== */}
      {mode === 'content' && data && !loading && !errMsg && (
        <div className="space-y-4">
          {/* 统计卡片 */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
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

          {/* 按班级汇总（始终显示） */}
          {allClasses.length > 0 && (
            <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--color-border)]">
                <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                  <GraduationCap className="w-4 h-4 inline mr-1.5" />
                  班级汇总（{allClasses.length}个班级 · {(classTeachers['未分班'] || []).filter(t => !t.data?.班级).length > 0 ? '含未分班教师' : '全部分配'}）
                </h3>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {allClasses.map(cls => {
                  const teachers = classTeachers[cls] || [];
                  const children = classChildren[cls] || [];
                  const isExpanded = expandedUser === `cls-${cls}`;
                  return (
                    <div key={cls}>
                      <button onClick={() => setExpandedUser(isExpanded ? null : `cls-${cls}`)}
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--color-warm-bg)] transition-colors text-left">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--color-text-light)]" /> : <ChevronRight className="w-4 h-4 text-[var(--color-text-light)]" />}
                          <span className="text-sm font-medium text-[var(--color-text-main)]">{cls}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">{teachers.length} 名教师</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{children.length} 名幼儿</span>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-5 pb-3 pl-14 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-[var(--color-text-light)]">教师：</span>
                            {teachers.length > 0 ? teachers.map((t: any) => (
                              <span key={t.id || t.name} className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 font-medium">{t.name}</span>
                            )) : <span className="text-xs text-gray-400">暂无</span>}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-[var(--color-text-light)]">幼儿：</span>
                            {children.length > 0 ? children.map((c: any) => (
                              <span key={c.id} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">{c.name}</span>
                            )) : <span className="text-xs text-gray-400">暂无</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 观察记录详情 */}
          {obsCount > 0 && (
            <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--color-border)]">
                <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                  <Eye className="w-4 h-4 inline mr-1.5" />
                  观察记录（{obsCount}条）— 含 {Object.keys(mediaMap).length} 个媒体文件
                </h3>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {data.observations.map((o: any) => (
                  <div key={o.id} className="px-5 py-4">
                    {/* 元信息行 */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {o.teacherName && (
                        <span className="text-xs font-medium text-white bg-[var(--color-primary)] px-2 py-0.5 rounded">
                          {o.teacherName}
                        </span>
                      )}
                      <span className="text-xs text-[var(--color-text-light)] bg-gray-100 px-2 py-0.5 rounded">
                        {o.date || '未知日期'}
                      </span>
                      {o.context && (
                        <span className="text-xs text-[var(--color-text-secondary)]">{o.context}</span>
                      )}
                      {o.mediaUrls?.length > 0 && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Camera className="w-3 h-3" /> {o.mediaUrls.length} 张
                        </span>
                      )}
                    </div>
                    {/* 观察描述 */}
                    {o.whiteDescription && (
                      <p className="text-sm text-[var(--color-text-main)] leading-relaxed mb-2 whitespace-pre-wrap">
                        {o.whiteDescription}
                      </p>
                    )}
                    {/* 媒体文件 */}
                    {o.mediaUrls?.length > 0 && (
                      <div className="flex items-start gap-2 flex-wrap mt-2">
                        {o.mediaUrls.map((mediaId: string, i: number) => {
                          const media = mediaMap[mediaId];
                          return (
                            <div key={mediaId} className="relative group">
                              {media?.url ? (
                                <img src={media.url} alt={`照片${i + 1}`}
                                  className="w-20 h-20 object-cover rounded-lg border border-[var(--color-border)] cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setPreviewImage(media.url)}
                                />
                              ) : media?.loading ? (
                                <div className="w-20 h-20 bg-gray-100 rounded-lg border border-[var(--color-border)] flex items-center justify-center">
                                  <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                                </div>
                              ) : (
                                <div className="w-20 h-20 bg-gray-50 rounded-lg border border-[var(--color-border)] flex items-center justify-center text-xs text-gray-400">
                                  加载失败
                                </div>
                              )}
                              {/* 单张下载按钮 */}
                              <button onClick={() => downloadSingleMedia(mediaId, `照片${i + 1}`)}
                                className="absolute bottom-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Download className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                        <button onClick={() => downloadAllMedia(o)}
                          className="ml-1 text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1 self-end pb-1">
                          <Download className="w-3 h-3" /> 下载全部
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 分析报告详情 */}
          {reportsCount > 0 && (
            <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--color-border)]">
                <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                  <FileText className="w-4 h-4 inline mr-1.5" />
                  分析报告（{reportsCount}份）
                </h3>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {data.analysis_reports.map((r: any) => (
                  <div key={r.id} className="px-5 py-4">
                    {r.caseAnalysis && (
                      <div className="text-sm text-[var(--color-text-main)] whitespace-pre-wrap line-clamp-4 leading-relaxed bg-[var(--color-warm-bg)] rounded-xl p-3">
                        {r.caseAnalysis.substring(0, 500)}
                        {r.caseAnalysis.length > 500 && '...'}
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
          {childrenCount > 0 && (
            <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--color-border)]">
                <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                  <Baby className="w-4 h-4 inline mr-1.5" />
                  全部幼儿（{childrenCount}名）
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

          {/* 无数据提示（仅当所有数据项都为空时显示） */}
          {childrenCount === 0 && obsCount === 0 && reportsCount === 0 && plansCount === 0 && (
            <div className="text-center py-12 text-sm text-[var(--color-text-light)] bg-white rounded-xl border border-[var(--color-border)]">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>暂无观察记录和分析报告</p>
              <p className="text-xs mt-1">教师使用「幼析」创建观察记录后，将在这里展示（含图片和文字）</p>
              <p className="text-xs mt-1">教师使用「育见」创建教育方案后，也将在这里展示</p>
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
            {userData.map((u: any) => {
              const isExpanded = expandedUser === u.name;
              return (
                <div key={u.id || u.name}>
                  <button onClick={() => setExpandedUser(isExpanded ? null : u.name)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--color-warm-bg)] transition-colors text-left">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--color-text-light)]" /> : <ChevronRight className="w-4 h-4 text-[var(--color-text-light)]" />}
                      <span className="text-sm font-medium text-[var(--color-text-main)]">{u.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {u.role === 'admin' ? '管理员' : '教师'}
                      </span>
                      {u.data?.班级 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">{u.data.班级}</span>
                      )}
                    </div>
                  </button>
                  {isExpanded && u.data && (
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
