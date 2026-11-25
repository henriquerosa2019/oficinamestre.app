import { test, expect } from '@playwright/test';

test.describe('Módulo de Estoque de Peças e Compras de Fornecedores (NF-e)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
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

  test('Deve cadastrar nova peça informando fornecedor, telefone, endereço e forma de pagamento 30/60d', async ({ page }) => {
    // 1. Ir para a aba Estoque
    await page.getByRole('button', { name: /^Estoque/i }).click();

    // 2. Clicar no botão Nova Peça
    const newPartBtn = page.getByRole('button', { name: /Nova Peça/i });
    await expect(newPartBtn).toBeVisible();
    await newPartBtn.click();

    // 3. Preencher dados da peça
    await page.getByPlaceholder(/Pastilha de Freio Dianteira/i).fill('Filtro de Combustível Injeção');
    await page.getByPlaceholder(/FCI-1200/i).fill('FCI-1200');
    await page.getByPlaceholder(/Cobreq, Fram/i).fill('Fram');

    // Preencher campos de fornecedor
    const supplierInput = page.getByPlaceholder(/DPaschoal, Caninana Autopeças/i);
    await expect(supplierInput).toBeVisible();
    await supplierInput.fill('Pellegrino Distribuidora');

    const phoneInput = page.getByPlaceholder('(11) 98765-4321');
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill('(21) 98765-4321');

    const addressInput = page.getByPlaceholder(/Rua, Número, Bairro/i);
    await expect(addressInput).toBeVisible();
    await addressInput.fill('Av. Brasil, 4500 - Rio de Janeiro - RJ');

    // Selecionar forma de pagamento 30/60d
    const term3060Btn = page.getByRole('button', { name: /30\/60d/i });
    await expect(term3060Btn).toBeVisible();
    await term3060Btn.click();

    // 4. Salvar a peça
    await page.getByRole('button', { name: /Salvar/i }).click();

    // 5. Verificar que a peça foi cadastrada e exibe o código, fornecedor e o selo 30/60d na tabela
    await expect(page.locator('table').getByText('FCI-1200')).toBeVisible();
    await expect(page.locator('table').getByText(/Pellegrino Distribuidora/i)).toBeVisible();
    await expect(page.locator('table').getByText('30/60d')).toBeVisible();
  });

  test('Deve importar estoque de autopeças via XML (NF-e) com markup e registrar compra', async ({ page }) => {
    // 1. Ir para a aba Estoque
    await page.getByRole('button', { name: /^Estoque/i }).click();

    // 2. Clicar em Importar XML (NF-e)
    const xmlBtn = page.getByRole('button', { name: /Importar XML \(NF-e\)/i });
    await expect(xmlBtn).toBeVisible();
    await xmlBtn.click();

    // 3. Carregar XML de exemplo
    const sampleXmlBtn = page.getByRole('button', { name: /Carregar XML de Exemplo/i });
    await expect(sampleXmlBtn).toBeVisible();
    await sampleXmlBtn.click();

    // 4. Conferir pré-visualização dos itens parseados
    await expect(page.getByText('AMORTECEDOR DIANTEIRO PRESSURIZADO')).toBeVisible();
    await expect(page.getByText('DPASCHOAL DISTRIBUIDORA')).toBeVisible();

    // 5. Confirmar e alimentar estoque
    const confirmBtn = page.getByRole('button', { name: /Confirmar e Alimentar Estoque/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 6. Verificar que a peça importada aparece no catálogo
    await expect(page.getByText('AMORT-GP32982')).toBeVisible();
  });

  test('Deve importar catálogo de peças via Planilha Excel (.xlsx)', async ({ page }) => {
    // 1. Ir para a aba Estoque
    await page.getByRole('button', { name: /^Estoque/i }).click();

    // 2. Clicar em Importar Excel (.xlsx)
    const excelBtn = page.getByRole('button', { name: /Importar Excel/i });
    await expect(excelBtn).toBeVisible();
    await excelBtn.click();

    // 3. Carregar planilha de demonstração
    const sampleExcelBtn = page.getByRole('button', { name: /Carregar Planilha de Demonstração/i });
    await expect(sampleExcelBtn).toBeVisible();
    await sampleExcelBtn.click();

    // 4. Conferir pré-visualização dos itens
    await expect(page.getByText('Kit de Embreagem Plato e Disco LUK')).toBeVisible();

    // 5. Confirmar importação e gravar no estoque
    const confirmBtn = page.getByRole('button', { name: /Confirmar e Gravar no Estoque/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 6. Verificar que a peça da planilha aparece no catálogo
    await expect(page.getByText('KIT-EMBR-620310000')).toBeVisible();
  });
});
