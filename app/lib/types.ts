export type ContentType = 'checklist' | 'guidebook' | 'video-script' | 'worksheet' | 'template' | 'swipe-file';

export interface ContentGiftProject {
  id: string;
  name: string;
  config: ProductConfig;
  ideas: LeadMagnetIdea[] | null;
  selectedIdeaId: string | null;
  contents: GeneratedContent[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductConfig {
  productName: string;
  productDescription: string;
  targetAudience: string;
  targetPain: string;
  targetDesire: string;
  price: string;
  funnelStage: 'list' | 'seminar' | 'both';
  competitorGifts: string;
  desiredAction: string;
  currentAuthority: string;
  contentPreference: ContentType | 'any';
}

export const CONTENT_TYPE_LABELS: Record<ContentType, { label: string; icon: string }> = {
  'checklist': { label: 'チェックリスト', icon: '✅' },
  'guidebook': { label: 'ガイドブック/PDF資料', icon: '📖' },
  'video-script': { label: '動画台本', icon: '🎬' },
  'worksheet': { label: 'ワークシート', icon: '📝' },
  'template': { label: 'テンプレート集', icon: '📋' },
  'swipe-file': { label: 'スワイプファイル', icon: '💎' },
};

export const FUNNEL_STAGE_LABELS: Record<string, string> = {
  'list': 'リスト獲得用（リードマグネット）',
  'seminar': 'セミナー参加特典',
  'both': '両方（リスト獲得 + セミナー特典）',
};

export interface LeadMagnetIdea {
  id: string;
  title: string;
  type: ContentType;
  description: string;
  whyItWorks: string;
  bridgeStrategy: string;
  hook: string;
  scores: IdeaScores;
  outline: string[];
}

export interface IdeaScores {
  listPower: number;
  wowFactor: number;
  bridgeScore: number;
  actionability: number;
  seminarBoost: number;
  productionEase: number;
  total: number;
}

export const SCORE_LABELS: Record<keyof Omit<IdeaScores, 'total'>, string> = {
  listPower: 'リスト獲得力',
  wowFactor: '感動指数',
  bridgeScore: '有料商品への架け橋',
  actionability: '即実践度',
  seminarBoost: 'セミナー参加率UP',
  productionEase: '制作しやすさ',
};

export interface GeneratedContent {
  id: string;
  ideaId: string;
  title: string;
  subtitle: string;
  type: ContentType;
  introduction: string;
  sections: ContentSection[];
  closingMessage: string;
  callToAction: string;
  generatedAt: string;
  qualityScore: QualityScore | null;
}

export interface ContentSection {
  heading: string;
  content: string;
  type: 'text' | 'checklist' | 'script' | 'worksheet' | 'tips' | 'example' | 'action';
  items?: string[];
}

export interface QualityScore {
  quantitative: {
    wordCount: number;
    sectionCount: number;
    actionableItems: number;
    specificExamples: number;
    dataPoints: number;
    totalScore: number;
  };
  qualitative: {
    clarity: number;
    actionability: number;
    uniqueness: number;
    emotionalImpact: number;
    perceivedValue: number;
    bridgeEffectiveness: number;
    totalScore: number;
  };
  overall: number;
  verdict: 'excellent' | 'good' | 'needs-improvement';
  strengths: string[];
  improvements: Improvement[];
  rewriteSuggestions: RewriteSuggestion[];
}

export interface Improvement {
  area: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

export interface RewriteSuggestion {
  original: string;
  improved: string;
  reason: string;
}
