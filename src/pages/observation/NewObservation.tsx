import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, Camera, Video, X, Sparkles, Mic, MicOff } from 'lucide-react';
import { getAllChildren, saveObservation, saveChild, saveAnalysisReport, saveMedia } from '../../db';
import { callAI } from '../../utils/ai';
import type { Child, Observation, AnalysisReport } from '../../types';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  file: File;
  preview: string;
  description: string;
}

function buildSystemPrompt() {
  return `# 角色
你是一位拥有 15 年一线经验的学前教育专家，同时也是幼儿观察与评价领域的实践导师。你精通《3-6 岁儿童学习与发展指南》、图式理论、发展心理学、学习品质框架及多元智能理论。

# 任务
根据我提供的观察素材，生成一份结构化、专业化、可用来支持后续教育的分析报告。

# 输出要求
请严格按照以下 7 大模块输出分析报告，每个模块需结合具体行为证据。

## 1. 行为摘要
用 2-3 句话概括幼儿在游戏中最突出的行为特征。

## 2. 《3-6 岁儿童发展指南》对标分析
- 分别从健康、语言、社会、科学、艺术五个领域（只选取与该行为明显相关的领域）
- 标出对应的子领域、具体目标（年龄班）以及幼儿当前表现出的水平

## 3. 图式行为识别
- 识别幼儿表现出的图式（如搬运、定位、旋转、围合、连接、轨迹、包裹、定向等）
- 解释该图式反映了幼儿何种内在认知建构需求。

## 4. 学习品质分析
- 从专注性、坚持性、灵活性、创造力、反思能力等维度分析
- 指出优势品质以及可能处于萌芽状态的品质。

## 5. 社会性与情绪发展
- 同伴互动方式（合作/平行/旁观/冲突等）
- 情绪表达与调节能力

## 6. 最近发展区与多元智能线索
- 最近发展区：幼儿在无帮助下能做到什么？在成人或同伴稍许帮助下可能达成什么？
- 多元智能：指出行为中可能凸显的优势智能（例如：身体-动觉、空间、逻辑-数学、人际等）。

## 7. 需要关注的潜在议题（如有）
- 可能会出现的发展不平衡、社交困难或安全风险等（如实描述，不夸大）

## 8. 教育支持策略（重点）
基于以上分析，为教师提供具体、可操作的后续支持建议。

**针对幼儿个体的支持策略**（3-5条）：
**针对教学环境的调整建议**（1-2条）：
**家园共育建议**（1-2条）：

---
最后，请以一段提示结束：**"以上分析基于本次单一观察片段，请结合幼儿日常表现与家庭背景综合判断，并由教师复核后再用于支持决策。"**`;
}

export default function NewObservation() {
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [newChildName, setNewChildName] = useState('');
  const [context, setContext] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [step, setStep] = useState<'input' | 'analyzing' | 'result'>('input');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [expressionPhotos, setExpressionPhotos] = useState<{id:string, preview:string, file:File}[]>([]);
  const [analyzingPhotoId, setAnalyzingPhotoId] = useState<string | null>(null);
  const [photoAnalyses, setPhotoAnalyses] = useState<Record<string, string>>({});
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const expressionPhotoRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('您的浏览器不支持语音输入，请使用 Chrome 或 Edge 浏览器');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interimText += event.results[i][0].transcript;
        }
      }
      setDescription(prev => {
        // 去掉上次的临时文字，追加新的
        const base = interimText ? prev.replace(/\s*\[.*?\]$/, '') : prev;
        return base + (finalText ? ' ' + finalText : '') + (interimText ? ' [' + interimText + ']' : '');
      });
    };
    recognition.onerror = () => {
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
    };
    recognition.start();
    setIsRecording(true);
  };

  useEffect(() => {
    getAllChildren().then(setChildren);
  }, []);

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const id = crypto.randomUUID();
      setMediaItems(prev => [...prev, {
        id,
        type: 'image',
        file,
        preview: URL.createObjectURL(file),
        description: ''
      }]);
    });
    e.target.value = '';
  };

  const handleAddVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const id = crypto.randomUUID();
      setMediaItems(prev => [...prev, {
        id,
        type: 'video',
        file,
        preview: URL.createObjectURL(file),
        description: ''
      }]);
    });
    e.target.value = '';
  };

  const handleRemoveMedia = (id: string) => {
    setMediaItems(prev => {
      const item = prev.find(m => m.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(m => m.id !== id);
    });
  };

  const handleMediaDescChange = (id: string, desc: string) => {
    setMediaItems(prev => prev.map(m => m.id === id ? { ...m, description: desc } : m));
  };

  const handleAddExpressionPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const id = crypto.randomUUID();
      setExpressionPhotos(prev => [...prev, { id, file, preview: URL.createObjectURL(file) }]);
    });
    e.target.value = '';
  };

  const handleRemoveExpressionPhoto = (id: string) => {
    setExpressionPhotos(prev => {
      const item = prev.find(p => p.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(p => p.id !== id);
    });
  };

  const analyzeExpressionPhoto = async (photoId: string, photoPreview: string) => {
    setAnalyzingPhotoId(photoId);
    try {
      const { getSettings } = await import('../../db');
      const settings = await getSettings();
      const auth = settings.apiKey ? `Bearer ${settings.apiKey}` : '';
      const reader = new FileReader();
      const blob = await fetch(photoPreview).then(r => r.blob());
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        try {
          const res = await fetch('/proxy/ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': auth },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [
                { role: 'system', content: '你是一位学前教育专家，请分析这张幼儿作品/表达表征照片，从幼儿的发展水平、图式行为、学习品质等角度给出专业解读，语言简洁明了，100字左右。' },
                { role: 'user', content: '请从学前教育专业角度分析这张幼儿表达表征照片。' }
              ],
              max_tokens: 300
            })
          });
          const data = await res.json();
          const analysis = data.choices?.[0]?.message?.content || 'AI分析暂不可用';
          setPhotoAnalyses(prev => ({ ...prev, [photoId]: analysis }));
        } catch (e) {
          setPhotoAnalyses(prev => ({ ...prev, [photoId]: '分析失败：' + (e as Error).message }));
        }
        setAnalyzingPhotoId(null);
      };
    } catch (e) {
      setPhotoAnalyses(prev => ({ ...prev, [photoId]: '分析失败：' + (e as Error).message }));
      setAnalyzingPhotoId(null);
    }
  };

  const handleAddChild = async () => {
    const name = newChildName.trim();
    if (!name) return;
    const child: Child = {
      id: crypto.randomUUID(),
      name,
      birthDate: '', class: '', tags: [], notes: '', createdAt: new Date().toISOString(),
    };
    await saveChild(child);
    setChildren(prev => [...prev, child]);
    setSelectedChildIds(prev => [...prev, child.id]);
    setNewChildName('');
  };

  const handleSubmit = async () => {
    if (!selectedChildIds.length || !description.trim()) return;
    setLoading(true);
    setStep('analyzing');
    setStreamContent('');

    // 获取当前登录教师姓名
    let teacherName = '';
    try {
      const u = JSON.parse(localStorage.getItem('edu_user') || '{}');
      teacherName = u.name || '';
    } catch {}

    try {
      // 构建用户输入
      let userInput = `幼儿化名：${children.filter(c => selectedChildIds.includes(c.id)).map(c => c.name).join('、')}\n`;
      if (context) userInput += `观察场景：${context}\n`;
      userInput += `\n白描行为记录：\n${description}`;

      // 添加媒体描述
      if (mediaItems.length > 0) {
        userInput += '\n\n附加素材说明：';
        mediaItems.forEach((m, i) => {
          userInput += `\n素材${i + 1}（${m.type === 'image' ? '照片' : '视频'}）`;
          if (m.description) userInput += `：${m.description}`;
        });
      }

      // 先保存媒体文件到数据库
      const mediaIds: string[] = [];
      for (const item of [...mediaItems, ...expressionPhotos]) {
        const blob = await fetch(item.preview).then(r => r.blob());
        await saveMedia(item.id, blob);
        mediaIds.push(item.id);
      }

      // 保存观察记录
      const obsId = crypto.randomUUID();
      const obs: Observation = {
        id: obsId,
        childIds: selectedChildIds,
        date: date || new Date().toISOString().split('T')[0],
        context,
        whiteDescription: description,
        childExpression: '',
        teacherDialogue: '',
        mediaUrls: mediaIds,
        teacherName,
        createdAt: new Date().toISOString(),
      };
      await saveObservation(obs);

      // 调用 AI 分析
      let fullResponse = '';
      await callAI(buildSystemPrompt(), userInput, (chunk) => {
        fullResponse += chunk;
        setStreamContent(fullResponse);
      });

      // 保存分析报告
      const report: AnalysisReport = {
        id: crypto.randomUUID(),
        observationId: obsId,
        childId: selectedChildIds[0],
        caseAnalysis: fullResponse,
        childEvaluation: '',
        teacherEvaluation: '',
        improvementMeasures: '',
        perspectives: {},
        status: 'draft',
        teacherNote: '',
        createdAt: new Date().toISOString(),
      };
      await saveAnalysisReport(report);

      setStreamContent('');
      setStep('result');
      setTimeout(() => navigate(`/幼析/分析/${obsId}`), 1500);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setStreamContent(`⚠️ 分析失败：${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'result') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-[var(--color-text-main)] mb-2">分析完成！</h2>
        <p className="text-sm text-[var(--color-text-light)]">正在跳转查看报告...</p>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate('/幼析')}
        className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] mb-4">
        <ArrowLeft className="w-4 h-4" /> 返回列表
      </button>

      <h1 className="text-2xl font-bold text-[var(--color-text-main)] mb-6">新建观察记录</h1>

      {/* 分析对象 + 观察时间 并列 */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-2">
            分析对象 <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {children.map(child => (
              <button key={child.id}
                onClick={() => setSelectedChildIds(prev =>
                  prev.includes(child.id) ? prev.filter(id => id !== child.id) : [...prev, child.id]
                )}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedChildIds.includes(child.id)
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-warm-bg)] text-[var(--color-text-main)] hover:bg-[var(--color-border)]'
                }`}>
                {child.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input value={newChildName} onChange={e => setNewChildName(e.target.value)}
              placeholder="新幼儿姓名"
              className="flex-1 px-3 py-1.5 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-lg text-sm"
              onKeyDown={e => e.key === 'Enter' && handleAddChild()} />
            <button onClick={handleAddChild}
              className="px-3 py-1.5 bg-[var(--color-primary-light)] text-white rounded-lg text-sm">
              添加
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-2">
            观察时间 <span className="text-red-500">*</span>
          </label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xl text-sm" />
        </div>
      </div>

      {/* 观察场景 */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-2">观察场景</label>
        <input value={context} onChange={e => setContext(e.target.value)}
          placeholder="如：户外建构区 / 益智区 / 角色扮演区..."
          className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xl text-sm" />
      </div>

      {/* 白描记录 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-[var(--color-text-main)]">
            白描行为记录 <span className="text-red-500">*</span>
          </label>
          <button onClick={toggleRecording}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isRecording
                ? 'bg-red-100 text-red-600 animate-pulse'
                : 'bg-[var(--color-warm-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
            }`}>
            {isRecording ? (
              <><MicOff className="w-3.5 h-3.5" /> 停止录音</>
            ) : (
              <><Mic className="w-3.5 h-3.5" /> 语音输入</>
            )}
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-light)] mb-2">
          客观描述幼儿的行为，不掺杂评价（如：幼儿拿起积木，试着叠放了三块...）
        </p>
        <textarea ref={textareaRef} value={description} onChange={e => setDescription(e.target.value)}
          placeholder="在此输入对幼儿游戏行为的白描记录..."
          rows={10}
          className="w-full px-4 py-3 bg-white border border-[var(--color-border)] rounded-xl text-sm resize-none focus:outline-none focus:border-[var(--color-primary)]" />
        {isRecording && (
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-500">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            正在录音，请说话...
          </div>
        )}
      </div>

      {/* 照片/视频上传 — 记录现场 */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-2">现场素材（可选）</label>
        <div className="flex gap-2 mb-3">
          <button onClick={() => photoInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm hover:bg-gray-100 transition-colors">
            <Camera className="w-4 h-4" /> 添加照片
          </button>
          <button onClick={() => videoInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm hover:bg-gray-100 transition-colors">
            <Video className="w-4 h-4" /> 添加视频
          </button>
        </div>
        <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddPhoto} />
        <input ref={videoInputRef} type="file" accept="video/*" multiple className="hidden" onChange={handleAddVideo} />
        {mediaItems.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {mediaItems.filter(m => m.type === 'image' || m.type === 'video').map(item => (
              <div key={item.id} className="relative bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
                <button onClick={() => handleRemoveMedia(item.id)}
                  className="absolute top-2 right-2 z-10 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white">
                  <X className="w-3 h-3" />
                </button>
                {item.type === 'image' ? (
                  <img src={item.preview} alt="照片" className="w-full h-32 object-cover" />
                ) : (
                  <video src={item.preview} className="w-full h-32 object-cover" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 表达表征记录 — 拍照上传 */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-2">表达表征记录</label>
        <p className="text-xs text-[var(--color-text-light)] mb-2">拍摄幼儿的作品、绘画或关键表征画面（仅照片，可多张）</p>
        <input ref={expressionPhotoRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddExpressionPhoto} />
        <button onClick={() => expressionPhotoRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm hover:bg-gray-100 transition-colors">
          <Camera className="w-4 h-4" /> 拍摄/上传表达表征照片
        </button>
        {expressionPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {expressionPhotos.map(item => (
              <div key={item.id} className="relative rounded-xl overflow-hidden border border-[var(--color-border)]">
                <button onClick={() => handleRemoveExpressionPhoto(item.id)}
                  className="absolute top-1 right-1 z-10 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white">
                  <X className="w-2.5 h-2.5" />
                </button>
                <img src={item.preview} alt="表达表征" className="w-full h-24 object-cover" />
                <div className="p-1.5 space-y-1">
                  <button onClick={() => analyzeExpressionPhoto(item.id, item.preview)}
                    disabled={analyzingPhotoId === item.id}
                    className="w-full text-xs py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded hover:bg-[var(--color-primary)]/20 transition-colors">
                    {analyzingPhotoId === item.id ? '分析中...' : 'AI分析'}
                  </button>
                  {photoAnalyses[item.id] && (
                    <p className="text-[10px] text-[var(--color-text-secondary)] leading-relaxed">{photoAnalyses[item.id]}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 提交按钮 */}
      <button onClick={handleSubmit} disabled={loading || !selectedChildIds.length || !description.trim()}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium disabled:opacity-50 hover:bg-[var(--color-primary-dark)] transition-colors">
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> 分析中...</>
        ) : (
          <><Send className="w-4 h-4" /> 提交分析</>
        )}
      </button>

      {/* 流式分析结果 */}
      {streamContent && (
        <div className="mt-6 p-4 bg-white rounded-2xl border border-[var(--color-border)] max-h-96 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[var(--color-primary)] animate-pulse" />
            <span className="text-sm font-semibold text-[var(--color-text-main)]">正在生成分析报告...</span>
          </div>
          <div className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">
            {streamContent.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*/g, '').replace(/#{1,6}\s*/g, '')}
          </div>
        </div>
      )}
    </div>
  );
}
