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
  Sparkles,
  BookOpen,
  User,
  Trophy,
  RefreshCw,
  MessageSquare,
  X,
  Search,
  Check,
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
import { useSpring, animated } from "react-spring";
import styles from "@/app/styles/ProgressBar.module.css";
import cursorStyles from "@/app/styles/Cursor.module.css";

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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 100000);

  try {
    const response = await fetch("/api/perplexity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ systemPrompt, userPrompt }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    return data.content;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("リクエストがタイムアウトしました");
    }
    throw error;
  }
}

// 型定義を更新
interface Topic {
  information: string;
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

// 新しいインターフェースを追加
interface ImpressionPhrase {
  content: string;
  highlightedWords: string[];
}

// 新しい generateWithGemini 関数を追加
async function generateWithGemini(prompt: string): Promise<string> {
  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate content");
    }

    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}

const WisdomFountain = () => {
  const [main_topic, setMain_topic] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [trivias, setTrivias] = useState<Trivia[]>([]);
  const [glossary, setGlossary] = useState<GlossaryItem[]>([]);
  const [keyPersons, setKeyPersons] = useState<KeyPerson[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [triviasLoading, setTriviasLoading] = useState(false);
  const [glossaryLoading, setGlossaryLoading] = useState(false);
  const [keyPersonsLoading, setKeyPersonsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [triviasError, setTriviasError] = useState<string | null>(null);
  const [glossaryError, setGlossaryError] = useState<string | null>(null);
  const [keyPersonsError, setKeyPersonsError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [slowProgressInterval, setSlowProgressInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [impressionPhrases, setImpressionPhrases] = useState<
    ImpressionPhrase[]
  >([]);
  const [impressionPhrasesLoading, setImpressionPhrasesLoading] =
    useState(false);
  const [impressionPhrasesError, setImpressionPhrasesError] = useState<
    string | null
  >(null);

  const exampleKeywords = ["大谷翔平", "トヨタ自動車株式会社", "生成AI"];

  const handleExampleClick = (example: string) => {
    setMain_topic(example);
    // フォーカスを当てる
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    console.log("Updated Topics:", topics);
  }, [topics]);

  useEffect(() => {
    console.log("Updated Glossary:", glossary);
  }, [glossary]);

  useEffect(() => {
    console.log("Updated Key Persons:", keyPersons);
  }, [keyPersons]);

  useEffect(() => {
    if (isLoading) {
      const keywords = [
        "魅力",
        "強み",
        "ライバル",
        "仲間",
        "関連用語",
        "歴史",
        "最新ニュース",
        "海外の反応",
        "注目の話題",
        "影響力",
        "課題",
        "将来性",
        "技術",
        "文化的側面",
        "経済効果",
        "社会的影響",
        "環境への影響",
        "倫理的側面",
        "国際関係",
        "法律関係",
        "教育的観点",
        "心理的影響",
        "科学的根拠",
        "豆知識",
      ];
      let isTyping = true;
      let text = "";
      let currentKeyword = "";

      const typeText = () => {
        if (isTyping) {
          if (text.length < main_topic.length) {
            text += main_topic[text.length];
            setLoadingText(text);
            setTimeout(typeText, 100);
          } else if (text.length === main_topic.length) {
            text += "　";
            currentKeyword =
              keywords[Math.floor(Math.random() * keywords.length)];
            setLoadingText(text);
            setTimeout(typeText, 250);
          } else {
            if (text.length < main_topic.length + currentKeyword.length + 1) {
              text += currentKeyword[text.length - main_topic.length - 1];
              setLoadingText(text);
              setTimeout(typeText, 100);
            } else {
              isTyping = false;
              setTimeout(eraseText, 2000);
            }
          }
        }
      };

      const eraseText = () => {
        if (!isTyping) {
          if (text.length > main_topic.length + 1) {
            text = text.slice(0, -1);
            setLoadingText(text);
            setTimeout(eraseText, 50);
          } else {
            isTyping = true;
            currentKeyword =
              keywords[Math.floor(Math.random() * keywords.length)];
            setTimeout(typeText, 500);
          }
        }
      };

      typeText();

      return () => {
        isTyping = false;
      };
    } else {
      setLoadingText("");
    }
  }, [isLoading, main_topic]);

  interface TopicItem {
    information: string;
    background: string;
    tags: string[];
  }

  const generateTopics = async () => {
    setTopicsLoading(true);
    setTopicsError(null);
    try {
      const systemPrompt =
        "与えられたキーワードに関連する、興味深い情報を生成してください。常に指定されたJSONフォーマットで回答してください。ハルシネーションを起こさないでください。";
      const userPrompt = `
      メイントピック「${main_topic}」について、注目すべき情報を5つ生成してください。各情報は30文字以上にまとめて、素人にもわかる詳しい200文字以上の背景説明を付けてください。

      情報の中で重要なキーワードや専門用語や大事なポイントには<keyword>タグを付けてください。例: <keyword>重要な用語</keyword>
      背景説明には<keyword>タグを使用しないでください。

      以下の4つのタグを当てはまる場合にのみ付けてください：
      - トレンド：最新の動向や流行を示す情報
      - 問題提起：業界や分野における課題や問題点を指摘する情報
      - 競合情報：${main_topic}の競合他社や競合製品に関する洞察
      - 表彰・称賛：業界内での評価や成果に関する情報

      これらのタグに関連する情報を含む情報を優先的に生成してください。

      以下のJSONフォーマットで出力してください。正しいJSONのみを返し、追加の説明やコメントや改行や制御文字は含めないでください。

      {
        "topics": [
          {
            "information": "情報1（<keyword>タグ付き）",
            "background": "背景説明1（タグなし）",
            "tags": ["トレンド", "競合情報"]
          },
          {
            "information": "情報2（<keyword>タグ付き）",
            "background": "背景説明2（タグなし）",
            "tags": ["問題提起"]
          }
        ]
      }`;

      const topicsText = await generateWithPerplexity(systemPrompt, userPrompt);

      try {
        const topicsJson = cleanAndParseJSON("話題", topicsText, main_topic);
        console.log("Parsed topics JSON:", topicsJson);

        if (!topicsJson.topics || !Array.isArray(topicsJson.topics)) {
          throw new Error("Invalid topics structure in response");
        }

        const newTopics = topicsJson.topics.map((item: TopicItem) => ({
          information: item.information,
          background: item.background.replace(/<\/?keyword>/g, ""),
          tags: item.tags || [],
        }));

        return newTopics;
      } catch (error) {
        console.error("トピックの処理中にエラーが発生しました:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setTopicsError(
          `トピックの生成中にエラーが発生しました: ${errorMessage}`
        );

        // GAにエラーイベントを送信
        sendGAEvent("content_generation_error", {
          keyword: main_topic,
          section: "topics",
          error: errorMessage,
        });
        return []; // エラーが発生した場合でも空の配列を返す
      }
    } catch (error) {
      console.error("Detailed error:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setTopicsError(
        `コンテンツの生成中にエラーが発生しました。もう一度お試しください。`
      );

      // GAにエラーイベントを送信
      sendGAEvent("content_generation_error", {
        keyword: main_topic,
        section: "topics",
        error: errorMessage,
      });
      return []; // エラーが発生した場合でも空の配列を返す
    } finally {
      setTopicsLoading(false);
    }
  };

  const generateTrivias = async () => {
    setTriviasLoading(true);
    setTriviasError(null);
    try {
      const systemPrompt =
        "与えられたキーワードに関連する面白い雑学を生成してください。常に指定されたJSONフォーマットで回答してください。ハルシネーションを起こさないでください。";
      const userPrompt = `
      メイントピック「${main_topic}」に関連する面白い雑学を5つ生成してください。各雑学は100文字程度で、興味深く、記憶に残るものにしてください。
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
      }`;

      const triviasText = await generateWithPerplexity(
        systemPrompt,
        userPrompt
      );

      try {
        const triviasJson = cleanAndParseJSON("雑学", triviasText, main_topic);

        if (!triviasJson.trivias || !Array.isArray(triviasJson.trivias)) {
          throw new Error("Invalid trivias structure in response");
        }

        const newTrivias = triviasJson.trivias.map(
          (item: { content: string }) => ({
            content: item.content,
          })
        );

        return newTrivias;
      } catch (error) {
        console.error("雑学の処理中にエラーが発生しました:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setTriviasError(`雑学の生成中にエラーが発生しました: ${errorMessage}`);

        // GAにエラーイベントを送信
        sendGAEvent("content_generation_error", {
          keyword: main_topic,
          section: "trivias",
          error: errorMessage,
        });
        return []; // エラーが発生した場合でも空の配列を返す
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
        keyword: main_topic,
        section: "trivias",
        error: errorMessage,
      });
      return []; // エラーが発生した場合でも空の配列を返す
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
      メイントピック「${main_topic}」に関連する8つの重要な用語とその素人にもわかる詳しい100文字以上の説明を日本語で生成してください。
      以下の点に注意してください：
      1. 人物名やキャラクター名は含めないでください。
      2. 一般的な概念、技術用語、プロセス、理論などに焦点を当ててください。メイントピック「${main_topic}」との関連性も含めてください。
      3. 各用語は、メイントピックに直接関連し、その分野の理解を深めるものを選んでください。

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
      }`;
      const glossaryText = await generateWithPerplexity(
        systemPrompt,
        userPrompt
      );

      // 用語集の処理
      try {
        const glossaryJson = cleanAndParseJSON(
          "用語集",
          glossaryText,
          main_topic
        );
        console.log("Parsed glossary JSON:", glossaryJson);
        return Array.isArray(glossaryJson.glossary)
          ? glossaryJson.glossary
          : [];
      } catch (error) {
        console.error("用語集の処理中にエラーが発生しました:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setGlossaryError("用語集の生成中にエラーが発生しました。");

        // GAにエラーイベントを送信
        sendGAEvent("content_generation_error", {
          keyword: main_topic,
          section: "glossary",
          error: errorMessage,
        });
        return []; // エラーが発生した場合でも空の配列を返す
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
        keyword: main_topic,
        section: "glossary",
        error: errorMessage,
      });
      return []; // エラーが発生した場合でも空の配列を返す
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
        メイントピック「${main_topic}」に関連する重要な人物を5人選び、以下の情報を日本語で生成してください：
        1. その人物の名前
        2. 素人にもわかる詳しい100文字以上の説明（その人物の経歴や業績に加え、メイントピック「${main_topic}」との関連性も含めてください）

        以下のJSONフォーマットで出力してください。正しいJSONのみを返し、追加の説明やコメントや改行や制御文字は含めないでください。
        実在する人物を選んでください。ハルシネーションを起こさないでください。

        {
          "keyPersons": [
            {
              "name": "人物名1",
              "description": "人物の説明1（メイントピックとの関連性を含む）"
            },
            {
              "name": "人物名2",
              "description": "人物の説明2（メイントピックとの関連性を含む）"
            }
          ]
        }`;

      const keyPersonText = await generateWithPerplexity(
        systemPrompt,
        userPrompt
      );

      const keyPersonJson = cleanAndParseJSON(
        "キーパーソン",
        keyPersonText,
        main_topic
      );
      console.log("Parsed key person JSON:", keyPersonJson);

      const newKeyPersons = Array.isArray(keyPersonJson.keyPersons)
        ? keyPersonJson.keyPersons
        : [];
      return newKeyPersons;
    } catch (error) {
      console.error("キーパーソンの処理中にエラーが発生しました:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setKeyPersonsError(
        `キーパーソンの生成中にエラーが発生しました: ${errorMessage}`
      );

      // GAにエラーイベントを送信
      sendGAEvent("content_generation_error", {
        keyword: main_topic,
        section: "keyPersons",
        error: errorMessage,
      });
      return []; // エラーが発生した場合でも空の配列を返す
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
      keyword: main_topic,
      section,
      error: errorMessage,
    });

    // セクション別のエラー状態を更新
    switch (section) {
      case "topics":
        setTopicsError(
          `トピックの生成中にエラーが発生しました: ${errorMessage}`
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
  // アニメーション用のスプリングを定義
  const props = useSpring({
    width: `${progress}%`,
    from: { width: "0%" },
  });

  // プログレスバーをゆっくり進める関数
  const startSlowProgress = (start: number, end: number) => {
    if (slowProgressInterval) clearInterval(slowProgressInterval);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= end) {
          clearInterval(interval);
          return end;
        }
        return prev + 0.1;
      });
    }, 100);
    setSlowProgressInterval(interval);
  };

  const updateProgress = () => {
    setCompletedTasks((prev) => {
      const newCompleted = prev + 1;
      const newProgress = (newCompleted / 5) * 100;
      setProgress(newProgress);
      if (newCompleted < 5) {
        startSlowProgress(newProgress, ((newCompleted + 1) / 5) * 100 - 1);
      } else {
        startSlowProgress(newProgress, 100);
      }
      return newCompleted;
    });
    console.log(completedTasks);
  };

  const generateContent = async () => {
    if (main_topic.trim() === "") return;
    setShowResults(true);
    setIsLoading(true);
    setIsThinking(true);
    clearErrors();
    setProgress(0);
    setCompletedTasks(0);
    setLoadingText("");
    startSlowProgress(0, 19);

    sendGAEvent("search", {
      event_category: "Search",
      keyword: main_topic,
    });

    // 結果をクリア
    setTopics([]);
    setTrivias([]);
    setGlossary([]);
    setKeyPersons([]);
    setImpressionPhrases([]);

    // ローディング状態をセット
    setTopicsLoading(true);
    setTriviasLoading(true);
    setGlossaryLoading(true);
    setKeyPersonsLoading(true);
    setImpressionPhrasesLoading(true);

    try {
      // 各生成関数を並列に実行
      const [topicsResult, triviasResult, glossaryResult, keyPersonsResult] =
        await Promise.all([
          generateTopics().then((result) => {
            setTopics(result);
            updateProgress();
            return result;
          }),
          generateTrivias().then((result) => {
            setTrivias(result);
            updateProgress();
            return result;
          }),
          generateGlossary().then((result) => {
            setGlossary(result);
            updateProgress();
            return result;
          }),
          generateKeyPersons().then((result) => {
            setKeyPersons(result);
            updateProgress();
            return result;
          }),
        ]);

      const newImpressionPhrases = await generateImpressionPhrases(
        topicsResult,
        triviasResult,
        glossaryResult,
        keyPersonsResult
      );
      setImpressionPhrases(newImpressionPhrases);
      updateProgress();
    } catch (error) {
      displaySectionError("general", error);
    } finally {
      // すべてのタスクが完了したら、プログレスバーを100%にし、チェックマークを表示
      setProgress(100);
      setShowCheckmark(true);
      setTimeout(() => {
        setIsLoading(false);
        setIsThinking(false);
        setShowCheckmark(false);
      }, 2000); // 2秒後にローディングモーダルを閉じる
    }
  };

  // エラーをクリアする関数
  const clearErrors = () => {
    setError(null);
    setTopicsError(null);
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

  // generateImpressionPhrases関数をコンポーネント内に移動
  const generateImpressionPhrases = async (
    topics: Topic[],
    trivias: Trivia[],
    glossary: GlossaryItem[],
    keyPersons: KeyPerson[]
  ): Promise<ImpressionPhrase[]> => {
    setImpressionPhrasesLoading(true);
    setImpressionPhrasesError(null);
    try {
      const context = JSON.stringify({
        topics: topics.map((t) => t.information),
        trivias: trivias.map((t) => t.content),
        glossary: glossary.map((g) => `${g.term}: ${g.definition}`),
        keyPersons: keyPersons.map((k) => `${k.name}: ${k.description}`),
      });

      const prompt = `メイントピック「${main_topic}」について、以下の情報をもとに、上司やクライアントから「こいつわかってるな」「お、そんなことまで知ってるんだ」「君、賢いね」と思わせるようなセリフをメイントピックを含めて6個生成してください。
      各セリフは100文字以内にしてください。セリフの中でメイントピック「${main_topic}」と重要なキーワードは<keyword>タグで囲んでください。
      「〜ですよね」という口調にしてください。
      「実は」「案外」「データによると」「注目すべきなのは」「マクロ的に見ると」「本質的には」など知的に聞こえるワードを適切に含めてください。

      コンテキスト:
      ${context}

      出力形式:
      以下のようにJSONフォーマットで出力してください。正しいJSONのみを返し、追加の説明やコメントや改行や制御文字は含めないでください。

      [
        {
          "content": "セリフ1（<keyword>タグ付き）"
        },
        {
          "content": "セリフ2（<keyword>タグ付き）"
        }
      ]
      `;

      const response = await generateWithGemini(prompt);
      console.log(response);
      const impressionPhrases: ImpressionPhrase[] = JSON.parse(response);
      return impressionPhrases;
    } catch (error) {
      console.error("賢く聞こえるセリフの生成中にエラーが発生しました:", error);
      setImpressionPhrasesError("賢く聞こえるセリフを生成できませんでした。");
      return [];
    } finally {
      setImpressionPhrasesLoading(false);
    }
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
                keyword={main_topic}
                setKeyword={setMain_topic}
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
            <div className="bg-white rounded-lg shadow-md border border-purple-100 col-span-1 md:col-span-2 w-full">
              <div className="py-6 px-4 bg-gradient-to-r from-purple-300 to-blue-300">
                <h2 className="text-2xl font-semibold text-gray-800 tracking-wider flex items-center">
                  <MessageSquare className="w-7 h-7 mr-2" />
                  賢く聞こえるセリフ
                </h2>
              </div>
              <div className="py-6 px-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {impressionPhrasesLoading ? (
                  <ImpressionPhrasesSkeletonLoader />
                ) : impressionPhrasesError ? (
                  <ErrorCard
                    error={impressionPhrasesError}
                    retry={() =>
                      generateImpressionPhrases(
                        topics,
                        trivias,
                        glossary,
                        keyPersons
                      )
                    }
                  />
                ) : (
                  <>
                    {impressionPhrases.map((phrase, index) => (
                      <div
                        key={index}
                        className="bg-purple-50 rounded-lg py-8 px-6 shadow-sm border border-purple-200 relative overflow-hidden flex items-center"
                      >
                        {/* 背景の引用符 */}
                        <div className="absolute -top-1 -left-1 text-purple-300 text-8xl font-serif opacity-30">
                          ”
                        </div>
                        {/* セリフ本文 */}
                        <div className="relative z-10">
                          <p className="text-lg font-semibold text-purple-800 italic leading-9">
                            {phrase.content
                              .split(/<keyword>|<\/keyword>/)
                              .map((part, i) =>
                                i % 2 === 0 ? (
                                  part
                                ) : (
                                  <span key={i} className="font-bold text-2xl">
                                    {part}
                                  </span>
                                )
                              )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* 横線と参考情報のテキストを追加 */}
            <div className="col-span-1 md:col-span-2 w-full mt-4 mb-8">
              <hr className="my-8 border-t-2 border-gray-300" />
              <p className="text-center text-xl font-bold text-gray-700">
                以下、セリフ生成に使用した情報
              </p>
            </div>

            {/* 話題セクション */}
            <div className="bg-white rounded-lg shadow-md border border-purple-100 col-span-1">
              <div className="py-6 px-4 bg-gradient-to-r from-purple-100 to-blue-100">
                <h2 className="text-xl font-semibold text-gray-800 tracking-wider flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  注目の話題
                </h2>
              </div>
              <div className="py-6 px-4">
                {topicsLoading ? (
                  <TopicsSkeletonLoader />
                ) : topicsError ? (
                  <ErrorCard error={topicsError} retry={generateTopics} />
                ) : (
                  <div className="space-y-6">
                    {topics.map((topic, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-lg shadow-sm border border-purple-100"
                      >
                        <div className="py-3 px-4 bg-gradient-to-r from-purple-50 to-blue-50 flex justify-between items-center">
                          <div className="flex items-center">
                            <h3 className="text-base text-purple-800 tracking-wide flex items-center">
                              <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                              話題 {index + 1}
                            </h3>
                            <div className="flex ml-6">
                              {topic.tags.map((tag, tagIndex) => (
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
                            {topic.information
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
                            {topic.background}
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
              <div className="py-6 px-4 bg-gradient-to-r from-purple-100 to-blue-100">
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
              <div className="py-6 px-4 bg-gradient-to-r from-purple-100 to-blue-100">
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
              <div className="py-6 px-4 bg-gradient-to-r from-purple-100 to-blue-100">
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
                            <p className="text-gray-700">
                              {person.description}
                            </p>
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
            <div className="bg-white rounded-lg px-8 py-14 max-w-2xl w-full">
              <h3 className="text-3xl font-bold text-purple-800 mb-14 text-center">
                {showCheckmark ? "完了しました！" : "AIが考えています..."}
              </h3>
              {!showCheckmark && (
                <div className="flex justify-center space-x-4 mb-8">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-6 h-6 bg-purple-600 rounded-full"
                      animate={{
                        y: [0, -30, 0],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              )}
              {!showCheckmark && (
                <div className="mt-6 p-4 bg-gray-100 rounded-lg flex items-center mb-8">
                  <Search className="text-purple-500 w-8 h-8 mr-4" />
                  <p className="text-slate-600 flex-grow text-2xl">
                    {loadingText}
                    <span className={cursorStyles.cursor}>|</span>
                  </p>
                </div>
              )}
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <animated.div
                  style={props}
                  className={`h-full bg-purple-600 rounded-full ${styles.stripedBar}`}
                />
              </div>
              {showCheckmark && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="flex justify-center mt-8"
                >
                  <div className="bg-green-500 rounded-full p-2">
                    <Check className="w-8 h-8 text-white" />
                  </div>
                </motion.div>
              )}
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
};

// SearchInput コンポーネントを更新
function SearchInput({
  keyword,
  setKeyword,
  generateContent,
  isLoading,
  inputRef,
}: SearchInputProps) {
  const handleClear = () => {
    setKeyword("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="absolute inset-0 rounded-full overflow-hidden z-20 pointer-events-none">
        <BorderBeam />
      </div>
      <div className="flex relative z-10">
        <div className="relative flex-grow">
          <div className="absolute left-[15px] top-1/2 transform -translate-y-1/2">
            <Search className="h-5 w-5 text-purple-500" />
          </div>
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
            className="w-full h-16 pr-24 border-2 border-purple-300 focus:border-purple-500 focus:ring-0 rounded-full py-3 px-11 text-xl tracking-wide bg-white text-purple-800 placeholder-purple-400 transition-colors duration-200"
          />
        </div>
        {keyword && (
          <button
            onClick={handleClear}
            className="absolute right-[140px] top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 z-10 bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <Button
          onClick={generateContent}
          disabled={!keyword.trim() || isLoading}
          className="absolute right-[2px] top-[2px] h-[60px] w-[120px] rounded-r-full bg-purple-500 text-white text-xl font-bold tracking-wide hover:bg-purple-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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

function TopicsSkeletonLoader() {
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
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6" />
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
      <DialogContent className="sm:max-w-[600px] bg-white">
        <DialogHeader>
          <DialogTitle>インテリメーカーの使い方</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-2 pb-4">
            <p className="font-bold text-purple-800">1. 用語・トピックを入力</p>
            <p>
              <b>気になるキーワード</b>を入力して
              <br />
              <b>「調べる」</b>を押してください。
            </p>
          </div>
          <div className="space-y-2 pb-4">
            <p className="font-bold text-purple-800">2. 結果を確認</p>
            <p>
              <b>賢く聞こえるセリフ</b>が生成されます。
              <br />
              <b>セリフのもとになった各種情報</b>も確認できます。
            </p>
          </div>
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>インテリメーカーについて</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-2 pb-4">
            <p className="font-bold text-purple-800">概要</p>
            <p>
              <b>今すぐ”デキる人”の評価が欲しいあなたへ。</b>
              <br />
              お題に合わせて賢さ溢れるセリフをAIが提案。
              <br />
              あなたはセリフを読み上げるだけで注目される存在になれます。
            </p>
          </div>
          <div className="space-y-2 pb-4">
            <p className="font-bold text-purple-800">開発背景</p>
            <p>
              <b>周りの人から賢く見られると、得をします。</b>
            </p>
            <p>
              上司や先輩とのやり取りにおいて、
              <br />
              クライアントとの商談において、
              <br />
              あるいは恋人との会話において。
            </p>
            <p>
              インターネット上に情報はたくさんありますが、
              <br />
              いくら知識を蓄えたところで
              <b>アウトプットしなければ価値を発揮しません。</b>
            </p>
            <p>
              インテリメーカーでは、
              <br />
              アウトプットしやすいようにセリフをご用意します。
              <br />
              <b>セリフを口にすれば、きっと周りからの印象が変わるはず。</b>
            </p>
            <p>
              <b>&ldquo;賢い&rdquo;は、作れる。</b>
            </p>
          </div>
          <div className="space-y-2 pb-4">
            <p className="font-bold text-purple-800">使用AI</p>
            <p>Perplexity, Gemini</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// コンポーネントの外部に新しいスケルトンローダーを追加
function ImpressionPhrasesSkeletonLoader() {
  return (
    <>
      {[...Array(4)].map((_, index) => (
        <div
          key={index}
          className="bg-purple-50 rounded-lg py-8 px-6 shadow-sm border border-purple-200 relative overflow-hidden flex items-center"
        >
          <div className="absolute -top-1 -left-1 text-purple-300 text-12xl font-serif opacity-30">
            ”
          </div>
          <div className="relative z-10 w-full mx-auto">
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-6 w-4/5" />
          </div>
        </div>
      ))}
    </>
  );
}

export default WisdomFountain;
