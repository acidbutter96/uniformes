export type UniformItem = {
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
  imageSrc?: string;
  imageAlt?: string;
}
