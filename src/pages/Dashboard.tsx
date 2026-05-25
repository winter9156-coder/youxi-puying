import { useNavigate } from 'react-router-dom';
import { Eye, Lightbulb, HeartHandshake, FileText, Sparkles, MessageSquare, BarChart3, BookUser } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAllObservations, getAllPlans, getAllChildren } from '../db';
import type { Observation, EducationPlan } from '../types';

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-[var(--color-text-main)]">{value}</div>
          <div className="text-sm text-[var(--color-text-secondary)] mt-1">{label}</div>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, desc, onClick, color }: {
  icon: React.ElementType; label: string; desc: string;
  onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-4 p-4 bg-white rounded-xl border border-[var(--color-border)] hover:shadow-md transition-shadow text-left w-full"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <div className="font-semibold text-[var(--color-text-main)]">{label}</div>
        <div className="text-sm text-[var(--color-text-secondary)] mt-0.5">{desc}</div>
      </div>
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [obsCount, setObsCount] = useState(0);
  const [planCount, setPlanCount] = useState(0);
  const [childCount, setChildCount] = useState(0);
  const [userClassName, setUserClassName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      // 获取当前用户班级
      let myClass = '';
      let role = 'teacher';
      try {
        const u = JSON.parse(localStorage.getItem('edu_user') || '{}');
        role = u.role || 'teacher';
        if (role === 'teacher') myClass = u.data?.班级 || '';
      } catch {}
      setIsAdmin(role === 'admin');
      setUserClassName(myClass);

      const [allObs, allPlans, allChildren] = await Promise.all([
        getAllObservations(),
        getAllPlans(),
        getAllChildren(),
      ]);

      if (myClass) {
        // 教师：只统计本班级数据
        const classChildIds = new Set(
          allChildren.filter(c => c.class === myClass).map(c => c.id)
        );
        setChildCount(classChildIds.size);
        setObsCount(allObs.filter(o => o.childIds?.some(id => classChildIds.has(id))).length);
        setPlanCount(allPlans.filter(p => p.childIds?.some(id => classChildIds.has(id))).length);
      } else {
        // 管理员：统计全部
        setChildCount(allChildren.length);
        setObsCount(allObs.length);
        setPlanCount(allPlans.length);
      }
    })();
  }, []);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-main)]">
            {new Date().getHours() < 12 ? '上午好' : new Date().getHours() < 18 ? '下午好' : '晚上好'} 👋
          </h1>
          {userClassName && (
            <div className="text-sm text-[var(--color-primary)] mt-1">{userClassName}</div>
          )}
        </div>
        <div className="text-sm text-[var(--color-text-secondary)] mt-1">
          {new Date().getFullYear()}年{new Date().getMonth() + 1}月{new Date().getDate()}日
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="观察记录" value={obsCount} icon={Eye} color="bg-[var(--color-primary)]" />
        <StatCard label="已生成方案" value={planCount} icon={Lightbulb} color="bg-[var(--color-secondary)]" />
        <StatCard label={isAdmin ? '幼儿总数' : '在册幼儿'} value={childCount} icon={HeartHandshake} color="bg-[#e8a87c]" />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-3">快捷入口</h2>
        <div className="grid grid-cols-3 gap-3">
          <QuickAction
            icon={FileText}
            label="新建观察记录"
            desc="记录幼儿游戏行为，生成分析报告"
            onClick={() => navigate('/幼析/新建')}
            color="bg-[var(--color-primary)]"
          />
          <QuickAction
            icon={BookUser}
            label="幼儿档案"
            desc="查看幼儿发展档案"
            onClick={() => navigate('/幼儿档案')}
            color="bg-[var(--color-primary-light)]"
          />
          <QuickAction
            icon={Sparkles}
            label="生成思维共享方案"
            desc="设计游戏回顾讨论活动"
            onClick={() => navigate('/育见/思维共享')}
            color="bg-[var(--color-secondary)]"
          />
          <QuickAction
            icon={MessageSquare}
            label="家园沟通模拟"
            desc="模拟与家长沟通的场景"
            onClick={() => navigate('/协同共育/模拟器')}
            color="bg-[#e8a87c]"
          />
          <QuickAction
            icon={Lightbulb}
            label="PBL 方案设计"
            desc="设计项目式学习课程"
            onClick={() => navigate('/育见/pbl')}
            color="bg-[var(--color-primary-light)]"
          />
          <QuickAction
            icon={BarChart3}
            label="班级统计"
            desc="全班发展水平概览"
            onClick={() => navigate('/班级统计')}
            color="bg-purple-500"
          />
        </div>
      </div>
    </div>
  );
}
