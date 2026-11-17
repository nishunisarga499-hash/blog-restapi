# API Testing Results

Recorded on 16 Nov 2026 with Node.js v22 on Linux.

## 1. Automated test suite (`npm test`)

Runner: Node's built-in `node:test` + `supertest` (in-process, `memory` and `file` storage drivers).

| Metric | Result |
|--------|--------|
| Suites | 11 |
| Tests | 77 |
| Passed | 77 |
| Failed | 0 |

| Suite | Covers |
|-------|--------|
| `POST /posts` | 201 + `Location` header, trimming, read-only fields ignored, missing / short / long / empty / non-string fields, unknown fields, array body, missing body, malformed JSON, 413 oversized body |
| `GET /posts/:id` | 200, 404 for unknown id, 400 for malformed id |
| `PUT / PATCH /posts/:id` | full update, single-field update, `createdAt` kept / `updatedAt` refreshed, id/createdAt not changeable, persisted, empty body 400, invalid values 400, 404, malformed id 400 |
| `DELETE /posts/:id` | 200 with deleted post, post really gone, second delete 404, unknown id 404, malformed id 400 |
| `GET /posts` listing | empty list, all posts without pagination, newest first, pagination, beyond last page, category / author filter, search (incl. regex characters treated literally), combined filters, sorting, invalid `page` / `limit` / `sort` / `order`, repeated parameter |
| Auth | register (no password in response), duplicate email 409, validation, 72-char bcrypt limit, login, identical 401 for wrong password vs unknown email, `/auth/me` |
| Protected writes (`AUTH_REQUIRED=true`) | reads stay public, write routes return 401 without token, work with token, garbage / malformed / wrongly-signed / expired / `alg=none` tokens rejected, auth runs before validation |
| Rate limiting | 429 after the configured number of attempts |
| System | `/health`, `/`, JSON 404 for unknown routes, Swagger UI + OpenAPI JSON, security headers, 500 errors do not leak internals, config validation |
| JSON file driver | data persisted to disk and reloaded after a "restart", update/delete persisted, 25 concurrent writes with no data lost, corrupted data file refused with a clear error |

Sanity check of the suite itself: temporarily disabling the write-protection middleware made 7 of the protected-write
tests fail, confirming the tests actually detect regressions (the change was reverted afterwards).

## 2. Postman collection (`postman/blog-rest-api.postman_collection.json`)

Executed with **newman** against a real server process (`STORAGE_DRIVER=file`), once per auth mode.

| Run | Requests | Test scripts | Assertions | Failed |
|-----|----------|--------------|------------|--------|
| `AUTH_REQUIRED=false` | 27 | 27 | 55 | 0 |
| `AUTH_REQUIRED=true` | 27 | 27 | 55 | 0 |

Requests in the collection, in order:

1. **System:** health check
2. **Auth:** register, duplicate email (409), invalid input (400), login, wrong password (401), current user
3. **Posts:** create, create second, get all, get all paginated, search, filter by category, sort descending,
   invalid page (400), get one, get unknown (404), get invalid id (400), update with PUT, update with PATCH,
   update validation error (400), update empty body (400), update unknown (404), create validation error (400),
   delete, get deleted (404), delete again (404)

## 3. Not covered

- The **MongoDB driver** was not exercised against a live MongoDB server in this environment. Its models, id validation
  and query construction were checked offline only. Run the Postman collection with `STORAGE_DRIVER=mongo` and a real
  `MONGODB_URI` to verify it in your own setup.
- No load / performance testing was performed.
