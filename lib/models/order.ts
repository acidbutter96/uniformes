export interface Order {
  id: string;
  userName: string;
  schoolId: string;
  uniformId: string;
  measurements: Record<string, number>;
  suggestedSize: string;
  createdAt: string;
}
