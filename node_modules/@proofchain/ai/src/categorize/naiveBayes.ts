/**
 * naiveBayes.ts — Pure in-memory Multinomial Naive Bayes classifier.
 *
 * Trained lazily on first use from trainingSet.json.
 * Returns the top-3 labels with probabilities (log-space computation for
 * numerical stability, converted back to normalised probabilities on output).
 *
 * Zero AI services — 100% offline.
 */

import trainingSet from './trainingSet.json';

// ─── types ───────────────────────────────────────────────────────────────────

export type Label = 'Legal' | 'Academic' | 'Creative' | 'Financial' | 'Identity';

export interface ClassifyResult {
  label: Label;
  probability: number;
}

interface TrainingSample {
  label: string;
  text: string;
}

// ─── tokenizer ───────────────────────────────────────────────────────────────

/** Very simple whitespace + punctuation tokenizer. Lowercases, strips punctuation. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

// ─── model ───────────────────────────────────────────────────────────────────

interface NaiveBayesModel {
  /** P(class) as log probabilities. */
  logPrior: Record<string, number>;
  /** Word counts per class. */
  wordCounts: Record<string, Record<string, number>>;
  /** Total word count per class (for smoothing). */
  totalWords: Record<string, number>;
  /** Vocabulary size (for Laplace smoothing). */
  vocabSize: number;
  /** All known labels. */
  labels: string[];
}

function buildModel(samples: TrainingSample[]): NaiveBayesModel {
  const labelCounts: Record<string, number> = {};
  const wordCounts: Record<string, Record<string, number>> = {};
  const totalWords: Record<string, number> = {};
  const vocab = new Set<string>();

  for (const sample of samples) {
    const label = sample.label;
    labelCounts[label] = (labelCounts[label] ?? 0) + 1;
    if (!wordCounts[label]) {
      wordCounts[label] = {};
      totalWords[label] = 0;
    }
    const tokens = tokenize(sample.text);
    for (const tok of tokens) {
      vocab.add(tok);
      wordCounts[label]![tok] = (wordCounts[label]![tok] ?? 0) + 1;
      totalWords[label]! += 1;
    }
  }

  const total = samples.length;
  const labels = Object.keys(labelCounts);
  const logPrior: Record<string, number> = {};
  for (const label of labels) {
    logPrior[label] = Math.log((labelCounts[label] ?? 1) / total);
  }

  return { logPrior, wordCounts, totalWords, vocabSize: vocab.size, labels };
}

// ─── singleton ───────────────────────────────────────────────────────────────

let _model: NaiveBayesModel | null = null;

function getModel(): NaiveBayesModel {
  if (!_model) {
    _model = buildModel(trainingSet as TrainingSample[]);
  }
  return _model;
}

// ─── classifier ──────────────────────────────────────────────────────────────

/**
 * Classify a text document using Multinomial Naive Bayes with Laplace smoothing.
 * Returns the top-3 labels sorted by descending probability.
 */
export function classify(text: string, topN = 3): ClassifyResult[] {
  const model = getModel();
  const tokens = tokenize(text);

  const logScores: Record<string, number> = {};

  for (const label of model.labels) {
    let logScore = model.logPrior[label] ?? 0;
    const counts = model.wordCounts[label] ?? {};
    const total = model.totalWords[label] ?? 0;
    const denom = total + model.vocabSize; // Laplace smoothing denominator

    for (const tok of tokens) {
      const wordCount = counts[tok] ?? 0;
      // Add-1 (Laplace) smoothing
      logScore += Math.log((wordCount + 1) / denom);
    }
    logScores[label] = logScore;
  }

  // Convert log scores to normalised probabilities via log-sum-exp trick
  const scoreEntries = Object.entries(logScores) as [string, number][];
  const maxLog = Math.max(...scoreEntries.map(([, v]) => v));
  const expScores = scoreEntries.map(([label, ls]) => ({
    label,
    exp: Math.exp(ls - maxLog),
  }));
  const sumExp = expScores.reduce((s, e) => s + e.exp, 0);

  const results: ClassifyResult[] = expScores
    .map(({ label, exp }) => ({
      label: label as Label,
      probability: exp / sumExp,
    }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, topN);

  return results;
}

/**
 * Re-train the model on a custom training set (useful for evaluation / testing).
 * Resets the singleton model.
 */
export function retrain(samples: TrainingSample[]): void {
  _model = buildModel(samples);
}

/**
 * Expose the underlying model for inspection (e.g., to report vocabulary size).
 */
export function getModelStats(): {
  labels: string[];
  vocabSize: number;
  sampleCount: number;
} {
  const model = getModel();
  return {
    labels: model.labels,
    vocabSize: model.vocabSize,
    sampleCount: (trainingSet as TrainingSample[]).length,
  };
}
