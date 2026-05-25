# 🏢 Simulador de Fluxo de Pagamento Imobiliário

Um simulador interativo de fluxo de pagamento imobiliário premium e dinâmico, desenvolvido com foco em alta fidelidade estética e usabilidade. Esta ferramenta permite configurar, calcular e projetar fluxos de pagamento (indexados pelo **CUB/SC** ou outros índices) com geração instantânea de **PDF profissional executivo** formatado especificamente para impressão física ou digital.

---

## ✨ Funcionalidades Principais

*   **🎨 Temas Premium:** Seleção de paletas harmônicas e profissionais em tempo real (Azul Corporativo, Verde Esmeralda, Dourado Prestige, Modern Charcoal) com efeitos de vidro (*glassmorphism*) e micro-animações.
*   **📊 Projeção Dinâmica (CUB):** Controle dinâmico do impacto inflacionário estimado ao ano (`% a.a.`), recalculando parcelas mensais e reforços sob regime acumulativo mês a mês.
*   **📈 Gráficos Interativos (Chart.js):** Visualização clara de desembolsos normais e meses com reforços (balões) com tooltips completos e detalhados.
*   **📋 Tabela de Cronograma:** Detalhamento completo e amigável da evolução das parcelas, mostrando os desembolsos e o acumulado geral.
*   **📄 PDF Profissional Integrado:** Layout de impressão inteligente (`@media print`) que oculta controles de edição e gera uma proposta comercial limpa, contendo termo de validade, dados do proponente, dados do imóvel, gráficos otimizados e campos de assinatura prontos para fechamento de negócios.

---

## 📁 Estrutura do Projeto

O projeto é 100% estático (HTML/CSS/JS nativos), garantindo carregamento ultrarrápido e compatibilidade universal:

*   `index.html` — Estrutura semântica HTML5 com o simulador e o template executivo de impressão.
*   `styles.css` — Sistema de design moderno, responsivo, com variáveis de cores HSL dinâmicas e suporte a impressão.
*   `app.js` — Lógica financeira de projeção acumulada, máscara monetária em tempo real, atualização de temas e gráficos Chart.js.
*   `vercel.json` — Configurações de cabeçalhos de segurança (`X-Frame-Options`, `X-Content-Type-Options`) e cache de longa duração (`Cache-Control`) para máxima performance na Vercel.
*   `.gitignore` — Exclusão de arquivos temporários e configurações locais de IDEs.

---

## 🚀 Como Executar Localmente

Por se tratar de um aplicativo estático, você pode rodá-lo localmente de várias formas rápidas:

### Opção 1: VS Code Live Server
Se você usa o VS Code, basta instalar a extensão **Live Server**, clicar com o botão direito sobre o `index.html` e selecionar **"Open with Live Server"**.

### Opção 2: Servidor Rápido via Terminal
Caso prefira usar a linha de comando, navegue até a pasta do projeto e execute uma das opções abaixo:

**Utilizando Node.js (npm):**
```bash
npx serve
```

**Utilizando Python:**
```bash
python -m http.server 8000
```
Depois, abra [http://localhost:8000](http://localhost:8000) no seu navegador.

---

## ☁️ Como Publicar na Vercel

O projeto está **100% pronto para publicação na Vercel**. Sendo um site puramente estático com `index.html` na raiz, o deploy é instantâneo e extremamente simples.

### Método 1: Pelo Painel Web da Vercel (Recomendado)
1. Crie um repositório no seu GitHub, GitLab ou Bitbucket e faça o push deste código.
2. Acesse o painel da [Vercel](https://vercel.com/) e clique em **"Add New"** > **"Project"**.
3. Importe o repositório criado.
4. A Vercel detectará automaticamente que é um projeto estático ("Other"). Não é necessário alterar nenhuma configuração de Build.
5. Clique em **"Deploy"**! Em menos de 10 segundos, seu simulador estará no ar com link público HTTPS.

### Método 2: Pela Linha de Comando (Vercel CLI)
Se preferir fazer o deploy diretamente do seu terminal local:
1. Instale a CLI da Vercel globalmente (se já não tiver):
   ```bash
   npm install -g vercel
   ```
2. Na raiz desta pasta, execute:
   ```bash
   vercel
   ```
3. Responda às perguntas no terminal (pressione `Enter` para aceitar os padrões).
4. O projeto será publicado em modo de *Preview*. Para enviar para *Produção*, basta rodar:
   ```bash
   vercel --prod
   ```

Pronto! Seu simulador estará hospedado de forma global, com cache otimizado na rede de borda da Vercel e cabeçalhos de segurança totalmente configurados através do `vercel.json` incluso.
