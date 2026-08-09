// A hand-rolled value-noise fbm (SKSL has no built-in noise) driving a
// slow-flowing metallic surface: a near-white/silver base with soft moving
// bands and the occasional brighter specular streak. Kept low-contrast and
// light on purpose — this sits behind real UI (logo, inputs), not in front
// of it, so it needs to read as a faint shimmer, not a pattern competing
// for attention.
export const liquidMetalShaderSource = `
uniform float2 resolution;
uniform float time;

float hash(float2 p) {
  float3 p3 = fract(p.xyx * float3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(float2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / resolution;
  // Stretch vertically so the flow reads as long liquid streaks rather
  // than a tight repeating tile.
  float2 p = float2(uv.x * 2.2, uv.y * 3.2);

  float slowTime = time * 0.06;
  float2 drift = float2(slowTime * 0.6, -slowTime);

  float warp = fbm(p * 1.3 + drift);
  float n1 = fbm(p + warp * 1.4 + drift);
  float n2 = fbm(p * 1.8 - drift * 1.3 + 4.2);
  float metal = mix(n1, n2, 0.45);

  // Silver/white palette — stays close to the app's off-white surfaces so
  // the effect reads as a material, not a colored panel.
  half3 base = half3(0.965, 0.968, 0.978);
  half3 shadow = half3(0.85, 0.87, 0.91);
  half3 glint = half3(0.05, 0.20, 0.92); // brand blue, used only as a spark

  half3 color = mix(base, shadow, smoothstep(0.2, 0.85, metal));

  float highlight = pow(max(0.0, 1.0 - abs(metal - 0.72) * 6.0), 4.0);
  color = mix(color, glint, highlight * 0.16);
  color += highlight * 0.10;

  // A slow diagonal sheen sweep — the classic "brushed chrome" tell that
  // pure noise doesn't give you on its own. A soft band travels across the
  // whole surface every ~14s; everything outside it stays untouched.
  float sweepAxis = (uv.x + uv.y * 0.6) - time * 0.045;
  float sweep = pow(max(0.0, 1.0 - abs(fract(sweepAxis) - 0.5) * 5.0), 3.0);
  color += sweep * 0.09;
  color = mix(color, glint, sweep * highlight * 0.4);

  return half4(color, 1.0);
}
`;
