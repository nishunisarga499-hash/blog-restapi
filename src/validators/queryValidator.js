/**
 * Validation + normalisation of the GET /posts query string.
 *
 *   ?search=text      case-insensitive match in title, content, author, category
 *   ?category=Tech    exact (case-insensitive) category
 *   ?author=Asha      exact (case-insensitive) author
 *   ?sort=createdAt   one of createdAt, updatedAt, title, author, category
 *                     (prefix with "-" for descending, e.g. sort=-title)
 *   ?order=asc|desc   direction (default: asc when sort given, otherwise newest first)
 *   ?page=1&limit=10  pagination (limit max 100). Pagination is only applied when
 *                     page or limit is supplied; otherwise ALL posts are returned.
 */
const ApiError = require('../utils/ApiError');
const { SORTABLE_FIELDS } = require('../utils/queryPosts');

const MAX_LIMIT = 100;
const MAX_TEXT = 100;

function readString(raw, name, errors) {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string') {
    errors.push({ field: name, message: `${name} must be provided only once` });
    return undefined;
  }
  const value = raw.trim();
  if (value.length === 0) return undefined; // treat empty as "not supplied"
  if (value.length > MAX_TEXT) {
    errors.push({ field: name, message: `${name} must be at most ${MAX_TEXT} characters long` });
    return undefined;
  }
  return value;
}

function readInteger(raw, name, { min, max }, errors) {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw.trim())) {
    errors.push({ field: name, message: `${name} must be a positive whole number` });
    return undefined;
  }
  const value = parseInt(raw, 10);
  if (value < min || (max !== undefined && value > max)) {
    errors.push({
      field: name,
      message: max !== undefined ? `${name} must be between ${min} and ${max}` : `${name} must be at least ${min}`,
    });
    return undefined;
  }
  return value;
}

function validateListQuery(rawQuery = {}) {
  const errors = [];
  const query = {};

  const search = readString(rawQuery.search, 'search', errors);
  const category = readString(rawQuery.category, 'category', errors);
  const author = readString(rawQuery.author, 'author', errors);
  if (search) query.search = search;
  if (category) query.category = category;
  if (author) query.author = author;

  // sort / order
  let sortField;
  let impliedOrder;
  const rawSort = readString(rawQuery.sort, 'sort', errors);
  if (rawSort) {
    impliedOrder = rawSort.startsWith('-') ? 'desc' : 'asc';
    sortField = rawSort.replace(/^[-+]/, '');
    if (!SORTABLE_FIELDS.includes(sortField)) {
      errors.push({ field: 'sort', message: `sort must be one of: ${SORTABLE_FIELDS.join(', ')}` });
      sortField = undefined;
    }
  }

  let order;
  const rawOrder = readString(rawQuery.order, 'order', errors);
  if (rawOrder) {
    order = rawOrder.toLowerCase();
    if (!['asc', 'desc'].includes(order)) {
      errors.push({ field: 'order', message: 'order must be "asc" or "desc"' });
      order = undefined;
    }
  }

  if (sortField) {
    query.sort = sortField;
    query.order = order || impliedOrder;
  } else {
    query.sort = 'createdAt';
    query.order = order || 'desc'; // default: newest first
  }

  // pagination
  const page = readInteger(rawQuery.page, 'page', { min: 1 }, errors);
  const limit = readInteger(rawQuery.limit, 'limit', { min: 1, max: MAX_LIMIT }, errors);
  if (page !== undefined) query.page = page;
  if (limit !== undefined) query.limit = limit;

  if (errors.length > 0) {
    throw ApiError.badRequest('Invalid query parameters', errors);
  }
  return query;
}

module.exports = { validateListQuery, MAX_LIMIT };
