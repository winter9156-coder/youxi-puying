import { useEffect, useState } from 'react';
import { Save, Key, Globe, Server, Lock, ShieldAlert, Download } from 'lucide-react';
import { getSettings, saveSettings } from '../db';
import type { AppSettings } from '../types';

type PageMode = 'initial' | 'locked' | 'unlock' | 'edit';

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>({
    apiKey: '', apiEndpoint: '/proxy/ai', modelName: 'deepseek-chat',
    theme: 'warm', adminPassword: '',
  });
  const [mode, setMode] = useState<PageMode>('initial');
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // 管理员密码相关
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [unlockPwd, setUnlockPwd] = useState('');
  const [pwdError, setPwdError] = useState('');

  useEffect(() => {
    (async () => {
      const s = await getSettings();
      setSettings(s);
      if (s.apiKey && s.adminPassword) {
        setMode('locked');
      } else if (s.apiKey && !s.adminPassword) {
        // 旧数据迁移：已有密钥但未设密码
        setMode('edit');
      } else {
        setMode('initial');
      }
    })();
  }, []);

  // 首次设置：密钥 + 管理员密码
  const handleInitialSave = async () => {
    if (!settings.apiKey) { setPwdError('请输入服务密钥'); return; }
    if (!newPwd) { setPwdError('请设置管理员密码'); return; }
    if (newPwd !== confirmPwd) { setPwdError('两次密码输入不一致'); return; }
    if (newPwd.length < 4) { setPwdError('密码至少4位'); return; }
    setPwdError('');

    await saveSettings({ ...settings, adminPassword: newPwd });
    setMode('locked');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // 验证管理员密码
  const handleUnlock = async () => {
    if (unlockPwd !== settings.adminPassword) {
      setPwdError('管理员密码错误');
      return;
    }
    setPwdError('');
    setMode('edit');
    setUnlockPwd('');
  };

  // 修改后保存
  const handleEditSave = async () => {
    if (!settings.apiKey) { setPwdError('请输入服务密钥'); return; }
    setPwdError('');
    await saveSettings(settings);
    setMode('locked');
    setShowKey(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // 重置密码流程
  const [changingPwd, setChangingPwd] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');
  const [confirmPwd2, setConfirmPwd2] = useState('');

  const handleChangePassword = async () => {
    if (oldPwd !== settings.adminPassword) { setPwdError('原密码错误'); return; }
    if (!newPwd2) { setPwdError('请输入新密码'); return; }
    if (newPwd2 !== confirmPwd2) { setPwdError('两次密码输入不一致'); return; }
    if (newPwd2.length < 4) { setPwdError('密码至少4位'); return; }
    setPwdError('');
    await saveSettings({ ...settings, adminPassword: newPwd2 });
    setChangingPwd(false);
    setOldPwd(''); setNewPwd2(''); setConfirmPwd2('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-main)]">设置</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">系统偏好与连接配置</p>
      </div>

      <div className="max-w-2xl space-y-4">

        {/* ===== 服务密钥区块 ===== */}
        <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
          <div className="flex items-center gap-2 mb-3">
            {mode === 'locked' ? (
              <ShieldAlert className="w-5 h-5 text-green-600" />
            ) : (
              <Key className="w-5 h-5 text-[var(--color-primary)]" />
            )}
            <h3 className="text-sm font-bold text-[var(--color-text-main)]">服务密钥</h3>
          </div>

          {/* 状态1：已锁定 — 完全隐藏密钥 */}
          {mode === 'locked' && (
            <div>
              <div className="flex items-center gap-2 px-3 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                <ShieldAlert className="w-4 h-4" />
                服务密钥已配置，受管理员密码保护
              </div>
              <button
                onClick={() => { setMode('unlock'); setPwdError(''); }}
                className="mt-3 px-4 py-2 text-sm bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-xl hover:bg-[var(--color-warm-bg)]"
              >
                修改密钥
              </button>
            </div>
          )}

          {/* 状态2：解锁验证 */}
          {mode === 'unlock' && (
            <div>
              <p className="text-xs text-[var(--color-text-secondary)] mb-2">请输入管理员密码以修改密钥</p>
              <input type="password" value={unlockPwd}
                onChange={e => { setUnlockPwd(e.target.value); setPwdError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                placeholder="输入管理员密码"
                className="w-full px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)]"
                autoFocus
              />
              {pwdError && <p className="text-xs text-red-500 mt-1">{pwdError}</p>}
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setMode('locked'); setUnlockPwd(''); setPwdError(''); }}
                  className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-warm-bg)] rounded-lg">取消</button>
                <button onClick={handleUnlock}
                  className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]">验证</button>
              </div>
            </div>
          )}

          {/* 状态3：编辑模式 */}
          {(mode === 'edit' || mode === 'initial') && mode !== 'unlock' && (
            <div>
              <div className="relative">
                <input type={showKey ? 'text' : 'password'}
                  value={settings.apiKey}
                  onChange={e => setSettings({ ...settings, apiKey: e.target.value })}
                  placeholder="请输入服务密钥"
                  className="w-full px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
                <button onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-light)] hover:text-[var(--color-text-main)]">
                  {showKey ? '隐藏' : '显示'}
                </button>
              </div>

              {/* 首次设置：需设管理员密码 */}
              {mode === 'initial' && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[var(--color-secondary)]" />
                    <span className="text-xs font-semibold text-[var(--color-text-main)]">设置管理员密码</span>
                  </div>
                  <input type="password" value={newPwd}
                    onChange={e => { setNewPwd(e.target.value); setPwdError(''); }}
                    placeholder="设置管理员密码（不少于4位）"
                    className="w-full px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-secondary)]" />
                  <input type="password" value={confirmPwd}
                    onChange={e => { setConfirmPwd(e.target.value); setPwdError(''); }}
                    placeholder="再次输入管理员密码"
                    className="w-full px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-secondary)]" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ===== 服务地址 ===== */}
        <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-5 h-5 text-[var(--color-secondary)]" />
            <h3 className="text-sm font-bold text-[var(--color-text-main)]">服务地址</h3>
          </div>
          <input type="text" value={settings.apiEndpoint}
            onChange={e => setSettings({ ...settings, apiEndpoint: e.target.value })}
            className="w-full px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-secondary)]" />
        </div>

        {/* ===== 模型选择 ===== */}
        <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-5 h-5 text-[#e8a87c]" />
            <h3 className="text-sm font-bold text-[var(--color-text-main)]">模型选择</h3>
          </div>
          <select value={settings.modelName}
            onChange={e => setSettings({ ...settings, modelName: e.target.value })}
            className="w-full px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-[#e8a87c]">
            <option value="deepseek-chat">标准模型</option>
            <option value="deepseek-reasoner">深度推理模型</option>
          </select>
        </div>

        {/* ===== 保存按钮 ===== */}
        {mode === 'initial' ? (
          <button onClick={handleInitialSave}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-dark)] font-medium">
            <Save className="w-4 h-4" />{saved ? '已保存 ✓' : '保存并锁定'}
          </button>
        ) : mode === 'edit' ? (
          <div>
            <button onClick={handleEditSave}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-dark)] font-medium">
              <Save className="w-4 h-4" />{saved ? '已保存 ✓' : '保存'}
            </button>
            <button onClick={() => { setMode('locked'); setShowKey(false); }}
              className="w-full mt-2 px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-warm-bg)] rounded-xl">
              取消并锁定
            </button>
          </div>
        ) : null}

        {/* ===== 修改管理员密码 ===== */}
        {mode === 'locked' && !changingPwd && (
          <button onClick={() => setChangingPwd(true)}
            className="w-full px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-warm-bg)] rounded-xl border border-[var(--color-border)]">
            修改管理员密码
          </button>
        )}

        {changingPwd && (
          <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
            <h3 className="text-sm font-bold text-[var(--color-text-main)] mb-3">修改管理员密码</h3>
            <div className="space-y-2">
              <input type="password" value={oldPwd} onChange={e => { setOldPwd(e.target.value); setPwdError(''); }}
                placeholder="原密码" className="w-full px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm" />
              <input type="password" value={newPwd2} onChange={e => { setNewPwd2(e.target.value); setPwdError(''); }}
                placeholder="新密码（不少于4位）" className="w-full px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm" />
              <input type="password" value={confirmPwd2} onChange={e => { setConfirmPwd2(e.target.value); setPwdError(''); }}
                placeholder="再次输入新密码" className="w-full px-3 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm" />
            </div>
            {pwdError && <p className="text-xs text-red-500 mt-1">{pwdError}</p>}
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setChangingPwd(false); setPwdError(''); setOldPwd(''); setNewPwd2(''); setConfirmPwd2(''); }}
                className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-warm-bg)] rounded-lg">取消</button>
              <button onClick={handleChangePassword}
                className="px-4 py-2 text-sm bg-[var(--color-secondary)] text-white rounded-lg hover:bg-[var(--color-secondary-light)]">确认修改</button>
            </div>
          </div>
        )}

        {/* ===== 错误提示 ===== */}
        {pwdError && mode !== 'edit' && !changingPwd && (
          <p className="text-xs text-red-500">{pwdError}</p>
        )}

        {/* ===== 数据说明 ===== */}
        <div className="bg-[var(--color-warm-bg)] rounded-2xl p-5 border border-[var(--color-border)]">
          <h3 className="text-sm font-bold text-[var(--color-text-main)] mb-2">数据说明</h3>
          <ul className="text-xs text-[var(--color-text-secondary)] space-y-1">
            <li>• 所有数据存储在浏览器本地</li>
            <li>• 清除浏览器缓存会导致数据丢失</li>
            <li>• 密钥受管理员密码保护，修改前需验证身份</li>
          </ul>
        </div>

        {/* ===== 数据导出/导入 ===== */}
        <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
          <h3 className="text-sm font-bold text-[var(--color-text-main)] mb-2">数据备份与迁移</h3>
          <p className="text-xs text-[var(--color-text-light)] mb-3">导出/导入数据为 JSON 文件，用于备份或迁移到服务器</p>
          <div className="flex gap-2">
            <button onClick={async () => {
              const { getAllChildren, getAllObservations } = await import('../db');
              const [children, observations] = await Promise.all([getAllChildren(), getAllObservations()]);
              const data = JSON.stringify({ children, observations, exportTime: new Date().toISOString() }, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `幼析育见数据备份_${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            }}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm hover:bg-gray-100 transition-colors">
              <Download className="w-4 h-4 text-[var(--color-primary)]" /> 导出数据
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-[var(--color-warm-bg)] border border-[var(--color-border)] rounded-xl text-sm hover:bg-gray-100 transition-colors cursor-pointer">
              <Save className="w-4 h-4 text-[var(--color-secondary)]" /> 导入数据
              <input type="file" accept=".json" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const data = JSON.parse(text);
                  if (!data.children) { alert('无效的数据文件'); return; }
                  const { saveChild, saveObservation } = await import('../db');
                  for (const child of data.children) await saveChild(child);
                  for (const obs of data.observations || []) await saveObservation(obs);
                  alert(`导入成功！共导入 ${data.children.length} 名幼儿、${(data.observations||[]).length} 条观察记录`);
                  e.target.value = '';
                } catch (err) { alert('导入失败：' + (err as Error).message); }
              }} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
