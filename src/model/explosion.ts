import type { Part, Stage, Vec3 } from './types';
export const stages: Record<Stage, [number, number]> = {
  roof: [0, 0.23],
  facade: [0.12, 0.48],
  tower: [0.28, 0.72],
  floor: [0.52, 1],
  structure: [0.62, 1],
  fixed: [0, 1],
};
export function stageProgress(stage: Stage, value: number) {
  const [start, end] = stages[stage];
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}
export function positionAt(part: Part, value: number): Vec3 {
  const t = stageProgress(part.stage, value);
  return [
    part.position[0] + part.offset[0] * t,
    part.position[1] + part.offset[1] * t,
    part.position[2] + part.offset[2] * t,
  ];
}
