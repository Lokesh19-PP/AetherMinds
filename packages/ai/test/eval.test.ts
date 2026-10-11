import { describe, it, expect, afterAll } from 'vitest';
import trainingSet from '../src/categorize/trainingSet.json';
import { retrain, classify, Label } from '../src/categorize/naiveBayes';

describe('Naive Bayes Classifier 80/20 Holdout Evaluation', () => {
  afterAll(() => {
    // Restore the full model after evaluation tests
    retrain(trainingSet);
  });

  it('computes holdout accuracy and confusion matrix on 80/20 split', () => {
    expect(trainingSet.length).toBe(60);

    // Deterministic 80/20 split (every 5th item -> test set of 12 items, remaining 48 -> train set)
    const trainSet: typeof trainingSet = [];
    const testSet: typeof trainingSet = [];

    trainingSet.forEach((sample, idx) => {
      if (idx % 5 === 0) {
        testSet.push(sample);
      } else {
        trainSet.push(sample);
      }
    });

    expect(trainSet.length).toBe(48);
    expect(testSet.length).toBe(12);

    // Retrain model on the 80% training set
    retrain(trainSet);

    // Evaluate on the held-out 20% test set
    let correctTop1 = 0;
    let correctTop2 = 0;

    const labels: Label[] = ['Legal', 'Academic', 'Creative', 'Financial', 'Identity'];
    const confusionMatrix: Record<string, Record<string, number>> = {};
    for (const actual of labels) {
      confusionMatrix[actual] = {};
      for (const pred of labels) {
        confusionMatrix[actual][pred] = 0;
      }
    }

    for (const sample of testSet) {
      const results = classify(sample.text);
      expect(results.length).toBeGreaterThanOrEqual(1);

      const topPrediction = results[0].label;
      const actualLabel = sample.label as Label;

      if (confusionMatrix[actualLabel]) {
        confusionMatrix[actualLabel][topPrediction] =
          (confusionMatrix[actualLabel][topPrediction] || 0) + 1;
      }

      if (topPrediction === actualLabel) {
        correctTop1++;
      }

      const inTop2 = results.slice(0, 2).some((r) => r.label === actualLabel);
      if (inTop2) {
        correctTop2++;
      }
    }

    const accuracyTop1 = correctTop1 / testSet.length;
    const accuracyTop2 = correctTop2 / testSet.length;

    console.log('\n================ Naive Bayes 80/20 Evaluation Report ================');
    console.log(`Total samples   : ${trainingSet.length}`);
    console.log(`Training set    : ${trainSet.length} samples (80%)`);
    console.log(`Test set        : ${testSet.length} samples (20%)`);
    console.log(`Top-1 Accuracy  : ${(accuracyTop1 * 100).toFixed(1)}% (${correctTop1}/${testSet.length})`);
    console.log(`Top-2 Accuracy  : ${(accuracyTop2 * 100).toFixed(1)}% (${correctTop2}/${testSet.length})`);
    console.log('\nConfusion Matrix (Rows: Actual, Columns: Predicted):');
    console.table(confusionMatrix);
    console.log('=====================================================================\n');

    // Section 10.4 honest threshold verification
    expect(accuracyTop1).toBeGreaterThanOrEqual(0.70);
    expect(accuracyTop2).toBeGreaterThanOrEqual(0.80);
  });
});
