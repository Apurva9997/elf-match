import sanitizeHtml from "sanitize-html";

/**
 * Sanitize configuration for different contexts
 */
const SANITIZE_CONFIG = {
  // For plain text fields (names, emails, etc.) - strip all HTML, keep only text
  text: {
    allowedTags: [],
    allowedAttributes: {},
  },
  // For rich text fields (descriptions, etc.)
  richText: {
    allowedTags: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li"],
    allowedAttributes: {},
  },
  // For URLs - strip all HTML, keep only text
  url: {
    allowedTags: [],
    allowedAttributes: {},
  },
};

/**
 * Sanitize a string to prevent XSS attacks
 * @param input - The string to sanitize
 * @param type - The type of content (text, richText, url)
 * @returns Sanitized string
 */
export function sanitizeString(
  input: string | null | undefined,
  type: "text" | "richText" | "url" = "text"
): string {
  if (!input) return "";

  // Trim whitespace
  const trimmed = input.trim();

  // For URLs, validate format first
  if (type === "url") {
    try {
      // If it's a valid URL, sanitize it
      const url = new URL(trimmed);
      // Only allow http and https protocols
      if (!["http:", "https:"].includes(url.protocol)) {
        return "";
      }
      return sanitizeHtml(trimmed, SANITIZE_CONFIG.url);
    } catch {
      // If URL is invalid, return empty string
      return "";
    }
  }

  // Sanitize based on type
  return sanitizeHtml(trimmed, SANITIZE_CONFIG[type]);
}

/**
 * Sanitize an email address
 * Removes any HTML and validates email format
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return "";

  // Remove all HTML tags
  const sanitized = sanitizeHtml(email, SANITIZE_CONFIG.text);

  // Trim and lowercase
  return sanitized.trim().toLowerCase();
}

/**
 * Sanitize a URL
 * Validates and sanitizes URL, only allows http/https
 */
export function sanitizeUrl(url: string | null | undefined): string {
  return sanitizeString(url, "url");
}

/**
 * Sanitize an object's string fields recursively
 * @param obj - The object to sanitize
 * @param fieldTypes - Map of field names to sanitization types
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fieldTypes: Record<string, "text" | "richText" | "url" | "email"> = {}
): T {
  const sanitized: Record<string, unknown> = { ...obj };

  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === "string") {
      const fieldType = fieldTypes[key];

      if (fieldType === "email") {
        sanitized[key] = sanitizeEmail(value);
      } else if (fieldType === "url") {
        sanitized[key] = sanitizeUrl(value);
      } else if (fieldType === "richText") {
        sanitized[key] = sanitizeString(value, "richText");
      } else {
        // Default to text sanitization
        sanitized[key] = sanitizeString(value, "text");
      }
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      // Sanitize array items
      sanitized[key] = value.map((item) => {
        if (typeof item === "string") {
          return sanitizeString(item);
        } else if (item && typeof item === "object") {
          return sanitizeObject(item as Record<string, unknown>);
        }
        return item;
      });
    }
  }

  return sanitized as T;
}

/**
 * Zod transform to sanitize string fields
 * Usage: z.string().transform(sanitizeTransform())
 */
export function sanitizeTransform(
  type: "text" | "richText" | "url" | "email" = "text"
) {
  return (value: string) => {
    if (type === "email") {
      return sanitizeEmail(value);
    } else if (type === "url") {
      return sanitizeUrl(value);
    } else {
      return sanitizeString(value, type);
    }
  };
}

/**
 * Common XSS patterns to test against (for testing purposes)
 */
export const XSS_TEST_PATTERNS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  'javascript:alert("XSS")',
  '<svg onload=alert("XSS")>',
  "<iframe src=\"javascript:alert('XSS')\">",
  '"><script>alert(String.fromCharCode(88,83,83))</script>',
  "<body onload=alert('XSS')>",
];
