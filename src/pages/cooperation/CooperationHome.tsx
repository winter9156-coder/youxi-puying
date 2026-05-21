import { useNavigate } from 'react-router-dom';
import { MessageSquare, Bot, HeartHandshake } from 'lucide-react';

export default function CooperationHome() {
  const navigate = useNavigate();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-main)]">协同共育</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">家园沟通与家庭支持</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={() => navigate('/协同共育/沟通助手')}
          className="bg-white rounded-2xl p-6 border border-[var(--color-border)] hover:shadow-md transition-shadow text-left">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-[var(--color-primary)]">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-1">沟通助手</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">生成面向家长的沟通话术</p>
        </button>
        <button onClick={() => navigate('/协同共育/模拟器')}
          className="bg-white rounded-2xl p-6 border border-[var(--color-border)] hover:shadow-md transition-shadow text-left">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-[var(--color-secondary)]">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-1">沟通模拟器</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">五阶段模拟实战演练</p>
        </button>
        <button
          className="bg-white rounded-2xl p-6 border border-[var(--color-border)] hover:shadow-md transition-shadow text-left opacity-60 cursor-not-allowed">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-[#e8a87c]">
            <HeartHandshake className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-1">家庭支持指南</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">生成亲子游戏与家庭任务（即将推出）</p>
        </button>
      </div>
    </div>
  );
}
