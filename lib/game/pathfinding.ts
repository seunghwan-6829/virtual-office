import { Position } from '../types';
import { CORRIDOR_Y, getOffice, getCEOWaitPosition } from './office-map';

export function buildPathToWait(officeId: string, waitIndex: number): Position[] {
  const office = getOffice(officeId);
  if (!office) return [];
  const waitPos = getCEOWaitPosition(waitIndex);
  return [
    office.door,
    { x: office.door.x, y: CORRIDOR_Y },
    { x: waitPos.x, y: CORRIDOR_Y },
    waitPos,
  ];
}

export function buildPathToSeat(currentPos: Position, officeId: string): Position[] {
  const office = getOffice(officeId);
  if (!office) return [];
  return [
    { x: currentPos.x, y: CORRIDOR_Y },
    { x: office.door.x, y: CORRIDOR_Y },
    office.door,
    office.seat,
  ];
}
