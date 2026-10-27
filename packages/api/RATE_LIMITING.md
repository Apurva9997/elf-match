# Rate Limiting Implementation

This API uses Redis-backed rate limiting via Upstash to protect against abuse and ensure fair usage.

## Overview

Rate limiting is implemented using a **sliding window** algorithm with different limits for different endpoint types.

## Rate Limit Tiers

### 1. Authentication Endpoints (IP-based)
- **Magic Link Send** (`/auth/magic-link`): 5 requests per 15 minutes
- **Magic Link Verify** (`/auth/verify`): 10 requests per 15 minutes
- Prevents email spam and brute force attacks

### 2. General Authenticated Endpoints (User-based)
- **Read Operations** (GET requests): 100 requests per minute
- **Write Operations** (POST/PUT/PATCH): 30 requests per minute
- Applies to most team, wishlist, address, and profile endpoints

### 3. Sensitive Operations (User-based)
- **Team Invitations** (`/teams/{id}/invite`): 50 requests per hour
- **Assignment Operations** (`/teams/{id}/assign*`): 5 requests per hour
- **Reminder Emails** (`/teams/{id}/reminders`): 10 requests per hour

## Response Headers

All API responses include rate limit information:

```
X-RateLimit-Limit: 100        # Maximum requests allowed in window
X-RateLimit-Remaining: 87     # Requests remaining in current window
X-RateLimit-Reset: 1703001234 # Unix timestamp when limit resets
```

## Rate Limit Exceeded (429)

When rate limit is exceeded, the API returns:

```json
{
  "success": false,
  "error": {
    "message": "Too many requests. Please try again later.",
    "code": "RATE_LIMIT_EXCEEDED",
    "retryAfter": 1703001234
  }
}
```

Additional headers:
- `Retry-After`: Seconds until the limit resets

## Configuration

Rate limits are configured in `src/lib/rate-limit.ts`:

```typescript
export const rateLimiters = {
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    analytics: true,
    prefix: "@ratelimit/auth",
  }),
  // ... more configurations
};
```

## Environment Variables

Required environment variables:

```bash
UPSTASH_REDIS_REST_URL="https://your-redis-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-redis-token"
```

## Implementation Details

### Identifier Strategy

1. **Authenticated requests** (`useUserId: true`): Uses `user:{userId}` from JWT
2. **Public requests** (`useUserId: false`): Uses `ip:{ipAddress}`

This ensures:
- Users can't bypass limits by switching IPs
- Public endpoints are protected from DDoS attacks
- Fair usage across all users

### Fail-Open Design

If Redis is unavailable or rate limiting fails, requests are **allowed through** (fail-open). This ensures service availability even if rate limiting infrastructure has issues.

The error is logged for monitoring:
```
Rate limit middleware error: [error details]
```

## Monitoring

### CloudWatch Metrics
Monitor `429` status codes to track rate limit violations:
- High 429 rates may indicate:
  - Legitimate user hitting limits (consider increasing)
  - Bot/scraper activity
  - DDoS attempt

### Upstash Analytics
The Upstash console provides analytics for:
- Request patterns
- Top rate-limited IPs/users
- Window utilization

### Sentry Integration
All rate limit middleware errors are captured by Sentry for alerting.

## Testing Rate Limits

### Manual Testing

```bash
# Test auth endpoint (5 requests per 15 min)
for i in {1..6}; do
  curl -X POST https://elfmatch.com/api/auth/magic-link \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}' \
    -i
done
# 6th request should return 429
```

### Check Headers

```bash
curl -i https://elfmatch.com/api/teams \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response includes:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: 1703001234
```

## Adjusting Limits

To modify rate limits, update `src/lib/rate-limit.ts`:

```typescript
// Example: Increase auth limit
auth: new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "15 m"), // Changed from 5 to 10
  analytics: true,
  prefix: "@ratelimit/auth",
}),
```

After changes:
1. Update the limits in this documentation
2. Deploy the changes: `npm run deploy` or `npm run deploy:prod`
3. Monitor for any issues

## Best Practices

1. **Monitor 429 responses**: Set up alerts for unusual spikes
2. **Review limits quarterly**: Adjust based on actual usage patterns
3. **Communicate limits**: Document limits in API documentation
4. **Whitelist if needed**: Consider IP whitelisting for trusted partners
5. **Test before deploy**: Test rate limits in dev environment first

## Troubleshooting

### "Rate limit exceeded" but user hasn't made many requests

**Cause**: Multiple users behind same NAT/proxy share an IP

**Solution**: Ensure users are authenticated so limits are per-user, not per-IP

### Rate limiting not working in development

**Check**:
1. Environment variables are set correctly
2. Redis credentials are valid
3. Check console for errors: `Rate limit middleware error`

### Redis connection errors

Rate limiting will **fail open** - requests are allowed through. Check:
1. Upstash Redis is accessible
2. Credentials are correct
3. Network connectivity from Lambda to Upstash

## Security Considerations

1. **Rate limits are not authentication**: They supplement but don't replace proper auth
2. **IP spoofing**: Use user-based limits for authenticated endpoints
3. **Distributed attacks**: Monitor patterns across multiple IPs
4. **Cost management**: High rate limit violations cost Redis operations - monitor usage

