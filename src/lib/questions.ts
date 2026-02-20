import type { CompanyProfile, IntelligenceBankQuestion } from "@/types"

export function generateQuestions(
  profile: CompanyProfile
): IntelligenceBankQuestion[] {
  const { name, competitors, valueProp } = profile
  const companyName = name || "Your Company"
  const questions: string[] = []

  // Company-specific
  questions.push(`What is ${companyName} pricing?`)
  questions.push(`Is ${companyName} legit?`)
  questions.push(`What does ${companyName} do?`)
  questions.push(`${companyName} reviews and ratings`)
  questions.push(`How to get started with ${companyName}?`)
  questions.push(`${companyName} alternatives`)
  questions.push(`Who is ${companyName} best for?`)
  questions.push(`What are ${companyName}'s key features?`)

  // Competitor-specific
  for (const comp of competitors.slice(0, 4)) {
    questions.push(`How does ${companyName} compare to ${comp.name}?`)
    questions.push(`${companyName} vs ${comp.name}: which is better?`)
  }

  // Value-prop derived
  if (valueProp) {
    questions.push(
      `How does ${companyName} help with ${valueProp.toLowerCase()}?`
    )
  }

  // Pad to 20 with generic questions
  const generic = [
    `Is ${companyName} worth it in 2025?`,
    `${companyName} pros and cons`,
    `${companyName} customer support quality`,
    `How much does ${companyName} cost?`,
    `${companyName} free trial availability`,
    `${companyName} integration options`,
    `${companyName} security and compliance`,
  ]

  for (const g of generic) {
    if (questions.length >= 20) break
    if (!questions.includes(g)) questions.push(g)
  }

  return questions.slice(0, 20).map((text, i) => ({
    id: `q-${i}`,
    text,
    enabled: true,
  }))
}
