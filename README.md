# 🚗 OficinaMestre - Sistema Inteligente de Gestão para Oficinas Mecânicas

> **MVP de Alta Performance inspirado nas melhores práticas do WorkMotor, focado em agilidade, produtividade e fidelização de clientes.**

![OficinaMestre Badge](https://img.shields.io/badge/Vers%C3%A3o-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-informational)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8)
![Vite](https://img.shields.io/badge/Vite-8.3-646cff)

---

## 📋 Visão Geral

O **OficinaMestre** é uma plataforma moderna e completa para oficinas mecânicas, autocenters, funilarias e centros automotivos. Desenvolvido para simplificar a rotina diária do mecânico e maximizar a rentabilidade do negócio sem burocracia ou taxas de APIs pagas.

---

## 🚀 Principais Funcionalidades

### 1. 🗂️ Gestão de Ordens de Serviço (Kanban Visual & Lista)
- Fluxo de trabalho ágil em 6 colunas:
  1. **Orçamento**
  2. **Aguardando Aprovação**
  3. **Aprovado**
  4. **Em Execução**
  5. **Pronto para Entrega**
  6. **Finalizado**
- Cálculo em tempo real de **peças, mão de obra, desconto, comissão de mecânicos e lucro líquido**.
- Baixa automática de estoque de peças ao aprovar a O.S.

### 2. 🔍 Inspeção Visual & Checklist de Avarias
- Canvas interativo com silhueta automotiva (vista superior, laterais, frente e traseira).
- Marcação precisa de avarias com categorização por cor e tipo:
  - 🔴 Arranhão
  - 🟠 Amassado
  - 🔵 Trinca / Quebra
  - 🟣 Outros
- Checklist de entrada: nível de combustível, estepe, macaco, chave de roda, manual, rádio/multimídia.

### 3. 📦 Gestão de Estoque & Entrada Rápida
- **Importação de NF-e via XML (Modelo 55)**: lê fornecedor, chave de acesso, produtos, NCM, quantitativo e valor de compra com aplicação de markup/margem automática e lançamento de conta a pagar no financeiro.
- **Importação via Planilha Excel / CSV (.xlsx, .xls, .csv)**:
  - Mapeamento inteligente de colunas (Código, Descrição, Fabricante, Custo, Venda, Estoque, Mínimo, Localização).
  - Download de modelo de planilha pronto para preenchimento.
  - Botão de carregamento com dados de exemplo de autopeças.
- Alerta visual de estoque crítico/mínimo.

### 4. ⏰ CRM & Manutenção Preventiva Inteligente
- **Memorização de Serviços Executados**: registra data, quilometragem e periodicidade de retorno de serviços como Troca de Óleo e Filtros, Correia Dentada, Pastilhas de Freio, etc.
- **Algoritmo Adaptativo para Motoristas de Aplicativo (Uber, 99, Táxi)**:
  - *Uso Normal (Passeio)*: ~10.000 km/ano (Retorno em até 365 dias).
  - *Motorista de Aplicativo*: ~4.000 km/mês (Retorno calculado para ~80 dias).
- **Régua de Avisos com Filtros**:
  - 🚨 **Urgente (Amanhã / Hoje / 1 dia antes)**
  - ⚠️ **Alerta Próximo (1 a 7 dias antes)**
  - 🔴 **Vencidos**
  - 🟢 **Em dia**
- Disparo de mensagem personalizada de retorno via WhatsApp com 1 clique.

### 5. 📲 Integração Direta com WhatsApp (Zero Custo de API)
- Geração de links limpos com `wa.me` contendo mensagem profissional pronta:
  - Envio de Orçamento detalhado para aprovação do cliente.
  - Notificação de "Veículo Pronto para Retirada".
  - Mensagem de lembrete de revisão preventiva.

### 6. 💰 DRE e Módulo Financeiro
- Fluxo de caixa com entradas e saídas.
- Contas a Pagar e a Receber com status (Pendente / Pago / Atrasado).
- Demonstrativo de comissões por mecânico.
- Cálculo de Lucro Líquido Real e Ticket Médio da Oficina.

### 7. 🖨️ Impressão de Ordem de Serviço & Recibo
- Formato térmico (bobina 80mm) ou folha A4.
- Inclusão automática de termo legal de garantia de 90 dias (conforme art. 26 do Código de Defesa do Consumidor).
- Campos de assinatura do cliente e do responsável técnico.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19 + TypeScript
- **Estilização**: Tailwind CSS v4
- **Ícones**: Lucide React
- **Planilhas**: SheetJS (xlsx)
- **Persistência**: LocalStorage estruturado com dados seed de oficina modelo
- **Build Tool**: Vite 8.3

---

## 📦 Como Rodar Localmente

1. Clone o repositório:
```bash
git clone https://github.com/SEU_USUARIO/oficina-mestre.git
cd oficina-mestre
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

4. Acesse no navegador:
```
http://localhost:5173
```

---

## 🚀 Deploy

O projeto é 100% estático (Single Page Application) e pode ser hospedado gratuitamente na **Vercel**, **Netlify** ou **GitHub Pages**.

---

Desenvolvido para mecânicos e gestores que valorizam tempo, organização e lucro! 🛠️💼
