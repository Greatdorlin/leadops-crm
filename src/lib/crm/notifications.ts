type NotificationPayload = Record<string, unknown>;

function logNotification(type: string, payload: NotificationPayload) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[crm-notification:${type}]`, payload);
  }
}

export async function notifyCrmEvent(type: string, payload: NotificationPayload) {
  logNotification(type, payload);

  const webhookUrl = process.env.CRM_NOTIFICATION_WEBHOOK_URL;
  if (!webhookUrl) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        payload,
      }),
      cache: "no-store",
    });
  } catch (error) {
    logNotification("notification_failed", {
      type,
      message: error instanceof Error ? error.message : "Unknown notification error",
    });
  }
}
