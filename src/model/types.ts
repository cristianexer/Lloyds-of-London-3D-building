import type { SourceId } from '../data/sources';
export type Vec3 = [number, number, number];
export type SystemId =
  | 'structure'
  | 'facade'
  | 'services'
  | 'circulation'
  | 'roof'
  | 'room'
  | 'heritage';
export type GeometryKind =
  | 'box'
  | 'cylinder'
  | 'sphere'
  | 'shell'
  | 'ring'
  | 'bell'
  | 'stair-shell';
export type MaterialKind =
  | 'concrete'
  | 'steel'
  | 'dark'
  | 'glass'
  | 'warm'
  | 'wood'
  | 'brass'
  | 'blue';
export type Stage = 'roof' | 'facade' | 'tower' | 'floor' | 'structure' | 'fixed';
export interface Part {
  id: string;
  name: string;
  system: SystemId;
  assembly: string;
  shape: GeometryKind;
  material: MaterialKind;
  position: Vec3;
  scale: Vec3;
  rotation: Vec3;
  offset: Vec3;
  stage: Stage;
  level: number;
  colour?: string;
}
export interface Assembly {
  id: string;
  name: string;
  system: SystemId;
  description: string;
  significance: string;
  accuracy: 'Approximate' | 'Illustrative';
  sources: SourceId[];
}
export interface System {
  id: SystemId;
  name: string;
  short: string;
  description: string;
}
