/**
 * Renders its children only for a session that holds the capability.
 *
 * This is the only place a screen is allowed to make rendering conditional on
 * what a role may do, and it does not know about roles either — it forwards the
 * question to the matrix. Two consequences worth stating:
 *
 *   • The gated markup is *absent* for a session without the capability, never
 *     hidden or disabled. A read-only screen with greyed-out buttons still
 *     ships the buttons, and they are still in the accessibility tree.
 *   • The `fallback` is how a read-only variant says so — the Owner's catalog
 *     caption is the fallback of the Admin's action bar, not a second branch
 *     somewhere else in the tree.
 */

import * as React from 'react';

import { useCan } from '@/hooks/use-can';
import type { Access, Resource } from '@/lib/permissions';

export function IfCan({
  resource,
  access = 'read',
  children,
  fallback = null,
}: {
  resource: Resource;
  access?: Access;
  children: React.ReactNode;
  /** Shown instead, for a session that does not hold the capability. */
  fallback?: React.ReactNode;
}) {
  const allowed = useCan(resource, access);
  return <>{allowed ? children : fallback}</>;
}
