export interface StorageInfo {
  usedBytes:  number;
  limitBytes: number;
  percent:    number;
}

export interface PlanInfo {
  planType:       string;           // spark | pulse | horizon | eternal
  planLabel:      string;           // Infinity Spark, Infinity Eternal...
  planExpiresAt:  string | null;    // ISO дата
  isFrozen:       boolean;
  frozenAt:       string | null;
  daysLeft:       number | null;    // для spark — дней до конца триала
  freezeDaysLeft: number | null;    // для frozen — дней до удаления данных
  storage:        StorageInfo;
}