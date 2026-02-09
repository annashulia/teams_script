import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import Papa from 'papaparse';

interface CsvRow {
  ID: string;
  Title: string;
  Preconditions?: string;
  Steps: string;
  "Expected Result": string;
  Priority?: string;
  Type?: string;
}

function normalizeStepText(text: string): string[] {
  if (!text) return [];
  const arrow = /\s*[→>\-]+\s*/g;
  const rawSteps = text.split(/\s*→\s*|\s*>\s*|\s*->\s*|\s*\n\s*/);
  return rawSteps.map(s => s.trim()).filter(Boolean);
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const ZIP_ENTRY_SEPARATOR = '::';

function parseZipSpecifier(inputPath: string): { resolvedPath: string; entryName?: string } {
  const separatorIndex = inputPath.indexOf(ZIP_ENTRY_SEPARATOR);
  if (separatorIndex === -1) {
    return { resolvedPath: inputPath };
  }

  const resolvedPath = inputPath.slice(0, separatorIndex);
  const entryName = inputPath.slice(separatorIndex + ZIP_ENTRY_SEPARATOR.length);
  if (!entryName) {
    throw new Error(`Missing zip entry after "${ZIP_ENTRY_SEPARATOR}" in "${inputPath}".`);
  }

  return { resolvedPath, entryName };
}

function loadCsvInput(inputPath: string): { csv: string; source: string } {
  const { resolvedPath, entryName } = parseZipSpecifier(inputPath);

  if (resolvedPath.toLowerCase().endsWith('.zip')) {
    const zip = new AdmZip(resolvedPath);
    const entries = zip
      .getEntries()
      .filter(entry => !entry.isDirectory && entry.entryName.toLowerCase().endsWith('.csv'));

    if (!entries.length) {
      throw new Error(`No CSV files found in ${resolvedPath}.`);
    }

    let selectedEntry = entries[0];
    if (entryName) {
      selectedEntry =
        entries.find(entry => entry.entryName === entryName) ||
        entries.find(entry => path.basename(entry.entryName) === entryName);
      if (!selectedEntry) {
        const available = entries.map(entry => entry.entryName).join(', ');
        throw new Error(
          `CSV entry "${entryName}" not found in ${resolvedPath}. Available entries: ${available}`
        );
      }
    } else if (entries.length > 1) {
      const available = entries.map(entry => entry.entryName).join(', ');
      throw new Error(
        `Multiple CSV files found in ${resolvedPath}. ` +
          `Specify one using "${resolvedPath}${ZIP_ENTRY_SEPARATOR}path/in/zip.csv". ` +
          `Available entries: ${available}`
      );
    }

    return {
      csv: selectedEntry.getData().toString('utf8'),
      source: `${resolvedPath}${ZIP_ENTRY_SEPARATOR}${selectedEntry.entryName}`,
    };
  }

  if (entryName) {
    throw new Error(`Zip entry provided but "${resolvedPath}" is not a .zip file.`);
  }

  return { csv: fs.readFileSync(resolvedPath, 'utf8'), source: resolvedPath };
}

function emitHeader(): string {
  return `import { test, expect } from '@playwright/test';\n`;
}

function emitTest(row: CsvRow): string {
  const steps = normalizeStepText(row.Steps);
  const id = row.ID || 'CASE';
  const title = row.Title || '';
  const name = `${id} - ${title}`.replace(/`/g, '\\`');

  const lines: string[] = [];
  lines.push(`test('${name}', async ({ page, request, context }) => {`);

  // Heuristics for auth-related tests based on provided sheet
  const baseUrlExpr = "(process.env.BASE_URL || 'https://app.slotsense.ai')";

  const lowerSteps = steps.map(s => s.toLowerCase());
  const titleLower = title.toLowerCase();
  const isSignup = titleLower.includes('sign up') || lowerSteps.some(s => s.includes('sign up'));
  const landingPath = isSignup ? '/auth/signup' : '/auth/signin';
  lines.push(`  await page.goto(${baseUrlExpr} + '${landingPath}');`);

  // Default fills for common flows unless explicitly empty/invalid
  const requiresFields = lowerSteps.some(s => /enter|sign in|press enter/.test(s)) || /login|password|enter key/i.test(title);
  const leaveAllEmpty = titleLower.includes('empty fields') || lowerSteps.some(s => s.includes('leave fields empty'));
  if (requiresFields && !leaveAllEmpty) {
    lines.push("  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');");
    lines.push("  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'Passw0rd!');");
  }

  // Email
  if (lowerSteps.some(s => s.includes('enter valid email'))) {
    lines.push("  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');");
  } else if (lowerSteps.some(s => s.includes('non-existing email'))) {
    lines.push("  await page.getByLabel('Email').fill('nonexistent+' + Date.now() + '@example.com');");
  } else if (lowerSteps.some(s => s.includes("enter 'abc'"))) {
    lines.push("  await page.getByLabel('Email').fill('abc');");
  } else if (lowerSteps.some(s => s.includes('email with spaces')) || titleLower.includes('email with spaces')) {
    lines.push("  await page.getByLabel('Email').fill(' ' + (process.env.TEST_EMAIL || 'user@example.com') + ' ');");
  } else if (lowerSteps.some(s => s.includes('leave fields empty'))) {
    lines.push("  await page.getByLabel('Email').fill('');");
  } else if (isSignup && titleLower.includes('existing user')) {
    lines.push("  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');");
  } else if (isSignup && titleLower.includes('new email')) {
    lines.push("  await page.getByLabel('Email').fill('new+' + Date.now() + '@example.com');");
  }

  // Password
  if (lowerSteps.some(s => s.includes('valid password'))) {
    lines.push("  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'Passw0rd!');");
  } else if (lowerSteps.some(s => s.includes('wrong password'))) {
    lines.push("  await page.getByLabel('Password').fill('totally-wrong-password');");
  } else if (lowerSteps.some(s => s.includes('300-char password'))) {
    lines.push("  await page.getByLabel('Password').fill('x'.repeat(300));");
  } else if (lowerSteps.some(s => s.includes('leave password empty'))) {
    lines.push("  await page.getByLabel('Password').fill('');");
  }

  // Eye icon toggle password
  if (lowerSteps.some(s => s.includes('eye icon'))) {
    lines.push("  await page.getByRole('button', { name: /show password|hide password/i }).click();");
  }

  // Submit
  if (lowerSteps.some(s => s.includes('click sign in'))) {
    lines.push("  await page.getByRole('button', { name: /sign in/i }).click();");
  }
  if (lowerSteps.some(s => s.includes('press enter')) || titleLower.includes('enter key')) {
    lines.push("  await page.getByLabel('Password').press('Enter');");
  }

  // Forgot password
  if (lowerSteps.some(s => s.includes('forgot password'))) {
    lines.push("  await page.getByRole('link', { name: /forgot password/i }).click();");
  }

  // Sign up actions
  if (isSignup) {
    lines.push("  await page.getByRole('button', { name: /send code/i }).click();");
  }

  // Expectations from 'Expected Result'
  const expected = (row['Expected Result'] || '').toLowerCase();
  if (expected.includes('redirect to dashboard')) {
    lines.push("  await expect(page).toHaveURL(/\\/dashboard/); ");
  }
  if (expected.includes('validation error')) {
    lines.push("  await expect(page.getByText(/required/i)).toBeVisible();");
  }
  if (expected.includes('incorrect email or password')) {
    lines.push("  await expect(page.getByText(/incorrect email or password/i)).toBeVisible();");
  }
  if (expected.includes('entered value does not match email format')) {
    lines.push("  await expect(page.getByText(/does not match email format/i)).toBeVisible();");
  }
  if (expected.includes('session cookie')) {
    lines.push("  const cookies = await context.cookies();\n  expect(cookies.some(c => /session/i.test(c.name))).toBeTruthy();");
  }
  if (expected.includes('422 response')) {
    lines.push("  // Best-effort: ensure page did not navigate to dashboard\n  await expect(page).not.toHaveURL(/\\/dashboard/);");
  }
  if (expected.includes('check your email')) {
    lines.push("  await expect(page.getByText(/check your email/i)).toBeVisible();");
  }
  if (isSignup && titleLower.includes('existing user')) {
    lines.push("  await expect(page.getByText(/already registered/i)).toBeVisible();");
  }
  if (isSignup && titleLower.includes('new email')) {
    lines.push("  await expect(page.getByText(/resend code/i)).toBeVisible();");
  }

  lines.push('});');
  return lines.join('\n');
}

function generate(filePath: string) {
  const { csv } = loadCsvInput(filePath);
  const parsed = Papa.parse<CsvRow>(csv, { header: true, skipEmptyLines: true }) as unknown as Papa.ParseResult<CsvRow>;
  if (parsed.errors.length) {
    console.error('CSV parse errors:', parsed.errors);
  }
  const rows = (parsed.data as CsvRow[]).filter((r: CsvRow) => r && r.ID && r.Title);

  const groups: Record<string, CsvRow[]> = {};
  for (const row of rows) {
    const [prefix] = row.ID.split('-');
    groups[prefix] ||= [];
    groups[prefix].push(row);
  }

  const outDir = path.resolve('tests');
  fs.mkdirSync(outDir, { recursive: true });

  for (const [group, cases] of Object.entries(groups)) {
    const filename = `${sanitizeFilename(group)}.spec.ts`;
    const fileLines: string[] = [emitHeader()];
    for (const c of cases) {
      fileLines.push('\n' + emitTest(c) + '\n');
    }
    fs.writeFileSync(path.join(outDir, filename), fileLines.join('\n'));
    console.log('Wrote', path.join('tests', filename));
  }
}

if (require.main === module) {
  const csvPath = process.argv[2] || 'sheet.csv';
  try {
    generate(csvPath);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
