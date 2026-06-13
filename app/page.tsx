"use client";

import { useState } from "react";
import Tesseract from "tesseract.js";

type CheckResult = {
  field: string;
  status: "PASS" | "FAIL";
  value: string;
};

const initialResults: CheckResult[] = [
  { field: "Brand Name", status: "FAIL", value: "Pending" },
  { field: "Class/Type", status: "FAIL", value: "Pending" },
  { field: "Alcohol Content", status: "FAIL", value: "Pending" },
  { field: "Net Contents", status: "FAIL", value: "Pending" },
  { field: "Government Warning", status: "FAIL", value: "Pending" },
];

const knownBrands = [
  "Jack Daniel's", "Jack Daniels", "Maker's Mark", "Aberlour", "ABC",
  "Budweiser", "Coors Light", "Coors", "Miller Lite", "Miller", "Corona",
  "Heineken", "Guinness", "Modelo", "Stella Artois",
  "Ciroc", "Grey Goose", "Tito's", "Titos", "Smirnoff", "Absolut",
  "Hennessy", "Remy Martin", "Courvoisier",
  "Patron", "Don Julio", "Jose Cuervo",
  "Bacardi", "Captain Morgan", "Malibu",
  "Woodford Reserve", "Buffalo Trace", "Jim Beam", "Wild Turkey",
  "Barefoot", "Josh Cellars", "Yellow Tail",
];

const classTypes = [
  "tennessee whiskey", "tennessee whisky", "straight rye whiskey",
  "straight rye whisky", "straight bourbon whiskey", "bourbon whiskey",
  "kentucky straight bourbon whiskey", "single malt scotch whisky",
  "scotch whisky", "single malt", "bourbon", "rye whiskey", "rye whisky",
  "whiskey", "whisky", "vodka", "beer", "lager", "ale", "ipa", "stout",
  "porter", "wine", "red wine", "white wine", "champagne", "prosecco",
  "rum", "gin", "tequila", "mezcal", "brandy", "cognac", "liqueur",
];

const ignoredBrandWords = [
  "government", "warning", "alcohol", "content", "volume", "vol", "alc",
  "proof", "ml", "liter", "litre", "bottled", "distilled", "brewed",
  "imported", "produced", "premium", "quality", "reserve", "single",
  "barrel", "old", "brand", "label", "light", "extra", "smooth",
];

export default function Home() {
  const [fileName, setFileName] = useState("No file selected");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [ocrText, setOcrText] = useState("");
  const [loading, setLoading] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [results, setResults] = useState<CheckResult[]>(initialResults);
  const [message, setMessage] = useState("");

  function cleanText(text: string) {
    return text
      .replace(/\s+/g, " ")
      .replace(/[|]/g, " ")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .trim();
  }

  function normalize(text: string) {
    return cleanText(text).toLowerCase();
  }

  function findKnownBrand(text: string) {
    const lower = normalize(text);

    for (const brand of knownBrands) {
      const brandLower = brand.toLowerCase().replace("'", "");
      const textLower = lower.replace("'", "");

      if (textLower.includes(brandLower)) {
        return brand;
      }
    }

    return "";
  }

  function findClassType(text: string) {
    const lower = normalize(text);

    const sortedTypes = [...classTypes].sort((a, b) => b.length - a.length);

    for (const type of sortedTypes) {
      if (lower.includes(type)) {
        return type.toUpperCase();
      }
    }

    return "";
  }

  function findBrandNearType(text: string) {
    const lines = text
      .split("\n")
      .map((line) => line.replace(/[^a-zA-Z0-9' ]/g, " ").trim())
      .filter(Boolean);

    for (const line of lines) {
      const lower = line.toLowerCase();

      for (const type of classTypes) {
        if (lower.includes(type)) {
          const beforeType = line
            .replace(new RegExp(type, "i"), "")
            .trim();

          const words = beforeType
            .split(" ")
            .filter((word) => word.length > 1)
            .filter(
              (word) =>
                !ignoredBrandWords.includes(word.toLowerCase()) &&
                !classTypes.includes(word.toLowerCase())
            );

          if (words.length > 0) {
            return words.slice(0, 3).join(" ");
          }
        }
      }
    }

    return "";
  }

  function findLikelyBrand(text: string) {
    const known = findKnownBrand(text);
    if (known) return known;

    const nearType = findBrandNearType(text);
    if (nearType) return nearType;

    const lines = text
      .split("\n")
      .map((line) => line.replace(/[^a-zA-Z0-9' ]/g, " ").trim())
      .filter(Boolean);

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (
        line.length >= 3 &&
        line.length <= 35 &&
        !/\d{2,}/.test(line) &&
        !ignoredBrandWords.some((word) => lower.includes(word)) &&
        !classTypes.some((type) => lower.includes(type))
      ) {
        return line;
      }
    }

    return "";
  }

  function findAlcoholContent(text: string) {
    const cleaned = cleanText(text);

    const patterns = [
      /\d{1,2}(\.\d+)?\s*%\s*(alc\/vol|alc\.?\/vol\.?|alc|alcohol|abv|by volume|by vol|by weight)?/i,
      /alcohol\s*content\s*(not\s*more\s*than)?\s*\d{1,2}(\.\d+)?\s*%/i,
      /\d{1,3}\s*proof/i,
    ];

    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) return match[0];
    }

    return "";
  }

  function findNetContents(text: string) {
    const cleaned = cleanText(text);

    const patterns = [
      /\d+(\.\d+)?\s*(ml|mL|ML)\b/i,
      /\d+(\.\d+)?\s*(liter|litre|LITER)\b/i,
      /\d+(\.\d+)?\s*l\b/i,
      /\d+(\.\d+)?\s*(fl\.?\s*oz|fluid ounces|oz)\b/i,
    ];

    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) return match[0];
    }

    return "";
  }

  function findGovernmentWarning(text: string) {
    const lower = normalize(text);

    const warningKeywords = [
      "government warning",
      "surgeon general",
      "pregnancy",
      "pregnant",
      "birth defects",
      "alcoholic beverages",
      "operate machinery",
      "health problems",
      "ability to drive",
      "impairs your ability",
      "do not drink alcoholic beverages",
    ];

    return warningKeywords.some((keyword) => lower.includes(keyword));
  }

  function checkLabel(text: string): CheckResult[] {
    const brand = findLikelyBrand(text);
    const classType = findClassType(text);
    const alcohol = findAlcoholContent(text);
    const netContents = findNetContents(text);
    const warning = findGovernmentWarning(text);

    return [
      {
        field: "Brand Name",
        status: brand ? "PASS" : "FAIL",
        value: brand || "Not found",
      },
      {
        field: "Class/Type",
        status: classType ? "PASS" : "FAIL",
        value: classType || "Not found",
      },
      {
        field: "Alcohol Content",
        status: alcohol ? "PASS" : "FAIL",
        value: alcohol || "Not found",
      },
      {
        field: "Net Contents",
        status: netContents ? "PASS" : "FAIL",
        value: netContents || "Not found",
      },
      {
        field: "Government Warning",
        status: warning ? "PASS" : "FAIL",
        value: warning ? "Government warning detected" : "Not found",
      },
    ];
  }

  function resetAnalysis() {
    setFileName("No file selected");
    setSelectedFile(null);
    setFileInputKey((previousKey) => previousKey + 1);
    setOcrText("");
    setOcrConfidence(null);
    setResults(initialResults);
    setMessage("");
  }

  async function analyzeLabel() {
    if (!selectedFile) {
      setMessage("Please choose a label image before running the analysis.");
      return;
    }

    try {
      setLoading(true);
      setMessage("Analyzing label image. This may take a few seconds...");
      setOcrText("");
      setOcrConfidence(null);
      setResults(initialResults);

      const result = await Tesseract.recognize(selectedFile, "eng");
      const extractedText = result.data.text;
      const confidence = Math.round(result.data.confidence);

      if (!extractedText.trim()) {
        setMessage("OCR could not read text from this image. Try a clearer label.");
        return;
      }

      setOcrText(extractedText);
      setOcrConfidence(confidence);
      setResults(checkLabel(extractedText));

      if (confidence < 60) {
        setMessage("Image quality appears low. Results may be inaccurate.");
      } else if (confidence < 80) {
        setMessage("OCR completed, but confidence is moderate. Review the extracted text.");
      } else {
        setMessage("OCR completed successfully.");
      }
    } catch (error) {
      console.error(error);
      setMessage("OCR failed. Please try a clearer image or a different file.");
    } finally {
      setLoading(false);
    }
  }

  const completedResults = results.filter((item) => item.value !== "Pending");
  const passedCount = completedResults.filter((item) => item.status === "PASS").length;

  const score =
    completedResults.length === 0
      ? "Pending"
      : `${Math.round((passedCount / results.length) * 100)}%`;

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-5xl rounded-xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold text-slate-900">
          Treasury Alcohol Label Verification App
        </h1>

        <p className="mt-4 text-slate-600">
          Upload an alcohol label image. The app uses OCR to extract text and checks
          for required compliance fields.
        </p>

        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <strong>Best Results:</strong> Upload a clear, straight-on image showing
          the front and/or back label. OCR accuracy may decrease when images are
          blurry, angled, reflective, partially obscured, or low resolution.
        </div>

        <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-6">
          <label className="block text-sm font-medium text-slate-700">
            Upload Label Image
          </label>

          <input
            key={fileInputKey}
            type="file"
            accept="image/*"
            className="mt-3 block w-full"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                setSelectedFile(file);
                setFileName(file.name);
                setOcrText("");
                setOcrConfidence(null);
                setResults(initialResults);
                setMessage("File selected. Ready to analyze.");
              }
            }}
          />

          <p className="mt-4 text-sm text-slate-700">
            Selected File: <span className="font-semibold">{fileName}</span>
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={analyzeLabel}
            disabled={loading}
            className="rounded bg-blue-700 px-5 py-2 font-semibold text-white disabled:bg-slate-400"
          >
            {loading ? "Analyzing..." : "Analyze Label"}
          </button>

          <button
            onClick={resetAnalysis}
            className="rounded border border-slate-400 px-5 py-2 font-semibold text-slate-700"
          >
            Clear / New Analysis
          </button>
        </div>

        {message && (
          <div className="mt-6 rounded bg-blue-50 p-4 text-sm text-blue-900">
            {message}
          </div>
        )}

        <section className="mt-8 rounded-lg bg-slate-50 p-6">
          <h2 className="text-xl font-semibold">Compliance Results</h2>

          <div className="mt-4 grid gap-2 text-sm">
            <p className="font-bold">Compliance Score: {score}</p>
            <p className="font-bold">
              OCR Confidence: {ocrConfidence === null ? "Pending" : `${ocrConfidence}%`}
            </p>
          </div>

          {ocrConfidence !== null && ocrConfidence < 80 && (
            <p className="mt-3 rounded bg-yellow-100 p-3 text-sm text-yellow-900">
              Image quality warning: OCR confidence is below 80%. Please review the
              extracted text or upload a clearer image.
            </p>
          )}

          <table className="mt-6 w-full border border-slate-400">
            <thead>
              <tr className="bg-slate-200">
                <th className="border border-slate-400 p-2 text-left">Required Field</th>
                <th className="border border-slate-400 p-2 text-left">Status</th>
                <th className="border border-slate-400 p-2 text-left">Detected Value</th>
              </tr>
            </thead>

            <tbody>
              {results.map((result) => (
                <tr key={result.field}>
                  <td className="border border-slate-400 p-2">{result.field}</td>
                  <td className="border border-slate-400 p-2 font-bold">
                    {result.value === "Pending" ? "Pending" : result.status}
                  </td>
                  <td className="border border-slate-400 p-2">{result.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {ocrText && (
          <section className="mt-8 rounded-lg border bg-white p-6 shadow">
            <h2 className="text-xl font-semibold">Extracted OCR Text</h2>

            <pre className="mt-4 whitespace-pre-wrap rounded bg-slate-100 p-4 text-sm">
              {ocrText}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}