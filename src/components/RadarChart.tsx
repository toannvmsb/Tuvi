/**
 * Bản đồ tròn (radar / spider chart) — vẽ N trục điểm 0..100.
 * Dùng react-native-svg.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { COLORS } from '../constants/theme';

export interface RadarPoint { label: string; value: number; }

export default function RadarChart({
  data, size = 300, maxValue = 100,
}: { data: RadarPoint[]; size?: number; maxValue?: number }) {
  const n = data.length;
  if (n < 3) return null;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 60; // chừa lề rộng hơn cho chữ to
  const rings = [0.25, 0.5, 0.75, 1];
  // Thang chia hình học: giá trị lớn nhất sẽ chạm mép ngoài (hình to, dễ nhìn).
  const scale = maxValue > 0 ? maxValue : 100;

  const angleOf = (i: number) => (-90 + (360 / n) * i) * (Math.PI / 180);
  const pt = (i: number, ratio: number) => {
    const a = angleOf(i);
    return [cx + R * ratio * Math.cos(a), cy + R * ratio * Math.sin(a)] as const;
  };
  const ratioOf = (v: number) => Math.max(0.04, Math.min(1, v / scale));

  // Nhãn dài (VD "Kinh doanh / Đối tác") bị tràn/mất chữ khi vẽ trên 1 dòng —
  // tách thành tối đa 2 dòng, ưu tiên tách tại dấu "/", nếu không có thì tách
  // gần giữa chuỗi tại khoảng trắng gần nhất.
  const wrapLabel = (label: string): string[] => {
    if (label.length <= 10) return [label];
    const slashIdx = label.indexOf('/');
    if (slashIdx !== -1) {
      return [label.slice(0, slashIdx).trim(), label.slice(slashIdx + 1).trim()];
    }
    const mid = Math.floor(label.length / 2);
    let splitAt = label.lastIndexOf(' ', mid);
    if (splitAt === -1) splitAt = label.indexOf(' ', mid);
    if (splitAt === -1) return [label];
    return [label.slice(0, splitAt).trim(), label.slice(splitAt + 1).trim()];
  };

  const gridPolys = rings.map(rr =>
    data.map((_, i) => pt(i, rr).join(',')).join(' '),
  );
  const dataPoly = data.map((d, i) => pt(i, ratioOf(d.value)).join(',')).join(' ');

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {/* lưới đa giác */}
        {gridPolys.map((p, idx) => (
          <Polygon key={`g${idx}`} points={p} fill="none" stroke={COLORS.border} strokeWidth={idx === gridPolys.length - 1 ? 1.4 : 0.8} />
        ))}
        {/* trục */}
        {data.map((_, i) => {
          const [x, y] = pt(i, 1);
          return <Line key={`a${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke={COLORS.border} strokeWidth={0.7} />;
        })}
        {/* vùng dữ liệu */}
        <Polygon points={dataPoly} fill={COLORS.gold + '55'} stroke={COLORS.gold} strokeWidth={2} />
        {data.map((d, i) => {
          const [x, y] = pt(i, ratioOf(d.value));
          return <Circle key={`p${i}`} cx={x} cy={y} r={2.6} fill={COLORS.gold} />;
        })}
        {/* nhãn trục */}
        {data.map((d, i) => {
          const [lx, ly] = pt(i, 1.2);
          const a = angleOf(i);
          const anchor = Math.abs(Math.cos(a)) < 0.3 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
          const lines = wrapLabel(d.label);
          const labelBaseY = ly - 4 - (lines.length - 1) * 12;
          const valueY = ly + 11 + (lines.length - 1) * 12;
          return (
            <G key={`l${i}`}>
              {lines.map((line, li) => (
                <SvgText
                  key={li}
                  x={lx} y={labelBaseY + li * 12} fontSize="12" fontWeight="800"
                  fill={COLORS.goldLight} textAnchor={anchor as any}
                >
                  {line}
                </SvgText>
              ))}
              <SvgText
                x={lx} y={valueY} fontSize="12" fontWeight="700"
                fill="#ffffff" textAnchor={anchor as any}
              >
                {d.value}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
