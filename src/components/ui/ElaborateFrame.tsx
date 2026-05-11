import React from 'react';
import { useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  FeMerge,
  FeMergeNode,
  FeGaussianBlur,
  Filter,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

export function ElaborateFrame() {
  const { width, height } = useWindowDimensions();

  // Design was made for 390×844 — scale everything proportionally
  const scaleX = width / 390;
  const scaleY = height / 844;

  // Oval center adapts to actual screen — moved lower (60% down instead of 50%)
  const ovalCx = width / 2;
  const ovalCy = height / 2;
  const ovalRx = width * 0.45;
  const ovalRy = height * 0.44;

  // Side gem Y (midpoint)
  const sideGemY = height / 2;

  // Bottom lines Y
  const bandY1 = height - 74;
  const bandY2 = height - 70;

  // Bottom corner gem Y
  const bottomGemY = height - 16;

  // Top small gems positions (proportional to width)
  const topGemXs = [
    width * 0.308,
    width * 0.397,
    width * 0.5,
    width * 0.603,
    width * 0.692,
  ];

  return (
    <Svg
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 1 }}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <Defs>
        <LinearGradient id="gg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%"   stopColor="#6B5010" />
          <Stop offset="25%"  stopColor="#D4AF37" />
          <Stop offset="50%"  stopColor="#F0D060" />
          <Stop offset="75%"  stopColor="#D4AF37" />
          <Stop offset="100%" stopColor="#6B5010" />
        </LinearGradient>
        <LinearGradient id="gg2" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%"   stopColor="#D4AF37" />
          <Stop offset="100%" stopColor="#6B5010" />
        </LinearGradient>
        <RadialGradient id="gemR" cx="40%" cy="35%">
          <Stop offset="0%"   stopColor="#c090f0" />
          <Stop offset="60%"  stopColor="#6B4BA0" />
          <Stop offset="100%" stopColor="#3a1a70" />
        </RadialGradient>
        <Filter id="glow">
          <FeGaussianBlur stdDeviation="2" result="blur" />
          <FeMerge>
            <FeMergeNode in="blur" />
            <FeMergeNode in="SourceGraphic" />
          </FeMerge>
        </Filter>
      </Defs>

      {/* Outer rounded rect border */}
      <Rect x="2" y="2" width={width - 4} height={height - 4} rx="42" ry="42"
        fill="none" stroke="url(#gg)" strokeWidth="7" opacity="0.95" />
      <Rect x="6" y="6" width={width - 12} height={height - 12} rx="40" ry="40"
        fill="none" stroke="#D4AF37" strokeWidth="1.5" opacity="0.3" />

      {/* Inner oval arch — centered and responsive */}
      <Ellipse cx={ovalCx} cy={ovalCy} rx={ovalRx} ry={ovalRy}
        fill="none" stroke="url(#gg)" strokeWidth="5" opacity="0.85" />
      <Ellipse cx={ovalCx} cy={ovalCy} rx={ovalRx - 4} ry={ovalRy - 4}
        fill="none" stroke="#D4AF37" strokeWidth="1" opacity="0.25" />

      {/* TOP CENTER FLEUR-DE-LIS */}
      <G transform={`translate(${width / 2},14)`}>
        <Path d="M0,-10 C-4,-6 -6,0 0,6 C6,0 4,-6 0,-10Z" fill="url(#gg)" />
        <Path d="M-8,-4 C-10,0 -8,6 0,8 C8,6 10,0 8,-4Z" fill="url(#gg)" opacity="0.7" />
        <Circle cx="0" cy="0" r="3.5" fill="#D4AF37" />
        <Path d="M0,6 L0,18" stroke="url(#gg)" strokeWidth="2" />
        <Path d="M-6,10 Q0,14 6,10" fill="none" stroke="url(#gg)" strokeWidth="1.5" />
      </G>

      {/* Top-left filigree */}
      <G opacity="0.9">
        <Path d="M14,40 C14,30 20,24 30,18" fill="none" stroke="url(#gg)" strokeWidth="2.5" />
        <Path d="M20,50 C20,38 28,30 42,22" fill="none" stroke="#D4AF37" strokeWidth="1.5" opacity="0.6" />
        <Path d="M28,60 C28,48 36,38 52,28" fill="none" stroke="#D4AF37" strokeWidth="1" opacity="0.4" />
        <Path d="M14,70 C18,60 26,52 38,46 C50,40 60,38 70,34" fill="none" stroke="url(#gg)" strokeWidth="2" />
        <Path d="M30,82 C40,72 52,64 66,58" fill="none" stroke="#D4AF37" strokeWidth="1.5" opacity="0.6" />
        <Ellipse cx="45" cy="38" rx="5" ry="3" fill="url(#gg)" opacity="0.7" transform="rotate(-30,45,38)" />
        <Ellipse cx="60" cy="30" rx="4" ry="2.5" fill="url(#gg)" opacity="0.6" transform="rotate(-50,60,30)" />
        <Ellipse cx="32" cy="65" rx="4" ry="2" fill="url(#gg)" opacity="0.6" transform="rotate(-10,32,65)" />
      </G>

      {/* Top-right filigree (mirror) */}
      <G opacity="0.9" transform={`scale(-1,1) translate(${-width},0)`}>
        <Path d="M14,40 C14,30 20,24 30,18" fill="none" stroke="url(#gg)" strokeWidth="2.5" />
        <Path d="M20,50 C20,38 28,30 42,22" fill="none" stroke="#D4AF37" strokeWidth="1.5" opacity="0.6" />
        <Path d="M28,60 C28,48 36,38 52,28" fill="none" stroke="#D4AF37" strokeWidth="1" opacity="0.4" />
        <Path d="M14,70 C18,60 26,52 38,46 C50,40 60,38 70,34" fill="none" stroke="url(#gg)" strokeWidth="2" />
        <Path d="M30,82 C40,72 52,64 66,58" fill="none" stroke="#D4AF37" strokeWidth="1.5" opacity="0.6" />
        <Ellipse cx="45" cy="38" rx="5" ry="3" fill="url(#gg)" opacity="0.7" transform="rotate(-30,45,38)" />
        <Ellipse cx="60" cy="30" rx="4" ry="2.5" fill="url(#gg)" opacity="0.6" transform="rotate(-50,60,30)" />
        <Ellipse cx="32" cy="65" rx="4" ry="2" fill="url(#gg)" opacity="0.6" transform="rotate(-10,32,65)" />
      </G>

      {/* Bottom-left filigree */}
      <G opacity="0.9" transform={`scale(1,-1) translate(0,${-height})`}>
        <Path d="M14,40 C14,30 20,24 30,18" fill="none" stroke="url(#gg)" strokeWidth="2.5" />
        <Path d="M14,70 C18,60 26,52 38,46 C50,40 60,38 70,34" fill="none" stroke="url(#gg)" strokeWidth="2" />
        <Path d="M30,82 C40,72 52,64 66,58" fill="none" stroke="#D4AF37" strokeWidth="1.5" opacity="0.6" />
        <Ellipse cx="45" cy="38" rx="5" ry="3" fill="url(#gg)" opacity="0.7" transform="rotate(-30,45,38)" />
      </G>
      {/* Bottom-right filigree */}
      <G opacity="0.9" transform={`scale(-1,-1) translate(${-width},${-height})`}>
        <Path d="M14,40 C14,30 20,24 30,18" fill="none" stroke="url(#gg)" strokeWidth="2.5" />
        <Path d="M14,70 C18,60 26,52 38,46 C50,40 60,38 70,34" fill="none" stroke="url(#gg)" strokeWidth="2" />
        <Path d="M30,82 C40,72 52,64 66,58" fill="none" stroke="#D4AF37" strokeWidth="1.5" opacity="0.6" />
        <Ellipse cx="45" cy="38" rx="5" ry="3" fill="url(#gg)" opacity="0.7" transform="rotate(-30,45,38)" />
      </G>

      {/* Corner gems */}
      {([[16, 16], [width - 16, 16], [16, bottomGemY], [width - 16, bottomGemY]] as [number, number][]).map(([cx, cy], i) => (
        <G key={i}>
          <Circle cx={cx} cy={cy} r="12" fill="url(#gg)" />
          <Circle cx={cx} cy={cy} r="9"  fill="url(#gemR)" />
          <Circle cx={cx - 3} cy={cy - 3} r="3" fill="rgba(255,255,255,0.3)" />
          <Circle cx={cx} cy={cy} r="12" fill="none" stroke="url(#gg)" strokeWidth="1.5" />
        </G>
      ))}

      {/* Side midpoint gems */}
      {([[6, sideGemY], [width - 6, sideGemY]] as [number, number][]).map(([cx, cy], i) => (
        <G key={i}>
          <Circle cx={cx} cy={cy} r="8"   fill="url(#gg)" />
          <Circle cx={cx} cy={cy} r="5.5" fill="url(#gemR)" />
          <Circle cx={cx - 2} cy={cy - 2} r="2" fill="rgba(255,255,255,0.3)" />
        </G>
      ))}

      {/* Top small gems along top arch */}
      {topGemXs.map((x, i) => {
        const y = i === 2 ? 8 : 10;
        return (
          <G key={i}>
            <Path
              d={`M${x},${y} L${x + 4},${y + 6} L${x},${y + 12} L${x - 4},${y + 6}Z`}
              fill="url(#gemR)" stroke="url(#gg)" strokeWidth="1"
            />
          </G>
        );
      })}

      {/* Horizontal band above tab bar */}
      <Line x1="14" y1={bandY1} x2={width - 14} y2={bandY1} stroke="url(#gg)" strokeWidth="3" opacity="0.8" />
      <Line x1="14" y1={bandY2} x2={width - 14} y2={bandY2} stroke="#D4AF37" strokeWidth="1" opacity="0.3" />
    </Svg>
  );
}
