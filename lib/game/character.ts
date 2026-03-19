import { Worker, Position, Direction, MOVE_SPEED } from '../types';

export function updateCharacterMovement(worker: Worker, deltaSec: number): Worker {
  if (worker.path.length === 0 || worker.pathIndex >= worker.path.length) {
    return worker;
  }

  const target = worker.path[worker.pathIndex];
  const dx = target.x - worker.position.x;
  const dy = target.y - worker.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const step = MOVE_SPEED * deltaSec;

  if (dist <= step) {
    const nextIdx = worker.pathIndex + 1;
    const atEnd = nextIdx >= worker.path.length;
    const nextDir = atEnd
      ? worker.direction
      : directionFromDelta(
          worker.path[nextIdx].x - target.x,
          worker.path[nextIdx].y - target.y,
        );

    return {
      ...worker,
      position: { x: target.x, y: target.y },
      pathIndex: nextIdx,
      direction: nextDir,
      animTimer: worker.animTimer + deltaSec,
    };
  }

  return {
    ...worker,
    position: {
      x: worker.position.x + (dx / dist) * step,
      y: worker.position.y + (dy / dist) * step,
    },
    direction: directionFromDelta(dx, dy),
    animTimer: worker.animTimer + deltaSec,
  };
}

export function isPathComplete(worker: Worker): boolean {
  return worker.path.length > 0 && worker.pathIndex >= worker.path.length;
}

function directionFromDelta(dx: number, dy: number): Direction {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}
