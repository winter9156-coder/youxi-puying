import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Bot, HeartHandshake, FolderOpen, Eye, Trash2, ChevronDown, ChevronUp, User } from 'lucide-react';
import { getAllPlans, deletePlan } from '../../db';
import type { EducationPlan } from '../../types';

const typeLabels: Record<string, string> = {
  'communication': '沟通策略',
};

const typeColors: Record<string, string> = {
  'communication': 'var(--color-secondary)',
};

export default function CooperationHome() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<EducationPlan[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserClass, setCurrentUserClass] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('edu_user') || '{}');
    setIsAdmin(u.role === 'admin');
    setCurrentUserClass(u.data?.班级 || '');
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const allPlans = await getAllPlans();
      // 只显示协同共育类型的方案
      const coopPlans = allPlans.filter(p => p.type === 'communication');

      const u = JSON.parse(localStorage.getItem('edu_user') || '{}');
      const role = u.role || 'teacher';
      const myClass = u.data?.班级 || '';

      let filtered;
      if (role === 'admin') {
        filtered = coopPlans;
      } else {
        filtered = coopPlans.filter(p => p.teacherClass === myClass);
      }
      setPlans(filtered);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这份方案吗？')) return;
    await deletePlan(id);
    loadPlans();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getSummary = (content: string) => {
    const text = content.replace(/[#*\-_>]/g, '').replace(/\n+/g, ' ').trim();
    return text.length > 150 ? text.slice(0, 150) + '...' : text;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-main)]">协同共育</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          家园沟通与家庭支持
          {isAdmin && (
            <span className="ml-2 text-xs bg-[var(--color-secondary)] text-white px-2 py-0.5 rounded-full">
              管理员视角 - 查看全部方案
            </span>
          )}
        </p>
      </div>

      {/* 导航卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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

      {/* 已保存方案列表 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="w-5 h-5 text-[var(--color-secondary)]" />
          <h2 className="text-lg font-bold text-[var(--color-text-main)]">
            已保存方案
            {!isAdmin && currentUserClass && (
              <span className="ml-2 text-sm font-normal text-[var(--color-text-secondary)]">
                ({currentUserClass})
              </span>
            )}
          </h2>
          <span className="text-xs text-[var(--color-text-light)] bg-[var(--color-warm-bg)] px-2 py-0.5 rounded-full">
            {plans.length} 份
          </span>
        </div>

        {loading ? (
          <div className="text-center py-8 text-sm text-[var(--color-text-light)]">加载中...</div>
        ) : plans.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-[var(--color-border)] text-center">
            <FolderOpen className="w-12 h-12 text-[var(--color-text-light)] mx-auto mb-3" />
            <p className="text-sm text-[var(--color-text-secondary)]">
              {isAdmin ? '暂无教师保存的沟通方案' : '暂无已保存的沟通方案'}
            </p>
            <p className="text-xs text-[var(--color-text-light)] mt-1">
              点击上方卡片开始生成
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map(plan => (
              <div
                key={plan.id}
                className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden hover:shadow-sm transition-shadow"
              >
                <div
                  className="p-4 cursor-pointer flex items-start gap-3"
                  onClick={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: typeColors[plan.type] || 'var(--color-secondary)' }}
                  >
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: typeColors[plan.type] || 'var(--color-secondary)' }}
                      >
                        {typeLabels[plan.type] || plan.type}
                      </span>
                      <span className="text-xs text-[var(--color-text-light)]">
                        {formatDate(plan.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <User className="w-3.5 h-3.5 text-[var(--color-text-light)]" />
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        {plan.teacherName || '未知教师'}
                        {plan.teacherClass && (
                          <span className="text-[var(--color-text-light)]">
                            {' · '}{plan.teacherClass}
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1.5 line-clamp-2">
                      {getSummary(plan.content)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {expandedId === plan.id ? (
                      <ChevronUp className="w-4 h-4 text-[var(--color-text-light)]" />
                    ) : (
                      <Eye className="w-4 h-4 text-[var(--color-text-light)]" />
                    )}
                    <button
                      onClick={(e) => handleDelete(plan.id, e)}
                      className="p-1 text-[var(--color-text-light)] hover:text-red-500 transition-colors"
                      title="删除方案"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {expandedId === plan.id && (
                  <div className="border-t border-[var(--color-border)] p-4 bg-[var(--color-warm-bg)]">
                    <div className="text-sm text-[var(--color-text-main)] whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                      {plan.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
