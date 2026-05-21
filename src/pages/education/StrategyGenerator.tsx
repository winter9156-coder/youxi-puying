import { useState } from 'react';
import { ArrowLeft, Send, Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { callAI } from '../../utils/ai';

const SYSTEM_PROMPT = `你是一位学前教育领域的教学策略专家。请根据下面提供的幼儿分析结论，生成后续支持建议。

请从以下四个维度输出：
1. 材料调整建议：环境中可增加或调整的材料
2. 教师介入策略：教师在游戏中的角色定位和介入时机
3. 活动方案建议：可开展的具体活动或游戏
4. 家园协同建议：与家长沟通配合的方向

请以Markdown格式输出。`;

export default function StrategyGenerator() {
  const navigate = useNavigate();
  const [analysisText, setAnalysisText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!analysisText.trim()) return;
    setLoading(true);
    setResult('');
    try {
      let full = '';
      await callAI(SYSTEM_PROMPT, `【分析结论】\n${analysisText}`, (chunk) => {
        full += chunk;
        setResult(full);
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => navigate('/育见')} className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] mb-4">
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>
      <h1 className="text-2xl font-bold text-[var(--color-text-main)] mb-6">通用策略生成</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
            <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-2">分析结论</label>
            <textarea value={analysisText} onChange={e => setAnalysisText(e.target.value)}
              placeholder="粘贴来自幼析的分析报告内容..."
              rows={12}
              className="w-full px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm resize-none focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
          <button onClick={generate} disabled={loading || !analysisText.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-primary-light)] text-white rounded-xl hover:bg-[var(--color-primary)] disabled:opacity-50 font-medium">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 生成中...</> : <><Sparkles className="w-4 h-4" /> 生成支持策略</>}
          </button>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)] min-h-[400px]">
          <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-4">支持策略</h2>
          {result ? (
            <div className="prose prose-sm max-w-none text-[var(--color-text-secondary)] whitespace-pre-wrap">{result}</div>
          ) : (
            <div className="flex items-center justify-center h-48 text-[var(--color-text-light)] text-sm">
              粘贴分析结论后生成支持策略
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
