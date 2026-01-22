export type UniformItem = {
  id?: string;
  kind: string;
  quantity: number;
  sizes: string[];
};

export interface Uniform {
  id: string;
  name: string;
  description: string;
  sizes: string[];
  items?: UniformItem[];
  price: number;
  imageSrc?: string;
  imageAlt?: string;
}
