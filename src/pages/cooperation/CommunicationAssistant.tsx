import { useState } from 'react';
import { ArrowLeft, Send, Loader2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { callAI } from '../../utils/ai';

const SYSTEM_PROMPT = `你是一位经验丰富的幼儿园家庭教育顾问。请根据以下信息，生成一份面向家长的沟通话术建议。

要求：
1. 采用"三明治沟通法"：具体进步 → 发展需求 → 希望配合的小行动
2. 语气温和专业，避免专业术语堆砌
3. 话术要具体、可操作，让家长知道回家后可以做什么

请以Markdown格式输出。`;

export default function CommunicationAssistant() {
  const navigate = useNavigate();
  const [childName, setChildName] = useState('');
  const [situation, setSituation] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!childName || !situation) return;
    setLoading(true);
    setResult('');
    try {
      const prompt = `幼儿姓名：${childName}\n沟通场景：${situation}\n专业分析（如有）：${analysis || '未提供'}`;
      let full = '';
      await callAI(SYSTEM_PROMPT, prompt, chunk => {
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
      <button onClick={() => navigate('/协同共育')} className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] mb-4">
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>
      <h1 className="text-2xl font-bold text-[var(--color-text-main)] mb-6">家长沟通助手</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
            <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-2">幼儿姓名</label>
            <input type="text" value={childName} onChange={e => setChildName(e.target.value)}
              placeholder="请输入幼儿姓名"
              className="w-full px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
            <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-2">沟通场景描述</label>
            <textarea value={situation} onChange={e => setSituation(e.target.value)}
              placeholder="描述需要与家长沟通的具体情况..."
              rows={5}
              className="w-full px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm resize-none focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
            <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-2">专业分析（可选）</label>
            <textarea value={analysis} onChange={e => setAnalysis(e.target.value)}
              placeholder="可从幼析模块的分析报告中粘贴相关内容..."
              rows={4}
              className="w-full px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm resize-none focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
          <button onClick={generate} disabled={loading || !childName || !situation}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-dark)] disabled:opacity-50 font-medium">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 生成中...</> : <><Send className="w-4 h-4" /> 生成沟通话术</>}
          </button>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)] min-h-[300px]">
          <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-4">沟通话术建议</h2>
          {result ? (
            <div className="prose prose-sm max-w-none text-[var(--color-text-secondary)] whitespace-pre-wrap">{result}</div>
          ) : (
            <div className="flex items-center justify-center h-48 text-[var(--color-text-light)] text-sm">
              填写左侧信息后生成话术建议
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
