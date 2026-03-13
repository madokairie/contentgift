import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { config, content, request } = await req.json();

    const allText = [
      `タイトル: ${content.title}`,
      `サブタイトル: ${content.subtitle}`,
      `形式: ${content.type}`,
      '',
      '【はじめに】',
      content.introduction,
      '',
      ...content.sections.map((s: { heading: string; content: string; items?: string[] }, i: number) =>
        `【セクション${i + 1}: ${s.heading}】\n${s.content}${s.items ? '\n' + s.items.join('\n') : ''}`
      ),
      '',
      '【おわりに】',
      content.closingMessage,
      '',
      '【CTA】',
      content.callToAction,
    ].join('\n');

    const prompt = `あなたはリードマグネット・特典コンテンツの制作専門家です。
以下の特典コンテンツに対して、ユーザーから修正・改善リクエストがありました。
リクエストに応じてコンテンツを修正してください。

## 商品情報
- 商品名: ${config.productName || '未設定'}
- ターゲット: ${config.targetAudience || '未設定'}
- ターゲットの悩み: ${config.targetPain || '未設定'}
- ターゲットの理想: ${config.targetDesire || '未設定'}

## 現在のコンテンツ
${allText}

## ユーザーからの修正リクエスト
${request}

## 指示
- リクエストに応じて、コンテンツ全体を修正した完全版を返してください
- 修正が必要ない部分はそのまま残してください
- 「ボリュームを増やして」の場合、各セクションの内容を充実させ、新しいセクションも追加してください
- 「もっと具体的に」の場合、抽象的な表現を具体的な事例・数字・ステップに置き換えてください
- 「セクション追加」の場合、既存の流れに自然に組み込んでください

## トーン・切り口の原則
- 「うまくいかない理由」「失敗する原因」等のネガティブ訴求は禁止
- 「より良い方法」「最短ルート」「プロのやり方」等のポジティブ訴求で書く
- 読者が「自分にもできそう！」とワクワクするトーンにする

## 回答形式（JSON）
JSON以外の文字を含めないでください。
JSON内の文字列で改行が必要な場合は\\nを使うこと。

{
  "title": "特典タイトル",
  "subtitle": "サブタイトル",
  "type": "${content.type}",
  "introduction": "はじめに",
  "sections": [
    {
      "heading": "セクション見出し",
      "content": "セクション本文",
      "type": "text",
      "items": []
    }
  ],
  "closingMessage": "おわりに",
  "callToAction": "CTA"
}`;

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 32768,
      messages: [{ role: 'user', content: prompt }],
    });
    const response = await stream.finalMessage();

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    let jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      jsonStr = jsonStr
        .replace(/,\s*\{[^}]*$/, '')
        .replace(/,\s*"[^"]*$/, '')
        .replace(/,\s*$/, '');
      const openBraces = (jsonStr.match(/\{/g) || []).length - (jsonStr.match(/\}/g) || []).length;
      const openBrackets = (jsonStr.match(/\[/g) || []).length - (jsonStr.match(/\]/g) || []).length;
      jsonStr += ']'.repeat(Math.max(0, openBrackets)) + '}'.repeat(Math.max(0, openBraces));
      parsed = JSON.parse(jsonStr);
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Revise content error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'コンテンツ修正に失敗しました' },
      { status: 500 }
    );
  }
}
