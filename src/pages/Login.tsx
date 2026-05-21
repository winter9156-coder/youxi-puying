import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, LogIn, ChevronDown } from 'lucide-react';

const API_BASE = '';

// 43人名单，按角色排序（管理员在前方便查找）
const ALL_NAMES = [
  // 行政管理员
  '李念东','吴瑸','刘玉红','刘珊珊','刘梦','王洋洋',
  // 教师
  '刘沂柠','杨柳','郭宇涵','张雨晴','李昕怡','蔡涵',
  '周岩','芦丽','王文雪','徐可新','张建梅','孙乐',
  '张冉','纪思曼','都建昀','尹亭蕊','张斯婕','苏琦蕊',
  '邢佳杰','王旻姣','刘茜','谷雨','王玉','徐佳',
  '李亚洁','姜媛','鲁晨曦','李梦','马正颖','富佳妍',
  '程紫玉','田鑫颖','李一帆','伊金宝','张淼','李晓娇','李雪彤',
];

export default function Login() {
  const navigate = useNavigate();
  const [selectedName, setSelectedName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('edu_token')) navigate('/');
  }, [navigate]);

  const handleSubmit = async () => {
    setError('');
    if (!selectedName) { setError('请选择您的姓名'); return; }
    if (!password) { setError('请输入密码'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: selectedName, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '密码错误，请重试'); return; }
      localStorage.setItem('edu_token', data.token);
      localStorage.setItem('edu_user', JSON.stringify(data.user));
      navigate('/');
    } catch {
      setError('无法连接服务器');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-2xl overflow-hidden mx-auto mb-4">
            <img src="./logo-login.png" alt="蒲英向阳" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-main)]">幼析 · 育见</h1>
          <p className="text-sm text-[var(--color-text-light)] mt-1">蒲黄榆第二幼儿园 自主教研支持系统</p>
        </div>

        {/* 登录表单 */}
        <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)]">
          <h2 className="text-base font-bold text-[var(--color-text-main)] mb-4">登录</h2>

          <div className="space-y-3">
            {/* 姓名下拉 */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-light)] z-10" />
              <button type="button" onClick={() => setShowDropdown(!showDropdown)}
                className="w-full pl-10 pr-8 py-2.5 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm text-left focus:outline-none focus:border-[var(--color-primary)] cursor-pointer">
                <span className={selectedName ? '' : 'text-[var(--color-text-light)]'}>
                  {selectedName || '请选择您的姓名'}
                </span>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-light)]" />
              </button>
              {showDropdown && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-[var(--color-border)] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {ALL_NAMES.map(name => (
                    <button key={name} type="button" onClick={() => { setSelectedName(name); setShowDropdown(false); setError(''); }}
                      className={`w-full px-4 py-2 text-sm text-left hover:bg-[var(--color-warm-bg)] cursor-pointer transition-colors ${name === selectedName ? 'bg-[var(--color-warm-bg)] font-medium' : ''}`}>
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 密码输入 */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-light)]" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="请输入您的密码"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full pl-10 pr-3 py-2.5 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)]" />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full flex items-center justify-center gap-2 mt-4 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 cursor-pointer">
            <LogIn className="w-4 h-4" /> {loading ? '验证中...' : '进入系统'}
          </button>
        </div>
      </div>

      {/* 点击外部关闭下拉 */}
      {showDropdown && <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />}
    </div>
  );
}
