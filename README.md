# Fono — Histórias e ideia principal

Webapp offline para fonoaudiólogas usarem em atendimentos de pacientes com TEA.
Cada card abre uma história (texto + imagens de apoio) e três alternativas;
o paciente (ou a terapeuta, em sessão on-line) escolhe qual é a ideia principal.

## Dados: `data/stories.json`

Todo o conteúdo fica nesse arquivo, separado da aplicação. Nada mais é armazenado.

| Campo | Descrição |
|---|---|
| `defaultLanguage` | Idioma inicial (`en`). |
| `languages` | Idiomas do toggle de bandeiras (`code`, `label`, `flag` = caminho do SVG da bandeira). |
| `ui` | Textos da interface, por idioma. |
| `stories[]` | Lista de histórias (uma por card). |

Cada história:

| Campo | Descrição |
|---|---|
| `id` | Identificador único (ex.: `card-073`). |
| `card` | Número impresso no card físico (aparece na lista). |
| `title.{en,pt,it}` | Título. |
| `text.{en,pt,it}` | Lista de parágrafos (um item por frase/parágrafo). |
| `images[]` | Opcional. `src` (caminho relativo, ex.: `images/story-001/1.png`) e `alt.{en,pt,it}`. |
| `options[]` | Exatamente 3 alternativas: `id` (`a`/`b`/`c`, mesma letra do card físico) e `text.{en,pt,it}`. A ordem é embaralhada sempre que a história é aberta. |
| `correctOptionId` | `id` da alternativa correta. |

O texto original é o inglês (`en`); `pt` e `it` são traduções armazenadas no
próprio JSON, para que a troca de idioma funcione sem internet. Nas traduções,
nomes de pessoas (e moeda) foram adaptados para nomes comuns no Brasil e na Itália.

## Aplicação

PWA em HTML, CSS e JavaScript vanilla, sem dependências nem build.

- `index.html`, `css/styles.css`, `js/app.js`: a aplicação.
- `sw.js`: service worker, guarda os arquivos para uso off-line.
  **Ao alterar qualquer arquivo, incremente `CACHE_VERSION`** em `sw.js`
  (e inclua arquivos novos, como imagens, em `APP_SHELL`).
- `manifest.webmanifest` e `assets/icons/`: instalação como app.
- `assets/flags/`: bandeiras em SVG (emojis de bandeira não aparecem no Windows).

Comportamento:

- Alternativas embaralhadas a cada abertura da história.
- Resposta errada: botão fica rosado e, com animações ligadas, vibra. Pode-se
  tentar até acertar.
- Resposta certa: botão fica verde e, com animações ligadas, cai confete.
- Toggle de animações desliga todas as animações/transições CSS. Começa
  desligado se o sistema estiver com "reduzir movimento" ativo.
- Nenhuma preferência ou dado é salvo; idioma e animações voltam ao padrão
  ao reabrir.

### Rodar localmente

```sh
python3 -m http.server 8000
# abrir http://localhost:8000
```

### Hospedagem (GitHub Pages)

Settings → Pages → *Deploy from a branch* → escolher o branch e a pasta `/ (root)`.
No iPhone/iPad: abrir o endereço no Safari → Compartilhar → *Adicionar à Tela de Início*.
