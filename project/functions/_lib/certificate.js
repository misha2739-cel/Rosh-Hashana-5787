import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 28;
const MARGIN_INNER = 38;
const CONTENT_LEFT = 90;
const CONTENT_RIGHT = PAGE_W - 90;
const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT;
const BOTTOM_LIMIT = 60;
const SIGNATURE_BLOCK_HEIGHT = 170;

const CREAM = rgb(0.984, 0.949, 0.894);
const GOLD = rgb(0.788, 0.635, 0.294);
const BROWN = rgb(0.318, 0.157, 0.098);
const TEXT_COLOR = rgb(0.16, 0.13, 0.09);
const MUTED = rgb(0.55, 0.47, 0.36);

function letterSpace(text) {
  return text
    .split('')
    .map((ch) => (ch === ' ' ? '  ' : ch))
    .join(' ');
}

function wrapText(text, font, size, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateStr;
  const [y, m, d] = parts;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export async function buildCertificatePdf({ name, commitments, dateVal }) {
  const doc = await PDFDocument.create();
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await doc.embedFont(StandardFonts.Helvetica);

  const fonts = { serifBold, serif, serifItalic, sans };
  const state = { doc, fonts, page: null, y: 0 };

  addPage(state);
  drawHeader(state, name);

  drawCommitments(state, commitments);
  ensureSpace(state, SIGNATURE_BLOCK_HEIGHT);
  drawSignatureBlock(state, name, dateVal);

  return doc.save();
}

function addPage(state) {
  const page = state.doc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: CREAM });
  page.drawRectangle({
    x: MARGIN,
    y: MARGIN,
    width: PAGE_W - MARGIN * 2,
    height: PAGE_H - MARGIN * 2,
    borderColor: GOLD,
    borderWidth: 1.5,
  });
  page.drawRectangle({
    x: MARGIN_INNER,
    y: MARGIN_INNER,
    width: PAGE_W - MARGIN_INNER * 2,
    height: PAGE_H - MARGIN_INNER * 2,
    borderColor: GOLD,
    borderWidth: 0.75,
  });
  state.page = page;
  state.y = PAGE_H - 90;
  return page;
}

function ensureSpace(state, needed) {
  if (state.y - needed < BOTTOM_LIMIT) {
    addPage(state);
  }
}

function centerText(state, text, font, size, color) {
  const width = font.widthOfTextAtSize(text, size);
  state.page.drawText(text, { x: (PAGE_W - width) / 2, y: state.y, size, font, color });
}

function drawHeader(state, name) {
  const { serifBold, serifItalic, sans } = state.fonts;

  centerText(state, letterSpace('ROSH HASHANAH 5787'), sans, 10, GOLD);
  state.y -= 34;

  centerText(state, 'Shabbos Commitment', serifBold, 28, BROWN);
  state.y -= 34;
  centerText(state, 'Certificate', serifBold, 28, BROWN);
  state.y -= 30;

  centerText(state, 'My Commitment for Year 5787 (2026–2027)', serifItalic, 13, GOLD);
  state.y -= 28;

  const cx = PAGE_W / 2;
  const dividerY = state.y;
  state.page.drawLine({ start: { x: cx - 90, y: dividerY }, end: { x: cx - 16, y: dividerY }, thickness: 1, color: GOLD });
  state.page.drawLine({ start: { x: cx + 16, y: dividerY }, end: { x: cx + 90, y: dividerY }, thickness: 1, color: GOLD });
  state.page.drawRectangle({
    x: cx - 4,
    y: dividerY - 4,
    width: 8,
    height: 8,
    color: GOLD,
    rotate: degrees(45),
  });
  state.y -= 40;

  const intro = `I, ${name || 'Friend'}, commit to making my best effort to make Shabbos special throughout the year 5787 by embracing the following commitments:`;
  const introLines = wrapText(intro, state.fonts.serif, 13, CONTENT_WIDTH);
  introLines.forEach((line) => {
    state.page.drawText(line, { x: CONTENT_LEFT, y: state.y, size: 13, font: state.fonts.serif, color: TEXT_COLOR });
    state.y -= 20;
  });
  state.y -= 14;
}

function drawCommitments(state, commitments) {
  const { serif } = state.fonts;
  const bulletX = CONTENT_LEFT + 6;
  const textX = bulletX + 16;
  const maxWidth = CONTENT_RIGHT - textX;
  const lineHeight = 17;

  if (!commitments || commitments.length === 0) {
    ensureSpace(state, lineHeight);
    state.page.drawText('No specific commitments were selected.', {
      x: CONTENT_LEFT,
      y: state.y,
      size: 12,
      font: state.fonts.serifItalic,
      color: MUTED,
    });
    state.y -= lineHeight;
    return;
  }

  for (const commitment of commitments) {
    const lines = wrapText(commitment, serif, 12, maxWidth);
    ensureSpace(state, lines.length * lineHeight + 8);
    state.page.drawText('-', { x: bulletX, y: state.y, size: 12, font: serif, color: GOLD });
    lines.forEach((line) => {
      state.page.drawText(line, { x: textX, y: state.y, size: 12, font: serif, color: TEXT_COLOR });
      state.y -= lineHeight;
    });
    state.y -= 8;
  }
}

function drawSignatureBlock(state, name, dateVal) {
  const { serifItalic, sans } = state.fonts;
  const page = state.page;
  const baseY = 150;
  state.y = Math.max(state.y, baseY + 60);
  const y = baseY;

  page.drawText(name || '', { x: CONTENT_LEFT, y: y + 40, size: 30, font: serifItalic, color: BROWN });
  page.drawLine({ start: { x: CONTENT_LEFT, y: y + 32 }, end: { x: CONTENT_LEFT + 220, y: y + 32 }, thickness: 1, color: GOLD });
  page.drawText(letterSpace('SIGNATURE'), { x: CONTENT_LEFT, y: y + 18, size: 8, font: sans, color: MUTED });

  const dateLabel = letterSpace('DATE OF COMMITMENT');
  const dateLabelWidth = sans.widthOfTextAtSize(dateLabel, 8);
  const dateText = formatDate(dateVal);
  const dateTextWidth = serifItalic.widthOfTextAtSize(dateText, 12);
  const rightEdge = CONTENT_RIGHT;
  page.drawText(dateLabel, { x: rightEdge - dateLabelWidth, y: y + 18, size: 8, font: sans, color: MUTED });
  page.drawText(dateText, { x: rightEdge - dateTextWidth, y: y + 32, size: 12, font: serifItalic, color: TEXT_COLOR });
}
