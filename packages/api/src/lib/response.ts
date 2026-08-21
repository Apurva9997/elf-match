const corsHeaders = {
  "Access-Control-Allow-Origin":
    process.env.FRONTEND_URL || "http://localhost:3000",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function success<T>(data: T, statusCode = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export function error(
  message: string,
  statusCode = 400,
  code?: string
): Response {
  return new Response(
    JSON.stringify({ success: false, error: { message, code } }),
    {
      status: statusCode,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    }
  );
}

export function unauthorized(message = "Unauthorized"): Response {
  return error(message, 401, "UNAUTHORIZED");
}

export function forbidden(message = "Forbidden"): Response {
  return error(message, 403, "FORBIDDEN");
}

export function notFound(message = "Not found"): Response {
  return error(message, 404, "NOT_FOUND");
}

export function serverError(message = "Internal server error"): Response {
  return error(message, 500, "SERVER_ERROR");
}
