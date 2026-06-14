/**
 * Markdown syntax style for OpenTUI's <code filetype="markdown"> element.
 *
 * Follows the same approach as OpenCode (github.com/sst/opencode):
 * - Uses SyntaxStyle.fromTheme() with tree-sitter scope rules
 * - Maps Catppuccin Mocha colors to markdown grammar scopes
 * - Returns a lazily-created singleton to avoid re-allocating the native style object
 */

import { SyntaxStyle } from '@opentui/core';
import { colors } from './colors';

let _markdownSyntaxStyle: SyntaxStyle | null = null;

/**
 * Returns a SyntaxStyle suitable for <code filetype="markdown">.
 * The instance is created once and cached.
 */
export function getMarkdownSyntaxStyle(): SyntaxStyle {
  if (_markdownSyntaxStyle) return _markdownSyntaxStyle;

  _markdownSyntaxStyle = SyntaxStyle.fromTheme([
    // Default text
    {
      scope: ['default'],
      style: { foreground: colors.text },
    },

    // Headings — blue, bold
    {
      scope: [
        'markup.heading',
        'markup.heading.1',
        'markup.heading.2',
        'markup.heading.3',
        'markup.heading.4',
        'markup.heading.5',
        'markup.heading.6',
      ],
      style: { foreground: colors.blue, bold: true },
    },

    // Bold / strong — peach, bold
    {
      scope: ['markup.bold', 'markup.strong'],
      style: { foreground: colors.peach, bold: true },
    },

    // Italic / emphasis — mauve, italic
    {
      scope: ['markup.italic', 'markup.emph'],
      style: { foreground: colors.mauve, italic: true },
    },

    // Lists — subtext1
    {
      scope: ['markup.list'],
      style: { foreground: colors.subtext1 },
    },

    // Block quotes — teal, italic
    {
      scope: ['markup.quote'],
      style: { foreground: colors.teal, italic: true },
    },

    // Inline code — green
    {
      scope: ['markup.raw', 'markup.raw.inline'],
      style: { foreground: colors.green },
    },

    // Code blocks — green
    {
      scope: ['markup.raw.block'],
      style: { foreground: colors.green },
    },

    // Links — sky, underline
    {
      scope: ['markup.link', 'markup.link.url'],
      style: { foreground: colors.sky, underline: true },
    },

    // Link text labels — lavender, underline
    {
      scope: ['markup.link.label'],
      style: { foreground: colors.lavender, underline: true },
    },

    // Horizontal rule — overlay1
    {
      scope: ['markup.thematic_break'],
      style: { foreground: colors.overlay1 },
    },

    // Comments / muted
    {
      scope: ['conceal'],
      style: { foreground: colors.overlay2 },
    },
  ]);

  return _markdownSyntaxStyle;
}
