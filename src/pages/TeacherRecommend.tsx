import { MessageSquare } from 'lucide-react';

export default function TeacherRecommend() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-7 h-7 text-[var(--color-primary)]" />
        <h1 className="text-2xl font-bold text-[var(--color-text-main)]">观师荐策</h1>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-[var(--color-border)]">
        <div className="text-center py-16">
          <MessageSquare className="w-16 h-16 text-[var(--color-primary)]/30 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[var(--color-text-main)] mb-2">观师荐策</h2>
          <p className="text-sm text-[var(--color-text-light)]">
            观察教师教学行为，推荐针对性改进策略
          </p>
        </div>
      </div>
    </div>
  );
}
