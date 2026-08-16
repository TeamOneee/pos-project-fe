/**
 * Forced error scenarios for mock mode.
 *
 * Most failures the UI has to handle can be produced naturally against the
 * dataset — sign in with the wrong password for a 401, reuse an email for a
 * 409, order more units than an outlet holds for a 400. These overrides exist
 * for the ones that are awkward to stage on demand, and so a screen's error
 * state can be opened deliberately while building it.
 *
 *   setMockScenario('timeout');            // every request hangs past the deadline
 *   setMockScenario('forbidden', { once: true });
 *   setMockScenario('server_error', { path: /^\/products/ });
 *   clearMockScenario();
 */

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

/**
 * The scenario that applies to this path, consuming it when it is one-shot.
 */
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
