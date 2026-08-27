/* A real CSV parser.

   Splitting on commas would work right up until somebody types a comma, which
   on a community board is immediately: "Catfish, slaw, and hushpuppies". The
   body field is also the one most likely to hold a line break and a pair of
   quotes, and Google escapes all three the standard way, so this reads them
   the standard way rather than guessing.

   RFC 4180 rules. A field wrapped in double quotes may contain commas, line
   breaks, and doubled quotes standing for one quote. Bare fields end at the
   next comma or line ending. Both CRLF and LF end a row. */

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let index = 0;
  /* A byte order mark on the front of the first header would make the first
     column name unmatchable, and the failure looks like a missing column. */
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const endField = () => { row.push(field); field = ''; };
  const endRow = () => {
    endField();
    /* A trailing newline should not produce a row of one empty string. */
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
  };

  while (index < input.length) {
    const char = input[index];

    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') { field += '"'; index += 2; continue; }
        quoted = false; index += 1; continue;
      }
      field += char; index += 1; continue;
    }

    if (char === '"') { quoted = true; index += 1; continue; }
    if (char === ',') { endField(); index += 1; continue; }
    if (char === '\r') {
      if (input[index + 1] === '\n') index += 1;
      endRow(); index += 1; continue;
    }
    if (char === '\n') { endRow(); index += 1; continue; }

    field += char; index += 1;
  }

  if (field !== '' || row.length) endRow();
  return rows;
}

/* Rows keyed by the header line, every value trimmed. Columns the sheet does
   not have come back undefined rather than throwing, so adding a column to the
   spreadsheet never needs a matching code change on the same day. */
export function parseCsvRows(text) {
  const rows = parseCsv(text);
  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0].map((name) => name.trim());
  const records = rows.slice(1).map((cells, offset) => {
    const record = {};
    headers.forEach((name, column) => {
      if (!name) return;
      record[name] = (cells[column] || '').trim();
    });
    /* The row number a person would see in the spreadsheet, so a warning about
       a bad row names something they can actually go and look at. */
    record.__row = offset + 2;
    return record;
  });
  return { headers, records };
}
