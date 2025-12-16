import type { APIGatewayProxyResult } from "aws-lambda";

const corsHeaders = {
  "Access-Control-Allow-Origin":
    process.env.FRONTEND_URL || "http://localhost:3000",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function success<T>(data: T, statusCode = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
    body: JSON.stringify({ success: true, data }),
  };
}

export function error(
  message: string,
  statusCode = 400,
  code?: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
    body: JSON.stringify({
      success: false,
      error: { message, code },
    }),
  };
}

export function unauthorized(message = "Unauthorized"): APIGatewayProxyResult {
  return error(message, 401, "UNAUTHORIZED");
}

export function forbidden(message = "Forbidden"): APIGatewayProxyResult {
  return error(message, 403, "FORBIDDEN");
}

export function notFound(message = "Not found"): APIGatewayProxyResult {
  return error(message, 404, "NOT_FOUND");
}

export function serverError(
  message = "Internal server error"
): APIGatewayProxyResult {
  return error(message, 500, "SERVER_ERROR");
}
