# SQL to table / Excel (with change preview)
slug: sql-to-excel
scaffold: vanilla
status: beta

## What it does
Paste SQL, see it two ways at once:
1. A plain-English **change preview** - one note per statement saying what the SQL will add, change, or delete. Destructive statements (DROP, TRUNCATE, DELETE without WHERE) are flagged loudly.
2. The rows from any `INSERT` statements rendered as **tables** (one per target table), downloadable as a real `.xlsx` workbook (one sheet per table) or per-table `.csv`.

It does NOT run the SQL. It is a static, read-only previewer - it reads what the SQL says and shows you the data and the risks before you ever run it against a real database.

## Why this shape
Founder's framing: "drop SQL code, get a downloadable table of the new data plus small, understandable notes on what if anything the code will delete or change." This is a safety + extraction tool, not a query engine.

## UI
- Big input textarea (paste or drop a `.sql` file).
- "Preview" runs automatically on input (debounced).
- Change-preview panel: a list of statements, each with a badge - ADDS (outline) / CHANGES (yellow) / DELETES (solid black) - and a one-line explanation. A top summary line counts each kind.
- Below: one table card per table that has INSERTed rows. Each card has a "Download .csv" link.
- Global "Download Excel (.xlsx)" button (all tables, one sheet each).
- Empty/edge states: no INSERTs -> show only the change preview; unparseable -> friendly message.

## Privacy story
High. Developers and analysts paste production SQL (with real customer rows) into random "SQL formatter / runner" sites all the time. This one never uploads anything - the whole point.

## Libraries allowed
- None. Hand-written SQL statement splitter + lightweight parser (~250 lines).
- `.xlsx` written by a small dependency-free zip(STORE)+CRC32 writer (no SheetJS, keeps the folder tiny).

## Parsing scope
- Statement split respects `'...'` (with `''` escape), `"..."`, `` `...` ``, `-- line` and `/* block */` comments.
- Classify by leading keyword: INSERT / REPLACE / UPDATE / DELETE / DROP / TRUNCATE / ALTER / CREATE / MERGE / and an "other" bucket.
- INSERT: extract table, optional column list, and one-or-many VALUES tuples -> rows. If no column list, columns are col1..colN.
- Notes severity: DELETES = DROP / TRUNCATE / DELETE / ALTER ... DROP COLUMN; CHANGES = UPDATE / REPLACE / INSERT ... ON DUPLICATE KEY / MERGE / ALTER (add/modify); ADDS = INSERT / CREATE.
- WHERE-less DELETE/UPDATE gets an extra "affects EVERY row" warning.

## Acceptance
- A mixed dump (CREATE + multi-row INSERT + UPDATE + DELETE + DROP) parses; every statement gets a correct note.
- Multi-row INSERT and column-less INSERT both produce correct table rows.
- Generated `.xlsx` opens cleanly in Excel / Google Sheets / openpyxl with numbers typed as numbers.
- Commas/parens/quotes inside string literals do not break tuple parsing.
- Bundle well under 30 KB. No runtime network calls.

## SEO
- title: "Free SQL to Excel + change preview - in your browser - techtuate"
- description: "Paste SQL to see the rows it adds as a downloadable Excel/CSV table, plus plain-English notes on what it deletes or changes. Runs in your browser, nothing uploaded."
- keywords: "sql to excel, sql to table, sql to csv, convert sql to excel, sql insert to excel, view sql online, sql preview, what does this sql do"
- Competitor pages to consider later: `/vs/sqliteonline/`, `/vs/convertcsv-sql/`.
