# VagasTech + MySQL

## Requisitos
- Node.js 18 ou superior
- MySQL Server 8 (ou compatível)
- MySQL Workbench (opcional)

## 1. Criar o banco
Abra o MySQL Workbench, conecte ao seu servidor e execute todo o conteúdo de `database/schema.sql`.

## 2. Configurar a conexão
Na pasta principal do projeto, copie `.env.example` para `.env` e informe seu usuário e senha do MySQL:
- DB_HOST=localhost
- DB_PORT=3306
- DB_USER=root
- DB_PASSWORD=sua senha
- DB_NAME=vagastech

Não compartilhe o arquivo `.env` nem envie sua senha para o GitHub.

## 3. Instalar dependências e iniciar
Abra o terminal na pasta `Vagastech3` e execute:

```bash
npm install
npm start
```

Acesse pelo navegador: http://localhost:3000

Não abra os arquivos HTML diretamente com `file://`; acesse pelo endereço do servidor Node.

## 4. Testar
1. Cadastre um candidato em `cadastro.html`.
2. Saia e cadastre uma empresa.
3. Entre como empresa e publique uma vaga.
4. Entre como candidato e candidate-se.
5. Volte para a empresa: a candidatura ficará registrada no MySQL e aparecerá em "Minhas candidaturas" e no Banco de talentos.

## O que fica salvo
- Contas de candidatos e empresas (senhas armazenadas com hash bcrypt).
- Vagas publicadas por empresas.
- Candidaturas e status.
- Formação, resumo, habilidades e projetos do currículo.

## Observações
- Os dados ficam no servidor MySQL configurado, não no navegador.
- Para acessar de outro computador, o servidor Node e o MySQL precisam estar disponíveis na rede ou hospedados.
- O projeto inclui API REST em `server/server.js` e estrutura SQL em `database/schema.sql`.
- A senha é armazenada com hash bcrypt; não é salva em texto puro.
- Os dados antigos que estavam apenas no `localStorage` do navegador não são transferidos automaticamente. Mantenha o navegador antigo e faça backup antes de começar a usar o MySQL.
- A importação automática de dados antigos do localStorage ainda não está ativada nesta versão; contas antigas devem ser cadastradas novamente no banco. Não apague os dados antigos do navegador até confirmar a migração.
