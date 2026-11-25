import * as XLSX from 'xlsx';
import { Part, SupplierPaymentTerm } from '../types';

export interface ParsedExcelRow {
  code: string;
  description: string;
  brand: string;
  category: string;
  costPrice: number;
  sellPrice: number;
  currentStock: number;
  minStock: number;
  unit: string;
  supplierName?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  supplierPaymentTerms?: SupplierPaymentTerm;
}

export const ExcelParserService = {
  // Faz o parse do arquivo Excel (.xlsx, .xls, .csv)
  parseExcelFile(data: ArrayBuffer): ParsedExcelRow[] {
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('A planilha selecionada não contém nenhuma aba com dados.');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (rawRows.length === 0) {
      throw new Error('A planilha está vazia.');
    }

    const normalizedRows: ParsedExcelRow[] = [];

    rawRows.forEach((row) => {
      // Normaliza chaves da planilha para minúsculo e sem acentos
      const normalizedKeys: Record<string, any> = {};
      Object.keys(row).forEach((key) => {
        const cleanKey = key
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();
        normalizedKeys[cleanKey] = row[key];
      });

      // Detecção inteligente de colunas comuns
      const code =
        normalizedKeys['codigo'] ||
        normalizedKeys['cod'] ||
        normalizedKeys['sku'] ||
        normalizedKeys['referencia'] ||
        'SEM-COD';

      const description =
        normalizedKeys['descricao'] ||
        normalizedKeys['produto'] ||
        normalizedKeys['nome'] ||
        normalizedKeys['item'] ||
        'Peça sem descrição';

      const brand =
        normalizedKeys['marca'] ||
        normalizedKeys['fabricante'] ||
        'Genérica';

      const category =
        normalizedKeys['categoria'] ||
        normalizedKeys['grupo'] ||
        'Geral';

      const parseNumber = (val: any, fallback = 0): number => {
        if (typeof val === 'number') return val;
        if (!val) return fallback;
        const cleaned = String(val).replace('R$', '').replace(/\s/g, '').replace(',', '.');
        const n = parseFloat(cleaned);
        return isNaN(n) ? fallback : n;
      };

      const costPrice = parseNumber(
        normalizedKeys['custo'] ||
        normalizedKeys['preco custo'] ||
        normalizedKeys['preco de custo'] ||
        normalizedKeys['valor custo']
      );

      let sellPrice = parseNumber(
        normalizedKeys['venda'] ||
        normalizedKeys['preco venda'] ||
        normalizedKeys['preco de venda'] ||
        normalizedKeys['valor venda']
      );

      // Se não informou preço de venda, aplica markup de 60%
      if (sellPrice <= 0 && costPrice > 0) {
        sellPrice = Math.round(costPrice * 1.6 * 100) / 100;
      }

      const currentStock = Math.round(
        parseNumber(
          normalizedKeys['estoque'] ||
          normalizedKeys['qtd'] ||
          normalizedKeys['quantidade'] ||
          normalizedKeys['saldo'],
          1
        )
      );

      const minStock = Math.round(
        parseNumber(
          normalizedKeys['minimo'] ||
          normalizedKeys['estoque minimo'] ||
          normalizedKeys['min'],
          2
        )
      );

      const unit =
        normalizedKeys['un'] ||
        normalizedKeys['unidade'] ||
        'UN';

      const supplierName =
        normalizedKeys['fornecedor'] ||
        normalizedKeys['distribuidora'] ||
        normalizedKeys['fornecedor nome'] ||
        '';

      const supplierPhone =
        normalizedKeys['telefone'] ||
        normalizedKeys['tel'] ||
        normalizedKeys['whatsapp'] ||
        '';

      const supplierAddress =
        normalizedKeys['endereco'] ||
        normalizedKeys['endereco fornecedor'] ||
        '';

      const paymentTermsRaw = String(
        normalizedKeys['pagamento'] ||
        normalizedKeys['forma de pagamento'] ||
        normalizedKeys['condicao'] ||
        normalizedKeys['prazo'] ||
        ''
      ).toLowerCase().trim();

      let supplierPaymentTerms: SupplierPaymentTerm | undefined = undefined;
      if (paymentTermsRaw.includes('90')) supplierPaymentTerms = '30_60_90d';
      else if (paymentTermsRaw.includes('60')) supplierPaymentTerms = '30_60d';
      else if (paymentTermsRaw.includes('30')) supplierPaymentTerms = '30d';
      else if (paymentTermsRaw.includes('vista') || paymentTermsRaw.includes('avista')) supplierPaymentTerms = 'a_vista';

      if (description !== 'Peça sem descrição' || code !== 'SEM-COD') {
        normalizedRows.push({
          code: String(code).trim(),
          description: String(description).trim(),
          brand: String(brand).trim(),
          category: String(category).trim(),
          costPrice,
          sellPrice,
          currentStock,
          minStock,
          unit: String(unit).trim(),
          supplierName: supplierName ? String(supplierName).trim() : undefined,
          supplierPhone: supplierPhone ? String(supplierPhone).trim() : undefined,
          supplierAddress: supplierAddress ? String(supplierAddress).trim() : undefined,
          supplierPaymentTerms,
        });
      }
    });

    return normalizedRows;
  },

  // Converte linhas parseadas em entidades do tipo Part
  convertToParts(rows: ParsedExcelRow[]): Part[] {
    return rows.map((r) => ({
      id: 'part-' + Math.random().toString(36).substring(2, 9),
      sku: r.code,
      code: r.code,
      description: r.description,
      brand: r.brand,
      category: r.category,
      costPrice: r.costPrice,
      sellPrice: r.sellPrice,
      currentStock: r.currentStock,
      minStock: r.minStock,
      unit: r.unit,
      location: 'Estoque Central',
      supplierName: r.supplierName,
      supplierPhone: r.supplierPhone,
      supplierAddress: r.supplierAddress,
      supplierPaymentTerms: r.supplierPaymentTerms,
    }));
  },

  // Gera e faz o download de um arquivo modelo .xlsx para a oficina preencher
  downloadTemplateExcel(): void {
    const templateData = [
      {
        'Código': 'VEL-BKR6E',
        'Descrição': 'Vela de Ignição Green Plug',
        'Marca': 'NGK',
        'Categoria': 'Ignição',
        'Custo': 12.50,
        'Venda': 28.00,
        'Estoque': 16,
        'Estoque Mínimo': 4,
        'Unidade': 'UN',
      },
      {
        'Código': 'FILT-AR-FAP2219',
        'Descrição': 'Filtro de Ar do Motor Fox/Gol 1.0',
        'Marca': 'Wega',
        'Categoria': 'Filtros',
        'Custo': 18.00,
        'Venda': 39.90,
        'Estoque': 8,
        'Estoque Mínimo': 3,
        'Unidade': 'UN',
      },
      {
        'Código': 'ADIT-RAD-PARAFLU',
        'Descrição': 'Aditivo para Radiador Concentrado Rosa 1L',
        'Marca': 'Paraflu',
        'Categoria': 'Arrefecimento',
        'Custo': 24.00,
        'Venda': 48.00,
        'Estoque': 20,
        'Estoque Mínimo': 5,
        'Unidade': 'L',
      },
      {
        'Código': 'BOMBA-DAGUA-VKPC884',
        'Descrição': 'Bomba d’Água Motor Fire 1.0/1.4',
        'Marca': 'SKF',
        'Categoria': 'Motor',
        'Custo': 110.00,
        'Venda': 195.00,
        'Estoque': 3,
        'Estoque Mínimo': 2,
        'Unidade': 'UN',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Peças Oficina');

    XLSX.writeFile(workbook, 'modelo-cadastro-pecas-oficinamestre.xlsx');
  },

  // Dados de teste para carregar na tela sem precisar de arquivo
  getSampleExcelRows(): ParsedExcelRow[] {
    return [
      {
        code: 'AMORT-COFAP-GP32982',
        description: 'Amortecedor Dianteiro Turbogás Gol G5/G6',
        brand: 'Cofap',
        category: 'Suspensão',
        costPrice: 198.50,
        sellPrice: 320.00,
        currentStock: 4,
        minStock: 2,
        unit: 'UN',
        supplierName: 'Pellegrino Distribuidora',
        supplierPhone: '(11) 98765-4321',
        supplierAddress: 'Av. das Nações Unidas, 1200 - SP',
        supplierPaymentTerms: '30_60d',
      },
      {
        code: 'KIT-EMBR-620310000',
        description: 'Kit de Embreagem Plato e Disco LUK',
        brand: 'LUK',
        category: 'Transmissão',
        costPrice: 380.00,
        sellPrice: 590.00,
        currentStock: 2,
        minStock: 1,
        unit: 'Kit',
        supplierName: 'DPaschoal Autopeças',
        supplierPhone: '(21) 99888-7777',
        supplierPaymentTerms: '30_60_90d',
      },
      {
        code: 'DISCO-FREIO-HF25A',
        description: 'Disco de Freio Ventilado Hipper Freios',
        brand: 'Hipper Freios',
        category: 'Freios',
        costPrice: 85.00,
        sellPrice: 155.00,
        currentStock: 6,
        minStock: 2,
        unit: 'Par',
        supplierName: 'Pellegrino Distribuidora',
        supplierPhone: '(11) 98765-4321',
        supplierPaymentTerms: '30d',
      },
      {
        code: 'CABO-VELA-SC-G73',
        description: 'Jogo Cabos de Vela Resistivos',
        brand: 'NGK',
        category: 'Ignição',
        costPrice: 65.00,
        sellPrice: 120.00,
        currentStock: 5,
        minStock: 2,
        unit: 'Jogo',
        supplierName: 'DPaschoal Autopeças',
        supplierPhone: '(21) 99888-7777',
        supplierPaymentTerms: 'a_vista',
      },
    ];
  },
};
