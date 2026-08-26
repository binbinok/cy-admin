export interface Service {
  _id: string;
  name: string;
  category: string;
  price: number; // 分
  duration: number; // minutes
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface ServiceCategory {
  _id: string;
  code: string;
  name: string;
  aliases: string[];
  active: boolean;
  sort: number;
  createdAt: Date;
  updatedAt: Date;
}
export interface CascaderOption {
  value: string;
  label: string;
  children?: CascaderOption[];
}
export interface AddonOption {
  value: string;
  label: string;
}
export type TemplateInputType = 'single_select' | 'multi_select' | 'number' | 'text';
export interface TemplateItem {
  itemId: string;
  name: string;
  inputType: TemplateInputType;
  options: string[];
  defaultPrice: number; // 分
  defaultDuration: number; // 分钟
  discountable: boolean;
  commissionable: boolean;
  enabled: boolean;
}
export interface ServiceTemplate {
  _id: string;
  categoryId: string;
  categoryName: string;
  defaultDuration: number; // 默认预约时长（分钟）
  baseItems: TemplateItem[];
  addonItems: TemplateItem[];
  active: boolean;
  sort: number;
  createdAt: Date;
  updatedAt: Date;
}
