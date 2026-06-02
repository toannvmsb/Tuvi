/**
 * Trình hiển thị Markdown rút gọn cho nội dung AI trả về.
 * Hỗ trợ: tiêu đề (#, ##, ###), **đậm**, gạch đầu dòng (-, *, •),
 * danh sách đánh số, và BẢNG Markdown (| a | b |) → render thành
 * bảng thật. Bỏ các ký hiệu thừa để văn bản gọn, chuyên nghiệp.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { STAR_NAME_REGEX, getStarColor } from '../data/starElements';

/** Tách 1 đoạn văn bản, tô màu các tên sao theo ngũ hành (kim/mộc/thủy/hỏa/thổ). */
function colorizeStars(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  STAR_NAME_REGEX.lastIndex = 0;
  while ((m = STAR_NAME_REGEX.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <Text key={`${keyBase}-${k++}`} style={{ color: getStarColor(m[0]), fontWeight: '700' }}>
        {m[0]}
      </Text>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function stripInline(s: string): string {
  return s
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .trim();
}

/** Render 1 dòng với **đậm** thành các đoạn Text */
function InlineText({ text, style }: { text: string; style: any }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Text key={i} style={styles.bold}>{colorizeStars(p.slice(2, -2), `b${i}`)}</Text>
        ) : (
          <Text key={i}>
            {colorizeStars(p.replace(/__(.*?)__/g, '$1').replace(/`/g, '').replace(/\*\*/g, ''), `p${i}`)}
          </Text>
        ),
      )}
    </Text>
  );
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every(c => /^:?-{2,}:?$/.test(c.replace(/\s/g, '')) || c.trim() === '');
}

function parseTableRow(line: string): string[] {
  let l = line.trim();
  if (l.startsWith('|')) l = l.slice(1);
  if (l.endsWith('|')) l = l.slice(0, -1);
  return l.split('|').map(c => stripInline(c));
}

function MarkdownTable({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return null;
  const [header, ...body] = rows;
  return (
    <View style={styles.table}>
      <View style={[styles.tr, styles.trHead]}>
        {header.map((c, i) => (
          <Text key={i} style={[styles.td, styles.tdHead]}>{c}</Text>
        ))}
      </View>
      {body.map((r, ri) => (
        <View key={ri} style={[styles.tr, ri % 2 === 1 && styles.trAlt]}>
          {header.map((_, ci) => (
            <Text key={ci} style={styles.td}>{r[ci] ?? ''}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r/g, '').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    // Bảng: dòng hiện tại và dòng sau đều có '|'
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('|')) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        const cells = parseTableRow(lines[i]);
        if (!isSeparatorRow(cells)) tableRows.push(cells);
        i++;
      }
      if (tableRows.length) blocks.push(<MarkdownTable key={key++} rows={tableRows} />);
      continue;
    }

    if (line === '') {
      blocks.push(<View key={key++} style={{ height: SPACING.xs }} />);
      i++;
      continue;
    }

    // Đường kẻ ngang --- *** ___
    if (/^([-*_])\1{2,}$/.test(line.replace(/\s/g, ''))) {
      blocks.push(<View key={key++} style={styles.hr} />);
      i++;
      continue;
    }

    // Dòng mở đầu **... nhưng KHÔNG đóng (vd bị cắt) → coi như tiêu đề phụ
    if (/^\*\*[^*]/.test(line) && !/\*\*[^*]+\*\*/.test(line)) {
      blocks.push(
        <Text key={key++} style={styles.subHeading}>
          {line.replace(/^\*\*\s*/, '').replace(/:$/, '')}
        </Text>,
      );
      i++;
      continue;
    }

    // Tiêu đề
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      blocks.push(
        <Text key={key++} style={styles.heading}>{stripInline(h[2])}</Text>,
      );
      i++;
      continue;
    }

    // Dòng toàn đậm coi như tiêu đề phụ
    if (/^\*\*[^*]+\*\*:?\s*$/.test(line)) {
      blocks.push(
        <Text key={key++} style={styles.subHeading}>{stripInline(line).replace(/:$/, '')}</Text>,
      );
      i++;
      continue;
    }

    // Gạch đầu dòng
    const b = line.match(/^[-*•]\s+(.*)$/);
    if (b) {
      blocks.push(
        <View key={key++} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <InlineText text={b[1]} style={styles.bulletText} />
        </View>,
      );
      i++;
      continue;
    }

    // Danh sách đánh số
    const n = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (n) {
      // Đầu mục lớn (vd "1. TỔNG QUAN ...") → tiêu đề đậm, màu vàng.
      const body = n[2];
      const colon = body.indexOf(':');
      const titlePart = (colon >= 0 ? body.slice(0, colon) : body).trim();
      const rest = colon >= 0 ? body.slice(colon) : '';
      const letters = titlePart.replace(/[^\p{L}]/gu, '');
      const isHeading = letters.length > 0 && titlePart.length <= 90
        && letters === letters.toUpperCase() && letters !== letters.toLowerCase();
      if (isHeading) {
        blocks.push(
          <Text key={key++} style={styles.numHeading}>
            {n[1]}. {titlePart}
            {rest ? <Text style={styles.numHeadingRest}>{rest}</Text> : null}
          </Text>,
        );
        i++;
        continue;
      }
      blocks.push(
        <View key={key++} style={styles.bulletRow}>
          <Text style={styles.numDot}>{n[1]}.</Text>
          <InlineText text={n[2]} style={styles.bulletText} />
        </View>,
      );
      i++;
      continue;
    }

    blocks.push(<InlineText key={key++} text={line} style={styles.para} />);
    i++;
  }

  return <View style={styles.wrap}>{blocks}</View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  hr: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  para: { color: COLORS.textPrimary, fontSize: FONTS.size.md, lineHeight: 22, textAlign: 'justify' },
  bold: { fontWeight: '800', color: COLORS.goldLight },
  heading: {
    color: COLORS.gold, fontSize: FONTS.size.lg, fontWeight: '800',
    marginTop: SPACING.sm, marginBottom: 2,
  },
  subHeading: {
    color: COLORS.goldLight, fontSize: FONTS.size.md, fontWeight: '800',
    marginTop: SPACING.sm,
  },
  bulletRow: { flexDirection: 'row', gap: 6, paddingLeft: 2 },
  bulletDot: { color: COLORS.gold, fontSize: FONTS.size.md, lineHeight: 22 },
  numDot: { color: COLORS.gold, fontSize: FONTS.size.md, lineHeight: 22, fontWeight: '700', minWidth: 18 },
  numHeading: {
    color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800',
    marginTop: SPACING.sm, marginBottom: 2, lineHeight: 22,
  },
  numHeadingRest: { color: COLORS.textPrimary, fontSize: FONTS.size.md, fontWeight: '400', lineHeight: 22 },
  bulletText: { color: COLORS.textPrimary, fontSize: FONTS.size.md, lineHeight: 22, flex: 1, textAlign: 'justify' },
  table: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 6,
    overflow: 'hidden', marginVertical: SPACING.xs,
  },
  tr: { flexDirection: 'row' },
  trHead: { backgroundColor: COLORS.surface },
  trAlt: { backgroundColor: 'rgba(255,255,255,0.04)' },
  td: {
    flex: 1, color: COLORS.textPrimary, fontSize: FONTS.size.sm,
    padding: 6, borderRightWidth: 0.5, borderColor: COLORS.border, lineHeight: 18,
  },
  tdHead: { color: COLORS.gold, fontWeight: '800' },
});
