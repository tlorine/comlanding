export type OrbitId = 'inner' | 'outer';
export type NodeId = 'ai' | 'api' | 'db' | 'int';

/** Любое тело, летающее по орбите */
export type Body = {
  orbit: OrbitId;
  startAngle: number; // градусы
};

export type SystemNode = Body & {
  id: NodeId;
  label: string;
  description: string;
};

export type Particle = Body & {
  id: string;
};

/** Результат проекции тела на плоскость сцены */
export type Projected = {
  x: number;
  y: number;
  /** 0 = дальняя точка орбиты, 1 = ближняя к зрителю */
  depth: number;
};