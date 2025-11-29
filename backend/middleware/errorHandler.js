const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = { ...err };
  error.message = err.message;

  // MySQL duplicate entry error
  if (err.code === 'ER_DUP_ENTRY') {
    const message = 'Duplicate entry found';
    error = { message, status: 400 };
  }

  // MySQL connection error
  if (err.code === 'ECONNREFUSED') {
    const message = 'Database connection refused';
    error = { message, status: 503 };
  }

  res.status(error.status || 500).json({
    status: 'error',
    message: error.message || 'Internal Server Error'
  });
};

module.exports = errorHandler;