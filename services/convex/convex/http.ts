import { httpRouter } from 'convex/server';

import { internal } from './_generated/api';
import { httpAction } from './_generated/server';
import { isValidWebhook } from './webhookSignature';

const http = httpRouter();

http.route({
  path: '/clerk/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

    if (secret === undefined || secret === '') {
      return new Response('Webhook secret is not configured', { status: 500 });
    }

    const body = await request.text();
    const isValid = await isValidWebhook({
      secret,
      messageId: request.headers.get('svix-id') ?? '',
      timestamp: request.headers.get('svix-timestamp') ?? '',
      signatureHeader: request.headers.get('svix-signature') ?? '',
      body,
      now: Date.now(),
    });

    if (!isValid) {
      return new Response('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(body) as { type?: string; data?: { id?: unknown } };

    if (event.type === 'user.deleted' && typeof event.data?.id === 'string') {
      await ctx.runMutation(internal.account.forgetDeletedUser, { ownerId: event.data.id });
    }

    return new Response(null, { status: 204 });
  }),
});

export default http;
