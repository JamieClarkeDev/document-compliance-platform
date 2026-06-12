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

  function findBrand(text: string) {
    const knownBrands = [
      /maker'?s\s*mark/i,
      /maker'?s/i,
      /aberlour/i,
      /\babc\b/i,
    ];

    for (const pattern of knownBrands) {
      const match = text.match(pattern);
      if (match) return match[0];
    }

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const ignoredWords = [
      "government",
      "warning",
      "straight",
      "single",
      "barrel",
      "whisky",
      "whiskey",
      "bourbon",
      "alcohol",
      "liter",
      "ml",
      "alc",
      "vol",
    ];

    for (const line of lines) {
      const cleanLine = line.replace(/[^a-zA-Z0-9' ]/g, "").trim();

      if (
        cleanLine.length >= 3 &&
        cleanLine.length <= 40 &&
        !ignoredWords.some((word) => cleanLine.toLowerCase().includes(word))
      ) {
        return cleanLine;
      }
    }

    return "";
  }

  function checkLabel(text: string): CheckResult[] {
    const cleaned = cleanText(text);
    const lower = cleaned.toLowerCase();

    const brandValue = findBrand(text);

    const classMatch = cleaned.match(
      /straight rye whisky|straight rye whiskey|single malt scotch whisky|single malt|scotch|whiskey|whisky|bourbon|vodka|rum|gin|tequila|wine|beer/i
    );

    const alcoholMatch =
      cleaned.match(
        /\d{1,2}(\.\d+)?\s*%\s*(alc|alcohol|alc\/vol|alc\.\/vol\.|abv|by vol)?/i
      ) ||
      cleaned.match(/\d{1,2}(\.\d+)?\s*%\b/i) ||
      cleaned.match(/\d{1,2}(\.\d+)?\s*(alc|abv)/i);

    const netMatch =
      cleaned.match(/\d+(\.\d+)?\s*(ml|mL|ML)\b/i) ||
      cleaned.match(/\d+(\.\d+)?\s*(liter|litre|LITER)\b/i) ||
      cleaned.match(/\d+(\.\d+)?\s*l\b/i);

    const warningMatch =
      lower.includes("government warning") ||
      lower.includes("surgeon general") ||
      lower.includes("pregnancy") ||
      lower.includes("pregnant") ||
      lower.includes("birth defects") ||
      lower.includes("alcoholic beverages") ||
      lower.includes("operate machinery") ||
      lower.includes("health problems") ||
      lower.includes("ability to drive") ||
      lower.includes("impairs your ability");

    return [
      {
        field: "Brand Name",
        status: brandValue ? "PASS" : "FAIL",
        value: brandValue || "Not found",
      },
      {
        field: "Class/Type",
        status: classMatch ? "PASS" : "FAIL",
        value: classMatch ? classMatch[0] : "Not found",
      },
      {
        field: "Alcohol Content",
        status: alcoholMatch ? "PASS" : "FAIL",
        value: alcoholMatch ? alcoholMatch[0] : "Not found",
      },
      {
        field: "Net Contents",
        status: netMatch ? "PASS" : "FAIL",
        value: netMatch ? netMatch[0] : "Not found",
      },
      {
        field: "Government Warning",
        status: warningMatch ? "PASS" : "FAIL",
        value: warningMatch ? "Government warning detected" : "Not found",
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
        setMessage(
          "OCR completed, but confidence is moderate. Review the extracted text."
        );
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
  const passedCount = completedResults.filter(
    (item) => item.status === "PASS"
  ).length;

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
          Upload an alcohol label image. The app uses OCR to extract text and
          checks for required compliance fields.
        </p>

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
              OCR Confidence:{" "}
              {ocrConfidence === null ? "Pending" : `${ocrConfidence}%`}
            </p>
          </div>

          {ocrConfidence !== null && ocrConfidence < 80 && (
            <p className="mt-3 rounded bg-yellow-100 p-3 text-sm text-yellow-900">
              Image quality warning: OCR confidence is below 80%. Please review
              the extracted text or upload a clearer image.
            </p>
          )}

          <table className="mt-6 w-full border border-slate-400">
            <thead>
              <tr className="bg-slate-200">
                <th className="border border-slate-400 p-2 text-left">
                  Required Field
                </th>
                <th className="border border-slate-400 p-2 text-left">
                  Status
                </th>
                <th className="border border-slate-400 p-2 text-left">
                  Detected Value
                </th>
              </tr>
            </thead>

            <tbody>
              {results.map((result) => (
                <tr key={result.field}>
                  <td className="border border-slate-400 p-2">
                    {result.field}
                  </td>
                  <td className="border border-slate-400 p-2 font-bold">
                    {result.value === "Pending" ? "Pending" : result.status}
                  </td>
                  <td className="border border-slate-400 p-2">
                    {result.value}
                  </td>
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