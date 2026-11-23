
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

// Configurações do servidor
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "..")));

// Conexão com o banco de dados
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "vagastech",
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",

  ssl:
    process.env.DB_SSL === "true"
      ? {
          ca: fs.readFileSync(
            path.resolve(
              __dirname,
              "..",
              process.env.DB_SSL_CA || "isrgrootx1.pem"
            )
          )
        }
      : undefined
});

// Sessões dos usuários
const sessions = new Map();

const safeUser = ({
  id,
  name,
  email,
  phone,
  type,
  area,
  level,
  education,
  summary,
  sector,
  size,
  cnpj
}) => ({
  id,
  name,
  email,
  phone,
  type,
  area,
  level,
  education,
  summary,
  sector,
  size,
  cnpj
});

// Autenticação
async function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace(
    /^Bearer\s+/i,
    ""
  );

  const userId = sessions.get(token);

  if (!userId) {
    return res.status(401).json({
      message: "Sessão inválida. Faça login novamente."
    });
  }

  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE id = ?",
      [userId]
    );

    if (!rows.length) {
      return res.status(401).json({
        message: "Usuário não encontrado."
      });
    }

    req.user = rows[0];
    next();
  } catch (e) {
    next(e);
  }
}

// Verificação da conexão
app.get("/api/health", async (_req, res, next) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      database: "MySQL conectado"
    });
  } catch (e) {
    next(e);
  }
});

// Cadastro de usuários
app.post("/api/auth/register", async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      type,
      area,
      level,
      cnpj,
      sector,
      size
    } = req.body;

    if (!name || !email || !password || !type || password.length < 6) {
      return res.status(400).json({
        message:
          "Preencha os campos obrigatórios. A senha deve ter pelo menos 6 caracteres."
      });
    }

    if (
      type === "candidate" &&
      !String(phone || "").trim()
    ) {
      return res.status(400).json({
        message: "Informe seu telefone/WhatsApp com DDD."
      });
    }

    if (!["candidate", "company"].includes(type)) {
      return res.status(400).json({
        message: "Tipo de conta inválido."
      });
    }

    const hash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      `INSERT INTO users
      (name, email, phone, password_hash, type, area, level, cnpj, sector, size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        type === "candidate"
          ? (phone || "").trim() || null
          : null,
        hash,
        type,
        area || null,
        level || null,
        cnpj || null,
        sector || null,
        size || null
      ]
    );

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE id = ?",
      [result.insertId]
    );

    const token = require("crypto").randomUUID();

    sessions.set(token, result.insertId);

    res.status(201).json({
      token,
      user: safeUser(rows[0])
    });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Este e-mail ou CNPJ já está cadastrado."
      });
    }

    next(e);
  }
});

// Login
app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { email, password, type } = req.body;

    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE email = ? AND type = ?",
      [
        (email || "").trim().toLowerCase(),
        type
      ]
    );

    if (
      !rows.length ||
      !(await bcrypt.compare(password || "", rows[0].password_hash))
    ) {
      return res.status(401).json({
        message: "E-mail, senha ou perfil incorretos."
      });
    }

    const token = require("crypto").randomUUID();

    sessions.set(token, rows[0].id);

    res.json({
      token,
      user: safeUser(rows[0])
    });
  } catch (e) {
    next(e);
  }
});

// Logout
app.post("/api/auth/logout", auth, (req, res) => {
  const token = (req.headers.authorization || "").replace(
    /^Bearer\s+/i,
    ""
  );

  sessions.delete(token);

  res.json({
    message: "Logout realizado."
  });
});

// Consultar perfil
app.get("/api/me", auth, async (req, res, next) => {
  try {
    const [skills] = await pool.query(
      "SELECT skill FROM user_skills WHERE user_id = ?",
      [req.user.id]
    );

    const [projects] = await pool.query(
      `SELECT id, title, category AS type, description,
      challenge, technologies, url
      FROM projects WHERE user_id = ?`,
      [req.user.id]
    );

    res.json({
      user: safeUser(req.user),
      skills: skills.map(x => x.skill),
      projects
    });
  } catch (e) {
    next(e);
  }
});

// Atualizar perfil
app.put("/api/me", auth, async (req, res, next) => {
  try {
    const {
      summary,
      education,
      phone,
      skills = [],
      projects = []
    } = req.body;

    await pool.execute(
      `UPDATE users
       SET summary = ?, education = ?, phone = ?
       WHERE id = ?`,
      [
        summary || "",
        education || "",
        phone === undefined
          ? req.user.phone
          : String(phone).trim() || null,
        req.user.id
      ]
    );

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      await conn.execute(
        "DELETE FROM user_skills WHERE user_id = ?",
        [req.user.id]
      );

      for (const skill of [...new Set(skills)].filter(Boolean)) {
        await conn.execute(
          "INSERT INTO user_skills(user_id, skill) VALUES(?, ?)",
          [req.user.id, String(skill).slice(0, 100)]
        );
      }

      await conn.execute(
        "DELETE FROM projects WHERE user_id = ?",
        [req.user.id]
      );

      for (const p of projects) {
        await conn.execute(
          `INSERT INTO projects
          (user_id, title, category, description, challenge, technologies, url)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.id,
            p.title || "",
            p.type || "Pessoal",
            p.description || "",
            p.challenge || "",
            p.technologies || "",
            p.url || null
          ]
        );
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    res.json({
      message: "Perfil salvo no MySQL."
    });
  } catch (e) {
    next(e);
  }
});

// Listar vagas
app.get("/api/jobs", auth, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT j.*, u.name AS company
       FROM jobs j
       JOIN users u ON u.id = j.company_id
       ORDER BY j.created_at DESC`
    );

    res.json(
      rows.map(j => ({
        ...j,
        technologies: safeJson(j.technologies),
        date: j.created_at
      }))
    );
  } catch (e) {
    next(e);
  }
});

// Converter JSON com segurança
function safeJson(value) {
  try {
    return JSON.parse(value || "[]");
  } catch {
    return [];
  }
}

// Publicar vaga
app.post("/api/jobs", auth, async (req, res, next) => {
  try {
    if (req.user.type !== "company") {
      return res.status(403).json({
        message: "Apenas empresas podem publicar vagas."
      });
    }

    const d = req.body;

    const [r] = await pool.execute(
      `INSERT INTO jobs
      (company_id, title, area, level, model, location,
       technologies, experience, description, requirements)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        d.title,
        d.area,
        d.level,
        d.model,
        d.location,
        JSON.stringify(d.technologies || []),
        d.experience,
        d.description,
        d.requirements
      ]
    );

    res.status(201).json({
      id: r.insertId,
      message: "Vaga publicada."
    });
  } catch (e) {
    next(e);
  }
});

// Candidatar-se a uma vaga
app.post("/api/applications", auth, async (req, res, next) => {
  try {
    if (req.user.type !== "candidate") {
      return res.status(403).json({
        message: "Entre como candidato para se candidatar."
      });
    }

    const { jobId } = req.body;

    const [r] = await pool.execute(
      `INSERT INTO applications
      (job_id, candidate_id, status)
      VALUES (?, ?, 'Em análise')`,
      [jobId, req.user.id]
    );

    res.status(201).json({
      id: r.insertId,
      message: "Candidatura enviada com sucesso!"
    });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Você já se candidatou a esta vaga."
      });
    }

    if (e.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(404).json({
        message: "Vaga não encontrada."
      });
    }

    next(e);
  }
});

// Listar candidaturas
app.get("/api/applications", auth, async (req, res, next) => {
  try {
    const company = req.user.type === "company";

    const [rows] = await pool.execute(
      `SELECT
        a.id,
        a.status,
        a.created_at,
        j.id AS jobId,
        j.title,
        j.company_id,
        c.id AS candidateId,
        c.name AS candidateName,
        c.email AS candidateEmail,
        c.phone AS candidatePhone
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users c ON c.id = a.candidate_id
       ${company ? "WHERE j.company_id = ?" : "WHERE a.candidate_id = ?"}
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// Listar candidatos para empresas
app.get("/api/candidates", auth, async (req, res, next) => {
  try {
    if (req.user.type !== "company") {
      return res.status(403).json({
        message: "Área exclusiva para empresas."
      });
    }

    const [rows] = await pool.query(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.area,
        u.level,
        u.education,
        u.summary
       FROM users u
       WHERE u.type = 'candidate'
       ORDER BY u.name`
    );

    for (const candidate of rows) {
      const [skills] = await pool.query(
        "SELECT skill FROM user_skills WHERE user_id = ?",
        [candidate.id]
      );

      const [projects] = await pool.query(
        "SELECT title, technologies FROM projects WHERE user_id = ?",
        [candidate.id]
      );

      candidate.skills = skills.map(x => x.skill);
      candidate.projects = projects;

      const [apps] = await pool.query(
        `SELECT j.title
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         WHERE a.candidate_id = ? AND j.company_id = ?`,
        [candidate.id, req.user.id]
      );

      candidate.applications = apps.map(x => x.title);
    }

    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// Importação de dados antigos
app.post("/api/migrate/local", auth, async (req, res, next) => {
  if (!["company", "candidate"].includes(req.user.type)) {
    return res.status(403).json({
      message: "Sem permissão."
    });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const imported = {
      users: 0,
      jobs: 0,
      applications: 0
    };

    for (const u of req.body.users || []) {
      if (
        !u.email ||
        !u.password ||
        !["candidate", "company"].includes(u.type)
      ) {
        continue;
      }

      const hash = await bcrypt.hash(String(u.password), 12);

      try {
        const [r] = await conn.execute(
          `INSERT INTO users
          (name, email, phone, password_hash, type, area, level,
           education, summary, cnpj, sector, size)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            u.name || "Usuário",
            u.email.toLowerCase(),
            u.phone || null,
            hash,
            u.type,
            u.area || null,
            u.level || null,
            u.education || null,
            u.summary || null,
            u.cnpj || null,
            u.sector || null,
            u.size || null
          ]
        );

        imported.users++;

        for (const skill of u.skills || []) {
          await conn.execute(
            `INSERT IGNORE INTO user_skills(user_id, skill)
             VALUES (?, ?)`,
            [r.insertId, String(skill)]
          );
        }

        for (const p of u.projects || []) {
          await conn.execute(
            `INSERT INTO projects
            (user_id, title, category, description, challenge, technologies, url)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              r.insertId,
              p.title || "",
              p.type || "Pessoal",
              p.description || "",
              p.challenge || "",
              p.technologies || "",
              p.url || null
            ]
          );
        }
      } catch (e) {
        if (e.code !== "ER_DUP_ENTRY") {
          throw e;
        }
      }
    }

    for (const j of req.body.jobs || []) {
      if (!j.title) continue;

      await conn.execute(
        `INSERT INTO jobs
        (company_id, title, area, level, model, location,
         technologies, experience, description, requirements)
        SELECT id, ?, ?, ?, ?, ?, ?, ?, ?, ?
        FROM users
        WHERE email = ? AND type = 'company'`,
        [
          j.title,
          j.area || "",
          j.level || "",
          j.model || "",
          j.location || "",
          JSON.stringify(j.technologies || []),
          j.experience || "",
          j.description || "",
          j.requirements || "",
          (j.companyEmail || req.user.email).toLowerCase()
        ]
      );

      imported.jobs++;
    }

    await conn.commit();

    res.json({
      message: "Importação concluída.",
      imported
    });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

// Tratamento geral de erros
app.use((err, _req, res, _next) => {
  console.error(err);

  res.status(500).json({
    message: "Erro no servidor. Verifique a configuração do MySQL e os dados enviados."
  });
});

// Inicialização
const PORT = Number(process.env.PORT || 3000);

async function start() {
  try {
    const [columns] = await pool.query(
      "SHOW COLUMNS FROM users LIKE 'phone'"
    );

    if (!columns.length) {
      await pool.query(
        "ALTER TABLE users ADD COLUMN phone VARCHAR(30) NULL AFTER email"
      );

      console.log(
        "Coluna phone adicionada à tabela users sem apagar os dados existentes."
      );
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`VagasTech disponível na porta ${PORT}`);
    });
  } catch (error) {
    console.error(
      "Não foi possível preparar o banco de dados:",
      error
    );

    process.exit(1);
  }
}

start();
