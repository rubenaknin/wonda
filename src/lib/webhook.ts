interface WebhookPayload {
  action: string
  data: Record<string, unknown>
  timestamp: string
}

export async function sendWebhook(
  url: string,
  action: string,
  data: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  if (!url) {
    return { success: false, error: "No webhook URL configured" }
  }

  const payload: WebhookPayload = {
    action,
    data,
    timestamp: new Date().toISOString(),
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}
