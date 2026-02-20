import type { VercelRequest, VercelResponse } from "@vercel/node"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-12-18.acacia",
})

const PRICE_MAP: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_ID_STARTER,
  growth: process.env.STRIPE_PRICE_ID_GROWTH,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { userId, planTier, email } = req.body ?? {}

  if (!userId || !planTier || !email) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  const priceId = PRICE_MAP[planTier]
  if (!priceId) {
    return res.status(400).json({ error: "Invalid plan tier" })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.headers.origin}/settings?upgraded=true`,
      cancel_url: `${req.headers.origin}/settings`,
      metadata: { userId, planTier },
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return res.status(500).json({ error: message })
  }
}
