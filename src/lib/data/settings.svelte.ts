// One reader's own preferences on this device (CONTEXT.md — Settings). No
// account, no server: plain localStorage, read once and kept live in memory.
import type { LanguageFilter, Section } from './schema.ts';

export const DEFAULT_DWELL_MS = 4000;
export type DarkMode = 'system' | 'light' | 'dark';

export interface Settings {
	mutedSections: Section[];
	mutedSources: string[];
	dwellMs: number;
	darkMode: DarkMode;
	languageFilter: LanguageFilter;
}

const STORAGE_KEY = 'ssreel:settings';

function loadSettings(): Settings {
	const defaults: Settings = {
		mutedSections: [],
		mutedSources: [],
		dwellMs: DEFAULT_DWELL_MS,
		darkMode: 'system',
		languageFilter: 'mixed'
	};
	if (typeof localStorage === 'undefined') return defaults;
	try {
		return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
	} catch {
		return defaults;
	}
}

export const settings: Settings = $state(loadSettings());

function persist() {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch (err) {
		// Private browsing or a full quota shouldn't crash the app — the change
		// just won't survive a reload.
		console.error('settings: failed to persist:', err);
	}
}

function toggle<T>(list: T[], value: T): T[] {
	return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function toggleMutedSection(section: Section) {
	settings.mutedSections = toggle(settings.mutedSections, section);
	persist();
}

export function toggleMutedSource(source: string) {
	settings.mutedSources = toggle(settings.mutedSources, source);
	persist();
}

export function setDarkMode(mode: DarkMode) {
	settings.darkMode = mode;
	persist();
}

export function setLanguageFilter(languageFilter: LanguageFilter) {
	settings.languageFilter = languageFilter;
	persist();
}

const MIN_DWELL_MS = 1000;
const MAX_DWELL_MS = 60_000;

export function setDwellMs(ms: number) {
	if (!Number.isFinite(ms)) return;
	settings.dwellMs = Math.min(MAX_DWELL_MS, Math.max(MIN_DWELL_MS, ms));
	persist();
}
