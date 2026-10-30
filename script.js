/* ==========================================================
   A Ilha das Frações — script.js
   Lógica do jogo, 12 questões fixas revisadas, ilustrações SVG
   matemáticas, pontuação, estrelas e persistência em localStorage.
   ========================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "ilhaDasFracoes_save_v1"; // mesma chave da v1: partidas antigas são migradas, não apagadas
  const CORRUPTED_BACKUP_KEY = "ilhaDasFracoes_save_v1_corrompido";
  const SAVE_VERSION = 2; // v2: estrelas fracionadas (1 ou 0,5) por questão
  const POINTS_FIRST_TRY = 10;
  const POINTS_RETRY = 5;
  const STARS_FIRST_TRY = 1;
  const STARS_RETRY = 0.5;
  const NEXT_BUTTON_DELAY_MS = 450; // evita que um clique/Enter repetido avance sem querer
  const WRONG_FLASH_MS = 1300; // duração do destaque forte da alternativa errada
  const QUESTIONS_PER_PHASE = 4;
  const TOTAL_PHASES = 3;
  const TOTAL_QUESTIONS = TOTAL_PHASES * QUESTIONS_PER_PHASE;

  /* ----------------------------------------------------------
     Utilitários de formatação matemática e SVG
     ---------------------------------------------------------- */

  /**
   * Formata uma fração a/b em HTML empilhado acessível.
   */
  function frac(num, den, srText) {
    const label = srText || `${num} sobre ${den}`;
    return `<span class="frac" role="math" aria-label="${label}"><span class="frac-num" aria-hidden="true">${num}</span><span class="frac-den" aria-hidden="true">${den}</span></span>`;
  }

  /**
   * Gera um SVG de barra horizontal dividida em `total` partes iguais.
   * @param {number} total - Denominador (total de partes iguais).
   * @param {Array<string>} partStates - Estado de cada parte: 'a' | 'b' | 'c' | 'cut' | 'empty'
   * @param {string} ariaLabel - Descrição acessível da figura.
   */
  function svgBar(total, partStates, ariaLabel) {
    const width = 320;
    const height = 68;
    const pad = 6;
    const innerW = width - pad * 2;
    const innerH = height - pad * 2;
    const partW = innerW / total;

    const palette = {
      a: "#FFB703",
      b: "#3A86FF",
      c: "#9C6644",
      cut: "#FFE3A3",
      empty: "#FFFFFF"
    };

    let rects = "";
    let overlays = "";

    for (let i = 0; i < total; i++) {
      const state = partStates[i] || "empty";
      const x = pad + i * partW;
      const fill = palette[state] || palette.empty;
      rects += `<rect x="${x.toFixed(2)}" y="${pad}" width="${partW.toFixed(2)}" height="${innerH}" fill="${fill}" />`;

      if (state === "b") {
        // Listras diagonais suaves para diferenciar segunda parcela mesmo sem depender só de cor
        const cx = x + partW / 2;
        const cy = pad + innerH / 2;
        overlays += `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="6" fill="#FFFFFF" opacity="0.65" />`;
      } else if (state === "cut") {
        // Marcação de parte retirada/consumida (X tracejado)
        const x1 = x + 8;
        const y1 = pad + 8;
        const x2 = x + partW - 8;
        const y2 = pad + innerH - 8;
        overlays += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} M${x2.toFixed(1)} ${y1.toFixed(1)} L${x1.toFixed(1)} ${y2.toFixed(1)}" stroke="#C2410C" stroke-width="3.5" stroke-linecap="round"/>`;
      }
    }

    let dividers = "";
    for (let i = 1; i < total; i++) {
      const x = pad + i * partW;
      dividers += `<line x1="${x.toFixed(2)}" y1="${pad}" x2="${x.toFixed(2)}" y2="${pad + innerH}" stroke="#23314A" stroke-width="3"/>`;
    }

    return `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${ariaLabel}">
        <defs>
          <clipPath id="clip-bar-${total}-${Math.random().toString(36).slice(2, 7)}">
            <rect x="${pad}" y="${pad}" width="${innerW}" height="${innerH}" rx="10"/>
          </clipPath>
        </defs>
        <g>
          ${rects}
          ${overlays}
          ${dividers}
        </g>
        <rect x="${pad}" y="${pad}" width="${innerW}" height="${innerH}" rx="10" fill="none" stroke="#23314A" stroke-width="4"/>
      </svg>
    `;
  }

  /**
   * Gera um SVG de círculo (pizza/roda) dividido em `total` fatias iguais.
   * @param {number} total - Total de fatias iguais.
   * @param {number} shaded - Quantidade de fatias pintadas (ou array de estados).
   * @param {string} color - Cor principal das fatias pintadas.
   * @param {string} ariaLabel - Descrição acessível.
   */
  function svgCircle(total, shaded, color, ariaLabel) {
    const size = 160;
    const cx = size / 2;
    const cy = size / 2;
    const r = 68;

    let slices = "";
    for (let i = 0; i < total; i++) {
      const isFilled = Array.isArray(shaded) ? Boolean(shaded[i]) : i < shaded;
      const fill = isFilled ? color : "#FFFFFF";
      const startAngle = (-90 + (i * 360) / total) * (Math.PI / 180);
      const endAngle = (-90 + ((i + 1) * 360) / total) * (Math.PI / 180);
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = 360 / total > 180 ? 1 : 0;

      const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
      slices += `<path d="${d}" fill="${fill}" stroke="#23314A" stroke-width="3.2" stroke-linejoin="round"/>`;
    }

    return `
      <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="${ariaLabel}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF"/>
        ${slices}
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#23314A" stroke-width="4"/>
      </svg>
    `;
  }

  /**
   * Gera um SVG de estrela inteira, meia estrela ou vazia.
   * @param {number|boolean} value - 1 (ou true) = inteira, 0.5 = meia, 0 (ou false) = vazia.
   */
  let starUid = 0;
  function svgStar(value) {
    const amount = value === true ? 1 : value === false ? 0 : Number(value) || 0;
    const path = "M24 4 L30.2 16.6 L44 18.6 L34 28.4 L36.4 42.2 L24 35.6 L11.6 42.2 L14 28.4 L4 18.6 L17.8 16.6 Z";

    if (amount >= 1) {
      return `<svg class="star star-full" viewBox="0 0 48 48" aria-hidden="true"><path d="${path}" fill="#FFD23F" stroke="#B7791F" stroke-width="3.5" stroke-linejoin="round"/></svg>`;
    }
    if (amount > 0) {
      // Metade esquerda dourada e metade direita cinza (id único para não colidir entre SVGs)
      const id = `half-star-${++starUid}`;
      return `<svg class="star star-half" viewBox="0 0 48 48" aria-hidden="true">
        <defs><linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0.5" stop-color="#FFD23F"/><stop offset="0.5" stop-color="#E2E8F0"/>
        </linearGradient></defs>
        <path d="${path}" fill="url(#${id})" stroke="#B7791F" stroke-width="3.5" stroke-linejoin="round"/>
        <line x1="24" y1="6" x2="24" y2="35" stroke="#B7791F" stroke-width="2" stroke-dasharray="3 3"/>
      </svg>`;
    }
    return `<svg class="star star-empty" viewBox="0 0 48 48" aria-hidden="true"><path d="${path}" fill="#E2E8F0" stroke="#94A3B8" stroke-width="3.5" stroke-linejoin="round"/></svg>`;
  }

  /** Lista de estrelas pequenas (inteiras, meias ou vazias) para mapa e resumos. */
  function starIconsHTML(values) {
    return `<span class="mini-stars">${values.map((v) => svgStar(v)).join("")}</span>`;
  }

  /** Formata estrelas no padrão brasileiro: 7 → "7", 7.5 → "7,5". */
  function formatStars(n) {
    const rounded = Math.round(n * 2) / 2;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
  }

  /** Texto amigável para a recompensa de uma questão. */
  function starRewardText(stars) {
    return stars >= 1 ? "1 estrela inteira" : "meia estrela";
  }

  /* ----------------------------------------------------------
     Definição das 3 Regiões (Fases) e 12 Questões Fixas
     ---------------------------------------------------------- */

  const PHASES = [
    {
      id: 0,
      slug: "pradaria",
      name: "Pradaria das Frações",
      shortName: "1. Pradaria",
      icon: "assets/icone-pradaria.svg",
      mapPos: { x: "30%", y: "72%" },
      description: "Reconheça frações em figuras divididas em partes iguais, numerador e denominador.",
      questions: [
        {
          id: "p1q1",
          tag: "Pradaria • Partes de um todo",
          prompt: "Para atravessar a ponte da Pradaria, observe a barra de madeira dividida em <strong>4 partes iguais</strong>, com <strong>3 partes pintadas</strong> de amarelo. Que fração da barra está pintada?",
          figure: () => `
            <div class="figure figure-column">
              <figure class="fig-item fig-bar">
                ${svgBar(4, ["a", "a", "a", "empty"], "Barra dividida em 4 partes iguais, com 3 partes pintadas de amarelo e 1 parte em branco.")}
                <figcaption>3 de 4 partes iguais pintadas</figcaption>
              </figure>
            </div>
          `,
          options: [
            { html: frac(1, 4, "1 quarto") },
            { html: frac(3, 4, "3 quartos") },
            { html: frac(4, 3, "4 terços") },
            { html: frac(3, 1, "3 sobre 1") }
          ],
          correct: 1,
          hint: "Dica: conte em quantas partes iguais a barra inteira foi dividida (esse número vai embaixo) e quantas partes estão pintadas (esse número vai em cima).",
          explanation: `A barra inteira foi dividida em <strong>4 partes iguais</strong> (denominador 4) e <strong>3 partes</strong> estão pintadas (numerador 3). Por isso, a fração é ${frac(3, 4)}.`
        },
        {
          id: "p1q2",
          tag: "Pradaria • Numerador",
          prompt: `O explorador encontrou uma roda de pedra com a fração ${frac(2, 5, "2 quintos")} gravada. Nessa fração, qual número é o <strong>numerador</strong> e o que ele indica?`,
          figure: () => `
            <div class="figure">
              <figure class="fig-item fig-circle">
                ${svgCircle(5, 2, "#4CC46A", "Círculo dividido em 5 fatias iguais, com 2 fatias pintadas de verde.")}
                <figcaption>${frac(2, 5)}</figcaption>
              </figure>
            </div>
          `,
          options: [
            { html: "É o <strong>2</strong>, que indica quantas partes foram pintadas.", isText: true },
            { html: "É o <strong>5</strong>, que indica o total de partes iguais.", isText: true },
            { html: "É o <strong>5</strong>, que indica quantas partes foram pintadas.", isText: true },
            { html: "É o <strong>7</strong>, porque somamos 2 + 5.", isText: true }
          ],
          correct: 0,
          hint: "Dica: o numerador fica na parte de cima da fração e mostra quantas partes estamos considerando.",
          explanation: `Em ${frac(2, 5)}, o <strong>numerador é o 2</strong> (o número de cima). Ele indica quantas partes iguais foram pintadas ou escolhidas.`
        },
        {
          id: "p1q3",
          tag: "Pradaria • Denominador",
          prompt: "No piquenique da Pradaria, uma torta foi cortada em <strong>6 fatias iguais</strong>. Cinco fatias estão na bandeja. Qual é o <strong>denominador</strong> da fração que representa essas fatias?",
          figure: () => `
            <div class="figure">
              <figure class="fig-item fig-circle">
                ${svgCircle(6, 5, "#FF8C42", "Torta circular dividida em 6 fatias iguais, com 5 fatias pintadas de laranja.")}
                <figcaption>5 fatias em uma torta de 6 partes iguais</figcaption>
              </figure>
            </div>
          `,
          options: [
            { html: "<strong>1</strong> (a fatia que falta)", isText: true },
            { html: "<strong>5</strong> (as fatias pintadas)", isText: true },
            { html: "<strong>6</strong> (o total de fatias iguais da torta)", isText: true },
            { html: "<strong>11</strong> (a soma de 5 com 6)", isText: true }
          ],
          correct: 2,
          hint: "Dica: o denominador fica embaixo e mostra em quantas partes iguais a figura inteira foi dividida.",
          explanation: `O <strong>denominador é 6</strong>, porque a torta inteira foi dividida em 6 fatias iguais. A fração representada é ${frac(5, 6)}.`
        },
        {
          id: "p1q4",
          tag: "Pradaria • Representação visual",
          prompt: `O portão da Pradaria pede que você acenda exatamente ${frac(5, 8, "5 oitavos")} dos blocos de cristal. Qual figura tem <strong>5 de 8 partes iguais</strong> pintadas?`,
          figure: null,
          options: [
            {
              isFigure: true,
              html: svgBar(8, ["a", "a", "a", "empty", "empty", "empty", "empty", "empty"], "Opção A: barra com 8 partes iguais e 3 pintadas.")
            },
            {
              isFigure: true,
              html: svgBar(8, ["a", "a", "a", "a", "a", "empty", "empty", "empty"], "Opção B: barra com 8 partes iguais e 5 pintadas.")
            },
            {
              isFigure: true,
              html: svgBar(6, ["a", "a", "a", "a", "a", "empty"], "Opção C: barra com 6 partes iguais e 5 pintadas.")
            },
            {
              isFigure: true,
              html: svgBar(8, ["a", "a", "a", "a", "a", "a", "empty", "empty"], "Opção D: barra com 8 partes iguais e 6 pintadas.")
            }
          ],
          correct: 1,
          hint: "Dica: conte primeiro se a barra tem 8 partes iguais ao todo e depois veja qual delas tem exatamente 5 partes amarelas.",
          explanation: `A alternativa <strong>B</strong> está dividida em <strong>8 partes iguais</strong> (denominador 8) e tem <strong>5 partes pintadas</strong> (numerador 5), representando ${frac(5, 8)}.`
        }
      ]
    },
    {
      id: 1,
      slug: "floresta",
      name: "Floresta dos Desafios",
      shortName: "2. Floresta",
      icon: "assets/icone-floresta.svg",
      mapPos: { x: "68%", y: "50%" },
      description: "Some e subtraia frações com denominadores iguais em desafios na floresta.",
      questions: [
        {
          id: "p2q1",
          tag: "Floresta • Adição de frações",
          prompt: `Na trilha das árvores gigantes, o explorador caminhou ${frac(1, 5, "1 quinto")} do caminho pela manhã e mais ${frac(2, 5, "2 quintos")} à tarde. Qual é o resultado de ${frac(1, 5)} + ${frac(2, 5)}?`,
          figure: () => `
            <div class="figure figure-column">
              <figure class="fig-item fig-bar">
                ${svgBar(5, ["a", "b", "b", "empty", "empty"], "Barra dividida em 5 partes iguais: 1 parte amarela e 2 partes azuis, totalizando 3 partes de 5.")}
              </figure>
              <ul class="fig-legend">
                <li><span class="swatch swatch-a"></span> Manhã: ${frac(1, 5)}</li>
                <li><span class="swatch swatch-b"></span> Tarde: ${frac(2, 5)}</li>
              </ul>
            </div>
          `,
          options: [
            { html: frac(3, 5, "3 quintos") },
            { html: frac(3, 10, "3 décimos") },
            { html: frac(2, 5, "2 quintos") },
            { html: frac(1, 5, "1 quinto") }
          ],
          correct: 0,
          hint: "Dica: quando os denominadores são iguais (5), mantemos o 5 embaixo e somamos apenas os numeradores (1 + 2).",
          explanation: `Como os denominadores são iguais, somamos os numeradores (1 + 2 = 3) e mantemos o denominador 5: ${frac(1, 5)} + ${frac(2, 5)} = ${frac(3, 5)}.`
        },
        {
          id: "p2q2",
          tag: "Floresta • Problema com adição",
          prompt: `Para preparar uma vitamina de frutas na floresta, usamos ${frac(2, 7, "2 sétimos")} da jarra com suco de laranja e ${frac(4, 7, "4 sétimos")} com suco de acerola. Que fração da jarra ficou preenchida ao todo?`,
          figure: () => `
            <div class="figure figure-column">
              <figure class="fig-item fig-bar">
                ${svgBar(7, ["a", "a", "b", "b", "b", "b", "empty"], "Barra dividida em 7 partes iguais: 2 partes amarelas e 4 partes azuis, totalizando 6 partes de 7.")}
              </figure>
              <ul class="fig-legend">
                <li><span class="swatch swatch-a"></span> Laranja: ${frac(2, 7)}</li>
                <li><span class="swatch swatch-b"></span> Acerola: ${frac(4, 7)}</li>
              </ul>
            </div>
          `,
          options: [
            { html: frac(6, 14, "6 catorze avos") },
            { html: frac(2, 7, "2 sétimos") },
            { html: frac(6, 7, "6 sétimos") },
            { html: frac(7, 6, "7 sextos") }
          ],
          correct: 2,
          hint: "Dica: junte as 2 partes de laranja com as 4 partes de acerola. O tamanho de cada parte continua sendo sétimos (7).",
          explanation: `Somamos os numeradores (2 + 4 = 6) e conservamos o denominador 7: ${frac(2, 7)} + ${frac(4, 7)} = ${frac(6, 7)} da jarra.`
        },
        {
          id: "p2q3",
          tag: "Floresta • Subtração de frações",
          prompt: `O cantil do explorador tinha ${frac(7, 8, "7 oitavos")} de água fresca. Depois da subida, ele bebeu ${frac(4, 8, "4 oitavos")}. Quanto restou? Calcule ${frac(7, 8)} − ${frac(4, 8)}:`,
          figure: () => `
            <div class="figure figure-column">
              <figure class="fig-item fig-bar">
                ${svgBar(8, ["a", "a", "a", "cut", "cut", "cut", "cut", "empty"], "Barra dividida em 8 partes iguais: de 7 partes preenchidas, 4 estão marcadas com X, restando 3 partes.")}
              </figure>
              <ul class="fig-legend">
                <li><span class="swatch swatch-a"></span> Restou no cantil</li>
                <li><span class="swatch swatch-cut"></span> Bebeu: ${frac(4, 8)}</li>
              </ul>
            </div>
          `,
          options: [
            { html: frac(3, 0, "3 sobre 0") },
            { html: frac(3, 8, "3 oitavos") },
            { html: frac(11, 8, "11 oitavos") },
            { html: frac(4, 8, "4 oitavos") }
          ],
          correct: 1,
          hint: "Dica: na subtração com denominadores iguais (8), mantemos o 8 embaixo e subtraímos os numeradores (7 − 4).",
          explanation: `Subtraímos os numeradores (7 − 4 = 3) e mantemos o denominador 8: ${frac(7, 8)} − ${frac(4, 8)} = ${frac(3, 8)}.`
        },
        {
          id: "p2q4",
          tag: "Floresta • Completando o inteiro",
          prompt: `Uma ponte de cordas foi dividida em <strong>6 partes iguais</strong>. O explorador já consertou ${frac(5, 6, "5 sextos")} da ponte. Sabendo que a ponte inteira vale ${frac(6, 6, "6 sextos")}, que fração ainda falta consertar?`,
          figure: () => `
            <div class="figure figure-column">
              <figure class="fig-item fig-bar">
                ${svgBar(6, ["a", "a", "a", "a", "a", "empty"], "Barra dividida em 6 partes iguais: 5 partes pintadas e 1 parte em branco.")}
                <figcaption>Consertado: ${frac(5, 6)} • Ponte inteira: ${frac(6, 6)}</figcaption>
              </figure>
            </div>
          `,
          options: [
            { html: frac(1, 6, "1 sexto") },
            { html: frac(5, 6, "5 sextos") },
            { html: frac(1, 12, "1 doze avos") },
            { html: frac(6, 5, "6 quintos") }
          ],
          correct: 0,
          hint: "Dica: olhe para a barra! De 6 partes iguais, 5 já estão prontas. Quantas partes de 6 ainda estão em branco?",
          explanation: `A ponte inteira corresponde a ${frac(6, 6)}. Fazendo ${frac(6, 6)} − ${frac(5, 6)} = ${frac(1, 6)}, vemos que falta apenas <strong>1 parte de 6</strong>.`
        }
      ]
    },
    {
      id: 2,
      slug: "caverna",
      name: "Caverna dos Enigmas",
      shortName: "3. Caverna",
      icon: "assets/icone-caverna.svg",
      mapPos: { x: "37%", y: "27%" },
      description: "Desvende frações equivalentes e enigmas finais para abrir o baú do tesouro.",
      questions: [
        {
          id: "p3q1",
          tag: "Caverna • Frações equivalentes",
          prompt: `Na parede da caverna há dois medalhões do mesmo tamanho. O primeiro tem ${frac(1, 2, "1 meio")} iluminado. O segundo foi dividido em <strong>4 partes iguais</strong> e tem a <strong>mesma quantidade</strong> iluminada. Qual fração equivale a ${frac(1, 2)}?`,
          figure: () => `
            <div class="figure">
              <figure class="fig-item fig-circle">
                ${svgCircle(2, 1, "#FFB703", "Primeiro círculo dividido em 2 partes iguais, com 1 parte pintada.")}
                <figcaption>${frac(1, 2)}</figcaption>
              </figure>
              <span class="fig-op" aria-hidden="true">=</span>
              <figure class="fig-item fig-circle">
                ${svgCircle(4, 2, "#FFB703", "Segundo círculo dividido em 4 partes iguais, com 2 partes pintadas, ocupando a mesma metade.")}
                <figcaption>${frac("?", 4, "quantos quartos")}</figcaption>
              </figure>
            </div>
          `,
          options: [
            { html: frac(1, 4, "1 quarto") },
            { html: frac(2, 4, "2 quartos") },
            { html: frac(3, 4, "3 quartos") },
            { html: frac(4, 2, "4 meios") }
          ],
          correct: 1,
          hint: "Dica: repare no segundo círculo. Quantas das 4 fatias estão pintadas de amarelo para cobrir exatamente a metade?",
          explanation: `${frac(1, 2)} e ${frac(2, 4)} são <strong>frações equivalentes</strong>: representam exatamente a mesma metade do medalhão, mesmo com números diferentes.`
        },
        {
          id: "p3q2",
          tag: "Caverna • Comparando barras equivalentes",
          prompt: `A chave de pedra mostra ${frac(2, 3, "2 terços")} da primeira barra acesos. Na segunda barra, do mesmo tamanho e dividida em <strong>6 partes iguais</strong>, qual fração representa a <strong>mesma parte</strong> acesa?`,
          figure: () => `
            <div class="figure figure-column">
              <figure class="fig-item fig-bar">
                ${svgBar(3, ["a", "a", "empty"], "Primeira barra dividida em 3 partes iguais, com 2 partes pintadas.")}
                <figcaption>${frac(2, 3)}</figcaption>
              </figure>
              <figure class="fig-item fig-bar">
                ${svgBar(6, ["b", "b", "b", "b", "empty", "empty"], "Segunda barra do mesmo tamanho dividida em 6 partes iguais, com 4 partes pintadas alinhadas às 2 partes de cima.")}
                <figcaption>${frac("?", 6, "quantos sextos")}</figcaption>
              </figure>
            </div>
          `,
          options: [
            { html: frac(2, 6, "2 sextos") },
            { html: frac(3, 6, "3 sextos") },
            { html: frac(4, 6, "4 sextos") },
            { html: frac(5, 6, "5 sextos") }
          ],
          correct: 2,
          hint: "Dica: cada 1 parte da barra de cima vale 2 partes da barra de baixo. Conte quantas partes azuis estão acesas!",
          explanation: `Cada terço corresponde a dois sextos. Assim, <strong>4 partes de 6</strong> ocupam o mesmo espaço que <strong>2 partes de 3</strong>: ${frac(2, 3)} = ${frac(4, 6)}.`
        },
        {
          id: "p3q3",
          tag: "Caverna • Enigma de duas etapas",
          prompt: `Uma barra de chocolate mágica tem <strong>10 pedaços iguais</strong>. O explorador comeu ${frac(3, 10, "3 décimos")} na entrada da caverna e depois comeu mais ${frac(2, 10, "2 décimos")}. Que fração da barra <strong>ainda sobrou</strong>?`,
          figure: () => `
            <div class="figure figure-column">
              <figure class="fig-item fig-bar">
                ${svgBar(10, ["cut", "cut", "cut", "cut", "cut", "c", "c", "c", "c", "c"], "Barra dividida em 10 partes iguais: 5 partes marcadas com X (comidas) e 5 partes marrons restantes.")}
              </figure>
              <ul class="fig-legend">
                <li><span class="swatch swatch-cut"></span> Comeu: ${frac(3, 10)} + ${frac(2, 10)}</li>
                <li><span class="swatch swatch-c"></span> Sobrou na barra</li>
              </ul>
            </div>
          `,
          options: [
            { html: frac(5, 10, "5 décimos") },
            { html: frac(3, 10, "3 décimos") },
            { html: frac(8, 10, "8 décimos") },
            { html: frac(5, 20, "5 vinte avos") }
          ],
          correct: 0,
          hint: "Dica: primeiro some o que ele comeu (3/10 + 2/10). Depois veja quantos pedaços dos 10 ainda sobraram!",
          explanation: `Ele comeu ${frac(3, 10)} + ${frac(2, 10)} = ${frac(5, 10)}. Como a barra inteira tem ${frac(10, 10)}, sobraram ${frac(10, 10)} − ${frac(5, 10)} = ${frac(5, 10)} (exatamente a metade!).`
        },
        {
          id: "p3q4",
          tag: "Caverna • O código final do baú",
          prompt: `Último enigma antes do tesouro! Na fechadura do baú, somamos ${frac(2, 8, "2 oitavos")} + ${frac(4, 8, "4 oitavos")} = ${frac(6, 8, "6 oitavos")}. Olhando as duas barras abaixo, qual fração com denominador <strong>4</strong> é <strong>equivalente</strong> a ${frac(6, 8)}?`,
          figure: () => `
            <div class="figure figure-column">
              <figure class="fig-item fig-bar">
                ${svgBar(8, ["a", "a", "a", "a", "a", "a", "empty", "empty"], "Primeira barra dividida em 8 partes iguais, com 6 partes pintadas de amarelo.")}
                <figcaption>${frac(2, 8)} + ${frac(4, 8)} = ${frac(6, 8)}</figcaption>
              </figure>
              <figure class="fig-item fig-bar">
                ${svgBar(4, ["b", "b", "b", "empty"], "Segunda barra do mesmo tamanho dividida em 4 partes iguais, com 3 partes pintadas alinhadas às 6 partes de cima.")}
                <figcaption>${frac("?", 4, "quantos quartos")}</figcaption>
              </figure>
            </div>
          `,
          options: [
            { html: frac(1, 4, "1 quarto") },
            { html: frac(2, 4, "2 quartos") },
            { html: frac(3, 4, "3 quartos") },
            { html: frac(4, 4, "4 quartos") }
          ],
          correct: 2,
          hint: "Dica: compare a barra de 8 partes com a barra de 4 partes logo abaixo. Quantas partes azuis de 4 têm o mesmo comprimento que 6 partes de 8?",
          explanation: `${frac(6, 8)} ocupa exatamente o mesmo tamanho que <strong>3 partes de 4</strong>. Portanto, ${frac(6, 8)} = ${frac(3, 4)} e o baú do tesouro se abriu!`
        }
      ]
    }
  ];

  const QUESTION_BY_ID = {};
  PHASES.forEach((phase) => {
    phase.questions.forEach((q) => {
      QUESTION_BY_ID[q.id] = q;
    });
  });

  /* ----------------------------------------------------------
     Estado do Jogo e Persistência com localStorage
     ---------------------------------------------------------- */

  let storageAvailable = true;

  function checkStorageAvailable() {
    try {
      const testKey = "__ilha_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (_) {
      return false;
    }
  }

  function createEmptyQuestionState() {
    return {
      completed: false,
      attempts: 0, // número de respostas dadas (erradas + a certa)
      points: 0, // 10 (de primeira), 5 (depois) ou 0 (pendente)
      stars: 0, // 1 (de primeira), 0.5 (depois) ou 0 (pendente)
      selectedOption: null, // alternativa correta, quando concluída
      wrongOptions: [] // alternativas erradas já tentadas
    };
  }

  function createDefaultState() {
    const questions = {};
    PHASES.forEach((phase) => {
      phase.questions.forEach((q) => {
        questions[q.id] = createEmptyQuestionState();
      });
    });

    return {
      version: SAVE_VERSION,
      started: false,
      currentScreen: "home",
      currentPhase: 0,
      currentQuestion: 0,
      unlockedPhases: [true, false, false],
      completedPhases: [false, false, false],
      gameCompleted: false,
      totalScore: 0,
      totalStars: 0,
      questions,
      updatedAt: Date.now()
    };
  }

  /**
   * Valida e migra um estado salvo (v1 ou v2). Reconstrói pontuação total,
   * estrelas e desbloqueios a partir das questões, garantindo consistência e
   * impedindo pontos ou estrelas duplicados. Questões concluídas continuam concluídas.
   */
  function normalizeState(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }
    if (raw.questions !== undefined && (typeof raw.questions !== "object" || raw.questions === null)) {
      return null;
    }

    const questions = {};
    let totalScore = 0;
    let totalStars = 0;
    let anyActivity = Boolean(raw.started);

    PHASES.forEach((phase) => {
      phase.questions.forEach((q) => {
        const src = raw.questions ? raw.questions[q.id] : null;
        const qState = createEmptyQuestionState();

        if (src && typeof src === "object") {
          const attempts = Number.isInteger(src.attempts) && src.attempts >= 0 ? Math.min(src.attempts, 99) : 0;
          const completed = src.completed === true;

          const wrongSet = new Set();
          if (Array.isArray(src.wrongOptions)) {
            src.wrongOptions.forEach((idx) => {
              if (Number.isInteger(idx) && idx >= 0 && idx < 4 && idx !== q.correct) {
                wrongSet.add(idx);
              }
            });
          }

          qState.completed = completed;
          qState.wrongOptions = Array.from(wrongSet);

          if (completed) {
            qState.attempts = Math.max(1, attempts, qState.wrongOptions.length + 1);
            // Acerto de primeira = 1 tentativa, nenhuma alternativa errada e nenhum registro
            // anterior de recompensa reduzida (compatível com saves v1, que só tinham "points").
            const firstTry =
              qState.attempts === 1 &&
              qState.wrongOptions.length === 0 &&
              src.points !== POINTS_RETRY &&
              src.stars !== STARS_RETRY;
            qState.points = firstTry ? POINTS_FIRST_TRY : POINTS_RETRY;
            qState.stars = firstTry ? STARS_FIRST_TRY : STARS_RETRY;
            qState.selectedOption = q.correct;
            totalScore += qState.points;
            totalStars += qState.stars;
            anyActivity = true;
          } else {
            qState.attempts = Math.max(attempts, qState.wrongOptions.length);
            qState.points = 0;
            qState.stars = 0;
            qState.selectedOption = null; // no novo fluxo não existe seleção pendente
            if (qState.attempts > 0) {
              anyActivity = true;
            }
          }
        }

        questions[q.id] = qState;
      });
    });

    const completedPhases = PHASES.map((phase) =>
      phase.questions.every((q) => questions[q.id].completed)
    );

    const unlockedPhases = [
      true,
      completedPhases[0],
      completedPhases[0] && completedPhases[1]
    ];

    const gameCompleted = completedPhases.every(Boolean);

    let currentPhase = Number.isInteger(raw.currentPhase) ? raw.currentPhase : 0;
    if (currentPhase < 0 || currentPhase >= TOTAL_PHASES || !unlockedPhases[currentPhase]) {
      currentPhase = unlockedPhases.lastIndexOf(true);
    }

    let currentQuestion = Number.isInteger(raw.currentQuestion) ? raw.currentQuestion : 0;
    if (currentQuestion < 0 || currentQuestion >= QUESTIONS_PER_PHASE) {
      currentQuestion = 0;
    }

    const allowedScreens = ["home", "map", "question", "phase-complete", "final"];
    let currentScreen = allowedScreens.includes(raw.currentScreen) ? raw.currentScreen : "home";
    if (currentScreen === "final" && !gameCompleted) {
      currentScreen = "map";
    }
    if (currentScreen === "phase-complete" && !completedPhases[currentPhase]) {
      currentScreen = "question";
    }

    return {
      version: SAVE_VERSION,
      started: anyActivity,
      currentScreen,
      currentPhase,
      currentQuestion,
      unlockedPhases,
      completedPhases,
      gameCompleted,
      totalScore,
      totalStars,
      questions,
      updatedAt: Date.now()
    };
  }

  let state = createDefaultState();
  let hadCorruptedSave = false;

  function saveState() {
    state.updatedAt = Date.now();
    if (!storageAvailable) return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (_) {
      storageAvailable = false;
      showStorageWarning();
      return false;
    }
  }

  function loadState() {
    storageAvailable = checkStorageAvailable();
    if (!storageAvailable) {
      showStorageWarning();
      return false;
    }
    let rawText = null;
    try {
      rawText = window.localStorage.getItem(STORAGE_KEY);
      if (!rawText) return false;
      const parsed = JSON.parse(rawText);
      const normalized = normalizeState(parsed);
      if (!normalized) throw new Error("Formato de save inválido");
      state = normalized;
      // Regrava o estado validado/migrado (v1 → v2) para manter o armazenamento consistente
      saveState();
      return true;
    } catch (_) {
      // Dados corrompidos ou inválidos: guarda uma cópia de segurança e começa sem travar o jogo
      hadCorruptedSave = true;
      try {
        if (rawText) window.localStorage.setItem(CORRUPTED_BACKUP_KEY, rawText);
      } catch (__) {
        /* sem espaço para a cópia: segue normalmente */
      }
      state = createDefaultState();
      return false;
    }
  }

  function resetToNewGame() {
    state = createDefaultState();
    state.started = true;
    state.currentScreen = "map";
    saveState();
  }

  function hasSavedProgress() {
    if (state.started) return true;
    if (state.totalStars > 0 || state.totalScore > 0) return true;
    return Object.values(state.questions).some((q) => q.completed || q.attempts > 0);
  }

  /* ----------------------------------------------------------
     Referências de DOM
     ---------------------------------------------------------- */

  const screens = {
    home: document.getElementById("screen-home"),
    howto: document.getElementById("screen-howto"),
    map: document.getElementById("screen-map"),
    question: document.getElementById("screen-question"),
    "phase-complete": document.getElementById("screen-phase-complete"),
    final: document.getElementById("screen-final")
  };

  const els = {
    continueInfo: document.getElementById("continue-info"),
    btnContinue: document.getElementById("btn-continue"),
    btnPlay: document.getElementById("btn-play"),
    btnNewGame: document.getElementById("btn-new-game"),
    btnHowto: document.getElementById("btn-howto"),
    btnHowtoBack: document.getElementById("btn-howto-back"),

    mapHint: document.getElementById("map-hint"),
    mapNodes: document.getElementById("map-nodes"),
    mapExplorer: document.getElementById("map-explorer"),
    mapPointer: document.getElementById("map-pointer"),
    mapPointerText: document.getElementById("map-pointer-text"),

    qPhaseName: document.getElementById("q-phase-name"),
    qCounter: document.getElementById("q-counter"),
    qDots: document.getElementById("q-dots"),
    qTag: document.getElementById("q-tag"),
    qPrompt: document.getElementById("q-prompt"),
    qFigure: document.getElementById("q-figure"),
    qInstruction: document.getElementById("q-instruction"),
    qOptions: document.getElementById("q-options"),
    qFeedback: document.getElementById("q-feedback"),
    btnNext: document.getElementById("btn-next"),

    pcIcon: document.getElementById("pc-icon"),
    pcTitle: document.getElementById("pc-title"),
    pcPhaseName: document.getElementById("pc-phase-name"),
    pcStars: document.getElementById("pc-stars"),
    pcStarCount: document.getElementById("pc-star-count"),
    pcScore: document.getElementById("pc-score"),
    pcFirst: document.getElementById("pc-first"),
    pcUnlock: document.getElementById("pc-unlock"),
    btnPcContinue: document.getElementById("btn-pc-continue"),

    finalMessage: document.getElementById("final-message"),
    finalScore: document.getElementById("final-score"),
    finalStars: document.getElementById("final-stars"),
    finalSummary: document.getElementById("final-summary"),
    btnPlayAgain: document.getElementById("btn-play-again"),

    confirmDialog: document.getElementById("confirm-dialog"),
    confirmCancel: document.getElementById("confirm-cancel"),
    confirmOk: document.getElementById("confirm-ok"),

    toast: document.getElementById("toast"),
    storageWarning: document.getElementById("storage-warning"),
    storageClose: document.getElementById("storage-close"),
    confetti: document.getElementById("confetti")
  };

  /* ----------------------------------------------------------
     Feedback visual auxiliar (Toast, Placar, Confete)
     ---------------------------------------------------------- */

  let toastTimer = null;
  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.classList.remove("is-visible");
    }, 3200);
  }

  function showStorageWarning() {
    if (els.storageWarning) {
      els.storageWarning.hidden = false;
    }
  }

  function updateHUD(animateBump) {
    document.querySelectorAll('[data-bind="stars"]').forEach((el) => {
      el.textContent = formatStars(state.totalStars);
      if (animateBump) {
        const pill = el.closest(".pill");
        if (pill) {
          pill.classList.remove("bump");
          void pill.offsetWidth;
          pill.classList.add("bump");
        }
      }
    });
    document.querySelectorAll('[data-bind="score"]').forEach((el) => {
      el.textContent = String(state.totalScore);
    });
  }

  function launchConfetti(count) {
    if (!els.confetti) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    els.confetti.innerHTML = "";
    const colors = ["#FFD23F", "#FF5D73", "#4CC46A", "#3A86FF", "#FF8C42", "#B388EB"];
    const pieces = count || 28;
    for (let i = 0; i < pieces; i++) {
      const span = document.createElement("span");
      span.style.left = `${Math.random() * 100}%`;
      span.style.background = colors[i % colors.length];
      span.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
      span.style.animationDelay = `${Math.random() * 0.35}s`;
      els.confetti.appendChild(span);
    }
    setTimeout(() => {
      if (els.confetti) els.confetti.innerHTML = "";
    }, 3500);
  }

  /* ----------------------------------------------------------
     Navegação entre Telas
     ---------------------------------------------------------- */

  function setThemeForScreen(screenName) {
    let theme = "home";
    if (screenName === "map") {
      theme = "map";
    } else if (screenName === "question" || screenName === "phase-complete") {
      theme = PHASES[state.currentPhase].slug;
    } else if (screenName === "final") {
      theme = "treasure";
    }
    document.body.setAttribute("data-theme", theme);
  }

  function showScreen(screenName, options) {
    const opts = options || {};
    Object.keys(screens).forEach((key) => {
      screens[key].hidden = key !== screenName;
    });

    setThemeForScreen(screenName);
    updateHUD(false);

    if (screenName === "home") {
      renderHome();
    } else if (screenName === "map") {
      renderMap();
    } else if (screenName === "question") {
      renderQuestion();
    } else if (screenName === "phase-complete") {
      renderPhaseComplete();
    } else if (screenName === "final") {
      renderFinal();
    }

    if (screenName !== "howto" && !opts.skipSave) {
      state.currentScreen = screenName;
      saveState();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    const heading = screens[screenName].querySelector("h1, h2");
    if (heading) {
      heading.focus({ preventScroll: true });
    }
  }

  /* ----------------------------------------------------------
     Tela Inicial
     ---------------------------------------------------------- */

  function renderHome() {
    const saved = hasSavedProgress();
    // Sem partida: "Jogar" + "Como jogar". Com partida: "Continuar aventura" + "Nova partida" + "Como jogar".
    els.btnContinue.hidden = !saved;
    els.btnNewGame.hidden = !saved;
    els.btnPlay.hidden = saved;
    els.continueInfo.hidden = !saved;

    if (saved) {
      if (state.gameCompleted) {
        els.continueInfo.innerHTML = `🏆 Aventura concluída! <strong>⭐ ${formatStars(state.totalStars)}/12</strong> • <strong>🪙 ${state.totalScore} pontos</strong>`;
      } else {
        const phaseName = PHASES[state.currentPhase].name;
        els.continueInfo.innerHTML = `🧭 Você parou em <strong>${phaseName}</strong> • ⭐ ${formatStars(state.totalStars)}/12 • 🪙 ${state.totalScore}`;
      }
    }
  }

  function findNextPendingTarget() {
    for (let p = 0; p < TOTAL_PHASES; p++) {
      if (!state.unlockedPhases[p]) break;
      const phase = PHASES[p];
      for (let q = 0; q < QUESTIONS_PER_PHASE; q++) {
        const qObj = phase.questions[q];
        if (!state.questions[qObj.id].completed) {
          return { phaseIndex: p, questionIndex: q };
        }
      }
    }
    return null;
  }

  function handleContinueGame() {
    if (state.gameCompleted) {
      showScreen("final");
      return;
    }
    if (
      state.currentScreen === "question" &&
      state.unlockedPhases[state.currentPhase]
    ) {
      showScreen("question");
      return;
    }
    if (
      state.currentScreen === "phase-complete" &&
      state.completedPhases[state.currentPhase]
    ) {
      showScreen("phase-complete");
      return;
    }
    showScreen("map");
  }

  /* ----------------------------------------------------------
     Mapa da Aventura
     ---------------------------------------------------------- */

  function getPhaseStats(phaseIndex) {
    const phase = PHASES[phaseIndex];
    let completedCount = 0;
    let points = 0;
    let firstTryCount = 0;
    let stars = 0;
    const starValues = [];

    phase.questions.forEach((q) => {
      const qs = state.questions[q.id];
      starValues.push(qs.completed ? qs.stars : 0);
      if (qs.completed) {
        completedCount += 1;
        points += qs.points;
        stars += qs.stars;
        if (qs.stars === STARS_FIRST_TRY) {
          firstTryCount += 1;
        }
      }
    });

    return { completedCount, points, firstTryCount, stars, starValues };
  }

  /** Metade da altura de um nó do mapa, em % da altura do mapa (nó = 21% da largura; mapa 600×700). */
  const NODE_HALF_HEIGHT = 21 * (600 / 700) / 2;
  const TREASURE_POS = { x: "72%", y: "13%" };

  function renderMap() {
    els.mapNodes.innerHTML = "";

    // Região que deve receber o destaque (a próxima com questões pendentes)
    const target = findNextPendingTarget();
    const nextPhaseIdx = state.gameCompleted ? -1 : target ? target.phaseIndex : -1;

    PHASES.forEach((phase, index) => {
      const unlocked = state.unlockedPhases[index];
      const completed = state.completedPhases[index];
      const stats = getPhaseStats(index);
      const inProgress = unlocked && !completed && stats.completedCount > 0;

      let stateClass = "is-locked";
      let badgeText = "🔒";
      let statusLabel = "Bloqueada";

      if (completed) {
        stateClass = "is-done";
        badgeText = "✓";
        statusLabel = "Concluída";
      } else if (inProgress) {
        stateClass = "is-progress";
        badgeText = `${stats.completedCount}/4`;
        statusLabel = `Em andamento (${stats.completedCount}/4)`;
      } else if (unlocked) {
        stateClass = "is-available";
        badgeText = "★";
        statusLabel = "Disponível";
      }

      const isNext = index === nextPhaseIdx;

      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `map-node ${stateClass}${isNext ? " is-next" : ""}`;
      btn.style.setProperty("--x", phase.mapPos.x);
      btn.style.setProperty("--y", phase.mapPos.y);
      btn.setAttribute(
        "aria-label",
        `${phase.name} — ${statusLabel}, ${formatStars(stats.stars)} de 4 estrelas${isNext ? ". Sua próxima aventura é aqui!" : ""}`
      );

      btn.innerHTML = `
        <img src="${phase.icon}" alt="" width="120" height="120">
        <span class="node-badge" aria-hidden="true">${badgeText}</span>
        <span class="node-label">
          ${phase.shortName}
          <small>${statusLabel}</small>
          <small class="node-stars" aria-hidden="true">${starIconsHTML(stats.starValues)}</small>
        </span>
      `;

      btn.addEventListener("click", () => {
        if (!unlocked) {
          const prevName = PHASES[index - 1].name;
          showToast(`🔒 Conclua "${prevName}" primeiro para liberar esta região!`);
          return;
        }
        openPhase(index);
      });

      li.appendChild(btn);
      els.mapNodes.appendChild(li);
    });

    // Nó do Tesouro Final no topo do mapa
    const treasureLi = document.createElement("li");
    const treasureBtn = document.createElement("button");
    treasureBtn.type = "button";
    const treasureUnlocked = state.gameCompleted;
    treasureBtn.className = `map-node is-treasure ${treasureUnlocked ? "is-done is-next" : "is-locked"}`;
    treasureBtn.style.setProperty("--x", TREASURE_POS.x);
    treasureBtn.style.setProperty("--y", TREASURE_POS.y);
    treasureBtn.setAttribute(
      "aria-label",
      treasureUnlocked
        ? "O Tesouro Matemático — Desbloqueado! Clique para abrir"
        : "O Tesouro Matemático — Bloqueado até concluir as 3 regiões"
    );
    treasureBtn.innerHTML = `
      <img src="assets/bau-tesouro.svg" alt="" width="120" height="110">
      <span class="node-badge" aria-hidden="true">${treasureUnlocked ? "🏆" : "🔒"}</span>
      <span class="node-label">
        Tesouro
        <small>${treasureUnlocked ? "Aberto!" : "Complete as 3 fases"}</small>
      </span>
    `;
    treasureBtn.addEventListener("click", () => {
      if (!treasureUnlocked) {
        showToast("🗺️ Complete as 3 regiões da ilha para abrir o Tesouro Matemático!");
        return;
      }
      showScreen("final");
    });
    treasureLi.appendChild(treasureBtn);
    els.mapNodes.appendChild(treasureLi);

    // Posiciona o pequeno explorador e a seta indicadora na região atual da jornada
    let explorerPos = PHASES[0].mapPos;
    let pointerPos = PHASES[0].mapPos;
    let pointerLabel = "Toque aqui para começar!";

    if (state.gameCompleted) {
      explorerPos = TREASURE_POS;
      pointerPos = TREASURE_POS;
      pointerLabel = "Abra o seu tesouro!";
      els.mapHint.innerHTML =
        "🎉 <strong>Todas as regiões concluídas!</strong> Toque no <strong>Baú do Tesouro</strong> ou revise qualquer fase.";
    } else {
      const targetPhaseIdx = nextPhaseIdx !== -1 ? nextPhaseIdx : state.currentPhase;
      const targetPhase = PHASES[targetPhaseIdx];
      const targetStats = getPhaseStats(targetPhaseIdx);
      explorerPos = targetPhase.mapPos;
      pointerPos = targetPhase.mapPos;

      if (targetPhaseIdx === 0 && targetStats.completedCount === 0 && state.totalStars === 0) {
        pointerLabel = "Toque aqui para começar!";
        els.mapHint.innerHTML = `👆 <strong>Toque aqui para começar!</strong> Entre na <strong>${targetPhase.name}</strong>.`;
      } else if (targetStats.completedCount > 0) {
        pointerLabel = "Continue aqui!";
        els.mapHint.innerHTML = `🧭 <strong>Sua aventura continua aqui:</strong> <strong>${targetPhase.name}</strong> (${targetStats.completedCount}/4).`;
      } else {
        pointerLabel = "Sua próxima aventura é aqui!";
        els.mapHint.innerHTML = `✨ <strong>Sua próxima aventura é aqui:</strong> <strong>${targetPhase.name}</strong>!`;
      }
    }

    els.mapExplorer.style.setProperty("--ex", explorerPos.x);
    els.mapExplorer.style.setProperty("--ey", explorerPos.y);

    if (els.mapPointer) {
      const topPercent = Math.max(6, parseFloat(pointerPos.y) - NODE_HALF_HEIGHT - 2);
      els.mapPointer.style.setProperty("--px", pointerPos.x);
      els.mapPointer.style.setProperty("--py", `${topPercent.toFixed(2)}%`);
      if (els.mapPointerText) {
        els.mapPointerText.textContent = pointerLabel;
      }
      els.mapPointer.hidden = false;
    }
  }

  function openPhase(phaseIndex) {
    state.started = true;
    state.currentPhase = phaseIndex;

    const phase = PHASES[phaseIndex];
    const firstPendingIdx = phase.questions.findIndex(
      (q) => !state.questions[q.id].completed
    );

    // Se a fase ainda tem questões pendentes, abre na primeira pendente; se já foi concluída, abre na 1ª para revisão
    state.currentQuestion = firstPendingIdx !== -1 ? firstPendingIdx : 0;
    saveState();
    showScreen("question");
  }

  /* ----------------------------------------------------------
     Tela de Desafio Matemático (Questões)
     ---------------------------------------------------------- */

  let lastWrongOption = null;
  let wrongFlashTimer = null;
  let lastCorrectTimestamp = 0;
  let isAdvancingQuestion = false;

  function getCurrentQuestionObj() {
    return PHASES[state.currentPhase].questions[state.currentQuestion];
  }

  function renderQuestion() {
    clearTimeout(wrongFlashTimer);
    lastWrongOption = null;
    isAdvancingQuestion = false;

    const phase = PHASES[state.currentPhase];
    const qIndex = state.currentQuestion;
    const q = phase.questions[qIndex];
    const qState = state.questions[q.id];

    els.qPhaseName.textContent = phase.name;
    els.qCounter.textContent = `Questão ${qIndex + 1} de ${QUESTIONS_PER_PHASE}`;

    // Bolinhas de progresso da fase (mostram ★ cheia ou ½ estrela conforme conquista)
    els.qDots.innerHTML = "";
    phase.questions.forEach((pq, idx) => {
      const dot = document.createElement("li");
      const pqState = state.questions[pq.id];
      const done = pqState.completed;
      if (done) {
        dot.classList.add("is-done");
        if (pqState.stars === STARS_RETRY) {
          dot.classList.add("is-half");
        }
      }
      if (idx === qIndex) dot.classList.add("is-current");
      dot.textContent = done ? "★" : String(idx + 1);
      els.qDots.appendChild(dot);
    });

    els.qTag.textContent = q.tag;
    els.qPrompt.innerHTML = q.prompt;
    els.qFigure.innerHTML = typeof q.figure === "function" ? q.figure() : "";

    renderOptions(q, qState);
    renderFeedbackArea(q, qState);
    updateQuestionButtons(q, qState);
  }

  function renderOptions(q, qState) {
    const letters = ["A", "B", "C", "D"];
    els.qOptions.innerHTML = "";

    if (els.qInstruction) {
      if (qState.completed) {
        els.qInstruction.textContent = "Questão concluída! Veja a explicação abaixo:";
      } else if (qState.wrongOptions.length > 0) {
        els.qInstruction.textContent = "Leia a dica e toque em outra alternativa:";
      } else {
        els.qInstruction.textContent = "Toque na resposta certa:";
      }
    }

    q.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      if (opt.isText) btn.classList.add("option-text");
      if (opt.isFigure) btn.classList.add("option-figure");

      const isWrong = qState.wrongOptions.includes(idx);
      const isCorrectDone = qState.completed && idx === q.correct;

      let statusIcon = "";
      if (isCorrectDone) {
        btn.classList.add("is-correct");
        statusIcon = "✓";
      } else if (isWrong) {
        btn.classList.add("is-wrong");
        if (lastWrongOption === idx) {
          btn.classList.add("is-wrong-fresh", "shake");
        }
        statusIcon = "✗";
      }

      btn.disabled = qState.completed || isWrong;
      btn.setAttribute("aria-pressed", isCorrectDone ? "true" : "false");

      btn.innerHTML = `
        <span class="opt-letter" aria-hidden="true">${letters[idx]}</span>
        <span class="opt-body">${opt.html}</span>
        <span class="opt-status" aria-hidden="true">${statusIcon}</span>
      `;

      btn.addEventListener("click", () => answerOption(idx));
      els.qOptions.appendChild(btn);
    });
  }

  function renderFeedbackArea(q, qState) {
    els.qFeedback.className = "feedback";
    els.qFeedback.innerHTML = "";

    if (qState.completed) {
      els.qFeedback.classList.add("is-correct");
      const starLabel = starRewardText(qState.stars);
      els.qFeedback.innerHTML = `
        <p class="feedback-title">
          <span class="fb-icon" aria-hidden="true">🌟</span>
          <span>Muito bem! Você acertou!</span>
        </p>
        <p class="reward">
          <span class="star-pop">${svgStar(qState.stars)}</span>
          <span>Você conquistou <strong>${starLabel} (${formatStars(qState.stars)} ⭐)</strong> e <strong>+${qState.points} pontos</strong>!</span>
        </p>
        <p class="explain">${q.explanation}</p>
      `;
    } else if (qState.wrongOptions.length > 0) {
      els.qFeedback.classList.add("is-wrong");
      els.qFeedback.innerHTML = `
        <p class="feedback-title">
          <span class="fb-icon" aria-hidden="true">💡</span>
          <span>Quase lá! Vamos pensar juntos?</span>
        </p>
        <p class="hint">${q.hint}</p>
        <p class="feedback-try-again">Escolha outra alternativa para tentar de novo!</p>
      `;
    }
  }

  function updateQuestionButtons(q, qState) {
    if (qState.completed) {
      els.btnNext.hidden = false;
      const isLastInPhase = state.currentQuestion === QUESTIONS_PER_PHASE - 1;
      els.btnNext.textContent = isLastInPhase
        ? "Concluir fase 🎉"
        : "Próxima questão ➜";
    } else {
      els.btnNext.hidden = true;
    }
  }

  /**
   * Centraliza a verificação imediata da alternativa escolhida
   * (seja por clique, toque ou teclado).
   */
  function answerOption(optionIndex) {
    const q = getCurrentQuestionObj();
    const qState = state.questions[q.id];

    // Impede novas tentativas ou duplicação de pontos/estrelas se já estiver concluída ou já foi tentada
    if (!q || qState.completed || qState.wrongOptions.includes(optionIndex)) {
      return;
    }
    if (optionIndex < 0 || optionIndex >= q.options.length) {
      return;
    }

    clearTimeout(wrongFlashTimer);
    state.started = true;
    qState.attempts += 1;

    if (optionIndex === q.correct) {
      const isFirstTry = qState.attempts === 1 && qState.wrongOptions.length === 0;
      const earnedPoints = isFirstTry ? POINTS_FIRST_TRY : POINTS_RETRY;
      const earnedStars = isFirstTry ? STARS_FIRST_TRY : STARS_RETRY;

      qState.completed = true;
      qState.points = earnedPoints;
      qState.stars = earnedStars;
      qState.selectedOption = optionIndex;
      lastWrongOption = null;
      lastCorrectTimestamp = Date.now();

      state.totalScore += earnedPoints;
      state.totalStars = Math.round((state.totalStars + earnedStars) * 2) / 2;

      // Atualiza bolinha de progresso da questão atual
      const phase = PHASES[state.currentPhase];
      const phaseDone = phase.questions.every((pq) => state.questions[pq.id].completed);
      if (phaseDone) {
        state.completedPhases[state.currentPhase] = true;
        if (state.currentPhase + 1 < TOTAL_PHASES) {
          state.unlockedPhases[state.currentPhase + 1] = true;
        }
        state.gameCompleted = state.completedPhases.every(Boolean);
      }

      saveState();
      updateHUD(true);
      renderQuestion();

      const optionBtns = els.qOptions.querySelectorAll(".option");
      if (optionBtns[optionIndex]) {
        optionBtns[optionIndex].classList.add("pop");
      }
    } else {
      if (!qState.wrongOptions.includes(optionIndex)) {
        qState.wrongOptions.push(optionIndex);
      }
      qState.selectedOption = null;
      lastWrongOption = optionIndex;
      saveState();

      renderOptions(q, qState);
      renderFeedbackArea(q, qState);
      updateQuestionButtons(q, qState);

      wrongFlashTimer = setTimeout(() => {
        lastWrongOption = null;
        const freshBtn = els.qOptions.querySelector(".option.is-wrong-fresh");
        if (freshBtn) {
          freshBtn.classList.remove("is-wrong-fresh");
        }
      }, WRONG_FLASH_MS);
    }
  }

  function nextQuestionOrFinishPhase() {
    const q = getCurrentQuestionObj();
    const qState = state.questions[q.id];
    // Só avança se a questão atual estiver concluída e não houver transição duplicada em andamento
    if (!qState || !qState.completed || isAdvancingQuestion) {
      return;
    }
    if (Date.now() - lastCorrectTimestamp < NEXT_BUTTON_DELAY_MS) {
      return;
    }

    isAdvancingQuestion = true;

    if (state.currentQuestion + 1 < QUESTIONS_PER_PHASE) {
      state.currentQuestion += 1;
      saveState();
      renderQuestion();
      window.scrollTo({ top: 0, behavior: "smooth" });
      els.qPrompt.focus({ preventScroll: true });
    } else {
      showScreen("phase-complete");
      launchConfetti(26);
    }
  }

  /* ----------------------------------------------------------
     Tela de Conclusão da Fase
     ---------------------------------------------------------- */

  function renderPhaseComplete() {
    const phaseIndex = state.currentPhase;
    const phase = PHASES[phaseIndex];
    const stats = getPhaseStats(phaseIndex);

    els.pcIcon.src = phase.icon;
    els.pcPhaseName.textContent = `${phase.name} superada com sucesso!`;

    els.pcStars.innerHTML = "";
    stats.starValues.forEach((val) => {
      els.pcStars.insertAdjacentHTML("beforeend", svgStar(val));
    });

    if (els.pcStarCount) {
      els.pcStarCount.textContent = `${formatStars(stats.stars)} / 4`;
    }
    els.pcScore.textContent = `${stats.points} / 40`;
    els.pcFirst.textContent = `${stats.firstTryCount} de 4`;

    if (state.gameCompleted) {
      els.pcUnlock.innerHTML = "🗝️ <strong>Você desbloqueou o Baú do Tesouro Matemático!</strong>";
      els.btnPcContinue.textContent = "🏆 Abrir o Tesouro!";
    } else if (phaseIndex + 1 < TOTAL_PHASES) {
      const nextPhase = PHASES[phaseIndex + 1];
      els.pcUnlock.innerHTML = `🔓 Nova região desbloqueada: <strong>${nextPhase.name}</strong>!`;
      els.btnPcContinue.textContent = `Ir para ${nextPhase.shortName} ➜`;
    } else {
      els.pcUnlock.textContent = "";
      els.btnPcContinue.textContent = "Voltar ao mapa ➜";
    }
  }

  function handlePhaseContinue() {
    if (state.gameCompleted) {
      showScreen("final");
      launchConfetti(42);
      return;
    }
    if (state.currentPhase + 1 < TOTAL_PHASES && state.unlockedPhases[state.currentPhase + 1]) {
      openPhase(state.currentPhase + 1);
      return;
    }
    showScreen("map");
  }

  /* ----------------------------------------------------------
     Tela Final — O Tesouro Matemático
     ---------------------------------------------------------- */

  function renderFinal() {
    els.finalScore.textContent = String(state.totalScore);
    els.finalStars.textContent = formatStars(state.totalStars);

    let message = "";
    if (state.totalStars === 12) {
      message = "Incrível! Você acertou todas as 12 questões de primeira e conquistou as 12 estrelas da Ilha das Frações!";
    } else if (state.totalStars >= 9.5) {
      message = "Parabéns, grande explorador! Você mandou super bem nos desafios e abriu o Tesouro Matemático!";
    } else {
      message = "Parabéns pela persistência! Você aprendeu com cada dica, superou todas as regiões e encontrou o Tesouro!";
    }
    els.finalMessage.textContent = message;

    els.finalSummary.innerHTML = "";
    PHASES.forEach((phase, idx) => {
      const stats = getPhaseStats(idx);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${phase.name}</strong></td>
        <td>${stats.points} / 40</td>
        <td><div class="summary-stars">${starIconsHTML(stats.starValues)} <span>(${formatStars(stats.stars)}/4)</span></div></td>
        <td>${stats.firstTryCount} de 4</td>
      `;
      els.finalSummary.appendChild(tr);
    });
  }

  /* ----------------------------------------------------------
     Confirmação de Reinício / Nova Partida
     ---------------------------------------------------------- */

  function askConfirmNewGame() {
    if (!hasSavedProgress()) {
      resetToNewGame();
      showScreen("map");
      return;
    }

    if (els.confirmDialog && typeof els.confirmDialog.showModal === "function") {
      els.confirmDialog.showModal();
    } else {
      const ok = window.confirm(
        "Começar uma nova partida? Todo o progresso atual (pontos, estrelas e fases) será apagado."
      );
      if (ok) {
        resetToNewGame();
        showScreen("map");
        showToast("✨ Nova aventura iniciada!");
      }
    }
  }

  /* ----------------------------------------------------------
     Eventos e Atalhos de Teclado
     ---------------------------------------------------------- */

  function bindEvents() {
    els.btnPlay.addEventListener("click", () => {
      state.started = true;
      saveState();
      showScreen("map");
    });

    els.btnContinue.addEventListener("click", handleContinueGame);
    els.btnNewGame.addEventListener("click", askConfirmNewGame);
    els.btnPlayAgain.addEventListener("click", askConfirmNewGame);

    els.btnHowto.addEventListener("click", () => {
      showScreen("howto", { skipSave: true });
    });
    els.btnHowtoBack.addEventListener("click", () => {
      showScreen("home");
    });

    document.querySelectorAll("[data-go]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-go");
        if (target) showScreen(target);
      });
    });

    els.btnNext.addEventListener("click", nextQuestionOrFinishPhase);
    els.btnPcContinue.addEventListener("click", handlePhaseContinue);

    if (els.confirmDialog) {
      els.confirmDialog.addEventListener("close", () => {
        if (els.confirmDialog.returnValue === "confirm") {
          resetToNewGame();
          showScreen("map");
          showToast("✨ Nova aventura iniciada!");
        }
      });
    }

    if (els.storageClose) {
      els.storageClose.addEventListener("click", () => {
        els.storageWarning.hidden = true;
      });
    }

    // Atalhos de teclado na tela de questão: 1-4 ou A-D respondem na hora; Enter avança apenas após acertar
    window.addEventListener("keydown", (ev) => {
      if (screens.question.hidden) return;
      if (els.confirmDialog && els.confirmDialog.open) return;
      if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.repeat) return;

      const key = ev.key.toLowerCase();
      const mapKey = {
        "1": 0, a: 0,
        "2": 1, b: 1,
        "3": 2, c: 2,
        "4": 3, d: 3
      };

      const q = getCurrentQuestionObj();
      const qState = state.questions[q.id];

      if (Object.prototype.hasOwnProperty.call(mapKey, key)) {
        if (!qState.completed) {
          ev.preventDefault();
          answerOption(mapKey[key]);
        }
      } else if (key === "enter") {
        // Se o foco estiver em um botão (ex.: alternativa ou "Próxima questão"), deixa o clique nativo agir sem duplicar
        if (document.activeElement && document.activeElement.tagName === "BUTTON") {
          return;
        }
        if (qState.completed) {
          ev.preventDefault();
          nextQuestionOrFinishPhase();
        }
      }
    });
  }

  /* ----------------------------------------------------------
     Inicialização
     ---------------------------------------------------------- */

  function init() {
    loadState();
    bindEvents();
    updateHUD(false);
    // Sempre apresenta a tela inicial ao abrir/recarregar, exibindo "Continuar aventura" se houver partida salva
    showScreen("home", { skipSave: true });
    if (hadCorruptedSave) {
      showToast("ℹ️ Os dados anteriores estavam inválidos. Iniciamos uma partida limpa.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

