import type { VercelRequest, VercelResponse } from "@vercel/node"
import Stripe from "stripe"
import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-12-18.acacia",
})

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? "{}")
  initializeApp({ credential: cert(serviceAccount) })
}

const adminDb = getFirestore()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const sig = req.headers["stripe-signature"] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ""

  let event: Stripe.Event
  try {
    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body)
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed"
    return res.status(400).json({ error: message })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.userId
    const planTier = session.metadata?.planTier

    if (userId && planTier) {
      await adminDb.doc(`users/${userId}`).set(
        {
          planTier,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
        },
        { merge: true }
      )
    }
  }

  return res.status(200).json({ received: true })
}
