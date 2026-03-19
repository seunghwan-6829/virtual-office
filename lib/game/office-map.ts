import { OfficeSlot, Position } from '../types';

export const CORRIDOR_Y = 755;

export const OFFICES: OfficeSlot[] = [
  // Top row — show Back sprite (facing desk to the north)
  { id: 'T1', seat: { x: 275, y: 385 },  door: { x: 275, y: 615 },  seatDirection: 'down' },
  { id: 'T2', seat: { x: 810, y: 385 },  door: { x: 810, y: 615 },  seatDirection: 'down' },
  { id: 'T3', seat: { x: 1340, y: 385 }, door: { x: 1340, y: 615 }, seatDirection: 'down' },
  { id: 'T4', seat: { x: 1870, y: 385 }, door: { x: 1870, y: 615 }, seatDirection: 'down' },
  // Bottom row — show Front sprite (facing viewer / desk to the south)
  { id: 'B1', seat: { x: 275, y: 1260 },  door: { x: 275, y: 935 },  seatDirection: 'up' },
  { id: 'B2', seat: { x: 810, y: 1260 },  door: { x: 810, y: 935 },  seatDirection: 'up' },
  { id: 'B3', seat: { x: 1340, y: 1260 }, door: { x: 1340, y: 935 }, seatDirection: 'up' },
  { id: 'B4', seat: { x: 1870, y: 1260 }, door: { x: 1870, y: 935 }, seatDirection: 'up' },
  { id: 'B5', seat: { x: 2430, y: 1260 }, door: { x: 2430, y: 935 }, seatDirection: 'up' },
];

export const MANAGER_POSITION: Position = { x: 2500, y: 390 };
export const MANAGER_DIRECTION = 'up' as const;

export function getOffice(id: string): OfficeSlot | undefined {
  return OFFICES.find(o => o.id === id);
}

export function getCEOWaitPosition(waitingIndex: number): Position {
  return {
    x: 2380 - (waitingIndex % 4) * 90,
    y: 695 + Math.floor(waitingIndex / 4) * 55,
  };
}
