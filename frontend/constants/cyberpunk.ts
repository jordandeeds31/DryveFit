// Shared palette for the Cardio feature's cyberpunk visual treatment —
// scoped to this feature only, not the app's main light theme (colors.ts).
export const cyberpunk = {
  bgDeep: "#05010f",
  bgSurface: "#0f0824",
  bgSurfaceAlt: "#170f33",
  neonCyan: "#00f6ff",
  neonMagenta: "#ff2bd6",
  neonYellow: "#e8ff29",
  textPrimary: "#eafcff",
  textMuted: "#8b7fb8",
  borderGlow: "#3a2166",
};

// A soft, colored glow behind text/icons — RN has no true blur/glow filter,
// so a wide, low-opacity colored shadow at zero offset approximates one.
export const neonGlow = (color: string, radius = 8) => ({
  textShadowColor: color,
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: radius,
});

export const neonShadow = (color: string, radius = 10, opacity = 0.9) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation: 8,
});
