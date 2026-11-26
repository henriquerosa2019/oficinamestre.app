import { test, expect } from '@playwright/test';

test.describe('Ciclo de Vida de Ordens de Serviço (O.S.) e Recibo Finalizado', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Deve abrir Nova O.S., preencher diagnóstico, checklist, danos e navegar abas', async ({ page }) => {
    // 1. Clicar no botão Nova O.S. no cabeçalho
    const newOrderBtn = page.getByRole('button', { name: /Nova O\.S\./i });
    await expect(newOrderBtn).toBeVisible();
    await newOrderBtn.click();

    // 2. Verificar que o modal abriu na Aba 1: Diagnóstico & Entrada
    await expect(page.getByText('1. Diagnóstico & Entrada')).toBeVisible();
    await expect(page.getByText('Cliente', { exact: true })).toBeVisible();

    // 3. Preencher queixa e diagnóstico técnico
    const complaintInput = page.getByPlaceholder(/Barulho na roda direita/i);
    await expect(complaintInput).toBeVisible();
    await complaintInput.fill('Barulho metálico na roda dianteira esquerda ao frear');

    const diagInput = page.getByPlaceholder(/Pastilhas no ferro/i);
    await expect(diagInput).toBeVisible();
    await diagInput.fill('Pastilhas gastas no ferro, necessário substituir disco e pastilhas.');

    // 4. Interagir com o CarDamageCanvas (clicar no carro para adicionar marcação de avaria)
    const canvas = page.locator('canvas').first();
    if (await canvas.isVisible()) {
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.4);
      }
    }

    // 5. Avançar para Aba 2: Serviços & Peças
    const tab2Btn = page.getByRole('button', { name: /2\. Serviços & Peças/i });
    await tab2Btn.click();
    await expect(page.getByRole('heading', { name: /Mão de Obra & Serviços/i })).toBeVisible();

    // 6. Avançar para Aba 3: Proposta & Orçamento
    const tab3Btn = page.getByRole('button', { name: /3\. Proposta|3\. Fechamento/i });
    await tab3Btn.click();
    await expect(page.getByRole('button', { name: /Aprovar Orçamento/i })).toBeVisible();

    // 7. Fechar modal
    const closeBtn = page.getByRole('button', { name: /Cancelar/i }).first();
    await closeBtn.click();
  });

  test('Deve finalizar O.S. com pagamento rápido em 1 toque e abrir Recibo Finalizado completo', async ({ page }) => {
    // 1. Ir para a aba O.S. (Kanban)
    await page.getByRole('button', { name: /^O\.S\./i }).click();

    // 2. Localizar o botão "Receber" na O.S. pronta (OS-1002)
    const receiveBtn = page.getByRole('button', { name: /Receber/i }).first();
    await expect(receiveBtn).toBeVisible();
    await receiveBtn.click();

    // 3. O modal de Checkout Rápido abre com o título "Finalizar O.S."
    await expect(page.getByRole('heading', { name: 'Finalizar O.S.' })).toBeVisible();
    await expect(page.getByText(/1 toque para liquidar/i)).toBeVisible();

    // 4. Clicar na opção "Pix" para liquidar e finalizar em 1 toque
    const pixBtn = page.getByRole('button', { name: /Pix/i }).first();
    await expect(pixBtn).toBeVisible();
    await pixBtn.click();

    // 5. O modal de checkout fecha e a OS agora está na coluna 6. Entregue / Faturado
    await expect(page.getByText(/6\. Entregue \/ Faturado/i)).toBeVisible();

    // 6. Clicar no título do veículo da O.S. finalizada (OS-1002) para abrir o prontuário
    await page.getByRole('heading', { name: 'Toyota Corolla XEi 2.0' }).click();

    // 7. Validar o banner do Prontuário & Recibo Documental Concluído
    await expect(page.getByText('Prontuário & Recibo Documental Concluído')).toBeVisible();

    // 8. Verificar cabeçalho de Garantia Ativa e Previsão de Retorno
    await expect(page.getByText(/Garantia Ativa até/i)).toBeVisible();
    await expect(page.getByText(/Previsão de Retorno:/i)).toBeVisible();

    // 9. Verificar elementos do Recibo Oficial (Documento A4)
    await expect(page.getByRole('heading', { name: 'OFICINA DO RICO' })).toBeVisible();
    await expect(page.getByText(/Data Entrada:/i).first()).toBeVisible();
    await expect(page.getByText(/Venc\. Garantia:/i).first()).toBeVisible();
    await expect(page.getByText(/Previsão Retorno:/i).first()).toBeVisible();
    await expect(page.getByText(/PAGO \(PIX\)/i).first()).toBeVisible();

    // 10. Garantir categoricamente que NÃO existe botão Editar OS
    await expect(page.getByRole('button', { name: /Editar O\.S\./i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /^Editar OS$/i })).not.toBeVisible();

    // 11. Garantir que botões de ação do documento estão disponíveis no rodapé do modal
    await expect(page.getByTitle('Imprimir Recibo Oficial da O.S.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Baixar PNG/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Copiar Texto/i })).toBeVisible();

    // 12. Fechar o modal da O.S. finalizada
    await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  });

  test('Deve validar coerência de dados de OS-1001, transparência de desconto, catálogo e ação do mecânico', async ({ page }) => {
    // 1. Ir para a aba O.S. (Kanban)
    await page.getByRole('button', { name: /^O\.S\./i }).click();

    // 2. Abrir a OS-1001 (Volkswagen Gol 1.6 MSI Flex)
    await page.getByText('OS-1001').first().click();

    // 3. Na Aba 2 (aberta por padrão na edição): Validar a barra de resumo com subtotal bruto e desconto detalhado
    await expect(page.getByText('Subtotal Bruto', { exact: true })).toBeVisible();
    await expect(page.getByText('R$ 593,00').first()).toBeVisible();
    await expect(page.getByText(/Desconto Aplicado:/i)).toBeVisible();
    await expect(page.getByText('- R$ 23,00')).toBeVisible();
    await expect(page.getByText('R$ 570,00').first()).toBeVisible();

    // 4. Validar a Ação Direta do Mecânico no Pátio
    await expect(page.getByRole('button', { name: /Concluir Serviço \(Marcar Pronto\)/i })).toBeVisible();

    // 5. Validar o Catálogo de Serviços Pré-Cadastrados e Combos Rápidos
    await expect(page.getByText(/Combos Rápidos & Serviços Pré-Cadastrados/i)).toBeVisible();

    // 6. Validar Saldo de Estoque e Alerta na Linha de Peças
    await expect(page.getByText(/disponíveis/i).first()).toBeVisible();

    // 7. Navegar para a Aba 1 e validar botão de preenchimento rápido de conformidade de acessórios
    await page.getByRole('button', { name: /1\. Diagnóstico & Entrada/i }).click();
    await expect(page.getByRole('button', { name: /Marcar Acessórios Conformes/i })).toBeVisible();

    // 8. Fechar modal da O.S.
    await page.getByRole('button', { name: /Cancelar/i }).first().click();
  });
});
