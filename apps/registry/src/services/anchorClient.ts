import { AnchorEntry } from '@proofchain/core';

export class AnchorClientError extends Error {
  constructor(public code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = 'AnchorClientError';
  }
}

export async function publishToAnchor(input: {
  root: string;
  batchId: string;
  leafCount: number;
  anchorUrl?: string;
  publishToken?: string;
}): Promise<AnchorEntry> {
  const url = input.anchorUrl || process.env.ANCHOR_URL || 'http://localhost:4100';
  const token = input.publishToken || process.env.ANCHOR_PUBLISH_TOKEN || '';

  let response: Response;
  try {
    response = await fetch(`${url}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        root: input.root,
        batchId: input.batchId,
        leafCount: input.leafCount,
      }),
    });
  } catch (err: any) {
    throw new AnchorClientError('ANCHOR_UNREACHABLE', `Failed to reach anchor at ${url}: ${err.message}`);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    let errJson: any;
    try {
      errJson = JSON.parse(errorBody);
    } catch {
      errJson = { message: errorBody };
    }
    throw new AnchorClientError(
      errJson.error || `HTTP_${response.status}`,
      errJson.message || `Anchor returned status ${response.status}`
    );
  }

  return (await response.json()) as AnchorEntry;
}
