import { getSettings } from '../db';

let abortController: AbortController | null = null;

/**
 * 调用 AI 服务，支持流式输出
 * 本地开发通过 Vite proxy 转发，避免跨域问题
 */
export async function callAI(
  systemPrompt: string,
  userMessage: string,
  onChunk?: (text: string) => void,
): Promise<string> {
  const settings = await getSettings();
  const { modelName } = settings;

  // API Key优先级：settings中的key > 环境变量默认key
  const apiKey = settings.apiKey || import.meta.env.VITE_DEEPSEEK_API_KEY || '';
  const authHeader = apiKey ? `Bearer ${apiKey}` : '';

  // API 端点：优先使用 VITE_API_ENDPOINT（部署到 COS 时指向 SCF），否则使用本地代理
  const proxyEndpoint = import.meta.env.VITE_API_ENDPOINT || '/proxy/ai';

  abortController?.abort();
  abortController = new AbortController();

  const response = await fetch(`${proxyEndpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 8192,
    }),
    signal: abortController.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`请求失败 (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('无法读取响应流');

  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          onChunk?.(content);
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  return fullContent;
}

export function abortAIRequest() {
  abortController?.abort();
}
