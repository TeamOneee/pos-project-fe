/** Forced error scenarios for mock mode. */

export type MockScenario =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'duplicate_email'
  | 'insufficient_stock'
  | 'price_changed'
  | 'server_error'
  | 'timeout';

type ScenarioOptions = {
  /** Restrict the scenario to matching paths. Applies to every path if omitted. */
  path?: string | RegExp;
  /** Fire once, then clear itself. */
  once?: boolean;
};

type ActiveScenario = ScenarioOptions & { scenario: MockScenario };

let active: ActiveScenario | null = null;

export function setMockScenario(scenario: MockScenario, options: ScenarioOptions = {}): void {
  active = { scenario, ...options };
}

export function clearMockScenario(): void {
  active = null;
}

export function currentMockScenario(): MockScenario | null {
  return active?.scenario ?? null;
}

/** The scenario that applies to this path, consuming it when it is one-shot. */
export function takeScenarioFor(path: string): MockScenario | null {
  if (!active) return null;

  if (active.path !== undefined) {
    const matches =
      typeof active.path === 'string' ? path.startsWith(active.path) : active.path.test(path);
    if (!matches) return null;
  }

  const { scenario, once } = active;
  if (once) active = null;
  return scenario;
}
