// === 班级列表 ===
export const CLASS_LIST = [
  '蒲托班',
  '蒲小班',
  '蒲中一班',
  '蒲中二班',
  '蒲大一班',
  '蒲大二班',
  '蒲中一',
  '蒲中二',
  '蒲大一',
  '蒲大二',
  '建托班',
  '建小班',
  '建中一',
  '建中二',
  '建大一',
  '建大二',
] as const;

export type ClassName = (typeof CLASS_LIST)[number];
