/**
 * Nền màn Welcome theo thiết kế: nền tím xuyên tâm + quầng sáng vàng, các vòng quỹ đạo (nét liền / nét đứt),
 * sao nhỏ và 3 "hành tinh" màu (lục · đỏ · tím) bao quanh logo.
 *  - <WelcomeBackground /> : nền toàn màn hình.
 *  - <WelcomeOrbits />     : bộ vòng quỹ đạo, tâm ở giữa khung (đặt trùng tâm logo).
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect, Circle, G } from 'react-native-svg';

export function WelcomeBackground() {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
      <Defs>
        <RadialGradient id="wbBg" cx="50%" cy="26%" rx="120%" ry="58%" fx="50%" fy="26%" gradientUnits="objectBoundingBox">
          <Stop offset="0" stopColor="#3B2B7E" />
          <Stop offset="0.46" stopColor="#19183C" />
          <Stop offset="1" stopColor="#0A0B1A" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#wbBg)" />
    </Svg>
  );
}

/** Khung 390×540, tâm (195,262) — đặt sao cho tâm này trùng tâm logo. */
export function WelcomeOrbits() {
  return (
    <View pointerEvents="none" style={styles.box}>
      <Svg width={390} height={540} viewBox="0 0 390 540">
        <Defs>
          <RadialGradient id="wbGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#E2C285" stopOpacity="0.42" />
            <Stop offset="1" stopColor="#E2C285" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={195} cy={262} r={170} fill="url(#wbGlow)" />
        <G fill="none" stroke="#E2C285">
          <Circle cx={195} cy={262} r={112} strokeOpacity={0.3} />
          <Circle cx={195} cy={262} r={146} strokeOpacity={0.2} strokeDasharray="2 7" />
          <Circle cx={195} cy={262} r={196} strokeOpacity={0.15} />
          <Circle cx={195} cy={262} r={252} strokeOpacity={0.1} strokeDasharray="1 9" />
        </G>
        <G fill="#F3EBDC">
          <Circle cx={52} cy={70} r={1.3} opacity={0.7} />
          <Circle cx={330} cy={54} r={1} opacity={0.6} />
          <Circle cx={352} cy={180} r={1.5} opacity={0.5} />
          <Circle cx={26} cy={210} r={1} opacity={0.5} />
          <Circle cx={110} cy={130} r={0.9} opacity={0.6} />
          <Circle cx={286} cy={118} r={1.1} opacity={0.7} />
          <Circle cx={60} cy={420} r={1.2} opacity={0.5} />
          <Circle cx={340} cy={400} r={1} opacity={0.6} />
          <Circle cx={236} cy={36} r={0.9} opacity={0.5} />
        </G>
        <Circle cx={307} cy={262} r={5} fill="#7BC6A4" />
        <Circle cx={112} cy={380} r={4} fill="#E77B6B" />
        <Circle cx={195} cy={66} r={4.5} fill="#B79CFF" />
      </Svg>
    </View>
  );
}

// Khung 390×540 căn giữa theo cả hai chiều của vùng chứa; tâm quỹ đạo (195,262) lệch 8px so với giữa khung (270)
// nên dịch xuống 8px để trùng tâm logo.
const styles = StyleSheet.create({
  box: {
    position: 'absolute', width: 390, height: 540, left: '50%', top: '50%',
    marginLeft: -195, marginTop: -270 + 8,
  },
});
