/**
 * Converts a GitLab system-note HTML body to plain text suitable for terminal display.
 *
 * GitLab system notes can contain HTML markup such as:
 *   <ul><li>abc123 - commit message</li><li>...</li></ul>
 *   <code>branch-name</code>
 *   &#39; (HTML entities)
 *   <a href="...">compare</a>
 *
 * Strategy:
 *  1. Decode common HTML entities
 *  2. Replace block/list elements with newlines / bullet prefixes
 *  3. Strip all remaining tags
 *  4. Collapse excess whitespace
 */
export function htmlToText(html: string): string {
  let text = html;

  // 1. Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // 2. Replace structural elements with readable equivalents
  // <br>, </p>, </div> → newline
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');

  // <li> → bullet prefix
  text = text.replace(/<li>/gi, '• ');

  // <ul> / <ol> / <p> / <div> → no prefix but ensure newline separation
  text = text.replace(/<\/?(?:ul|ol|p|div)[^>]*>/gi, '\n');

  // 3. Strip all remaining tags
  text = text.replace(/<[^>]+>/g, '');

  // 4. Clean up whitespace: collapse multiple blank lines, trim each line
  text = text
    .split('\n')
    .map(line => line.trim())
    .filter((line, i, arr) => {
      // Remove leading/trailing blank lines, collapse consecutive blanks
      if (line === '') {
        const prev = arr[i - 1];
        return prev !== undefined && prev !== '';
      }
      return true;
    })
    .join('\n')
    .trim();

  return text;
}

/**
 * Returns true if the string contains HTML tags.
 */
export function containsHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}
