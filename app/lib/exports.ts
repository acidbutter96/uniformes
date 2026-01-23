import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export type ExportFormat = 'csv' | 'json' | 'pdf';

export function downloadBlob(params: { blob: Blob; filename: string }) {
  const url = URL.createObjectURL(params.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = params.filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown) {
  const raw = value === null || value === undefined ? '' : String(value);
  const needsQuotes = /[\n\r,\"]/g.test(raw);
  const escaped = raw.replaceAll('"', '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function toCsv(params: { headers: string[]; rows: unknown[][] }) {
  const lines = [params.headers.map(csvEscape).join(',')];
  for (const row of params.rows) {
    lines.push(row.map(csvEscape).join(','));
  }
  return lines.join('\n');
}

export async function generateReservationsFlowPdf(params: {
  title: string;
  companyName?: string;
  emittedAtLabel: string;
  logoUrl?: string;
  headers: string[];
  rows: string[][];
  orientation?: 'portrait' | 'landscape';
  columnAlign?: Array<'left' | 'right'>;
  boldRowIndexes?: number[];
}) {
  const pdfDoc = await PDFDocument.create();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageSize: [number, number] =
    params.orientation === 'landscape'
      ? ([841.89, 595.28] as const) // A4 landscape (pt)
      : ([595.28, 841.89] as const); // A4 portrait (pt)
  const margin = 48;

  const headerColor = rgb(0.07, 0.07, 0.07);
  const muted = rgb(0.35, 0.35, 0.35);
  const lineColor = rgb(0.9, 0.9, 0.9);

  let page = pdfDoc.addPage(pageSize);
  let y = page.getHeight() - margin;

  const pageWidth = page.getWidth();

  const wrapText = (text: string, maxWidth: number, opts: { bold?: boolean } = {}) => {
    const source = String(text ?? '');
    if (!source.trim()) return [''];

    const words = source.split(/\s+/g).filter(Boolean);
    const usedFont = opts.bold ? fontBold : font;
    const size = 9;

    const lines: string[] = [];
    let current = '';

    const fits = (value: string) => usedFont.widthOfTextAtSize(value, size) <= maxWidth;

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (fits(candidate)) {
        current = candidate;
        continue;
      }

      if (current) {
        lines.push(current);
        current = '';
      }

      // If a single word doesn't fit, hard-break it.
      if (!fits(word)) {
        let chunk = '';
        for (const ch of word) {
          const next = chunk + ch;
          if (fits(next)) {
            chunk = next;
          } else {
            lines.push(chunk || ch);
            chunk = chunk ? ch : '';
          }
        }
        if (chunk) {
          current = chunk;
        }
      } else {
        current = word;
      }
    }

    if (current) lines.push(current);
    return lines;
  };

  const drawLine = () => {
    page.drawLine({
      start: { x: margin, y },
      end: { x: page.getWidth() - margin, y },
      thickness: 1,
      color: lineColor,
    });
  };

  // Logo (optional)
  if (params.logoUrl) {
    try {
      const res = await fetch(params.logoUrl);
      const bytes = await res.arrayBuffer();
      const png = await pdfDoc.embedPng(bytes);
      const targetHeight = 28;
      const scale = targetHeight / png.height;
      const w = png.width * scale;
      const h = targetHeight;
      page.drawImage(png, {
        x: margin,
        y: y - h + 6,
        width: w,
        height: h,
      });
    } catch {
      // ignore logo failures
    }
  }

  if (params.companyName) {
    const text = params.companyName;
    const size = 12;
    const textWidth = fontBold.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: Math.max(margin, pageWidth - margin - textWidth),
      y: y - 20,
      size,
      font: fontBold,
      color: headerColor,
    });
  }

  // Header text
  page.drawText(params.title, {
    x: margin,
    y: y - 36,
    size: 16,
    font: fontBold,
    color: headerColor,
  });

  page.drawText(`Emitido em: ${params.emittedAtLabel}`, {
    x: margin,
    y: y - 56,
    size: 10,
    font,
    color: muted,
  });

  y -= 76;
  drawLine();
  y -= 16;

  // Table
  const colCount = Math.max(1, params.headers.length);
  const tableWidth = page.getWidth() - margin * 2;
  const colWidth = tableWidth / colCount;

  const align = Array.isArray(params.columnAlign) ? params.columnAlign : [];
  const boldRowSet = new Set(Array.isArray(params.boldRowIndexes) ? params.boldRowIndexes : []);

  const ensureSpace = (needed: number) => {
    if (y - needed > margin) return;
    page = pdfDoc.addPage(pageSize);
    y = page.getHeight() - margin;
  };

  const drawRow = (
    values: string[],
    opts: {
      bold?: boolean;
    } = {},
  ) => {
    const cellMaxWidth = colWidth - 8;
    const lineHeight = 11;
    const paddingY = 3;

    const wrapped = Array.from({ length: colCount }).map((_, i) =>
      wrapText(values[i] ?? '', cellMaxWidth, { bold: opts.bold }),
    );
    const maxLines = Math.max(1, ...wrapped.map(lines => lines.length));
    const rowHeight = paddingY * 2 + maxLines * lineHeight;

    ensureSpace(rowHeight + 6);

    const usedFont = opts.bold ? fontBold : font;
    const fontSize = 9;

    for (let i = 0; i < colCount; i += 1) {
      const lines = wrapped[i] ?? [''];
      const xLeft = margin + i * colWidth;
      const xRight = xLeft + colWidth;
      const isRight = align[i] === 'right';
      let yy = y;

      for (const line of lines) {
        const textWidth = usedFont.widthOfTextAtSize(line, fontSize);
        const x = isRight ? Math.max(xLeft, xRight - 8 - textWidth) : xLeft;
        page.drawText(line, {
          x,
          y: yy,
          size: fontSize,
          font: usedFont,
          color: headerColor,
        });
        yy -= lineHeight;
      }
    }

    y -= rowHeight;
  };

  drawRow(params.headers, { bold: true });
  y -= 2;
  drawLine();
  y -= 12;

  for (let i = 0; i < params.rows.length; i += 1) {
    const row = params.rows[i];
    drawRow(row, { bold: boldRowSet.has(i) });
  }

  const bytes = await pdfDoc.save();
  return new Uint8Array(bytes);
}
