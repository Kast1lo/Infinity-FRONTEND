export interface StorageInfo {
  usedBytes:  number;
  limitBytes: number;
  percent:    number;
}

// Остаток ресурса по тарифу. limit === -1 означает «безлимит».
export interface CountInfo {
  used:  number;
  limit: number;
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
  tasks:          CountInfo;        // использовано/лимит задач (limit -1 = безлимит)
  ai:             CountInfo;        // AI-генераций сегодня / дневной лимит
  cardBound:      boolean;          // привязана ли карта
  cardLast4:      string | null;    // последние 4 цифры
  autoRenew:      boolean;          // включено ли автопродление
}