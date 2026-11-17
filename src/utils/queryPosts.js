/**
 * Filtering, searching, sorting and pagination for the in-memory / JSON-file
 * storage drivers. (The MongoDB driver does the same work inside the database.)
 *
 * `query` is the already-validated object produced by validateListQuery().
 */

const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'title', 'author', 'category'];

function compareValues(a, b, field) {
  // ISO-8601 timestamps sort correctly as plain strings.
  if (field === 'createdAt' || field === 'updatedAt') {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  return a.toLowerCase().localeCompare(b.toLowerCase());
}

function queryPosts(items, query = {}) {
  const { search, category, author, sort = 'createdAt', order = 'desc', page, limit } = query;

  // Remember insertion index so ordering is stable when values tie.
  let rows = items.map((post, index) => ({ post, index }));

  if (category) {
    const wanted = category.toLowerCase();
    rows = rows.filter(({ post }) => post.category.toLowerCase() === wanted);
  }

  if (author) {
    const wanted = author.toLowerCase();
    rows = rows.filter(({ post }) => post.author.toLowerCase() === wanted);
  }

  if (search) {
    const needle = search.toLowerCase();
    rows = rows.filter(({ post }) =>
      [post.title, post.content, post.author, post.category].some((value) =>
        value.toLowerCase().includes(needle)
      )
    );
  }

  const direction = order === 'asc' ? 1 : -1;
  rows.sort((a, b) => {
    let result = compareValues(a.post[sort], b.post[sort], sort);
    if (result === 0) result = a.index - b.index;
    return result * direction;
  });

  const total = rows.length;
  const paginated = page !== undefined || limit !== undefined;

  if (!paginated) {
    return { items: rows.map(({ post }) => ({ ...post })), total };
  }

  const currentPage = page ?? 1;
  const pageSize = limit ?? 10;
  const start = (currentPage - 1) * pageSize;

  return {
    items: rows.slice(start, start + pageSize).map(({ post }) => ({ ...post })),
    total,
    page: currentPage,
    limit: pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

module.exports = { queryPosts, SORTABLE_FIELDS };
