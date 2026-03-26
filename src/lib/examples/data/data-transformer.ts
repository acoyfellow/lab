import type { ChainStep } from '@acoyfellow/lab';

export const DATA_TRANSFORMER_STEPS: ChainStep[] = [
	{
		name: 'Detect Format',
		body: `const input = '{"name": "John", "age": "30", "active": "true"}';

function detectFormat(data) {
  try {
    JSON.parse(data);
    return { format: 'json', data };
  } catch {
    if (data.includes(',') && data.includes('\n')) {
      return { format: 'csv', data };
    }
    return { format: 'unknown', data };
  }
}

return detectFormat(input);`,
		capabilities: []
	},
	{
		name: 'Parse & Normalize',
		body: `const detected = input;

if (detected.format === 'json') {
  const parsed = JSON.parse(detected.data);
  return {
    normalized: {
      name: String(parsed.name || ''),
      age: Number(parsed.age) || 0,
      active: parsed.active === 'true' || parsed.active === true
    },
    originalFormat: 'json'
  };
}

return { error: 'Unsupported format', format: detected.format };`,
		capabilities: []
	},
	{
		name: 'Validate Schema',
		body: `const data = input.normalized;
const errors = [];

if (!data.name || data.name.length < 2) {
  errors.push('Name must be at least 2 characters');
}

if (typeof data.age !== 'number' || data.age < 0 || data.age > 150) {
  errors.push('Age must be a number between 0 and 150');
}

if (typeof data.active !== 'boolean') {
  errors.push('Active must be a boolean');
}

return {
  valid: errors.length === 0,
  errors,
  data,
  ready: errors.length === 0
};`,
		capabilities: []
	},
	{
		name: 'Transform Output',
		body: `if (!input.valid) {
  return { error: 'Validation failed', details: input.errors };
}

const data = input.data;

return {
  transformed: {
    fullName: data.name.toUpperCase(),
    birthYear: new Date().getFullYear() - data.age,
    status: data.active ? 'active' : 'inactive',
    metadata: {
      processedAt: new Date().toISOString(),
      version: '1.0'
    }
  },
  transformationsApplied: ['uppercase', 'birthYearCalc', 'statusMapping']
};`,
		capabilities: []
	}
];

export const MULTI_SOURCE_AGGREGATOR_STEPS: ChainStep[] = [
	{
		name: 'Fetch Source A',
		body: `async function fetchSourceA() {
  return {
    users: [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' }
    ],
    source: 'api-a',
    fetchedAt: Date.now()
  };
}

return await fetchSourceA();`,
		capabilities: []
	},
	{
		name: 'Fetch Source B',
		body: `async function fetchSourceB() {
  return {
    orders: [
      { userId: 1, total: 100, items: 2 },
      { userId: 1, total: 50, items: 1 },
      { userId: 2, total: 200, items: 3 }
    ],
    source: 'api-b',
    fetchedAt: Date.now()
  };
}

const sourceA = input;
const sourceB = await fetchSourceB();

return { sourceA, sourceB };`,
		capabilities: []
	},
	{
		name: 'Merge & Aggregate',
		body: `const { sourceA, sourceB } = input;

const userMap = new Map();

for (const user of sourceA.users) {
  userMap.set(user.id, {
    ...user,
    orders: [],
    totalSpent: 0,
    totalItems: 0
  });
}

for (const order of sourceB.orders) {
  const user = userMap.get(order.userId);
  if (user) {
    user.orders.push(order);
    user.totalSpent += order.total;
    user.totalItems += order.items;
  }
}

const merged = Array.from(userMap.values());

return {
  users: merged,
  summary: {
    totalUsers: merged.length,
    totalRevenue: merged.reduce((sum, u) => sum + u.totalSpent, 0),
    totalOrders: merged.reduce((sum, u) => sum + u.orders.length, 0),
    averageOrderValue: merged.length > 0 
      ? merged.reduce((sum, u) => sum + u.totalSpent, 0) / merged.reduce((sum, u) => sum + u.orders.length, 0)
      : 0
  },
  sources: [sourceA.source, sourceB.source]
};`,
		capabilities: []
	}
];