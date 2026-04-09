# VestGO

<p align="center">
  <img src="https://img.shields.io/badge/status-em%20planejamento-0f766e?style=for-the-badge" alt="status">
  <img src="https://img.shields.io/badge/projeto-UPX%20I-0b1320?style=for-the-badge" alt="upx">
  <img src="https://img.shields.io/badge/foco-UI%2FUX%20%2B%20WebApp-14b8a6?style=for-the-badge" alt="focus">
  <img src="https://img.shields.io/badge/licença-acadêmico-334155?style=for-the-badge" alt="license">
</p>

<p align="center">
  <strong>Doação de roupas com agendamento e rastreio para ONGs verificadas.</strong><br>
  Um produto digital pensado para tornar a doação mais organizada, transparente e confiável.
</p>

---

## Visão geral

O **VestGO** é um projeto desenvolvido no contexto da **UPX I — Usina de Projetos Experimentais** do curso de **Análise e Desenvolvimento de Sistemas**.

A proposta do sistema é conectar:

- **doadores**
- **pontos de coleta**
- **ONGs verificadas**

por meio de uma experiência digital simples, moderna e orientada à confiança.

Hoje, grande parte das doações de roupas ainda acontece de forma improvisada: combinações informais, pouca previsibilidade logística, baixa transparência sobre o destino das peças e dificuldade para as instituições organizarem coletas de forma eficiente.

O VestGO busca resolver esse cenário com uma plataforma capaz de:

- localizar pontos de coleta próximos
- registrar doações
- organizar o fluxo de retirada
- acompanhar o status da doação
- aumentar a transparência até a triagem e destinação final

---

## Problema que o projeto resolve

A doação de roupas costuma enfrentar quatro gargalos principais:

1. **Fricção para o doador**  
   Falta praticidade para encontrar onde doar e como acompanhar o processo.

2. **Baixa previsibilidade para ONGs**  
   Muitas coletas acontecem sem planejamento, sem informação clara de volume e sem priorização.

3. **Pouca transparência**  
   O doador normalmente entrega a roupa, mas não sabe o que acontece depois.

4. **Desorganização logística**  
   Pontos de coleta e instituições têm dificuldade para centralizar informações em um fluxo único.

---

## Proposta de solução

O VestGO propõe uma plataforma com foco em **logística humanizada** e **transparência operacional**, onde o usuário pode:

- encontrar o ponto de coleta mais próximo via CEP, endereço ou geolocalização
- visualizar detalhes do ponto antes da entrega
- registrar sua doação
- acompanhar o fluxo da doação por meio de rastreio
- visualizar histórico e impacto gerado

Ao mesmo tempo, a solução prepara o sistema para que **ONGs e pontos de coleta** tenham uma visão mais organizada das coletas, volumes, prioridades e atualizações de status.

---

## Diferenciais do produto

- **Rastreio da doação**
- **ONGs verificadas**
- **Fluxo mais transparente**
- **Experiência visual humanizada**
- **Organização logística desde o MVP**
- **Arquitetura pensada para evolução real**

---

## Público-alvo

### Doador

Pessoa que deseja doar roupas com mais praticidade, confiança e visibilidade do impacto gerado.

### Ponto de coleta

Local parceiro responsável por receber peças e disponibilizar lotes para retirada.

### ONG parceira

Instituição que realiza triagem, coleta e destinação das doações.

---

## MVP proposto

O escopo inicial do VestGO contempla:

- landing page pública
- login e cadastro
- seleção de perfil de usuário
- dashboard do doador
- mapa de pontos de coleta
- detalhes do ponto de coleta
- cadastro de doação
- feedback de sucesso/erro
- rastreio da doação
- perfil do doador
- painel operacional de ONG / coleta

---

## Design System

A linguagem visual do projeto foi definida com base no conceito:

> **The Digital Curator**

Diretrizes principais:

- visual premium, clean e institucional
- identidade humanizada
- hierarquia por contraste de superfícies
- ausência de bordas rígidas
- cantos arredondados
- tipografia estilo **Inter**
- cor principal em **teal/petróleo**
- cor de destaque em **aqua/menta**
- foco em clareza, rastreabilidade e confiança

O design foi pensado para fugir da estética “e-commerce/logística fria” e transmitir uma sensação de produto social bem cuidado.

---

## Stack alvo do WebApp

> Esta é a arquitetura alvo recomendada para a próxima fase de implementação.

- **Next.js**
- **TypeScript**
- **Tailwind CSS**
- **Auth.js**
- **Prisma ORM**
- **PostgreSQL**
- **Docker Compose**
- **Nginx Proxy Manager**
- Deploy em servidor próprio

---

## Infraestrutura prevista

O projeto será preparado para rodar em ambiente self-hosted com:

- servidor próprio
- containers Docker
- reverse proxy com **Nginx Proxy Manager**
- domínio principal: **www.mosfet.com.br**
- rede Docker externa para roteamento entre serviços

---

## Status do projeto

### Etapa atual

- definição do problema
- validação de protótipo UI/UX
- modelagem do fluxo principal
- estruturação da identidade visual
- organização da proposta técnica para o webapp

### Próxima etapa

- implementação do webapp funcional
- autenticação real
- dashboard interativo
- persistência em banco de dados
- deploy em Docker

---

## Estrutura esperada do projeto

```bash
vestgo/
├── web/                  # Frontend / App Web
├── prisma/               # Schema e migrations
├── docker/               # Configurações de container
├── docs/                 # Documentação, prompts, fluxos e materiais acadêmicos
├── public/               # Assets estáticos
└── README.md
```

> A estrutura final pode evoluir conforme a implementação for iniciada.

---

## Roadmap

### Fase 1 — Base do produto

- [ ] Landing page
- [ ] Login e cadastro
- [ ] Autenticação funcional
- [ ] Dashboard do doador
- [ ] Banco de dados inicial
- [ ] Deploy em Docker

### Fase 2 — Núcleo operacional

- [ ] Mapa de pontos de coleta
- [ ] Cadastro de doação
- [ ] Rastreamento da doação
- [ ] Perfil do doador
- [ ] Painel de ponto de coleta

### Fase 3 — Expansão

- [ ] Painel de ONG
- [ ] Fluxos de triagem
- [ ] Métricas de impacto
- [ ] Relatórios operacionais
- [ ] Notificações e melhorias de UX

---

## Documentação do projeto

Este repositório pode agrupar, de forma progressiva:

- documentação funcional
- fluxos de navegação
- identidade visual
- prompts utilizados na prototipação
- assets da apresentação acadêmica
- arquitetura técnica do webapp

---

## Objetivos acadêmicos

Além da construção do protótipo, o projeto busca demonstrar:

- organização de sistema
- coerência entre problema e solução
- clareza de navegação
- consistência visual
- definição de perfis de usuário
- uso estruturado de IA no processo de ideação e prototipação

---

## Equipe

Projeto acadêmico desenvolvido para a disciplina **UPX I — ADS**.

**Equipe 1**

- Nathan Borges
- Henrique Barros Cavriani
- Bernardo Comelli dos Santos
- Guilherme Henrique de Assis Carvalho
- Julio Melendes Prado Giardina
- Antônio Carlos Damante De Souza
- Francisco Comelli dos Santos

---

## Observação

Este repositório representa a evolução do VestGO do protótipo para uma aplicação web real.  
A implementação está sendo planejada para priorizar:

- fidelidade ao design
- simplicidade operacional no V1
- deploy self-hosted
- escalabilidade futura sem complexidade desnecessária

---

## Contato / domínio do projeto

**Domínio planejado:**  
`www.mosfet.com.br`

---

<p align="center">
  <strong>VestGO</strong><br>
  Tecnologia aplicada à organização da doação com mais transparência, confiança e impacto social.
</p>
