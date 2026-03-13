import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { config, content } = await req.json();

    const allText = [
      content.introduction,
      ...content.sections.map((s: { heading: string; content: string; items?: string[] }) =>
        `${s.heading}\n${s.content}${s.items ? '\n' + s.items.join('\n') : ''}`
      ),
      content.closingMessage,
      content.callToAction,
    ].join('\n');

    const prompt = `あなたはリードマグネット・特典コンテンツの品質審査官です。
以下の特典コンテンツを定量的・定性的の両面から厳密に評価してください。

## 商品情報
- 商品名: ${config.productName || '未設定'}
- ターゲット: ${config.targetAudience || '未設定'}
- ターゲットの悩み: ${config.targetPain || '未設定'}

## 評価対象コンテンツ
タイトル: ${content.title}
形式: ${content.type}

---
${allText}
---

## 評価基準

### 定量的評価（客観的にカウント）
1. **文字数**: 全体の文字数をカウント（目標: 3,000〜6,000文字）
2. **セクション数**: セクションの数（目標: 5〜10）
3. **アクションアイテム数**: 読者が実行できる具体的な行動の数（目標: 10以上）
4. **具体例の数**: 事例・Before/After・具体的な数字（目標: 5以上）
5. **データポイント数**: 統計・調査結果・数値根拠（目標: 2以上）

各項目を0-100点で評価し、totalScoreは5項目の平均（四捨五入）

### 定性的評価（1-10点で評価）
1. **clarity（明瞭さ）**: 専門用語を避け、ターゲットが一読で理解できるか
2. **actionability（即実践性）**: 読んだ直後に行動できる具体性があるか
3. **uniqueness（独自性）**: 「ググれば出てくる」レベルを超えているか
4. **emotionalImpact（感情インパクト）**: 「自分にもできそう」と希望を感じるか
5. **perceivedValue（知覚価値）**: 「有料でも5,000円の価値がある」と思えるか
6. **bridgeEffectiveness（架け橋効果）**: 読了後に有料商品への興味が高まるか

各項目を1-10点で評価し、totalScoreは6項目の平均×10（四捨五入）

### 総合評価
overallは定量totalScoreと定性totalScoreの平均（四捨五入）

## 回答形式（JSON）
JSON以外の文字を含めないでください。
JSON内の文字列で改行が必要な場合は\\nを使うこと。

{
  "quantitative": {
    "wordCount": 4500,
    "sectionCount": 7,
    "actionableItems": 12,
    "specificExamples": 6,
    "dataPoints": 3,
    "totalScore": 85
  },
  "qualitative": {
    "clarity": 8,
    "actionability": 9,
    "uniqueness": 7,
    "emotionalImpact": 8,
    "perceivedValue": 8,
    "bridgeEffectiveness": 7,
    "totalScore": 78
  },
  "overall": 82,
  "verdict": "good",
  "strengths": [
    "強みの具体的な説明（3〜5個）"
  ],
  "improvements": [
    {
      "area": "改善が必要な領域",
      "suggestion": "具体的な改善提案（どう書き換えるか）",
      "priority": "high"
    }
  ],
  "rewriteSuggestions": [
    {
      "original": "現在の文章（そのまま引用）",
      "improved": "改善後の文章",
      "reason": "なぜこの書き換えが効果的か"
    }
  ]
}

## verdictの基準
- "excellent": overall 85以上
- "good": overall 65〜84
- "needs-improvement": overall 64以下

## 厳しく正直に評価すること
- お世辞やインフレは不要。リアルに使えるかどうかで判断
- 「もう少し具体的に」等の曖昧なフィードバックは禁止。「〇〇のセクションの『△△』を『□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□』に書き換える」のように具体的に
- rewriteSuggestionsは最低3つ提示すること`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

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
    console.error('Quality analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '品質分析に失敗しました' },
      { status: 500 }
    );
  }
}
