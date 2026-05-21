import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Loader2, Settings, Download, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { callAI } from '../../utils/ai';
import { getSettings, savePlan } from '../../db';
import type { EducationPlan } from '../../types';

const SYSTEM_PROMPT = `请你扮演一位经验丰富的幼儿园班主任教练，擅长处理棘手的家园沟通问题。
你的核心任务是：通过一次只提一个问题的对话方式，一步一步引导我完成沟通演练。

你必须严格遵守以下规则：
单步执行：我们的演练分为五个阶段，你必须按顺序执行。
等待回答：在每个阶段，你提出问题后，必须停止并等待我的回答。
禁止自答：严禁你代替我回答问题，或一次性执行多个阶段。

我们的演练将分为五个阶段：
【阶段一：获取情景与画像】
请你作为教练，首先询问我以下两个信息。为了降低我的回答难度，请你在询问第2点时，主动列举几个典型的家长类型供我参考：
具体的沟通难题：发生了什么事？
家长的画像：这位家长通常的沟通风格是怎样的？（请在提问时列出如：焦虑型（过度担心细节）、强势问责型（一旦出事就怪老师）、专家说教型（喜欢拿理论压人）、溺爱否认型（觉得自家孩子完美）等选项，方便我对号入座）。

【阶段二：明确目标】
在我回答完情景和家长画像后，请你提问，引导我明确这次沟通的核心目标。
等我回答后，你可以追问1-2次，帮我把目标打磨得更清晰。
当目标明确后，请你做一个简短小结，然后明确说："好的，目标明确了。我们现在进入第三阶段。"

【阶段三：梳理事实】
你开始提问，引导我梳理需要准备的"事实依据"（提醒我使用中立的观察记录，而非情绪化的标签）。
等我回答后，你来判断我准备的事实是否客观、充分，并给我反馈。
当事实准备好后，请你做一个简短小结，然后明确说："事实依据准备好了。我们现在进入第四阶段。"

【阶段四：模拟对话（含纠偏机制）】
你宣布："现在我将扮演那位'家长'。"请你严格根据我选定的家长性格特点，设计一句开场白，然后等待我回应。
在此阶段，必须遵守以下特殊规则：
沉浸式演练：我们将进行多轮对话。
即时纠偏（重要）：如果我的回应有明显失误（如激化矛盾、被家长带跑偏、或在策略选择题中选了错误选项），请不要直接结束演练，也不要继续以家长身份回应。你必须立刻暂停模拟，切换回'教练'身份。指出我刚才回应的风险或错误原因。引导我回到上一步，让我重新尝试作答。只有当我的回应相对得体时，你再切换回'家长'身份继续演练。
结束信号：只有当我明确说："【模拟结束】"时，你才能进入阶段五。

【阶段五：复盘优化】
在我说了"【模拟结束】"之后，你退出"家长"角色，恢复"班主任教练"的角色。
请根据刚才的模拟（特别是那些修正后的精彩片段），总结我的进步，并给我3条具体的、可带走的沟通心法或建议。

请现在从【阶段一】的第一个问题开始。`;

export default function Simulator() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [noApiKey, setNoApiKey] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { startSession(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const startSession = async () => {
    setLoading(true);
    setNoApiKey(false);
    const settings = await getSettings();
    try {
      let fullResponse = '';
      await callAI(SYSTEM_PROMPT, '请从【阶段一】的第一个问题开始。', (chunk) => { fullResponse += chunk; });
      setMessages([{ role: 'ai', content: fullResponse }]);
    } catch (err: any) {
      if (err.name === 'AbortError') { setLoading(false); return; }
      setMessages([{ role: 'ai', content: `⚠️ 调用失败：${err.message}` }]);
    } finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user' as const, content: userMsg }, { role: 'ai' as const, content: '' }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const conversation = newMessages.slice(0, -1).map(m => ({ role: m.role === 'ai' ? 'assistant' as const : 'user' as const, content: m.content }));
      let fullResponse = '';
      await callAI(SYSTEM_PROMPT,
        conversation.map(m => `${m.role === 'assistant' ? '教练' : '我'}：${m.content}`).join('\n\n') + `\n\n我：${userMsg}`,
        (chunk) => { fullResponse += chunk; setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'ai', content: fullResponse }; return u; }); },
      );
    } catch (err: any) { if (err.name === 'AbortError') { setLoading(false); return; } setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'ai', content: `⚠️ 调用失败：${err.message}` }; return u; }); }
    finally { setLoading(false); }
  };

  const downloadWord = async () => {
    const aiMsgs = messages.filter((m: any) => m.role === 'ai');
    if (!aiMsgs.length) return;
    try {
      const content = aiMsgs.map((m: any) => m.content).join('\n\n');
      const res = await fetch('/api/download-plan-docx', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '家园沟通策略', date: new Date().toLocaleDateString('zh-CN'), content })
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `沟通策略_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) { console.error(e); alert('下载失败'); }
  };

  return (
    <div>
      <button onClick={() => navigate('/协同共育')} className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] mb-4"><ArrowLeft className="w-4 h-4" /> 返回</button>
      <h1 className="text-2xl font-bold text-[var(--color-text-main)] mb-6">家园沟通模拟器</h1>
      {noApiKey && (
        <div className="bg-white rounded-2xl p-8 border border-[var(--color-border)] text-center">
          <Settings className="w-16 h-16 text-[var(--color-text-light)] mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-2">请先配置 API Key</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">在使用 AI 功能前，需要先在设置页配置你的 DeepSeek API Key</p>
          <button onClick={() => navigate('/设置')} className="px-6 py-3 bg-[var(--color-secondary)] text-white rounded-xl hover:bg-[var(--color-secondary-light)] font-medium">去配置</button>
        </div>
      )}
      {!noApiKey && (
        <div className="bg-white rounded-2xl border border-[var(--color-border)]">
          <div className="p-5 max-h-[500px] overflow-y-auto space-y-4">
            {messages.length === 0 && loading && (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-secondary)]" /><span className="ml-2 text-sm text-[var(--color-text-secondary)]">正在准备第一个问题...</span></div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-warm-bg)] text-[var(--color-text-main)]'}`}>{msg.content}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          {messages.some((m: any) => m.role === 'ai') && (
            <div className="px-4 pb-2 flex gap-2">
              <button onClick={downloadWord}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-warm-bg)] transition-colors">
                <Download className="w-3 h-3" /> 下载Word
              </button>
              <button onClick={async () => {
                const aiMsgs = messages.filter((m: any) => m.role === 'ai');
                if (!aiMsgs.length) return;
                await (await import('../../db')).savePlan({
                  id: crypto.randomUUID(), type: 'strategy',
                  title: '家园沟通策略', childIds: [],
                  content: aiMsgs.map((m: any) => m.content).join('\n\n'),
                  tags: [], status: 'draft', createdAt: new Date().toISOString(),
                });
                alert('方案已保存！');
              }}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-warm-bg)] transition-colors">
                <Save className="w-3 h-3" /> 保存方案
              </button>
            </div>
          )}
          <div className="border-t border-[var(--color-border)] p-4">
            <div className="flex gap-2">
              <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="输入你的回答..." disabled={loading}
                className="flex-1 px-4 py-2.5 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-secondary)] disabled:opacity-50" />
              <button onClick={sendMessage} disabled={loading || !input.trim()}
                className="px-4 py-2.5 bg-[var(--color-secondary)] text-white rounded-xl hover:bg-[var(--color-secondary-light)] disabled:opacity-50"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
