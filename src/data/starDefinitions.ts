export type StarType = 'chinh' | 'cat' | 'hung' | 'trung' | 'luu';

export interface StarDef {
  name: string;
  nameEn: string;
  type: StarType;
  description: string;
  descriptionEn: string;
}

// 14 Chính Tinh (Main Stars)
export const CHINH_TINH: StarDef[] = [
  { name: 'Tử Vi', nameEn: 'Purple Star', type: 'chinh', description: 'Chủ tinh bắc đẩu, đại diện cho quyền uy, địa vị', descriptionEn: 'North Star of power and authority' },
  { name: 'Thiên Cơ', nameEn: 'Heavenly Machine', type: 'chinh', description: 'Sao trí tuệ, linh hoạt, tư mưu', descriptionEn: 'Star of intelligence and flexibility' },
  { name: 'Thái Dương', nameEn: 'Sun', type: 'chinh', description: 'Sao mặt trời, quý nhân, công danh', descriptionEn: 'Sun star, nobility and fame' },
  { name: 'Vũ Khúc', nameEn: 'Martial Arts', type: 'chinh', description: 'Sao tài chính, hành động, cương nghị', descriptionEn: 'Finance and decisive action' },
  { name: 'Thiên Đồng', nameEn: 'Heavenly Unity', type: 'chinh', description: 'Sao phúc đức, hưởng thụ, thụ động', descriptionEn: 'Fortune and enjoyment' },
  { name: 'Liêm Trinh', nameEn: 'Pure Virtue', type: 'chinh', description: 'Sao quan lộc, quyền uy nhưng nghiêm khắc', descriptionEn: 'Official career and strict authority' },
  { name: 'Thiên Phủ', nameEn: 'Heavenly Treasury', type: 'chinh', description: 'Kho trời, tài lộc, phúc thọ', descriptionEn: 'Heavenly treasury of wealth and longevity' },
  { name: 'Thái Âm', nameEn: 'Moon', type: 'chinh', description: 'Sao mặt trăng, tình cảm, nữ tính', descriptionEn: 'Moon star, emotions and femininity' },
  { name: 'Tham Lang', nameEn: 'Greedy Wolf', type: 'chinh', description: 'Sao dục vọng, đào hoa, thay đổi', descriptionEn: 'Desire, romance and change' },
  { name: 'Cự Môn', nameEn: 'Giant Gate', type: 'chinh', description: 'Sao khẩu thiệt, thị phi, luận lý', descriptionEn: 'Disputes, debates and logic' },
  { name: 'Thiên Tướng', nameEn: 'Heavenly General', type: 'chinh', description: 'Sao ấn thụ, văn chương, hỗ trợ', descriptionEn: 'Documentation and support' },
  { name: 'Thiên Lương', nameEn: 'Heavenly Roof Beam', type: 'chinh', description: 'Sao ân đức, y dược, bảo hộ', descriptionEn: 'Grace, medicine and protection' },
  { name: 'Thất Sát', nameEn: 'Seven Killings', type: 'chinh', description: 'Sao sát phạt, quyết đoán, xung phá', descriptionEn: 'Decisive killing star with conflicts' },
  { name: 'Phá Quân', nameEn: 'Broken Army', type: 'chinh', description: 'Sao phá hoại, cải cách, tiêu hao', descriptionEn: 'Destruction and reform' },
];

// Key Auxiliary Stars (Phụ Tinh)
export const PHU_TINH_CAT: StarDef[] = [
  { name: 'Tả Phù', nameEn: 'Left Support', type: 'cat', description: 'Quý nhân phù trợ bên trái', descriptionEn: 'Noble helper on the left' },
  { name: 'Hữu Bật', nameEn: 'Right Support', type: 'cat', description: 'Quý nhân phù trợ bên phải', descriptionEn: 'Noble helper on the right' },
  { name: 'Văn Xương', nameEn: 'Literary Star', type: 'cat', description: 'Sao văn học, thi cử', descriptionEn: 'Literature and examinations' },
  { name: 'Văn Khúc', nameEn: 'Literary Melody', type: 'cat', description: 'Sao nghệ thuật, âm nhạc', descriptionEn: 'Arts and music' },
  { name: 'Thiên Khôi', nameEn: 'Heavenly Leader', type: 'cat', description: 'Thiên ất quý nhân', descriptionEn: 'Heavenly noble person' },
  { name: 'Thiên Việt', nameEn: 'Heavenly Yue', type: 'cat', description: 'Địa ất quý nhân', descriptionEn: 'Earthly noble person' },
  { name: 'Lộc Tồn', nameEn: 'Existing Salary', type: 'cat', description: 'Sao tài lộc, bổng lộc', descriptionEn: 'Wealth and salary star' },
  { name: 'Thiên Mã', nameEn: 'Heavenly Horse', type: 'cat', description: 'Sao di chuyển, thay đổi, xuất ngoại', descriptionEn: 'Movement, travel and change' },
  { name: 'Hóa Lộc', nameEn: 'Transform Wealth', type: 'cat', description: 'Tứ hóa: tài lộc, may mắn', descriptionEn: 'Four transforms: wealth and luck' },
  { name: 'Hóa Quyền', nameEn: 'Transform Power', type: 'cat', description: 'Tứ hóa: quyền uy, địa vị', descriptionEn: 'Four transforms: power and status' },
  { name: 'Hóa Khoa', nameEn: 'Transform Achievement', type: 'cat', description: 'Tứ hóa: danh tiếng, khoa bảng', descriptionEn: 'Four transforms: fame and achievement' },
  { name: 'Thiên Hình', nameEn: 'Heavenly Punishment', type: 'cat', description: 'Pháp lý, kỷ luật', descriptionEn: 'Law and discipline' },
  { name: 'Thiên Riêu', nameEn: 'Heavenly Seduction', type: 'cat', description: 'Đào hoa, duyên số', descriptionEn: 'Romance and relationships' },
];

export const PHU_TINH_HUNG: StarDef[] = [
  { name: 'Hóa Kỵ', nameEn: 'Transform Taboo', type: 'hung', description: 'Tứ hóa: khắc kỵ, trở ngại', descriptionEn: 'Four transforms: obstacles and conflicts' },
  { name: 'Kình Dương', nameEn: 'Goat Blade', type: 'hung', description: 'Sao xung phá, chinh chiến', descriptionEn: 'Conflict and battles' },
  { name: 'Đà La', nameEn: 'Trapping Net', type: 'hung', description: 'Sao cản trở, trì hoãn', descriptionEn: 'Obstacles and delays' },
  { name: 'Hỏa Tinh', nameEn: 'Fire Star', type: 'hung', description: 'Xung đột bạo lực', descriptionEn: 'Violence and conflicts' },
  { name: 'Linh Tinh', nameEn: 'Ling Star', type: 'hung', description: 'Hung hăng, bất ổn', descriptionEn: 'Aggression and instability' },
  { name: 'Thiên Không', nameEn: 'Heavenly Void', type: 'hung', description: 'Hao tán, trống rỗng', descriptionEn: 'Loss and emptiness' },
  { name: 'Địa Kiếp', nameEn: 'Earth Robbery', type: 'hung', description: 'Mất mát, bị cướp', descriptionEn: 'Loss and robbery' },
  { name: 'Tuần Không', nameEn: 'Cycle Void', type: 'hung', description: 'Lục tuần không vong', descriptionEn: 'Void within the cycle' },
  { name: 'Triệt Lộ', nameEn: 'Cut Path', type: 'hung', description: 'Cắt đứt lộ trình', descriptionEn: 'Path blocked' },
  { name: 'Thiên Khốc', nameEn: 'Heavenly Cry', type: 'hung', description: 'Tang tóc, buồn bã', descriptionEn: 'Mourning and sadness' },
  { name: 'Thiên Hư', nameEn: 'Heavenly Emptiness', type: 'hung', description: 'Ảo vọng, thất vọng', descriptionEn: 'Illusions and disappointment' },
];

// Stars for Lưu vận (flowing cycles)
export const LUU_TINH: StarDef[] = [
  { name: 'Lưu Lộc', nameEn: 'Flowing Wealth', type: 'luu', description: 'Lộc theo lưu niên', descriptionEn: 'Annual wealth star' },
  { name: 'Lưu Mã', nameEn: 'Flowing Horse', type: 'luu', description: 'Thiên mã lưu niên', descriptionEn: 'Annual horse star' },
  { name: 'Lưu Đại Vận', nameEn: 'Major Cycle Star', type: 'luu', description: 'Sao đại vận', descriptionEn: 'Major cycle star' },
  { name: 'Lưu Tiểu Vận', nameEn: 'Minor Cycle Star', type: 'luu', description: 'Sao tiểu vận', descriptionEn: 'Minor cycle star' },
];

export const ALL_STARS: StarDef[] = [...CHINH_TINH, ...PHU_TINH_CAT, ...PHU_TINH_HUNG, ...LUU_TINH];

export function getStarDef(name: string): StarDef | undefined {
  return ALL_STARS.find(s => s.name === name);
}
