/* ==========================================
   LÓGICA PRINCIPAL - SIMULADOR FLUXO PAGAMENTO
   Antigravity Design System
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  // ── Inicializar ícones Lucide ──────────────────────────────────────────────
  lucide.createIcons();

  // ── Referências de elementos ───────────────────────────────────────────────
  const elThemeBtns              = document.querySelectorAll('.theme-btn');
  const elInputCorretora         = document.getElementById('input-corretora');
  const elInputClienteNome       = document.getElementById('input-cliente-nome');
  const elInputClienteEmail      = document.getElementById('input-cliente-email');
  const elInputClienteFone       = document.getElementById('input-cliente-fone');
  const elInputImovelNome        = document.getElementById('input-imovel-nome');
  const elInputImovelUnidade     = document.getElementById('input-imovel-unidade');
  const elInputImovelDetalhes    = document.getElementById('input-imovel-detalhes');
  const elInputImovelIndexador   = document.getElementById('input-imovel-indexador');
  const elInputImovelIndexadorBase = document.getElementById('input-imovel-indexador-base');
  const elInputValorTotal        = document.getElementById('input-valor-total');
  const elInputValorEntrada      = document.getElementById('input-valor-entrada');
  const elInputValorParcela      = document.getElementById('input-valor-parcela');
  const elInputMeses             = document.getElementById('input-meses');
  const elInputValorReforco      = document.getElementById('input-valor-reforco');
  const elInputReforcosMeses     = document.getElementById('input-reforcos-meses');
  const elBtnReforcoSemestral    = document.getElementById('btn-reforco-semestral');
  const elBtnReforcoAnual        = document.getElementById('btn-reforco-anual');
  const elBtnReforcoLimpar       = document.getElementById('btn-reforco-limpar');
  const elInputObservacoes       = document.getElementById('input-observacoes');
  const elInputCubRate           = document.getElementById('input-cub-rate');
  const elValCubProjetado        = document.getElementById('val-cub-projetado');

  // Outputs dashboard
  const elValTotal               = document.getElementById('val-total');
  const elValEntrada             = document.getElementById('val-entrada');
  const elValPago                = document.getElementById('val-pago');
  const elValSaldo               = document.getElementById('val-saldo');
  const elLblTotalMeses          = document.getElementById('lbl-total-meses');
  const elBadgeMeses             = document.getElementById('badge-meses');
  const elTabelaDashboard        = document.getElementById('tabela-dashboard');
  const elBtnImprimir            = document.getElementById('btn-imprimir');
  const elBtnBaixarPdf           = document.getElementById('btn-baixar-pdf');

  // ── Configuração de gráficos e temas ──────────────────────────────────────
  let chartDashboard = null;
  let chartPrint     = null;
  let activeTheme    = 'blue';

  const themeColors = {
    blue:    { primary: 'hsl(210, 80%, 45%)',  success: 'hsl(152, 70%, 50%)' },
    emerald: { primary: 'hsl(162, 76%, 38%)',  success: 'hsl(140, 65%, 45%)' },
    gold:    { primary: 'hsl(38,  85%, 45%)',  success: 'hsl(120, 55%, 45%)' },
    violet:  { primary: 'hsl(265, 75%, 58%)',  success: 'hsl(152, 70%, 50%)' },
  };

  // ── Utils financeiros ──────────────────────────────────────────────────────
  const fmt = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  function parseMoney(valStr) {
    if (!valStr) return 0;
    const clean = valStr.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }

  function maskMoney(input) {
    let value = input.value.replace(/\D/g, '');
    if (value === '') { input.value = ''; return; }
    const floatVal = parseFloat(value) / 100;
    input.value = floatVal.toLocaleString('pt-BR', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  // ── Vincular máscara em inputs monetários ─────────────────────────────────
  document.querySelectorAll('.money-input').forEach(input => {
    input.addEventListener('input', () => maskMoney(input));
    input.addEventListener('change', () => processarSimulacao());
  });

  [elInputMeses, elInputReforcosMeses, elInputObservacoes].forEach(el => {
    if (el) el.addEventListener('change', () => processarSimulacao());
  });

  // ── Seletor de temas ───────────────────────────────────────────────────────
  elThemeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elThemeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const theme = btn.dataset.theme;
      document.body.className = `theme-${theme}`;
      activeTheme = theme;
      processarSimulacao();
    });
  });

  // ── Atalhos de reforços ────────────────────────────────────────────────────
  elBtnReforcoSemestral.addEventListener('click', () => {
    const totalMeses = parseInt(elInputMeses.value) || 12;
    const meses = [];
    for (let i = 6; i < totalMeses; i += 6) meses.push(i);
    elInputReforcosMeses.value = meses.join(', ');
    processarSimulacao();
  });

  elBtnReforcoAnual.addEventListener('click', () => {
    const totalMeses = parseInt(elInputMeses.value) || 12;
    const meses = [];
    for (let i = 12; i < totalMeses; i += 12) meses.push(i);
    elInputReforcosMeses.value = meses.join(', ');
    processarSimulacao();
  });

  elBtnReforcoLimpar.addEventListener('click', () => {
    elInputReforcosMeses.value = '';
    processarSimulacao();
  });

  // ── Slider de reajuste CUB ─────────────────────────────────────────────────
  elInputCubRate.addEventListener('input', function () {
    const v = parseFloat(this.value);
    elValCubProjetado.textContent = v.toFixed(1).replace('.', ',') + '% a.a.';
    processarSimulacao();
  });

  // ── Cálculo de parcelas ────────────────────────────────────────────────────
  function calcularParcelas(cubAnual, config) {
    const cubMensal = Math.pow(1 + cubAnual / 100, 1 / 12) - 1;
    const meses = [];
    let acum = config.entrada;
    for (let m = 1; m <= config.totalMeses; m++) {
      const parcela    = config.parcelaBase * Math.pow(1 + cubMensal, m - 1);
      const reforco    = config.reforcosMeses.has(m) ? config.valorReforco : 0;
      const desembolso = parcela + reforco;
      acum += desembolso;
      meses.push({ m, parcela, reforco, desembolso, acum });
    }
    return meses;
  }

  // ── Processar simulação ────────────────────────────────────────────────────
  function processarSimulacao() {
    const totalImovel  = parseMoney(elInputValorTotal.value);
    const entrada      = parseMoney(elInputValorEntrada.value);
    const parcelaBase  = parseMoney(elInputValorParcela.value);
    const totalMeses   = parseInt(elInputMeses.value) || 1;
    const valorReforco = parseMoney(elInputValorReforco.value);
    const indexador    = elInputImovelIndexador.value || 'CUB/SC';

    const reforcosMeses = new Set(
      elInputReforcosMeses.value.split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n) && n > 0 && n <= totalMeses)
    );

    const cubAnual = parseFloat(elInputCubRate.value) || 0;

    const dados = calcularParcelas(cubAnual, {
      entrada, parcelaBase, totalMeses, valorReforco, reforcosMeses
    });

    const totalPagoFluxo  = dados.length > 0 ? dados[dados.length - 1].acum : entrada;
    const saldoAFinanciar = Math.max(0, totalImovel - totalPagoFluxo);

    // Atualizar KPIs
    elValTotal.textContent    = fmt(totalImovel);
    elValEntrada.textContent  = fmt(entrada);
    elValPago.textContent     = fmt(totalPagoFluxo);
    elValSaldo.textContent    = fmt(saldoAFinanciar);
    elLblTotalMeses.textContent = `Pago em ${totalMeses} meses (Entrada + Parcelas)`;
    elBadgeMeses.textContent    = `${totalMeses} parcelas mensais`;

    document.querySelectorAll('.lbl-indexador').forEach(el => {
      el.textContent = indexador;
    });

    // Tabela do dashboard
    elTabelaDashboard.innerHTML = '';
    dados.forEach(d => {
      const tr = document.createElement('tr');
      const isReforco = d.reforco > 0;
      if (isReforco) tr.className = 'reforco';
      tr.innerHTML = `
        <td>Mês ${d.m}${isReforco ? ` <span class="tag-reforco">REFORÇO M${d.m}</span>` : ''}</td>
        <td>${fmt(d.parcela)}</td>
        <td>${isReforco ? fmt(d.reforco) : '—'}</td>
        <td>${fmt(d.desembolso)}</td>
        <td>${fmt(d.acum)}</td>
      `;
      elTabelaDashboard.appendChild(tr);
    });

    desenharGraficoDashboard(dados);
  }

  // ── Gráfico do dashboard ───────────────────────────────────────────────────
  function desenharGraficoDashboard(dados) {
    const ctx    = document.getElementById('grafico-dashboard').getContext('2d');
    const colors = themeColors[activeTheme];

    const labels         = dados.map(d => 'M' + d.m);
    const dataNormais    = dados.map(d => d.reforco === 0 ? parseFloat(d.parcela.toFixed(2)) : null);
    const dataComReforco = dados.map(d => d.reforco > 0  ? parseFloat(d.desembolso.toFixed(2)) : null);

    // Gradientes
    const gradPrimary = ctx.createLinearGradient(0, 0, 0, 300);
    gradPrimary.addColorStop(0, colors.primary.replace(')', ', 0.9)').replace('hsl', 'hsla'));
    gradPrimary.addColorStop(1, colors.primary.replace(')', ', 0.6)').replace('hsl', 'hsla'));

    const gradSuccess = ctx.createLinearGradient(0, 0, 0, 300);
    gradSuccess.addColorStop(0, colors.success.replace(')', ', 0.9)').replace('hsl', 'hsla'));
    gradSuccess.addColorStop(1, colors.success.replace(')', ', 0.6)').replace('hsl', 'hsla'));

    if (chartDashboard) chartDashboard.destroy();

    chartDashboard = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Parcela mensal',
            data: dataNormais,
            backgroundColor: gradPrimary,
            borderRadius: 6,
            borderSkipped: false,
            skipNull: true,
          },
          {
            label: 'Mês com reforço',
            data: dataComReforco,
            backgroundColor: gradSuccess,
            borderRadius: 6,
            borderSkipped: false,
            skipNull: true,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(9,17,31,0.95)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 14,
            cornerRadius: 10,
            titleFont: { family: 'Outfit', size: 13, weight: 'bold' },
            bodyFont:  { family: 'Inter', size: 12 },
            titleColor: '#e8f0fe',
            bodyColor: '#8ba3c7',
            callbacks: {
              title: ctxs => 'Fluxo — Mês ' + dados[ctxs[0].dataIndex].m,
              label: ctxs => {
                const d = dados[ctxs.dataIndex];
                const lines = [`  Parcela: ${fmt(d.parcela)}`];
                if (d.reforco > 0) lines.push(`  Reforço: ${fmt(d.reforco)}`);
                lines.push(`  Total do Mês: ${fmt(d.desembolso)}`);
                lines.push(`  Acumulado: ${fmt(d.acum)}`);
                return lines;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              font: { family: 'Inter', size: 10 },
              color: '#506380',
              autoSkip: true,
              maxTicksLimit: 20,
            }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            border: { display: false, dash: [4, 4] },
            ticks: {
              font: { family: 'Inter', size: 10 },
              color: '#506380',
              callback: v => 'R$ ' + (v / 1000).toFixed(0) + 'k',
            }
          }
        }
      }
    });
  }

  // ── Preparar Dados do Template do PDF ──────────────────────────────────────
  function prepararTemplatePrint() {
    const corretora        = elInputCorretora.value   || 'Imobiliária Antigravity';
    const clienteNome      = elInputClienteNome.value || 'Carlos Eduardo Mendonça';
    const clienteEmail     = elInputClienteEmail.value;
    const clienteFone      = elInputClienteFone.value;
    const imovelNome       = elInputImovelNome.value;
    const imovelUnidade    = elInputImovelUnidade.value;
    const imovelDetalhes   = elInputImovelDetalhes.value;
    const imovelIndexador  = elInputImovelIndexador.value || 'CUB/SC';
    const imovelIndexadorBase = elInputImovelIndexadorBase.value;

    const totalImovel  = parseMoney(elInputValorTotal.value);
    const entrada      = parseMoney(elInputValorEntrada.value);
    const parcelaBase  = parseMoney(elInputValorParcela.value);
    const totalMeses   = parseInt(elInputMeses.value) || 1;
    const valorReforco = parseMoney(elInputValorReforco.value);
    const cubAnual     = parseFloat(elInputCubRate.value) || 0;
    const observacoes  = elInputObservacoes.value || '';

    const reforcosMeses = new Set(
      elInputReforcosMeses.value.split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n) && n > 0 && n <= totalMeses)
    );

    const dados = calcularParcelas(cubAnual, {
      entrada, parcelaBase, totalMeses, valorReforco, reforcosMeses
    });

    const totalPagoFluxo  = dados.length > 0 ? dados[dados.length - 1].acum : entrada;
    const saldoAFinanciar = Math.max(0, totalImovel - totalPagoFluxo);

    // Preencher campos do PDF
    document.getElementById('print-txt-corretora').textContent       = corretora;
    document.getElementById('print-data-emissao').textContent        = new Date().toLocaleDateString('pt-BR');
    document.getElementById('print-txt-cliente-nome').textContent    = clienteNome;
    document.getElementById('print-txt-cliente-email').textContent   = clienteEmail;
    document.getElementById('print-txt-cliente-fone').textContent    = clienteFone;
    document.getElementById('print-txt-imovel-nome').textContent     = imovelNome;
    document.getElementById('print-txt-imovel-unidade').textContent  = imovelUnidade;
    document.getElementById('print-txt-imovel-detalhes').textContent = imovelDetalhes;
    document.getElementById('print-val-total').textContent           = fmt(totalImovel);
    document.getElementById('print-val-entrada').textContent         = fmt(entrada);
    document.getElementById('print-val-pago-fluxo').textContent      = fmt(totalPagoFluxo);
    document.getElementById('print-val-saldo-chaves').textContent    = fmt(saldoAFinanciar);
    document.getElementById('print-lbl-reajuste').textContent        = `Projeção: ${cubAnual.toFixed(1).replace('.', ',')}% a.a. indexado ao ${imovelIndexador}`;
    document.getElementById('print-val-cub-estimado').textContent    = cubAnual.toFixed(1).replace('.', ',') + '% a.a.';
    document.getElementById('print-val-indexador-nome').textContent  = imovelIndexador;
    document.getElementById('print-val-indexador-base').textContent  = imovelIndexadorBase;
    document.getElementById('print-txt-observacoes').textContent     = observacoes;
    document.getElementById('print-txt-signature-cliente').textContent   = clienteNome;
    document.getElementById('print-txt-signature-corretora').textContent = corretora;

    // Montar tabela do PDF
    const elTabelaPrint = document.getElementById('tabela-print');
    elTabelaPrint.innerHTML = '';
    dados.forEach(d => {
      const tr = document.createElement('tr');
      const isReforco = d.reforco > 0;
      if (isReforco) tr.className = 'reforco';
      tr.innerHTML = `
        <td>Mês ${d.m}${isReforco ? ` <span class="tag-reforco">REFORÇO</span>` : ''}</td>
        <td>${fmt(d.parcela)}</td>
        <td>${isReforco ? fmt(d.reforco) : '—'}</td>
        <td>${fmt(d.desembolso)}</td>
        <td>${fmt(d.acum)}</td>
      `;
      elTabelaPrint.appendChild(tr);
    });

    return dados;
  }

  // ── Geração do PDF e Impressão do Navegador ────────────────────────────────
  if (elBtnImprimir) {
    elBtnImprimir.addEventListener('click', () => {
      const dados = prepararTemplatePrint();
      
      desenharGraficoPrint(dados, () => {
        setTimeout(() => window.print(), 350);
      });
    });
  }

  // ── Geração e Download Direto do PDF (html2pdf.js) ─────────────────────────
  if (elBtnBaixarPdf) {
    elBtnBaixarPdf.addEventListener('click', () => {
      const dados = prepararTemplatePrint();
      const elPrintContainer = document.getElementById('print-template');
      
      // Armazenar os estados originais do CSS do contêiner
      const originalDisplay  = elPrintContainer.style.display;
      const originalPosition = elPrintContainer.style.position;
      const originalLeft     = elPrintContainer.style.left;
      const originalWidth    = elPrintContainer.style.width;
      const originalBg       = elPrintContainer.style.background;
      const originalColor    = elPrintContainer.style.color;

      // Forçar exibição temporária em posição invisível para o html2pdf.js renderizar
      elPrintContainer.style.display    = 'block';
      elPrintContainer.style.position   = 'absolute';
      elPrintContainer.style.left       = '-9999px';
      elPrintContainer.style.width      = '210mm'; // Largura perfeita A4 1:1 com a impressão
      elPrintContainer.style.background = '#ffffff';
      elPrintContainer.style.color      = '#1e293b';
      elPrintContainer.classList.add('active-pdf-rendering');

      // Gerar um nome de arquivo profissional e sanitizado
      const rawCliente = elInputClienteNome.value || 'Cliente';
      const rawImovel  = elInputImovelNome.value || 'Imovel';
      const cleanCliente = rawCliente.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, '_');
      const cleanImovel  = rawImovel.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, '_');
      const filename     = `Proposta_${cleanCliente}_${cleanImovel}.pdf`;

      // Opções avançadas de alta fidelidade para o html2pdf
      const options = {
        margin:       0, // Zerada pois as margens já são dadas via CSS (padding: 12mm 14mm) no próprio contêiner!
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true,
          backgroundColor: '#ffffff',
          width: 793 // A4 em pixels a 96 DPI (210mm = ~793px) para proporção perfeita
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      desenharGraficoPrint(dados, () => {
        // Chamar html2pdf e salvar o arquivo
        html2pdf().set(options).from(elPrintContainer).save().then(() => {
          // Restaurar estados originais do elemento na tela
          elPrintContainer.style.display    = originalDisplay;
          elPrintContainer.style.position   = originalPosition;
          elPrintContainer.style.left       = originalLeft;
          elPrintContainer.style.width      = originalWidth;
          elPrintContainer.style.background = originalBg;
          elPrintContainer.style.color      = originalColor;
          elPrintContainer.classList.remove('active-pdf-rendering');
        });
      });
    });
  }

  function desenharGraficoPrint(dados, callback) {
    const elPrintContainer = document.getElementById('print-template');
    const originalDisplay  = elPrintContainer.style.display;
    elPrintContainer.style.display = 'block';
    elPrintContainer.style.position = 'absolute';
    elPrintContainer.style.left = '-9999px';

    const ctx = document.getElementById('grafico-print').getContext('2d');

    const labels         = dados.map(d => 'M' + d.m);
    const dataNormais    = dados.map(d => d.reforco === 0 ? parseFloat(d.parcela.toFixed(2)) : null);
    const dataComReforco = dados.map(d => d.reforco > 0  ? parseFloat(d.desembolso.toFixed(2)) : null);

    if (chartPrint) chartPrint.destroy();

    chartPrint = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Parcela mensal',
            data: dataNormais,
            backgroundColor: '#1e7fcb',
            borderRadius: 3,
            skipNull: true,
          },
          {
            label: 'Mês com reforço',
            data: dataComReforco,
            backgroundColor: '#16a34a',
            borderRadius: 3,
            skipNull: true,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 8 }, color: '#475569', autoSkip: true, maxTicksLimit: 26 }
          },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: { font: { family: 'Inter', size: 8 }, color: '#475569', callback: v => 'R$ ' + (v / 1000).toFixed(0) + 'k' }
          }
        }
      }
    });

    elPrintContainer.style.display = originalDisplay;
    elPrintContainer.style.position = '';
    elPrintContainer.style.left = '';

    if (callback) callback();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  GSAP — Animações de entrada (stagger) na carga da página
  // ─────────────────────────────────────────────────────────────────────────
  function initGSAPAnimations() {
    if (typeof gsap === 'undefined') return;

    // Definir estado inicial (invisível) para os elementos animáveis
    gsap.set('.metric-card', { opacity: 0, y: 30, scale: 0.97 });
    gsap.set('.main-header', { opacity: 0, y: -20 });
    gsap.set('.cub-slider-card', { opacity: 0, x: -20 });
    gsap.set('.chart-section', { opacity: 0, y: 24 });
    gsap.set('.table-section', { opacity: 0, y: 24 });
    gsap.set('.config-section', { opacity: 0, x: -16 });

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Sidebar sections — stagger de baixo para cima
    tl.to('.config-section', {
      opacity: 1, x: 0,
      duration: 0.6,
      stagger: 0.09,
    }, 0);

    // Header
    tl.to('.main-header', {
      opacity: 1, y: 0,
      duration: 0.7,
    }, 0.15);

    // Metric cards — efeito dominó
    tl.to('.metric-card', {
      opacity: 1, y: 0, scale: 1,
      duration: 0.6,
      stagger: 0.1,
    }, 0.3);

    // CUB slider card
    tl.to('.cub-slider-card', {
      opacity: 1, x: 0,
      duration: 0.6,
    }, 0.7);

    // Chart + tabela
    tl.to(['.chart-section', '.table-section'], {
      opacity: 1, y: 0,
      duration: 0.6,
      stagger: 0.12,
    }, 0.8);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Efeito 3D Mouse Tilt nos cartões de métricas
  // ─────────────────────────────────────────────────────────────────────────
  function initTiltEffect() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tiltCards = document.querySelectorAll('.tilt-card');

    tiltCards.forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const cx   = rect.left + rect.width / 2;
        const cy   = rect.top  + rect.height / 2;
        const dx   = (e.clientX - cx) / (rect.width  / 2);  // -1 a +1
        const dy   = (e.clientY - cy) / (rect.height / 2);  // -1 a +1

        const rotX =  dy * -10;  // Inclinação vertical (máx. ±10°)
        const rotY =  dx *  12;  // Inclinação horizontal (máx. ±12°)

        if (typeof gsap !== 'undefined') {
          gsap.to(card, {
            rotateX: rotX,
            rotateY: rotY,
            scale: 1.03,
            boxShadow: `0 24px 60px rgba(0,0,0,0.45), 0 0 30px var(--primary-glow)`,
            duration: 0.3,
            ease: 'power2.out',
            transformPerspective: 800,
          });
        } else {
          card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.03)`;
        }
      });

      card.addEventListener('mouseleave', () => {
        if (typeof gsap !== 'undefined') {
          gsap.to(card, {
            rotateX: 0, rotateY: 0, scale: 1,
            boxShadow: '',
            duration: 0.6,
            ease: 'elastic.out(1, 0.6)',
          });
        } else {
          card.style.transform = '';
        }
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Efeito 3D nas glass-cards (chart e tabela)
  // ─────────────────────────────────────────────────────────────────────────
  function initGlassCardHover() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof gsap === 'undefined') return;

    document.querySelectorAll('.glass-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        gsap.to(card, {
          y: -4,
          duration: 0.35,
          ease: 'power2.out',
        });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          y: 0,
          duration: 0.5,
          ease: 'elastic.out(1, 0.7)',
        });
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Inicialização
  // ─────────────────────────────────────────────────────────────────────────
  processarSimulacao();
  initGSAPAnimations();
  initTiltEffect();
  initGlassCardHover();
});
