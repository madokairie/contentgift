import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { config, idea } = await req.json();

    const typeInstructions: Record<string, string> = {
      'checklist': `## チェックリスト形式の指示
- 各セクションにtypeを"checklist"で設定し、itemsに具体的なチェック項目を入れる
- 各項目は「〜する」「〜を確認する」等のアクション形式
- 項目数は全体で30〜50個（少なすぎると薄い、多すぎると圧倒される）
- セクション冒頭にそのセクションの意図を2-3行で説明（type: "text"のセクション）
- 最後に「チェック結果の読み方」セクションを追加`,

      'guidebook': `## ガイドブック形式の指示
- 各セクションは500〜800文字の充実した内容
- 具体的な事例・数字・Before/Afterを必ず含む
- 「ステップ1→2→3」のように順番に実行できる構成
- 重要ポイントは「■ ポイント」で強調
- 各セクション末尾に「✅ このセクションのアクション」を追加`,

      'video-script': `## 動画台本形式の指示
- 各セクションのtype を"script"で設定
- 台本は「話し言葉」で書く。読み上げてそのまま使えるレベル
- （間を置く）（画面に表示）（強調して）等の演出指示を含む
- 動画の長さは15〜25分想定
- オープニング（つかみ30秒）→ 本編 → まとめ → CTA の構成
- セクション冒頭に【画面表示テキスト】を記載
- 視聴者への問いかけを各セクションに1つ以上入れる`,

      'worksheet': `## ワークシート形式の指示
- 各セクションのtypeを"worksheet"で設定
- 「質問→書き込みスペースの説明→記入例」のセット
- 質問は具体的で答えやすいものから始め、徐々に深い問いへ
- 記入例は「例: 〇〇」の形式で必ず入れる
- 全体で20〜30の質問・記入項目
- 最後に「ワーク完了後の次のステップ」セクションを追加`,

      'template': `## テンプレート集形式の指示
- そのままコピーして使える「型」を提供
- 各テンプレートに「使い方の説明」「カスタマイズのポイント」「使用例」を含む
- 5〜10個のテンプレートを収録
- 「このまま使える度」が高いこと（穴埋めでOK）`,

      'swipe-file': `## スワイプファイル形式の指示
- 成功事例やそのまま使える素材を集めた形式
- 各事例に「なぜうまくいったか」の解説を付ける
- カテゴリ分けして探しやすくする
- 10〜15個の事例・素材を収録`,
    };

    const prompt = `あなたはリードマグネット・特典コンテンツの制作専門家です。
以下のアイデアをもとに、見込み客が「これが無料？！」と感動する高品質な特典コンテンツの本文を生成してください。

## 商品情報
- 商品名: ${config.productName || '未設定'}
- 商品概要: ${config.productDescription || '未設定'}
- ターゲット: ${config.targetAudience || '未設定'}
- ターゲットの悩み: ${config.targetPain || '未設定'}
- ターゲットの理想: ${config.targetDesire || '未設定'}
- 発信者の権威性: ${config.currentAuthority || '未設定'}

## 選択されたアイデア
- タイトル: ${idea.title}
- 形式: ${idea.type}
- 概要: ${idea.description}
- 架け橋戦略: ${idea.bridgeStrategy}
- アウトライン: ${idea.outline.join(' / ')}

${typeInstructions[idea.type] || typeInstructions['guidebook']}

## 品質基準（すべて満たすこと）
### 定量的基準
- 全体で3,000〜6,000文字（動画台本は5,000〜8,000文字）
- セクション数: 5〜10セクション
- 具体的なアクションアイテム: 10個以上
- 具体例・数字・事例: 5個以上
- データや統計の引用: 2個以上（一般的に知られている事実でOK）

### 定性的基準
- 明瞭さ: 専門用語を避け、ターゲットが一読で理解できる
- 即実践性: 読んだ直後に行動できる具体性
- 独自性: 「ググれば出てくる」レベルではない、プロならではの視点
- 感情インパクト: 「自分にもできそう」と希望を感じさせる
- 知覚価値: 「有料でも5,000円の価値がある」と思わせる充実度
- 架け橋効果: 読了後に「もっと学びたい」と有料商品への興味が高まる

## 回答形式（JSON）
以下のJSON形式で返してください。JSON以外の文字を含めないでください。
JSON内の文字列で改行が必要な場合は\\nを使うこと。

{
  "title": "特典タイトル",
  "subtitle": "サブタイトル（ターゲットへのメッセージ）",
  "type": "${idea.type}",
  "introduction": "はじめに（300〜500文字。読者への語りかけ、この特典で得られること）",
  "sections": [
    {
      "heading": "セクション見出し",
      "content": "セクション本文（300〜800文字）",
      "type": "text",
      "items": []
    }
  ],
  "closingMessage": "おわりに（200〜300文字。感謝と次のステップへの期待）",
  "callToAction": "有料商品・セミナーへの自然な導線メッセージ（100〜200文字）"
}

## 絶対に守ること
- 有料商品の内容をすべて出し切らない。「一部を深く」出す
- 押し売り感を出さない。CTAは最後に1回だけ、自然な流れで
- 抽象論ではなく具体的なノウハウ・ツールを提供する
- 読者が「この人すごい」と権威性を感じる内容にする`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
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
    console.error('Generate content error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'コンテンツ生成に失敗しました' },
      { status: 500 }
    );
  }
}
