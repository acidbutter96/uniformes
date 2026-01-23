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
  emittedAtLabel: string;
  logoUrl?: string;
  headers: string[];
  rows: string[][];
}) {
  const pdfDoc = await PDFDocument.create();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageSize: [number, number] = [595.28, 841.89]; // A4 portrait (pt)
  const margin = 48;

  const headerColor = rgb(0.07, 0.07, 0.07);
  const muted = rgb(0.35, 0.35, 0.35);
  const lineColor = rgb(0.9, 0.9, 0.9);

  let page = pdfDoc.addPage(pageSize);
  let y = page.getHeight() - margin;

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

  const ensureSpace = (needed: number) => {
    if (y - needed > margin) return;
    page = pdfDoc.addPage(pageSize);
    y = page.getHeight() - margin;
  };

  const drawRow = (values: string[], opts: { bold?: boolean } = {}) => {
    ensureSpace(18);
    for (let i = 0; i < colCount; i += 1) {
      const text = values[i] ?? '';
      page.drawText(text, {
        x: margin + i * colWidth,
        y,
        size: 9,
        font: opts.bold ? fontBold : font,
        color: headerColor,
        maxWidth: colWidth - 6,
      });
    }
    y -= 14;
  };

  drawRow(params.headers, { bold: true });
  y -= 2;
  drawLine();
  y -= 12;

  for (const row of params.rows) {
    drawRow(row);
  }

  const bytes = await pdfDoc.save();
  return new Uint8Array(bytes);
}
