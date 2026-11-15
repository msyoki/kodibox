import { MAIN_JOB, OTHER_JOBS } from '@kodibox/demo';

export interface Job {
  id: string;
  title: string;
  property: string;
  details: string;
  tenantPhotos: number;
  /** Index into JOB_STEPS. */
  initialStep: number;
  /** KES cents. */
  initialCost: bigint;
}

/** Every work order the caretaker can open, main job first. */
export const JOBS: readonly Job[] = [
  {
    id: MAIN_JOB.id,
    title: MAIN_JOB.title,
    property: MAIN_JOB.property,
    details: MAIN_JOB.details,
    tenantPhotos: MAIN_JOB.tenantPhotos,
    initialStep: MAIN_JOB.initialStep,
    initialCost: MAIN_JOB.initialCost,
  },
  ...OTHER_JOBS.map((j): Job => ({
    id: j.id,
    title: j.title,
    property: j.where,
    details: `${j.title} at ${j.where}. The manager assigned this work order to you. Add the cost and a receipt photo when it is done.`,
    tenantPhotos: 0,
    initialStep: j.status === 'Assigned' ? 1 : 0,
    initialCost: 0n,
  })),
];

export interface JobState {
  step: number;
  cost: bigint;
}

export const initialJobStates = (): Record<string, JobState> =>
  Object.fromEntries(JOBS.map((j) => [j.id, { step: j.initialStep, cost: j.initialCost }]));
