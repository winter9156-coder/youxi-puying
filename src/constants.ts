// === 班级列表 ===
export const CLASS_LIST = [
  '蒲托班',
  '蒲小班',
  '蒲中一班',
  '蒲中二班',
  '蒲大一班',
  '蒲大二班',
  '建小一班',
  '建小二班',
  '建中一班',
  '建中二班',
  '建大一班',
  '建大二班',
] as const;

export type ClassName = (typeof CLASS_LIST)[number];
