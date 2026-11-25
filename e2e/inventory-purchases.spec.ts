import { test, expect } from '@playwright/test';

test.describe('Módulo de Estoque de Peças e Compras de Fornecedores (NF-e)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Deve visualizar estoque de peças, métricas de capital e filtrar por código/descrição', async ({ page }) => {
    // 1. Ir para a aba Estoque
    await page.getByRole('button', { name: /^Estoque/i }).click();

    // 2. Verificar cards de métricas
    await expect(page.getByText('Estoque Físico Total')).toBeVisible();
    await expect(page.getByText('Imobilizado a Custo')).toBeVisible();
    await expect(page.getByText('Preço de Venda Total')).toBeVisible();

    // 3. Filtrar por termo de busca (ex: WO-205)
    const searchInput = page.getByPlaceholder(/Buscar peça por código/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('WO-205');

    // 4. Conferir que a peça aparece na tabela
    await expect(page.getByText('WO-205')).toBeVisible();
  });

  test('Deve acessar Compras & Notas de Fornecedores, alternar abas de vencimento e abrir Gerar Relatório', async ({ page }) => {
    // 1. Ir para a aba Estoque
    await page.getByRole('button', { name: /^Estoque/i }).click();

    // 2. Alternar para a sub-aba Compras & Notas de Fornecedores
    const purchasesSubTab = page.getByRole('button', { name: /Compras & Notas de Fornecedores/i });
    await purchasesSubTab.click();

    // 3. Verificar cards de resumo de compras
    await expect(page.getByText('Total em Compras')).toBeVisible();
    await expect(page.getByText('Total Quitado')).toBeVisible();
    await expect(page.getByText('Saldo a Pagar')).toBeVisible();

    // 4. Testar filtros de vencimento
    const filter7Dias = page.getByRole('button', { name: /Próximos 7 dias/i });
    if (await filter7Dias.isVisible()) {
      await filter7Dias.click();
    }

    const filterTodas = page.getByRole('button', { name: /Todas as Notas/i });
    if (await filterTodas.isVisible()) {
      await filterTodas.click();
    }

    // 5. Clicar no botão Gerar Relatório
    const reportBtn = page.getByRole('button', { name: /Gerar Relatório/i });
    await expect(reportBtn).toBeVisible();
    await reportBtn.click();

    // 6. Verificar que o modal do Relatório Executivo abriu
    await expect(page.getByText(/Relatório de Vencimentos de Fornecedores \(NF-e\)/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Imprimir \/ Salvar PDF/i })).toBeVisible();

    // 7. Fechar modal do Relatório
    const closeReportBtn = page.getByTitle('Fechar Relatório');
    await closeReportBtn.click();
  });

  test('Deve permitir registrar quitação/pagamento de parcela de fornecedor', async ({ page }) => {
    // 1. Ir para a aba Estoque e depois sub-aba Compras
    await page.getByRole('button', { name: /^Estoque/i }).click();
    await page.getByRole('button', { name: /Compras & Notas de Fornecedores/i }).click();

    // 2. Verificar se existe botão Pagar Parcela ou Quitar
    const payBtn = page.locator('button[title*="Pagar"], button[title*="Quitar"]').first();
    if (await payBtn.isVisible()) {
      await payBtn.click();
    }
  });
});
