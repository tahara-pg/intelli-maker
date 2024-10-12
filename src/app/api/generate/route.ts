import { NextResponse } from "next/server";

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY ?? "";
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

export async function POST(request: Request) {
  const { systemPrompt, userPrompt } = await request.json();

  if (!PERPLEXITY_API_KEY) {
    console.error("PERPLEXITY_API_KEY is not set");
    return NextResponse.json(
      { error: "API key is not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.2,
        top_p: 0.9,
        return_citations: true,
        search_domain_filter: ["-kyoko-np.net", "-notion.site"],
        return_images: false,
        return_related_questions: false,
        search_recency_filter: "year",
        top_k: 0,
        stream: false,
        presence_penalty: 0,
        frequency_penalty: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `API request failed: ${response.status} ${response.statusText}\n${errorText}`
      );
      return NextResponse.json(
        {
          error: `API request failed: ${response.status} ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ content: data.choices[0].message.content });
  } catch (error) {
    console.error("Perplexity API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
