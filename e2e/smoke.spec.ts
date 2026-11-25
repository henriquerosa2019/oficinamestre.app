import { test, expect } from '@playwright/test';

test('carrega o app Oficina do Rico e verifica título e elementos do cabeçalho', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Oficina/i);
  await expect(page.getByText('Oficina do Rico')).toBeVisible();
  await expect(page.getByRole('button', { name: /Nova O\.S\./i })).toBeVisible();
});
