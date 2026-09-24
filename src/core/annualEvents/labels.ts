/**
 * Nhãn tiếng Việt thuần cho người dùng — IntensityLevel/ConfidenceLevel/TimeSource là NHÃN KỸ
 * THUẬT nội bộ (dùng để xếp hạng, quyết định ngưỡng hiển thị), KHÔNG được lộ ra màn hình dạng
 * gốc (vd "MODERATE", "VERY_HIGH"). Nơi nào cần nói cho người dùng thì lấy nhãn ở đây.
 */
import type { ConfidenceLevel, IntensityLevel, TimeSource } from './types';

export const INTENSITY_VN: Record<IntensityLevel, string> = {
  VERY_LOW: 'rất ít biến động',
  LOW: 'ít biến động',
  MODERATE: 'biến động vừa phải',
  HIGH: 'khá nhiều biến động',
  VERY_HIGH: 'biến động mạnh',
};

/** Diễn giải độ tin cậy (mức đồng thuận giữa các dữ kiện) sang câu tự nhiên — không hiện nhãn gốc. */
export const CONFIDENCE_VN: Record<ConfidenceLevel, string> = {
  LOW: 'các dữ kiện chưa đồng nhất, nên xem là tham khảo thêm',
  MEDIUM: 'các dữ kiện khá đồng nhất',
  HIGH: 'nhiều dữ kiện cùng chỉ về một hướng',
  VERY_HIGH: 'rất nhiều dữ kiện độc lập cùng chỉ về một hướng',
};

export const LAYER_VN: Record<TimeSource, string> = {
  NATAL: 'bản mệnh', DA_HAN: 'đại vận', ANNUAL: 'lưu niên (năm nay)', MONTHLY: 'lưu nguyệt (tháng)',
};
