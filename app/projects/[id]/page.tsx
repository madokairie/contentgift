'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getProject, updateProject } from '../../lib/store';
import {
  ContentGiftProject, ProductConfig, LeadMagnetIdea, GeneratedContent, QualityScore,
  ContentType, CONTENT_TYPE_LABELS, FUNNEL_STAGE_LABELS, SCORE_LABELS,
} from '../../lib/types';

type Tab = 'config' | 'ideas' | 'content' | 'quality';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-xs px-2 py-1 rounded transition-colors"
      style={{ background: copied ? '#D1FAE5' : '#F0F4FF', color: copied ? '#059669' : 'var(--primary)' }}
    >
      {copied ? '✓ コピー済' : 'コピー'}
    </button>
  );
}

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = pct >= 80 ? '#059669' : pct >= 60 ? '#F59E0B' : '#DC2626';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-100">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-6 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [project, setProject] = useState<ContentGiftProject | null>(null);
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'config');
  const [config, setConfig] = useState<ProductConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [generatingContent, setGeneratingContent] = useState<string | null>(null);
  const [analyzingQuality, setAnalyzingQuality] = useState<string | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    const p = getProject(id);
    if (!p) { router.push('/'); return; }
    setProject(p);
    setConfig(p.config);
    setSelectedIdeaId(p.selectedIdeaId);
  }, [id, router]);

  if (!project || !config) return null;

  const save = (updates: Partial<ContentGiftProject>) => {
    const updated = updateProject(id, updates);
    if (updated) setProject(updated);
  };

  const handleConfigSave = () => {
    setSaving(true);
    save({ config });
    setTimeout(() => setSaving(false), 500);
  };

  const handleBulkExtract = async () => {
    if (!bulkText.trim()) return;
    setExtracting(true);
    try {
      const res = await fetch('/api/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: { ...config, productDescription: bulkText },
          extractOnly: true,
        }),
      });
      // For now, just set the bulk text as product description
      setConfig({ ...config, productDescription: bulkText });
      setShowBulk(false);
    } catch {
      alert('テキスト解析に失敗しました');
    } finally {
      setExtracting(false);
    }
  };

  const handleGenerateIdeas = async () => {
    if (!config.productName && !config.productDescription) {
      alert('商品名または商品概要を入力してください');
      return;
    }
    handleConfigSave();
    setGeneratingIdeas(true);
    try {
      const res = await fetch('/api/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      save({ ideas: data.ideas, config });
      setProject(prev => prev ? { ...prev, ideas: data.ideas, config } : prev);
      setTab('ideas');
    } catch (err) {
      alert(`アイデア生成に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setGeneratingIdeas(false);
    }
  };

  const handleGenerateContent = async (idea: LeadMagnetIdea) => {
    setGeneratingContent(idea.id);
    try {
      const res = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, idea }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const newContent: GeneratedContent = {
        id: crypto.randomUUID(),
        ideaId: idea.id,
        title: data.title,
        subtitle: data.subtitle || '',
        type: idea.type,
        introduction: data.introduction,
        sections: data.sections,
        closingMessage: data.closingMessage,
        callToAction: data.callToAction,
        generatedAt: new Date().toISOString(),
        qualityScore: null,
      };
      const updatedContents = [...project.contents.filter(c => c.ideaId !== idea.id), newContent];
      save({ contents: updatedContents, selectedIdeaId: idea.id });
      setProject(prev => prev ? { ...prev, contents: updatedContents, selectedIdeaId: idea.id } : prev);
      setSelectedIdeaId(idea.id);
      setTab('content');
    } catch (err) {
      alert(`コンテンツ生成に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setGeneratingContent(null);
    }
  };

  const handleAnalyzeQuality = async (content: GeneratedContent) => {
    setAnalyzingQuality(content.id);
    try {
      const res = await fetch('/api/analyze-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, content }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const updatedContents = project.contents.map(c =>
        c.id === content.id ? { ...c, qualityScore: data as QualityScore } : c
      );
      save({ contents: updatedContents });
      setProject(prev => prev ? { ...prev, contents: updatedContents } : prev);
      setTab('quality');
    } catch (err) {
      alert(`品質分析に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setAnalyzingQuality(null);
    }
  };

  const currentContent = project.contents.find(c => c.ideaId === selectedIdeaId);
  const currentIdea = project.ideas?.find(i => i.id === selectedIdeaId);

  const configFields: { key: keyof ProductConfig; label: string; placeholder: string; type?: string }[] = [
    { key: 'productName', label: '商品・サービス名', placeholder: '例: 3ヶ月集中コーチングプログラム' },
    { key: 'productDescription', label: '商品概要', placeholder: '例: 起業初期の女性向け。ビジネスの基盤設計から集客、セールスまでを3ヶ月でマスター', type: 'textarea' },
    { key: 'targetAudience', label: 'ターゲット', placeholder: '例: 30-40代の副業・起業を考えている女性' },
    { key: 'targetPain', label: 'ターゲットの悩み', placeholder: '例: 何から始めればいいかわからない、集客ができない、価格設定に自信がない' },
    { key: 'targetDesire', label: 'ターゲットの理想', placeholder: '例: 月30万円の安定収入、好きなことで生きていく、時間と場所の自由' },
    { key: 'price', label: '商品の価格帯', placeholder: '例: 30万円' },
    { key: 'competitorGifts', label: '競合がどんな特典を出しているか', placeholder: '例: 無料のPDFガイド、5分の動画、チェックリスト', type: 'textarea' },
    { key: 'desiredAction', label: '特典を受け取った後にしてほしいアクション', placeholder: '例: セミナーに申し込む、LINE登録、無料相談に申し込む' },
    { key: 'currentAuthority', label: 'あなた（発信者）の権威性・実績', placeholder: '例: 累計500名サポート、自身も年商3000万達成、元大手企業マネージャー' },
  ];

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'config', label: '設定', icon: '⚙️' },
    { id: 'ideas', label: 'アイデア', icon: '💡' },
    { id: 'content', label: 'コンテンツ', icon: '📄' },
    { id: 'quality', label: '品質チェック', icon: '✅' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header className="border-b no-print" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="text-sm hover:opacity-70" style={{ color: 'var(--muted)' }}>
              ← 戻る
            </button>
            <h1 className="text-base font-bold" style={{ color: 'var(--primary)' }}>{project.name}</h1>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg"
              style={{
                color: tab === t.id ? 'var(--primary)' : 'var(--muted)',
                background: tab === t.id ? 'var(--background)' : 'transparent',
                borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {/* ===== CONFIG TAB ===== */}
        {tab === 'config' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold" style={{ color: 'var(--primary)' }}>商品・サービス情報</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBulk(!showBulk)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: '#FEF3C7', color: '#B45309' }}
                >
                  📋 テキストから一括入力
                </button>
                <button
                  onClick={handleGenerateIdeas}
                  disabled={generatingIdeas}
                  className="text-xs px-4 py-1.5 rounded-lg font-medium text-white disabled:opacity-50"
                  style={{ background: 'var(--primary)' }}
                >
                  {generatingIdeas ? '⏳ 生成中...' : '💡 アイデアを生成'}
                </button>
              </div>
            </div>

            {showBulk && (
              <div className="mb-6 p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: '#FFFBEB' }}>
                <p className="text-xs mb-2 font-medium" style={{ color: '#B45309' }}>
                  セールスページやLPのテキストを貼り付けてください。商品概要に反映されます。
                </p>
                <textarea
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  className="w-full h-32 p-3 border rounded-lg text-sm"
                  style={{ borderColor: 'var(--border)' }}
                  placeholder="セールスページのテキストをここに貼り付け..."
                />
                <button
                  onClick={handleBulkExtract}
                  disabled={extracting}
                  className="mt-2 text-xs px-4 py-1.5 rounded-lg font-medium text-white disabled:opacity-50"
                  style={{ background: '#B45309' }}
                >
                  {extracting ? '解析中...' : '反映する'}
                </button>
              </div>
            )}

            {/* Funnel Stage */}
            <div className="mb-6 p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--primary)' }}>
                特典の用途
              </label>
              <div className="flex gap-3">
                {Object.entries(FUNNEL_STAGE_LABELS).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setConfig({ ...config, funnelStage: value as ProductConfig['funnelStage'] })}
                    className="flex-1 px-3 py-2.5 rounded-lg text-xs font-medium border transition-colors"
                    style={{
                      borderColor: config.funnelStage === value ? 'var(--primary)' : 'var(--border)',
                      background: config.funnelStage === value ? '#F5F3FF' : 'var(--card)',
                      color: config.funnelStage === value ? 'var(--primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Preference */}
            <div className="mb-6 p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--primary)' }}>
                希望する特典形式
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setConfig({ ...config, contentPreference: 'any' })}
                  className="px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
                  style={{
                    borderColor: config.contentPreference === 'any' ? 'var(--primary)' : 'var(--border)',
                    background: config.contentPreference === 'any' ? '#F5F3FF' : 'var(--card)',
                    color: config.contentPreference === 'any' ? 'var(--primary)' : 'var(--text-secondary)',
                  }}
                >
                  🎯 AIにおまかせ
                </button>
                {Object.entries(CONTENT_TYPE_LABELS).map(([key, { label, icon }]) => (
                  <button
                    key={key}
                    onClick={() => setConfig({ ...config, contentPreference: key as ContentType })}
                    className="px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
                    style={{
                      borderColor: config.contentPreference === key ? 'var(--primary)' : 'var(--border)',
                      background: config.contentPreference === key ? '#F5F3FF' : 'var(--card)',
                      color: config.contentPreference === key ? 'var(--primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Config Fields */}
            <div className="space-y-4">
              {configFields.map(f => (
                <div key={f.key} className="p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text)' }}>
                    {f.label}
                  </label>
                  {f.type === 'textarea' ? (
                    <textarea
                      value={config[f.key] as string}
                      onChange={e => setConfig({ ...config, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full h-24 px-3 py-2 border rounded-lg text-sm"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={config[f.key] as string}
                      onChange={e => setConfig({ ...config, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleConfigSave}
                className="px-6 py-2.5 text-sm text-white rounded-lg font-medium"
                style={{ background: 'var(--primary)' }}
              >
                {saving ? '✓ 保存しました' : '設定を保存'}
              </button>
              <button
                onClick={handleGenerateIdeas}
                disabled={generatingIdeas}
                className="px-6 py-2.5 text-sm text-white rounded-lg font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                {generatingIdeas ? '⏳ アイデア生成中...' : '💡 保存してアイデアを生成'}
              </button>
            </div>
          </div>
        )}

        {/* ===== IDEAS TAB ===== */}
        {tab === 'ideas' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold" style={{ color: 'var(--primary)' }}>
                💡 特典アイデア {project.ideas ? `（${project.ideas.length}件）` : ''}
              </h2>
              <button
                onClick={handleGenerateIdeas}
                disabled={generatingIdeas}
                className="text-xs px-4 py-1.5 rounded-lg font-medium text-white disabled:opacity-50"
                style={{ background: 'var(--primary)' }}
              >
                {generatingIdeas ? '⏳ 生成中...' : '🔄 再生成'}
              </button>
            </div>

            {!project.ideas ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-4">💡</p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  まず「⚙️ 設定」タブで商品情報を入力し、「アイデアを生成」してください
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {project.ideas
                  .sort((a, b) => b.scores.total - a.scores.total)
                  .map((idea, idx) => (
                  <div
                    key={idea.id}
                    className="p-5 rounded-xl border transition-all"
                    style={{
                      borderColor: selectedIdeaId === idea.id ? 'var(--primary)' : 'var(--border)',
                      background: selectedIdeaId === idea.id ? '#FAFAFE' : 'var(--card)',
                      boxShadow: idx === 0 ? '0 2px 8px rgba(124,58,237,0.1)' : undefined,
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {idx === 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">👑 おすすめ</span>}
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F5F3FF', color: 'var(--primary)' }}>
                            {CONTENT_TYPE_LABELS[idea.type]?.icon} {CONTENT_TYPE_LABELS[idea.type]?.label}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>{idea.title}</h3>
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{idea.description}</p>
                      </div>
                      <div className="ml-4 text-center">
                        <div className="text-2xl font-bold" style={{ color: idea.scores.total >= 80 ? '#059669' : idea.scores.total >= 60 ? '#F59E0B' : '#DC2626' }}>
                          {idea.scores.total}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>/ 100点</div>
                      </div>
                    </div>

                    {/* Hook */}
                    <div className="mb-3 p-2.5 rounded-lg flex items-center justify-between" style={{ background: '#FFFBEB' }}>
                      <p className="text-xs font-medium" style={{ color: '#92400E' }}>
                        🎣 フック: 「{idea.hook}」
                      </p>
                      <CopyButton text={idea.hook} />
                    </div>

                    {/* Scores */}
                    <div className="grid grid-cols-3 gap-x-4 gap-y-2 mb-3">
                      {(Object.entries(SCORE_LABELS) as [keyof typeof SCORE_LABELS, string][]).map(([key, label]) => (
                        <div key={key}>
                          <div className="text-xs mb-0.5" style={{ color: 'var(--muted)' }}>{label}</div>
                          <ScoreBar score={idea.scores[key]} />
                        </div>
                      ))}
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-2.5 rounded-lg" style={{ background: '#F0FDF4' }}>
                        <div className="text-xs font-medium mb-1" style={{ color: '#059669' }}>なぜ効くか</div>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{idea.whyItWorks}</p>
                      </div>
                      <div className="p-2.5 rounded-lg" style={{ background: '#F0F4FF' }}>
                        <div className="text-xs font-medium mb-1" style={{ color: 'var(--primary)' }}>有料商品への架け橋</div>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{idea.bridgeStrategy}</p>
                      </div>
                    </div>

                    {/* Outline */}
                    <div className="mb-3 p-2.5 rounded-lg" style={{ background: 'var(--background)' }}>
                      <div className="text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>構成案</div>
                      <ol className="text-xs space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {idea.outline.map((item, i) => (
                          <li key={i}>{i + 1}. {item}</li>
                        ))}
                      </ol>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleGenerateContent(idea)}
                        disabled={generatingContent === idea.id}
                        className="text-xs px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50"
                        style={{ background: 'var(--primary)' }}
                      >
                        {generatingContent === idea.id ? '⏳ コンテンツ生成中...' : '📄 このアイデアでコンテンツを生成'}
                      </button>
                      {project.contents.find(c => c.ideaId === idea.id) && (
                        <button
                          onClick={() => { setSelectedIdeaId(idea.id); setTab('content'); }}
                          className="text-xs px-4 py-2 rounded-lg font-medium border"
                          style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                        >
                          📄 生成済みコンテンツを見る
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== CONTENT TAB ===== */}
        {tab === 'content' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold" style={{ color: 'var(--primary)' }}>
                📄 生成コンテンツ
              </h2>
              <div className="flex gap-2">
                {currentContent && (
                  <>
                    <button
                      onClick={() => handleAnalyzeQuality(currentContent)}
                      disabled={analyzingQuality === currentContent.id}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                      style={{ background: '#F0FDF4', color: '#059669' }}
                    >
                      {analyzingQuality === currentContent.id ? '⏳ 分析中...' : '✅ 品質チェック'}
                    </button>
                    <button
                      onClick={() => router.push(`/projects/${id}/print?contentId=${currentContent.id}`)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium"
                      style={{ background: '#F0F4FF', color: 'var(--primary)' }}
                    >
                      📥 PDF保存
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Content selector if multiple */}
            {project.contents.length > 1 && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {project.contents.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedIdeaId(c.ideaId); }}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors"
                    style={{
                      borderColor: selectedIdeaId === c.ideaId ? 'var(--primary)' : 'var(--border)',
                      background: selectedIdeaId === c.ideaId ? '#F5F3FF' : 'var(--card)',
                      color: selectedIdeaId === c.ideaId ? 'var(--primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {CONTENT_TYPE_LABELS[c.type]?.icon} {c.title}
                  </button>
                ))}
              </div>
            )}

            {!currentContent ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-4">📄</p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  「💡 アイデア」タブでアイデアを選んでコンテンツを生成してください
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Title */}
                <div className="p-6 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F5F3FF', color: 'var(--primary)' }}>
                      {CONTENT_TYPE_LABELS[currentContent.type]?.icon} {CONTENT_TYPE_LABELS[currentContent.type]?.label}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text)' }}>{currentContent.title}</h3>
                  {currentContent.subtitle && (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{currentContent.subtitle}</p>
                  )}
                </div>

                {/* Introduction */}
                <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold" style={{ color: 'var(--primary)' }}>はじめに</h4>
                    <CopyButton text={currentContent.introduction} />
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                    {currentContent.introduction}
                  </p>
                </div>

                {/* Sections */}
                {currentContent.sections.map((section, idx) => (
                  <div key={idx} className="p-5 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                        {section.heading}
                      </h4>
                      <CopyButton text={`${section.heading}\n\n${section.content}${section.items ? '\n\n' + section.items.map((item, i) => `${section.type === 'checklist' ? '☐' : `${i + 1}.`} ${item}`).join('\n') : ''}`} />
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3" style={{ color: 'var(--text-secondary)' }}>
                      {section.content}
                    </p>
                    {section.items && section.items.length > 0 && (
                      <div className="space-y-1.5 p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                        {section.items.map((item, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <span className="flex-shrink-0">
                              {section.type === 'checklist' ? '☐' : section.type === 'action' ? '▶' : `${i + 1}.`}
                            </span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Closing */}
                <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold" style={{ color: 'var(--primary)' }}>おわりに</h4>
                    <CopyButton text={currentContent.closingMessage} />
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                    {currentContent.closingMessage}
                  </p>
                </div>

                {/* CTA */}
                <div className="p-5 rounded-xl border" style={{ borderColor: '#F59E0B', background: '#FFFBEB' }}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold" style={{ color: '#92400E' }}>🎯 CTA（有料商品への導線）</h4>
                    <CopyButton text={currentContent.callToAction} />
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#92400E' }}>
                    {currentContent.callToAction}
                  </p>
                </div>

                {/* Copy All */}
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      const allText = [
                        currentContent.title,
                        currentContent.subtitle,
                        '',
                        currentContent.introduction,
                        '',
                        ...currentContent.sections.flatMap(s => [
                          `■ ${s.heading}`,
                          s.content,
                          ...(s.items || []).map((item, i) => `${s.type === 'checklist' ? '☐' : `${i + 1}.`} ${item}`),
                          '',
                        ]),
                        currentContent.closingMessage,
                        '',
                        currentContent.callToAction,
                      ].join('\n');
                      navigator.clipboard.writeText(allText);
                      alert('全文をコピーしました');
                    }}
                    className="text-sm px-6 py-2.5 rounded-lg font-medium border"
                    style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  >
                    📋 全文コピー
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== QUALITY TAB ===== */}
        {tab === 'quality' && (
          <div>
            <h2 className="text-base font-bold mb-6" style={{ color: 'var(--primary)' }}>
              ✅ 品質チェック
            </h2>

            {!currentContent?.qualityScore ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-4">✅</p>
                <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                  コンテンツを生成した後、「品質チェック」ボタンで定量・定性の両面からAIが評価します
                </p>
                {currentContent && (
                  <button
                    onClick={() => handleAnalyzeQuality(currentContent)}
                    disabled={analyzingQuality === currentContent.id}
                    className="text-sm px-6 py-2.5 rounded-lg font-medium text-white disabled:opacity-50"
                    style={{ background: 'var(--primary)' }}
                  >
                    {analyzingQuality === currentContent.id ? '⏳ 分析中...' : '✅ 品質チェックを実行'}
                  </button>
                )}
              </div>
            ) : (() => {
              const qs = currentContent.qualityScore;
              const verdictStyles = {
                excellent: { bg: '#D1FAE5', color: '#059669', label: 'Excellent — そのまま使えるレベル' },
                good: { bg: '#FEF3C7', color: '#B45309', label: 'Good — 微調整で使えるレベル' },
                'needs-improvement': { bg: '#FEE2E2', color: '#DC2626', label: 'Needs Improvement — 改善が必要' },
              };
              const v = verdictStyles[qs.verdict] || verdictStyles.good;

              return (
                <div className="space-y-4">
                  {/* Overall */}
                  <div className="p-6 rounded-xl border text-center" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                    <div className="text-5xl font-bold mb-2" style={{ color: qs.overall >= 80 ? '#059669' : qs.overall >= 60 ? '#F59E0B' : '#DC2626' }}>
                      {qs.overall}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--muted)' }}>/ 100点</div>
                    <div className="inline-block mt-3 px-4 py-1.5 rounded-full text-xs font-medium" style={{ background: v.bg, color: v.color }}>
                      {v.label}
                    </div>
                  </div>

                  {/* Quantitative */}
                  <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                    <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--primary)' }}>📊 定量評価（{qs.quantitative.totalScore}点）</h3>
                    <div className="grid grid-cols-5 gap-4">
                      {[
                        { label: '文字数', value: qs.quantitative.wordCount.toLocaleString(), target: '3,000〜6,000' },
                        { label: 'セクション数', value: qs.quantitative.sectionCount, target: '5〜10' },
                        { label: 'アクション', value: qs.quantitative.actionableItems, target: '10+' },
                        { label: '具体例', value: qs.quantitative.specificExamples, target: '5+' },
                        { label: 'データ', value: qs.quantitative.dataPoints, target: '2+' },
                      ].map(item => (
                        <div key={item.label} className="text-center p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                          <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{item.value}</div>
                          <div className="text-xs" style={{ color: 'var(--muted)' }}>{item.label}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>目標: {item.target}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Qualitative */}
                  <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                    <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--primary)' }}>🎯 定性評価（{qs.qualitative.totalScore}点）</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {[
                        { key: 'clarity', label: '明瞭さ' },
                        { key: 'actionability', label: '即実践性' },
                        { key: 'uniqueness', label: '独自性' },
                        { key: 'emotionalImpact', label: '感情インパクト' },
                        { key: 'perceivedValue', label: '知覚価値' },
                        { key: 'bridgeEffectiveness', label: '架け橋効果' },
                      ].map(item => (
                        <div key={item.key}>
                          <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{item.label}</div>
                          <ScoreBar score={qs.qualitative[item.key as keyof typeof qs.qualitative] as number} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strengths */}
                  <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border)', background: '#F0FDF4' }}>
                    <h3 className="text-sm font-bold mb-2" style={{ color: '#059669' }}>💪 強み</h3>
                    <ul className="space-y-1.5">
                      {qs.strengths.map((s, i) => (
                        <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                          <span className="text-green-500 flex-shrink-0">✓</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Improvements */}
                  {qs.improvements.length > 0 && (
                    <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border)', background: '#FEF3C7' }}>
                      <h3 className="text-sm font-bold mb-2" style={{ color: '#B45309' }}>🔧 改善ポイント</h3>
                      <div className="space-y-3">
                        {qs.improvements.map((imp, i) => (
                          <div key={i} className="p-3 rounded-lg bg-white/60">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                imp.priority === 'high' ? 'bg-red-100 text-red-700' :
                                imp.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {imp.priority === 'high' ? '高' : imp.priority === 'medium' ? '中' : '低'}
                              </span>
                              <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{imp.area}</span>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{imp.suggestion}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rewrite Suggestions */}
                  {qs.rewriteSuggestions.length > 0 && (
                    <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                      <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--primary)' }}>✏️ 書き換え提案</h3>
                      <div className="space-y-4">
                        {qs.rewriteSuggestions.map((rw, i) => (
                          <div key={i} className="space-y-2">
                            <div className="p-3 rounded-lg" style={{ background: '#FEE2E2' }}>
                              <div className="text-xs font-medium mb-1 text-red-600">Before:</div>
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{rw.original}</p>
                            </div>
                            <div className="p-3 rounded-lg" style={{ background: '#D1FAE5' }}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-green-600">After:</span>
                                <CopyButton text={rw.improved} />
                              </div>
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{rw.improved}</p>
                            </div>
                            <p className="text-xs px-1" style={{ color: 'var(--muted)' }}>💡 {rw.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Re-analyze */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => handleAnalyzeQuality(currentContent)}
                      disabled={analyzingQuality === currentContent.id}
                      className="text-sm px-6 py-2.5 rounded-lg font-medium border disabled:opacity-50"
                      style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                    >
                      {analyzingQuality === currentContent.id ? '⏳ 再分析中...' : '🔄 再分析'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
