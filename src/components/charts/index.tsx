import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { useI18n } from '@/i18n';
import { radius, spacing, useColors } from '@/theme';
import { withAlpha } from '@/theme/colors';
import { Txt } from '@/components/ui/Txt';

export type Point = { label: string; value: number };

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(max));
  const norm = max / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}

/**
 * Vertical bars. Tapping a bar reveals its exact value — cheaper than
 * printing a number on every bar and keeps the chart readable on a 5" phone.
 */
export function BarChart({
  data,
  height = 150,
  color,
  formatValue,
  style,
  highlightLast,
}: {
  data: Point[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
  style?: StyleProp<ViewStyle>;
  highlightLast?: boolean;
}) {
  const c = useColors();
  const { num } = useI18n();
  const tint = color ?? c.primary;
  const [selected, setSelected] = useState<number | null>(null);

  const max = useMemo(() => niceMax(Math.max(...data.map((d) => d.value), 0)), [data]);
  const activeIndex = selected ?? (highlightLast ? data.length - 1 : null);
  const fmt = formatValue ?? ((v: number) => num(v));

  if (data.length === 0) return null;

  return (
    <View style={style}>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        {data.map((d, i) => {
          const ratio = max > 0 ? d.value / max : 0;
          const barH = Math.max(d.value > 0 ? 4 : 2, ratio * (height - 26));
          const isActive = activeIndex === i;
          return (
            <Pressable
              key={`${d.label}-${i}`}
              onPress={() => setSelected(selected === i ? null : i)}
              style={styles.barCol}
            >
              {isActive ? (
                <Txt variant="micro" weight="700" color={tint} numberOfLines={1} role="numeric">
                  {fmt(d.value)}
                </Txt>
              ) : (
                <View style={{ height: 14 }} />
              )}
              <View
                style={{
                  height: barH,
                  width: '100%',
                  borderRadius: 7,
                  backgroundColor: isActive ? tint : withAlpha(tint, c.mode === 'dark' ? 0.4 : 0.28),
                }}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.axisRow}>
        {data.map((d, i) => (
          <View key={`l-${d.label}-${i}`} style={{ flex: 1, alignItems: 'center' }}>
            <Txt
              variant="micro"
              color={activeIndex === i ? c.text : c.textFaint}
              weight={activeIndex === i ? '700' : '400'}
              numberOfLines={1}
            >
              {d.label}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Two-series comparison bars (money in vs money out). */
export function DualBarChart({
  data,
  height = 150,
  colorA,
  colorB,
  formatValue,
  style,
}: {
  data: { label: string; a: number; b: number }[];
  height?: number;
  colorA?: string;
  colorB?: string;
  formatValue?: (v: number) => string;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const { num } = useI18n();
  const A = colorA ?? c.moneyIn;
  const B = colorB ?? c.moneyOut;
  const [selected, setSelected] = useState<number | null>(null);
  const max = useMemo(
    () => niceMax(Math.max(...data.flatMap((d) => [d.a, d.b]), 0)),
    [data]
  );
  const fmt = formatValue ?? ((v: number) => num(v));

  if (data.length === 0) return null;

  return (
    <View style={style}>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        {data.map((d, i) => {
          const active = selected === i;
          return (
            <Pressable
              key={`${d.label}-${i}`}
              onPress={() => setSelected(active ? null : i)}
              style={styles.barCol}
            >
              {active ? (
                <View style={{ alignItems: 'center' }}>
                  <Txt variant="micro" weight="700" color={A} role="numeric">
                    {fmt(d.a)}
                  </Txt>
                  <Txt variant="micro" weight="700" color={B} role="numeric">
                    {fmt(d.b)}
                  </Txt>
                </View>
              ) : (
                <View style={{ height: 26 }} />
              )}
              <View style={{ flexDirection: 'row', gap: 3, alignItems: 'flex-end', width: '100%' }}>
                <View
                  style={{
                    flex: 1,
                    height: Math.max(3, (d.a / max) * (height - 40)),
                    borderRadius: 5,
                    backgroundColor: active ? A : withAlpha(A, 0.4),
                  }}
                />
                <View
                  style={{
                    flex: 1,
                    height: Math.max(3, (d.b / max) * (height - 40)),
                    borderRadius: 5,
                    backgroundColor: active ? B : withAlpha(B, 0.4),
                  }}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.axisRow}>
        {data.map((d, i) => (
          <View key={`l-${d.label}-${i}`} style={{ flex: 1, alignItems: 'center' }}>
            <Txt variant="micro" faint numberOfLines={1}>
              {d.label}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Smooth area chart for trends over many points. */
export function AreaChart({
  data,
  height = 140,
  color,
  style,
}: {
  data: Point[];
  height?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const tint = color ?? c.primary;
  const [width, setWidth] = useState(0);

  const max = useMemo(() => niceMax(Math.max(...data.map((d) => d.value), 0)), [data]);
  const chartH = height - 22;

  const { line, area, dots } = useMemo(() => {
    if (width === 0 || data.length === 0) return { line: '', area: '', dots: [] as { x: number; y: number }[] };
    const stepX = data.length > 1 ? width / (data.length - 1) : width;
    const pts = data.map((d, i) => ({
      x: data.length > 1 ? i * stepX : width / 2,
      y: chartH - (max > 0 ? (d.value / max) * (chartH - 8) : 0) - 4,
    }));

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i += 1) {
      const prev = pts[i - 1];
      const cur = pts[i];
      const cx = (prev.x + cur.x) / 2;
      path += ` C ${cx} ${prev.y}, ${cx} ${cur.y}, ${cur.x} ${cur.y}`;
    }
    return {
      line: path,
      area: `${path} L ${pts[pts.length - 1].x} ${chartH} L ${pts[0].x} ${chartH} Z`,
      dots: pts,
    };
  }, [data, width, max, chartH]);

  return (
    <View style={style} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && data.length > 0 ? (
        <Svg width={width} height={chartH}>
          <Defs>
            <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tint} stopOpacity={c.mode === 'dark' ? 0.42 : 0.28} />
              <Stop offset="1" stopColor={tint} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <G>
            {[0.25, 0.5, 0.75].map((f) => (
              <Line
                key={f}
                x1={0}
                y1={chartH * f}
                x2={width}
                y2={chartH * f}
                stroke={c.divider}
                strokeWidth={1}
                strokeDasharray="4 6"
              />
            ))}
          </G>
          <Path d={area} fill="url(#areaFill)" />
          <Path d={line} stroke={tint} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          {dots.length <= 12
            ? dots.map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r={3.2} fill={c.card} stroke={tint} strokeWidth={2} />
              ))
            : null}
        </Svg>
      ) : (
        <View style={{ height: chartH }} />
      )}
      <View style={styles.axisRow}>
        {data.map((d, i) => (
          <View key={`${d.label}-${i}`} style={{ flex: 1, alignItems: 'center' }}>
            <Txt variant="micro" faint numberOfLines={1}>
              {data.length > 10 && i % 2 === 1 ? '' : d.label}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

export type Slice = { label: string; value: number; color: string };

/** Donut + legend. Falls back to an empty ring rather than disappearing. */
export function DonutChart({
  slices,
  size = 148,
  thickness = 22,
  centerLabel,
  centerValue,
  style,
}: {
  slices: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }, style]}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation={-90} origin={`${cx}, ${cy}`}>
            <Circle cx={cx} cy={cy} r={r} stroke={c.bgSunken} strokeWidth={thickness} fill="none" />
            {total > 0 &&
              slices.map((s, i) => {
                const frac = Math.max(0, s.value) / total;
                const dash = frac * circumference;
                const el = (
                  <Circle
                    key={`${s.label}-${i}`}
                    cx={cx}
                    cy={cy}
                    r={r}
                    stroke={s.color}
                    strokeWidth={thickness}
                    fill="none"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                    strokeLinecap={frac > 0.985 ? 'butt' : 'round'}
                  />
                );
                offset += dash;
                return el;
              })}
          </G>
        </Svg>
        <View style={styles.donutCenter} pointerEvents="none">
          {centerValue ? (
            <Txt variant="amount" weight="800" align="center" numberOfLines={1} role="numeric">
              {centerValue}
            </Txt>
          ) : null}
          {centerLabel ? (
            <Txt variant="micro" muted align="center" numberOfLines={1}>
              {centerLabel}
            </Txt>
          ) : null}
        </View>
      </View>

      <View style={{ flex: 1, gap: 7 }}>
        {slices.slice(0, 6).map((s, i) => (
          <View key={`${s.label}-${i}`} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Txt variant="caption" numberOfLines={1} style={{ flex: 1 }}>
              {s.label}
            </Txt>
            <Txt variant="caption" weight="700" muted role="numeric">
              {total > 0 ? `${Math.round((s.value / total) * 100)}%` : '0%'}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Horizontal ranked bars — best for "what sold most". */
export function RankedBars({
  rows,
  formatValue,
  style,
  max: maxOverride,
}: {
  rows: { label: string; value: number; color?: string; sub?: string }[];
  formatValue: (v: number) => string;
  style?: StyleProp<ViewStyle>;
  max?: number;
}) {
  const c = useColors();
  const max = maxOverride ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <View style={[{ gap: spacing.md }, style]}>
      {rows.map((r, i) => (
        <View key={`${r.label}-${i}`} style={{ gap: 5 }}>
          <View style={styles.rankedTop}>
            <Txt variant="caption" weight="600" numberOfLines={1} style={{ flex: 1 }}>
              {r.label}
            </Txt>
            <Txt variant="caption" weight="700" role="numeric">
              {formatValue(r.value)}
            </Txt>
          </View>
          <View style={[styles.rankedTrack, { backgroundColor: c.bgSunken }]}>
            <View
              style={{
                width: `${Math.max(2, (r.value / max) * 100)}%`,
                height: '100%',
                borderRadius: 5,
                backgroundColor: r.color ?? c.primary,
              }}
            />
          </View>
          {r.sub ? (
            <Txt variant="micro" faint>
              {r.sub}
            </Txt>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** Single stacked bar showing a split (e.g. paid vs unpaid). */
export function SplitBar({
  parts,
  height = 12,
  style,
}: {
  parts: { value: number; color: string }[];
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0);
  return (
    <View
      style={[
        { height, borderRadius: height / 2, overflow: 'hidden', flexDirection: 'row', backgroundColor: c.bgSunken },
        style,
      ]}
    >
      {total > 0 &&
        parts.map((p, i) => (
          <View key={i} style={{ flex: Math.max(0, p.value), backgroundColor: p.color }} />
        ))}
    </View>
  );
}

export function ChartCard({
  title,
  subtitle,
  right,
  children,
  style,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return (
    <View style={[{ backgroundColor: c.card, borderRadius: radius.lg, padding: spacing.lg }, style]}>
      <View style={styles.chartHead}>
        <View style={{ flex: 1 }}>
          <Txt variant="body" weight="700">
            {title}
          </Txt>
          {subtitle ? (
            <Txt variant="micro" muted style={{ marginTop: 1 }}>
              {subtitle}
            </Txt>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  axisRow: { flexDirection: 'row', gap: 6, marginTop: 7 },
  donutCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 9, height: 9, borderRadius: 3 },
  rankedTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rankedTrack: { height: 9, borderRadius: 5, overflow: 'hidden' },
  chartHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
});
