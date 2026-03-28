/**
 * Heal malformed LLM outputs
 * 
 * These utilities clean up common formatting issues from LLM-generated code:
 * - Markdown code fences (```javascript ... ```)
 * - Trailing commas in JSON
 * - Missing quotes in JSON keys
 * - Common JS syntax errors
 */

/**
 * Strip markdown code blocks from generated content
 * Handles: ```javascript, ```js, ```, etc.
 */
export function cleanMarkdownCodeBlock(content: string): string {
	if (!content) return '';

	// Match code fences with optional language tag
	const fenceMatch = content.match(/```(?:\w+)?\n?([\s\S]*?)```/);
	if (fenceMatch) {
		return fenceMatch[1].trim();
	}

	// Handle inline backticks
	if (content.startsWith('`') && content.endsWith('`')) {
		return content.slice(1, -1).trim();
	}

	return content.trim();
}

/**
 * Extract the last expression from generated code
 * Keeps all code, just ensures proper ending
 */
export function extractLastExpression(code: string): string {
	if (!code) return '';

	const trimmed = code.trim();
	const lines = trimmed.split('\n');
	const lastLine = lines[lines.length - 1].trim();
	
	// If last line is just a variable name without semicolon, add it
	if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(lastLine)) {
		return trimmed + ';';
	}

	return trimmed;
}

/**
 * Fix common JSON syntax errors
 * - Trailing commas before } or ]
 * - Unquoted keys
 * - Single quotes instead of double
 */
export function fixJson(json: string): string {
	if (!json) return '';

	let fixed = json;

	// Remove trailing commas before } or ]
	fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

	// Replace single quotes with double (be careful with apostrophes in strings)
	// This is a simple heuristic - won't work for all cases
	fixed = fixed.replace(/'([^']*)'/g, '"$1"');

	// Add quotes to unquoted object keys
	// Matches: { key: or , key: or {\n  key:
	fixed = fixed.replace(/({|,|\n)\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

	return fixed;
}

/**
 * Fix common JavaScript syntax errors in generated code
 */
export function fixJavaScript(code: string): string {
	if (!code) return '';

	let fixed = code;

	// Remove trailing commas in arrays/objects (JS is more forgiving than JSON, but still)
	fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

	// Ensure proper semicolons at end of statements that need them
	// This is tricky - we'll just ensure the last line has a semicolon if needed
	const lines = fixed.split('\n');
	const lastLine = lines[lines.length - 1].trim();
	if (lastLine && !lastLine.endsWith(';') && !lastLine.endsWith('}') && !lastLine.endsWith(']')) {
		lines[lines.length - 1] = lines[lines.length - 1] + ';';
		fixed = lines.join('\n');
	}

	return fixed;
}

/**
 * Full pipeline: clean and heal generated code for execution
 */
export function healCode(code: string): {
	code: string;
	wasHealed: boolean;
	changes: string[];
} {
	const changes: string[] = [];
	let healed = code;

	// Step 1: Strip markdown
	const withoutMarkdown = cleanMarkdownCodeBlock(healed);
	if (withoutMarkdown !== healed) {
		changes.push('Removed markdown code fences');
		healed = withoutMarkdown;
	}

	// Step 2: Extract last expression if there's prose
	const extracted = extractLastExpression(healed);
	if (extracted !== healed && extracted.length < healed.length) {
		changes.push('Extracted code from explanatory text');
		healed = extracted;
	}

	// Step 3: Fix JS syntax
	const fixedJs = fixJavaScript(healed);
	if (fixedJs !== healed) {
		changes.push('Fixed JavaScript syntax');
		healed = fixedJs;
	}

	return {
		code: healed,
		wasHealed: changes.length > 0,
		changes
	};
}

/**
 * Attempt to parse and validate a mutation array
 * Returns null if invalid
 */
export function parseMutations(maybeMutations: unknown): Array<Record<string, unknown>> | null {
	if (!Array.isArray(maybeMutations)) return null;
	
	// Basic validation: each item should be an object with an 'op' property
	if (maybeMutations.every(m => typeof m === 'object' && m !== null && 'op' in m)) {
		return maybeMutations as Array<Record<string, unknown>>;
	}
	
	return null;
}
