import type { VercelRequest, VercelResponse } from '@vercel/node';
import '../src/index'; // initialise firebase-admin
import { handleFlutterwaveWebhook } from '../src/payments';

/** Webhook Flutterwave : URL à renseigner dans le tableau de bord → https://<api>/flutterwave-webhook */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  try {
    const result = await handleFlutterwaveWebhook(req.headers as Record<string, unknown>, req.body);
    return res.status(result.status).json(result.body);
  } catch (e) {
    console.error(JSON.stringify({ event: 'flw_webhook_error', message: (e as Error).message }));
    return res.status(500).json({ ok: false });
  }
}
