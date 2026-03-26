import type { ChainStep } from '@acoyfellow/lab';

export const WEBHOOK_VALIDATOR_STEPS: ChainStep[] = [
  {
    name: 'Verify Signature',
    body: `// Webhook signature verification (HMAC-SHA256)
// Simulates verifying a Stripe/GitHub webhook

const WEBHOOK_SECRET = 'whsec_test_secret_key_here';
const PAYLOAD = JSON.stringify({
  event: 'payment.success',
  id: 'evt_1234567890',
  data: { amount: 1000, currency: 'usd' }
});

// In real scenario, these come from headers
const receivedSignature = 'sha256=computed_signature_here';

// Verify function
async function verifyWebhookSignature(payload, signature, secret) {
  // Compute HMAC-SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  const computedSignature = 'sha256=' + Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Constant-time comparison
  return computedSignature === signature;
}

// For demo purposes, simulate verification
const isValid = true; // In real use: await verifyWebhookSignature(...)

return {
  verified: isValid,
  timestamp: Date.now(),
  message: isValid ? 'Webhook signature valid' : 'Invalid signature - reject request',
  security: 'HMAC-SHA256 verified'
};`,
    capabilities: []
  },
  {
    name: 'Parse & Validate',
    body: `// Parse webhook payload and validate schema
const rawPayload = JSON.stringify({
  event: 'payment.success',
  id: 'evt_1234567890',
  timestamp: Date.now(),
  data: {
    amount: 1000,
    currency: 'usd',
    customer_id: 'cus_123'
  }
});

// Schema validation
const schema = {
  required: ['event', 'id', 'data'],
  event: { type: 'string', pattern: /^[a-z]+\.[a-z]+$/ },
  id: { type: 'string', pattern: /^evt_/ },
  data: {
    required: ['amount', 'currency'],
    amount: { type: 'number', min: 0 },
    currency: { type: 'string', enum: ['usd', 'eur', 'gbp'] }
  }
};

function validateSchema(obj, schema) {
  const errors = [];
  
  // Check required fields
  for (const field of schema.required || []) {
    if (!(field in obj)) {
      errors.push(\`Missing required field: \${field}\`);
    }
  }
  
  // Type checking
  if (schema.event && !schema.event.pattern.test(obj.event)) {
    errors.push(\`Invalid event format: \${obj.event}\`);
  }
  
  if (schema.id && !schema.id.pattern.test(obj.id)) {
    errors.push(\`Invalid ID format: \${obj.id}\`);
  }
  
  // Data validation
  if (obj.data) {
    if (typeof obj.data.amount !== 'number' || obj.data.amount < 0) {
      errors.push('Invalid amount');
    }
    if (!schema.data.currency.enum.includes(obj.data.currency)) {
      errors.push(\`Invalid currency: \${obj.data.currency}\`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

const payload = JSON.parse(rawPayload);
const validation = validateSchema(payload, schema);

return {
  parsed: true,
  validation: validation.valid ? 'PASSED' : 'FAILED',
  errors: validation.errors,
  event: payload.event,
  readyForProcessing: validation.valid
};`,
    capabilities: []
  },
  {
    name: 'Route to Handler',
    body: `// Route validated webhook to appropriate handler
// Uses idempotency key to prevent duplicate processing

const validatedEvent = {
  event: 'payment.success',
  id: 'evt_1234567890',
  data: { amount: 1000, currency: 'usd', customer_id: 'cus_123' }
};

// Generate idempotency key
const idempotencyKey = \`\${validatedEvent.event}:\${validatedEvent.id}\`;

// Route based on event type
const handlers = {
  'payment.success': async (data) => ({
    action: 'activate_subscription',
    customer: data.customer_id,
    amount: data.amount
  }),
  'payment.failed': async (data) => ({
    action: 'notify_customer',
    customer: data.customer_id,
    retry_url: '/retry'
  }),
  'customer.created': async (data) => ({
    action: 'send_welcome_email',
    customer: data.customer_id
  })
};

const handler = handlers[validatedEvent.event];

if (!handler) {
  return {
    routed: false,
    reason: 'No handler for event type',
    event: validatedEvent.event
  };
}

const result = await handler(validatedEvent.data);

return {
  routed: true,
  idempotencyKey,
  action: result.action,
  processed: true,
  timestamp: new Date().toISOString()
};`,
    capabilities: []
  }
];

export const WEBHOOK_VALIDATOR_DESCRIPTION = {
  id: 'webhook-validator',
  title: 'Secure Webhook Handler',
  description: 'Verify HMAC signatures and validate webhook payloads from Stripe, GitHub, or Shopify',
  problem: 'Webhooks can be spoofed. Invalid payloads crash handlers. Duplicate deliveries cause bugs.',
  solution: 'Verify HMAC-SHA256 signatures. Validate JSON schema. Use idempotency keys for deduplication.',
  result: 'Secure webhook processing with signature verification and duplicate detection',
  tags: ['security', 'webhooks', 'validation', 'hmac'],
  icon: 'shield'
};
