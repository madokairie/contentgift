import { ContentGiftProject, ProductConfig } from './types';

const STORAGE_KEY = 'content-gift-projects';

function getProjects(): ContentGiftProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveProjects(projects: ContentGiftProject[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function listProjects(): ContentGiftProject[] {
  return getProjects().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getProject(id: string): ContentGiftProject | null {
  return getProjects().find(p => p.id === id) || null;
}

const defaultConfig: ProductConfig = {
  productName: '',
  productDescription: '',
  targetAudience: '',
  targetPain: '',
  targetDesire: '',
  targetKnowledgeLevel: '',
  targetUrgency: '',
  price: '',
  funnelStage: 'list',
  conversionGoal: '',
  competitorGifts: '',
  desiredAction: '',
  currentAuthority: '',
  contentPreference: 'any',
  brandColorPrimary: '#1B2A4A',
  brandColorAccent: '#C8963E',
  conceptDesign: '',
  funnelDesign: '',
  seminarContent: '',
};

export function createProject(name: string): ContentGiftProject {
  const project: ContentGiftProject = {
    id: crypto.randomUUID(),
    name,
    config: { ...defaultConfig },
    ideas: null,
    selectedIdeaId: null,
    contents: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const projects = getProjects();
  projects.push(project);
  saveProjects(projects);
  return project;
}

export function updateProject(id: string, updates: Partial<ContentGiftProject>): ContentGiftProject | null {
  const projects = getProjects();
  const idx = projects.findIndex(p => p.id === id);
  if (idx < 0) return null;
  projects[idx] = { ...projects[idx], ...updates, updatedAt: new Date().toISOString() };
  saveProjects(projects);
  return projects[idx];
}

export function deleteProject(id: string) {
  const projects = getProjects().filter(p => p.id !== id);
  saveProjects(projects);
}

export function exportAllData(): string {
  const projects = getProjects();
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), projects }, null, 2);
}

export function importAllData(jsonString: string): { added: number; updated: number } {
  const data = JSON.parse(jsonString);
  const imported: ContentGiftProject[] = data.projects || data;
  if (!Array.isArray(imported)) throw new Error('無効なデータ形式です');
  const existing = getProjects();
  let added = 0, updated = 0;
  for (const project of imported) {
    if (!project.id || !project.name) continue;
    const idx = existing.findIndex(p => p.id === project.id);
    if (idx >= 0) { existing[idx] = { ...existing[idx], ...project }; updated++; }
    else { existing.push(project); added++; }
  }
  saveProjects(existing);
  return { added, updated };
}
