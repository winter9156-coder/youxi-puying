import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Calendar, Sparkles, FileText, BookOpen, HeartHandshake, Lightbulb, Target, Loader2, Camera, Save, Download } from 'lucide-react';
import { getChild, getObservationsByChild, getReportsByChild, saveChild } from '../../db';
import type { Child, Observation, AnalysisReport } from '../../types';
import { CLASS_LIST } from '../../constants';

// 发展领域配置
const DOMAINS = [
  { key: '语言领域', label: '语言', icon: BookOpen, color: '#378ADD' },
  { key: '社会领域', label: '社会', icon: HeartHandshake, color: '#D4537E' },
  { key: '科学领域', label: '科学', icon: Sparkles, color: '#7F77DD' },
  { key: '艺术领域', label: '艺术', icon: Eye, color: '#D85A30' },
  { key: '学习品质', label: '品质', icon: Lightbulb, color: '#1D9E75' },
];

/** 从分析报告中提取各领域得分（根据关键词出现频率估算） */
function extractDomainScores(reports: AnalysisReport[]): Record<string, number> {
  const scores: Record<string, number> = {};
  DOMAINS.forEach(d => { scores[d.key] = 0; });

  const allText = reports.map(r => r.caseAnalysis).join(' ');
  DOMAINS.forEach(d => {
    // 统计该领域关键词的出现次数作为关注度得分
    const matches = allText.match(new RegExp(d.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
    const count = matches ? matches.length : 0;
    // 归一化到 0-100
    scores[d.key] = Math.min(100, Math.round(count * 20 + 20));
  });
  return scores;
}

/** SVG 雷达图组件 */
function RadarChart({ scores }: { scores: Record<string, number> }) {
  const size = 240, cx = 120, cy = 120, radius = 90;
  const levels = 4;

  const points = DOMAINS.map((_, i) => {
    const angle = (Math.PI * 2 * i) / DOMAINS.length - Math.PI / 2;
    return { angle };
  });

  const toCoord = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  return (
    <svg id="radar-chart-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* 网格线 */}
      {Array.from({ length: levels }).map((_, li) => {
        const r = (radius * (li + 1)) / levels;
        const d = points.map((p, i) => {
          const c = toCoord(p.angle, r);
          return `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`;
        }).join('') + 'Z';
        return <path key={li} d={d} fill="none" stroke="#E5E7EB" strokeWidth="1" />;
      })}
      {/* 轴线 */}
      {points.map((p, i) => {
        const end = toCoord(p.angle, radius);
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#E5E7EB" strokeWidth="1" />;
      })}
      {/* 数据区域 */}
      <path d={DOMAINS.map((d, i) => {
        const score = (scores[d.key] || 0) / 100;
        const c = toCoord(points[i].angle, radius * score);
        return `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`;
      }).join('') + 'Z'}
        fill="rgba(55, 138, 221, 0.2)" stroke="#378ADD" strokeWidth="2" />
      {/* 标签 */}
      {DOMAINS.map((d, i) => {
        const label = toCoord(points[i].angle, radius + 20);
        return (
          <text key={i} x={label.x} y={label.y} textAnchor="middle" dominantBaseline="central"
            fontSize="12" fill="#6B7280">
            {d.label}
          </text>
        );
      })}
      {/* 分数圆点 */}
      {DOMAINS.map((d, i) => {
        const score = (scores[d.key] || 0) / 100;
        const c = toCoord(points[i].angle, radius * score);
        return <circle key={i} cx={c.x} cy={c.y} r="4" fill={d.color} />;
      })}
    </svg>
  );
}

/** 格式化日期 */
function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

export default function ChildDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState('');
  const [editingClass, setEditingClass] = useState(false);
  const [editClassName, setEditClassName] = useState('');
  const [editingSummary, setEditingSummary] = useState(false);
  const [editSummaryText, setEditSummaryText] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const c = await getChild(id);
      setChild(c || null);
      const allObs = await getObservationsByChild(id);
      const allReports = await getReportsByChild(id);

      // 获取该幼儿所在班级的所有教师姓名
      let classTeacherNames = new Set<string>();
      try {
        if (c && c.class) {
          const res = await fetch(`/api/class-teachers?class=${encodeURIComponent(c.class)}`);
          const data = await res.json();
          classTeacherNames = new Set(data.teachers || []);
        }
      } catch {}

      const u = JSON.parse(localStorage.getItem('edu_user') || '{}');
      const isAdmin = u.data?.role === 'admin' || u.name === '王洋洋';

      // 时间线：教师只看同班教师写的观察记录，管理员看全部
      let filteredObs = allObs;
      if (!isAdmin && classTeacherNames.size > 0) {
        filteredObs = allObs.filter(o => classTeacherNames.has(o.teacherName));
      }

      // 雷达图和学期小结：始终只使用同班教师观察记录对应的分析报告
      let filteredReports = allReports;
      if (classTeacherNames.size > 0) {
        const filteredObsIds = new Set(filteredObs.map(o => o.id));
        filteredReports = allReports.filter(r => filteredObsIds.has(r.observationId));
      }

      setObservations(filteredObs);
      setReports(filteredReports);
      // 加载上次保存的小结
      if (c?.notes?.includes('【学期发展小结】')) {
        const idx = c.notes.indexOf('【学期发展小结】');
        setSummary(c.notes.slice(idx));
      }
    })();
  }, [id]);

  const scores = useMemo(() => extractDomainScores(reports), [reports]);
  const sortedObs = useMemo(() =>
    [...observations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [observations]
  );

  const generateSummary = async () => {
    if (!child || reports.length === 0) return;
    setGenerating(true);
    try {
      const { getSettings } = await import('../../db');
      const settings = await getSettings();
      const auth = settings.apiKey ? `Bearer ${settings.apiKey}` : '';
      const input = reports.map(r => r.caseAnalysis).join('\n---\n');
      const res = await fetch('/proxy/ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': auth },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{
            role: 'system',
            content: '你是一位幼儿园教师，请根据该幼儿的多篇观察分析报告，写一份200字左右的学期发展小结。语言亲切、积极、具体，突出幼儿的进步和特点，适合家长阅读。'
          }, {
            role: 'user',
            content: `幼儿姓名：${child.name}\n\n以下是历次观察分析报告：\n${input}`
          }],
          max_tokens: 600
        })
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '生成失败';
      const fullNote = (child.notes?.includes('【学期发展小结】') ?
        child.notes.split('【学期发展小结】')[0] : child.notes || '') +
        '\n\n【学期发展小结】\n' + text;
      await saveChild({ ...child, notes: fullNote });
      setChild({ ...child, notes: fullNote });
      setSummary(text);
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  const handleDownloadProfile = async () => {
    if (!child) return;
    const scoreArr = DOMAINS.map(d => ({ label: d.label, score: scores[d.key], color: d.color }));
    // 尝试捕获雷达图为图片
    let radarImage = '';
    try {
      const svgEl = document.getElementById('radar-chart-svg');
      if (svgEl) {
        const canvas = document.createElement('canvas');
        canvas.width = 400; canvas.height = 400;
        const ctx = canvas.getContext('2d');
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 400, 400);
            ctx.drawImage(img, 0, 0, 400, 400);
            radarImage = canvas.toDataURL('image/png');
            resolve(null);
          };
          img.onerror = reject;
          img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        });
      }
    } catch {}
    const res = await fetch('/api/download-profile-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childName: child.name,
        className: child.class || '',
        scores: scoreArr,
        summary: summary || '',
        reportCount: reports.length,
        radarImage,
      }),
    });
    if (!res.ok) { alert('下载失败'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `幼儿发展档案_${child.name}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!child) return <div className="text-center py-12 text-[var(--color-text-light)]">加载中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/幼儿档案')}
          className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]">
          <ArrowLeft className="w-4 h-4" /> 返回档案列表
        </button>
        <button onClick={handleDownloadProfile}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] rounded-xl hover:bg-[var(--color-warm-bg)] transition-colors">
          <Download className="w-4 h-4 text-[var(--color-primary)]" /> 下载Word（含档案与小结）
        </button>
      </div>

      {/* 头部信息 */}
      <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)] mb-6">
        <div className="flex items-start gap-4">
          <div className="relative w-16 h-16 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center text-2xl font-bold text-[var(--color-primary-dark)] overflow-hidden group">
            {child.avatar ? (
              <img src={child.avatar} alt={child.name} className="w-full h-full object-cover" />
            ) : (
              child.name[0]
            )}
            <label className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center cursor-pointer transition-colors">
              <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !child) return;
                const reader = new FileReader();
                reader.onload = async () => {
                  const updated = { ...child, avatar: reader.result as string };
                  await saveChild(updated);
                  setChild(updated);
                };
                reader.readAsDataURL(file);
              }} />
            </label>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[var(--color-text-main)]">{child.name}</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {editingClass ? (
                <span className="flex items-center gap-2">
                  <select value={editClassName} onChange={e => setEditClassName(e.target.value)}
                    className="px-2 py-1 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-lg text-sm w-40">
                    <option value="">选择班级</option>
                    {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={async () => {
                    if (!child) return;
                    const updated = { ...child, class: editClassName };
                    await saveChild(updated);
                    setChild(updated);
                    setEditingClass(false);
                  }} className="text-xs text-[var(--color-primary)] hover:underline">保存</button>
                  <button onClick={() => setEditingClass(false)} className="text-xs text-[var(--color-text-light)] hover:underline">取消</button>
                </span>
              ) : (
                <span>{child.class || '未设置班级'}
                  <button onClick={() => { setEditClassName(child.class || ''); setEditingClass(true); }}
                    className="ml-2 text-xs text-[var(--color-text-light)] hover:text-[var(--color-primary)]">编辑</button>
                </span>
              )}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-text-light)]">
              <span>观察记录：{observations.length} 条</span>
              <span>分析报告：{reports.length} 份</span>
            </div>
          </div>
        </div>
      </div>

      {/* 雷达图 + 发展概览 */}
      {reports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
              <h2 className="text-sm font-bold text-[var(--color-text-main)] mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-[var(--color-primary)]" />
                各领域发展概览
              </h2>
            <div className="flex justify-center">
              <RadarChart scores={scores} />
            </div>
            <div className="grid grid-cols-5 gap-2 mt-3">
              {DOMAINS.map(d => (
                <div key={d.key} className="text-center">
                  <div className="text-xs text-[var(--color-text-light)]">{d.label}</div>
                  <div className="text-lg font-bold" style={{ color: d.color }}>{scores[d.key]}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
            <h2 className="text-sm font-bold text-[var(--color-text-main)] mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--color-primary)]" />
              学期发展小结
              {summary && !editingSummary && (
                <button onClick={() => { setEditSummaryText(summary); setEditingSummary(true); }}
                  className="text-xs text-[var(--color-text-light)] hover:text-[var(--color-primary)]">编辑</button>
              )}
            </h2>
            {editingSummary ? (
              <div className="space-y-2">
                <textarea value={editSummaryText} onChange={e => setEditSummaryText(e.target.value)}
                  rows={8} className="w-full px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm resize-none" />
                <div className="flex gap-2">
                  <button onClick={async () => {
                    if (!child) return;
                    const fullNote = (child.notes?.includes('【学期发展小结】') ?
                      child.notes.split('【学期发展小结】')[0] : child.notes || '') +
                      '\n\n【学期发展小结】\n' + editSummaryText;
                    const updated = { ...child, notes: fullNote };
                    await saveChild(updated);
                    setChild(updated);
                    setSummary(editSummaryText);
                    setEditingSummary(false);
                  }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:bg-[var(--color-primary-dark)]">
                    <Save className="w-4 h-4" /> 保存
                  </button>
                  <button onClick={() => setEditingSummary(false)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[var(--color-border)] text-sm rounded-lg hover:bg-[var(--color-warm-bg)]">
                    取消
                  </button>
                </div>
              </div>
            ) : summary ? (
              <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{summary}</p>
            ) : (
              <p className="text-sm text-[var(--color-text-light)] mb-3">基于 {reports.length} 份分析报告，AI 自动生成学期发展小结</p>
            )}
            <button onClick={generateSummary} disabled={generating || reports.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:bg-[var(--color-primary-dark)] disabled:opacity-50">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? '生成中...' : summary ? '重新生成' : '生成学期小结'}
            </button>
          </div>
        </div>
      )}

      {/* 观察时间线 */}
      <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-3">观察时间线</h2>
      <div className="space-y-3">
        {sortedObs.map(obs => {
          const report = reports.find(r => r.observationId === obs.id);
          return (
            <div key={obs.id}
              className="bg-white rounded-2xl p-4 border border-[var(--color-border)] flex items-start justify-between hover:bg-[var(--color-warm-bg)] cursor-pointer transition-colors"
              onClick={() => navigate(`/幼析/分析/${obs.id}`)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-light)] mb-1">
                  <Calendar className="w-3 h-3" /> {formatDate(obs.date)}
                  {obs.context && <span>📍 {obs.context}</span>}
                  {report && <span className="text-green-600">✓ 已分析</span>}
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">{obs.whiteDescription}</p>
              </div>
              <Eye className="w-4 h-4 text-[var(--color-text-light)] ml-2 shrink-0" />
            </div>
          );
        })}
        {sortedObs.length === 0 && (
          <p className="text-center py-8 text-[var(--color-text-light)] text-sm">暂无观察记录，去「幼析」新建一条吧</p>
        )}
      </div>
    </div>
  );
}
