/**
 * Cầu nối mở modal Chat AI (AiChatBubble, mount 1 lần ở App.tsx) từ NƠI KHÁC
 * trong app (vd nút "Hỏi Tuzi" ở Home) mà không cần Context/Navigation.
 */
let opener: (() => void) | null = null;

export function registerAiChatOpener(fn: (() => void) | null) {
  opener = fn;
}

export function openAiChat() {
  opener?.();
}
