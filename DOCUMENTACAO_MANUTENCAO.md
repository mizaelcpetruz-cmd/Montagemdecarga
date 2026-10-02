# 📚 Manual de Arquitetura, Manutenção e Customização de Layouts
### Petruz Fruity — Sistema de Montagem e Conferência de Cargas

Este documento foi elaborado para orientar desenvolvedores e administradores na manutenção contínua, customização de layouts (PDF e Web), segurança e boas práticas de engenharia de software full stack.

---

## 🗺️ 1. Onde Fica Cada Layout e Como Editá-lo?

### A. Layout do Documento PDF de Conferência de Cargas
- **Arquivo Principal**: [`backend/src/services/pdfGenerator.ts`](file:///c:/Geral/Dev/MontagemdeCarga/backend/src/services/pdfGenerator.ts)
- **Controlador que alimenta os dados**: [`backend/src/controllers/loadController.ts`](file:///c:/Geral/Dev/MontagemdeCarga/backend/src/controllers/loadController.ts) (método `downloadPdf`)
- **Biblioteca utilizada**: [PDFKit](https://pdfkit.org/)

#### 📐 Como o Layout do PDF está estruturado no código:
1. **Dimensões e Margens da Página A4**:
   - `size: 'A4'` (595.28 pt de largura × 841.89 pt de altura)
   - `margin: 20 pt` em todas as bordas
   - Largura útil de impressão: `contentWidth = 555.28 pt`
2. **Distribuição das Colunas da Tabela**:
   ```ts
   const colWidths = {
     codigo: 50,     // Largura da coluna CÓDIGO
     descricao: 195,  // Largura da coluna DESCRIÇÃO DO PRODUTO
     cliente: 215,    // Largura da coluna CLIENTE (Código + Razão Social)
     qtd: 38,         // Largura da coluna QTD (Centralizada e em Negrito)
     lote: 57.28,     // Largura da coluna LOTE (Espaço para etiqueta/conferência manual)
   };
   ```
3. **Cálculo de Altura Dinâmica e Centralização**:
   - Para evitar que nomes longos sobreponham outras linhas, o sistema calcula dinamicamente:
     `doc.heightOfString(itemDescription)` e `doc.heightOfString(clientLabel)`.
   - `rowHeight = Math.max(16, contentH + 6);`
   - O texto é desenhado com centralização vertical automática `currentY + (rowHeight - textHeight) / 2`.
4. **Quebra Automática de Página (`pageBottom = 800 pt`)**:
   - Sempre que a próxima linha for ultrapassar a borda inferior, o PDFKit executa `doc.addPage()` e re-imprime automaticamente o cabeçalho preto da tabela no topo da nova página.
5. **Rodapé Numerado**:
   - Utiliza `doc.bufferedPageRange()` para calcular o total de páginas e imprimir `Página X de Y` centralizado em todas as páginas.

---

### B. Layouts das Telas do Frontend (Web)
Todos os layouts e páginas visuais estão localizados em `frontend/src/`:

| Tela / Recurso | Arquivo do Layout | Descrição |
| :--- | :--- | :--- |
| **Montagem de Carga** | [`frontend/src/pages/LoadBuilderPage.tsx`](file:///c:/Geral/Dev/MontagemdeCarga/frontend/src/pages/LoadBuilderPage.tsx) | Seleção de veículo, filiais ativas, romaneio e resumo de peso/cubagem. |
| **Pedidos de Venda SAP** | [`frontend/src/pages/SapOrdersPage.tsx`](file:///c:/Geral/Dev/MontagemdeCarga/frontend/src/pages/SapOrdersPage.tsx) | Filtro sob demanda por período/filial, paginação de 15 em 15 e status de faturamento. |
| **Histórico de Cargas** | [`frontend/src/pages/LoadListPage.tsx`](file:///c:/Geral/Dev/MontagemdeCarga/frontend/src/pages/LoadListPage.tsx) | Listagem, filtros por status, cancelamento e reemissão de PDF. |
| **Gestão de Veículos** | [`frontend/src/pages/VehiclesPage.tsx`](file:///c:/Geral/Dev/MontagemdeCarga/frontend/src/pages/VehiclesPage.tsx) | Cadastro, edição e controle de frota (peso máximo, volume, paletes). |
| **Configurações & Filiais** | [`frontend/src/pages/SettingsPage.tsx`](file:///c:/Geral/Dev/MontagemdeCarga/frontend/src/pages/SettingsPage.tsx) | Filiais SAP, upload de logotipo, numeração sequencial de romaneio e usuários. |
| **Estilos Globais e Tema** | [`frontend/src/index.css`](file:///c:/Geral/Dev/MontagemdeCarga/frontend/src/index.css) | Variáveis de cores Petruz (Roxo/Açaí `#7b1fa2`, `#c2185b`, `#1d1026`), Dark Mode e Tailwind. |

---

## 🛡️ 2. Padrões de Qualidade e Segurança Implementados

### A. Camada de Segurança (Backend)
1. **Autenticação e Autorização**:
   - Criptografia de senhas com `bcrypt` (10 salt rounds).
   - Tokens JWT assinados com expiração configurável (`JWT_EXPIRES_IN=8h`).
   - Middleware de RBAC (`requireRole(['admin', 'supervisor'])`) para rotas sensíveis.
2. **Proteção de Rede e Headers**:
   - `helmet` configurado para proteção contra clickjacking, MIME sniffing e XSS.
   - `express-rate-limit` ativo (máximo de 300 requisições por janela de 15 minutos por IP).
3. **Prevenção de Injeção SQL**:
   - 100% das consultas utilizam *Prepared Statements* parametrizados (`db.prepare('... WHERE id = ?').run(val)`).
4. **Trilha de Auditoria (Audit Logging)**:
   - Registro em tabela `audit_logs` de criação de cargas, finalização, login, exclusão e geração de PDF com IP e usuário responsável.

### B. Integração Segura com o SAP Business One Service Layer
- **Arquivo**: [`backend/src/services/sapServiceLayer.ts`](file:///c:/Geral/Dev/MontagemdeCarga/backend/src/services/sapServiceLayer.ts)
- **Autenticação**:
  - Realiza `/b1s/v2/Login` seguro e mantém `B1SESSION` + `ROUTEID` em memória com renovação automática em caso de expiração (`401 Unauthorized`).
  - Agente HTTPS com `rejectUnauthorized: false` para suportar certificados corporativos autoassinados na rede interna/VPN.
- **Regras de Negócio na Busca de Pedidos**:
  - `DocumentStatus eq 'bost_Open'` (Apenas pedidos pendentes).
  - Exclusão de linhas com `LineStatus === 'bost_Close'` (ignora itens já faturados em NF).
  - Cálculo de saldo restante (`RemainingOpenQuantity`).

---

## 🔧 3. Como Executar e Fazer Manutenção no Dia a Dia

### Iniciar o Ambiente de Desenvolvimento Completo:
No terminal da raiz do projeto (`c:\Geral\Dev\MontagemdeCarga`):
```bash
npm run dev
```
*(O script utiliza `concurrently` para rodar simultaneamente o backend na porta `5000` e o frontend Vite na porta `5173`).*

### Como Testar a Geração do PDF em Linha de Comando:
Para testar alterações no layout do PDF sem precisar abrir o navegador:
```bash
cd backend
npx tsx test_pdf.ts
```
*(Gera o arquivo `sample_long_names.pdf` na pasta backend com validação imediata).*

### Compilar para Produção (Type Checking & Bundling):
```bash
npm run build
```

---

## 📝 4. Variáveis de Ambiente (`backend/.env`)

| Variável | Exemplo | Finalidade |
| :--- | :--- | :--- |
| `PORT` | `5000` | Porta TCP do backend Express. |
| `JWT_SECRET` | `chave-secreta-longa` | Assinatura criptográfica dos tokens de sessão. |
| `SAP_SERVICE_LAYER_URL` | `https://sl-eqnx.datacore.com.br:25162/b1s/v2/` | Endpoint da Service Layer do SAP Business One. |
| `SAP_COMPANY_DB` | `SBO_PETRUZ_TESTE` | Base de dados / Empresa no SAP. |
| `SAP_USERNAME` | `TI13` | Usuário técnico de integração. |
| `SAP_PASSWORD` | `********` | Senha de integração no SAP. |
| `SAP_MOCK_MODE` | `false` | `false` para SAP real; `true` para simulação offline. |
