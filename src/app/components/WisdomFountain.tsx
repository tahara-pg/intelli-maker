"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Lightbulb,
  Trophy,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Skeleton } from "@/components/ui/skeleton";

// Gemini APIの設定
const genAI = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ""
);

// 型定義を更新
interface Phrase {
  quote: string;
  background: string;
  rating: number;
  tags: string[]; // 新しいタグフィールドを追加
}

interface GlossaryItem {
  term: string;
  definition: string;
}

interface KeyPerson {
  name: string;
  description: string;
  image: string;
  twitter: string;
  linkedin: string;
  website: string;
}

const initialQuotes = [
  "知識は宝物、集めるほど豊かになる",
  "頭がよくなると、夢が叶いやすくなる",
  "賢くなれば、仲間が増える",
  "賢い人は、困った人を助けられる",
  "学べば学ぶほど、楽しいことが増える",
];

// SearchInput コンポーネントの型定義を追加
interface SearchInputProps {
  keyword: string;
  setKeyword: (value: string) => void;
  generateContent: () => void;
  isLoading: boolean;
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

export default function WisdomFountain() {
  const [keyword, setKeyword] = useState("");
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [glossary, setGlossary] = useState<GlossaryItem[]>([]);
  const [keyPersons, setKeyPersons] = useState<KeyPerson[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [praise, setPraise] = useState("");
  const [currentQuote, setCurrentQuote] = useState(initialQuotes[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phrasesLoading, setPhrasesLoading] = useState(false);
  const [glossaryLoading, setGlossaryLoading] = useState(false);
  const [keyPersonsLoading, setKeyPersonsLoading] = useState(false);
  const [phrasesError, setPhrasesError] = useState<string | null>(null);
  const [glossaryError, setGlossaryError] = useState<string | null>(null);
  const [keyPersonsError, setKeyPersonsError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote(
        initialQuotes[Math.floor(Math.random() * initialQuotes.length)]
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const praises = [
      "知識は宝物、集めるほど豊かになる",
      "頭がよくなると、夢が叶いやすくなる",
      "賢くなれば、仲間が増える",
      "賢い人は、困った人を助けられる",
      "学べば学ぶほど、楽しいことが増える",
    ];
    setPraise(praises[Math.floor(Math.random() * praises.length)]);
  }, [showResults]);

  useEffect(() => {
    console.log("Updated Phrases:", phrases);
  }, [phrases]);

  useEffect(() => {
    console.log("Updated Glossary:", glossary);
  }, [glossary]);

  useEffect(() => {
    console.log("Updated Key Persons:", keyPersons);
  }, [keyPersons]);

  const cleanAndParseJSON = (text: string) => {
    try {
      // 文字列内の不正な文字を除去し、JSONとして解析可能な形式に変換
      const cleanedText = text
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // 制御文字を削除
        // .replace(/\\n/g, "\\n") // 改行文字をJSONで使用可能な形式に変換
        // .replace(/\\r/g, "\\r") // キャリッジリターンをJSONで使用可能な形式に変換
        // .replace(/\\t/g, "\\t") // タブをJSONで使用可能な形式に変換
        // .replace(/\\/g, "\\\\") // バックスラッシュをエスケープ
        // .replace(/"/g, '\\"') // ダブルクォートをエスケープ
        // .replace(/'/g, "'") // シングルクォートはそのまま
        .replace(/「/g, "\u300C")
        .replace(/」/g, "\u300D")
        .replace(/『/g, "\u300E")
        .replace(/』/g, "\u300F")
        .trim(); // 前後の空白を削除

      // JSONとして解析
      return JSON.parse(cleanedText);
    } catch (e) {
      console.error("JSON解析エラー:", e);
      console.error("問題のあるJSON文字列:", text);
      throw new Error("JSONの解析に失敗しました");
    }
  };

  const generatePhrases = async () => {
    setPhrasesLoading(true);
    setPhrasesError(null);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // フレーズの生成プロンプトを更新
      const phrasesPrompt = `
キーワード「${keyword}」について、マニアやクライアントから「こいつわかってるな」「お、そんなことまで知ってるんだ」「君、賢いね」と思わせるような、短くて知り合いに話すようなセリフを5つ生成してください。各セリフには素人にもわかる詳しい200文字以上の背景説明と内容に応じた推奨度を付けてください。

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
      "rating": 5,
      "tags": ["トレンド", "競合情報"]
    },
    {
      "quote": "セリフ2（<keyword>タグ付き）",
      "background": "背景説明2（タグなし）",
      "rating": 4.5,
      "tags": ["問題提起"]
    }
  ]
}
`;
      const phrasesResult = await model.generateContent(phrasesPrompt);
      console.log("Received response for phrases:", phrasesResult);

      const phrasesText = phrasesResult.response.text();
      console.log("Raw API response for phrases:", phrasesText);

      const phrasesJson = cleanAndParseJSON(phrasesText);
      console.log("Parsed phrases JSON:", phrasesJson);

      if (!phrasesJson.phrases || !Array.isArray(phrasesJson.phrases)) {
        throw new Error("Invalid phrases structure in response");
      }

      const newPhrases = phrasesJson.phrases.map((item: any) => ({
        quote: item.quote,
        background: item.background.replace(/<\/?keyword>/g, ""), // <keyword>タグを削除
        rating: item.rating,
        tags: item.tags || [],
      }));

      setPhrases(newPhrases);
    } catch (error) {
      console.error("フレーズの処理中にエラーが発生しました:", error);
      setPhrasesError(
        `フレーズの生成中にエラーが発生しました: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setPhrasesLoading(false);
    }
  };

  const generateGlossary = async () => {
    setGlossaryLoading(true);
    setGlossaryError(null);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // 用語集の生成
      const glossaryPrompt = `
キーワード「${keyword}」に関連する8つの重要な用語（人物名は含めないでください）とその素人にもわかる詳しい100文字以上の説明を生成してください。
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
      const glossaryResult = await model.generateContent(glossaryPrompt);
      const glossaryText = glossaryResult.response.text();

      // 用語集の処理
      try {
        const glossaryJson = cleanAndParseJSON(glossaryText);
        console.log("Parsed glossary JSON:", glossaryJson);
        setGlossary(
          Array.isArray(glossaryJson.glossary) ? glossaryJson.glossary : []
        );
      } catch (error) {
        console.error("用語集の処理中にエラーが発生しました:", error);
        setGlossaryError("用語集の生成中にエラーが発生しました。");
      }
    } catch (error) {
      console.error("Detailed error:", error);
      if (error instanceof Error && error.message.includes("SAFETY")) {
        setGlossaryError(
          "申し訳ありませんが、安全性の観点から内容を生成できませんでした。別のキーワードをお試しください。"
        );
      } else {
        setGlossaryError(
          `コンテンツの生成中にエラーが発生しました。もう一度お試しください。`
        );
      }
    } finally {
      setGlossaryLoading(false);
    }
  };

  const generateKeyPersons = async () => {
    setKeyPersonsLoading(true);
    setKeyPersonsError(null);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // キーパーソンの生成
      const keyPersonPrompt = `
キーワード「${keyword}」に関連する重要な人物を5人選び、その人物の名前、素人にもわかる詳しい100文字以上の説明、TwitterとLinkedInのURL、公式ウェブサイトのURLを生成してください。
以下のJSONフォーマットで出力してください。正しいJSONのみを返し、追加の説明やコメントや改行や制御文字は含めないでください。

{
  "keyPersons": [
    {
      "name": "人物名1",
      "description": "人物の説明1",
      "twitter": "https://twitter.com/example1",
      "linkedin": "https://www.linkedin.com/in/example1",
      "website": "https://example1.com"
    },
    {
      "name": "人物名2",
      "description": "人物の説明2",
      "twitter": "https://twitter.com/example2",
      "linkedin": "https://www.linkedin.com/in/example2",
      "website": "https://example2.com"
    }
  ]
}
`;
      const keyPersonResult = await model.generateContent(keyPersonPrompt);
      const keyPersonText = keyPersonResult.response.text();

      // キーパーソンの処理
      try {
        const keyPersonJson = cleanAndParseJSON(keyPersonText);
        console.log("Parsed key person JSON:", keyPersonJson);
        const newKeyPersons = Array.isArray(keyPersonJson.keyPersons)
          ? keyPersonJson.keyPersons.map((person: any) => ({
              ...person,
              image: "https://placehold.jp/100x100.png",
            }))
          : [];
        setKeyPersons(newKeyPersons);
      } catch (error) {
        console.error("キーパーソンの処理中にエラーが発生しました:", error);
        setKeyPersonsError("キーパーソンの生成中にエラーが発生しました。");
      }
    } catch (error) {
      console.error("Detailed error:", error);
      if (error instanceof Error && error.message.includes("SAFETY")) {
        setKeyPersonsError(
          "申し訳ありませんが、安全性の観点から内容を生成できませんでした。別のキーワードをお試しください。"
        );
      } else {
        setKeyPersonsError(
          `コンテンツの生成中にエラーが発生しました。もう一度お試しください。`
        );
      }
    } finally {
      setKeyPersonsLoading(false);
    }
  };

  const generateContent = async () => {
    if (keyword.trim() === "") return;
    setShowResults(true);
    setError(null);
    setIsLoading(true);

    await Promise.all([
      generatePhrases(),
      generateGlossary(),
      generateKeyPersons(),
    ]);

    setIsLoading(false);
  };

  const renderStars = (rating: number) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-400"
          }`}
        />
      ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-6 relative overflow-y-auto">
      <div className="container mx-auto px-4 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={showResults ? "results" : "initial"}
            initial={false}
            animate={{}}
            exit={{}}
            className={`flex ${
              showResults ? "flex-row items-center" : "flex-col items-center"
            } justify-between mb-8`}
          >
            <motion.h1
              className={`font-bold text-gray-800 ${
                showResults
                  ? "text-2xl"
                  : "text-5xl md:text-6xl text-center mt-24 mb-16"
              }`}
              initial={false}
              animate={{
                fontSize: showResults ? "1.5rem" : "3rem",
                marginBottom: showResults ? "0" : "2rem",
              }}
              transition={{ duration: 0.5 }}
            >
              インテリメーカー{" "}
              <span className={`${showResults ? "text-base" : "text-lg"}`}>
                〜賢いは作れる〜
              </span>
            </motion.h1>

            <motion.div
              className={`${showResults ? "w-2/3" : "w-full max-w-2xl"}`}
              initial={false}
              animate={{
                width: showResults ? "66.666667%" : "100%",
              }}
              transition={{ duration: 0.5 }}
            >
              {!showResults && (
                <AnimatePresence mode="wait">
                  <motion.p
                    key={currentQuote}
                    className="text-2xl text-purple-600 italic mb-16 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    &ldquo;{currentQuote}&rdquo;
                  </motion.p>
                </AnimatePresence>
              )}
              <SearchInput
                keyword={keyword}
                setKeyword={setKeyword}
                generateContent={generateContent}
                isLoading={isLoading}
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* 結果表示部分 */}
        {(showResults ||
          phrasesLoading ||
          glossaryLoading ||
          keyPersonsLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="bg-white rounded-lg shadow-md border border-purple-100">
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
                          <div className="flex items-center justify-between w-full">
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
                            <div className="flex items-center">
                              {renderStars(phrase.rating)}
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

            <div className="space-y-4">
              <Card className="bg-white rounded-lg shadow-md border border-purple-200">
                <CardHeader className="py-6 px-4 bg-gradient-to-r from-purple-200 to-blue-200">
                  <CardTitle className="text-xl text-gray-800 tracking-wider flex items-center">
                    <BookOpen className="w-5 h-5 mr-2" />
                    関連用語
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-3 px-4">
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
                          <TableHead className="text-purple-800">
                            定義
                          </TableHead>
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
                </CardContent>
              </Card>

              {keyPersonsLoading ? (
                <KeyPersonsSkeletonLoader />
              ) : keyPersonsError ? (
                <ErrorCard error={keyPersonsError} retry={generateKeyPersons} />
              ) : (
                keyPersons.length > 0 && (
                  <Card className="bg-white rounded-lg shadow-md border border-purple-200">
                    <CardHeader className="py-6 px-4 bg-gradient-to-r from-purple-200 to-blue-200">
                      <CardTitle className="text-xl text-gray-800 tracking-wider flex items-center">
                        <User className="w-5 h-5 mr-2" />
                        キーパーソン
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-3 px-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-purple-800 w-16">
                              写真
                            </TableHead>
                            <TableHead className="text-purple-800 w-1/4">
                              名前
                            </TableHead>
                            <TableHead className="text-purple-800">
                              説明
                            </TableHead>
                            <TableHead className="text-purple-800 w-24">
                              リンク
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {keyPersons.map((person, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <img
                                  src={person.image}
                                  alt={`${person.name}の画像`}
                                  width={40}
                                  height={40}
                                  className="rounded-full border-2 border-purple-100"
                                />
                              </TableCell>
                              <TableCell className="font-bold text-purple-800 text-lg">
                                {person.name}
                              </TableCell>
                              <TableCell className="text-gray-700">
                                {person.description}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <a
                                    href={person.twitter}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-600 hover:text-gray-800"
                                  >
                                    <Twitter className="w-4 h-4" />
                                  </a>
                                  <a
                                    href={person.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-600 hover:text-gray-800"
                                  >
                                    <Linkedin className="w-4 h-4" />
                                  </a>
                                  <a
                                    href={person.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-600 hover:text-gray-800"
                                  >
                                    <Globe className="w-4 h-4" />
                                  </a>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )
              )}
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
      </div>
    </div>
  );
}

// SearchInput コンポーネントを更新
function SearchInput({
  keyword,
  setKeyword,
  generateContent,
  isLoading,
}: SearchInputProps) {
  return (
    <div className="relative w-full">
      <Input
        type="text"
        placeholder="キーワードを入力"
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
        className="w-full h-16 pr-16 border-2 border-purple-300 focus:border-purple-500 rounded-full py-3 px-6 text-xl bg-white text-purple-800 placeholder-purple-400"
      />
      <Button
        onClick={generateContent}
        disabled={!keyword.trim() || isLoading}
        className="absolute right-6 top-1/2 transform -translate-y-1/2 rounded-full bg-purple-500 hover:bg-purple-600 text-white p-2"
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        ) : (
          <Sparkles className="w-6 h-6" />
        )}
      </Button>
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
    <Card className="bg-white rounded-lg shadow-md border border-purple-200">
      <CardHeader className="py-6 px-4 bg-gradient-to-r from-purple-200 to-blue-200">
        <CardTitle className="text-xl text-gray-800 tracking-wider flex items-center">
          <User className="w-5 h-5 mr-2" />
          キーパーソン
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {[1, 2].map((_, index) => (
          <div key={index} className="flex items-center space-x-6 mb-6">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-64 mb-4" />
              <div className="flex space-x-4">
                <Skeleton className="w-6 h-6" />
                <Skeleton className="w-6 h-6" />
                <Skeleton className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
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
