import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

test('Help identifies the running application version', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('navigation').getByRole('button', { name: 'Help' }).click();
  await expect(page.getByText(`FieldLog v${packageJson.version}`)).toBeVisible();
});

test('core flow: log QSO, export, re-import round-trips faithfully', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /FieldLog/i })).toBeVisible();

  await page.getByRole('navigation').getByRole('button', { name: 'Session' }).click();
  await page.getByLabel('Station callsign').fill('K0TEST');
  await page.getByLabel('Operator callsign').fill('K0TEST');
  await page.getByLabel('My POTA ref').fill('US-TX-0001');

  await page.getByRole('navigation').getByRole('button', { name: 'Log', exact: true }).click();
  await page.getByLabel('Callsign *').fill('W1AW');
  // Secondary fields live in a disclosure that starts collapsed on phones
  await page
    .locator('details.more-fields')
    .evaluate((d) => ((d as HTMLDetailsElement).open = true));
  await page.getByLabel('Their POTA ref').fill('US-CA-0123');
  await page.getByRole('button', { name: 'Log QSO' }).click();
  await expect(page.getByText('Logged W1AW')).toBeVisible();

  await expect(page.getByRole('cell', { name: 'W1AW' })).toBeVisible();

  await page.getByRole('navigation').getByRole('button', { name: 'Import/Export' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export full log' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();

  // Field-level fidelity of the exported ADIF
  const adi = readFileSync(path!, 'utf-8');
  expect(adi).toContain('<ADIF_VER:5>3.1.7');
  expect(adi).toContain(`<PROGRAMVERSION:${packageJson.version.length}>${packageJson.version}`);
  expect(adi).toContain('<EOH>');
  expect(adi).toContain('<CALL:4>W1AW');
  expect(adi).toContain('<BAND:3>20m');
  expect(adi).toContain('<MODE:3>SSB');
  expect(adi).toContain('<RST_SENT:2>59');
  expect(adi).toContain('<RST_RCVD:2>59');
  expect(adi).toContain('<STATION_CALLSIGN:6>K0TEST');
  expect(adi).toContain('<OPERATOR:6>K0TEST');
  expect(adi).toContain('<MY_SIG:4>POTA');
  expect(adi).toContain('<MY_SIG_INFO:10>US-TX-0001');
  expect(adi).toContain('<MY_POTA_REF:10>US-TX-0001');
  expect(adi).toContain('<SIG:4>POTA');
  expect(adi).toContain('<SIG_INFO:10>US-CA-0123');
  expect(adi).toContain('<POTA_REF:10>US-CA-0123');
  expect(adi).toContain('<EOR>');

  // Re-importing the export must preview everything as duplicate without writing.
  await page.locator('input[type="file"]').setInputFiles(path!);
  const previewCounts = page.getByLabel('Import preview counts');
  await expect(previewCounts).toContainText('0 ready to import');
  await expect(previewCounts).toContainText('1 duplicates skipped');
  await expect(page.getByText(/Nothing is ready to import/)).toBeVisible();

  await page.getByRole('navigation').getByRole('button', { name: 'Log', exact: true }).click();
  await expect(page.locator('.log-table tbody tr')).toHaveCount(1);
  await expect(page.getByRole('cell', { name: 'W1AW' })).toBeVisible();
});

test('Highlights table fits Pixel 7 portrait and landscape without Actions', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('/');

  await page.getByLabel('Callsign *').fill('W1AW');
  await page.getByRole('button', { name: 'Log QSO' }).click();

  const table = page.getByRole('table');
  await expect(table.getByRole('columnheader', { name: /Date/ })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Actions' })).toHaveCount(0);

  const expectNoHorizontalOverflow = async () => {
    const dimensions = await page.evaluate(() => {
      const region = document.querySelector<HTMLElement>('.log-table-wrap');
      return {
        pageFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        tableFits: region !== null && region.scrollWidth <= region.clientWidth,
      };
    });
    expect(dimensions.pageFits).toBe(true);
    expect(dimensions.tableFits).toBe(true);
  };

  await expectNoHorizontalOverflow();
  await page.setViewportSize({ width: 915, height: 412 });
  await expectNoHorizontalOverflow();
});

test('Light theme applies, persists, and fits a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('/');

  const selector = page.getByRole('combobox', { name: 'Theme' });
  await expect(selector).toHaveValue('dark');
  await selector.selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveValue('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  const pageFits = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(pageFits).toBe(true);
});

test('manual entry blocks invalid values and succeeds after correction', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Callsign *').fill('W1AW');
  await page.getByLabel('QSO date (UTC)').fill('20230229');
  await page.getByRole('button', { name: 'Log QSO' }).click();

  await expect(page.getByRole('alert')).toContainText('Fix 1 error before logging');
  await expect(page.getByText(/QSO date must be a real date/)).toBeVisible();
  await expect(page.getByLabel('QSO date (UTC)')).toBeFocused();
  await expect(page.getByRole('cell', { name: 'W1AW' })).toHaveCount(0);

  await page.getByLabel('QSO date (UTC)').fill('20240229');
  await page.getByRole('button', { name: 'Log QSO' }).click();

  await expect(page.getByText('Logged W1AW')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'W1AW' })).toBeVisible();
});

test('import preview excludes invalid records before confirmed persistence', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Import/Export' }).click();

  const valid =
    '<CALL:5>K1ABC<QSO_DATE:8>20240229<TIME_ON:6>120000<BAND:3>20m<FREQ:4>14.2<MODE:3>SSB<EOR>';
  const invalid = '<CALL:5>N0BAD<TIME_ON:6>120000<BAND:3>20m<FREQ:4>14.2<MODE:3>SSB<EOR>';
  await page.locator('input[type="file"]').setInputFiles({
    name: 'mixed.adi',
    mimeType: 'text/plain',
    buffer: Buffer.from(valid + invalid),
  });

  const counts = page.getByLabel('Import preview counts');
  await expect(counts).toContainText('2 records found');
  await expect(counts).toContainText('1 ready to import');
  await expect(counts).toContainText('1 invalid excluded');
  await page.getByRole('button', { name: 'Import 1 QSO' }).click();
  await expect(page.getByText(/Import complete: 1 added/)).toBeVisible();

  await page.getByRole('navigation').getByRole('button', { name: 'Log', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'K1ABC' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'N0BAD' })).toHaveCount(0);
});

test('grouped QSO editor persists contact and program fields', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Callsign *').fill('W1AW');
  await page.getByRole('button', { name: 'Log QSO' }).click();

  await page.getByRole('checkbox', { name: 'Highlights' }).uncheck();
  await page.getByRole('button', { name: 'Edit' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByText('Contact and station fields').click();
  await dialog.getByLabel('Name').fill('Hiram');
  await dialog.getByLabel('Their grid').fill('FN31PR');
  await dialog.getByLabel('Comment').fill('Edited in FieldLog');
  await dialog.getByText('Program, signal, and contest fields').click();
  await dialog.getByLabel('Their POTA ref').fill('US-CA-0123');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: 'Edit' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByText('Contact and station fields').click();
  await expect(dialog.getByLabel('Name')).toHaveValue('Hiram');
  await expect(dialog.getByLabel('Their grid')).toHaveValue('FN31PR');
  await expect(dialog.getByLabel('Comment')).toHaveValue('Edited in FieldLog');
  await dialog.getByText('Program, signal, and contest fields').click();
  await expect(dialog.getByLabel('Their POTA ref')).toHaveValue('US-CA-0123');
});

test('backup reminder clears after full export and returns after a log change', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'fieldlog-backup-reminder',
      JSON.stringify({ qsoCountThreshold: 1, ageMinutesThreshold: 240 }),
    );
  });
  await page.goto('/');

  await page.getByLabel('Callsign *').fill('W1AW');
  await page.getByRole('button', { name: 'Log QSO' }).click();
  await expect(page.getByText('Full-log backup recommended.')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup now' }).click();
  await downloadPromise;
  await expect(page.getByText('Full-log backup recommended.')).toHaveCount(0);

  await page.reload();
  await expect(page.getByText('Full-log backup recommended.')).toHaveCount(0);

  await page.getByLabel('Callsign *').fill('K1ABC');
  await page.getByRole('button', { name: 'Log QSO' }).click();
  await expect(page.getByText('Full-log backup recommended.')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss until log changes' }).click();
  await expect(page.getByText('Full-log backup recommended.')).toHaveCount(0);

  await page.getByLabel('Callsign *').fill('N0CALL');
  await page.getByRole('button', { name: 'Log QSO' }).click();
  await expect(page.getByText('Full-log backup recommended.')).toBeVisible();
});
