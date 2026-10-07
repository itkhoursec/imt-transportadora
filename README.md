# IMT Transportadora · Nacional Player

Site oficial da IMT Transportadora (SA-MP Roleplay, servidor **Nacional Player**): rotas, frota, contratos, ouvidoria, rádio e bate-ponto dos motoristas.

## Recursos
- Início com destaque, estatísticas, carrossel automático, comunicados e ranking de motoristas
- Rotas e cargas com calculadora de frete
- Frota e contratos com status
- Regulamento da empresa e ouvidoria privada
- Área restrita: contas de funcionário aprovadas pelo admin, bate-ponto que continua ao recarregar a página e histórico de expedientes
- Painel admin: aprovar cadastros e resets de senha, gerenciar rotas/frota/contratos/carrossel, editar comunicado, Discord e rádio, trocar a senha, exportar e importar backup
- Rádio com volume salvo, menu para celular e links diretos (ex.: `#rotas`)

## Como usar
**Localmente:** abra `public/index.html` no navegador, ou rode `npm start` e acesse http://localhost:3000.

**GitHub Pages:** envie o projeto para o repositório (branch `main`), vá em *Settings → Pages → Source* e escolha **GitHub Actions**. O workflow em `.github/workflows/pages.yml` publica a pasta `public` a cada push.

## Primeiro acesso
Usuário `admin`, senha `admin123`. **Troque a senha** em Painel → Configurações assim que entrar.

## Importante
Este é um site estático: os dados (contratos, contas, ponto, ouvidoria) ficam no navegador de quem os cria, e o login é verificado no próprio navegador, então serve para organização do roleplay e não protege informação sensível. Use *Exportar backup* com frequência. Para dados compartilhados entre todos, o próximo passo é adicionar um banco e uma API ao `server.js`.

Edite a rádio, o Discord e o comunicado direto pelo painel admin. As imagens do carrossel vêm do Unsplash e podem ser trocadas lá também.
