/**
 * Escape user input so it can be embedded safely inside a RegExp
 * (used for MongoDB search/filter so users cannot inject regex operators).
 */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = escapeRegex;
