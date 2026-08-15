/** Type surface for the CommonJS token module. See design-tokens.js. */
declare module '@/design-tokens' {
  export type ThemeName = 'light' | 'dark';

  export interface TypePresetStyle {
    fontSize: number;
    lineHeight: number;
    fontWeight: string;
  }

  interface DesignTokens {
    COLOR_TOKENS: Record<string, Record<ThemeName, string>>;
    CHART_PALETTE: string[];
    CHART_SERIES: { revenue: string; transactionCount: string };
    TYPE_SCALE: Record<string, TypePresetStyle>;
    SPACING: Record<string, number>;
    RADIUS: Record<string, number>;
    TOUCH_TARGET: number;
    BREAKPOINTS: { tablet: number; desktop: number };
    hexToRgbChannels(hex: string): string;
  }

  const tokens: DesignTokens;
  export default tokens;
}
