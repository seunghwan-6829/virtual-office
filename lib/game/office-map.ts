import { OfficeSlot, Position } from '../types';

export const CORRIDOR_Y = 755;

export const OFFICES: OfficeSlot[] = [
  // Top row — characters face desk (north) → show Back sprite
  { id: 'T1', seat: { x: 275, y: 385 },  door: { x: 275, y: 615 },  seatDirection: 'up' },
  { id: 'T2', seat: { x: 810, y: 385 },  door: { x: 810, y: 615 },  seatDirection: 'up' },
  { id: 'T3', seat: { x: 1340, y: 385 }, door: { x: 1340, y: 615 }, seatDirection: 'up' },
  { id: 'T4', seat: { x: 1870, y: 385 }, door: { x: 1870, y: 615 }, seatDirection: 'up' },
  // Bottom row — characters face viewer (south) → show Front sprite
  { id: 'B1', seat: { x: 275, y: 1260 },  door: { x: 275, y: 935 },  seatDirection: 'down' },
  { id: 'B2', seat: { x: 810, y: 1260 },  door: { x: 810, y: 935 },  seatDirection: 'down' },
  { id: 'B3', seat: { x: 1340, y: 1260 }, door: { x: 1340, y: 935 }, seatDirection: 'down' },
  { id: 'B4', seat: { x: 1870, y: 1260 }, door: { x: 1870, y: 935 }, seatDirection: 'down' },
  { id: 'B5', seat: { x: 2430, y: 1260 }, door: { x: 2430, y: 935 }, seatDirection: 'down' },
];

/* 2층 전용 — 위 3명(Front) + 아래 3명(Back) */
export const FLOOR2_OFFICES: OfficeSlot[] = [
  // Top row — face viewer (south) → show Front sprite
  { id: '2T1', seat: { x: 710, y: 540 },  door: { x: 710, y: 680 },  seatDirection: 'down' },
  { id: '2T2', seat: { x: 1240, y: 540 }, door: { x: 1240, y: 680 }, seatDirection: 'down' },
  { id: '2T3', seat: { x: 1770, y: 540 }, door: { x: 1770, y: 680 }, seatDirection: 'down' },
  // Bottom row — face desk (north) → show Back sprite
  { id: '2B1', seat: { x: 920, y: 1195 },  door: { x: 920, y: 935 },  seatDirection: 'up' },
  { id: '2B2', seat: { x: 1450, y: 1195 }, door: { x: 1450, y: 935 }, seatDirection: 'up' },
  { id: '2B3', seat: { x: 1980, y: 1195 }, door: { x: 1980, y: 935 }, seatDirection: 'up' },
];

/* 3층 전용 — 2층과 동일 배치 (위 3명 Front + 아래 3명 Back) */
export const FLOOR3_OFFICES: OfficeSlot[] = [
  { id: '3T1', seat: { x: 710, y: 540 },  door: { x: 710, y: 680 },  seatDirection: 'down' },
  { id: '3T2', seat: { x: 1240, y: 540 }, door: { x: 1240, y: 680 }, seatDirection: 'down' },
  { id: '3T3', seat: { x: 1770, y: 540 }, door: { x: 1770, y: 680 }, seatDirection: 'down' },
  { id: '3B1', seat: { x: 920, y: 1195 },  door: { x: 920, y: 935 },  seatDirection: 'up' },
  { id: '3B2', seat: { x: 1450, y: 1195 }, door: { x: 1450, y: 935 }, seatDirection: 'up' },
  { id: '3B3', seat: { x: 1980, y: 1195 }, door: { x: 1980, y: 935 }, seatDirection: 'up' },
];

export const MANAGER_POSITION: Position = { x: 2500, y: 390 };
export const MANAGER_DIRECTION = 'down' as const;

export function getOffice(id: string): OfficeSlot | undefined {
  return OFFICES.find(o => o.id === id) || FLOOR2_OFFICES.find(o => o.id === id) || FLOOR3_OFFICES.find(o => o.id === id);
}

export function getCEOWaitPosition(waitingIndex: number): Position {
  return {
    x: 2380 - (waitingIndex % 4) * 90,
    y: 695 + Math.floor(waitingIndex / 4) * 55,
  };
}
