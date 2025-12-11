export const splitExpression = (expr = '') => {
  const regex = /(.+?)\s*(==|!=|===|>=|<=|>|<)\s*(.+)/;
  const m = expr.match(regex);
  if (!m) return { field: '', operator: '==', value: '' };

  const stripQuotes = (str: string) => str.replace(/^['"]|['"]$/g, '').trim();
  return { field: stripQuotes(m[1]), operator: m[2], value: stripQuotes(m[3]) };
};