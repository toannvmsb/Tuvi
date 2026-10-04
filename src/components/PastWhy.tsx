/**
 * Khối "Vì sao" + hàng phản hồi — dùng chung cho màn Nghiệm quá khứ và Dòng đời đã qua.
 * Lời văn do `explainWhy` ghép từ tín hiệu (mẫu, không AI); ở đây chỉ trình bày.
 */
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, FONTS, TIER_COLORS } from '../constants/theme';
import { Chip } from '../ui';
import { explainWhy, type WhyColumn } from '../core/pastReview/explainWhy';
import { FEEDBACK_LABEL, FEEDBACK_ORDER, type FeedbackValue } from '../core/pastReview/feedback';
import type { PastMarker } from '../core/pastReview';

export const FB_COLOR: Record<FeedbackValue, string> = {
  dung: TIER_COLORS.great, gan_dung: COLORS.gold, sai: TIER_COLORS.bad, khong_nho: COLORS.textMuted,
};

function WhyColumnView({ col }: { col: WhyColumn }) {
  return (
    <View style={s.whyCol}>
      <Text style={s.whyTitle}>{col.title}{col.reports ? '' : ' · không có tín hiệu rõ'}</Text>
      {[col.goc, col.nen, col.ngoi, col.ket].map((t, i) => (
        <Text key={i} style={[s.whyLine, i === 3 && s.whyKet]}>{t}</Text>
      ))}
    </View>
  );
}

/** Nội dung mở ra sau nút "Vì sao": hai cột Tử Vi/Bát Tự + đối chiếu + (tùy chọn) mức người học. */
export function WhyBlock({ marker, sensitive, openLearner, onToggleLearner }: {
  marker: PastMarker; sensitive: boolean; openLearner: boolean; onToggleLearner: () => void;
}) {
  const why = useMemo(() => explainWhy(marker, { sensitive }), [marker, sensitive]);
  return (
    <View style={s.whyBox}>
      <WhyColumnView col={why.viewer.tuvi} />
      <WhyColumnView col={why.viewer.bazi} />
      <Text style={s.cross}>{why.viewer.doiChieu}</Text>

      <Pressable onPress={onToggleLearner} accessibilityRole="button">
        <Text style={s.link}>{openLearner ? '▾ Thu gọn phần dành cho người học tử vi' : '▸ Xem sâu hơn (dành cho người học tử vi)'}</Text>
      </Pressable>
      {openLearner && (
        <View style={{ gap: 8 }}>
          {why.learner.notes.map((n, i) => <Text key={i} style={s.note}>• {n}</Text>)}
          {why.learner.rows.map((r, i) => (
            <View key={i} style={[s.row, !r.supports && s.rowAgainst]}>
              <Text style={s.rowHead}>
                {`${r.system === 'tuvi' ? 'Tử Vi' : 'Bát Tự'} · ${r.layerLabel}${r.supports ? '' : ' · ngược chiều'}`}
              </Text>
              <Text style={s.rowTitle}>{r.title}</Text>
              <Text style={s.rowBody}>{r.detail}</Text>
              {r.facts.map((f, k) => (
                <Text key={k} style={s.rowMeta}>
                  <Text style={s.rowMetaLabel}>{`${f.label}: `}</Text>{f.value}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** Hàng 4 nút phản hồi Đúng / Gần đúng / Sai / Không nhớ (bấm lại để bỏ chọn). */
export function FeedbackRow({ value, canSave, onFeedback }: {
  value?: FeedbackValue; canSave: boolean; onFeedback: (v: FeedbackValue) => void;
}) {
  return (
    <View style={s.fbBox}>
      <Text style={s.fbLabel}>Năm này có đúng với bạn không? (tùy chọn)</Text>
      <View style={s.chipRow}>
        {FEEDBACK_ORDER.map(v => (
          <Chip key={v} label={FEEDBACK_LABEL[v]} active={value === v} color={FB_COLOR[v]} onPress={() => onFeedback(v)} />
        ))}
      </View>
      {!canSave && <Text style={s.note}>Cần đăng nhập và lưu lá số để ghi nhận phản hồi.</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  link: { fontFamily: FONTS.bodySemi, fontSize: 13, color: COLORS.gold, paddingVertical: 4 },
  whyBox: { gap: 12, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(226,194,133,0.14)' },
  whyCol: { gap: 5 },
  whyTitle: { fontFamily: FONTS.bodyBold, fontSize: 12, letterSpacing: 0.6, color: COLORS.gold, textTransform: 'uppercase' },
  whyLine: { fontFamily: FONTS.body, fontSize: 12.5, lineHeight: 19, color: COLORS.textSecondary, textAlign: 'justify' },
  whyKet: { color: COLORS.textPrimary, fontFamily: FONTS.bodySemi },
  cross: { fontFamily: FONTS.bodySemi, fontSize: 12.5, lineHeight: 19, color: COLORS.goldLight },
  note: { fontFamily: FONTS.body, fontSize: 11.5, lineHeight: 17, color: COLORS.textMuted, textAlign: 'justify' },
  row: { gap: 3, padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.14)' },
  rowAgainst: { borderColor: TIER_COLORS.caution + '88' },
  rowHead: { fontFamily: FONTS.bodyBold, fontSize: 11, letterSpacing: 0.4, color: COLORS.gold, textTransform: 'uppercase' },
  rowTitle: { fontFamily: FONTS.bodySemi, fontSize: 13.5, lineHeight: 20, color: COLORS.goldLight, textAlign: 'justify' },
  rowMetaLabel: { fontFamily: FONTS.bodySemi, color: COLORS.textSecondary },
  rowBody: { fontFamily: FONTS.body, fontSize: 12.5, lineHeight: 18, color: COLORS.textPrimary, textAlign: 'justify' },
  rowMeta: { fontFamily: FONTS.body, fontSize: 11, lineHeight: 16, color: COLORS.textMuted, textAlign: 'justify' },
  fbBox: { gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(226,194,133,0.14)' },
  fbLabel: { fontFamily: FONTS.bodySemi, fontSize: 12, color: COLORS.textSecondary },
});
