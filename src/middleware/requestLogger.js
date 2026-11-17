/**
 * Custom logging middleware: prints "<time> <METHOD> <url> <status> <ms>"
 * once the response has been sent.
 */
function requestLogger(enabled = true) {
  return (req, res, next) => {
    if (!enabled) return next();

    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      console.log(
        `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`
      );
    });
    next();
  };
}

module.exports = requestLogger;
