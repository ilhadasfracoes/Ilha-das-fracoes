# 🏝️ A Ilha das Frações — Jogo Educativo Infantil 2D

Jogo educativo 2D desenvolvido para auxiliar crianças de **9 a 11 anos** no aprendizado de **frações**. Por meio de uma aventura interativa, os alunos resolvem desafios matemáticos em três regiões da ilha, acumulam pontos, conquistam estrelas e abrem o Tesouro Matemático. Desenvolvido com **HTML, CSS e JavaScript puro**, com interface responsiva, ilustrações vetoriais próprias e hospedagem gratuita pelo **GitHub Pages**.

---

## 🎯 Objetivos Pedagógicos

O jogo está organizado em **3 regiões (fases)** com **4 questões fixas cada** (12 questões no total), com progressão gradual de dificuldade, representações visuais fiéis e feedback educativo imediato:

1. ** Fase 1 — Pradaria das Frações**
   - Reconhecimento de frações em figuras divididas em partes iguais.
   - Identificação do numerador (partes consideradas).
   - Identificação do denominador (total de partes iguais).
   - Relação entre partes pintadas e total de partes iguais.
2. **🌲 Fase 2 — Floresta dos Desafios**
   - Adição de frações com denominadores iguais.
   - Subtração de frações com denominadores iguais.
   - Problemas contextualizados e interpretação do inteiro.
3. **💎 Fase 3 — Caverna dos Enigmas**
   - Frações equivalentes apoiadas por barras e círculos comparativos.
   - Revisão combinada dos conceitos anteriores em problemas de duas etapas.

---

## ⭐ Mecânicas e Pontuação

- **Acerto na 1ª tentativa:** `10 pontos` + `1 estrela`.
- **Erro:** exibe uma dica pedagógica sem punição severa e permite tentar novamente.
- **Acerto após a 1ª tentativa:** `5 pontos` + `1 estrela`.
- **Pontuação máxima:** `120 pontos` e `12 estrelas`.
- **Desbloqueio de fases:** concluir as 4 questões de uma fase desbloqueia automaticamente a próxima região.
- **Salvamento automático (`localStorage`):** todo o progresso (fase, questão, alternativas respondidas, tentativas, pontos e estrelas) é salvo automaticamente na chave `ilhaDasFracoes_save_v1` a cada ação relevante.

---

## 📁 Estrutura de Arquivos

```text
ilha-das-fracoes/
├── index.html               # Estrutura semântica e telas do jogo (pt-BR)
├── style.css                # Identidade visual 2D, responsividade e animações
├── script.js                # Questões, figuras SVG, regras e salvamento localStorage
├── assets/                  # Ilustrações vetoriais próprias (SVG)
│   ├── bau-tesouro.svg
│   ├── cena-inicial.svg
│   ├── explorador.svg
│   ├── favicon.svg
│   ├── icone-caverna.svg
│   ├── icone-floresta.svg
│   ├── icone-pradaria.svg
│   └── mapa-ilha.svg
├── README.md                # Documentação do projeto
└── LICENSE                  # Licença MIT
```

---

## 🚀 Como Executar Localmente

Como o projeto utiliza apenas HTML, CSS e JavaScript puro sem dependências externas:

1. Clone ou baixe este repositório:
   ```bash
   git clone https://github.com/SEU-USUARIO/ilha-das-fracoes.git
   cd ilha-das-fracoes
   ```
2. Abra o arquivo `index.html` diretamente em qualquer navegador moderno (Chrome, Edge, Firefox, Safari), ou inicie um servidor local simples:
   ```bash
   npx serve .
   # ou com Python:
   python -m http.server 8000
   ```

---


## 🔒 Privacidade e Acessibilidade

- **Sem coleta de dados:** não exige cadastro, login, backend ou banco de dados e não utiliza rastreadores ou anúncios.
- **Armazenamento local:** o `localStorage` é usado exclusivamente no dispositivo do jogador para restaurar a partida.
- **Acessibilidade:** navegação por teclado (`Tab`, `Enter` e teclas `1`–`4` ou `A`–`D`), textos alternativos nas figuras matemáticas, diferenciação visual além de cores e suporte a `prefers-reduced-motion`.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

