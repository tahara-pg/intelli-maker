import { NextResponse } from "next/server";

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY ?? "";
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

export const maxDuration = 300;

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
        model: "llama-3.1-sonar-huge-128k-online", // 使用するモデルを指定
        messages: [
          // システムプロンプトとユーザープロンプトを設定
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096, // 生成するトークンの最大数
        temperature: 0.2, // 生成の多様性を制御（低いほど決定的）
        top_p: 0.9, // 上位確率の閾値
        return_citations: false, // 引用情報を返すかどうか
        search_domain_filter: ["-kyoko-np.net", "-notion.site"], // 検索から除外するドメイン
        return_images: false, // 画像を返さない
        return_related_questions: false, // 関連質問を返さない
        search_recency_filter: "year", // 検索の新しさフィルター
        top_k: 0, // 上位k個の選択肢を考慮（0は無効）
        stream: false, // ストリーミングを無効化
        presence_penalty: 0, // 存在ペナルティ（0は無効）
        frequency_penalty: 1, // 頻度ペナルティ
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
