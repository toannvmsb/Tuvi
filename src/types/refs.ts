/** Kiểu instance cho ref của View/ScrollView/TextInput — RN 0.88 (SDK 58) không còn cho dùng chính component làm kiểu ref. */
import type { ComponentRef } from 'react';
import type { View, ScrollViewInstance, TextInputInstance } from 'react-native';

export type ViewRef = ComponentRef<typeof View>;
export type ScrollRef = ScrollViewInstance;
export type TextInputRef = TextInputInstance;
