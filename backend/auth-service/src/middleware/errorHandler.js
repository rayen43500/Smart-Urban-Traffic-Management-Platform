function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err && err.name === "ZodError") {
    return res.status(400).json({
      message: "Validation error",
      details: err.errors.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
    });
  }

  const status = err.status || 500;
  const message = err.message || "Internal server error";
  return res.status(status).json({ message });
}

module.exports = errorHandler;
