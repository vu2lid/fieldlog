import { expect, test } from '@playwright/test';

test('core flow: log QSO, export, re-import', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /FieldLog/i })).toBeVisible();

  await page.getByRole('navigation').getByRole('button', { name: 'Session' }).click();
  await page.getByLabel('Station callsign').fill('K0TEST');
  await page.getByLabel('Operator callsign').fill('K0TEST');

  await page.getByRole('navigation').getByRole('button', { name: 'Log', exact: true }).click();
  await page.getByLabel('Callsign *').fill('W1AW');
  await page.getByRole('button', { name: 'Log QSO' }).click();
  await expect(page.getByText('Logged W1AW')).toBeVisible();

  await expect(page.getByRole('cell', { name: 'W1AW' })).toBeVisible();

  await page.getByRole('navigation').getByRole('button', { name: 'Import/Export' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export full log' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();

  await page.getByRole('navigation').getByRole('button', { name: 'Log', exact: true }).click();
  const beforeCount = await page.locator('.log-table tbody tr').count();

  await page.getByRole('navigation').getByRole('button', { name: 'Import/Export' }).click();
  await page.locator('input[type="file"]').setInputFiles(path!);
  await expect(page.getByText(/Import complete/)).toBeVisible();

  await page.getByRole('navigation').getByRole('button', { name: 'Log', exact: true }).click();
  const afterCount = await page.locator('.log-table tbody tr').count();
  expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
});