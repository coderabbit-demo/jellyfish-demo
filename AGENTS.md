<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Agent Documentation

## Agent Definitions

### Event Scheduler Agent
- **Purpose**: Fetches astronomical events from external APIs and stores them in the database
- **Inputs**: API credentials (NASA API key, AstronomyAPI credentials), time range parameters
- **Outputs**: Event records written to Prisma database (Event model)

### Notification Agent
- **Purpose**: Monitors upcoming events and sends email reminders at configured intervals
- **Inputs**: Event data from database, user notification preferences, current timestamp
- **Outputs**: Email notifications via configured SMTP provider, notification logs in database

### ISS Tracker Agent
- **Purpose**: Retrieves International Space Station pass predictions for user locations
- **Inputs**: User latitude/longitude coordinates, Open-Notify API endpoint
- **Outputs**: ISS pass event records with visibility windows

### User Management Agent
- **Purpose**: Handles authentication, authorization, and user preference management
- **Inputs**: Authentication requests, user profile updates, notification preference changes
- **Outputs**: Session tokens, updated user records, audit logs

## Configuration

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `NASA_API_KEY`: NASA API authentication token (required)
- `ASTRONOMY_API_ID`: AstronomyAPI application identifier (required)
- `ASTRONOMY_API_SECRET`: AstronomyAPI secret key (required)
- `SMTP_HOST`: Email server hostname (required)
- `SMTP_PORT`: Email server port (default: 587)
- `SMTP_USER`: SMTP authentication username (required)
- `SMTP_PASSWORD`: SMTP authentication password (required)
- `SMTP_FROM`: Sender email address (required)
- `NEXTAUTH_SECRET`: NextAuth.js session encryption key (required)
- `NEXTAUTH_URL`: Application base URL (required)

### Configuration Keys
- `notification.intervals`: Array of reminder offsets in hours (default: [168, 48, 4])
- `scheduler.cronExpression`: Cron pattern for event refresh (default: "0 2 * * *")
- `iss.updateInterval`: ISS pass refresh frequency in minutes (default: 60)
- `ratelimit.apiCalls`: Maximum external API calls per minute (default: 30)

## Behavior & Communication Protocols

### Transport Mechanisms
- **HTTP/REST**: Synchronous API calls to external services (NASA, AstronomyAPI, Open-Notify)
- **Database Queue**: Asynchronous job processing via Prisma-backed notification queue
- **Server Actions**: Next.js server actions for client-server communication
- **Webhook Delivery**: Optional webhook support for real-time event notifications

### Message Schema
All internal messages follow JSON format with required fields:
- `agentId`: Unique identifier for the originating agent
- `timestamp`: ISO 8601 datetime
- `eventType`: Action type (e.g., "EVENT_FETCHED", "NOTIFICATION_SENT")
- `payload`: Type-specific data object
- `correlationId`: UUID for request tracing

### Retry & Acknowledgment Semantics
- **Retry Policy**: Exponential backoff (initial: 5s, max: 300s, attempts: 5)
- **Acknowledgment**: Agents log successful operations to `AgentLog` table with status
- **Dead Letter Queue**: Failed operations after max retries moved to `FailedJob` table for manual review
- **Idempotency**: All operations use idempotency keys to prevent duplicate processing

## Message Formats

### Event Fetch Request
```json
{
  "agentId": "event-scheduler-01",
  "timestamp": "2026-04-16T10:30:00Z",
  "eventType": "FETCH_EVENTS",
  "payload": {
    "source": "NASA",
    "dateRange": {
      "start": "2026-04-16",
      "end": "2026-07-16"
    }
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Notification Dispatch
```json
{
  "agentId": "notification-agent-01",
  "timestamp": "2026-04-16T10:35:00Z",
  "eventType": "SEND_NOTIFICATION",
  "payload": {
    "userId": "user_abc123",
    "eventId": "event_xyz789",
    "notificationType": "email",
    "scheduledFor": "2026-04-18T08:00:00Z",
    "template": "event-reminder-48h"
  },
  "correlationId": "660e8400-e29b-41d4-a716-446655440001"
}
```

### ISS Pass Prediction
```json
{
  "agentId": "iss-tracker-01",
  "timestamp": "2026-04-16T10:40:00Z",
  "eventType": "ISS_PASS_CALCULATED",
  "payload": {
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "passes": [
      {
        "riseTime": "2026-04-16T20:15:00Z",
        "duration": 360,
        "maxElevation": 45
      }
    ]
  },
  "correlationId": "770e8400-e29b-41d4-a716-446655440002"
}
```

## Operational Responsibilities

### Lifecycle Management

#### Startup
1. **Initialization**: Load environment variables and validate required configuration
2. **Health Check**: Verify database connectivity and external API availability
3. **State Recovery**: Resume pending jobs from database queue
4. **Cron Registration**: Register scheduled tasks with Next.js cron handler or external scheduler

#### Shutdown
1. **Graceful Drain**: Complete in-flight operations (max wait: 30s)
2. **State Persistence**: Save pending jobs to database for recovery
3. **Connection Cleanup**: Close database connections and HTTP clients
4. **Signal Handling**: Respond to SIGTERM/SIGINT with orderly shutdown

#### Error Handling
- **Transient Errors**: Retry with backoff for network timeouts, rate limits
- **Permanent Errors**: Log to `ErrorLog` table, send alert to monitoring system
- **Circuit Breaker**: Disable failing API endpoints after 10 consecutive failures
- **Fallback Behavior**: Serve cached data when primary source unavailable

### Security & Permission Rules

#### Authentication
- All agent API endpoints require valid JWT bearer token
- Service-to-service authentication uses API key with IP allowlist
- User-facing operations validate NextAuth.js session

#### Authorization
- Event Scheduler Agent: Read/write access to Event table only
- Notification Agent: Read access to Event and User tables, write to Notification table
- ISS Tracker Agent: Read access to User locations, write to Event table
- User Management Agent: Full access to User table, limited access to audit logs

#### Data Protection
- PII (email addresses, location data) encrypted at rest using database-level encryption
- API credentials stored in secure environment variables, never logged
- Email notifications use template system to prevent injection attacks
- Rate limiting enforced per user (10 req/min) and per agent (100 req/min)

#### Audit & Compliance
- All agent actions logged with timestamp, agent ID, and affected resources
- User data access logged for GDPR compliance
- Failed authentication attempts trigger security alerts after 5 failures
- Data retention policy: Event data kept for 1 year, logs for 90 days