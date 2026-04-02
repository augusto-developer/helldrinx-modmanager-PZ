# 🧟 HellDrinx - Project Zomboid Mod Manager

### O assistente definitivo para administradores de servidores de Project Zomboid.

Cansado de lidar com o `servertest.ini` manualmente? O **HellDrinx Mod Manager** foi criado para automatizar a tarefa mais chata de um servidor: gerenciar, ordenar e limpar seus mods. Com uma interface moderna, rápida e intuitiva, você foca no survival e deixa a técnica com a gente.

---

## 🎨 Entendendo a Interface (O Guia Visual)

Para facilitar sua vida, usamos um sistema de cores e etiquetas que te dizem exatamente o estado do seu mod num piscar de olhos.

### 🏷️ Etiquetas (Tags)
*   **CORE**: O mod principal de um item do Steam Workshop. Geralmente é o que contém a lógica base.
*   **SHARD / SUB-MOD**: Mods extras que vêm no mesmo pacote do Workshop (ex: traduções, mapas extras ou versões alternativas).
*   **DEPENDENCY**: Mods que são necessários para que outros funcionem (ex: bibliotecas como "Tsar's Common Library").

### 🌈 Guia de Cores
*   🟢 **Verde**: O mod está ativo no servidor e os arquivos estão baixados no seu PC. Tudo certo!
*   ⚪ **Cinza**: O mod está baixado no seu PC, mas não está ativo no servidor no momento.
*   🟠 **Laranja**: O mod está ativo no servidor, mas o assistente não encontrou os arquivos locais. (Pode ser um erro de caminho ou o mod não terminou o download pela Steam).
*   🔴 **Vermelho**: O mod é essencial (dependência), mas não está ativo nem foi encontrado. Atenção aqui!

---

## 🚀 Funcionalidades que facilitam sua vida

### 🛠️ Gestão com um Clique
*   **Ícone da Steam 🌐**: Abre a página oficial do mod no Workshop diretamente.
*   **Ícone de Pasta 📁**: Abre a pasta exata onde os arquivos do mod estão no seu Windows. Útil para conferir logs ou arquivos de configuração.
*   **Botão REMOVE/ACTIVATE**: Ativa ou retira o mod do servidor instantaneamente. Quando você remove, ele vai para a aba **"Uninstalled"** para não poluir sua lista principal.

### 🧹 Lixeira Inteligente (Trash)
Mods que você não usa mais podem ser "limpos". O sistema os move para uma pasta segura, mantendo sua pasta de Workshop da Steam leve e organizada.

### ⚡ Ordenação Automática
O assistente lê as dependências de cada mod e garante que o seu `servertest.ini` tenha a ordem de carregamento PERFEITA, evitando crashes e erros de compatibilidade.

---

## ⚙️ Configuração Inicial

Ao abrir o programa pela primeira vez, clique no ícone de **Engrenagem (Settings)**:

1.  **Workshop Path**: Onde a Steam baixa os mods (ex: `.../steamapps/workshop/content/108600`).
2.  **Server Config Path**: Onde fica o arquivo `.ini` do seu servidor (geralmente em `C:/Users/SEU_USUARIO/Zomboid/Server`).

*Dica: Uma vez configurado, o programa lembrará dessas pastas para sempre!*

---

## 📸 Screenshots (Em breve)
*[ESPAÇO RESERVADO PARA IMAGENS DA INTERFACE DASHBOARD]*

---

## 💎 Créditos e Suporte
Desenvolvido por **HellDrinx** para a comunidade brasileira de Project Zomboid.

> *"Facilitar o gerenciamento para que você tenha mais tempo para morrer em Rosewood."*
