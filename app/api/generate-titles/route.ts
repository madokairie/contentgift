import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { config, idea } = await req.json();

    const funnelLabel = {
      list: 'リスト獲得用（メアド登録のハードルを超えるタイトル）',
      seminar: 'セミナー参加特典（セミナーへの期待を高めるタイトル）',
      both: 'リスト獲得+セミナー特典',
    }[config.funnelStage as string] || 'リードマグネット';

    const prompt = `あなたはリードマグネットのタイトルコピーライティング専門家です。
以下の特典アイデアに対して、ターゲットが「今すぐ欲しい！」と即登録するタイトルを5パターン生成してください。

## 商品情報
- 商品名: ${config.productName || '未設定'}
- ターゲット: ${config.targetAudience || '未設定'}
- ターゲットの悩み: ${config.targetPain || '未設定'}
- ターゲットの理想: ${config.targetDesire || '未設定'}
- 用途: ${funnelLabel}

## 特典アイデア
- 現在のタイトル: ${idea.title}
- 形式: ${idea.type}
- 概要: ${idea.description}

## タイトル生成の原則
1. **具体的な数字を入れる**（「7つの」「30日で」「3ステップ」）
2. **結果を約束する**（「〜を実現する」「〜が手に入る」）
3. **ターゲットを明示する**（「〜な人のための」「〜初心者でも」）
4. **好奇心を刺激する**（「プロが密かに使う」「9割が知らない」）
5. **即効性を示す**（「今日から使える」「コピペするだけ」）

## 5パターンの方向性
1. 数字×結果型（例: 「7日間で月収100万円を達成する5つのステップ」）
2. ターゲット共感型（例: 「SNS集客に疲れた起業家のための新しい集客術」）
3. 好奇心型（例: 「トップ3%のプロモーターだけが知る提案の型」）
4. 即効ツール型（例: 「コピペで完成！クライアント獲得メールテンプレート10選」）
5. Before/After型（例: 「時給2,000円→月200万円を実現した戦略の全記録」）

## 回答形式（JSON）
JSON以外の文字を含めないでください。

{
  "titles": [
    {
      "title": "タイトル案",
      "pattern": "数字×結果型",
      "hook": "LPやSNSで使えるキャッチコピー1行",
      "whyItWorks": "なぜこのタイトルが効くか（1行）"
    }
  ]
}`;

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
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
    console.error('Generate titles error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'タイトル生成に失敗しました' },
      { status: 500 }
    );
  }
}
