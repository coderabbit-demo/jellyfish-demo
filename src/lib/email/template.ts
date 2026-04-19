type EventLink = { label: string; url: string };

type TemplateData = {
  userName: string;
  eventTitle: string;
  eventType: string;
  eventEmoji: string;
  eventDate: string;
  eventDescription: string;
  links: EventLink[];
  leadTime: string; // "7d" | "48h" | "4h"
  settingsUrl: string;
  appUrl: string;
};

const TYPE_COLOUR: Record<string, string> = {
  SOLAR_SYSTEM: "#f59e0b",
  NIGHT_SKY:    "#60a5fa",
  LUNAR:        "#94a3b8",
  DEEP_SPACE:   "#a78bfa",
};

const LEAD_TIME_LABEL: Record<string, string> = {
  "7d":  "1 week away",
  "48h": "48 hours away",
  "4h":  "4 hours away",
};

/**
 * Escape HTML special characters to prevent XSS injection
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitize URL to prevent javascript: and data: URI injection
 */
function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    // Invalid URL
    return null;
  }
}

export function renderEventEmail(data: TemplateData): { subject: string; html: string; text: string } {
  const accentColour = TYPE_COLOUR[data.eventType] ?? "#6366f1";
  const leadLabel = LEAD_TIME_LABEL[data.leadTime] ?? escapeHtml(data.leadTime);

  // Escape and sanitize dynamic content
  const escapedEventTitle = escapeHtml(data.eventTitle);
  const escapedEventDescription = escapeHtml(data.eventDescription);
  const escapedEventEmoji = escapeHtml(data.eventEmoji);
  const escapedEventDate = escapeHtml(data.eventDate);
  const escapedEventType = escapeHtml(data.eventType);
  const escapedLeadLabel = escapeHtml(leadLabel);

  // Filter and sanitize links
  const safeLinks = data.links
    .map((l) => {
      const sanitizedUrl = sanitizeUrl(l.url);
      return sanitizedUrl ? { label: escapeHtml(l.label), url: sanitizedUrl } : null;
    })
    .filter((l): l is { label: string; url: string } => l !== null);

  const linksHtml = safeLinks.length > 0
    ? safeLinks.map(
        (l) =>
          `<a href="${l.url}" style="display:inline-block;margin:4px 6px 4px 0;padding:6px 14px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#818cf8;font-size:13px;text-decoration:none;">${l.label} ↗</a>`
      ).join("")
    : "";

  const linksSection = linksHtml
    ? `<tr><td style="padding:0 32px 24px;">
        <p style="margin:0 0 10px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:600;">Learn more</p>
        ${linksHtml}
      </td></tr>`
    : "";

  const subject = `${escapedEventEmoji} ${escapedEventTitle} — ${escapedLeadLabel}`;

  // Sanitize URLs used in the template
  const sanitizedAppUrl = sanitizeUrl(data.appUrl) ?? "http://localhost:3000";
  const sanitizedSettingsUrl = sanitizeUrl(data.settingsUrl) ?? sanitizedAppUrl;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;">

        <!-- Header bar -->
        <tr>
          <td style="background:${accentColour};height:4px;"></td>
        </tr>

        <!-- Logo / App name -->
        <tr>
          <td style="padding:28px 32px 0;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#f8fafc;letter-spacing:-.02em;">✦ StarWatch</p>
          </td>
        </tr>

        <!-- Lead time badge -->
        <tr>
          <td style="padding:20px 32px 0;">
            <span style="display:inline-block;padding:4px 12px;background:${accentColour}22;border:1px solid ${accentColour}55;border-radius:999px;font-size:12px;font-weight:600;color:${accentColour};text-transform:uppercase;letter-spacing:.06em;">
              ${escapedLeadLabel}
            </span>
          </td>
        </tr>

        <!-- Event title -->
        <tr>
          <td style="padding:16px 32px 0;">
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#f8fafc;line-height:1.3;">
              ${escapedEventEmoji} ${escapedEventTitle}
            </h1>
          </td>
        </tr>

        <!-- Date -->
        <tr>
          <td style="padding:8px 32px 20px;">
            <p style="margin:0;font-size:14px;color:#64748b;">📅 ${escapedEventDate}</p>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 32px;">
            <hr style="border:none;border-top:1px solid #334155;margin:0 0 24px;" />
          </td>
        </tr>

        <!-- Description -->
        <tr>
          <td style="padding:0 32px 28px;">
            <p style="margin:0;font-size:15px;line-height:1.7;color:#cbd5e1;">${escapedEventDescription}</p>
          </td>
        </tr>

        <!-- Links -->
        ${linksSection}

        <!-- CTA button -->
        <tr>
          <td style="padding:0 32px 32px;">
            <a href="${sanitizedAppUrl}/dashboard" style="display:inline-block;padding:12px 24px;background:#6366f1;border-radius:8px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">
              View all upcoming events →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #1e293b;background:#0f172a;">
            <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
              You're receiving this because you subscribed to <strong style="color:#64748b;">${escapedEventType.replace("_", " ").toLowerCase()}</strong> events on StarWatch.<br />
              <a href="${sanitizedSettingsUrl}" style="color:#6366f1;text-decoration:none;">Manage notification preferences</a> ·
              <a href="${sanitizedAppUrl}" style="color:#6366f1;text-decoration:none;">Visit StarWatch</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `${data.eventEmoji} ${data.eventTitle} — ${leadLabel}

${data.eventDate}

${data.eventDescription}

${safeLinks.map((l) => `${l.label}: ${l.url}`).join("\n")}

View all upcoming events: ${sanitizedAppUrl}/dashboard

---
Manage notification preferences: ${sanitizedSettingsUrl}
`;

  return { subject, html, text };
}