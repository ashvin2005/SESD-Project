'use strict';


function successResponse(data, meta = null) {
  const response = { success: true, data };
  if (meta) response.meta = meta;
  return response;
}


function errorResponse(message, code = 'ERROR', details = null) {
  const response = { success: false, error: { code, message } };
  if (details) response.error.details = details;
  return response;
}


function paginationMeta(total, limit, offset, nextCursor = null) {
  return {
    total,
    limit,
    offset,
    has_more: offset + limit < total,
    next_cursor: nextCursor,
  };
}

module.exports = { successResponse, errorResponse, paginationMeta };
