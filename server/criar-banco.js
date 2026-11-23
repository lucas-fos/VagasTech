
require("dotenv").config();

const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

async function criarBanco() {
  let conexao;

  try {
    conexao = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: {
        ca: fs.readFileSync(
          path.resolve(__dirname, "..", process.env.DB_SSL_CA)
        )
      },
      multipleStatements: true
    });

    console.log("Conectado ao TiDB!");

    const arquivoSQL = path.resolve(
      __dirname,
      "..",
      "database",
      "schema.sql"
    );

    const sql = fs.readFileSync(arquivoSQL, "utf8");

    await conexao.query(sql);

    console.log("Banco e tabelas criados com sucesso!");

  } catch (erro) {
    console.error("Erro:", erro.message);

  } finally {
    if (conexao) await conexao.end();
  }
}

criarBanco();
