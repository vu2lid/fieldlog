import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

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

  // Re-importing the export must dedupe everything: 0 added, 1 skipped
  await page.locator('input[type="file"]').setInputFiles(path!);
  await expect(page.getByText(/Import complete: 0 added, 1 skipped/)).toBeVisible();

  await page.getByRole('navigation').getByRole('button', { name: 'Log', exact: true }).click();
  await expect(page.locator('.log-table tbody tr')).toHaveCount(1);
  await expect(page.getByRole('cell', { name: 'W1AW' })).toBeVisible();
});
