import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, MessageCircle, Presentation, LayoutList, Eye, Trash2, ChevronDown, ChevronUp, User, FolderOpen } from 'lucide-react';
import { getAllPlans, deletePlan } from '../../db';
import type { EducationPlan } from '../../types';

const strategyTypes = [
  {
    type: 'shared-thinking',
    label: '思维共享活动',
    desc: '自主游戏后的回顾讨论方案设计',
    icon: MessageCircle,
    color: 'bg-[var(--color-primary)]',
    route: '/育见/思维共享',
  },
  {
    type: 'pbl',
    label: 'PBL 项目式学习',
    desc: '深度学习与开放式探究课程设计',
    icon: Presentation,
    color: 'bg-[var(--color-secondary)]',
    route: '/育见/pbl',
  },
  {
    type: 'theme-course',
    label: '主题课程设计',
    desc: '传统主题课程或PBL双路径方案',
    icon: LayoutList,
    color: 'bg-[#e8a87c]',
    route: '/育见/主题课程',
  },
  {
    type: 'strategy',
    label: '通用策略生成',
    desc: '基于分析结果生成支撑策略',
    icon: Lightbulb,
    color: 'bg-[var(--color-primary-light)]',
    route: '/育见/策略',
  },
];

const typeLabels: Record<string, string> = {
  'shared-thinking': '思维共享活动',
  'pbl': 'PBL 项目式学习',
  'theme-course': '主题课程设计',
  'strategy': '通用策略',
};

const typeColors: Record<string, string> = {
  'shared-thinking': 'var(--color-primary)',
  'pbl': 'var(--color-secondary)',
  'theme-course': '#e8a87c',
  'strategy': 'var(--color-primary-light)',
};

export default function StrategyList() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<EducationPlan[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserClass, setCurrentUserClass] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 获取当前用户信息
    const u = JSON.parse(localStorage.getItem('edu_user') || '{}');
    setIsAdmin(u.role === 'admin');
    setCurrentUserName(u.name || '');
    setCurrentUserClass(u.data?.班级 || '');

    // 加载所有方案
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    const allPlans = await getAllPlans();

    // 按权限过滤：管理员看所有，教师看本班
    const u = JSON.parse(localStorage.getItem('edu_user') || '{}');
    const role = u.role || 'teacher';
    const myClass = u.data?.班级 || '';

    let filtered;
    if (role === 'admin') {
      filtered = allPlans;
    } else {
      filtered = allPlans.filter(p => p.teacherClass === myClass);
    }

    setPlans(filtered);
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

  // 截取 content 前 150 字作为摘要
  const getSummary = (content: string) => {
    const text = content.replace(/[#*\-_>]/g, '').replace(/\n+/g, ' ').trim();
    return text.length > 150 ? text.slice(0, 150) + '...' : text;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-main)]">育见</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          生成教学方案与支持策略
          {isAdmin && (
            <span className="ml-2 text-xs bg-[var(--color-primary)] text-white px-2 py-0.5 rounded-full">
              管理员视角 - 查看全部方案
            </span>
          )}
        </p>
      </div>

      {/* 导航卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {strategyTypes.map(s => (
          <button
            key={s.type}
            onClick={() => navigate(s.route)}
            className="bg-white rounded-2xl p-6 border border-[var(--color-border)] hover:shadow-md transition-shadow text-left"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${s.color}`}>
              <s.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-1">{s.label}</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">{s.desc}</p>
          </button>
        ))}
      </div>

      {/* 已保存方案列表 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="w-5 h-5 text-[var(--color-primary)]" />
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
              {isAdmin ? '暂无教师保存的方案' : '暂无已保存的方案'}
            </p>
            <p className="text-xs text-[var(--color-text-light)] mt-1">
              点击上方卡片开始设计
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map(plan => (
              <div
                key={plan.id}
                className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden hover:shadow-sm transition-shadow"
              >
                {/* 方案头部 */}
                <div
                  className="p-4 cursor-pointer flex items-start gap-3"
                  onClick={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: typeColors[plan.type] || 'var(--color-primary)' }}
                  >
                    {plan.type === 'shared-thinking' && <MessageCircle className="w-5 h-5 text-white" />}
                    {plan.type === 'pbl' && <Presentation className="w-5 h-5 text-white" />}
                    {plan.type === 'theme-course' && <LayoutList className="w-5 h-5 text-white" />}
                    {plan.type === 'strategy' && <Lightbulb className="w-5 h-5 text-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: typeColors[plan.type] || 'var(--color-primary)' }}
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

                {/* 展开详情 */}
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
