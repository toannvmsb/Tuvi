/**
 * Gợi ý NGÀNH NGHỀ / LĨNH VỰC cụ thể theo chính tinh (chuẩn Tử Vi Nam Phái — tham khảo thực tiễn).
 * Dùng chung cho cả phân tích Nâng cao (offline) và Phân tích AI, để mọi nơi tư vấn nghề
 * đều đưa ra ĐỊNH HƯỚNG CỤ THỂ thay vì nói chung chung ("nghề trí tuệ", "hợp kinh doanh").
 */
import type { AstrologyResult, TuViHouse } from '../types';

export const CHINH_TINH_CAREER: Record<string, string[]> = {
  'Tử Vi': ['lãnh đạo, quản lý cấp cao', 'hành chính, điều hành tổ chức', 'chính trị, nhân sự cấp cao'],
  'Thiên Phủ': ['tài chính, ngân hàng, kế toán', 'quản lý kho quỹ, hậu cần', 'bất động sản, quản trị tài sản'],
  'Vũ Khúc': ['tài chính, ngân hàng, đầu tư', 'kế toán, kiểm toán', 'kim khí – cơ khí – kỹ thuật', 'quân đội, công an'],
  'Thiên Tướng': ['tư vấn, cố vấn, trung gian', 'hành chính, thư ký, trợ lý', 'ngoại giao, dịch vụ, ẩm thực – thời trang'],
  'Liêm Trinh': ['quản lý, pháp luật, kỷ luật', 'kỹ thuật, công nghệ', 'hành chính công, an ninh'],
  'Thất Sát': ['quân đội, công an, an ninh', 'thể thao, kỹ thuật – cơ khí', 'khởi nghiệp, ngành cạnh tranh cao'],
  'Phá Quân': ['kinh doanh tự do, khởi nghiệp', 'xây dựng, vận tải, sản xuất', 'ngành cải cách – sáng tạo phá cách'],
  'Tham Lang': ['kinh doanh, giao tế, marketing', 'giải trí, truyền thông, quan hệ công chúng', 'ẩm thực, ngành dịch vụ – xã giao'],
  'Thiên Cơ': ['tư vấn, cố vấn, lập kế hoạch', 'công nghệ thông tin, kỹ thuật', 'giáo dục, nghiên cứu, môi giới'],
  'Thái Âm': ['tài chính, bất động sản', 'nghệ thuật, văn hóa, thiết kế', 'chăm sóc, dịch vụ, ngành liên quan nữ giới'],
  'Thiên Đồng': ['dịch vụ, chăm sóc khách hàng, phúc lợi', 'ẩm thực, giải trí', 'sáng tạo nhẹ nhàng, nội dung'],
  'Thiên Lương': ['y – dược, chăm sóc sức khỏe', 'giáo dục, tư vấn, pháp luật', 'giám sát, kiểm định, từ thiện'],
  'Cự Môn': ['luật sư, giảng dạy, đào tạo', 'truyền thông, MC, bán hàng', 'ngành dùng lời nói – đàm phán, ẩm thực'],
  'Thái Dương': ['lãnh đạo, quản lý, chính trị', 'giáo dục, truyền thông, diễn thuyết', 'ngành công khai – danh tiếng, năng lượng – điện'],
};

const chinhTinhNames = (h?: TuViHouse): string[] =>
  h ? h.stars.filter(s => s.type === 'chinh').map(s => s.name) : [];

/** Gộp danh sách ngành nghề (không trùng) cho một bộ chính tinh. */
export function careerFieldsFor(names: string[]): string[] {
  const out: string[] = [];
  for (const n of names) for (const f of (CHINH_TINH_CAREER[n] || [])) if (!out.includes(f)) out.push(f);
  return out;
}

export interface CareerProfile { names: string[]; src: string; fields: string[] }

/** Hồ sơ nghề của lá số: ưu tiên chính tinh cung Quan Lộc, fallback cung Mệnh. */
export function careerProfile(result: AstrologyResult): CareerProfile | null {
  const houses = result.tuViChart.houses;
  const quan = houses.find(h => h.palaceName === 'Quan Lộc');
  const menh = houses.find(h => h.isManh);
  let names = chinhTinhNames(quan);
  let src = 'cung Quan Lộc';
  if (!names.length) { names = chinhTinhNames(menh); src = 'cung Mệnh (vì Quan Lộc vô chính diệu)'; }
  const fields = careerFieldsFor(names);
  if (!names.length || !fields.length) return null;
  return { names, src, fields };
}

/** Câu gợi ý nghề đã định dạng (dùng cho bản Nâng cao offline). */
export function careerSuggestion(result: AstrologyResult): string {
  const p = careerProfile(result);
  if (!p) return '';
  return `Theo chính tinh **${p.names.join(', ')}** tại ${p.src}, hợp với lĩnh vực: ${p.fields.slice(0, 6).join('; ')}.`;
}
