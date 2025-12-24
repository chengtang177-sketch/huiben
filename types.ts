
export interface StoryFrame {
  id: string;
  storyText: string;
  sceneDescription: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
}

export interface BookData {
  title: string;
  theme: string;
  wordCount: number;
  visualAnchor: string;
  stylePrompt: string;
  introduction: string;
}

export interface GeneratedScript {
  title: string;
  introduction: string;
  coverPrompt: string;
  characterDesign: string;
  coverUrl?: string;
  frames: StoryFrame[];
}

export type TabType = 'script' | 'cover' | 'storyboard' | 'ppt';
