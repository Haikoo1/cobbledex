# Cobbledex — Cobblemon Pokédex

> Uma Pokédex completa e funcional offline para o mod [Cobblemon Minecraft](https://cobblemon.com/), construída com HTML/CSS/JS padrão.

![Cobbledex Preview](https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png)

## ✨ Recursos

- **🔍 Busca e Filtros Avançados** — Busque por nome, filtre por tipo (seleção múltipla), geração, atributos mínimos e classifique por diversos campos
- **📊 Visualização Detalhada de Pokémon** — Barras de atributos, habilidades, cadeias evolutivas, fraquezas de tipo, condições de aparição, drops e informações de criação
- **💖 Favoritos** — Salve seus Pokémon favoritos no localStorage e exporte como JSON
- **⚖ Comparador** — Compare até 3 Pokémon lado a lado em uma tabela de atributos
- **🌙 Modo Claro/Escuro** — Respeita as preferências do sistema, a ativação/desativação persiste
- **🌐 Internacionalização** — Inglês e Português (pt-BR) com fácil extensibilidade
- **📱 Responsivo e Priorizado para Dispositivos Móveis** — Funciona perfeitamente em celulares, tablets e computadores
- **⚡ PWA** — Instale como um aplicativo independente, funciona offline graças ao Service Worker
- **🕹️ Estética Retrô** — Interface inspirada em pixel art efeitos de linhas de varredura e animações semelhantes a jogos

## 🚀 Início Rápido

### Opção 1: Abrir diretamente

Basta abrir o arquivo `index.html` no seu navegador:

```bash
# Na raiz do projeto
abra pokedex-cobblemon/index.html
```

### Opção 2: Servir localmente (recomendado para PWA)

Use qualquer servidor de arquivos estáticos:

```bash
# Usando Python
cd pokedex-cobblemon && python3 -m http.server 8080

# Usando Node.js (se você tiver o npx)
cd pokedex-cobblemon && npx serve .

# Usando PHP
cd pokedex-cobblemon && php -S localhost:8080
```

Em seguida, abra `http://localhost:8080` no seu navegador.

## 🗂️ Estrutura do Projeto

```
pokedex-cobblemon/
├── index.html # Página principal da Pokédex
├── pokemon.html # Página de detalhes de cada Pokémon
├── manifest.json # Manifesto do PWA
├── sw.js # Service Worker (suporte offline)
├── css/
│ ├── reset.css # Redefinição/normalização do CSS
│ ├── variables.css # Tokens de design (cores, fontes, espaçamento)
│ ├── base.css # Tipografia básica, animações, utilitários
│ ├── components.css # Cartões, emblemas, botões, modais, abas
│ ├── layout.css # Grade, cabeçalho, painéis, breakpoints responsivos
│ └── dark-mode.css # Sobrescritas dos modos claro/escuro
├── js/
│ ├── main.js # Ponto de entrada para index.html
│ ├── pokemon-detail.js # Ponto de entrada para pokemon.html
│ ├── data.js # Carregamento de dados de Pokémon e estado compartilhado
│ ├── search.js # Busca, filtragem, ordenação, sincronização de URLs
│ ├── favorites.js # Gerenciamento de favoritos (localStorage)
│ ├── comparator.js # Comparar até 3 Pokémon
│ ├── theme.js # Alternar modo claro/escuro
│ ├── i18n.js # Sistema de internacionalização
│ └── pwa.js # Solicitação de registro e instalação do Service Worker
├── data/
│ └── pokemon.json # Todos os dados de Pokémon
├── locales/
│ ├── en.json # Traduções em inglês
│ └── pt-BR.json # Traduções em português (Brasil)
├── scripts/
│ └── fetch-cobbledex.js # Script Node.js para coletar/atualizar dados de Pokémon
└── README.md # Este arquivo
```

## 🧩 Visão Geral dos Módulos

### `data.js`
Armazenamento central de dados. Carrega `pokemon.json` via `fetch()` e fornece `getPokemonById()`, `getPokemonByName()` e estado reativo compartilhado.

### `search.js`
Lida com a entrada de pesquisa (com debounce de 300ms), filtros de tipo/geração/status, ordenação e sincronização de parâmetros de consulta de URL (`?type=fire&gen=1&sort=attack-desc`).

### `favorites.js`
Gerencia os favoritos no `localStorage` sob a chave `cobblemon-favorites`. Suporta adicionar/remover, verificar status e exportar como um arquivo JSON para download.

### `comparator.js`
Selecione até 3 Pokémon para comparar. Abre um modal com uma tabela de estatísticas lado a lado, destacando o valor mais alto em cada linha.

### `theme.js`
Alterna entre os modos claro e escuro. Armazena a preferência no `localStorage`. Na primeira visita, respeita a configuração `prefers-color-scheme`.

### `i18n.js`
Carrega arquivos JSON de localização de `/locales/`. Suporta chaves com notação de ponto, interpolação e atualizações automáticas de texto da página. Usa o inglês como alternativa para chaves ausentes.

### `pwa.js`
Registra o Service Worker, lida com o `beforeinstallprompt` para o botão de instalação e exibe notificações de online/offline.

## 📦 Formato dos Dados

Cada Pokémon em `data/pokemon.json` segue esta estrutura:

```json
{

"id": 1,

"name": "Bulbasaur",

"nameTranslations": { "pt-BR": "Bulbassauro", "en": "Bulbasaur" },

"types": ["Grass", "Poison"],

"stats": { "hp": 45, "attack": 49, "defense": 49, "spAtk": 65, "spDef": 65, "speed": 45 },

"abilities": ["Overgrow", "Chlorophyll"],

"height": 0.7,

"weight": 6.9,

"generation": 1,

"spriteUrl": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png", 
"spriteShinyUrl": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/1.png", 
"sprite3dUrl": "https://cobbledex.b-cdn.net/3dmons/previews/large/1.webp", 
"cobbledexUrl": "https://www.cobbledex.info/pokemon/bulbasaur", 
"evoluçãoChain": [1, 2, 3], 
"descrição": { 
"pt-BR": "Por algum tempo após o nascimento...", 
"pt": "Por algum tempo após seu nascimento..." 
}, 
"raridade": "Ultra Raro", 
"gotas": ["Melão Sementes 0-1", "Semente Milagrosa 5%"],

"biomas": ["é_selva", "é_ilha_tropical"],

"contexto": "Terrestre",

"tempo": "Qualquer",

"clima": "Qualquer",

"níveis": "5-32",

"clara-luz": "8-15",

"tags": ["Inicial", "Geração 1"],

"grupos_de_ovos": ["Monstro", "Grama"],

"taxa_de_crescimento": "média_lenta",

"felicidade_base": 50,

"taxa_de_captura": 45,

"taxa_de_gênero": 1,

"contador_de_eclosão": 20,

"exp_base": 64
}
```

## 🔄 Atualizando Dados de Pokémon

Para obter os dados mais recentes de Pokémon da PokéAPI e mesclá-los com os dados existentes específicos do Cobblemon:

### Pré-requisitos
- Node.js v18+ (para `fetch` nativo) ou instale `node-fetch`

### Executando o script

```bash
cd pokedex-cobblemon
node scripts/fetch-cobbledex.js
```

Este script irá:
1. Obter a lista completa de Pokémon da PokéAPI (até 1000)
2. Obter dados detalhados para cada Pokémon (atributos, tipos, habilidades, etc.)
3. Combinar com os dados existentes específicos de Cobblemon (raridade, itens obtidos, condições de aparição)
4. Escrever o arquivo `data/pokemon.json` atualizado

**Observação:** O script preserva os dados de Cobblemon selecionados manualmente (raridade, itens obtidos, biomas, condições de aparição) do arquivo `pokemon.json` existente. Para novos Pokémon sem dados de Cobblemon, valores padrão adequados serão utilizados.

## 🌍 Adicionando um Novo Idioma

1. Crie um novo arquivo em `locales/`, por exemplo, `locales/es.json` (espanhol)
2. Copie a estrutura de `locales/en.json` e traduza os valores
3. Adicione o código de idioma ao array `SUPPORTED_LOCALES` em `js/i18n.js`
4. O seletor de idioma no cabeçalho incluirá automaticamente a nova opção

## 🎨 Personalização

### Cores e Tema
Todos os elementos de design são definidos como propriedades personalizadas CSS em `css/variables.css`. Modifique o bloco `:root` para alterar o esquema de cores.

### Fontes
O projeto utiliza três fontes do Google:
- **Press Start 2P** — Fonte retrô em pixel art para títulos
- **VT323** — Fonte estilo terminal para dados
- **Share Tech Mono** — Fonte digital para números

Altere-as em `css/base.css` e atualize `variables.css` de acordo.

## 📱 Instalação do PWA

Ao visitar o site em um navegador baseado no Chromium (Chrome, Edge, etc.), você verá um botão "Instalar Cobbledex" no cabeçalho. Clique nele para instalar o aplicativo como um PWA independente que funciona offline.

O Service Worker (`sw.js`) usa uma estratégia de **Cache Primeiro** para recursos estáticos e o JSON de dados, e uma estratégia de **Rede Primeiro** para outros conteúdos.

## 🧪 Testando

Para testar o aplicativo:

1. Execute localmente (consulte o Guia Rápido)
2. Abra em uma janela de visualização móvel (Chrome DevTools → Ativar/Desativar Barra de Ferramentas do Dispositivo)
3. Teste com larguras de 375px, 390px, 768px e 1280px
4. Teste offline: DevTools → Rede → Offline
5. Teste a instalação: DevTools → Aplicativo → Manifesto → "Adicionar à tela inicial"

## 🛠️ Tecnologias Utilizadas

- **HTML/CSS/JS puro** — Sem frameworks, sem bundlers, sem dependências
- **PokéAPI** — Fonte de dados Pokémon
- **CDN Cobbledex** — Pré-visualizações de modelos 3D
- **Service Worker** — Cache offline
- **localStorage** — Persistência de preferências e favoritos

---

*Criado para a comunidade Cobblemon. Não afiliado à Nintendo, Game Freak ou The Pokémon Company.*
