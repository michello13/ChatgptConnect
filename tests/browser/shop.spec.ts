import { expect, test } from '@playwright/test';

test('customer orders, admin stock changes and mobile layout', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The Honesty Box' })).toBeVisible();
  await page.getByLabel('Enter your name to browse').fill('Robin');
  await page.getByRole('button', { name: 'Browse Products' }).click();
  await expect(page.getByRole('heading', { name: 'From the honesty box' })).toBeVisible();
  await page.getByRole('button', { name: 'Add one Wild Forest Honey', exact: true }).click();
  await page.getByRole('button', { name: 'Add one Forest Botanical Tea', exact: true }).click();
  await page.getByRole('button', { name: 'View Basket' }).click();
  await expect(page.getByRole('heading', { name: 'Back-order requests' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm & Take' }).click();
  await expect(page.getByRole('heading', { name: 'Thank you, Robin.' })).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Admin', exact: true }).click();
  await page.getByLabel('Admin PIN', { exact: true }).fill('test-pin');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Stock for Wild Forest Honey')).toHaveValue('23');
  const row = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Wild Forest Honey', exact: true }) });
  await row.getByLabel('Stock for Wild Forest Honey').fill('10');
  await row.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(row.getByText('250g jar · 10 in stock')).toBeVisible();
  await page.getByRole('button', { name: 'Add new product' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Garden herbs');
  await page.getByLabel('Starting stock').fill('4');
  await page.getByRole('button', { name: 'Add product', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Garden herbs' })).toBeVisible();
  await page.getByRole('button', { name: 'Orders', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Customer orders' }).getByText('Robin', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/checkin-mobile.png', fullPage: true });
  await page.getByLabel('Enter your name to browse').fill('Alex');
  await page.getByRole('button', { name: 'Browse Products' }).click();
  await expect(page.getByRole('heading', { name: 'Garden herbs' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/catalog-mobile.png', fullPage: true });
});
