import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Loader2, Settings, Download, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { callAI } from '../../utils/ai';
import { getSettings, savePlan } from '../../db';
import type { EducationPlan } from '../../types';

const SYSTEM_PROMPT = `指令模板
请你扮演一位专业的教育计划助理，你的任务是通过连问我多个问题，帮助我系统地梳理一次自主游戏后的回顾环节，并最终提供一份完整的引导方案。

请你务必遵循以下规则：
每次只提一个问题，并耐心等待我的回答。
请从最基础、最容易回忆的信息开始提问。
请确保在所有问题都得到回答之前，不要给出最终的方案。
我的初始情境是：孩子们刚刚结束了一场自主游戏，我希望能组织一次有效的思维共享（游戏回顾）讨论。请你开始第一阶段的提问吧。

第一阶段：了解游戏情境
请你开始提问，帮我回想这次自主游戏的基本情境。你的问题应涵盖：
游戏的主题和地点。
参与幼儿的人数、年龄和具体情况。
游戏过程中的关键事件。
我已经尝试过的引导和其效果。

第二阶段：明确讨论目标
当第一阶段信息收集完毕后，请你开始提问，帮我明确这次讨论的核心目标。

第三阶段：确定协助类型
当讨论目标明确后，请你开始提问，帮我确认我需要哪种形式的具体协助。

最终任务
在我回答完你所有问题后，请将我提供的信息进行整合，帮我撰写一份完整的、可操作的回顾引导方案，方案中要包含具体的提问、引导策略和建议。`;

export default function SharedThinking() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [noApiKey, setNoApiKey] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 进入页面自动开始
  useEffect(() => {
    startSession();
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startSession = async () => {
    setLoading(true);
    setMessages([]);
    setNoApiKey(false);

    const settings = await getSettings();

    try {
      let fullResponse = '';
      await callAI(SYSTEM_PROMPT, '请开始第一阶段的提问。', (chunk) => {
        fullResponse += chunk;
      });
      setMessages([{ role: 'ai', content: fullResponse }]);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setMessages([{ role: 'ai', content: `⚠️ 调用失败：${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');

    const newMessages = [...messages, { role: 'user' as const, content: userMsg }, { role: 'ai' as const, content: '' }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const conversation = newMessages.slice(0, -1).map(m => ({
        role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
        content: m.content,
      }));

      let fullResponse = '';
      await callAI(
        SYSTEM_PROMPT,
        conversation.map(m => `${m.role === 'assistant' ? 'AI' : '我'}：${m.content}`).join('\n\n') + `\n\n我：${userMsg}`,
        (chunk) => {
          fullResponse += chunk;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'ai', content: fullResponse };
            return updated;
          });
        },
      );
    } catch (err: any) {
      setMessages(prev => {
        const updated = [...prev];
        if (err.name === 'AbortError') { setLoading(false); return; }
        updated[updated.length - 1] = { role: 'ai', content: `⚠️ 调用失败：${err.message}` };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadWord = async () => {
    const aiMsgs = messages.filter(m => m.role === 'ai');
    if (!aiMsgs.length) return;
    try {
      const content = aiMsgs.map(m => m.content).join('\n\n');
      const res = await fetch('/api/download-plan-docx', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '思维共享活动设计方案', date: new Date().toLocaleDateString('zh-CN'), content })
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `思维共享活动方案_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) { console.error(e); alert('下载失败'); }
  };

  return (
    <div>
      <button onClick={() => navigate('/育见')} className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] mb-4">
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      <h1 className="text-2xl font-bold text-[var(--color-text-main)] mb-6">思维共享活动设计</h1>

      {/* 未配置 API Key 提示 */}
      {noApiKey && (
        <div className="bg-white rounded-2xl p-8 border border-[var(--color-border)] text-center">
          <Settings className="w-16 h-16 text-[var(--color-text-light)] mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-2">请先配置 API Key</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">
            在使用 AI 功能前，需要先在设置页配置你的 DeepSeek API Key
          </p>
          <button
            onClick={() => navigate('/设置')}
            className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-dark)] font-medium"
          >
            去配置
          </button>
        </div>
      )}

      {/* 对话界面 */}
      {!noApiKey && (
        <div className="bg-white rounded-2xl border border-[var(--color-border)]">
          <div className="p-5 max-h-[500px] overflow-y-auto space-y-4">
            {messages.length === 0 && loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
                <span className="ml-2 text-sm text-[var(--color-text-secondary)]">正在准备第一个问题...</span>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-warm-bg)] text-[var(--color-text-main)]'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {messages.some(m => m.role === 'ai') && (
            <div className="px-4 pb-2 flex gap-2">
              <button onClick={downloadWord}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-warm-bg)] transition-colors">
                <Download className="w-3 h-3" /> 下载Word
              </button>
              <button onClick={async () => {
                const aiMsgs = messages.filter((m: any) => m.role === 'ai');
                if (!aiMsgs.length) return;
                const plan: EducationPlan = {
                  id: crypto.randomUUID(), type: 'shared-thinking',
                  title: '思维共享活动方案', childIds: [],
                  content: aiMsgs.map((m: any) => m.content).join('\n\n'),
                  tags: [], status: 'draft', createdAt: new Date().toISOString(),
                };
                await savePlan(plan);
                alert('方案已保存！');
              }}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-warm-bg)] transition-colors">
                <Save className="w-3 h-3" /> 保存方案
              </button>
            </div>
          )}

          <div className="border-t border-[var(--color-border)] p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="输入你的回答..."
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
