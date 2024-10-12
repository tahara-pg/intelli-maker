"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Star,
  Twitter,
  Linkedin,
  Globe,
  Sparkles,
  BookOpen,
  User,
  Trophy,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import logoImage from "@/app/images/logo.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BorderBeam } from "@/components/ui/border-beam";

// Window インターフェースを拡張する
declare global {
  interface Window {
    gtag?: (
      command: string,
      eventName: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

// Perplexity APIを使用するための関数を修正
async function generateWithPerplexity(
  systemPrompt: string,
  userPrompt: string
) {
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ systemPrompt, userPrompt }),
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error("API error:", error);
    throw error;
  }
}

// 型定義を更新
interface Phrase {
  quote: string;
  background: string;
  tags: string[];
}

interface Trivia {
  content: string;
}

interface GlossaryItem {
  term: string;
  definition: string;
}

interface KeyPerson {
  name: string;
  description: string;
  x: string;
  linkedin: string;
  website: string;
}

// SearchInput コンポーネントの型定義を追加
interface SearchInputProps {
  keyword: string;
  setKeyword: (value: string) => void;
  generateContent: () => void;
  isLoading: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
}

// タグの色を定義する関数を更新
const getTagColor = (tag: string) => {
  switch (tag) {
    case "トレンド":
      return "bg-blue-100 text-blue-800";
    case "問題提起":
      return "bg-red-100 text-red-800";
    case "競合情報":
      return "bg-green-100 text-green-800";
    case "表彰・称賛":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Google Analyticsイベント送信用の関数
const sendGAEvent = (eventName: string, params?: Record<string, unknown>) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
};

const handleParseError = (
  section: string,
  text: string,
  error: Error,
  keyword: string
) => {
  console.error(`JSON解析エラー (${section}):`, error);
  console.error("問題のあるJSON文字列:", text);

  sendGAEvent("content_parse_error", {
    keyword: keyword,
    section: section,
    error: error.message,
    raw_text: text.substring(0, 500), // 長すぎる場合に備えて最初の500文字のみ送信
  });

  throw new Error(`${section}のJSONの解析に失敗しました: ${error.message}`);
};

const cleanAndParseJSON = (section: string, text: string, keyword: string) => {
  try {
    // 文字列内の不正な文字を除去し、JSONとして解析可能な形式に変換
    const cleanedText = text
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // 制御文字を削除
      .replace(/「/g, "\u300C")
      .replace(/」/g, "\u300D")
      .replace(/『/g, "\u300E")
      .replace(/』/g, "\u300F")
      .replace(/```json/, "")
      .replace(/```/, "")
      .trim(); // 前後の空白を削除

    // JSONとして解析
    return JSON.parse(cleanedText);
  } catch (e) {
    if (e instanceof Error) {
      handleParseError(section, text, e, keyword);
    } else {
      handleParseError(
        section,
        text,
        new Error("Unknown parsing error"),
        keyword
      );
    }
  }
};

async function getKeywordExplanation(keyword: string): Promise<string> {
  const systemPrompt =
    "与えられたキーワードについて簡潔な解説を提供してください。ハルシネーションを起こさないでください。";
  const userPrompt = `キーワード「${keyword}」について、100文字程度の簡潔な解説を日本語で生成してください。重要な部分は<keyword>タグで囲んでください。`;

  try {
    const explanation = await generateWithPerplexity(systemPrompt, userPrompt);
    return explanation;
  } catch (error) {
    console.error("用語の解説生成中にエラーが発生しました:", error);
    return `「${keyword}」の解説を生成できませんでした。`;
  }
}

export default function WisdomFountain() {
  const [keyword, setKeyword] = useState("");
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [trivias, setTrivias] = useState<Trivia[]>([]);
  const [glossary, setGlossary] = useState<GlossaryItem[]>([]);
  const [keyPersons, setKeyPersons] = useState<KeyPerson[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phrasesLoading, setPhrasesLoading] = useState(false);
  const [triviasLoading, setTriviasLoading] = useState(false);
  const [glossaryLoading, setGlossaryLoading] = useState(false);
  const [keyPersonsLoading, setKeyPersonsLoading] = useState(false);
  const [phrasesError, setPhrasesError] = useState<string | null>(null);
  const [triviasError, setTriviasError] = useState<string | null>(null);
  const [glossaryError, setGlossaryError] = useState<string | null>(null);
  const [keyPersonsError, setKeyPersonsError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const exampleKeywords = ["大谷翔平", "トヨタ自動車株式会社", "生成AI"];

  const handleExampleClick = (example: string) => {
    setKeyword(example);
    // フォーカスを当てる
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    console.log("Updated Phrases:", phrases);
  }, [phrases]);

  useEffect(() => {
    console.log("Updated Glossary:", glossary);
  }, [glossary]);

  useEffect(() => {
    console.log("Updated Key Persons:", keyPersons);
  }, [keyPersons]);

  interface PhraseItem {
    quote: string;
    background: string;
    tags: string[];
  }

  const generatePhrases = async () => {
    setPhrasesLoading(true);
    setPhrasesError(null);
    try {
      const systemPrompt =
        "与えられたキーワードに関連する、興味深くて知的な会話のためのフレーズを生成してください。常に指定されたJSONフォーマットで回答してください。ハルシネーションを起こさないでください。";
      const userPrompt = `
      キーワード「${keyword}」について、マニアやクライアントから「こいつわかってるな」「お、そんなことまで知ってるんだ」「君、賢いね」と思わせるような、短くて知り合いに話すようなセリフを5つ生成してください。各セリフには素人にもわかる詳しい200文字以上の背景説明を付けてください。

      セリフの中で重要なキーワードや専門用語や大事なポイントには<keyword>タグを付けてください。例: <keyword>重要な用語</keyword>
      背景説明には<keyword>タグを使用しないでください。

      以下の4つのタグを当てはまる場合にのみ付けてください：
      - トレンド：最新の動向や流行を示す情報
      - 問題提起：業界や分野における課題や問題点を指摘する情報
      - 競合情報：${keyword}の競合他社や競合製品に関する洞察
      - 表彰・称賛：業界内での評価や成果に関する情報

      これらのタグに関連する情報を含むセリフを優先的に生成してください。

      以下のJSONフォーマットで出力してください。正しいJSONのみを返し、追加の説明やコメントや改行や制御文字は含めないでください。

      {
        "phrases": [
          {
            "quote": "セリフ1（<keyword>タグ付き）",
            "background": "背景説明1（タグなし）",
            "tags": ["トレンド", "競合情報"]
          },
          {
            "quote": "セリフ2（<keyword>タグ付き）",
            "background": "背景説明2（タグなし）",
            "tags": ["問題提起"]
          }
        ]
      }
      `;

      const phrasesText = await generateWithPerplexity(
        systemPrompt,
        userPrompt
      );

      try {
        const phrasesJson = cleanAndParseJSON("セリフ", phrasesText, keyword);
        console.log("Parsed phrases JSON:", phrasesJson);

        if (!phrasesJson.phrases || !Array.isArray(phrasesJson.phrases)) {
          throw new Error("Invalid phrases structure in response");
        }

        const newPhrases = phrasesJson.phrases.map((item: PhraseItem) => ({
          quote: item.quote,
          background: item.background.replace(/<\/?keyword>/g, ""),
          tags: item.tags || [],
        }));

        setPhrases(newPhrases);
      } catch (error) {
        console.error("フレーズの処理中にエラーが発生しました:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setPhrasesError(
          `フレーズの生成中にエラーが発生しました: ${errorMessage}`
        );

        // GAにエラーイベントを送信
        sendGAEvent("content_generation_error", {
          keyword,
          section: "phrases",
          error: errorMessage,
        });
      }
    } catch (error) {
      console.error("Detailed error:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setPhrasesError(
        `コンテンツの生成中にエラーが発生しました。もう一度お試しください。`
      );

      // GAにエラーイベントを送信
      sendGAEvent("content_generation_error", {
        keyword,
        section: "phrases",
        error: errorMessage,
      });
    } finally {
      setPhrasesLoading(false);
    }
  };

  const generateTrivias = async () => {
    setTriviasLoading(true);
    setTriviasError(null);
    try {
      const systemPrompt =
        "与えられたキーワードに関連する面白い雑学を生成してください。常に指定されたJSONフォーマットで回答してください。ハルシネーションを起こさないでください。";
      const userPrompt = `
      キーワード「${keyword}」に関連する面白い雑学を5つ生成してください。各雑学は100文字程度で、興味深く、記憶に残るものにしてください。
      雑学の文章の中で面白いポイントや強調すべきポイントには、文中に<keyword>タグを付けてください。

      以下のJSONフォーマットで出力してください。正しいJSONのみを返し、追加の説明やコメントや改行や制御文字は含めないでください。

      {
        "trivias": [
          {
            "content": "雑学1の内容（<keyword>タグ付き）"
          },
          {
            "content": "雑学2の内容（<keyword>タグ付き）"
          }
        ]
      }
      `;

      const triviasText = await generateWithPerplexity(
        systemPrompt,
        userPrompt
      );

      try {
        const triviasJson = cleanAndParseJSON("雑学", triviasText, keyword);

        if (!triviasJson.trivias || !Array.isArray(triviasJson.trivias)) {
          throw new Error("Invalid trivias structure in response");
        }

        const newTrivias = triviasJson.trivias.map(
          (item: { content: string }) => ({
            content: item.content,
          })
        );

        setTrivias(newTrivias);
      } catch (error) {
        console.error("雑学の処理中にエラーが発生しました:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setTriviasError(`雑学の生成中にエラーが発生しました: ${errorMessage}`);

        // GAにエラーイベントを送信
        sendGAEvent("content_generation_error", {
          keyword,
          section: "trivias",
          error: errorMessage,
        });
      }
    } catch (error) {
      console.error("Detailed error:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setTriviasError(
        `コンテンツの生成中にエラーが発生しました。もう一度お試しください。`
      );

      // GAにエラーイベントを送信
      sendGAEvent("content_generation_error", {
        keyword,
        section: "trivias",
        error: errorMessage,
      });
    } finally {
      setTriviasLoading(false);
    }
  };

  const generateGlossary = async () => {
    setGlossaryLoading(true);
    setGlossaryError(null);
    try {
      const systemPrompt =
        "与えられたキーワードに関連する重要な用語とその定義を生成してください。常に指定されたJSONフォーマットで回答してください。ハルシネーションを起こさないでください。";
      const userPrompt = `
      キーワード「${keyword}」に関連する8つの重要な用語とその素人にもわかる詳しい100文字以上の説明を日本語で生成してください。
      以下の点に注意してください：
      1. 人物名やキャラクター名は含めないでください。
      2. 一般的な概念、技術用語、プロセス、理論などに焦点を当ててください。
      3. 各用語は、キーワードに直接関連し、その分野の理解を深めるものを選んでください。

      以下のJSONフォーマットで出力してください。正しいJSONのみを返し、追加の説明やコメントや改行や制御文字は含めないでください。

      {
        "glossary": [
          {
            "term": "用語1",
            "definition": "定義1"
          },
          {
            "term": "用語2",
            "definition": "定義2"
          },
          {
            "term": "用語3",
            "definition": "定義3"
          }
        ]
      }
      `;
      const glossaryText = await generateWithPerplexity(
        systemPrompt,
        userPrompt
      );

      // 用語集の処理
      try {
        const glossaryJson = cleanAndParseJSON("用語集", glossaryText, keyword);
        console.log("Parsed glossary JSON:", glossaryJson);
        setGlossary(
          Array.isArray(glossaryJson.glossary) ? glossaryJson.glossary : []
        );
      } catch (error) {
        console.error("用語集の処理中にエラーが発生しました:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setGlossaryError("用語集の生成中にエラーが発生しました。");

        // GAにエラーイベントを送信
        sendGAEvent("content_generation_error", {
          keyword: keyword,
          section: "glossary",
          error: errorMessage,
        });
      }
    } catch (error) {
      console.error("Detailed error:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (error instanceof Error && error.message.includes("SAFETY")) {
        setGlossaryError(
          "申し訳ありませんが、安全性の観点から内容を生成できませんでした。別のキーワードをお試しください。"
        );
      } else {
        setGlossaryError(
          `コンテンツの生成中にエラーが発生しました。もう一度お試しください。`
        );
      }

      // GAにエラーイベントを送信
      sendGAEvent("content_generation_error", {
        keyword: keyword,
        section: "glossary",
        error: errorMessage,
      });
    } finally {
      setGlossaryLoading(false);
    }
  };

  const generateKeyPersons = async () => {
    setKeyPersonsLoading(true);
    setKeyPersonsError(null);
    try {
      const systemPrompt =
        "与えられたキーワードに関連する重要な人物の情報を生成してください。常に指定されたJSONフォーマットで回答してください。ハルシネーションを起こさないでください。";
      const userPrompt = `
        キーワード「${keyword}」に関連する重要な人物を5人選び、以下の情報を日本語で生成してください：
        1. その人物の名前
        2. 素人にもわかる詳しい100文字以上の説明（その人物の経歴や業績に加え、キーワード「${keyword}」との関連性も含めてください）
        3. X(旧Twitter)とLinkedInのURL（見つからない場合は空）
        4. 公式ウェブサイトのURL（見つからない場合は空）

        以下のJSONフォーマットで出力してください。正しいJSONのみを返し、追加の説明やコメントや改行や制御文字は含めないでください。
        実在する人物を選んでください。ハルシネーションを起こさないでください。

        {
          "keyPersons": [
            {
              "name": "人物名1",
              "description": "人物の説明1（キーワードとの関連性を含む）",
              "x": "https://x.com/example1",
              "linkedin": "https://www.linkedin.com/in/example1",
              "website": "https://example1.com"
            },
            {
              "name": "人物名2",
              "description": "人物の説明2（キーワードとの関連性を含む）",
              "x": "https://x.com/example2",
              "linkedin": "https://www.linkedin.com/in/example2",
              "website": "https://example2.com"
            }
          ]
        }
      `;

      const keyPersonText = await generateWithPerplexity(
        systemPrompt,
        userPrompt
      );

      const keyPersonJson = cleanAndParseJSON(
        "キーパーソン",
        keyPersonText,
        keyword
      );
      console.log("Parsed key person JSON:", keyPersonJson);

      const newKeyPersons = Array.isArray(keyPersonJson.keyPersons)
        ? keyPersonJson.keyPersons
        : [];
      setKeyPersons(newKeyPersons);
    } catch (error) {
      console.error("キーパーソンの処理中にエラーが発生しました:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setKeyPersonsError(
        `キーパーソンの生成中にエラーが発生しました: ${errorMessage}`
      );

      // GAにエラーイベントを送信
      sendGAEvent("content_generation_error", {
        keyword,
        section: "keyPersons",
        error: errorMessage,
      });
    } finally {
      setKeyPersonsLoading(false);
    }
  };

  // エラー処理と表示を行う関数
  const displaySectionError = (section: string, error: unknown) => {
    console.error(`Error in ${section}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // GAイベントを確実に送信
    sendGAEvent("content_generation_error", {
      keyword,
      section,
      error: errorMessage,
    });

    // セクション別のエラー状態を更新
    switch (section) {
      case "phrases":
        setPhrasesError(
          `フレーズの生成中にエラーが発生しました: ${errorMessage}`
        );
        break;
      case "trivias":
        setTriviasError(
          `豆知識の生成中にエラーが発生しました: ${errorMessage}`
        );
        break;
      case "glossary":
        setGlossaryError(
          `用語集の生成中にエラーが発生しました: ${errorMessage}`
        );
        break;
      case "keyPersons":
        setKeyPersonsError(
          `キーパーソンの生成中にエラーが発生しました: ${errorMessage}`
        );
        break;
      default:
        setError(`コンテンツの生成中にエラーが発生しました: ${errorMessage}`);
    }
  };

  const generateExplanation = async () => {
    setExplanationLoading(true);
    setExplanationError(null);
    try {
      const keywordExplanation = await getKeywordExplanation(keyword);
      setExplanation(keywordExplanation);
    } catch (error) {
      console.error("用語の解説生成中にエラーが発生しました:", error);
      setExplanationError("用語の解説を生成できませんでした。");
    } finally {
      setExplanationLoading(false);
    }
  };

  const generateContent = async () => {
    if (keyword.trim() === "") return;
    setShowResults(true);
    setIsLoading(true);
    setIsThinking(true);
    clearErrors();

    sendGAEvent("search", {
      event_category: "Search",
      keyword: keyword,
    });

    // 結果をクリア
    setPhrases([]);
    setTrivias([]);
    setGlossary([]);
    setKeyPersons([]);
    setExplanation("");

    // ローディング状態をセット
    setPhrasesLoading(true);
    setTriviasLoading(true);
    setGlossaryLoading(true);
    setKeyPersonsLoading(true);
    setExplanationLoading(true);

    try {
      await Promise.all([
        generateExplanation().catch((error) =>
          displaySectionError("用語の解説", error)
        ),
        generatePhrases().catch((error) =>
          displaySectionError("セリフ", error)
        ),
        generateTrivias().catch((error) => displaySectionError("雑学", error)),
        generateGlossary().catch((error) =>
          displaySectionError("用語集", error)
        ),
        generateKeyPersons().catch((error) =>
          displaySectionError("キーパーソン", error)
        ),
      ]);
    } catch (error) {
      displaySectionError("general", error);
    } finally {
      setIsLoading(false);
      setIsThinking(false);
    }
  };

  // エラーをクリアする関数
  const clearErrors = () => {
    setError(null);
    setPhrasesError(null);
    setTriviasError(null);
    setGlossaryError(null);
    setKeyPersonsError(null);
  };

  // ページビューのトラッキング（これは保持します）
  useEffect(() => {
    sendGAEvent("page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname,
    });
  }, []);

  // モーダルの開閉をトラッキング（開く操作のみ）
  const handleHowToUseOpen = (isOpen: boolean) => {
    setIsHowToUseOpen(isOpen);
    if (isOpen) {
      sendGAEvent("modal_interaction", {
        modal_name: "how_to_use",
        action: "open",
      });
    }
  };

  const handleAboutOpen = (isOpen: boolean) => {
    setIsAboutOpen(isOpen);
    if (isOpen) {
      sendGAEvent("modal_interaction", {
        modal_name: "about",
        action: "open",
      });
    }
  };

  // 外部リンクのクリックをトラッキング
  const handleExternalLinkClick = (type: string, url: string) => {
    sendGAEvent("external_link_click", {
      type,
      url,
      keyword: keyword, // 現在のキーワードを含める
    });
  };

  return (
    <div className="min-h-screen bg-gradient-custom py-6 relative overflow-y-auto flex flex-col justify-center">
      <div className="container mx-auto px-4 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={showResults ? "results" : "initial"}
            initial={false}
            animate={{}}
            exit={{}}
            className={`flex flex-col items-center justify-between mb-8 ${
              showResults ? "md:flex-row md:items-center" : ""
            }`}
          >
            <motion.div
              className={`${
                showResults ? "w-full md:w-1/3 md:max-w-lg" : "w-full max-w-2xl"
              } mb-8`}
              initial={false}
              animate={{
                width: showResults ? "100%" : "100%",
                marginBottom: showResults ? "2rem" : "2rem",
              }}
              transition={{ duration: 0.5 }}
            >
              <Image
                src={logoImage}
                alt="インテリメーカー"
                width={500}
                height={100}
                className="mx-auto"
              />
            </motion.div>

            <div
              className={`${
                showResults ? "w-full md:w-2/3" : "w-full max-w-2xl"
              }`}
            >
              {!showResults && (
                <p className="text-2xl font-bold tracking-wide text-gray-700 mb-4 text-center">
                  私が賢くなりたいのは...
                </p>
              )}
              <SearchInput
                keyword={keyword}
                setKeyword={setKeyword}
                generateContent={generateContent}
                isLoading={isLoading}
                inputRef={inputRef}
              />
              {!showResults && (
                <>
                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    {exampleKeywords.map((example, index) => (
                      <button
                        key={index}
                        onClick={() => handleExampleClick(example)}
                        className="group rounded-full border border-gray-300 bg-neutral-100 px-4 py-1 text-base tracking-wide text-gray-700 hover:cursor-pointer hover:bg-neutral-200"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                  <p className="text-base text-red-500 mt-3 text-center tracking-wide">
                    ※映画などの作品名で調べるとネタバレを含む可能性があります。
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* 用語の解説セクション */}
            <div className="bg-white rounded-lg shadow-md border border-purple-100 col-span-1 md:col-span-2 max-w-4xl mx-auto w-full">
              <div className="py-6 px-4 bg-gradient-to-r from-purple-200 to-blue-200">
                <h2 className="text-xl font-semibold text-gray-800 tracking-wider flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  用語の解説
                </h2>
              </div>
              <div className="py-6 px-4">
                {explanationLoading ? (
                  <ExplanationSkeletonLoader />
                ) : explanationError ? (
                  <ErrorCard
                    error={explanationError}
                    retry={() => generateExplanation()}
                  />
                ) : (
                  <p className="text-lg text-gray-700 leading-relaxed">
                    {explanation.split(/<keyword>|<\/keyword>/).map((part, i) =>
                      i % 2 === 0 ? (
                        part
                      ) : (
                        <span key={i} className="text-purple-800 font-semibold">
                          {part}
                        </span>
                      )
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* セリフセクション */}
            <div className="bg-white rounded-lg shadow-md border border-purple-100 col-span-1">
              <div className="py-6 px-4 bg-gradient-to-r from-purple-200 to-blue-200">
                <h2 className="text-xl font-semibold text-gray-800 tracking-wider flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  賢く聞こえるセリフ
                </h2>
              </div>
              <div className="py-6 px-4">
                {phrasesLoading ? (
                  <PhrasesSkeletonLoader />
                ) : phrasesError ? (
                  <ErrorCard error={phrasesError} retry={generatePhrases} />
                ) : (
                  <div className="space-y-6">
                    {phrases.map((phrase, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-lg shadow-sm border border-purple-100"
                      >
                        <div className="py-3 px-4 bg-gradient-to-r from-purple-50 to-blue-50 flex justify-between items-center">
                          <div className="flex items-center">
                            <h3 className="text-base text-purple-800 tracking-wide flex items-center">
                              <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                              セリフ {index + 1}
                            </h3>
                            <div className="flex ml-6">
                              {phrase.tags.map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className={`text-xs font-bold ${getTagColor(
                                    tag
                                  )} px-2 py-0.5 rounded-full mr-3`}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="pt-4 pb-6 px-4">
                          <p className="text-lg font-semibold text-purple-800 leading-8">
                            {phrase.quote
                              .split(/<keyword>|<\/keyword>/)
                              .map((part, i) =>
                                i % 2 === 0 ? (
                                  part
                                ) : (
                                  <span key={i} className="text-2xl font-bold">
                                    {part}
                                  </span>
                                )
                              )}
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            {phrase.background}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 雑学セクション */}
            <div className="bg-white rounded-lg shadow-md border border-purple-100 col-span-1">
              <div className="py-6 px-4 bg-gradient-to-r from-purple-200 to-blue-200">
                <h2 className="text-xl font-semibold text-gray-800 tracking-wider flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  面白い雑学
                </h2>
              </div>
              <div className="py-6 px-4">
                {triviasLoading ? (
                  <TriviaSkeletonLoader />
                ) : triviasError ? (
                  <ErrorCard error={triviasError} retry={generateTrivias} />
                ) : (
                  <div className="space-y-6">
                    {trivias.map((trivia, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-lg shadow-sm border border-purple-100"
                      >
                        <div className="py-3 px-4 bg-gradient-to-r from-purple-50 to-blue-50 flex justify-between items-center">
                          <div className="flex items-center">
                            <h3 className="text-base text-purple-800 tracking-wide flex items-center">
                              <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                              雑学 {index + 1}
                            </h3>
                          </div>
                        </div>
                        <div className="pt-4 pb-6 px-4">
                          <p className="text-lg font-semibold text-purple-800 leading-8">
                            {trivia.content
                              .split(/<keyword>|<\/keyword>/)
                              .map((part, i) =>
                                i % 2 === 0 ? (
                                  part
                                ) : (
                                  <span key={i} className="text-2xl font-bold">
                                    {part}
                                  </span>
                                )
                              )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 用語集セクション */}
            <div className="bg-white rounded-lg shadow-md border border-purple-100 col-span-1">
              <div className="py-6 px-4 bg-gradient-to-r from-purple-200 to-blue-200">
                <h2 className="text-xl font-semibold text-gray-800 tracking-wider flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  関連用語
                </h2>
              </div>
              <div className="py-6 px-4">
                {glossaryLoading ? (
                  <GlossarySkeletonLoader />
                ) : glossaryError ? (
                  <ErrorCard error={glossaryError} retry={generateGlossary} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-purple-800 w-1/3">
                          用語
                        </TableHead>
                        <TableHead className="text-purple-800">定義</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {glossary.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-bold text-purple-800 text-lg">
                            {item.term}
                          </TableCell>
                          <TableCell className="text-gray-700">
                            {item.definition}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            {/* キーパーソンセクション */}
            <div className="bg-white rounded-lg shadow-md border border-purple-100 col-span-1">
              <div className="py-6 px-4 bg-gradient-to-r from-purple-200 to-blue-200">
                <h2 className="text-xl font-semibold text-gray-800 tracking-wider flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  キーパーソン
                </h2>
              </div>
              <div className="py-6 px-4">
                {keyPersonsLoading ? (
                  <KeyPersonsSkeletonLoader />
                ) : keyPersonsError ? (
                  <ErrorCard
                    error={keyPersonsError}
                    retry={generateKeyPersons}
                  />
                ) : (
                  <div className="space-y-6">
                    {keyPersons.map((person, index) => (
                      <Card
                        key={index}
                        className="bg-white rounded-lg shadow-sm border border-purple-100"
                      >
                        <CardContent className="p-6">
                          <div className="flex flex-col">
                            <h3 className="text-xl font-bold text-purple-800 mb-2">
                              {person.name}
                            </h3>
                            <p className="text-gray-700 mb-4">
                              {person.description}
                            </p>
                            <div className="flex space-x-4">
                              {person.x && (
                                <a
                                  href={person.x}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-600 hover:text-gray-800"
                                  onClick={() =>
                                    handleExternalLinkClick("x", person.x)
                                  }
                                >
                                  <Twitter className="w-5 h-5" />
                                </a>
                              )}
                              {person.linkedin && (
                                <a
                                  href={person.linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-600 hover:text-gray-800"
                                  onClick={() =>
                                    handleExternalLinkClick(
                                      "linkedin",
                                      person.linkedin
                                    )
                                  }
                                >
                                  <Linkedin className="w-5 h-5" />
                                </a>
                              )}
                              {person.website && (
                                <a
                                  href={person.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-600 hover:text-gray-800"
                                  onClick={() =>
                                    handleExternalLinkClick(
                                      "website",
                                      person.website
                                    )
                                  }
                                >
                                  <Globe className="w-5 h-5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4"
            role="alert"
          >
            <strong className="font-bold">エラー: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {isThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-800 bg-opacity-30 flex items-center justify-center z-50"
          >
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold text-purple-800 mb-8">
                AIが考えています...
              </h3>
              <div className="flex justify-center space-x-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-4 h-4 bg-purple-600 rounded-full"
                    animate={{
                      y: [0, -20, 0],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
              <p className="text-slate-600 mt-6 text-center">
                膨大なデータを分析し、
                <br />
                最適な回答を生成しています。
              </p>
            </div>
          </motion.div>
        )}
      </div>

      <Footer
        setIsHowToUseOpen={handleHowToUseOpen}
        setIsAboutOpen={handleAboutOpen}
      />

      <HowToUseModal isOpen={isHowToUseOpen} setIsOpen={handleHowToUseOpen} />
      <AboutModal isOpen={isAboutOpen} setIsOpen={handleAboutOpen} />
    </div>
  );
}

// SearchInput コンポーネントを更新
function SearchInput({
  keyword,
  setKeyword,
  generateContent,
  isLoading,
  inputRef,
}: SearchInputProps) {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="absolute inset-0 rounded-full overflow-hidden z-20 pointer-events-none">
        <BorderBeam />
      </div>
      <div className="flex relative z-10">
        <div className="relative flex-grow">
          <Input
            ref={inputRef}
            type="text"
            placeholder="用語やトピックを入力"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.nativeEvent.isComposing &&
                keyword.trim()
              ) {
                generateContent();
              }
            }}
            className="w-full h-16 pr-4 border-2 border-purple-300 focus:border-purple-500 focus:ring-0 rounded-full py-3 px-6 text-xl tracking-wide bg-white text-purple-800 placeholder-purple-400 transition-colors duration-200"
          />
        </div>
        <Button
          onClick={generateContent}
          disabled={!keyword.trim() || isLoading}
          className="absolute right-[2px] top-[2px] h-[60px] px-8 rounded-r-full bg-purple-500 text-white text-xl font-bold tracking-wide hover:bg-purple-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          ) : (
            "調べる"
          )}
        </Button>
      </div>
    </div>
  );
}

function PhrasesSkeletonLoader() {
  return (
    <>
      {[1, 2, 3].map((_, index) => (
        <Card
          key={index}
          className="mb-6 overflow-hidden bg-white rounded-lg shadow-sm border border-purple-100"
        >
          <CardHeader className="p-6 bg-gradient-to-r from-purple-50 to-blue-50">
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-full mb-4" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}

function GlossarySkeletonLoader() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-purple-800">
            <Skeleton className="h-4 w-16" />
          </TableHead>
          <TableHead className="text-purple-800">
            <Skeleton className="h-4 w-32" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[1, 2, 3].map((_, index) => (
          <TableRow key={index}>
            <TableCell>
              <Skeleton className="h-4 w-1/4" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function KeyPersonsSkeletonLoader() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((_, index) => (
        <Card
          key={index}
          className="bg-white rounded-lg shadow-sm border border-purple-100"
        >
          <CardContent className="p-6">
            <div className="flex flex-col">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-64 mb-4" />
              <div className="flex space-x-4">
                <Skeleton className="w-5 h-5" />
                <Skeleton className="w-5 h-5" />
                <Skeleton className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// エラー表示用のカードコンポーネント
function ErrorCard({ error, retry }: { error: string; retry: () => void }) {
  return (
    <Card className="bg-red-100 border border-red-400">
      <CardContent className="py-3 px-4">
        <p className="text-red-700 mb-2">{error}</p>
        <Button
          onClick={retry}
          className="bg-red-500 hover:bg-red-600 text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          リトライ
        </Button>
      </CardContent>
    </Card>
  );
}

// 新しい TriviaSkeletonLoader コンポーネントを追加
function TriviaSkeletonLoader() {
  return (
    <>
      {[1, 2, 3].map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-sm border border-purple-100 mb-6"
        >
          <div className="py-3 px-4 bg-gradient-to-r from-purple-50 to-blue-50 flex justify-between items-center">
            <Skeleton className="h-6 w-1/3" />
          </div>
          <div className="pt-4 pb-6 px-4">
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        </div>
      ))}
    </>
  );
}

function Footer({
  setIsHowToUseOpen,
  setIsAboutOpen,
}: {
  setIsHowToUseOpen: (isOpen: boolean) => void;
  setIsAboutOpen: (isOpen: boolean) => void;
}) {
  return (
    <footer className=" text-slate-800 py-6 mt-12">
      <div className="container mx-auto px-4 flex flex-col items-center">
        <div className="flex space-x-8 mb-4">
          <button
            onClick={() => setIsHowToUseOpen(true)}
            className="text-sm hover:underline transition-colors duration-200"
          >
            使い方
          </button>
          <button
            onClick={() => setIsAboutOpen(true)}
            className="text-sm hover:underline transition-colors duration-200"
          >
            このサイトについて
          </button>
        </div>
        <div>
          <p className="text-sm">
            &copy; 2024 インテリメーカー All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
function HowToUseModal({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>インテリメーカーの使い方</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <p>
            1. 用語・トピックを入力:
            興味のあるトピックや知りたい分野の用語・トピックを入力します。
          </p>
          <p>
            2. 生成ボタンをクリック:
            AIが入力された用語・トピックに基づいて、関連する情報を生成します。
          </p>
          <p>
            3. 結果を確認:
            生成された「賢く聞こえるセリフ」、「面白い雑学」、「関連用語」、「キーパーソン」の情報を確認します。
          </p>
          <p>
            4. 情報を活用:
            生成された情報を会話や学習に活用し、知識の幅を広げましょう。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AboutModal({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>インテリメーカーについて</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <p>
            インテリメーカーは、AIの力を活用して、ユーザーの知識の幅を広げ、会話力を向上させることを目的としたツールです。
          </p>
          <p>
            私たちの目標は、ユーザーが様々なトピックについて深い洞察を得られるようサポートし、知的好奇心を刺激することです。
          </p>
          <p>
            このツールを通じて、ユーザーがより豊かな会話や議論を楽しみ、新しい視点を得られることを願っています。
          </p>
          <p>
            常に改善を重ね、ユーザーの皆様により良い体験を提供できるよう努めてまいります。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// コンポーネントの外部に新しいスケルトンローダーを追加
function ExplanationSkeletonLoader() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  );
}
