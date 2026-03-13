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
  const [showCustomIdea, setShowCustomIdea] = useState(false);
  const [customIdea, setCustomIdea] = useState({ title: '', type: 'guidebook' as ContentType, description: '' });
  const [reviseRequest, setReviseRequest] = useState('');
  const [showRevise, setShowRevise] = useState(false);
  const [revising, setRevising] = useState(false);
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentTitle: '' });
  const [generatingTitles, setGeneratingTitles] = useState<string | null>(null);
  const [titleSuggestions, setTitleSuggestions] = useState<Record<string, { title: string; pattern: string; hook: string; whyItWorks: string }[]>>({});

  useEffect(() => {
    const p = getProject(id);
    if (!p) { router.push('/'); return; }
    setProject(p);
    // Migrate config for projects created before new fields were added
    const migratedConfig: ProductConfig = {
      ...p.config,
      targetKnowledgeLevel: p.config.targetKnowledgeLevel ?? '',
      targetUrgency: p.config.targetUrgency ?? '',
      conversionGoal: p.config.conversionGoal ?? '',
      brandColorPrimary: p.config.brandColorPrimary ?? '#1B2A4A',
      brandColorAccent: p.config.brandColorAccent ?? '#C8963E',
    };
    setConfig(migratedConfig);
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

  const handleRevise = async (content: GeneratedContent, request: string) => {
    if (!request.trim()) return;
    setRevising(true);
    try {
      const res = await fetch('/api/revise-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, content, request }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const updatedContents = project.contents.map(c =>
        c.id === content.id ? {
          ...c,
          title: data.title || c.title,
          subtitle: data.subtitle || c.subtitle,
          introduction: data.introduction || c.introduction,
          sections: data.sections || c.sections,
          closingMessage: data.closingMessage || c.closingMessage,
          callToAction: data.callToAction || c.callToAction,
          generatedAt: new Date().toISOString(),
          qualityScore: null,
        } : c
      );
      save({ contents: updatedContents });
      setProject(prev => prev ? { ...prev, contents: updatedContents } : prev);
      setReviseRequest('');
      setShowRevise(false);
    } catch (err) {
      alert(`修正に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setRevising(false);
    }
  };

  const currentContent = project.contents.find(c => c.ideaId === selectedIdeaId);
  const currentIdea = project.ideas?.find(i => i.id === selectedIdeaId);

  const configFields: { key: keyof ProductConfig; label: string; placeholder: string; type?: string }[] = [
    { key: 'productName', label: '商品・サービス名', placeholder: '例: 3ヶ月集中コーチングプログラム' },
    { key: 'productDescription', label: '商品概要', placeholder: '例: 起業初期の女性向け。ビジネスの基盤設計から集客、セールスまでを3ヶ月でマスター', type: 'textarea' },
    { key: 'targetAudience', label: 'ターゲット', placeholder: '例: 30-40代の副業・起業を考えている女性' },
    { key: 'targetPain', label: 'ターゲットの悩み', placeholder: '例: 何から始めればいいかわからない、集客ができない、価格設定に自信がない', type: 'textarea' },
    { key: 'targetDesire', label: 'ターゲットの理想', placeholder: '例: 月30万円の安定収入、好きなことで生きていく、時間と場所の自由', type: 'textarea' },
    { key: 'price', label: '商品の価格帯', placeholder: '例: 30万円' },
    { key: 'conversionGoal', label: '特典で達成したい具体的な目標', placeholder: '例: LINE登録率30%、セミナー着席率80%、個別相談申込率20%' },
    { key: 'competitorGifts', label: '競合がどんな特典を出しているか', placeholder: '例: 無料のPDFガイド、5分の動画、チェックリスト', type: 'textarea' },
    { key: 'desiredAction', label: '特典を受け取った後にしてほしいアクション', placeholder: '例: セミナーに申し込む、LINE登録、無料相談に申し込む' },
    { key: 'currentAuthority', label: 'あなた（発信者）の権威性・実績', placeholder: '例: 累計500名サポート、自身も年商3000万達成、元大手企業マネージャー', type: 'textarea' },
  ];

  const externalFields: { key: keyof ProductConfig; label: string; placeholder: string; icon: string; color: string }[] = [
    { key: 'conceptDesign', label: 'コンセプト設計', placeholder: 'コンセプト設計アプリ（:3900）の内容をコピペ\n例: ターゲット像、ポジショニング、世界観、USP、キャッチコピー等', icon: '🎯', color: '#7C3AED' },
    { key: 'funnelDesign', label: 'ファネル設計', placeholder: 'ファネル設計の内容をコピペ\n例: 認知→リスト獲得→教育→セミナー→個別相談→成約の流れ、各ステップの役割', icon: '🔄', color: '#2563EB' },
    { key: 'seminarContent', label: 'セミナー内容', placeholder: 'セミナーアプリ（:3904）の内容をコピペ\n例: セミナーの構成、話すテーマ、オファー内容、参加者が得られる変化', icon: '🎤', color: '#059669' },
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

            {/* Target Depth */}
            <div className="mb-6 p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--primary)' }}>
                ターゲットの解像度（任意・精度UP）
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>知識レベル</div>
                  <div className="flex gap-2">
                    {([
                      { value: 'beginner', label: '初心者', desc: '基礎から知りたい' },
                      { value: 'intermediate', label: '中級者', desc: 'ある程度知っている' },
                      { value: 'advanced', label: '上級者', desc: '専門知識あり' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setConfig({ ...config, targetKnowledgeLevel: config.targetKnowledgeLevel === opt.value ? '' : opt.value })}
                        className="flex-1 px-2 py-2 rounded-lg text-xs font-medium border transition-colors text-center"
                        style={{
                          borderColor: config.targetKnowledgeLevel === opt.value ? 'var(--primary)' : 'var(--border)',
                          background: config.targetKnowledgeLevel === opt.value ? '#F5F3FF' : 'var(--card)',
                          color: config.targetKnowledgeLevel === opt.value ? 'var(--primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>緊急度・温度感</div>
                  <div className="flex gap-2">
                    {([
                      { value: 'low', label: '情報収集中', desc: 'まだ検討段階' },
                      { value: 'medium', label: '検討中', desc: '近々行動したい' },
                      { value: 'high', label: '今すぐ欲しい', desc: '急いでいる' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setConfig({ ...config, targetUrgency: config.targetUrgency === opt.value ? '' : opt.value })}
                        className="flex-1 px-2 py-2 rounded-lg text-xs font-medium border transition-colors text-center"
                        style={{
                          borderColor: config.targetUrgency === opt.value ? 'var(--primary)' : 'var(--border)',
                          background: config.targetUrgency === opt.value ? '#F5F3FF' : 'var(--card)',
                          color: config.targetUrgency === opt.value ? 'var(--primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
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

            {/* External App Info */}
            <div className="mt-8 mb-4">
              <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--primary)' }}>
                🔗 他アプリからの情報（任意・精度UP）
              </h3>
              <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
                コンセプト設計・ファネル設計・セミナー内容を入力すると、整合性の高い特典コンテンツが生成されます
              </p>
              <div className="space-y-4">
                {externalFields.map(f => (
                  <div key={f.key} className="p-4 rounded-xl border" style={{ borderColor: f.color + '40', background: f.color + '08' }}>
                    <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5" style={{ color: f.color }}>
                      {f.icon} {f.label}
                    </label>
                    <textarea
                      value={config[f.key] as string}
                      onChange={e => setConfig({ ...config, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full h-28 px-3 py-2 border rounded-lg text-sm"
                      style={{ borderColor: 'var(--border)', background: 'white' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ブランドカラー設定 */}
            <div className="mt-8 mb-4">
              <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--primary)' }}>
                🎨 ブランドカラー（PDF出力のデザイン）
              </h3>
              <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
                クライアントのブランドに合わせた配色でPDFを出力します
              </p>
              <div className="flex flex-wrap gap-3 mb-4">
                {[
                  { name: 'ネイビー×ゴールド', primary: '#1B2A4A', accent: '#C8963E' },
                  { name: 'ブラック×レッド', primary: '#1C1917', accent: '#DC2626' },
                  { name: 'ティール×オレンジ', primary: '#134E4A', accent: '#EA580C' },
                  { name: 'パープル×ピンク', primary: '#4C1D95', accent: '#EC4899' },
                  { name: 'ブルー×イエロー', primary: '#1E3A8A', accent: '#EAB308' },
                  { name: 'グリーン×ゴールド', primary: '#14532D', accent: '#D97706' },
                  { name: 'ワイン×ベージュ', primary: '#7F1D1D', accent: '#D4A574' },
                  { name: 'スレート×シアン', primary: '#334155', accent: '#06B6D4' },
                ].map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => setConfig({ ...config, brandColorPrimary: preset.primary, brandColorAccent: preset.accent })}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all"
                    style={{
                      borderColor: config.brandColorPrimary === preset.primary && config.brandColorAccent === preset.accent ? preset.primary : 'var(--border)',
                      background: config.brandColorPrimary === preset.primary && config.brandColorAccent === preset.accent ? preset.primary + '10' : 'white',
                    }}
                  >
                    <span style={{ display: 'flex', gap: '2px' }}>
                      <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: preset.primary }} />
                      <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: preset.accent }} />
                    </span>
                    {preset.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>メインカラー</span>
                  <input
                    type="color"
                    value={config.brandColorPrimary || '#1B2A4A'}
                    onChange={e => setConfig({ ...config, brandColorPrimary: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border-0"
                  />
                  <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{config.brandColorPrimary || '#1B2A4A'}</span>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>アクセントカラー</span>
                  <input
                    type="color"
                    value={config.brandColorAccent || '#C8963E'}
                    onChange={e => setConfig({ ...config, brandColorAccent: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border-0"
                  />
                  <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{config.brandColorAccent || '#C8963E'}</span>
                </label>
              </div>
              {/* Preview */}
              <div className="mt-3 flex gap-2 items-center">
                <div style={{ width: '100%', height: '36px', borderRadius: '6px', background: config.brandColorPrimary || '#1B2A4A', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                  <span style={{ color: 'white', fontSize: '11px', fontWeight: 600 }}>見出しの表示イメージ</span>
                  <span style={{ marginLeft: 'auto', color: config.brandColorAccent || '#C8963E', fontSize: '11px', fontWeight: 700 }}>01</span>
                </div>
              </div>
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
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCustomIdea(!showCustomIdea)}
                  className="text-xs px-4 py-1.5 rounded-lg font-medium border"
                  style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                >
                  ✏️ 自分のアイデアを追加
                </button>
                <button
                  onClick={handleGenerateIdeas}
                  disabled={generatingIdeas}
                  className="text-xs px-4 py-1.5 rounded-lg font-medium text-white disabled:opacity-50"
                  style={{ background: 'var(--primary)' }}
                >
                  {generatingIdeas ? '⏳ 生成中...' : '🔄 AIで生成'}
                </button>
              </div>
            </div>

            {/* Custom Idea Input */}
            {showCustomIdea && (
              <div className="mb-5 p-5 rounded-xl border" style={{ borderColor: 'var(--primary)', background: '#FAFAFE' }}>
                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--primary)' }}>✏️ 自分のアイデアを追加</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text)' }}>特典タイトル</label>
                    <input
                      type="text"
                      value={customIdea.title}
                      onChange={e => setCustomIdea({ ...customIdea, title: e.target.value })}
                      placeholder="例: 30日間SNS投稿テンプレート50選"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text)' }}>形式</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(CONTENT_TYPE_LABELS).map(([key, { label, icon }]) => (
                        <button
                          key={key}
                          onClick={() => setCustomIdea({ ...customIdea, type: key as ContentType })}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                          style={{
                            borderColor: customIdea.type === key ? 'var(--primary)' : 'var(--border)',
                            background: customIdea.type === key ? '#F5F3FF' : 'white',
                            color: customIdea.type === key ? 'var(--primary)' : 'var(--text-secondary)',
                          }}
                        >
                          {icon} {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text)' }}>概要・作りたい内容</label>
                    <textarea
                      value={customIdea.description}
                      onChange={e => setCustomIdea({ ...customIdea, description: e.target.value })}
                      placeholder="例: ターゲットがすぐ使えるSNS投稿のテンプレート。業種別・目的別に整理して、コピペで使えるようにする"
                      className="w-full h-20 px-3 py-2 border rounded-lg text-sm"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!customIdea.title.trim()) { alert('タイトルを入力してください'); return; }
                        const newIdea: LeadMagnetIdea = {
                          id: `custom-${Date.now()}`,
                          title: customIdea.title,
                          type: customIdea.type,
                          description: customIdea.description || customIdea.title,
                          whyItWorks: '（ユーザー作成アイデア）',
                          bridgeStrategy: '（コンテンツ生成時にAIが設計）',
                          hook: customIdea.title,
                          scores: { listPower: 0, wowFactor: 0, bridgeScore: 0, actionability: 0, seminarBoost: 0, productionEase: 0, total: 0 },
                          outline: customIdea.description ? customIdea.description.split(/[、。\n]/).filter(Boolean) : [],
                        };
                        const updatedIdeas = [...(project.ideas || []), newIdea];
                        save({ ideas: updatedIdeas });
                        setProject(prev => prev ? { ...prev, ideas: updatedIdeas } : prev);
                        setCustomIdea({ title: '', type: 'guidebook', description: '' });
                        setShowCustomIdea(false);
                      }}
                      className="text-xs px-4 py-2 rounded-lg font-medium text-white"
                      style={{ background: 'var(--primary)' }}
                    >
                      追加してコンテンツ生成へ
                    </button>
                    <button
                      onClick={() => setShowCustomIdea(false)}
                      className="text-xs px-4 py-2 rounded-lg border"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!project.ideas || project.ideas.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-4">💡</p>
                <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>
                  「⚙️ 設定」タブで商品情報を入力し「AIで生成」するか、
                </p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  「✏️ 自分のアイデアを追加」から作りたい特典を入力してください
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

                    {/* Title Suggestions */}
                    {titleSuggestions[idea.id] && titleSuggestions[idea.id].length > 0 && (
                      <div className="mb-3 p-3 rounded-lg border" style={{ borderColor: '#F59E0B', background: '#FFFBEB' }}>
                        <div className="text-xs font-bold mb-2" style={{ color: '#92400E' }}>🎯 タイトル案（クリックで変更）</div>
                        <div className="space-y-1.5">
                          {titleSuggestions[idea.id].map((t, ti) => (
                            <div
                              key={ti}
                              onClick={() => {
                                const updatedIdeas = (project.ideas || []).map(i =>
                                  i.id === idea.id ? { ...i, title: t.title, hook: t.hook } : i
                                );
                                save({ ideas: updatedIdeas });
                                setProject(prev => prev ? { ...prev, ideas: updatedIdeas } : prev);
                              }}
                              className="p-2 rounded cursor-pointer hover:bg-yellow-100 transition-colors"
                            >
                              <div className="text-xs font-medium" style={{ color: '#1C1917' }}>{t.title}</div>
                              <div className="text-xs flex gap-3 mt-0.5" style={{ color: '#92400E' }}>
                                <span>{t.pattern}</span>
                                <span>— {t.whyItWorks}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleGenerateContent(idea)}
                        disabled={generatingContent === idea.id}
                        className="text-xs px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50"
                        style={{ background: 'var(--primary)' }}
                      >
                        {generatingContent === idea.id ? '⏳ コンテンツ生成中...' : '📄 このアイデアでコンテンツを生成'}
                      </button>
                      <button
                        onClick={async () => {
                          setGeneratingTitles(idea.id);
                          try {
                            const res = await fetch('/api/generate-titles', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ config, idea }),
                            });
                            const data = await res.json();
                            if (data.error) throw new Error(data.error);
                            setTitleSuggestions(prev => ({ ...prev, [idea.id]: data.titles }));
                          } catch (err) {
                            alert(`タイトル生成に失敗: ${err instanceof Error ? err.message : '不明なエラー'}`);
                          } finally {
                            setGeneratingTitles(null);
                          }
                        }}
                        disabled={generatingTitles === idea.id}
                        className="text-xs px-4 py-2 rounded-lg font-medium border disabled:opacity-50"
                        style={{ borderColor: '#F59E0B', color: '#92400E' }}
                      >
                        {generatingTitles === idea.id ? '⏳ 生成中...' : '🎯 タイトル案を5つ生成'}
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
                      onClick={() => { setShowRevise(!showRevise); setReviseRequest(''); }}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium"
                      style={{ background: '#FEF3C7', color: '#B45309' }}
                    >
                      ✏️ 修正リクエスト
                    </button>
                    <button
                      onClick={() => handleAnalyzeQuality(currentContent)}
                      disabled={analyzingQuality === currentContent.id}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                      style={{ background: '#F0FDF4', color: '#059669' }}
                    >
                      {analyzingQuality === currentContent.id ? '⏳ 分析中...' : '✅ 品質チェック'}
                    </button>
                    {currentContent.type === 'video-script' && (
                      <button
                        onClick={() => router.push(`/projects/${id}/print?contentId=${currentContent.id}`)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium"
                        style={{ background: '#F0F4FF', color: 'var(--primary)' }}
                      >
                        📥 台本PDF
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Content list / selector */}
            {project.contents.length > 0 && (
              <div className="mb-5 p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  生成済みコンテンツ（{project.contents.length}件）
                </div>
                <div className="space-y-2">
                  {project.contents.map(c => {
                    const idea = project.ideas?.find(i => i.id === c.ideaId);
                    return (
                      <div
                        key={c.id}
                        onClick={() => { setSelectedIdeaId(c.ideaId); }}
                        className="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm"
                        style={{
                          borderColor: selectedIdeaId === c.ideaId ? 'var(--primary)' : 'var(--border)',
                          background: selectedIdeaId === c.ideaId ? '#F5F3FF' : 'var(--background)',
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-lg flex-shrink-0">{CONTENT_TYPE_LABELS[c.type]?.icon}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{c.title}</div>
                            <div className="text-xs" style={{ color: 'var(--muted)' }}>
                              {CONTENT_TYPE_LABELS[c.type]?.label} — {new Date(c.generatedAt).toLocaleDateString('ja-JP')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {c.qualityScore && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              c.qualityScore.overall >= 80 ? 'bg-green-100 text-green-700' :
                              c.qualityScore.overall >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {c.qualityScore.overall}点
                            </span>
                          )}
                          {idea && (
                            <span className="text-xs" style={{ color: 'var(--muted)' }}>
                              スコア {idea.scores.total}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = project.contents.filter(x => x.id !== c.id);
                              save({ contents: updated });
                              setProject(prev => prev ? { ...prev, contents: updated } : prev);
                              if (selectedIdeaId === c.ideaId && updated.length > 0) {
                                setSelectedIdeaId(updated[0].ideaId);
                              }
                            }}
                            className="text-xs px-1.5 py-0.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!currentContent ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-4">📄</p>
                <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>
                  「💡 アイデア」タブでアイデアを選んでコンテンツを生成してください
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  複数のアイデアからそれぞれコンテンツを生成し、比較・管理できます
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

                {/* Revise Request */}
                {showRevise && (
                  <div className="p-5 rounded-xl border" style={{ borderColor: '#F59E0B', background: '#FFFBEB' }}>
                    <h4 className="text-sm font-bold mb-2" style={{ color: '#92400E' }}>✏️ AIに修正をリクエスト</h4>
                    <p className="text-xs mb-3" style={{ color: '#B45309' }}>
                      内容の追加・修正・ボリューム変更などを自由にリクエストできます
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {[
                        'もっとボリュームを増やして',
                        '事例・具体例を追加して',
                        'もっと初心者向けに書き換えて',
                        'アクションアイテムを増やして',
                        'セクションを1つ追加して',
                        'CTAをもっと自然にして',
                        'もっとプロっぽい権威性を出して',
                        'データや数字を追加して',
                      ].map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => setReviseRequest(suggestion)}
                          className="text-xs px-2.5 py-1 rounded-full border transition-colors hover:opacity-80"
                          style={{
                            borderColor: reviseRequest === suggestion ? '#B45309' : '#E5E7EB',
                            background: reviseRequest === suggestion ? '#FDE68A' : 'white',
                            color: '#92400E',
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reviseRequest}
                      onChange={e => setReviseRequest(e.target.value)}
                      placeholder="例: セクション3の内容をもっと具体的にして、Before/Afterの事例を2つ追加してほしい"
                      className="w-full h-20 px-3 py-2 border rounded-lg text-sm mb-3"
                      style={{ borderColor: 'var(--border)' }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => currentContent && handleRevise(currentContent, reviseRequest)}
                        disabled={revising || !reviseRequest.trim()}
                        className="text-xs px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50"
                        style={{ background: '#B45309' }}
                      >
                        {revising ? '⏳ 修正中...' : '✏️ この内容でAIに修正依頼'}
                      </button>
                      <button
                        onClick={() => { setShowRevise(false); setReviseRequest(''); }}
                        className="text-xs px-4 py-2 rounded-lg border"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        閉じる
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex gap-3">
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
                    <button
                      onClick={() => {
                        const md = [
                          `# ${currentContent.title}`,
                          currentContent.subtitle ? `> ${currentContent.subtitle}` : '',
                          '',
                          '## はじめに',
                          currentContent.introduction,
                          '',
                          ...currentContent.sections.flatMap((s, i) => [
                            `## ${i + 1}. ${s.heading}`,
                            '',
                            s.content,
                            '',
                            ...(s.items && s.items.length > 0 ? [
                              ...s.items.map((item) => s.type === 'checklist' ? `- [ ] ${item}` : `- ${item}`),
                              '',
                            ] : []),
                          ]),
                          '## おわりに',
                          currentContent.closingMessage,
                          '',
                          '---',
                          currentContent.callToAction,
                        ].filter(Boolean).join('\n');
                        navigator.clipboard.writeText(md);
                        alert('Markdown形式でコピーしました（Notion・Gamma等に貼り付け可能）');
                      }}
                      className="text-sm px-6 py-2.5 rounded-lg font-medium border"
                      style={{ borderColor: '#059669', color: '#059669' }}
                    >
                      📝 Markdown形式コピー
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => router.push(`/projects/${id}/print?contentId=${currentContent.id}`)}
                      className="text-sm px-6 py-2.5 rounded-lg font-medium text-white"
                      style={{ background: 'var(--primary)' }}
                    >
                      📥 PDF保存
                    </button>
                    <button
                      onClick={() => {
                        const sections = currentContent.sections.map((s, i) => {
                          let sectionText = `【スライド${i + 1}】${s.heading}\n\n${s.content}`;
                          if (s.items && s.items.length > 0) {
                            sectionText += '\n\n' + s.items.map((item) =>
                              s.type === 'checklist' ? `☐ ${item}` : `• ${item}`
                            ).join('\n');
                          }
                          return sectionText;
                        });
                        const designText = [
                          `【表紙】`,
                          currentContent.title,
                          currentContent.subtitle || '',
                          '',
                          `【はじめに】`,
                          currentContent.introduction,
                          '',
                          ...sections.flatMap(s => [s, '']),
                          `【おわりに】`,
                          currentContent.closingMessage,
                          '',
                          `【CTA】`,
                          currentContent.callToAction,
                        ].join('\n');
                        navigator.clipboard.writeText(designText);
                        alert('スライド構成でコピーしました');
                      }}
                      className="text-sm px-6 py-2.5 rounded-lg font-medium text-white"
                      style={{ background: '#059669' }}
                    >
                      🎨 デザインツール用コピー
                    </button>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    💡 資料系はデザインツールやGamma等で仕上げるのがおすすめ。台本はそのままPDF出力可能
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== QUALITY TAB ===== */}
        {tab === 'quality' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold" style={{ color: 'var(--primary)' }}>
                ✅ 品質チェック
              </h2>
              {project.contents.length > 1 && (
                <button
                  onClick={async () => {
                    const unchecked = project.contents.filter(c => !c.qualityScore);
                    const targets = unchecked.length > 0 ? unchecked : project.contents;
                    if (targets.length === 0) return;
                    const label = unchecked.length > 0
                      ? `未チェックの${unchecked.length}件を順番にチェックします`
                      : `全${targets.length}件を再チェックします`;
                    if (!confirm(label)) return;
                    setBatchAnalyzing(true);
                    setBatchProgress({ current: 0, total: targets.length, currentTitle: '' });
                    let latestContents = [...project.contents];
                    let failedCount = 0;
                    for (let i = 0; i < targets.length; i++) {
                      const target = targets[i];
                      setBatchProgress({ current: i + 1, total: targets.length, currentTitle: target.title });
                      try {
                        const res = await fetch('/api/analyze-quality', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ config, content: target }),
                        });
                        const data = await res.json();
                        if (!data.error) {
                          latestContents = latestContents.map(c =>
                            c.id === target.id ? { ...c, qualityScore: data } : c
                          );
                          save({ contents: latestContents });
                          setProject(prev => prev ? { ...prev, contents: latestContents } : prev);
                        }
                      } catch {
                        failedCount++;
                      }
                    }
                    setBatchAnalyzing(false);
                    setBatchProgress({ current: 0, total: 0, currentTitle: '' });
                    if (failedCount > 0) {
                      alert(`${targets.length - failedCount}件成功、${failedCount}件失敗しました`);
                    }
                  }}
                  disabled={batchAnalyzing}
                  className="text-xs px-4 py-1.5 rounded-lg font-medium text-white disabled:opacity-50"
                  style={{ background: 'var(--primary)' }}
                >
                  {batchAnalyzing
                    ? `⏳ ${batchProgress.current}/${batchProgress.total} チェック中...`
                    : project.contents.some(c => !c.qualityScore)
                      ? `🔄 未チェック${project.contents.filter(c => !c.qualityScore).length}件を一括チェック`
                      : '🔄 全件再チェック'}
                </button>
              )}
            </div>

            {/* Batch progress */}
            {batchAnalyzing && (
              <div className="mb-4 p-4 rounded-xl border" style={{ borderColor: 'var(--primary)', background: '#F5F3FF' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
                    ⏳ {batchProgress.current}/{batchProgress.total} 件目を分析中
                  </span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>
                    {batchProgress.total > 0 ? Math.round((batchProgress.current / batchProgress.total) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 mb-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%`, background: 'var(--primary)' }}
                  />
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                  {batchProgress.currentTitle}
                </p>
              </div>
            )}

            {/* All contents quality overview */}
            {project.contents.length > 1 && (
              <div className="mb-5 p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                <div className="text-xs font-bold mb-3" style={{ color: 'var(--text-secondary)' }}>
                  コンテンツ別スコア
                </div>
                <div className="space-y-2">
                  {project.contents.map(c => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedIdeaId(c.ideaId)}
                      className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all hover:shadow-sm"
                      style={{
                        background: selectedIdeaId === c.ideaId ? '#F5F3FF' : 'var(--background)',
                        borderLeft: selectedIdeaId === c.ideaId ? '3px solid var(--primary)' : '3px solid transparent',
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm flex-shrink-0">{CONTENT_TYPE_LABELS[c.type]?.icon}</span>
                        <span className="text-xs truncate" style={{ color: 'var(--text)' }}>{c.title}</span>
                      </div>
                      {c.qualityScore ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          c.qualityScore.overall >= 80 ? 'bg-green-100 text-green-700' :
                          c.qualityScore.overall >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {c.qualityScore.overall}点
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100" style={{ color: 'var(--muted)' }}>
                          未チェック
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!currentContent?.qualityScore ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-4">✅</p>
                <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                  {currentContent ? `「${currentContent.title}」の品質チェックを実行してください` : 'コンテンツを生成した後、品質チェックを実行できます'}
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
                  {/* Target content info */}
                  <div className="p-4 rounded-xl border flex items-center gap-3" style={{ borderColor: 'var(--primary)', background: '#F5F3FF' }}>
                    <span className="text-lg">{CONTENT_TYPE_LABELS[currentContent.type]?.icon}</span>
                    <div>
                      <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{currentContent.title}</div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>
                        {CONTENT_TYPE_LABELS[currentContent.type]?.label} — {new Date(currentContent.generatedAt).toLocaleDateString('ja-JP')} 生成
                      </div>
                    </div>
                  </div>

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
                        {qs.rewriteSuggestions.map((rw, i) => {
                          const findLocation = () => {
                            const original = rw.original;
                            if (currentContent.introduction.includes(original)) return 'はじめに';
                            if (currentContent.closingMessage.includes(original)) return 'おわりに';
                            if (currentContent.callToAction.includes(original)) return 'CTA';
                            for (let si = 0; si < currentContent.sections.length; si++) {
                              const s = currentContent.sections[si];
                              if (s.content.includes(original) || s.heading.includes(original)) {
                                return `セクション${si + 1}「${s.heading}」`;
                              }
                              if (s.items?.some(item => item.includes(original))) {
                                return `セクション${si + 1}「${s.heading}」のアイテム`;
                              }
                            }
                            return '（該当箇所を特定できません）';
                          };
                          const location = findLocation();

                          const applyRewrite = () => {
                            const original = rw.original;
                            const improved = rw.improved;
                            let updated = { ...currentContent };
                            let applied = false;

                            if (updated.introduction.includes(original)) {
                              updated = { ...updated, introduction: updated.introduction.split(original).join(improved) };
                              applied = true;
                            }
                            if (updated.closingMessage.includes(original)) {
                              updated = { ...updated, closingMessage: updated.closingMessage.split(original).join(improved) };
                              applied = true;
                            }
                            if (updated.callToAction.includes(original)) {
                              updated = { ...updated, callToAction: updated.callToAction.split(original).join(improved) };
                              applied = true;
                            }
                            const newSections = updated.sections.map(s => {
                              let newS = { ...s };
                              if (s.content.includes(original)) {
                                newS = { ...newS, content: s.content.split(original).join(improved) };
                                applied = true;
                              }
                              if (s.heading.includes(original)) {
                                newS = { ...newS, heading: s.heading.split(original).join(improved) };
                                applied = true;
                              }
                              if (s.items) {
                                const newItems = s.items.map(item =>
                                  item.includes(original) ? (applied = true, item.split(original).join(improved)) : item
                                );
                                newS = { ...newS, items: newItems };
                              }
                              return newS;
                            });
                            updated = { ...updated, sections: newSections };

                            if (!applied) {
                              alert('該当箇所が見つかりませんでした。コンテンツが既に変更されている可能性があります。');
                              return;
                            }

                            const updatedContents = project.contents.map(c =>
                              c.id === currentContent.id ? updated : c
                            );
                            save({ contents: updatedContents });
                            setProject(prev => prev ? { ...prev, contents: updatedContents } : prev);
                            alert('書き換えを適用しました');
                          };

                          return (
                            <div key={i} className="p-4 rounded-lg border" style={{ borderColor: '#E7E5E4', background: '#FAFAF9' }}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#F0F4FF', color: 'var(--primary)' }}>
                                  📍 {location}
                                </span>
                              </div>
                              <div className="space-y-2 mb-3">
                                <div className="p-3 rounded-lg" style={{ background: '#FEE2E2' }}>
                                  <div className="text-xs font-medium mb-1 text-red-600">Before:</div>
                                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{rw.original}</p>
                                </div>
                                <div className="p-3 rounded-lg" style={{ background: '#D1FAE5' }}>
                                  <div className="text-xs font-medium mb-1 text-green-600">After:</div>
                                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{rw.improved}</p>
                                </div>
                              </div>
                              <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>💡 {rw.reason}</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={applyRewrite}
                                  className="text-xs px-4 py-1.5 rounded-lg font-medium text-white"
                                  style={{ background: '#059669' }}
                                >
                                  ✅ この書き換えを適用
                                </button>
                                <CopyButton text={rw.improved} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => {
                          if (!confirm('すべての書き換え提案を一括適用しますか？')) return;
                          let updated = { ...currentContent };
                          let appliedCount = 0;
                          for (const rw of qs.rewriteSuggestions) {
                            const { original, improved } = rw;
                            let found = false;
                            if (updated.introduction.includes(original)) {
                              updated = { ...updated, introduction: updated.introduction.split(original).join(improved) };
                              found = true;
                            }
                            if (updated.closingMessage.includes(original)) {
                              updated = { ...updated, closingMessage: updated.closingMessage.split(original).join(improved) };
                              found = true;
                            }
                            if (updated.callToAction.includes(original)) {
                              updated = { ...updated, callToAction: updated.callToAction.split(original).join(improved) };
                              found = true;
                            }
                            updated = {
                              ...updated,
                              sections: updated.sections.map(s => {
                                let newS = { ...s };
                                if (s.content.includes(original)) { newS = { ...newS, content: s.content.split(original).join(improved) }; found = true; }
                                if (s.heading.includes(original)) { newS = { ...newS, heading: s.heading.split(original).join(improved) }; found = true; }
                                if (s.items) { newS = { ...newS, items: s.items.map(item => item.includes(original) ? (found = true, item.split(original).join(improved)) : item) }; }
                                return newS;
                              }),
                            };
                            if (found) appliedCount++;
                          }
                          const updatedContents = project.contents.map(c =>
                            c.id === currentContent.id ? updated : c
                          );
                          save({ contents: updatedContents });
                          setProject(prev => prev ? { ...prev, contents: updatedContents } : prev);
                          alert(`${appliedCount}件の書き換えを適用しました`);
                        }}
                        className="mt-4 w-full text-sm py-2.5 rounded-lg font-medium border"
                        style={{ borderColor: '#059669', color: '#059669' }}
                      >
                        🔄 すべての提案を一括適用
                      </button>
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
