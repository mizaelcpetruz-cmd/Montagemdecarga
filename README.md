# 🚚 Petruz - Sistema de Montagem de Carga & Expedição Logística

> **Aplicação Full Stack Integrada (Single-Root Project)** desenvolvida para consolidação de cargas logísticas, integrada ao **SAP Business One via Service Layer** e banco de dados **Supabase Cloud (PostgreSQL)**, com controle de frotas, cubagem inteligente e emissão de **PDF de Conferência de Lotes Lokfrio**.

---

## ⚡ Como Instalar e Iniciar (Padrão Unificado)

Tudo fica na **mesma raiz** com apenas **1 `package.json`** e **1 pasta `node_modules`**:

### 1. Instalar Dependências (Na raiz)
```bash
npm install
```

### 2. Iniciar o Sistema (Backend + Frontend)
```bash
npm run dev
```
> O backend iniciará em `http://localhost:5000` e o frontend em `http://localhost:5173` em paralelo com hot-reload automático.

---

## 📋 Comandos Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm install` | Instala todas as dependências do sistema de uma só vez |
| `npm run dev` | Inicia o **Servidor Backend (5000)** e o **Cliente Frontend (5173)** juntos |
| `npm run dev:server` | Inicia somente o Servidor Backend (`tsx watch server/server.ts`) |
| `npm run dev:client` | Inicia somente o Cliente Frontend (`vite`) |
| `npm run build` | Compila o Backend e o Frontend para produção |
| `npm run build:server`| Compila o TypeScript do servidor para `dist-server/` |
| `npm run build:client`| Gera os bundles otimizados do frontend para `dist/` |
| `npm start` | Inicia o servidor backend compilado em produção (`node dist-server/server.js`) |

---

## 🏛️ Estrutura do Projeto

```
MontagemdeCarga/
├── node_modules/                 # Pasta única de dependências do Node
├── server/                       # Backend API (Express + TypeScript)
│   ├── config/                   # Configurações (Env Zod, Database, CORS, Supabase)
│   ├── controllers/              # Controladores HTTP
│   ├── errors/                   # AppError e ErrorHandler global seguro
│   ├── middlewares/              # Autenticação JWT, RBAC, Rate Limiting, Sanitização
│   ├── routes/                   # Rotas modulares (auth, user, branch, vehicle, load, sap...)
│   ├── services/                 # Knapsack, SAP Service Layer, Gerador PDF, E-mails
│   ├── validators/               # Schemas de validação Zod
│   └── server.ts                 # Ponto de entrada do Backend
│
├── src/                          # Frontend SPA (React 18 + TypeScript + TailwindCSS)
│   ├── components/               # Componentes UI reutilizáveis
│   ├── contexts/                 # Provedores de estado global
│   ├── pages/                    # Telas da aplicação
│   ├── services/                 # Cliente de API Axios
│   ├── types/                    # Tipagens TypeScript
│   ├── App.tsx                   # Roteamento e layout
│   ├── main.tsx                  # Ponto de entrada do React
│   └── index.css                 # Estilos globais Tailwind
│
├── index.html                    # HTML principal da aplicação
├── vite.config.ts                # Configuração do Vite com proxy /api
├── tailwind.config.js            # Design System e temas do Tailwind
├── postcss.config.js             # Configuração do PostCSS
├── tsconfig.json                 # TypeScript config do Frontend
├── tsconfig.server.json          # TypeScript config do Backend
├── .env                          # Variáveis de ambiente locais
├── .env.example                  # Template documentado de variáveis
├── .gitignore                    # Proteção estrita de credenciais e builds
└── package.json                  # ÚNICO package.json de todo o projeto
```

---

## 🛡️ Regras e Diretrizes de Segurança

- **Proteção de Cabeçalhos HTTP (Helmet)**: CSP, Cross-Origin Resource Policy, X-Content-Type-Options e Referrer-Policy.
- **CORS Estrito**: Whitelist de origens autorizadas com proteção em produção.
- **Validação de Entrada com Zod**: Schemas tipados e sanitização de payloads em todas as rotas.
- **Proteção contra Força Bruta e DoS**: Rate limiting granular em endpoints de autenticação.
- **Autenticação JWT & Bcrypt**: Hash seguro de senhas e tokens com expiração.
- **Controle de Acesso Baseado em Perfis (RBAC)**: `admin`, `supervisor`, `operator`.
- **Trilha de Auditoria (Audit Logs)**: Registro imutável de ações operacionais no Supabase.
- **Tratamento de Erros Seguro**: Sem vazamento de stack traces nem infraestrutura interna.

---

## 🔑 Credenciais Padrão de Acesso

- **Usuário Administrador**: `grupo-ti@petruz.com`
- **Senha Inicial**: `1234`

---

© 2026 Petruz Fruty Logística — Todos os direitos reservados.
