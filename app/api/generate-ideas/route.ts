import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { config } = await req.json();

    const funnelLabel = {
      list: 'リスト獲得用リードマグネット',
      seminar: 'セミナー参加特典',
      both: 'リスト獲得用リードマグネット＆セミナー参加特典',
    }[config.funnelStage as string] || 'リードマグネット';

    const prompt = `あなたはリードマグネット・特典コンテンツの専門家です。
以下の商品・サービス情報をもとに、見込み客が「これが無料？！」と感動し、リスト登録やセミナー参加を即決する特典コンテンツのアイデアを6つ提案してください。

## 商品情報
- 商品名: ${config.productName || '未設定'}
- 商品概要: ${config.productDescription || '未設定'}
- ターゲット: ${config.targetAudience || '未設定'}
- ターゲットの悩み: ${config.targetPain || '未設定'}
- ターゲットの理想: ${config.targetDesire || '未設定'}
- 価格帯: ${config.price || '未設定'}
- 用途: ${funnelLabel}
- 競合の特典: ${config.competitorGifts || '特になし'}
- 特典後のアクション: ${config.desiredAction || '未設定'}
- 発信者の権威性: ${config.currentAuthority || '未設定'}
${config.contentPreference !== 'any' ? `- 希望形式: ${config.contentPreference}` : '- 希望形式: 指定なし（最適な形式を提案）'}

## 特典コンテンツの6つの要件（すべて満たすこと）
1. **リスト獲得力**: 「今すぐ欲しい」と思わせるタイトルとフック
2. **感動指数**: 「無料でこのレベル？」と思わせる価値提供。有料級だが有料講座の完全版ではない
3. **即実践度**: 受け取ってすぐ使える・試せる具体性
4. **架け橋度**: 特典で一部を体験→「もっと深く学びたい」→有料商品への自然な導線
5. **セミナー参加率UP**: 特典の内容がセミナーへの期待を高める設計
6. **制作しやすさ**: プロモーターやコンサルが実際に作れる現実的な内容

## コンテンツタイプ
以下から最適なものを選択:
- checklist: チェックリスト（診断系、やることリスト系）
- guidebook: ガイドブック/PDF資料（ノウハウ、ステップバイステップ）
- video-script: 動画台本（セミナー、解説動画）
- worksheet: ワークシート（書き込み式、自己分析系）
- template: テンプレート集（そのまま使えるひな形）
- swipe-file: スワイプファイル（成功事例集、コピペ素材）

## 回答形式（JSON）
以下のJSON形式で6つのアイデアを返してください。JSON以外の文字を含めないでください。
JSON内の文字列で改行が必要な場合は\\nを使うこと。

{
  "ideas": [
    {
      "id": "idea-1",
      "title": "特典タイトル（見込み客が惹かれるコピー）",
      "type": "checklist",
      "description": "特典の概要（3行程度）",
      "whyItWorks": "なぜこの特典が効くのか（心理的な理由）",
      "bridgeStrategy": "この特典から有料商品にどうつながるか",
      "hook": "LPやSNSで使えるキャッチコピー（1行）",
      "scores": {
        "listPower": 9,
        "wowFactor": 8,
        "bridgeScore": 9,
        "actionability": 10,
        "seminarBoost": 7,
        "productionEase": 8,
        "total": 85
      },
      "outline": [
        "セクション1: ...",
        "セクション2: ...",
        "セクション3: ..."
      ]
    }
  ]
}

## 重要な設計原則
- 「無料だから手抜き」は絶対NG。有料で5,000〜10,000円で売れるレベルの品質
- ただし有料商品の「全部」は出さない。一部を深く出す（=もっと知りたいと思わせる）
- タイトルは具体的な数字や結果を含む（例:「30日で〇〇する7つのステップ」）
- 「知識」より「ツール」として使える特典の方がリスト獲得力が高い
- 競合と被らない切り口を意識する
- totalスコアは6項目の平均×10で算出（四捨五入）。正直に評価すること`;

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
    console.error('Generate ideas error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'アイデア生成に失敗しました' },
      { status: 500 }
    );
  }
}
