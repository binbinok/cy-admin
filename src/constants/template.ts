import type { CascaderOption, AddonOption } from '@/types/service';

export const BASE_ITEM_CASCADER_OPTIONS: CascaderOption[] = [
  {
    value: '美甲',
    label: '美甲',
    children: [
      { value: '基础款式', label: '基础款式' },
      { value: '简约款式', label: '简约款式' },
      { value: '轻奢款式', label: '轻奢款式' },
      { value: '高定款式', label: '高定款式' },
    ],
  },
  {
    value: '美足',
    label: '美足',
    children: [
      { value: '基础款式', label: '基础款式' },
      { value: '简约款式', label: '简约款式' },
      { value: '轻奢款式', label: '轻奢款式' },
      { value: '高定款式', label: '高定款式' },
    ],
  },
  {
    value: '美睫',
    label: '美睫',
    children: [
      { value: '日式美睫编织款', label: '日式美睫编织款' },
      { value: '仙女-妈生自然款', label: '仙女-妈生自然款' },
      { value: '私人定制穿插空气感系列', label: '私人定制穿插空气感系列' },
      { value: '国风-动物-动漫系列', label: '国风-动物-动漫系列' },
      { value: '下睫毛', label: '下睫毛' },
      { value: '其他', label: '其他' },
    ],
  },
  {
    value: '手护',
    label: '手护',
  },
  {
    value: '脚护',
    label: '脚护',
  },
  {
    value: '修眉',
    label: '修眉',
  },
];

export const ADDON_OPTIONS: AddonOption[] = [
  { value: '卸甲', label: '卸甲' },
  { value: '前置处理', label: '前置处理' },
  { value: '加固', label: '加固' },
  { value: '加钻', label: '加钻' },
  { value: '跳色', label: '跳色' },
  { value: '手绘', label: '手绘' },
];

export function getCategoryLabel(path: string[]): string {
  return path[0] ?? '';
}

export function getStyleLabel(path: string[]): string {
  return path.length >= 2 ? path[1] : path[0];
}