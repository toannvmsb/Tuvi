/**
 * Nhãn tiếng Việt thuần cho người dùng — IntensityLevel/ConfidenceLevel/TimeSource là NHÃN KỸ
 * THUẬT nội bộ (dùng để xếp hạng, quyết định ngưỡng hiển thị), KHÔNG được lộ ra màn hình dạng
 * gốc (vd "MODERATE", "VERY_HIGH"). Nơi nào cần nói cho người dùng thì lấy nhãn ở đây.
 */
import type { ConfidenceLevel, EventPhase, IntensityLevel, TimeSource, TimingIntensity } from './types';

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

/** §25 TUZI_Monthly_Event_Timing_Engine_v2.md — cường độ THỜI ĐIỂM (khác cường độ SỰ KIỆN ở trên). */
export const TIMING_INTENSITY_VN: Record<TimingIntensity, string> = {
  NOTABLE: 'đáng chú ý',
  ACTIVITY: 'cửa sổ hoạt động',
  STRONG: 'cửa sổ tác động mạnh',
  VERY_STRONG: 'cửa sổ tác động rất mạnh',
};

/** §29 — giai đoạn sự kiện, suy từ hóa tinh chiếm ưu thế trong tháng. */
export const EVENT_PHASE_VN: Record<EventPhase, string> = {
  NONE: '',
  ONSET: 'giai đoạn khởi phát, cơ hội/mối quan hệ mới bắt đầu mở ra',
  PEAK: 'giai đoạn hành động, cần chủ động thúc đẩy vì áp lực/trách nhiệm tăng lên',
  FORMALIZATION: 'giai đoạn chốt lại, ký kết, công nhận chính thức',
  PRESSURE: 'giai đoạn cần thận trọng, dễ phát sinh vướng mắc hoặc trì hoãn',
  RESOLUTION: 'giai đoạn giải quyết dứt điểm việc còn tồn đọng',
};
