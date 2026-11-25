import { test, expect } from '@playwright/test';

test.describe('Módulo de Clientes, Veículos e Identificação por Telefone / CPF', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Deve navegar para Clientes e pesquisar por Telefone', async ({ page }) => {
    // 1. Clicar na aba Clientes
    await page.getByRole('button', { name: /^Clientes/i }).click();

    // 2. Buscar por dígitos de telefone existente (Henrique Rosa: 21993793746)
    const searchInput = page.getByPlaceholder(/Buscar por nome, telefone, CPF ou placa/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('99379');

    // 3. Verificar que o cliente correspondente aparece na lista
    await expect(page.getByRole('heading', { name: 'Henrique Rosa' })).toBeVisible();
  });

  test('Deve pesquisar cliente por CPF e exibir dados e prontuário de veículos', async ({ page }) => {
    // 1. Ir para a aba Clientes
    await page.getByRole('button', { name: /^Clientes/i }).click();

    // 2. Buscar por dígitos de CPF (Roberto Andrade Souza: 123.456.789-00)
    const searchInput = page.getByPlaceholder(/Buscar por nome, telefone, CPF ou placa/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('123456');

    // 3. Clicar no cliente localizado para abrir o prontuário no painel direito
    await page.getByRole('heading', { name: 'Roberto Andrade Souza', level: 4 }).click();

    // 4. Conferir exibição do cliente e prontuário de veículos vinculados
    await expect(page.getByText(/Veículos Vinculados/i)).toBeVisible();
    await expect(page.getByText(/Prontuário Automotivo/i)).toBeVisible();
  });

  test('Deve identificar duplicidade ao digitar telefone ou CPF de cliente já existente no cadastro', async ({ page }) => {
    // 1. Ir para a aba Clientes
    await page.getByRole('button', { name: /^Clientes/i }).click();

    // 2. Clicar no botão Cadastrar Cliente & Carro
    const novoClienteBtn = page.getByRole('button', { name: /Cadastrar Cliente & Carro/i });
    await expect(novoClienteBtn).toBeVisible();
    await novoClienteBtn.click();
    await expect(page.getByRole('heading', { name: /Cadastrar Novo Cliente/i })).toBeVisible();

    // 3. Digitar um telefone já existente na base (Henrique Rosa: 21993793746)
    const phoneInput = page.getByPlaceholder('(11) 98765-4321');
    await phoneInput.fill('21993793746');

    // 4. Deve exibir imediatamente o alerta visual de cliente já cadastrado
    await expect(page.getByText('Cliente Já Cadastrado Localizado!')).toBeVisible();
    await expect(page.locator('form').getByText('Henrique Rosa')).toBeVisible();

    // 5. Fechar modal clicando no X
    await page.getByRole('button', { name: '✕' }).click();
  });

  test('Deve permitir alternar perfil de uso do veículo (Severo / App vs Normal)', async ({ page }) => {
    // 1. Ir para a aba Clientes
    await page.getByRole('button', { name: /^Clientes/i }).click();

    // 2. Encontrar botão de editar veículo no card
    const editVehicleBtn = page.locator('button[title*="Editar dados e perfil de uso"]').first();
    await expect(editVehicleBtn).toBeVisible();
    await editVehicleBtn.click();
    await expect(page.getByRole('heading', { name: /Editar Veículo/i })).toBeVisible();

    // 3. Selecionar perfil de uso Severo / Aplicativo
    const profileSelect = page.locator('select').filter({ hasText: /Uso Severo|Normal/i }).first();
    await expect(profileSelect).toBeVisible();
    await profileSelect.selectOption('app_severo');

    // 4. Salvar alterações
    await page.getByRole('button', { name: /Salvar Veículo & Perfil/i }).click();

    // 5. O modal fecha
    await expect(page.getByRole('heading', { name: /Editar Veículo/i })).not.toBeVisible();
  });

  test('Deve identificar cliente pelo telefone digitado no campo de cliente da Nova O.S. e puxar o último veículo', async ({ page }) => {
    // 1. Abrir Nova O.S.
    const newOrderBtn = page.getByRole('button', { name: /Nova O\.S\./i });
    await expect(newOrderBtn).toBeVisible();
    await newOrderBtn.click();

    // 2. Localizar o campo único de cliente com combobox
    const clientInput = page.getByPlaceholder(/Buscar por telefone, CPF ou nome/i);
    await expect(clientInput).toBeVisible();

    // 3. Abrir lista suspensa clicando no botão da seta para conferir que todos os clientes existentes aparecem
    const dropdownBtn = page.getByTitle(/Ver lista de clientes cadastrados/i);
    await expect(dropdownBtn).toBeVisible();
    await dropdownBtn.click();

    // Verificar que múltiplos clientes cadastrados aparecem na lista suspensa (não só Roberto)
    await expect(page.locator('div').filter({ hasText: 'Dra. Patrícia Helena Mendes' }).first()).toBeVisible();
    await expect(page.locator('div').filter({ hasText: 'TransExpress Transportes' }).first()).toBeVisible();
    await expect(page.locator('div').filter({ hasText: 'Henrique Rosa' }).first()).toBeVisible();

    // 4. Digitar telefone de Henrique Rosa (ex: 219937)
    await clientInput.fill('219937');

    // 5. Clicar na opção correspondente nas sugestões suspensas
    const suggestionItem = page.locator('div').filter({ hasText: 'Henrique Rosa' }).filter({ hasText: '99379-3746' }).first();
    await expect(suggestionItem).toBeVisible();
    await suggestionItem.click();

    // 6. O campo onde foi digitado o telefone deve agora conter o nome completo do cliente
    await expect(clientInput).toHaveValue('Henrique Rosa');

    // 7. O campo de veículo ao lado deve automaticamente receber e selecionar o último veículo que deu entrada (Onix 1.0 Manual / RKL2D99)
    const vehicleSelect = page.locator('select').filter({ hasText: /Onix 1\.0 Manual/i }).first();
    await expect(vehicleSelect).toBeVisible();
    await expect(vehicleSelect).toHaveValue('veh-4');

    // 8. Não deve haver cartões amarelos ou elementos empilhados poluindo o layout
    await expect(page.locator('text=Cliente já cadastrado na oficina')).not.toBeVisible();

    // 9. Fechar o modal
    await page.getByRole('button', { name: /Cancelar/i }).first().click();
  });
});

