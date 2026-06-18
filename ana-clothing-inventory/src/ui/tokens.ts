// Design Tokens — Premium Maroon + Dirty White aesthetic
// Inspired by luxury fashion brands (Bottega, Gucci, Hermès)
// Warm, inviting, easy on the eyes

export const colors = {
  // Core palette
  bg: "#F7F3EF",           // dirty white — warm, eye-protective background
  surface: "#FFFDF9",       // warm white for cards
  text: "#1C1C1C",          // deep charcoal (not pure black)
  muted: "#6B6661",         // warm gray — readable on dirty white (was #8B8580 — too light)
  border: "#E5E0DA",        // warm light border
  accent: "#8B1A2A",       // rich maroon (primary accent)
  accentLight: "#A52D3D",   // lighter maroon for hover states
  accentDark: "#6B1320",    // darker maroon for active states
  success: "#2D7D46",      // deep forest green
  successLight: "rgba(45,125,70,0.1)",
  error: "#C53030",        // warm crimson
  errorLight: "rgba(197,48,48,0.1)",
  warning: "#B8860B",      // dark goldenrod
  warningLight: "rgba(184,134,11,0.1)",

  // Sidebar (medium maroon bg, all tabs are white pills)
  sidebarBg: "#5C1A2A",             // medium maroon background
  sidebarHover: "#F3F1EE",          // subtle gray-white for hover background
  sidebarHoverText: "#8B1A2A",      // maroon text on hover
  sidebarActive: "#FFFFFF",         // white pill background (all tabs)
  sidebarActiveText: "#8B1A2A",     // maroon text on active tab
  sidebarText: "#6B6661",           // muted text on inactive white tabs
  sidebarBrandBox: "#8B1A2A",       // maroon brand logo box
  sidebarDivider: "rgba(255,255,255,0.15)", // subtle white divider
  sidebarFooterText: "rgba(255,255,255,0.4)", // muted white footer

  // Event type colors (maroon-aligned)
  eventStockIn: "#2D7D46",
  eventSale: "#C53030",
  eventReturn: "#6B5B3E",
  eventAdjustment: "#8B1A2A",
} as const;

export const breakpoints = {
  mobile: 768,
  tablet: 1024,
} as const;

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
} as const;

export const fontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 28,
  hero: 40,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const cardStyle: React.CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xxl,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
};

export const glassTopbar: React.CSSProperties = {
  background: "rgba(247,243,239,0.85)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderBottom: `1px solid ${colors.border}`,
};

// Responsive helpers
export const media = {
  mobile: `@media (max-width: ${breakpoints.mobile}px)`,
  tablet: `@media (min-width: ${breakpoints.mobile + 1}px) and (max-width: ${breakpoints.tablet}px)`,
  desktop: `@media (min-width: ${breakpoints.tablet + 1}px)`,
  tabletDown: `@media (max-width: ${breakpoints.tablet}px)`,
} as const;