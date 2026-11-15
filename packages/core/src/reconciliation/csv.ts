import { appError, err, ok, type AppError, type Result } from '../result';

export type CsvRow = { readonly cells: string[]; readonly raw: string; readonly line: number };

export type CsvLimits = {
  readonly maxChars: number;
  readonly maxRows: number;
  readonly maxCellsPerRow: number;
  readonly maxCellLength: number;
};

export const DEFAULT_CSV_LIMITS: CsvLimits = {
  maxChars: 5_000_000,
  maxRows: 20_000,
  maxCellsPerRow: 50,
  maxCellLength: 512,
};

/**
 * RFC4180-ish CSV: quotes, escaped quotes, CRLF/LF, embedded newlines, BOM. Fails closed with an
 * error on oversize input, an unterminated quote, or a stray quote. Error messages never echo
 * file content. Never throws.
 */
export const parseCsv = (
  input: string,
  limits: CsvLimits = DEFAULT_CSV_LIMITS,
): Result<CsvRow[], AppError> => {
  if (input.length > limits.maxChars) {
    return err(appError('csv_too_large', 'File is too large to import.'));
  }
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: CsvRow[] = [];
  let cells: string[] = [];
  let cell = '';
  let inQuotes = false;
  let closed = false; // just closed a quoted cell: only , or newline may follow
  let start = 0;
  let line = 1;
  let startLine = 1;
  let failure = null as AppError | null;

  const endRow = (end: number): void => {
    cells.push(cell);
    if (cells.length > limits.maxCellsPerRow) {
      failure = appError('csv_too_many_cells', 'A row has too many columns.');
      return;
    }
    const raw = text.slice(start, end);
    if (!(cells.length === 1 && cells[0]?.trim() === '')) {
      rows.push({ cells, raw, line: startLine });
      if (rows.length > limits.maxRows) failure = appError('csv_too_many_rows', 'Too many rows.');
    }
    cells = [];
    cell = '';
    closed = false;
  };

  for (let i = 0; i < text.length && !failure; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
          closed = true;
        }
      } else {
        if (c === '\n') line++;
        cell += c;
      }
    } else if (c === '"') {
      if (cell !== '' || closed) {
        failure = appError('csv_stray_quote', 'Malformed quote in file.');
      } else inQuotes = true;
    } else if (c === ',') {
      cells.push(cell);
      cell = '';
      closed = false;
      if (cells.length > limits.maxCellsPerRow) {
        failure = appError('csv_too_many_cells', 'A row has too many columns.');
      }
    } else if (c === '\r' || c === '\n') {
      const end = i;
      if (c === '\r' && text[i + 1] === '\n') i++;
      endRow(end);
      line++;
      start = i + 1;
      startLine = line;
    } else if (closed) {
      failure = appError('csv_stray_quote', 'Malformed quote in file.');
    } else cell += c;
    if (!failure && cell.length > limits.maxCellLength) {
      failure = appError('csv_cell_too_long', 'A cell is too long.');
    }
  }
  if (failure) return err(failure);
  if (inQuotes) return err(appError('csv_unterminated_quote', 'File ends inside a quoted value.'));
  if (start < text.length || cell !== '' || cells.length > 0) endRow(text.length);
  if (failure) return err(failure);
  return ok(rows);
};

/** Lower-case alphanumerics only: "Receipt No." -> "receiptno". */
export const headerKey = (h: string): string => h.toLowerCase().replace(/[^a-z0-9]/g, '');
