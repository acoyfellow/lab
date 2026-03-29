/** Stable fragment id for doc headings (matches marked output + TOC links). */
export function docsHeadingId(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}
