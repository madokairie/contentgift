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
${config.targetKnowledgeLevel ? `- ターゲットの知識レベル: ${{beginner:'初心者（基礎から知りたい）',intermediate:'中級者（ある程度知っている）',advanced:'上級者（専門知識あり）'}[config.targetKnowledgeLevel as string]}` : ''}
${config.targetUrgency ? `- ターゲットの緊急度: ${{low:'情報収集中（まだ検討段階）',medium:'検討中（近々行動したい）',high:'今すぐ欲しい（急いでいる）'}[config.targetUrgency as string]}` : ''}
- 価格帯: ${config.price || '未設定'}
- 用途: ${funnelLabel}
${config.conversionGoal ? `- 達成したい目標: ${config.conversionGoal}` : ''}
- 競合の特典: ${config.competitorGifts || '特になし'}
- 特典後のアクション: ${config.desiredAction || '未設定'}
- 発信者の権威性: ${config.currentAuthority || '未設定'}
${config.contentPreference !== 'any' ? `- 希望形式: ${config.contentPreference}` : '- 希望形式: 指定なし（最適な形式を提案）'}
${config.conceptDesign ? `\n## コンセプト設計（他ツールで設計済み）\n${config.conceptDesign}` : ''}
${config.funnelDesign ? `\n## ファネル設計（他ツールで設計済み）\n${config.funnelDesign}` : ''}
${config.seminarContent ? `\n## セミナー内容（他ツールで設計済み）\n${config.seminarContent}` : ''}

## ファネルステージ別の設計原則
${config.funnelStage === 'list' ? `### リスト獲得用の設計原則
- タイトルは「今すぐダウンロードしたい」と思わせる即効性のあるもの
- メアド登録の心理的ハードルを超える「これが無料？」感を最大化
- 特典単体で価値が完結する（登録して損した感ゼロ）
- 受け取った直後に「この人のメルマガ読みたい」と思わせる権威性を織り込む` :
config.funnelStage === 'seminar' ? `### セミナー着席率UP用の設計原則
- 特典の中にセミナーの「予告・伏線」を自然に入れる（「この続きはセミナーで詳しくお話しします」）
- 特典で得た成果をセミナーで更に加速できると思わせる設計
- セミナーの日時・内容が気になって仕方ない状態を作る
- 「特典だけで満足」にならないよう、次のステップへの好奇心を残す` :
`### リスト獲得+セミナー着席率の両方を狙う設計原則
- 特典で「この人すごい」→メルマガ登録。メルマガで「セミナーも気になる」→着席
- 特典の中にセミナーへの伏線を2〜3箇所、自然に配置
- 特典→メルマガ→セミナーの3ステップが途切れない導線設計`}

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
- totalスコアは6項目の平均×10で算出（四捨五入）。正直に評価すること

## 絶対に避ける特典の切り口（禁止）
以下の切り口は受け手に刺さらないため、絶対に採用しないこと:
- 「うまくいかない理由」「失敗する原因」「〇〇できない理由」系 → 人は理由より「より良い方法」を知りたい
- 「〇〇の落とし穴」「〇〇の罠」等のネガティブ訴求 → 不安を煽るより希望を見せる
- 「〇〇診断」で問題を突きつけるだけのもの → 診断するなら必ず「解決の道筋」をセットにする

## 代わりに採用すべき切り口（推奨）
- 「より良い方法」「最短ルート」「プロが実際にやっている方法」
- 「すぐ使えるテンプレート」「コピペで完成する〇〇」
- 「〇日で〇〇を達成するステップ」「初心者でもできる〇〇の始め方」
- 「成功している人が共通してやっている〇〇」
- 受け取った人が「これを使えば自分もできそう！」とワクワクするもの`;

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
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
    console.error('Generate ideas error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'アイデア生成に失敗しました' },
      { status: 500 }
    );
  }
}
