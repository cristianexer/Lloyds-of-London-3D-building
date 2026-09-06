import { create } from 'zustand';
import type { Part, SystemId } from './model/types';
export type Mode = 'exterior' | 'section' | 'floors' | 'market';
export type View = 'hero' | 'lime' | 'rear' | 'roof' | 'atrium' | 'room' | 'frame';
export interface ExplorerState {
  marketStep: number;
  setMarketStep: (n: number) => void;
  mode: Mode;
  explosion: number;
  section: number;
  floor: number;
  facade: number;
  selected: string | null;
  hovered: string | null;
  isolated: string | null;
  hidden: string[];
  autoRotate: boolean;
  reducedMotion: boolean;
  view: View;
  viewNonce: number;
  hierarchyOpen: boolean;
  infoOpen: boolean;
  tour: number | null;
  catalogueOnly: boolean;
  setMode: (mode: Mode) => void;
  setExplosion: (n: number) => void;
  setSection: (n: number) => void;
  setFloor: (n: number) => void;
  setFacade: (n: number) => void;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  isolate: () => void;
  hide: () => void;
  related: (system: SystemId) => void;
  restore: () => void;
  reset: () => void;
  camera: (view: View) => void;
  setRotate: (n: boolean) => void;
  setReducedMotion: (n: boolean) => void;
  toggleHierarchy: () => void;
  closeInfo: () => void;
  tourStep: (n: number | null) => void;
  setCatalogue: (n: boolean) => void;
}
const initial = {
  marketStep: 0,
  mode: 'exterior' as Mode,
  explosion: 0,
  section: 0,
  floor: 3,
  facade: 0.62,
  selected: null,
  hovered: null,
  isolated: null,
  hidden: [],
  autoRotate: false,
  view: 'hero' as View,
  viewNonce: 0,
  tour: null,
  infoOpen: false,
};
export const useExplorer = create<ExplorerState>((set, get) => ({
  ...initial,
  reducedMotion: false,
  hierarchyOpen: typeof window !== 'undefined' && window.innerWidth > 900,
  catalogueOnly: false,
  setMode: (mode) =>
    set((s) => ({
      mode,
      explosion: 0,
      isolated: null,
      hidden: [],
      selected: null,
      infoOpen: false,
      section: 0.55,
      tour: null,
      autoRotate: false,
      view:
        mode === 'market'
          ? 'room'
          : mode === 'floors'
            ? 'roof'
            : mode === 'section'
              ? 'lime'
              : 'hero',
      viewNonce: s.viewNonce + 1,
    })),
  setExplosion: (explosion) => {
    if (get().mode === 'exterior')
      set({
        explosion: Number.isFinite(explosion) ? Math.min(1, Math.max(0, explosion)) : 0,
        autoRotate: false,
        tour: null,
      });
  },
  setSection: (section) => set({ section: Math.min(1, Math.max(0, section)) }),
  setFloor: (floor) =>
    set((s) => ({
      floor: Math.max(0, Math.min(11, Math.round(floor))),
      view: 'roof',
      viewNonce: s.viewNonce + 1,
    })),
  setFacade: (facade) => set({ facade: Math.min(1, Math.max(0.05, facade)) }),
  select: (selected) => set({ selected, infoOpen: !!selected, hovered: null, autoRotate: false }),
  hover: (hovered) => set({ hovered }),
  isolate: () => set((s) => ({ isolated: s.selected, autoRotate: false })),
  hide: () =>
    set((s) => ({
      hidden: s.selected ? [...new Set([...s.hidden, s.selected])] : s.hidden,
      selected: null,
      infoOpen: false,
    })),
  related: (system) => set({ isolated: system, autoRotate: false }),
  restore: () => set({ isolated: null, hidden: [], selected: null, infoOpen: false }),
  reset: () => set((s) => ({ ...initial, viewNonce: s.viewNonce + 1 })),
  camera: (view) => set((s) => ({ view, viewNonce: s.viewNonce + 1, autoRotate: false })),
  setRotate: (autoRotate) => set({ autoRotate: autoRotate && !get().reducedMotion }),
  setReducedMotion: (reducedMotion) =>
    set({ reducedMotion, ...(reducedMotion ? { autoRotate: false } : {}) }),
  toggleHierarchy: () => set((s) => ({ hierarchyOpen: !s.hierarchyOpen })),
  closeInfo: () => set({ infoOpen: false }),
  tourStep: (tour) => {
    const views: View[] = ['hero', 'lime', 'hero', 'roof', 'room', 'hero'];
    const ex = [0, 0.65, 0.9, 0.22, 0, 0];
    set((s) => ({
      tour,
      mode: tour === 4 ? 'section' : 'exterior',
      explosion: tour === null ? 0 : ex[tour],
      section: tour === 4 ? 0 : 0.55,
      selected: null,
      infoOpen: false,
      isolated: null,
      hidden: [],
      autoRotate: false,
      view: tour === null ? 'hero' : views[tour],
      viewNonce: s.viewNonce + 1,
    }));
  },
  setCatalogue: (catalogueOnly) => set({ catalogueOnly, hierarchyOpen: true }),
  setMarketStep: (marketStep) => set({ marketStep: Math.max(0, Math.min(2, marketStep)) }),
}));
export function matches(part: Part, id: string | null) {
  return !!id && (part.id === id || part.assembly === id || part.system === id);
}
export function isVisible(
  part: Part,
  s: Pick<ExplorerState, 'isolated' | 'hidden' | 'mode' | 'floor'>,
) {
  if (s.isolated && !matches(part, s.isolated)) return false;
  if (s.hidden.some((id) => matches(part, id))) return false;
  if (s.mode === 'floors' && part.level > s.floor) return false;
  if (s.mode === 'market' && (part.level > 0 || part.system === 'facade' || part.system === 'roof'))
    return false;
  return true;
}
