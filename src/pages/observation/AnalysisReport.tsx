import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, CheckCircle2, FileText, BookOpen, Lightbulb, HeartHandshake, BookUser, Download, Edit3, Save, X } from 'lucide-react';
import { getObservation, getReportByObservation, saveAnalysisReport, saveObservation, getChild, getMedia } from '../../db';
import type { Observation, AnalysisReport, Child } from '../../types';

/** 将AI输出按标题拆分为结构化段落 */
function parseSections(text: string) {
  const sections: { title: string; icon: React.ElementType; content: string }[] = [];

  const patterns = [
    { key: '## 1. 行为摘要', icon: FileText, label: '行为摘要' },
    { key: '## 2. 《3-6 岁儿童发展指南》对标分析', icon: BookOpen, label: '发展指南对标分析' },
    { key: '## 3. 图式行为识别', icon: Sparkles, label: '图式行为识别' },
    { key: '## 4. 学习品质分析', icon: Lightbulb, label: '学习品质分析' },
    { key: '## 5. 社会性与情绪发展', icon: HeartHandshake, label: '社会性与情绪发展' },
    { key: '## 6. 最近发展区与多元智能线索', icon: BookUser, label: '最近发展区与多元智能' },
    { key: '## 7. 需要关注的潜在议题', icon: FileText, label: '潜在议题' },
    { key: '## 8. 教育支持策略', icon: Lightbulb, label: '教育支持策略' },
  ];

  for (const p of patterns) {
    const regex = new RegExp(`${p.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s\\S]*?)(?=${patterns.map(x => x.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}|$)`);
    const match = text.match(regex);
    if (match && match[1].trim()) {
      sections.push({ title: p.label, icon: p.icon, content: match[1].trim() });
    }
  }

  if (sections.length === 0) {
    sections.push({ title: '分析报告', icon: FileText, content: text });
  }

  return sections;
}

function formatContent(content: string) {
  return content
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\n/g, '<br/>');
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

export default function AnalysisReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [observation, setObservation] = useState<Observation | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [child, setChild] = useState<Child | null>(null);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [editContext, setEditContext] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!id) { setError('缺少观察记录ID'); setLoaded(true); return; }
    try {
      const obs = await getObservation(id);
      setObservation(obs || null);
      if (obs) {
        if (obs.mediaUrls?.length) {
          const urls: string[] = [];
          for (const mediaId of obs.mediaUrls) {
            const blob = await getMedia(mediaId);
            if (blob) urls.push(URL.createObjectURL(blob));
          }
          setMediaUrls(urls);
        }
        const r = await getReportByObservation(obs.id);
        setReport(r || null);
        if (obs.childIds[0]) {
          const c = await getChild(obs.childIds[0]);
          setChild(c || null);
        }
      }
      setLoaded(true);
    } catch(e) {
      setError('加载失败: ' + (e as Error).message);
      setLoaded(true);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    return () => { mediaUrls.forEach(u => URL.revokeObjectURL(u)); };
  }, [mediaUrls]);

  const handleConfirm = async () => {
    if (!report) return;
    const updated = { ...report, status: 'confirmed' as const };
    await saveAnalysisReport(updated);
    setReport(updated);
  };

  const startEditing = () => {
    if (!observation) return;
    setEditContext(observation.context);
    setEditDesc(observation.whiteDescription);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!observation) return;
    const updated = { ...observation, context: editContext, whiteDescription: editDesc };
    await saveObservation(updated);
    setObservation(updated);
    setEditing(false);
  };

  const handleDownloadWord = useCallback(async () => {
    if (!observation || !report) return;
    try {
      const childName = child?.name || '未命名';
      const secs = parseSections(report.caseAnalysis);
      const getSec = (l: string) => secs.find(s => s.title === l)?.content || '';
      const analysisText = [getSec('发展指南对标分析'), getSec('图式行为识别'), getSec('学习品质分析'),
        getSec('社会性与情绪发展'), getSec('最近发展区与多元智能'), getSec('潜在议题')].filter(Boolean).join('\n\n');

      // 加载照片
      const photos: string[] = [];
      if (observation.mediaUrls?.length) {
        for (const mediaId of observation.mediaUrls) {
          const blob = await getMedia(mediaId);
          if (blob && blob.type.startsWith('image/')) {
            const base64 = await new Promise<string>(resolve => {
              const r = new FileReader();
              r.onload = () => resolve(r.result as string);
              r.readAsDataURL(blob);
            });
            photos.push(base64);
          }
        }
      }

      const res = await fetch('/api/download-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName,
          context: observation.context || '',
          date: formatDate(observation.date),
          description: observation.whiteDescription,
          childExpression: observation.childExpression || '',
          teacherDialogue: observation.teacherDialogue || '',
          summary: getSec('行为摘要'),
          analysis: analysisText,
          strategy: getSec('教育支持策略'),
          photos,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `观察分析报告_${childName}_${observation.date}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Word生成失败:', err);
      alert('Word下载失败，请稍后重试');
    }
  }, [observation, report, child]);

  if (!loaded) {
    return <div className="text-center py-12 text-[var(--color-text-light)]">加载中...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <button onClick={() => { setLoaded(false); setError(''); loadData(); }}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm">重新加载</button>
        <button onClick={() => navigate('/幼析')}
          className="ml-2 px-4 py-2 border border-[var(--color-border)] rounded-xl text-sm">返回列表</button>
      </div>
    );
  }

  if (!observation) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[var(--color-text-light)] mb-4">未找到该观察记录</p>
        <button onClick={() => navigate('/幼析')}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm">返回幼析列表</button>
      </div>
    );
  }

  const sections = report ? parseSections(report.caseAnalysis) : [];

  return (
    <div>
      <button onClick={() => navigate('/幼析')}
        className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] mb-4">
        <ArrowLeft className="w-4 h-4" /> 返回列表
      </button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[var(--color-text-main)]">观察分析报告</h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-[var(--color-text-secondary)]">
            <span>分析对象：<span className="bg-gray-100 text-[var(--color-text-main)] px-2 py-0.5 rounded">{child?.name || '未选择幼儿'}</span></span>
            <span>观察时间：{formatDate(observation.date)}</span>
            {observation.context && <span>📍 {observation.context}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={startEditing}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[var(--color-border)] text-[var(--color-text-main)] text-sm rounded-lg hover:bg-[var(--color-warm-bg)] transition-colors">
            <Edit3 className="w-4 h-4" /> 编辑
          </button>
          <button onClick={handleDownloadWord} disabled={!report}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[var(--color-border)] text-[var(--color-text-main)] text-sm rounded-lg hover:bg-[var(--color-warm-bg)] transition-colors disabled:opacity-50">
            <Download className="w-4 h-4" /> 下载Word
          </button>
          {report ? (report.status === 'confirmed' ? (
            <span className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 text-sm rounded-lg">
              <CheckCircle2 className="w-4 h-4" /> 已确认
            </span>
          ) : (
            <button onClick={handleConfirm}
              className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:bg-[var(--color-primary-dark)]">
              <CheckCircle2 className="w-4 h-4" /> 确认报告
            </button>
          )) : (
            <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-500 text-sm rounded-lg">
              <Sparkles className="w-4 h-4" /> 分析中...
            </span>
          )}
        </div>
      </div>

      <div className="bg-[var(--color-warm-bg)] rounded-2xl p-5 border border-[var(--color-border)] mb-5">
        <h3 className="text-sm font-bold text-[var(--color-text-main)] mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--color-primary)]" />
          观察实录
          {editing && (
            <span className="ml-2 text-xs text-blue-500 font-normal">（编辑中）</span>
          )}
        </h3>
        {editing ? (
          <div className="space-y-3">
            <input value={editContext} onChange={e => setEditContext(e.target.value)}
              placeholder="观察场景" className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xl text-sm" />
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
              rows={8} className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xl text-sm resize-none" />
            <div className="flex gap-2">
              <button onClick={saveEdit}
                className="flex items-center gap-1 px-4 py-2 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:bg-[var(--color-primary-dark)]">
                <Save className="w-4 h-4" /> 保存修改
              </button>
              <button onClick={() => setEditing(false)}
                className="flex items-center gap-1 px-4 py-2 bg-white border border-[var(--color-border)] text-sm rounded-lg hover:bg-[var(--color-warm-bg)]">
                <X className="w-4 h-4" /> 取消
              </button>
            </div>
          </div>
        ) : (
          <>
            {observation.context && <p className="text-xs text-[var(--color-text-light)] mb-2">📍 {observation.context}</p>}
            <p className="text-sm text-[var(--color-text-main)] whitespace-pre-wrap leading-relaxed">
              {observation.whiteDescription}
            </p>
          </>
        )}
      </div>

      {/* 无报告时显示提示 */}
      {!report && (
        <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)] mb-5 text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-[var(--color-primary)] animate-pulse" />
          <p className="text-sm text-[var(--color-text-main)] font-medium">AI 分析报告生成中...</p>
          <p className="text-xs text-[var(--color-text-light)] mt-1">请稍候，报告生成后会自动显示</p>
          <p className="text-xs text-[var(--color-text-light)] mt-3">提示：如长时间未生成，可尝试返回列表重新提交分析</p>
        </div>
      )}

      {mediaUrls.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)] mb-5">
          <h3 className="text-sm font-bold text-[var(--color-text-main)] mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
            现场素材（{mediaUrls.length}）
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {mediaUrls.map((url, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-[var(--color-border)]">
                <img src={url} alt={`素材${i+1}`} className="w-full h-40 object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 表达表征分析：基于 AI 行为摘要 */}
      {report && (() => {
        const summary = sections.find(s => s.title === '行为摘要');
        if (!summary) return null;
        return (
          <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)] mb-5">
            <h3 className="text-sm font-bold text-[var(--color-text-main)] mb-2">表达表征分析</h3>
            <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatContent(summary.content) }} />
          </div>
        );
      })()}

      {/* 观察分析（合并多个模块） */}
      {report && (() => {
        const analysisSections = sections.filter(s =>
          ['行为摘要', '发展指南对标分析', '图式行为识别', '学习品质分析', '社会性与情绪发展', '最近发展区与多元智能', '潜在议题'].includes(s.title)
        );
        const strategySection = sections.find(s => s.title === '教育支持策略');
        return (
          <>
            {analysisSections.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)] mb-5">
                <h3 className="text-base font-bold text-[var(--color-text-main)] mb-4">观察分析</h3>
                <div className="space-y-4">
                  {analysisSections.map((s, i) => (
                    <div key={i}>
                      <h4 className="text-sm font-bold text-[var(--color-primary)] mb-2">{s.title}</h4>
                      <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: formatContent(s.content) }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {strategySection && (
              <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)] mb-5">
                <h3 className="text-base font-bold text-[var(--color-text-main)] mb-4">教育支持策略</h3>
                <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: formatContent(strategySection.content) }} />
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
