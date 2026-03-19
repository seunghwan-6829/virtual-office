import { LLMProvider } from './types';

export interface LLMOption {
  provider: LLMProvider;
  model: string;
  label: string;
}

export const LLM_OPTIONS: LLMOption[] = [
  { provider: 'anthropic', model: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
  { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
];

export const PROVIDER_LABELS: Record<LLMProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
};

export const PROVIDER_COLORS: Record<LLMProvider, string> = {
  openai: '#10a37f',
  anthropic: '#d4a27f',
  google: '#4285f4',
};
