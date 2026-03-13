'use client';

import { createContext, useContext, useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { getProject } from '../../../lib/store';
import { ContentGiftProject, GeneratedContent, ContentSection, CONTENT_TYPE_LABELS } from '../../../lib/types';

// ===== Brand Color System =====
function makeBrand(primary: string, accent: string) {
  const hexToRgb = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });
  const lighten = (hex: string, f: number) => {
    const { r, g, b } = hexToRgb(hex);
    return `#${[r, g, b].map(c => Math.round(c + (255 - c) * f).toString(16).padStart(2, '0')).join('')}`;
  };
  return {
    primary, primaryLight: lighten(primary, 0.3),
    accent, accentLight: lighten(accent, 0.6), accentBg: lighten(accent, 0.92),
    text: '#1C1917', textSub: '#44403C', textMuted: '#A8A29E',
    bgSoft: '#F8F7F5', border: '#E7E5E4', borderLight: '#F5F5F4',
    green: '#059669', greenBg: '#ECFDF5', greenBorder: '#A7F3D0',
  };
}
type Brand = ReturnType<typeof makeBrand>;
const BrandCtx = createContext<Brand>(makeBrand('#1B2A4A', '#C8963E'));
const B = () => useContext(BrandCtx);

// ===== MAIN =====
export default function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const contentId = searchParams.get('contentId');
  const [project, setProject] = useState<ContentGiftProject | null>(null);
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const p = getProject(id);
    if (!p) { setLoadError(true); return; }
    setProject(p);
    const c = p.contents.find(c => c.id === contentId);
    if (c) setContent(c);
    else setLoadError(true);
  }, [id, contentId]);

  useEffect(() => {
    if (content) setTimeout(() => window.print(), 800);
  }, [content]);

  if (loadError) return (
    <div style={{ padding: '60px', textAlign: 'center', fontFamily: "'Noto Sans JP', sans-serif" }}>
      <p style={{ fontSize: '20px', marginBottom: '16px' }}>コンテンツが見つかりません</p>
      <a href="/" style={{ color: '#C8963E', fontSize: '16px' }}>トップに戻る</a>
    </div>
  );
  if (!project || !content) return (
    <div style={{ padding: '60px', textAlign: 'center', fontFamily: "'Noto Sans JP', sans-serif" }}>
      <p style={{ fontSize: '18px', color: '#A8A29E' }}>読み込み中...</p>
    </div>
  );

  const brand = makeBrand(
    project.config.brandColorPrimary || '#1B2A4A',
    project.config.brandColorAccent || '#C8963E'
  );
  const typeInfo = CONTENT_TYPE_LABELS[content.type];

  return (
    <BrandCtx.Provider value={brand}>
      <div style={{ fontFamily: "'Noto Sans JP', sans-serif", color: brand.text }}>
        <style>{`
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
            .page-break { page-break-before: always; }
            .no-break { page-break-inside: avoid; }
          }
          @page { size: A4; margin: 18mm 16mm 20mm 16mm; }
          * { box-sizing: border-box; }
        `}</style>

        <CoverPage content={content} typeInfo={typeInfo} productName={project.config.productName} />
        <TableOfContents content={content} />

        <div className="page-break" style={{ paddingTop: '8px' }}>
          <ChapterHeading
            title={content.type === 'checklist' ? 'チェックリストの使い方' :
                   content.type === 'template' ? 'テンプレートの使い方' :
                   content.type === 'worksheet' ? 'ワークシートの進め方' :
                   content.type === 'swipe-file' ? 'スワイプファイルの活用方法' :
                   'はじめに'}
            number={0}
          />
          <RichText text={content.introduction} />
        </div>

        {content.sections.map((section, idx) => (
          <div key={idx} className="page-break">
            <ChapterHeading title={section.heading} number={idx + 1} />
            <SectionBody section={section} contentType={content.type} />
          </div>
        ))}

        <div className="page-break">
          <ChapterHeading title="おわりに" number={content.sections.length + 1} />
          <RichText text={content.closingMessage} />
        </div>

        <div className="no-break" style={{
          marginTop: '48px', padding: '36px 40px',
          background: `linear-gradient(135deg, ${brand.primary} 0%, ${brand.primaryLight} 100%)`,
          borderRadius: '14px', color: 'white',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '3px', marginBottom: '20px', color: brand.accentLight, textTransform: 'uppercase' as const }}>
            NEXT STEP
          </div>
          <RichText text={content.callToAction} color="rgba(255,255,255,0.92)" />
        </div>

        <div style={{ marginTop: '48px', paddingTop: '20px', borderTop: `2px solid ${brand.border}`, textAlign: 'center' }}>
          <div style={{ width: '36px', height: '3px', background: brand.accent, margin: '0 auto 14px' }} />
          <p style={{ fontSize: '13px', color: brand.textMuted, letterSpacing: '1px' }}>
            {project.config.productName || content.title}
          </p>
        </div>
      </div>
    </BrandCtx.Provider>
  );
}

// ===== COVER =====
function CoverPage({ content, typeInfo, productName }: {
  content: GeneratedContent;
  typeInfo: { label: string; icon: string } | undefined;
  productName: string;
}) {
  const b = B();
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      background: `linear-gradient(160deg, ${b.primary} 0%, #0D1B2A 50%, ${b.primaryLight} 100%)`,
      color: 'white', textAlign: 'center', padding: '80px 50px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '60px', left: '50px', width: '60px', height: '2px', background: b.accent, opacity: 0.6 }} />
      <div style={{ position: 'absolute', bottom: '60px', right: '50px', width: '60px', height: '2px', background: b.accent, opacity: 0.6 }} />
      <div style={{ position: 'absolute', top: '57px', left: '50px', width: '2px', height: '60px', background: b.accent, opacity: 0.6 }} />
      <div style={{ position: 'absolute', bottom: '57px', right: '50px', width: '2px', height: '60px', background: b.accent, opacity: 0.6 }} />

      <div style={{
        fontSize: '15px', letterSpacing: '5px', textTransform: 'uppercase' as const,
        color: b.accent, fontWeight: 600, marginBottom: '36px',
        padding: '10px 28px', border: `1px solid ${b.accent}40`, borderRadius: '4px',
      }}>
        {typeInfo?.icon} {typeInfo?.label || 'SPECIAL CONTENT'}
      </div>
      <h1 style={{ fontSize: '42px', fontWeight: 800, lineHeight: 1.5, marginBottom: '24px', maxWidth: '540px' }}>
        {content.title}
      </h1>
      {content.subtitle && (
        <p style={{ fontSize: '18px', opacity: 0.7, maxWidth: '440px', lineHeight: 1.8 }}>{content.subtitle}</p>
      )}
      <div style={{ width: '52px', height: '3px', background: b.accent, margin: '44px 0' }} />
      {productName && (
        <p style={{ fontSize: '15px', opacity: 0.4, letterSpacing: '3px', fontWeight: 500 }}>{productName}</p>
      )}
    </div>
  );
}

// ===== TABLE OF CONTENTS =====
function TableOfContents({ content }: { content: GeneratedContent }) {
  const b = B();
  return (
    <div className="page-break" style={{ paddingTop: '60px' }}>
      <div style={{ textAlign: 'center', marginBottom: '52px' }}>
        <div style={{ fontSize: '14px', letterSpacing: '5px', color: b.accent, fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase' as const }}>
          TABLE OF CONTENTS
        </div>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: b.primary }}>目次</h2>
        <div style={{ width: '44px', height: '3px', background: b.accent, margin: '18px auto 0' }} />
      </div>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <TocItem number={0} title="はじめに" />
        {content.sections.map((s, i) => <TocItem key={i} number={i + 1} title={s.heading} />)}
        <TocItem number={content.sections.length + 1} title="おわりに" />
      </div>
    </div>
  );
}

function TocItem({ number, title }: { number: number; title: string }) {
  const b = B();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '16px 0', borderBottom: `1px solid ${b.borderLight}` }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '36px', height: '36px', borderRadius: '50%',
        background: number === 0 ? b.accent : b.primary,
        color: 'white', fontSize: '15px', fontWeight: 700, flexShrink: 0,
      }}>
        {number === 0 ? '—' : number}
      </span>
      <span style={{ fontSize: '18px', fontWeight: 500, color: b.text }}>{title}</span>
    </div>
  );
}

// ===== CHAPTER HEADING =====
function ChapterHeading({ title, number }: { title: string; number: number }) {
  const b = B();
  return (
    <div className="no-break" style={{ marginBottom: '32px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '18px',
        padding: '20px 28px', background: b.primary, borderRadius: '10px', color: 'white',
      }}>
        {number > 0 && (
          <span style={{ fontSize: '18px', fontWeight: 700, color: b.accent, letterSpacing: '1px', minWidth: '48px' }}>
            {String(number).padStart(2, '0')}
          </span>
        )}
        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0, lineHeight: 1.5 }}>{title}</h2>
      </div>
    </div>
  );
}

// ===== RICH TEXT =====
function RichText({ text, color }: { text: string; color?: string }) {
  const b = B();
  const lines = text.split('\\n').join('\n').split('\n');
  const textColor = color || b.textSub;
  return <div>{lines.map((line, i) => <StyledLine key={i} line={line} textColor={textColor} />)}</div>;
}

function StyledLine({ line, textColor }: { line: string; textColor: string }) {
  const b = B();
  const t = line.trim();
  if (!t) return <div style={{ height: '16px' }} />;

  // ★ Tip box
  if (t.startsWith('★')) return <TipBox text={t} />;

  // ✅ Action heading
  if (t.startsWith('✅') && (t.includes('アクション') || t.includes('セクション'))) {
    return (
      <div style={{
        fontSize: '19px', fontWeight: 700, color: b.green,
        marginTop: '28px', marginBottom: '14px', padding: '12px 20px',
        background: b.greenBg, borderRadius: '8px', borderLeft: `5px solid ${b.green}`,
      }}>{t}</div>
    );
  }

  // ■ Sub-heading
  if (t.match(/^[■◆▶●]/)) {
    return (
      <div style={{
        fontSize: '22px', fontWeight: 700, color: b.primary,
        marginTop: '32px', marginBottom: '18px', paddingBottom: '12px',
        borderBottom: `3px solid ${b.accent}`, display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <span style={{ color: b.accent, fontSize: '24px' }}>{t.charAt(0)}</span>
        <span>{t.slice(1).trim()}</span>
      </div>
    );
  }

  // 【】 Data label
  if (t.startsWith('【') && t.includes('】')) return <DataLabel line={t} />;

  // ・ or ①②③
  if (t.match(/^[・•]/) || t.match(/^[①②③④⑤⑥⑦⑧⑨⑩]/)) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 18px', marginBottom: '6px', fontSize: '17px', lineHeight: 1.9, color: b.text }}>
        <span style={{ color: b.accent, fontWeight: 700, flexShrink: 0, fontSize: '20px' }}>{t.charAt(0)}</span>
        <span>{t.slice(1).trim()}</span>
      </div>
    );
  }

  // 1. 2. 3. numbered list
  if (t.match(/^[0-9]+[.．)）]\s/)) {
    const m = t.match(/^([0-9]+)[.．)）]\s(.+)/);
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '10px 18px', marginBottom: '8px', fontSize: '17px', lineHeight: 1.9, color: b.text }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '32px', height: '32px', borderRadius: '50%', background: b.primary,
          color: 'white', fontSize: '14px', fontWeight: 700, flexShrink: 0, marginTop: '3px',
        }}>{m ? m[1] : ''}</span>
        <span>{m ? m[2] : t}</span>
      </div>
    );
  }

  // → sub-item
  if (t.startsWith('→') || t.startsWith('　→')) {
    return (
      <div style={{
        fontSize: '16px', lineHeight: 1.9, color: b.textSub, marginBottom: '8px',
        borderLeft: `3px solid ${b.accent}40`, marginLeft: '16px', padding: '6px 0 6px 22px',
      }}>
        {t.replace(/^　?→\s?/, '')}
      </div>
    );
  }

  // Regular text
  return <p style={{ fontSize: '17px', lineHeight: 2.1, color: textColor, marginBottom: '10px' }}>{t}</p>;
}

// ===== TIP BOX =====
function TipBox({ text }: { text: string }) {
  const b = B();
  return (
    <div className="no-break" style={{
      marginTop: '24px', marginBottom: '24px', padding: '24px 28px',
      background: b.accentBg, border: `1px solid ${b.accent}40`,
      borderLeft: `5px solid ${b.accent}`, borderRadius: '0 10px 10px 0',
    }}>
      <div style={{ fontSize: '15px', fontWeight: 700, color: b.accent, letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase' as const }}>
        PRO TIP
      </div>
      <p style={{ fontSize: '16px', lineHeight: 2, color: b.text, margin: 0 }}>
        {text.replace(/^★\s*/, '').replace(/^プロのポイント\s*/, '')}
      </p>
    </div>
  );
}

// ===== DATA LABEL =====
function DataLabel({ line }: { line: string }) {
  const b = B();
  const m = line.match(/^【(.+?)】\s*(.*)/);
  if (!m) return <p style={{ fontSize: '17px', lineHeight: 1.9, color: b.text }}>{line}</p>;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '14px',
      padding: '12px 18px', marginBottom: '6px',
      background: b.bgSoft, borderRadius: '8px', border: `1px solid ${b.borderLight}`,
    }}>
      <span style={{
        fontSize: '14px', fontWeight: 700, color: b.primary,
        background: 'white', padding: '4px 12px', borderRadius: '5px',
        border: `1px solid ${b.border}`, flexShrink: 0, whiteSpace: 'nowrap' as const,
      }}>{m[1]}</span>
      <span style={{ fontSize: '17px', lineHeight: 1.9, color: b.text }}>{m[2]}</span>
    </div>
  );
}

// ===== SECTION BODY =====
function SectionBody({ section, contentType }: { section: ContentSection; contentType: string }) {
  return (
    <>
      <RichText text={section.content} />
      {section.items && section.items.length > 0 && (
        <ItemsRenderer items={section.items} contentType={contentType} sectionType={section.type} />
      )}
    </>
  );
}

// ===== ITEMS RENDERER =====
function ItemsRenderer({ items, contentType, sectionType }: {
  items: string[]; contentType: string; sectionType?: string;
}) {
  const b = B();

  // Checklist
  if (contentType === 'checklist' || sectionType === 'checklist') {
    return (
      <div className="no-break" style={{ marginTop: '24px', borderRadius: '12px', border: `2px solid ${b.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '12px 24px', background: b.primary, fontSize: '14px', fontWeight: 700, color: b.accent, letterSpacing: '3px', textTransform: 'uppercase' as const }}>
          CHECKLIST
        </div>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '14px 24px',
            borderBottom: i < items.length - 1 ? `1px solid ${b.borderLight}` : 'none',
            background: i % 2 === 0 ? 'white' : b.bgSoft,
          }}>
            <span style={{ flexShrink: 0, width: '26px', height: '26px', border: `2px solid ${b.primary}`, borderRadius: '5px', marginTop: '3px' }} />
            <span style={{ fontSize: '17px', lineHeight: 1.9, color: b.text }}>{item}</span>
          </div>
        ))}
      </div>
    );
  }

  // Worksheet
  if (contentType === 'worksheet' || sectionType === 'worksheet') {
    return (
      <div style={{ marginTop: '24px' }}>
        {items.map((item, i) => (
          <div key={i} className="no-break" style={{
            marginBottom: '28px', padding: '24px 28px',
            background: b.bgSoft, borderRadius: '12px', border: `1px solid ${b.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '14px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '34px', height: '34px', borderRadius: '50%', background: b.accent,
                color: 'white', fontSize: '15px', fontWeight: 700, flexShrink: 0,
              }}>{i + 1}</span>
              <span style={{ fontSize: '17px', fontWeight: 600, color: b.text, lineHeight: 1.8 }}>{item}</span>
            </div>
            <div style={{ paddingLeft: '48px' }}>
              <div style={{ borderBottom: `2px solid ${b.border}`, height: '40px' }} />
              <div style={{ borderBottom: `1px solid ${b.borderLight}`, height: '40px' }} />
              <div style={{ borderBottom: `1px solid ${b.borderLight}`, height: '40px' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Template
  if (contentType === 'template') {
    return (
      <div className="no-break" style={{ marginTop: '24px', borderRadius: '12px', border: `2px solid ${b.accent}40`, overflow: 'hidden' }}>
        <div style={{ padding: '12px 24px', background: b.accentBg, fontSize: '14px', fontWeight: 700, color: b.accent, letterSpacing: '3px', borderBottom: `1px solid ${b.accent}40` }}>
          CUSTOMIZE POINTS
        </div>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 24px',
            borderBottom: i < items.length - 1 ? `1px solid ${b.borderLight}` : 'none',
            fontSize: '16px', lineHeight: 1.9, color: b.text,
          }}>
            <span style={{ color: b.accent, fontWeight: 700, flexShrink: 0, fontSize: '18px' }}>&#9656;</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    );
  }

  // Swipe file
  if (contentType === 'swipe-file') {
    return (
      <div className="no-break" style={{
        marginTop: '24px', padding: '24px 28px',
        background: b.accentBg, border: `1px solid ${b.accent}40`, borderRadius: '12px',
      }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: b.accent, letterSpacing: '2px', marginBottom: '14px' }}>
          ACTIONABLE INSIGHTS
        </div>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px', fontSize: '16px', lineHeight: 1.9, color: b.text }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', borderRadius: '50%', background: b.accent,
              color: 'white', fontSize: '13px', fontWeight: 700, flexShrink: 0, marginTop: '3px',
            }}>{i + 1}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    );
  }

  // Default: action list
  return (
    <div className="no-break" style={{
      marginTop: '24px', padding: '24px 28px',
      background: b.greenBg, border: `1px solid ${b.greenBorder}`,
      borderRadius: '12px', borderLeft: `5px solid ${b.green}`,
    }}>
      <div style={{ fontSize: '15px', fontWeight: 700, color: b.green, letterSpacing: '2px', marginBottom: '14px' }}>
        ACTION ITEMS
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '10px', fontSize: '17px', lineHeight: 1.9, color: b.text }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '28px', height: '28px', borderRadius: '50%', background: b.green,
            color: 'white', fontSize: '13px', fontWeight: 700, flexShrink: 0, marginTop: '3px',
          }}>{i + 1}</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}
