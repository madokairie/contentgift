'use client';

import { useRouter } from 'next/navigation';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-20">
      <h2 className="text-lg font-bold mb-4 pb-2 border-b-2" style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}>{title}</h2>
      {children}
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold mt-5 mb-2" style={{ color: 'var(--text)' }}>{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{children}</p>;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg my-3" style={{ background: '#F0FDF4', borderLeft: '3px solid #059669' }}>
      <p className="text-xs" style={{ color: '#065F46' }}>💡 {children}</p>
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2 my-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--primary)' }}>
            {i + 1}
          </span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

export default function ManualPage() {
  const router = useRouter();

  const toc = [
    { id: 'overview', title: '全体の流れ' },
    { id: 'config', title: '商品情報を設定する' },
    { id: 'ideas', title: 'アイデアを生成する' },
    { id: 'content', title: 'コンテンツを生成する' },
    { id: 'quality', title: '品質チェック' },
    { id: 'pdf', title: 'PDF保存' },
    { id: 'backup', title: 'バックアップと復元' },
    { id: 'tips', title: '効果的な特典の作り方' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-sm hover:opacity-70" style={{ color: 'var(--muted)' }}>
            ← トップに戻る
          </button>
          <h1 className="text-base font-bold" style={{ color: 'var(--primary)' }}>📖 使い方マニュアル</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 flex gap-8">
        {/* TOC */}
        <nav className="w-48 flex-shrink-0 hidden md:block">
          <div className="sticky top-8 space-y-1.5">
            <div className="text-xs font-bold mb-3" style={{ color: 'var(--primary)' }}>目次</div>
            {toc.map(item => (
              <a key={item.id} href={`#${item.id}`} className="block text-xs py-1 hover:opacity-70 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                {item.title}
              </a>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Section id="overview" title="全体の流れ">
            <P>Content Giftは4ステップで特典コンテンツを作成します。</P>
            <Steps items={[
              '⚙️ 設定 — 商品情報・ターゲット・用途を入力',
              '💡 アイデア — AIが6つの特典アイデアをスコア付きで提案',
              '📄 コンテンツ — 選んだアイデアの本文をAIが自動生成',
              '✅ 品質チェック — 定量・定性の両面からAIが評価し改善提案',
            ]} />
            <Tip>各ステップはいつでもやり直せます。アイデアの再生成、コンテンツの再生成、品質の再チェックが可能です。</Tip>
          </Section>

          <Section id="config" title="商品情報を設定する">
            <P>「⚙️ 設定」タブで商品・サービスの情報を入力します。入力が詳しいほどAIの出力精度が上がります。</P>
            <H3>特に重要な設定項目</H3>
            <div className="space-y-2 my-3">
              {[
                { label: '特典の用途', desc: 'リスト獲得用 / セミナー特典 / 両方で、アイデアの方向性が変わります' },
                { label: 'ターゲットの悩み', desc: '具体的に書くほど「刺さる」特典タイトルが生まれます' },
                { label: '競合の特典', desc: '競合と差別化できるアイデアを出すために重要です' },
                { label: '希望形式', desc: 'チェックリスト・動画台本・ガイドブック等。AIにおまかせも可能' },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>{item.label}</span>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="ideas" title="アイデアを生成する">
            <P>「💡 アイデアを生成」ボタンを押すと、AIが6つの特典アイデアを提案します。各アイデアは6つの指標で100点満点にスコアリングされます。</P>
            <H3>スコアの見方</H3>
            <div className="space-y-1 my-3">
              {[
                { label: 'リスト獲得力', desc: '「今すぐ欲しい」と思わせる力' },
                { label: '感動指数', desc: '「無料でこのレベル？」と思わせる力' },
                { label: '架け橋度', desc: '有料商品への自然な導線の強さ' },
                { label: '即実践度', desc: '受け取ってすぐ使える具体性' },
                { label: 'セミナー参加率UP', desc: 'セミナーへの期待を高める力' },
                { label: '制作しやすさ', desc: '実際に制作する難易度' },
              ].map(item => (
                <div key={item.label} className="flex gap-2 text-xs py-1">
                  <span className="font-medium w-28 flex-shrink-0" style={{ color: 'var(--text)' }}>{item.label}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.desc}</span>
                </div>
              ))}
            </div>
            <Tip>スコアが最も高いアイデアに「👑 おすすめ」マークが付きます。ただしスコアだけでなく、あなたの商品との相性も考慮して選びましょう。</Tip>
          </Section>

          <Section id="content" title="コンテンツを生成する">
            <P>アイデアカードの「📄 このアイデアでコンテンツを生成」ボタンを押すと、特典の本文が自動生成されます。</P>
            <H3>コンテンツに含まれるもの</H3>
            <Steps items={[
              'タイトル & サブタイトル',
              'はじめに（読者への語りかけ）',
              '本編セクション（5〜10セクション）',
              'おわりに（感謝と次のステップ）',
              'CTA（有料商品への自然な導線）',
            ]} />
            <P>各セクション右上の「コピー」ボタンでテキストをコピーできます。「📋 全文コピー」で全体を一括コピーも可能です。</P>
          </Section>

          <Section id="quality" title="品質チェック">
            <P>「✅ 品質チェック」ボタンを押すと、AIが定量的・定性的の両面からコンテンツを評価します。</P>
            <H3>定量評価</H3>
            <P>文字数・セクション数・アクションアイテム数・具体例・データポイントの5項目を客観的にカウントします。</P>
            <H3>定性評価</H3>
            <P>明瞭さ・即実践性・独自性・感情インパクト・知覚価値・架け橋効果の6項目を10点満点で評価します。</P>
            <H3>書き換え提案</H3>
            <P>「Before → After」形式で、具体的な文章の改善案が提示されます。コピーボタンでそのまま使えます。</P>
          </Section>

          <Section id="pdf" title="PDF保存">
            <Steps items={[
              'コンテンツタブで「📥 PDF保存」をクリック',
              '印刷プレビューが開く',
              '「送信先」を「PDFとして保存」に変更',
              '「保存」をクリック',
            ]} />
            <Tip>Chromeの場合、「詳細設定」→「背景のグラフィック」にチェックを入れると表紙の色が反映されます。</Tip>
          </Section>

          <Section id="backup" title="バックアップと復元">
            <P>トップページ右上の「バックアップ」ボタンで全データをJSONファイルに保存。「復元」ボタンでデータを読み込めます。</P>
            <Tip>データはブラウザのlocalStorageに保存されています。ブラウザのデータ消去で消えるため、定期的なバックアップを推奨します。</Tip>
          </Section>

          <Section id="tips" title="効果的な特典の作り方">
            <H3>リスト獲得力を最大化する3つのコツ</H3>
            <Steps items={[
              '「知識」より「ツール」を提供する — チェックリスト・テンプレートは行動のハードルが低い',
              'タイトルに具体的な数字を入れる — 「7つのステップ」「30日で」「5分でわかる」',
              '競合がやっていない切り口を選ぶ — 同じジャンルでも角度を変えるだけで差別化できる',
            ]} />
            <H3>架け橋効果を高めるコツ</H3>
            <P>特典で「一部を深く」出すのがポイント。全体の概要を浅く出すより、1つのテーマを深く掘り下げると「他のテーマも知りたい」と思わせることができます。</P>
            <H3>感動指数を上げるコツ</H3>
            <P>「有料級」にするには、具体的な事例・数字・ステップが鍵です。抽象的な内容を10ページ作るより、具体的なノウハウを5ページ作る方が価値が高いと感じてもらえます。</P>
          </Section>
        </div>
      </main>
    </div>
  );
}
