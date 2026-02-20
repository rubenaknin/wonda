import { loadStripe } from "@stripe/stripe-js"

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "")

export async function createCheckoutSession(
  userId: string,
  planTier: string,
  email: string
): Promise<void> {
  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, planTier, email }),
  })

  if (!res.ok) {
    throw new Error("Failed to create checkout session")
  }

  const { url } = await res.json()
  if (url) {
    window.location.href = url
  }
}

export { stripePromise }
