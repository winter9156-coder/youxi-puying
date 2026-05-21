import { useNavigate } from 'react-router-dom';
import { Lightbulb, MessageCircle, Presentation, LayoutList } from 'lucide-react';

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

export default function StrategyList() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-main)]">育见</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          生成教学方案与支持策略
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    </div>
  );
}
