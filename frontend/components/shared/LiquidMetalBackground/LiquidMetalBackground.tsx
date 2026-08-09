import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { liquidMetalShaderSource } from "./liquidMetalShader";

// Drives the shader's `time` uniform off a plain rAF loop rather than a
// Reanimated shared value — this project has no babel plugin registered
// for Skia's Reanimated integration (see babel.config), so a shared value
// passed straight into `uniforms` would just be read once and never
// update. A screen-local rAF loop is the simplest thing that stays
// reactive without that setup, and a single full-screen shader is cheap
// enough that a per-frame re-render is a non-issue here.
const useElapsedSeconds = () => {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    let frame: number;
    const tick = () => {
      setElapsed((Date.now() - startRef.current) / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return elapsed;
};

const LiquidMetalBackground = () => {
  const { width, height } = useWindowDimensions();
  const time = useElapsedSeconds();
  const effect = useMemo(
    () => Skia.RuntimeEffect.Make(liquidMetalShaderSource),
    [],
  );

  if (!effect) return null;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill>
        <Shader
          source={effect}
          uniforms={{ resolution: [width, height], time }}
        />
      </Fill>
    </Canvas>
  );
};

export default LiquidMetalBackground;
