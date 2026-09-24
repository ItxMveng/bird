import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fns from '../src/index';

/** Clôture les enchères échues. Idempotent : appelé toutes les 5 minutes par GitHub Actions. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ ok: false });
  try {
    await (fns.closeExpiredAuctions as unknown as { run: (r: unknown) => Promise<unknown> }).run({});
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(JSON.stringify({ event: 'cron_error', message: (e as Error).message }));
    return res.status(500).json({ ok: false });
  }
}
