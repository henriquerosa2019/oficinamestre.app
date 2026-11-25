import { test, expect } from '@playwright/test';

test.describe('Módulo Financeiro, Fluxo de Caixa e Comissões', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Deve visualizar cards de fluxo de caixa e comissões dos mecânicos', async ({ page }) => {
    // 1. Ir para a aba Financeiro
    await page.getByRole('button', { name: /^Financeiro/i }).click();

    // 2. Verificar cards principais unificados
    await expect(page.getByText('Entrou no Caixa', { exact: true })).toBeVisible();
    await expect(page.getByText('Contas a Pagar', { exact: true })).toBeVisible();
    await expect(page.getByText('Balanço do Mês', { exact: true })).toBeVisible();

    // 3. Verificar quadro de Comissões dos Mecânicos
    await expect(page.getByRole('heading', { name: /Comissões dos Mecânicos/i })).toBeVisible();

    // 4. Verificar tabela de Contas a Pagar e Receber
    await expect(page.getByRole('heading', { name: /Contas a Pagar e Receber/i })).toBeVisible();
  });

  test('Deve registrar uma despesa rápida via botão + Lançar Conta com preset e atalhos', async ({ page }) => {
    // 1. Ir para a aba Financeiro
    await page.getByRole('button', { name: /^Financeiro/i }).click();

    // 2. Abrir modal de Lançamento Rápido de Caixa
    await page.getByRole('button', { name: /\+ Lançar Conta/i }).click();
    await expect(page.getByText('Lançamento Rápido de Caixa')).toBeVisible();

    // 3. Selecionar preset Motoboy
    const motoboyPreset = page.getByRole('button', { name: /🛵 Motoboy/i });
    await expect(motoboyPreset).toBeVisible();
    await motoboyPreset.click();

    // 4. Clicar no atalho de valor +20
    await page.getByRole('button', { name: '+20' }).click();

    // 5. Confirmar a saída
    const confirmBtn = page.getByRole('button', { name: /Confirmar Saída/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 6. Verificar que modal fechou e a transação aparece na tabela
    await expect(page.getByText('Lançamento Rápido de Caixa')).not.toBeVisible();
    await expect(page.getByText('Taxa entrega Motoboy').first()).toBeVisible();
  });

  test('Deve alterar status de lançamento com 1 toque no selo Pendente/Pago', async ({ page }) => {
    // 1. Ir para a aba Financeiro
    await page.getByRole('button', { name: /^Financeiro/i }).click();

    // 2. Localizar um botão de status (Pendente ou Pago) na tabela
    const statusBtn = page.locator('button[title*="Toque para"]').or(page.locator('button[title*="1 TOQUE"]')).first();
    await expect(statusBtn).toBeVisible();

    // 3. Clicar no botão para alternar status
    await statusBtn.click();

    // 4. O botão deve continuar visível e interativo
    await expect(statusBtn).toBeVisible();
  });

  test('Deve filtrar transações por tipo (Receitas / Despesas)', async ({ page }) => {
    // 1. Ir para a aba Financeiro
    await page.getByRole('button', { name: /^Financeiro/i }).click();

    // 2. Selecionar filtro Despesas
    const filterSelect = page.locator('select').first();
    await filterSelect.selectOption('despesa');

    // 3. Selecionar filtro Receitas
    await filterSelect.selectOption('receita');

    // 4. Voltar para Todos
    await filterSelect.selectOption('todos');
  });
});
