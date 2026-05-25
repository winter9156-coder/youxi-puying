import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Eye, FileText, Sparkles, BookOpen, Lightbulb, HeartHandshake } from 'lucide-react';
import { getAllObservations, getAllChildren, getReportsByChild } from '../db';
import type { Observation, Child, AnalysisReport } from '../types';

interface DomainStat {
  label: string;
  count: number;
  children: string[];
  icon: React.ElementType;
  color: string;
}

export default function ClassStats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DomainStat[]>([]);
  const [totalObs, setTotalObs] = useState(0);
  const [totalChildren, setTotalChildren] = useState(0);
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

      const allObs = await getAllObservations();
      const allChildren = await getAllChildren();

      let classChildren: Child[];
      let classObs: Observation[];

      if (myClass) {
        // 教师：只统计本班级
        classChildren = allChildren.filter(c => c.class === myClass);
        const classChildIds = new Set(classChildren.map(c => c.id));
        classObs = allObs.filter(o => o.childIds?.some(id => classChildIds.has(id)));
      } else {
        // 管理员：统计全部
        classChildren = allChildren;
        classObs = allObs;
      }

      setTotalObs(classObs.length);
      setTotalChildren(classChildren.length);

      const domains: DomainStat[] = [
        { label: '语言领域', count: 0, children: [], icon: BookOpen, color: 'bg-blue-500' },
        { label: '社会领域', count: 0, children: [], icon: HeartHandshake, color: 'bg-pink-500' },
        { label: '科学领域', count: 0, children: [], icon: Sparkles, color: 'bg-purple-500' },
        { label: '艺术领域', count: 0, children: [], icon: Eye, color: 'bg-amber-500' },
        { label: '学习品质', count: 0, children: [], icon: Lightbulb, color: 'bg-teal-500' },
      ];

      for (const c of classChildren) {
        const reports = await getReportsByChild(c.id);
        const allText = reports.map(r => r.caseAnalysis).join(' ');
        domains.forEach(d => {
          if (allText.includes(d.label.replace('领域', '').replace('学习品质', '学习品质'))) {
            d.count++;
            d.children.push(c.name);
          }
        });
      }
      setStats(domains);
    })();
  }, []);

  return (
    <div>
      <button onClick={() => navigate('/')}
        className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] mb-4">
        <ArrowLeft className="w-4 h-4" /> 返回工作台
      </button>

      <div className="flex items-center gap-3 mb-2">
        <BarChart3 className="w-6 h-6 text-[var(--color-primary)]" />
        <h1 className="text-2xl font-bold text-[var(--color-text-main)]">班级统计分析</h1>
      </div>
      {userClassName && (
        <div className="text-sm text-[var(--color-primary)] mb-6 font-medium">{userClassName}</div>
      )}
      {!isAdmin && !userClassName && (
        <div className="text-sm text-orange-500 mb-6">未分配班级，显示全部数据</div>
      )}

      {/* 概览卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
          <div className="text-3xl font-bold text-[var(--color-primary)]">{totalObs}</div>
          <div className="text-sm text-[var(--color-text-light)] mt-1">观察记录总数</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
          <div className="text-3xl font-bold text-[var(--color-secondary)]">{totalChildren}</div>
          <div className="text-sm text-[var(--color-text-light)] mt-1">在册幼儿</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
          <div className="text-3xl font-bold text-[var(--color-text-main)]">{totalChildren > 0 ? Math.round(totalObs / totalChildren * 10) / 10 : 0}</div>
          <div className="text-sm text-[var(--color-text-light)] mt-1">人均观察次数</div>
        </div>
      </div>

      {/* 各领域统计 */}
      <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-4">各领域分析覆盖情况</h2>
      <div className="grid grid-cols-1 gap-4">
        {stats.map(s => {
          const pct = totalChildren > 0 ? Math.round(s.count / totalChildren * 100) : 0;
          return (
            <div key={s.label} className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center`}>
                    <s.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-bold text-[var(--color-text-main)]">{s.label}</span>
                </div>
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {s.count}/{totalChildren} 人（{pct}%）
                </span>
              </div>
              <div className="w-full h-2 bg-[var(--color-warm-bg)] rounded-full overflow-hidden">
                <div className={`h-full ${s.color} rounded-full transition-all duration-500`}
                  style={{ width: `${pct}%` }} />
              </div>
              {s.children.length > 0 && (
                <div className="mt-2 text-xs text-[var(--color-text-light)]">
                  涉及幼儿：{s.children.join('、')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-[var(--color-warm-bg)] rounded-2xl border border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-text-light)] leading-relaxed">
          💡 统计基于已生成的观察分析报告。数值越高说明该领域被关注的次数越多。<br/>
          建议关注覆盖率较低的领域，确保对幼儿发展的观察更加全面均衡。
        </p>
      </div>
    </div>
  );
}
