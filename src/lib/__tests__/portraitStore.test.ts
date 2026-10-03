jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Giả lập expo-file-system (API mới): tải "thành công" về thư mục tài liệu hiện tại.
jest.mock('expo-file-system', () => {
  class File {
    uri: string; exists = false;
    constructor(dir: { uri: string }, name: string) { this.uri = `${dir.uri}${name}`; }
    delete() { /* không làm gì */ }
    static async downloadFileAsync(_url: string, dest: File) { return dest; }
  }
  return { File, Paths: { document: { uri: 'file:///NEW/Documents/' } } };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addPortrait, listPortraits, galleryKeyOf } from '../portraitStore';

beforeEach(async () => { await AsyncStorage.clear(); });

describe('portraitStore — kho chân dung tách theo lá số', () => {
  it('đổi sang lá số khác rồi quay lại: ảnh của lá số cũ vẫn còn nguyên', async () => {
    const a = galleryKeyOf('chart-A');
    const b = galleryKeyOf('chart-B');
    await addPortrait(a, 'https://x/a1.png');
    await addPortrait(a, 'https://x/a2.png');

    // Sang lá số B: kho trống (chưa vẽ), vẽ thêm 1 ảnh cho B.
    expect(await listPortraits(b)).toHaveLength(0);
    await addPortrait(b, 'https://x/b1.png');
    expect(await listPortraits(b)).toHaveLength(1);

    // Quay lại lá số A: đủ 2 ảnh, không lẫn ảnh của B; ảnh mới nhất ở đầu.
    const listA = await listPortraits(a);
    expect(listA).toHaveLength(2);
    expect(listA.map(i => i.remote)).toEqual(['https://x/a2.png', 'https://x/a1.png']);
  });

  it('nhớ tên file + URL gốc, và hiển thị bằng thư mục tài liệu HIỆN TẠI (không phụ thuộc đường dẫn cũ)', async () => {
    const key = galleryKeyOf('chart-A');
    const saved = await addPortrait(key, 'https://x/p.png');
    expect(saved.file).toMatch(/^tuzi-portrait-\d+\.png$/);
    expect(saved.remote).toBe('https://x/p.png');
    expect(saved.uri).toBe(`file:///NEW/Documents/${saved.file}`);

    // Giả lập iOS đổi đường dẫn thư mục dữ liệu: mục đã lưu mang đường dẫn tuyệt đối CŨ.
    await AsyncStorage.setItem(`portraitGallery:${key}`, JSON.stringify([
      { id: '1', uri: 'file:///OLD/Containers/Documents/tuzi-portrait-1.png', file: 'tuzi-portrait-1.png', remote: 'https://x/p.png', createdAt: 1 },
    ]));
    const [it] = await listPortraits(key);
    expect(it.uri).toBe('file:///NEW/Documents/tuzi-portrait-1.png');
    expect(it.remote).toBe('https://x/p.png');
  });

  it('mục cũ (chưa có file/remote) vẫn đọc được, giữ nguyên uri', async () => {
    const key = galleryKeyOf('chart-A');
    await AsyncStorage.setItem(`portraitGallery:${key}`, JSON.stringify([
      { id: '1', uri: 'file:///OLD/legacy.png', createdAt: 1 },
    ]));
    const [it] = await listPortraits(key);
    expect(it.uri).toBe('file:///OLD/legacy.png');
  });

  it('thêm ảnh mới KHÔNG ghi đè đường dẫn cũ của các ảnh đã lưu bằng đường dẫn đã tính lại', async () => {
    const key = galleryKeyOf('chart-A');
    await AsyncStorage.setItem(`portraitGallery:${key}`, JSON.stringify([
      { id: '1', uri: 'file:///OLD/Documents/tuzi-portrait-1.png', file: 'tuzi-portrait-1.png', createdAt: 1 },
    ]));
    await addPortrait(key, 'https://x/new.png');
    const raw = JSON.parse((await AsyncStorage.getItem(`portraitGallery:${key}`)) as string);
    expect(raw).toHaveLength(2);
    expect(raw[1].uri).toBe('file:///OLD/Documents/tuzi-portrait-1.png');
  });

  it('chưa có chartId thì dùng nhóm guest', () => {
    expect(galleryKeyOf(undefined)).toBe('guest');
    expect(galleryKeyOf('')).toBe('guest');
    expect(galleryKeyOf('abc')).toBe('abc');
  });
});
