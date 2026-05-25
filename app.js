/* ==========================================
   LOGICA PRINCIPAL - SIMULADOR FLUXO PAGAMENTO
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar ícones do Lucide
  lucide.createIcons();

  // --- CONTROLES E INPUTS ---
  const elThemeBtns = document.querySelectorAll('.theme-btn');
  const elInputCorretora = document.getElementById('input-corretora');
  
  const elInputClienteNome = document.getElementById('input-cliente-nome');
  const elInputClienteEmail = document.getElementById('input-cliente-email');
  const elInputClienteFone = document.getElementById('input-cliente-fone');

  const elInputImovelNome = document.getElementById('input-imovel-nome');
  const elInputImovelUnidade = document.getElementById('input-imovel-unidade');
  const elInputImovelDetalhes = document.getElementById('input-imovel-detalhes');
  const elInputImovelIndexador = document.getElementById('input-imovel-indexador');
  const elInputImovelIndexadorBase = document.getElementById('input-imovel-indexador-base');

  const elInputValorTotal = document.getElementById('input-valor-total');
  const elInputValorEntrada = document.getElementById('input-valor-entrada');
  const elInputValorParcela = document.getElementById('input-valor-parcela');
  const elInputMeses = document.getElementById('input-meses');

  const elInputValorReforco = document.getElementById('input-valor-reforco');
  const elInputReforcosMeses = document.getElementById('input-reforcos-meses');
  
  const elBtnReforcoSemestral = document.getElementById('btn-reforco-semestral');
  const elBtnReforcoAnual = document.getElementById('btn-reforco-anual');
  const elBtnReforcoLimpar = document.getElementById('btn-reforco-limpar');

  const elInputObservacoes = document.getElementById('input-observacoes');
  const elInputCubRate = document.getElementById('input-cub-rate');
  const elValCubProjetado = document.getElementById('val-cub-projetado');

  // --- OUTPUTS DASHBOARD ---
  const elValTotal = document.getElementById('val-total');
  const elValEntrada = document.getElementById('val-entrada');
  const elValPago = document.getElementById('val-pago');
  const elValSaldo = document.getElementById('val-saldo');
  const elLblTotalMeses = document.getElementById('lbl-total-meses');
  const elBadgeMeses = document.getElementById('badge-meses');
  const elTabelaDashboard = document.getElementById('tabela-dashboard');

  // --- ELEMENTOS PRINT ---
  const elBtnImprimir = document.getElementById('btn-imprimir');

  // --- CONFIGURAÇÕES DE GRÁFICO E TEMAS ---
  let chartDashboard = null;
  let chartPrint = null;
  
  const themeColors = {
    blue: { primary: '#185FA5', success: '#10b981', background: 'rgba(24, 95, 165, 0.08)' },
    emerald: { primary: '#0f766e', success: '#10b981', background: 'rgba(15, 118, 110, 0.08)' },
    gold: { primary: '#b45309', success: '#16a34a', background: 'rgba(180, 83, 9, 0.08)' },
    charcoal: { primary: '#374151', success: '#10b981', background: 'rgba(55, 65, 81, 0.08)' }
  };
  
  let activeTheme = 'blue';

  // ================= UTILS FINANCEIROS =================

  // Formata número para moeda local (BRL)
  const fmt = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Converte string BRL (ex: "822.363,64") em float puro (ex: 822363.64)
  function parseMoney(valStr) {
    if (!valStr) return 0;
    // Remove pontos de milhar e substitui a vírgula por ponto
    let clean = valStr.replace(/\./g, '').replace(',', '.');
    let parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Máscara e formatador em tempo de digitação
  function maskMoney(input) {
    let value = input.value.replace(/\D/g, '');
    if (value === '') {
      input.value = '';
      return;
    }
    let floatVal = parseFloat(value) / 100;
    input.value = floatVal.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Vincular máscara nos inputs monetários
  document.querySelectorAll('.money-input').forEach(input => {
    input.addEventListener('input', () => maskMoney(input));
    // Redesenhar simulação ao alterar valores monetários
    input.addEventListener('change', () => processarSimulacao());
  });

  // Alterações em inputs de texto comuns ou numéricos provocam recalculamento
  [elInputMeses, elInputReforcosMeses, elInputObservacoes].forEach(el => {
    el.addEventListener('change', () => processarSimulacao());
  });

  // --- SELETOR DE TEMAS ---
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

  // --- ATALHOS DE REFORÇOS ---
  elBtnReforcoSemestral.addEventListener('click', () => {
    const totalMeses = parseInt(elInputMeses.value) || 12;
    const meses = [];
    for (let i = 6; i < totalMeses; i += 6) {
      meses.push(i);
    }
    elInputReforcosMeses.value = meses.join(', ');
    processarSimulacao();
  });

  elBtnReforcoAnual.addEventListener('click', () => {
    const totalMeses = parseInt(elInputMeses.value) || 12;
    const meses = [];
    for (let i = 12; i < totalMeses; i += 12) {
      meses.push(i);
    }
    elInputReforcosMeses.value = meses.join(', ');
    processarSimulacao();
  });

  elBtnReforcoLimpar.addEventListener('click', () => {
    elInputReforcosMeses.value = '';
    processarSimulacao();
  });

  // --- SLIDER REAJUSTE CUB ---
  elInputCubRate.addEventListener('input', function () {
    const v = parseFloat(this.value);
    elValCubProjetado.textContent = v.toFixed(1).replace('.', ',') + '% a.a.';
    processarSimulacao();
  });

  // ================= CÁLCULO E RENDERIZAÇÃO DA SIMULAÇÃO =================

  function calcularParcelas(cubAnual, config) {
    const cubMensal = Math.pow(1 + cubAnual / 100, 1 / 12) - 1;
    const meses = [];
    let acum = config.entrada;
    
    for (let m = 1; m <= config.totalMeses; m++) {
      const parcela = config.parcelaBase * Math.pow(1 + cubMensal, m - 1);
      const reforco = config.reforcosMeses.has(m) ? config.valorReforco : 0;
      const desembolso = parcela + reforco;
      acum += desembolso;
      meses.push({ m, parcela, reforco, desembolso, acum });
    }
    return meses;
  }

  function processarSimulacao() {
    // 1. Obter dados dos inputs
    const totalImovel = parseMoney(elInputValorTotal.value);
    const entrada = parseMoney(elInputValorEntrada.value);
    const parcelaBase = parseMoney(elInputValorParcela.value);
    const totalMeses = parseInt(elInputMeses.value) || 1;
    const valorReforco = parseMoney(elInputValorReforco.value);
    const indexador = elInputImovelIndexador.value || 'CUB/SC';

    // Tratar os meses de reforço informados por string
    const stringMeses = elInputReforcosMeses.value;
    const reforcosMeses = new Set(
      stringMeses.split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n) && n > 0 && n <= totalMeses)
    );

    const cubAnual = parseFloat(elInputCubRate.value) || 0;

    // 2. Realizar os cálculos
    const dados = calcularParcelas(cubAnual, {
      entrada,
      parcelaBase,
      totalMeses,
      valorReforco,
      reforcosMeses
    });

    const totalPagoFluxo = dados.length > 0 ? dados[dados.length - 1].acum : entrada;
    const saldoAFinanciar = Math.max(0, totalImovel - totalPagoFluxo);

    // 3. Atualizar textos e KPIs da tela (Online View)
    elValTotal.textContent = fmt(totalImovel);
    elValEntrada.textContent = fmt(entrada);
    elValPago.textContent = fmt(totalPagoFluxo);
    elValSaldo.textContent = fmt(saldoAFinanciar);
    elLblTotalMeses.textContent = `Pago em ${totalMeses} meses (Entrada + Parcelas)`;
    elBadgeMeses.textContent = `${totalMeses} parcelas mensais`;
    
    // Atualizar labels nos textos dinâmicos do indexador
    document.querySelectorAll('.lbl-indexador').forEach(el => {
      el.textContent = indexador;
    });

    // 4. Renderizar Tabela do Dashboard
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

    // 5. Renderizar Gráfico no Dashboard
    desenharGraficoDashboard(dados);
  }

  // ================= DESIGN DO GRÁFICO (CHART.JS) =================

  function desenharGraficoDashboard(dados) {
    const ctx = document.getElementById('grafico-dashboard').getContext('2d');
    const colors = themeColors[activeTheme];

    const labels = dados.map(d => 'M' + d.m);
    const dataNormais = dados.map(d => d.reforco === 0 ? parseFloat(d.parcela.toFixed(2)) : null);
    const dataComReforco = dados.map(d => d.reforco > 0 ? parseFloat(d.desembolso.toFixed(2)) : null);

    if (chartDashboard) {
      chartDashboard.destroy();
    }

    chartDashboard = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Parcela mensal',
            data: dataNormais,
            backgroundColor: colors.primary,
            borderRadius: 4,
            skipNull: true
          },
          {
            label: 'Mês com reforço',
            data: dataComReforco,
            backgroundColor: colors.success,
            borderRadius: 4,
            skipNull: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            padding: 12,
            titleFont: { family: 'Outfit', size: 13, weight: 'bold' },
            bodyFont: { family: 'Inter', size: 12 },
            callbacks: {
              title: ctxs => 'Fluxo Mês ' + dados[ctxs[0].dataIndex].m,
              label: ctxs => {
                const d = dados[ctxs.dataIndex];
                const lines = [
                  `Parcela: ${fmt(d.parcela)}`
                ];
                if (d.reforco > 0) {
                  lines.push(`Reforço: ${fmt(d.reforco)}`);
                }
                lines.push(`Total do Mês: ${fmt(d.desembolso)}`);
                lines.push(`Acumulado: ${fmt(d.acum)}`);
                return lines;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Inter', size: 10 },
              color: '#94a3b8',
              autoSkip: true,
              maxTicksLimit: 20
            }
          },
          y: {
            grid: { color: '#f1f5f9' },
            border: { dash: [4, 4] },
            ticks: {
              font: { family: 'Inter', size: 10 },
              color: '#94a3b8',
              callback: v => 'R$ ' + (v / 1000).toFixed(0) + 'k'
            }
          }
        }
      }
    });
  }

  // ================= GERAÇÃO DO PDF PROFISSIONAL (IMPRESSÃO) =================

  elBtnImprimir.addEventListener('click', () => {
    // 1. Coleta de dados atuais dos controles
    const corretora = elInputCorretora.value || 'Imobiliária Antigravity';
    const clienteNome = elInputClienteNome.value || 'Carlos Eduardo Mendonça';
    const clienteEmail = elInputClienteEmail.value || 'carlos.mendonca@email.com';
    const clienteFone = elInputClienteFone.value || '(47) 99876-5432';

    const imovelNome = elInputImovelNome.value || 'Residencial Splendor Park';
    const imovelUnidade = elInputImovelUnidade.value || 'Apartamento 604';
    const imovelDetalhes = elInputImovelDetalhes.value || '1 suíte + 1 · 61,9 m² · 1 vaga';
    const imovelIndexador = elInputImovelIndexador.value || 'CUB/SC';
    const imovelIndexadorBase = elInputImovelIndexadorBase.value || 'maio/2026 = R$ 3.064,10';

    const totalImovel = parseMoney(elInputValorTotal.value);
    const entrada = parseMoney(elInputValorEntrada.value);
    const parcelaBase = parseMoney(elInputValorParcela.value);
    const totalMeses = parseInt(elInputMeses.value) || 1;
    const valorReforco = parseMoney(elInputValorReforco.value);
    const cubAnual = parseFloat(elInputCubRate.value) || 0;
    const observacoes = elInputObservacoes.value || '';

    // Tratar reforços
    const reforcosMeses = new Set(
      elInputReforcosMeses.value.split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n) && n > 0 && n <= totalMeses)
    );

    // Executa recálculo para gerar os dados do PDF
    const dados = calcularParcelas(cubAnual, {
      entrada,
      parcelaBase,
      totalMeses,
      valorReforco,
      reforcosMeses
    });

    const totalPagoFluxo = dados.length > 0 ? dados[dados.length - 1].acum : entrada;
    const saldoAFinanciar = Math.max(0, totalImovel - totalPagoFluxo);

    // 2. Preenchimento de Textos Dinâmicos do PDF
    document.getElementById('print-txt-corretora').textContent = corretora;
    document.getElementById('print-data-emissao').textContent = new Date().toLocaleDateString('pt-BR');
    
    document.getElementById('print-txt-cliente-nome').textContent = clienteNome;
    document.getElementById('print-txt-cliente-email').textContent = clienteEmail;
    document.getElementById('print-txt-cliente-fone').textContent = clienteFone;

    document.getElementById('print-txt-imovel-nome').textContent = imovelNome;
    document.getElementById('print-txt-imovel-unidade').textContent = imovelUnidade;
    document.getElementById('print-txt-imovel-detalhes').textContent = imovelDetalhes;

    document.getElementById('print-val-total').textContent = fmt(totalImovel);
    document.getElementById('print-val-entrada').textContent = fmt(entrada);
    document.getElementById('print-val-pago-fluxo').textContent = fmt(totalPagoFluxo);
    document.getElementById('print-val-saldo-chaves').textContent = fmt(saldoAFinanciar);
    document.getElementById('print-lbl-reajuste').textContent = `Projeção: ${cubAnual.toFixed(1).replace('.', ',')}% a.a. indexado ao ${imovelIndexador}`;

    document.getElementById('print-val-cub-estimado').textContent = cubAnual.toFixed(1).replace('.', ',') + '% a.a.';
    document.getElementById('print-val-indexador-nome').textContent = imovelIndexador;
    document.getElementById('print-val-indexador-base').textContent = imovelIndexadorBase;

    document.getElementById('print-txt-observacoes').textContent = observacoes;
    document.getElementById('print-txt-signature-cliente').textContent = clienteNome;
    document.getElementById('print-txt-signature-corretora').textContent = corretora;

    // 3. Montar Tabela do PDF
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

    // 4. Desenhar Gráfico do PDF (Impresso)
    desenharGraficoPrint(dados);

    // 5. Acionar Diálogo de Impressão do Sistema
    // Pequeno atraso para garantir que a tabela e o gráfico estejam 100% desenhados
    setTimeout(() => {
      window.print();
    }, 300);
  });

  function desenharGraficoPrint(dados) {
    const elPrintContainer = document.getElementById('print-template');
    
    // Temporariamente tornar visível na viewport invisível para o Chart.js conseguir calcular dimensões
    const originalDisplay = elPrintContainer.style.display;
    elPrintContainer.style.display = 'block';

    const ctx = document.getElementById('grafico-print').getContext('2d');
    const colors = themeColors[activeTheme];

    const labels = dados.map(d => 'M' + d.m);
    const dataNormais = dados.map(d => d.reforco === 0 ? parseFloat(d.parcela.toFixed(2)) : null);
    const dataComReforco = dados.map(d => d.reforco > 0 ? parseFloat(d.desembolso.toFixed(2)) : null);

    if (chartPrint) {
      chartPrint.destroy();
    }

    chartPrint = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Parcela mensal',
            data: dataNormais,
            backgroundColor: colors.primary,
            borderRadius: 3,
            skipNull: true
          },
          {
            label: 'Mês com reforço',
            data: dataComReforco,
            backgroundColor: colors.success,
            borderRadius: 3,
            skipNull: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // Sem animação para renderização instantânea do PDF
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Inter', size: 9 },
              color: '#334155',
              autoSkip: true,
              maxTicksLimit: 25
            }
          },
          y: {
            grid: { color: '#e2e8f0' },
            ticks: {
              font: { family: 'Inter', size: 9 },
              color: '#334155',
              callback: v => 'R$ ' + (v / 1000).toFixed(0) + 'k'
            }
          }
        }
      }
    });

    // Restaurar display original
    elPrintContainer.style.display = originalDisplay;
  }

  // --- PROCESSAR SIMULAÇÃO INICIAL NA CARGA ---
  processarSimulacao();
});
