import { OfficeSlot, Position } from '../types';

export const CORRIDOR_Y = 755;

export const OFFICES: OfficeSlot[] = [
  // Top row — characters face UP (back toward viewer, looking at their desk)
  { id: 'T1', seat: { x: 275, y: 385 },  door: { x: 275, y: 615 },  seatDirection: 'up' },
  { id: 'T2', seat: { x: 810, y: 385 },  door: { x: 810, y: 615 },  seatDirection: 'up' },
  { id: 'T3', seat: { x: 1340, y: 385 }, door: { x: 1340, y: 615 }, seatDirection: 'up' },
  { id: 'T4', seat: { x: 1870, y: 385 }, door: { x: 1870, y: 615 }, seatDirection: 'up' },
  // Bottom row — characters face DOWN (front toward viewer, looking at desk)
  { id: 'B1', seat: { x: 275, y: 1260 },  door: { x: 275, y: 935 },  seatDirection: 'down' },
  { id: 'B2', seat: { x: 810, y: 1260 },  door: { x: 810, y: 935 },  seatDirection: 'down' },
  { id: 'B3', seat: { x: 1340, y: 1260 }, door: { x: 1340, y: 935 }, seatDirection: 'down' },
  { id: 'B4', seat: { x: 1870, y: 1260 }, door: { x: 1870, y: 935 }, seatDirection: 'down' },
  { id: 'B5', seat: { x: 2430, y: 1260 }, door: { x: 2430, y: 935 }, seatDirection: 'down' },
];

export const MANAGER_POSITION: Position = { x: 2520, y: 730 };

export function getOffice(id: string): OfficeSlot | undefined {
  return OFFICES.find(o => o.id === id);
}

export function getCEOWaitPosition(waitingIndex: number): Position {
  return {
    x: 2380 - (waitingIndex % 4) * 90,
    y: 695 + Math.floor(waitingIndex / 4) * 55,
  };
}
