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
