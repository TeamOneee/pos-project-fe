import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
window.scrollTo = vi.fn();
Element.prototype.scrollTo = vi.fn();
HTMLElement.prototype.scrollTo = vi.fn();
