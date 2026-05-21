import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Loader2, Settings, Download, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { callAI } from '../../utils/ai';
import { getSettings, savePlan } from '../../db';
import type { EducationPlan } from '../../types';

const SYSTEM_PROMPT = `请你扮演一位拥有20年一线经验、精通项目式学习（PBL）理论和课程整合设计的资深幼教课程设计师。我的主题设计思路需要你的系统性梳理。

请你通过连问我数十个问题的方式，系统性地帮助我梳理主题目标、核心结构和活动流程。

最终，请你根据我所有的回答，帮我撰写一份完整的、结构化的主题课程方案。

请你遵循以下步骤，并严格遵守每次只提一个问题、等待我回答后再继续的原则。

【前置任务：主题发掘与界定】
目标：通过提问，帮助教师从模糊的想法中找到清晰、可行的主题，并确认课程设计类型。
请 AI 从以下方面依次提问，并严格遵循单次提问原则：
第一问（主题的起始点与年龄段）：请告诉我该课程面向的具体年龄段（小班/中班/大班）。同时，请描述您目前对本次课程最模糊的起始想法或最想解决的班级问题是什么？（例如："想让孩子们多玩沙子，但不知道主题"、"班里孩子最近对小虫子很感兴趣"）。
第二问（兴趣的证据与行为捕捉）：针对您提到的起始想法/兴趣，请回忆并描述一两个具体的、最近发生、与此相关的幼儿行为或对话。这能帮助我们找到主题的真实证据。（例如："小明那天对我说，沙子都去哪里了？"或者"小红在区角总是推开其他小朋友"）
第三问（专业目标锁定）：基于您的观察和幼儿的兴趣，请明确本次主题在《幼儿园教育指导纲要》的五大领域核心经验中，您最想重点培养的一到两个核心发展方向是什么？（例如：社会性发展中的合作与分享，或科学探索中的观察与记录）。
第四问（主题范围与可行性评估）：鉴于您班级的实际情况，您认为该主题更适合作为短期的、一周内的内容探索，还是一个可以持续多周、具有挑战性的深度项目？这有助于我们评估主题的范围。
第五问（主题确认与类型选择）：请根据我前四问的回答，提出一个具体的主题名称。您是否确认本次主题名称为[AI提出的主题名称]？同时，请您明确希望设计的是：
A. 传统主题课程（聚焦内容覆盖和知识传递）
B. 项目式学习（PBL）（聚焦开放式探究和问题解决）

第一阶段：背景与教育目标锚定
目标：锁定课程的教育价值和边界。请严格遵循《幼儿园教育指导纲要》的要求来提问。
提问内容（请 AI 从以下方面依次提问）：
教育目标：您希望通过本次主题课程，重点培养幼儿哪一方面的核心经验（请结合五大领域具体阐述）？请确保目标是可观察、可评估的。
班级特点：本主题旨在解决您班级幼儿的哪一具体难题或兴趣点？（如：合作能力缺乏、对某一科学现象的好奇心等）。
时间与资源：您预设该主题将持续多久（如：两周）？您目前已有的核心教学资源（如：场地、图书、现有材料）有哪些？
【关键！驱动核心提问的条件逻辑】：请根据第五问中的选择（A或B），调整您的提问措辞和侧重：
IF A（传统主题）：请界定本次主题中最核心的三个知识点或概念，作为教师必须明确传递给幼儿的教学内容。
IF B（PBL）：请界定一个开放式的、具有驱动性的探究问题，作为项目的主线核心，以便引导幼儿深度学习。

第二阶段：核心结构与内容建构
目标：引导教师构建主题的系统性骨架。请根据第三问的选择，调整结构化提问的侧重。
提问内容：
【关键！结构划分提问的条件逻辑】：请根据第三问中的选择（A或B），调整您的提问措辞和侧重：
IF A（传统主题）：请通过提问，帮助我界定本次主题下的三到四个内容模块或活动类别（如：认知活动、集体活动、美工活动）？
IF B（PBL）：请通过提问，帮助我界定本次项目下的三到四个探究子课题或探索区，并说明其与核心问题的关联？
跨领域链接：针对该主题，除了主要领域，您计划如何自然地融入数学、语言或艺术领域的学习内容？请提供一个融合活动的创意。
资源收集：您预设幼儿和教师将通过哪些渠道或方式（如：实地考察、家长协助、图书阅读）来收集主题探究所需的资料？

第三阶段：活动设计与细节精修
目标：突破常规流程，深入挖掘实践细节、差异化处理和材料的可行性。
提问内容：
材料与环境：请描述您计划为本次主题准备的核心材料清单。有没有可以利用的废旧材料或自然材料来替代？您将如何创设环境或区角来支持主题探究？
差异化指导：请针对本次主题，设计一个差异化教学指导策略，以兼顾班级内学习能力较弱或有特殊兴趣的幼儿。
教师角色：在主题探究过程中，您认为教师最主要的角色定位是什么（如：观察者、协助者、提问者），并说明原因。

第四阶段：评估与元认知反思
目标：将任务提升到教研和反思的高度，审视课程设计的完整性和评估目标。
提问内容（请从以下方面依次提问）：
【最终成果的界定】评估方法：请根据本次课程是A类（传统主题）还是B类（PBL），调整提问侧重：
IF A（传统主题）：您预设将通过哪些可观察的幼儿行为或知识点的反馈来评估目标达成度？
IF B（PBL）：您计划在项目结束时，呈现哪种形式的最终成果？（例如：一个模型、一份报告、一次分享会、一场主题展览等）。该成果将如何展示幼儿的探究过程？
评估方法：请提供至少两种具体的、可观察的评估方法（如：观察记录、作品分析、谈话记录等）。
挑战预估：在本次主题设计过程中，您认为最具挑战性的环节是什么？您将如何应对这一挑战？
后续延伸：本次主题结束后，最有可能延伸出的下一主题是什么？
家园共育：您计划如何设计家园共育环节，以促进家长对主题活动的参与和支持？

【最终任务：文档整合与输出】
在我回答完你所有问题后，请将我提供的信息进行整合，以结构化表格和主题网络图的形式，撰写一份完整的主题课程方案文档。
【成果确认】请确保文档中包含 PBL 模式下的"最终成果设计说明"。
请确保文档具备系统性、专业性和可执行性，并忠实反映我所提供的信息，不做任何额外的想象或杜撰。`;

export default function ThemeCourseDesigner() {
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
      await callAI(SYSTEM_PROMPT, '请开始第一阶段的提问。', (chunk) => { fullResponse += chunk; });
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
        conversation.map(m => `${m.role === 'assistant' ? 'AI' : '我'}：${m.content}`).join('\n\n') + `\n\n我：${userMsg}`,
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
        body: JSON.stringify({ title: '主题课程设计方案', date: new Date().toLocaleDateString('zh-CN'), content })
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `主题课程方案_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) { console.error(e); alert('下载失败'); }
  };

  return (
    <div>
      <button onClick={() => navigate('/育见')} className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] mb-4"><ArrowLeft className="w-4 h-4" /> 返回</button>
      <h1 className="text-2xl font-bold text-[var(--color-text-main)] mb-6">主题课程设计</h1>
      {noApiKey && (
        <div className="bg-white rounded-2xl p-8 border border-[var(--color-border)] text-center">
          <Settings className="w-16 h-16 text-[var(--color-text-light)] mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-2">请先配置 API Key</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">在使用 AI 功能前，需要先在设置页配置你的 DeepSeek API Key</p>
          <button onClick={() => navigate('/设置')} className="px-6 py-3 bg-[#e8a87c] text-white rounded-xl hover:bg-[#d4946a] font-medium">去配置</button>
        </div>
      )}
      {!noApiKey && (
        <div className="bg-white rounded-2xl border border-[var(--color-border)]">
          <div className="p-5 max-h-[500px] overflow-y-auto space-y-4">
            {messages.length === 0 && loading && (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#e8a87c]" /><span className="ml-2 text-sm text-[var(--color-text-secondary)]">正在准备第一个问题...</span></div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[#e8a87c] text-white' : 'bg-[var(--color-warm-bg)] text-[var(--color-text-main)]'}`}>{msg.content}</div>
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
                  id: crypto.randomUUID(), type: 'theme-course',
                  title: '主题课程设计方案', childIds: [],
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
                className="flex-1 px-4 py-2.5 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-[#e8a87c] disabled:opacity-50" />
              <button onClick={sendMessage} disabled={loading || !input.trim()}
                className="px-4 py-2.5 bg-[#e8a87c] text-white rounded-xl hover:bg-[#d4946a] disabled:opacity-50"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
