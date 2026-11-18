import { ParsedXMLInvoice, ParsedXMLItem } from '../types';

export const XMLParserService = {
  parseNFeXML(xmlContent: string, defaultMarkupPercent = 60): ParsedXMLInvoice {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    // Checagem de erro de parsing
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Arquivo XML inválido ou corrompido.');
    }

    // Número da NF-e
    const nNF = xmlDoc.querySelector('ide > nNF')?.textContent || 'S/N';
    const dhEmi = xmlDoc.querySelector('ide > dhEmi')?.textContent || new Date().toISOString();

    // Dados do Fornecedor / Distribuidora
    const supplierName =
      xmlDoc.querySelector('emit > xNome')?.textContent ||
      xmlDoc.querySelector('emit > xFant')?.textContent ||
      'Distribuidora de Autopeças';
    const supplierCnpj = xmlDoc.querySelector('emit > CNPJ')?.textContent || '';

    // Total da NF
    const totalNF = parseFloat(xmlDoc.querySelector('total > ICMSTot > vNF')?.textContent || '0');

    // Itens (Produtos)
    const detElements = xmlDoc.querySelectorAll('det');
    const items: ParsedXMLItem[] = [];

    detElements.forEach((det) => {
      const prod = det.querySelector('prod');
      if (!prod) return;

      const code = prod.querySelector('cProd')?.textContent?.trim() || 'SEM-COD';
      const description = prod.querySelector('xProd')?.textContent?.trim() || 'Produto sem descrição';
      const ncm = prod.querySelector('NCM')?.textContent?.trim() || '';
      const quantity = parseFloat(prod.querySelector('qCom')?.textContent || '1');
      const unitCost = parseFloat(prod.querySelector('vUnCom')?.textContent || '0');
      const totalCost = parseFloat(prod.querySelector('vProd')?.textContent || '0');

      // Preço de venda sugerido com markup
      const markupMultiplier = 1 + defaultMarkupPercent / 100;
      const suggestedSellPrice = Math.round(unitCost * markupMultiplier * 100) / 100;

      items.push({
        code,
        description,
        ncm,
        quantity,
        unitCost,
        suggestedSellPrice,
        totalCost: totalCost || quantity * unitCost,
      });
    });

    return {
      nfeNumber: nNF,
      supplierName,
      supplierCnpj,
      issueDate: dhEmi,
      items,
      totalValue: totalNF || items.reduce((acc, it) => acc + it.totalCost, 0),
    };
  },

  // Gera um XML de demonstração de distribuidora de autopeças para testar
  getSampleInvoiceXML(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35261100000000000199550010000458921000458925" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <nNF>45892</nNF>
        <dhEmi>2026-11-16T10:30:00-03:00</dhEmi>
        <tpNF>1</tpNF>
      </ide>
      <emit>
        <CNPJ>12345678000199</CNPJ>
        <xNome>DPASCHOAL DISTRIBUIDORA DE AUTO PECAS S/A</xNome>
        <xFant>DPASCHOAL DISTRIBUIDORA</xFant>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>AMORT-GP32982</cProd>
          <xProd>AMORTECEDOR DIANTEIRO PRESSURIZADO TURBOGAS COFAP</xProd>
          <NCM>87088000</NCM>
          <qCom>2.0000</qCom>
          <vUnCom>198.5000</vUnCom>
          <vProd>397.00</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>KIT-BAT-SB0142</cProd>
          <xProd>KIT BATENTE COIFA COXIM AMORTECEDOR DIANTEIRO SAMPEL</xProd>
          <NCM>87088000</NCM>
          <qCom>2.0000</qCom>
          <vUnCom>65.0000</vUnCom>
          <vProd>130.00</vProd>
        </prod>
      </det>
      <det nItem="3">
        <prod>
          <cProd>DISC-FREIO-BD4512</cProd>
          <xProd>PAR DISCO DE FREIO VENTILADO DIANTEIRO FREMAX</xProd>
          <NCM>87083090</NCM>
          <qCom>1.0000</qCom>
          <vUnCom>162.0000</vUnCom>
          <vProd>162.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vNF>689.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;
  },
};
