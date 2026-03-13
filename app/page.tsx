'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { listProjects, createProject, deleteProject, exportAllData, importAllData } from './lib/store';
import { ContentGiftProject, CONTENT_TYPE_LABELS, FUNNEL_STAGE_LABELS } from './lib/types';

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<ContentGiftProject[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProjects(listProjects());
  }, []);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const p = createProject(newName.trim());
    router.push(`/projects/${p.id}`);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    deleteProject(id);
    setProjects(listProjects());
  };

  const handleExport = () => {
    const json = exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-gift-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = importAllData(reader.result as string);
        setProjects(listProjects());
        alert(`インポート完了: ${result.added}件追加、${result.updated}件更新`);
      } catch (err) {
        alert(`インポートに失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
              Content Gift
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              リードマグネット & 特典コンテンツ AI設計ツール
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/manual')}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors hover:opacity-80"
              style={{ background: 'var(--accent-soft)', color: '#B45309' }}
            >
              📖 使い方
            </button>
            <button
              onClick={handleExport}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors hover:opacity-80"
              style={{ background: '#F0F4FF', color: 'var(--primary)' }}
            >
              バックアップ
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors hover:opacity-80"
              style={{ background: '#F0FDF4', color: '#059669' }}
            >
              復元
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {showCreate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--primary)' }}>
                🎁 新しい特典コンテンツを作る
              </h2>
              <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
                商品情報を入力して、リスト獲得力の高い特典コンテンツをAIが設計します
              </p>
              <input
                type="text"
                placeholder="プロジェクト名（例：コーチング講座 リードマグネット）"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border)' }}
                autoFocus
              />
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 text-sm border rounded-lg" style={{ borderColor: 'var(--border)' }}>
                  キャンセル
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 px-4 py-2.5 text-sm text-white rounded-lg font-medium"
                  style={{ background: 'var(--primary)' }}
                >
                  作成して始める
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hero card */}
        <button
          onClick={() => { setShowCreate(true); setNewName(''); }}
          className="group w-full p-8 rounded-2xl border text-left transition-all hover:shadow-lg hover:border-[var(--primary)] mb-8"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          <div className="text-4xl mb-3">🎁</div>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--primary)' }}>
            特典コンテンツを作る
          </h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
            商品情報を入力するだけで、見込み客が「これが無料？！」と感動する
            <br />リードマグネット・セミナー特典をAIが自動設計 & 本文生成します
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(CONTENT_TYPE_LABELS).map(([key, { label, icon }]) => (
              <span key={key} className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#F5F3FF', color: 'var(--primary)' }}>
                {icon} {label}
              </span>
            ))}
          </div>
          <span className="text-sm font-medium px-4 py-2 rounded-full transition-all group-hover:opacity-90"
            style={{ background: 'var(--primary)', color: '#fff' }}>
            新しいプロジェクトを作成 →
          </span>
        </button>

        {/* Projects list */}
        {projects.length > 0 && (
          <>
            <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--primary)' }}>プロジェクト一覧</h2>
            <div className="space-y-3">
              {projects.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-5 rounded-xl border cursor-pointer transition-all hover:shadow-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
                  onClick={() => router.push(`/projects/${p.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate" style={{ color: 'var(--primary)' }}>{p.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {p.config.productName && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: '#B45309' }}>
                          {p.config.productName}
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F0F4FF', color: 'var(--primary)' }}>
                        {FUNNEL_STAGE_LABELS[p.config.funnelStage]}
                      </span>
                      {p.ideas && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                          💡 アイデア {p.ideas.length}件
                        </span>
                      )}
                      {p.contents.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                          📄 コンテンツ {p.contents.length}件
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {new Date(p.updatedAt).toLocaleDateString('ja-JP')}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(p.id, p.name); }}
                      className="text-xs px-2 py-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
