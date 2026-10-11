import { Router, Request, Response } from 'express';
import {
  extractWithRules,
  classify,
  textSimhashHex,
  textFromFile,
  explainResult,
  VerifyResultLike,
} from '@proofchain/ai';

export function createAiRouter(): Router {
  const router = Router();

  /**
   * POST /api/extract (and POST /api/ai/extract)
   *
   * Runs deterministic Tier 1 rules extractor + Naive Bayes categorization.
   * Returns suggested metadata fields with confidence scores & sources.
   */
  router.post('/extract', async (req: Request, res: Response) => {
    try {
      let text = '';

      if (typeof req.body === 'string') {
        text = req.body;
      } else if (req.body?.text && typeof req.body.text === 'string') {
        text = req.body.text;
      } else if (req.body?.content && typeof req.body.content === 'string') {
        text = req.body.content;
      } else if (req.body?.base64 && typeof req.body.base64 === 'string') {
        const buffer = Buffer.from(req.body.base64, 'base64');
        const extracted = await textFromFile(new Uint8Array(buffer), req.body.mime);
        text = extracted.text;
      }

      if (!text) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Document text or file content is required for extraction',
          },
        });
      }

      // 1. Rules-based metadata extraction
      const extraction = extractWithRules(text);

      const fieldKeys = [
        'issuer',
        'documentDate',
        'documentType',
        'title',
        'parties',
        'referenceNo',
      ] as const;

      const fields: Array<{
        key: string;
        value: any;
        confidence: number;
        source: string;
      }> = [];

      for (const k of fieldKeys) {
        const f = extraction[k];
        if (f) {
          fields.push({
            key: k,
            value: f.value,
            confidence: f.confidence,
            source: f.source,
          });
        }
      }

      // 2. Multinomial Naive Bayes categorization
      const categories = classify(text);
      const topCategory = categories[0]
        ? { label: categories[0].label, confidence: categories[0].probability }
        : null;

      // 3. SimHash advisory fingerprint
      const simhash = textSimhashHex(text);

      return res.json({
        fields,
        extraction,
        category: topCategory,
        categories,
        simhash,
        similar: [],
        aiPath: 'rules',
      });
    } catch (err: any) {
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Failed to extract metadata',
        },
      });
    }
  });

  /**
   * POST /api/explain (and POST /api/ai/explain)
   *
   * Accepts a VerifyResult, runs it through the strict Anti-Hallucination Guard,
   * and returns an auditor-friendly explanation.
   */
  router.post('/explain', async (req: Request, res: Response) => {
    try {
      const verifyResult: VerifyResultLike =
        req.body?.verifyResult || req.body?.result || req.body;

      if (!verifyResult || typeof verifyResult !== 'object' || !verifyResult.verdict) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'VerifyResult object with verdict is required',
          },
        });
      }

      const output = await explainResult(verifyResult);

      return res.json({
        explanation: output.explanation,
        text: output.explanation,
        aiPath: output.aiPath,
      });
    } catch (err: any) {
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Failed to generate explanation',
        },
      });
    }
  });

  return router;
}

export const aiRouter = createAiRouter();
