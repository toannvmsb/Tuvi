/** 132746 -> 132.746 (dấu chấm ngăn cách hàng nghìn, kiểu Việt Nam; không phụ thuộc Intl). */
export const formatXu = (n: number): string =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
