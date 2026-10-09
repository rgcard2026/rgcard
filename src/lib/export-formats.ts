import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, HeadingLevel, TextRun, AlignmentType } from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export type ExportFormat = 'csv' | 'json' | 'html' | 'xlsx' | 'pdf' | 'docx';

export type Dataset = {
  /** File name without extension, e.g. "rg-card-users". */
  name: string;
  /** Human-friendly title used in HTML / PDF / DOCX headings. */
  title: string;
  header: string[];
  rows: unknown[][];
};

export const EXPORT_FORMATS: ExportFormat[] = ['csv', 'xlsx', 'pdf', 'html', 'json', 'docx'];

export function normalizeFormat(value: string | null | undefined): ExportFormat {
  const raw = String(value || 'csv').toLowerCase().trim();
  if (raw === 'excel' || raw === 'xls') return 'xlsx';
  if (raw === 'word' || raw === 'doc') return 'docx';
  if ((EXPORT_FORMATS as string[]).includes(raw)) return raw as ExportFormat;
  return 'csv';
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function csvCell(value: unknown) {
  const raw = cell(value);
  // Neutralize spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toCsv(dataset: Dataset) {
  return '﻿' + [dataset.header, ...dataset.rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function escapeHtml(value: unknown) {
  return cell(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] as string));
}

function toHtml(dataset: Dataset) {
  const head = dataset.header.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const body = dataset.rows
    .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`)
    .join('\n');
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(dataset.title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; margin: 24px; background: #fff; color: #111; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { border: 1px solid #d0d5dd; padding: 6px 8px; text-align: start; vertical-align: top; }
  th { background: #faf3e0; font-weight: 700; }
  tr:nth-child(even) td { background: #fafafa; }
  @media print { body { margin: 0; } .no-print { display: none; } }
</style>
</head>
<body>
  <h1>${escapeHtml(dataset.title)}</h1>
  <div class="meta">${escapeHtml(dataset.rows.length)} records · exported ${escapeHtml(new Date().toISOString())}</div>
  <button class="no-print" onclick="window.print()" style="margin-bottom:12px;padding:6px 12px;cursor:pointer">Print / Save as PDF</button>
  <table><thead><tr>${head}</tr></thead><tbody>
${body}
  </tbody></table>
</body>
</html>`;
}

async function toXlsx(dataset: Dataset): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RG-Card';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(dataset.title.slice(0, 31) || 'Export');
  sheet.addRow(dataset.header);
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FF1A1A1A' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7E7BE' } };
  headerRow.alignment = { vertical: 'middle' };
  for (const row of dataset.rows) sheet.addRow(row.map((value) => (value instanceof Date ? value.toISOString() : value as string | number | boolean | null)));
  dataset.header.forEach((column, index) => {
    const maxContent = Math.max(column.length, ...dataset.rows.map((row) => cell(row[index]).length));
    sheet.getColumn(index + 1).width = Math.min(60, Math.max(12, maxContent + 2));
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

async function toPdf(dataset: Dataset): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 36;
  const pageWidth = 842; // A4 landscape
  const pageHeight = 595;
  const usableWidth = pageWidth - margin * 2;
  const columns = dataset.header.length || 1;
  const colWidth = usableWidth / columns;
  const fontSize = 8;
  const rowHeight = 16;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  page.drawText(dataset.title, { x: margin, y: y - 4, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 28;

  const clip = (value: unknown, width: number) => {
    let text = cell(value).replace(/[\r\n\t]+/g, ' ');
    const maxChars = Math.max(3, Math.floor(width / (fontSize * 0.5)));
    if (text.length > maxChars) text = text.slice(0, maxChars - 1) + '…';
    // pdf-lib StandardFonts cannot encode non-Latin (e.g. Arabic) glyphs.
    return text.replace(/[^\x00-\x7F]/g, '?');
  };

  const drawRow = (values: unknown[], bold: boolean) => {
    const usedFont = bold ? fontBold : font;
    values.forEach((value, index) => {
      page.drawText(clip(value, colWidth - 6), { x: margin + index * colWidth + 3, y: y - 11, size: fontSize, font: usedFont, color: rgb(0.12, 0.12, 0.12) });
    });
    page.drawLine({ start: { x: margin, y: y - rowHeight + 2 }, end: { x: pageWidth - margin, y: y - rowHeight + 2 }, thickness: 0.3, color: rgb(0.8, 0.8, 0.8) });
    y -= rowHeight;
  };

  drawRow(dataset.header, true);
  for (const row of dataset.rows) {
    if (y < margin + rowHeight) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawRow(dataset.header, true);
    }
    drawRow(row, false);
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

async function toDocx(dataset: Dataset): Promise<Buffer> {
  const headerRow = new TableRow({
    tableHeader: true,
    children: dataset.header.map((column) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: cell(column), bold: true })] })],
        shading: { fill: 'F7E7BE' }
      })
    )
  });
  const bodyRows = dataset.rows.map((row) =>
    new TableRow({
      children: row.map((value) =>
        new TableCell({ children: [new Paragraph({ children: [new TextRun(cell(value))] })] })
      )
    })
  );
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: dataset.title, heading: HeadingLevel.HEADING_1, bidirectional: true }),
        new Paragraph({ children: [new TextRun({ text: `${dataset.rows.length} records · ${new Date().toISOString()}`, color: '666666', size: 18 })] }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...bodyRows] })
      ],
      properties: {}
    }],
    styles: { default: { document: { run: { font: 'Arial' } } } }
  });
  // Provide alignment import usage to keep tree-shaking honest without altering layout.
  void AlignmentType;
  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

const CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: 'text/csv; charset=utf-8',
  json: 'application/json; charset=utf-8',
  html: 'text/html; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

export async function buildExportResponse(dataset: Dataset, format: ExportFormat): Promise<NextResponse> {
  const fileName = `${dataset.name}.${format}`;
  const headers = {
    'Content-Type': CONTENT_TYPES[format],
    'Content-Disposition': `attachment; filename="${fileName}"`,
    'Cache-Control': 'no-store'
  };

  if (format === 'csv') return new NextResponse(toCsv(dataset), { headers });
  if (format === 'html') return new NextResponse(toHtml(dataset), { headers });
  if (format === 'json') {
    const objects = dataset.rows.map((row) => Object.fromEntries(dataset.header.map((key, index) => [key, row[index] ?? null])));
    return new NextResponse(JSON.stringify({ title: dataset.title, exportedAt: new Date().toISOString(), count: objects.length, rows: objects }, null, 2), { headers });
  }
  if (format === 'xlsx') return new NextResponse(await toXlsx(dataset), { headers });
  if (format === 'pdf') return new NextResponse(await toPdf(dataset), { headers });
  if (format === 'docx') return new NextResponse(await toDocx(dataset), { headers });
  return new NextResponse(toCsv(dataset), { headers });
}
