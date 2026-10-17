# Fono — Histórias e ideia principal

Webapp offline para fonoaudiólogas usarem em atendimentos de pacientes com TEA.
Cada card abre uma história (texto + imagens de apoio) e três alternativas;
o paciente (ou a terapeuta, em sessão on-line) escolhe qual é a ideia principal.

## Dados: `data/stories.json`

Todo o conteúdo fica nesse arquivo, separado da aplicação. Nada mais é armazenado.

| Campo | Descrição |
|---|---|
| `defaultLanguage` | Idioma inicial (`en`). |
| `languages` | Idiomas do toggle de bandeiras (`code`, `label`, `flag`). |
| `ui` | Textos da interface, por idioma. |
| `stories[]` | Lista de histórias (uma por card). |

Cada história:

| Campo | Descrição |
|---|---|
| `id` | Identificador único (ex.: `story-001`). |
| `card` | Referência ao card físico (número/nome impresso). |
| `title.{en,pt,it}` | Título. |
| `text.{en,pt,it}` | Lista de parágrafos (um item por frase/parágrafo). |
| `images[]` | `src` (caminho relativo, ex.: `images/story-001/1.png`) e `alt.{en,pt,it}`. |
| `options[]` | Exatamente 3 alternativas: `id` (`a`/`b`/`c`) e `text.{en,pt,it}`. |
| `correctOptionId` | `id` da alternativa correta. |
| `example` | `true` apenas na história de exemplo (será removida). |

O texto original é o inglês (`en`); `pt` e `it` são traduções armazenadas no
próprio JSON, para que a troca de idioma funcione sem internet.
