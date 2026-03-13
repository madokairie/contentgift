'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { getProject } from '../../../lib/store';
import { ContentGiftProject, GeneratedContent, CONTENT_TYPE_LABELS } from '../../../lib/types';

export default function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const contentId = searchParams.get('contentId');
  const [project, setProject] = useState<ContentGiftProject | null>(null);
  const [content, setContent] = useState<GeneratedContent | null>(null);

  useEffect(() => {
    const p = getProject(id);
    if (!p) return;
    setProject(p);
    const c = p.contents.find(c => c.id === contentId);
    if (c) setContent(c);
  }, [id, contentId]);

  useEffect(() => {
    if (content) {
      setTimeout(() => window.print(), 500);
    }
  }, [content]);

  if (!project || !content) return <div className="p-8 text-center">読み込み中...</div>;

  const typeInfo = CONTENT_TYPE_LABELS[content.type];

  return (
    <div style={{ fontFamily: "'Noto Sans JP', sans-serif", color: '#1C1917' }}>
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
          .page-break { page-break-before: always; }
          .no-break { page-break-inside: avoid; }
        }
        @page { size: A4; margin: 20mm; }
      `}</style>

      {/* Cover Page */}
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '60px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>{typeInfo?.icon || '📄'}</div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px', lineHeight: 1.4 }}>
          {content.title}
        </h1>
        {content.subtitle && (
          <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '30px' }}>
            {content.subtitle}
          </p>
        )}
        <div style={{ width: '60px', height: '2px', background: 'rgba(255,255,255,0.5)', margin: '20px 0' }} />
        <p style={{ fontSize: '13px', opacity: 0.7 }}>
          {project.config.productName && `${project.config.productName} — `}
          {typeInfo?.label}
        </p>
      </div>

      {/* Introduction */}
      <div className="page-break" style={{ padding: '40px 0' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#7C3AED', marginBottom: '16px', borderBottom: '2px solid #7C3AED', paddingBottom: '8px' }}>
          はじめに
        </h2>
        <p style={{ fontSize: '14px', lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#57534E' }}>
          {content.introduction}
        </p>
      </div>

      {/* Sections */}
      {content.sections.map((section, idx) => (
        <div key={idx} className={idx > 0 ? 'no-break' : 'page-break no-break'} style={{ padding: '30px 0' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#1C1917',
            marginBottom: '12px',
            paddingLeft: '12px',
            borderLeft: '4px solid #7C3AED',
          }}>
            {section.heading}
          </h3>
          <p style={{ fontSize: '13px', lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#57534E', marginBottom: '12px' }}>
            {section.content}
          </p>
          {section.items && section.items.length > 0 && (
            <div style={{ background: '#FAFAF9', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
              {section.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', fontSize: '13px', color: '#57534E' }}>
                  <span style={{ flexShrink: 0, fontWeight: 600 }}>
                    {section.type === 'checklist' ? '☐' : `${i + 1}.`}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Closing */}
      <div className="no-break" style={{ padding: '30px 0' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#7C3AED', marginBottom: '12px', borderBottom: '2px solid #7C3AED', paddingBottom: '8px' }}>
          おわりに
        </h3>
        <p style={{ fontSize: '13px', lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#57534E' }}>
          {content.closingMessage}
        </p>
      </div>

      {/* CTA */}
      <div className="no-break" style={{
        marginTop: '20px',
        padding: '24px',
        background: '#FFFBEB',
        borderRadius: '12px',
        border: '1px solid #F59E0B',
      }}>
        <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#92400E', whiteSpace: 'pre-wrap' }}>
          {content.callToAction}
        </p>
      </div>
    </div>
  );
}
