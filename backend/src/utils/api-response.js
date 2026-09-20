function timestamp() {
  return new Date().toISOString();
}

function successResponse(data, message = 'OK') {
  return {
    success: true,
    code: 'SUCCESS',
    data,
    message,
    timestamp: timestamp(),
  };
}

function errorResponse(code, message) {
  return {
    success: false,
    code,
    data: null,
    message,
    timestamp: timestamp(),
  };
}

module.exports = {
  errorResponse,
  successResponse,
};
