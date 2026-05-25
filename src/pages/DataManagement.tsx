import { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, Cloud, Users, FileText, Eye, Lightbulb, MessageSquare, ChevronDown, ChevronRight, BookUser, Camera, Image, X } from 'lucide-react';

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
      setBackupMsg(d.success ? '✅ 备份成功！已保存到 COS' : `❌ 备份失败: ${d.error}`);
    } catch (e) { setBackupMsg(`❌ 备份失败: ${(e as Error).message}`); }
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

  // 合并用户数据与内容
  function getUserContent() {
    if (!data) return [];
    const obs = data.observations || [];
    const reports = data.analysis_reports || [];
    const plans = data.education_plans || [];
    const comms = data.communication_records || [];
    const children = data.children || [];

    // 按教师姓名分组
    const byTeacher: Record<string, any> = {};
    userData.forEach(u => {
      byTeacher[u.name] = {
        ...u,
        observations: [],
        reports: [],
        plans: [],
        communications: [],
        childrenCount: 0,
        totalContent: 0,
      };
    });

    // 观察记录 → 找不到明确的 teacher_id 字段，用数据中的信息关联
    // 这里假设观察记录归所有教师所有（共享数据）
    // 实际中可以通过 teacher_id 或创建者来关联
    obs.forEach(o => {
      // 观察记录属于创建它的教师，但当前数据中没有 teacher_id 字段
      // 所以先计入总览
    });

    // 将观察记录/报告等关联到教师
    // 由于当前模型没有 teacher_id 关联，先显示总体统计
    return { byTeacher, summary: { obs: obs.length, reports: reports.length, plans: plans.length, comms: comms.length, children: children.length } };
  }

  const content = getUserContent();

  // 加载单条观察记录的所有媒体，返回 object URL 数组（带缓存）
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

  // 下载单张媒体
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

  // 下载整条观察记录的所有媒体
  const downloadObsMedia = useCallback(async (obs: any) => {
    if (!obs?.mediaUrls?.length) return;
    for (let i = 0; i < obs.mediaUrls.length; i++) {
      await downloadMedia(obs.mediaUrls[i], i);
    }
  }, [downloadMedia]);

  // 组件卸载时清理所有 object URL
  useEffect(() => {
    return () => { Object.values(mediaCache).forEach(url => URL.revokeObjectURL(url)); };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-main)]">📊 数据管理</h1>
          <p className="text-sm text-[var(--color-text-light)] mt-1">
            {stats?.users || 0} 个用户 ·{' '}
            {(content as any).summary?.obs || 0} 条观察 ·{' '}
            {(content as any).summary?.reports || 0} 份报告 ·{' '}
            {(content as any).summary?.plans || 0} 个方案
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
          <FileText className="w-4 h-4 inline mr-1.5" />教师内容总览
        </button>
        <button onClick={() => setMode('tables')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${mode === 'tables' ? 'bg-[var(--color-primary)] text-white' : 'bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-warm-bg)]'}`}>
          <Users className="w-4 h-4 inline mr-1.5" />用户数据包
        </button>
        <button onClick={() => setMode('children-obs')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${mode === 'children-obs' ? 'bg-[var(--color-primary)] text-white' : 'bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-warm-bg)]'}`}>
          <BookUser className="w-4 h-4 inline mr-1.5" />按幼儿查看
        </button>
      </div>

      {/* ===== 教师内容总览 ===== */}
      {mode === 'content' && data && (
        <div className="space-y-4">
          {/* 数据概览卡片 */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { icon: Users, label: '用户', count: stats?.users || 0, color: 'text-blue-600 bg-blue-50' },
              { icon: Eye, label: '观察记录', count: data.observations?.length || 0, color: 'text-green-600 bg-green-50' },
              { icon: FileText, label: '分析报告', count: data.analysis_reports?.length || 0, color: 'text-purple-600 bg-purple-50' },
              { icon: Lightbulb, label: '教育方案', count: data.education_plans?.length || 0, color: 'text-orange-600 bg-orange-50' },
              { icon: MessageSquare, label: '沟通记录', count: data.communication_records?.length || 0, color: 'text-pink-600 bg-pink-50' },
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
                        📅 {o.date}
                      </span>
                      {o.context && (
                        <span className="text-xs text-[var(--color-text-light)]">{o.context}</span>
                      )}
                      {o.teacherName && (
                        <span className="text-xs text-[var(--color-text-secondary)] bg-gray-100 px-2 py-0.5 rounded">
                          👩‍🏫 {o.teacherName}
                        </span>
                      )}
                      {o.mediaUrls?.length > 0 && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          📷 {o.mediaUrls.length} 张
                        </span>
                      )}
                    </div>
                    {o.whiteDescription && (
                      <p className="text-sm text-[var(--color-text-main)] line-clamp-3 leading-relaxed mb-2">
                        {o.whiteDescription}
                      </p>
                    )}
                    {/* 媒体缩略图 */}
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
                          ⬇ 下载全部
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

          {/* 无数据提示 */}
          {(!data.observations || data.observations.length === 0) && (!data.analysis_reports || data.analysis_reports.length === 0) && (
            <div className="text-center py-12 text-sm text-[var(--color-text-light)] bg-white rounded-xl border border-[var(--color-border)]">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>暂无教师书写内容</p>
              <p className="text-xs mt-1">教师使用幼析或育见创建内容后，将在这里展示</p>
            </div>
          )}
        </div>
      )}

      {/* ===== 按幼儿查看观察记录 ===== */}
      {mode === 'children-obs' && data && (
        <div className="space-y-4">
          {data.children && data.children.length > 0 ? (
            data.children.map((child: any) => {
              const childObs = (data.observations || []).filter((o: any) =>
                o.childIds && o.childIds.includes(child.id)
              );
              const childReports = (data.analysis_reports || []).filter((r: any) =>
                childObs.some((o: any) => o.id === r.observationId)
              );
              return (
                <div key={child.id} className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
                  <button onClick={() => setExpandedUser(expandedUser === child.id ? null : child.id)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--color-warm-bg)] transition-colors text-left">
                    <div className="flex items-center gap-3">
                      {expandedUser === child.id ? <ChevronDown className="w-4 h-4 text-[var(--color-text-light)]" /> : <ChevronRight className="w-4 h-4 text-[var(--color-text-light)]" />}
                      <span className="text-sm font-medium text-[var(--color-text-main)]">{child.name}</span>
                      <span className="text-xs text-[var(--color-text-light)]">{child.class || '未分班'}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{childObs.length} 条记录</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">{childReports.length} 份报告</span>
                    </div>
                    {childObs.length > 0 && (
                      <button onClick={(e) => {
                        e.stopPropagation();
                        const json = JSON.stringify(childObs, null, 2);
                        const blob = new Blob([json], { type: 'application/json' });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = `观察记录_${child.name}.json`;
                        a.click();
                      }}
                        className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1 mr-2">
                        <Download className="w-3 h-3" /> 下载
                      </button>
                    )}
                  </button>
                  {expandedUser === child.id && (
                    <div className="px-5 pb-4 space-y-2">
                      {childObs.length > 0 ? childObs.map((obs: any) => (
                        <div key={obs.id} className="bg-[var(--color-warm-bg)] rounded-xl p-3 border border-[var(--color-border)]">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-xs font-medium text-[var(--color-primary)]">📅 {obs.date}</span>
                            {obs.context && <span className="text-xs text-[var(--color-text-light)]">📍 {obs.context}</span>}
                            {obs.teacherName && (
                              <span className="text-xs text-[var(--color-text-secondary)] bg-gray-100 px-2 py-0.5 rounded">
                                👩‍🏫 {obs.teacherName}
                              </span>
                            )}
                            {obs.mediaUrls?.length > 0 && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                📷 {obs.mediaUrls.length} 张
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--color-text-main)] leading-relaxed whitespace-pre-wrap line-clamp-4">
                            {obs.whiteDescription}
                          </p>
                          {/* 媒体缩略图 */}
                          {obs.mediaUrls?.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap mt-2">
                              {obs.mediaUrls.map((mediaId: string, i: number) => (
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
                                onClick={(e) => { e.stopPropagation(); downloadObsMedia(obs); }}
                                className="ml-1 text-xs text-[var(--color-primary)] hover:underline flex items-center gap-0.5 self-end pb-1"
                              >
                                ⬇ 下载全部
                              </button>
                            </div>
                          )}
                          {obs.whiteDescription && obs.whiteDescription.length > 100 && (
                            <button onClick={(e) => { e.stopPropagation(); }}
                              className="text-xs text-[var(--color-primary)] hover:underline mt-1">展开全部</button>
                          )}
                          {(() => {
                            const report = childReports.find((r: any) => r.observationId === obs.id);
                            return report ? (
                              <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
                                <div className="flex items-center gap-1 text-xs text-green-600 mb-1">
                                  <FileText className="w-3 h-3" /> 分析报告
                                  <span className={`ml-1 text-[10px] px-1 py-0.5 rounded ${
                                    report.status === 'confirmed' ? 'bg-green-100 text-green-700' : report.status === 'modified' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {report.status === 'confirmed' ? '已确认' : report.status === 'modified' ? '已修改' : '草稿'}
                                  </span>
                                </div>
                                <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">{report.caseAnalysis?.substring(0, 200)}</p>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )) : (
                        <p className="text-sm text-[var(--color-text-light)] text-center py-4">暂无观察记录</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-sm text-[var(--color-text-light)] bg-white rounded-xl border border-[var(--color-border)]">
              <BookUser className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>暂无幼儿数据</p>
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
