import ts from 'typescript';
import {
	highlightCode,
	renderTokenizedCode,
	tokenizeCode,
	type HighlightedToken,
} from '$lib/shiki.server';

type BodyRange = {
	start: number;
	end: number;
};

type TokenSpan = {
	start: number;
	end: number;
	content: string;
	color?: string;
	fontStyle?: number;
};

function propertyNameText(name: ts.PropertyName): string | null {
	if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
		return name.text;
	}
	return null;
}

function findBodyRanges(code: string): BodyRange[] {
	const sourceFile = ts.createSourceFile('snippet.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const ranges: BodyRange[] = [];

	function visit(node: ts.Node) {
		if (
			ts.isPropertyAssignment(node) &&
			propertyNameText(node.name) === 'body' &&
			(ts.isNoSubstitutionTemplateLiteral(node.initializer) || ts.isTemplateExpression(node.initializer))
		) {
			const start = node.initializer.getStart(sourceFile) + 1;
			const end = node.initializer.getEnd() - 1;
			if (end > start) {
				ranges.push({ start, end });
			}
		}
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return ranges.sort((a, b) => a.start - b.start);
}

function flattenTokens(lines: HighlightedToken[][], offsetShift = 0): TokenSpan[] {
	return lines.flatMap((line) =>
		line.map((token) => ({
			start: token.offset + offsetShift,
			end: token.offset + offsetShift + token.content.length,
			content: token.content,
			color: token.color,
			fontStyle: token.fontStyle,
		}))
	);
}

function sliceSpan(span: TokenSpan, start: number, end: number): TokenSpan | null {
	if (end <= start) return null;
	const from = start - span.start;
	const to = end - span.start;
	const content = span.content.slice(from, to);
	if (content.length === 0) return null;
	return {
		start,
		end,
		content,
		color: span.color,
		fontStyle: span.fontStyle,
	};
}

function subtractRanges(spans: TokenSpan[], ranges: BodyRange[]): TokenSpan[] {
	const kept: TokenSpan[] = [];
	let rangeIndex = 0;

	for (const span of spans) {
		while (rangeIndex < ranges.length && ranges[rangeIndex].end <= span.start) {
			rangeIndex += 1;
		}

		let cursor = span.start;
		let activeRangeIndex = rangeIndex;

		while (activeRangeIndex < ranges.length && ranges[activeRangeIndex].start < span.end) {
			const range = ranges[activeRangeIndex];
			if (cursor < range.start) {
				const before = sliceSpan(span, cursor, Math.min(range.start, span.end));
				if (before) kept.push(before);
			}

			cursor = Math.max(cursor, range.end);
			if (cursor >= span.end) break;
			activeRangeIndex += 1;
		}

		if (cursor < span.end) {
			const remainder = sliceSpan(span, cursor, span.end);
			if (remainder) kept.push(remainder);
		}
	}

	return kept;
}

function lineStartsFor(code: string): number[] {
	const starts = [0];
	for (let index = 0; index < code.length; index += 1) {
		if (code[index] === '\n') starts.push(index + 1);
	}
	return starts;
}

function lineIndexFor(offset: number, lineStarts: number[]): number {
	let low = 0;
	let high = lineStarts.length - 1;
	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		if (lineStarts[mid] <= offset) {
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}
	return Math.max(high, 0);
}

function spansToLines(code: string, spans: TokenSpan[]): HighlightedToken[][] {
	const lineStarts = lineStartsFor(code);
	const lines = Array.from({ length: lineStarts.length }, () => [] as HighlightedToken[]);

	for (const span of [...spans].sort((a, b) => a.start - b.start)) {
		const lineIndex = lineIndexFor(span.start, lineStarts);
		lines[lineIndex].push({
			content: span.content,
			offset: span.start,
			color: span.color,
			fontStyle: span.fontStyle,
		});
	}

	return lines;
}

export async function renderLabChainSnippet(code: string): Promise<string | null> {
	if (!code.includes('runChain([')) return null;

	const bodyRanges = findBodyRanges(code);
	if (bodyRanges.length === 0) return null;

	const full = await tokenizeCode(code, 'typescript');
	const baseSpans = subtractRanges(flattenTokens(full.lines), bodyRanges);
	const embeddedSpans = (
		await Promise.all(
			bodyRanges.map(async (range) => {
				const bodyCode = code.slice(range.start, range.end);
				const tokenized = await tokenizeCode(bodyCode, 'typescript');
				return flattenTokens(tokenized.lines, range.start);
			})
		)
	).flat();

	const combinedLines = spansToLines(code, [...baseSpans, ...embeddedSpans]);
	const html = renderTokenizedCode({ ...full, lines: combinedLines });

	return `<div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">${html}</div>`;
}

export async function renderLabSnippet(code: string): Promise<string> {
	return (await renderLabChainSnippet(code)) ?? highlightCode(code, 'typescript');
}
