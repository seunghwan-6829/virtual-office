import { LLMProvider } from './types';

export interface LLMOption {
  provider: LLMProvider;
  model: string;
  label: string;
}

export const LLM_OPTIONS: LLMOption[] = [
  { provider: 'openai', model: 'gpt-4o', label: 'OpenAI GPT-4o' },
  { provider: 'openai', model: 'gpt-4o-mini', label: 'OpenAI GPT-4o Mini' },
  { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  { provider: 'anthropic', model: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  { provider: 'google', model: 'gemini-pro', label: 'Google Gemini Pro' },
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
