# Tử Vi & Bát Tự - Hướng dẫn cài đặt

## Yêu cầu
- Node.js 18+ (tải từ https://nodejs.org)
- Expo Go app trên điện thoại (iOS / Android)

## Cài đặt và chạy

```bash
# 1. Vào thư mục project
cd tuvi-app

# 2. Cài packages
npm install

# 3. Chạy Expo dev server
npx expo start
```

Sau khi chạy, quét QR code bằng app **Expo Go** để xem trên điện thoại.

## Cấu hình AI

1. Vào Settings trong app
2. Nhập Anthropic API key (lấy tại https://console.anthropic.com)
3. Nhấn Lưu

## Build APK (Android)

```bash
npx eas build -p android --profile preview
```

## Build IPA (iOS)

```bash
npx eas build -p ios --profile preview
```

## Cấu trúc thư mục

```
tuvi-app/
├── src/
│   ├── core/           # Thuật toán tính Tử Vi, Bát Tự, Đại Vận
│   ├── screens/        # Các màn hình chính
│   ├── components/     # UI components (charts)
│   ├── data/           # Dữ liệu sao, Nạp Âm
│   ├── api/            # Claude AI integration
│   └── i18n/           # Tiếng Việt + English
└── App.tsx
```

## Tính năng

- ☯ Lá số Tử Vi Nam Phái (Lê Quang Lăng)
- ⊞ Bát Tự - Tứ Trụ
- 📖 Phân tích AI bởi Claude Sonnet 4.6
- 💰 Biểu đồ tài lộc theo Đại Vận 9 giai đoạn
- 🌐 Song ngữ Việt / English
