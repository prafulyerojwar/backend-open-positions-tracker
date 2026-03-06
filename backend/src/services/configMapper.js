// src/services/configMapper.js
export function feToDbColumns(fe = []) {
  const toInputType = (t) => {
    switch ((t || '').toLowerCase()) {
      case 'dropdown': return 'select';
      case 'number':   return 'number';
      case 'date':     return 'date';
      case 'text':
      default:         return 'text';
    }
  };
  return fe.map((c, idx) => ({
    key: c.field,
    label: c.headerName || c.field,
    input_type: toInputType(c.type),
    options: c.options ?? null,
    required: false,
    is_active: true,
    order_index: idx
  }));
}