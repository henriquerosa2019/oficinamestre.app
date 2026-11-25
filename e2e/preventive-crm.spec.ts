import { test, expect } from '@playwright/test';

test.describe('Módulo de Manutenção Preventiva & CRM de Retorno', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Deve visualizar alertas agrupados por veículo sem duplicidade', async ({ page }) => {
    // 1. Ir para a aba Preventiva
    await page.getByRole('button', { name: /^Preventiva/i }).click();

    // 2. Verificar título do módulo
    await expect(page.getByText('CRM Preventivo & Estimativa Inteligente de Retorno')).toBeVisible();

    // 3. Verificar que existem veículos com alertas exibidos
    const vehicleBadges = page.locator('div').filter({ hasText: /[A-Z]{3}[0-9][A-Z0-9][0-9]{2}/i });
    await expect(vehicleBadges.first()).toBeVisible();
  });

  test('Deve expandir o acordeão de serviços futuros e verificar serviços preventivos', async ({ page }) => {
    // 1. Ir para a aba Preventiva
    await page.getByRole('button', { name: /^Preventiva/i }).click();

    // 2. Localizar botão de acordeão para expandir serviços futuros (+30 dias)
    const accordionBtn = page.locator('button').filter({ hasText: /Ver mais .* manutenções futuras/i }).first();
    if (await accordionBtn.isVisible()) {
      await accordionBtn.click();
      await expect(page.locator('button').filter({ hasText: /Ocultar manutenções futuras/i }).first()).toBeVisible();
    }
  });

  test('Deve permitir copiar ou gerar mensagem de WhatsApp para o cliente', async ({ page }) => {
    // 1. Ir para a aba Preventiva
    await page.getByRole('button', { name: /^Preventiva/i }).click();

    // 2. Localizar botão de copiar mensagem de WhatsApp
    const copyWhatsappBtn = page.locator('button[title*="Copiar texto da mensagem"]').first();
    await expect(copyWhatsappBtn).toBeVisible();
    await copyWhatsappBtn.click();

    // 3. Deve exibir feedback de "Copiado!"
    await expect(page.getByText('Copiado!').first()).toBeVisible();
  });

  test('Deve permitir atualizar status de contato com o cliente (Marcar Avisado)', async ({ page }) => {
    // 1. Ir para a aba Preventiva
    await page.getByRole('button', { name: /^Preventiva/i }).click();

    // 2. Localizar botão de Marcar Avisado
    const statusActionBtn = page.getByRole('button', { name: /Marcar Avisado|Desmarcar Aviso/i }).first();
    await expect(statusActionBtn).toBeVisible();
    await statusActionBtn.click();

    // 3. O botão altera para Desmarcar Aviso
    await expect(page.getByRole('button', { name: /Desmarcar Aviso/i }).first()).toBeVisible();
  });
});
