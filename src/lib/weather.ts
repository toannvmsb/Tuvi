/**
 * Thời tiết cơ bản — nguồn Open-Meteo (miễn phí, không cần API key, có CORS cho bản web,
 * có xác suất mưa và dự báo 16 ngày). Địa điểm lấy theo "nơi ở / nơi sinh" đã lưu cho lá số
 * của tôi; chưa có thì mặc định Hà Nội.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getMyChartId } from './myChart';

export interface Place { name: string; lat: number; lon: number }

export const DEFAULT_PLACE: Place = { name: 'Hà Nội', lat: 21.0285, lon: 105.8542 };

/** 63 tỉnh/thành để chọn (tọa độ trung tâm hành chính) — dùng cho danh sách chọn Nơi ở/Nơi sinh. */
export const PROVINCES: Place[] = [
  { name: 'An Giang', lat: 10.3711, lon: 105.4328 },
  { name: 'Bà Rịa - Vũng Tàu', lat: 10.346, lon: 107.0843 },
  { name: 'Bạc Liêu', lat: 9.2941, lon: 105.7278 },
  { name: 'Bắc Giang', lat: 21.2731, lon: 106.1946 },
  { name: 'Bắc Kạn', lat: 22.147, lon: 105.8348 },
  { name: 'Bắc Ninh', lat: 21.1861, lon: 106.0763 },
  { name: 'Bến Tre', lat: 10.2434, lon: 106.3756 },
  { name: 'Bình Dương', lat: 10.9804, lon: 106.6519 },
  { name: 'Bình Định', lat: 13.783, lon: 109.2197 },
  { name: 'Bình Phước', lat: 11.5349, lon: 106.8827 },
  { name: 'Bình Thuận', lat: 10.9289, lon: 108.1021 },
  { name: 'Cà Mau', lat: 9.1769, lon: 105.1524 },
  { name: 'Cần Thơ', lat: 10.0452, lon: 105.7469 },
  { name: 'Cao Bằng', lat: 22.6657, lon: 106.2522 },
  { name: 'Đà Nẵng', lat: 16.0544, lon: 108.2022 },
  { name: 'Đắk Lắk', lat: 12.6667, lon: 108.05 },
  { name: 'Đắk Nông', lat: 12.0033, lon: 107.6877 },
  { name: 'Điện Biên', lat: 21.386, lon: 103.023 },
  { name: 'Đồng Nai', lat: 10.9574, lon: 106.8426 },
  { name: 'Đồng Tháp', lat: 10.46, lon: 105.633 },
  { name: 'Gia Lai', lat: 13.9833, lon: 108.0 },
  { name: 'Hà Giang', lat: 22.8233, lon: 104.9836 },
  { name: 'Hà Nam', lat: 20.5411, lon: 105.9139 },
  { name: 'Hà Nội', lat: 21.0285, lon: 105.8542 },
  { name: 'Hà Tĩnh', lat: 18.3428, lon: 105.9057 },
  { name: 'Hải Dương', lat: 20.9373, lon: 106.3146 },
  { name: 'Hải Phòng', lat: 20.8449, lon: 106.6881 },
  { name: 'Hậu Giang', lat: 9.7845, lon: 105.4701 },
  { name: 'Hòa Bình', lat: 20.8171, lon: 105.3376 },
  { name: 'Hưng Yên', lat: 20.6464, lon: 106.0511 },
  { name: 'Khánh Hòa', lat: 12.2388, lon: 109.1967 },
  { name: 'Kiên Giang', lat: 10.0125, lon: 105.0809 },
  { name: 'Kon Tum', lat: 14.3497, lon: 108.0005 },
  { name: 'Lai Châu', lat: 22.3964, lon: 103.4582 },
  { name: 'Lâm Đồng', lat: 11.9404, lon: 108.4583 },
  { name: 'Lạng Sơn', lat: 21.8537, lon: 106.7615 },
  { name: 'Lào Cai', lat: 22.4809, lon: 103.9755 },
  { name: 'Long An', lat: 10.5359, lon: 106.4137 },
  { name: 'Nam Định', lat: 20.4388, lon: 106.1621 },
  { name: 'Nghệ An', lat: 18.6796, lon: 105.6813 },
  { name: 'Ninh Bình', lat: 20.2506, lon: 105.9745 },
  { name: 'Ninh Thuận', lat: 11.5643, lon: 108.9886 },
  { name: 'Phú Thọ', lat: 21.3227, lon: 105.402 },
  { name: 'Phú Yên', lat: 13.0955, lon: 109.3209 },
  { name: 'Quảng Bình', lat: 17.4689, lon: 106.622 },
  { name: 'Quảng Nam', lat: 15.5736, lon: 108.474 },
  { name: 'Quảng Ngãi', lat: 15.1205, lon: 108.7923 },
  { name: 'Quảng Ninh', lat: 20.9712, lon: 107.0448 },
  { name: 'Quảng Trị', lat: 16.8163, lon: 107.1003 },
  { name: 'Sóc Trăng', lat: 9.6037, lon: 105.98 },
  { name: 'Sơn La', lat: 21.3256, lon: 103.9188 },
  { name: 'Tây Ninh', lat: 11.31, lon: 106.098 },
  { name: 'Thái Bình', lat: 20.4463, lon: 106.3366 },
  { name: 'Thái Nguyên', lat: 21.5928, lon: 105.8442 },
  { name: 'Thanh Hóa', lat: 19.8067, lon: 105.7852 },
  { name: 'Thừa Thiên Huế', lat: 16.4637, lon: 107.5909 },
  { name: 'Tiền Giang', lat: 10.36, lon: 106.36 },
  { name: 'TP. Hồ Chí Minh', lat: 10.8231, lon: 106.6297 },
  { name: 'Trà Vinh', lat: 9.9347, lon: 106.3453 },
  { name: 'Tuyên Quang', lat: 21.8236, lon: 105.214 },
  { name: 'Vĩnh Long', lat: 10.2537, lon: 105.9722 },
  { name: 'Vĩnh Phúc', lat: 21.3089, lon: 105.6049 },
  { name: 'Yên Bái', lat: 21.7168, lon: 104.8986 },
];

// ─── Nơi ở theo lá số (lưu cục bộ) ───────────────────────────────────────────────

const PLACE_KEY = (chartId: string) => `chartPlace:${chartId}`;
const GUEST_PLACE_KEY = 'guestPlace';

export async function savePlaceForChart(chartId: string | null | undefined, place: Place | null): Promise<void> {
  try {
    const key = chartId ? PLACE_KEY(chartId) : GUEST_PLACE_KEY;
    if (place) await AsyncStorage.setItem(key, JSON.stringify(place));
    else await AsyncStorage.removeItem(key);
  } catch { /* bỏ qua */ }
}

function parsePlace(raw: string | null): Place | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (p && typeof p.lat === 'number' && typeof p.lon === 'number' && typeof p.name === 'string') return p;
  } catch { /* bỏ qua */ }
  return null;
}

/** Địa điểm của lá số "của tôi"; không có → Hà Nội. */
export async function getMyPlace(): Promise<Place> {
  try {
    const id = await getMyChartId();
    if (id) {
      const p = parsePlace(await AsyncStorage.getItem(PLACE_KEY(id)));
      if (p) return p;
    }
    const g = parsePlace(await AsyncStorage.getItem(GUEST_PLACE_KEY));
    if (g) return g;
  } catch { /* bỏ qua */ }
  return DEFAULT_PLACE;
}

// ─── Tìm địa điểm (geocoding) ────────────────────────────────────────────────────

export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=vi&format=json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const j = await res.json();
    return (j.results ?? []).map((r: any) => ({
      name: [r.name, r.admin1 && r.admin1 !== r.name ? r.admin1 : null, r.country].filter(Boolean).join(', '),
      lat: r.latitude, lon: r.longitude,
    }));
  } catch {
    return [];
  }
}

// ─── Dự báo ──────────────────────────────────────────────────────────────────────

export interface WeatherNow { temp: number; humidity: number; code: number; isDay: boolean; rainProb: number }
export interface WeatherDay {
  date: string;          // YYYY-MM-DD
  tmax: number; tmin: number;
  rainProb: number;      // % (cao nhất trong ngày)
  humidity: number;      // % (trung bình ngày)
  code: number;
}
export interface Weather { place: Place; now: WeatherNow; days: WeatherDay[]; fetchedAt: number }

const TTL_MS = 30 * 60 * 1000;
const CACHE_KEY = 'weatherCache:v1';

export function dateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function fetchWeather(place: Place, force = false): Promise<Weather | null> {
  const cacheId = `${place.lat.toFixed(2)},${place.lon.toFixed(2)}`;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw && !force) {
      const c = JSON.parse(raw);
      if (c.id === cacheId && Date.now() - c.data.fetchedAt < TTL_MS) return { ...c.data, place };
    }
  } catch { /* bỏ qua */ }

  try {
    const url = 'https://api.open-meteo.com/v1/forecast'
      + `?latitude=${place.lat}&longitude=${place.lon}&timezone=auto&forecast_days=16`
      + '&current=temperature_2m,relative_humidity_2m,weather_code,is_day'
      + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
      + '&hourly=relative_humidity_2m,precipitation_probability';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();

    // Độ ẩm trung bình theo ngày từ dữ liệu theo giờ.
    const humSum: Record<string, { s: number; n: number }> = {};
    (j.hourly?.time ?? []).forEach((t: string, i: number) => {
      const k = t.slice(0, 10);
      const v = j.hourly.relative_humidity_2m?.[i];
      if (typeof v === 'number') { (humSum[k] ??= { s: 0, n: 0 }); humSum[k].s += v; humSum[k].n += 1; }
    });
    const days: WeatherDay[] = (j.daily?.time ?? []).map((t: string, i: number) => ({
      date: t,
      tmax: Math.round(j.daily.temperature_2m_max[i]),
      tmin: Math.round(j.daily.temperature_2m_min[i]),
      rainProb: Math.round(j.daily.precipitation_probability_max?.[i] ?? 0),
      humidity: humSum[t] ? Math.round(humSum[t].s / humSum[t].n) : Math.round(j.current?.relative_humidity_2m ?? 0),
      code: j.daily.weather_code[i],
    }));

    // Xác suất mưa "hiện tại" = của giờ gần nhất.
    const hourIdx = (j.hourly?.time ?? []).indexOf((j.current?.time ?? '').slice(0, 13) + ':00');
    const now: WeatherNow = {
      temp: Math.round(j.current.temperature_2m),
      humidity: Math.round(j.current.relative_humidity_2m),
      code: j.current.weather_code,
      isDay: j.current.is_day === 1,
      rainProb: Math.round(hourIdx >= 0 ? (j.hourly.precipitation_probability?.[hourIdx] ?? 0) : (days[0]?.rainProb ?? 0)),
    };
    const data: Weather = { place, now, days, fetchedAt: Date.now() };
    try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ id: cacheId, data })); } catch { /* bỏ qua */ }
    return data;
  } catch {
    return null;
  }
}

/** Ngày cụ thể trong dự báo (null nếu ngoài 16 ngày tới hoặc đã qua). */
export function dayForecast(w: Weather | null, d: Date): WeatherDay | null {
  if (!w) return null;
  const k = dateKey(d);
  return w.days.find(x => x.date === k) ?? null;
}

// ─── Mô tả ───────────────────────────────────────────────────────────────────────

/** WMO weather code → nhãn tiếng Việt + emoji. */
export function describeWeather(code: number, isDay = true): { label: string; emoji: string; kind: 'nắng' | 'mây' | 'mưa' | 'khác' } {
  if (code === 0) return { label: isDay ? 'Trời nắng' : 'Trời quang', emoji: isDay ? '☀️' : '🌙', kind: 'nắng' };
  if (code === 1) return { label: 'Ít mây', emoji: isDay ? '🌤️' : '🌙', kind: 'nắng' };
  if (code === 2) return { label: 'Có mây', emoji: '⛅', kind: 'mây' };
  if (code === 3) return { label: 'Nhiều mây', emoji: '☁️', kind: 'mây' };
  if (code === 45 || code === 48) return { label: 'Sương mù', emoji: '🌫️', kind: 'khác' };
  if (code >= 51 && code <= 57) return { label: 'Mưa phùn', emoji: '🌦️', kind: 'mưa' };
  if (code >= 61 && code <= 67) return { label: code >= 65 ? 'Mưa to' : 'Có mưa', emoji: '🌧️', kind: 'mưa' };
  if (code >= 71 && code <= 77) return { label: 'Tuyết', emoji: '❄️', kind: 'khác' };
  if (code >= 80 && code <= 82) return { label: 'Mưa rào', emoji: '🌧️', kind: 'mưa' };
  if (code >= 95) return { label: 'Dông', emoji: '⛈️', kind: 'mưa' };
  return { label: 'Thay đổi', emoji: '⛅', kind: 'mây' };
}

// ─── Hook ────────────────────────────────────────────────────────────────────────

/** Tải thời tiết cho địa điểm của lá số "của tôi" (mặc định Hà Nội). Tự làm mới khi màn được dùng lại. */
export function useWeather(): { weather: Weather | null; place: Place; loading: boolean } {
  const [place, setPlace] = useState<Place>(DEFAULT_PLACE);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      const p = await getMyPlace();
      if (cancelled) return;
      setPlace(p);
      const w = await fetchWeather(p);
      if (cancelled) return;
      setWeather(w);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []));

  return { weather, place, loading };
}
