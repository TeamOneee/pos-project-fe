/**
 * S-22 · `/transactions/:id`.
 *
 * The same screen as the list. A transaction detail is a drawer over the history
 * on desktop and tablet and a full page on mobile, and both of those are states
 * of S-21 rather than a separate destination — so this route renders the list
 * screen, which reads the id from the route and opens accordingly.
 *
 * Keeping it one component is what makes the URL shareable, the back button
 * correct, and the drawer impossible to reach in a state where the list behind it
 * was never loaded.
 */

export { default } from '@/pages/transactions/index';
