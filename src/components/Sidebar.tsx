import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Eye, Lightbulb, HeartHandshake,
  BookUser, Settings, BarChart3, LogOut, Database, MessageSquare
} from 'lucide-react';

export default function Sidebar() {
  const navigate = useNavigate();
  const userStr = localStorage.getItem('edu_user');
  let userRole = 'teacher';
  let currentUser = '';
  try {
    const u = JSON.parse(userStr || '{}');
    currentUser = u.name || '';
    userRole = u.role || 'teacher';
  } catch {}
  const userClass = currentUser && userRole === 'teacher' ? (JSON.parse(userStr || '{}').data?.班级 || '') : '';

  // 所有用户都有的导航项
  const commonItems = [
    { to: '/', icon: LayoutDashboard, label: '工作台' },
    { to: '/幼析', icon: Eye, label: '幼析' },
    { to: '/育见', icon: Lightbulb, label: '育见' },
    { to: '/协同共育', icon: HeartHandshake, label: '协同共育' },
    { to: '/幼儿档案', icon: BookUser, label: '幼儿档案' },
    { to: '/班级统计', icon: BarChart3, label: '班级统计' },
  ];

  // 仅管理员可见（非王洋洋）
  const adminItems = [
    { to: '/观师荐策', icon: MessageSquare, label: '观师荐策' },
  ];

  // 仅王洋洋可见
  const superAdminItems = [
    { to: '/观师荐策', icon: MessageSquare, label: '观师荐策' },
    { to: '/数据管理', icon: Database, label: '数据管理' },
    { to: '/设置', icon: Settings, label: '设置' },
  ];

  const isSuperAdmin = currentUser === '王洋洋';
  let navItems;
  if (isSuperAdmin) {
    navItems = [...commonItems, ...superAdminItems];
  } else if (userRole === 'admin') {
    navItems = [...commonItems, ...adminItems];
  } else {
    navItems = commonItems;
  }

  const handleLogout = () => {
    localStorage.removeItem('edu_token');
    localStorage.removeItem('edu_user');
    navigate('/登录');
  };

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-[var(--color-border)] flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
            <img src="./logo-login.png" alt="蒲英向阳" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--color-text-main)] leading-tight">幼析 · 育见</div>
            <div className="text-[10px] text-[var(--color-text-light)] leading-tight mt-0.5">
              <div>蒲黄榆第二幼儿园</div>
              <div>自主教研支持系统</div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-warm-bg)]'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[var(--color-border)] space-y-2">
        {currentUser && (
          <div className="text-xs text-[var(--color-text-light)] leading-relaxed">
            <div>{currentUser}</div>
            {userClass && <div className="text-[var(--color-primary)] font-medium">{userClass}</div>}
            {userRole === 'admin' && <span className="text-[var(--color-primary)]">(管理员)</span>}
          </div>
        )}
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] hover:text-red-500 transition-colors">
          <LogOut className="w-3.5 h-3.5" /> 退出登录
        </button>
      </div>
    </aside>
  );
}
