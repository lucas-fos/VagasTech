
/* =====================================================
   VAGASTECH - APLICAÇÃO PRINCIPAL
   Armazenamento demonstrativo usando localStorage.
   ===================================================== */

const DB = {
    get(key, fallback = []) {
        try {
            return JSON.parse(localStorage.getItem(key)) ?? fallback;
        } catch {
            return fallback;
        }
    },

    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }
};

const currentUser = () => DB.get("vt_user", null);

function notify(message) {
    alert(message);
}

function saveUser(user) {
    DB.set("vt_user", user);
}

function logout() {
    localStorage.removeItem("vt_user");
    window.location.href = "index.html";
}

/* =====================================================
   CONTROLE DE ACESSO POR PERFIL
   Candidato: vagas, candidaturas, currículo e Academy.
   Empresa: publicar vagas e consultar Banco de Talentos.
   ===================================================== */

const roleAccess = {
    "dashboard.html": ["candidate", "company"],
    "vagas.html": ["candidate"],
    "candidaturas.html": ["candidate", "company"],
    "perfil.html": ["candidate"],
    "academy.html": ["candidate"],
    "empresa-perfil.html": ["company"],
    "publicar-vaga.html": ["company"]
};

function applyRoleNavigation(user) {
    if (!user) return;

    const candidateLinks = {
        "vagas.html": "Vagas",
        "candidaturas.html": "Candidaturas",
        "perfil.html": "Meu currículo",
        "academy.html": "Central Academy"
    };

    const companyLinks = {
        "publicar-vaga.html": "Publicar vaga",
        "empresa-perfil.html": "Banco de talentos",
        "candidaturas.html": "Minhas candidaturas"
    };

    document.querySelectorAll(".nav-links a, .sidebar a").forEach(link => {
        const href = (link.getAttribute("href") || "").split("?")[0];
        if (href === "candidaturas.html") {
            link.hidden = false;
            return;
        }
        const candidateOnly = Object.prototype.hasOwnProperty.call(candidateLinks, href);
        const companyOnly = Object.prototype.hasOwnProperty.call(companyLinks, href);

        if (candidateOnly) link.hidden = user.type !== "candidate";
        if (companyOnly) link.hidden = user.type !== "company";
    });

    document.querySelectorAll("[data-role]").forEach(element => {
        const allowedRoles = element.dataset.role.split(/\\s+/);
        element.hidden = !allowedRoles.includes(user.type);
    });
}

function enforcePageAccess() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    const allowedRoles = roleAccess[page];

    if (!allowedRoles) return true;

    const user = currentUser();

    if (!user) {
        window.location.replace("login.html");
        return false;
    }

    if (!allowedRoles.includes(user.type)) {
        notify(user.type === "candidate"
            ? "Esta área é exclusiva para empresas."
            : "Esta área é exclusiva para candidatos.");
        window.location.replace("dashboard.html");
        return false;
    }

    return true;
}

/* =====================================================
   CONTAS DEMONSTRATIVAS
   ===================================================== */

const demoAccounts = {
    "candidato@vagastech.com": {
        password: "123456",
        type: "candidate",
        name: "Lucas Silva",
        area: "Desenvolvimento",
        level: "Iniciante",
        education: "Análise e Desenvolvimento de Sistemas",
        summary: "Estudante de tecnologia em busca da primeira oportunidade profissional.",
        skills: ["HTML", "CSS", "JavaScript", "Lógica de Programação"],
        projects: [],
        certifications: [],
        completedActivities: [],
        applications: []
    },

    "empresa@vagastech.com": {
        password: "123456",
        type: "company",
        name: "TechCorp Brasil",
        cnpj: "00.000.000/0001-00",
        sector: "Tecnologia",
        size: "Média empresa"
    }
};

/* =====================================================
   CADASTRO DE CANDIDATO
   ===================================================== */

function registerCandidate(data) {
    const users = DB.get("vt_users", []);

    if (users.some(user => user.email === data.email)) {
        notify("Este e-mail já está cadastrado.");
        return;
    }

    const user = {
        id: Date.now(),
        type: "candidate",
        name: data.name,
        email: data.email,
        password: data.password,
        area: data.area,
        level: data.level,
        education: "",
        summary: "",
        skills: [],
        projects: [],
        certifications: [],
        completedActivities: [],
        applications: []
    };

    users.push(user);
    DB.set("vt_users", users);
    saveUser(user);
    localStorage.setItem("vagastech_role", "candidate");

    window.location.href = "dashboard.html";
}

/* =====================================================
   CADASTRO DE EMPRESA
   ===================================================== */

function registerCompany(data) {
    const users = DB.get("vt_users", []);

    if (users.some(user => user.email === data.email)) {
        notify("Este e-mail já está cadastrado.");
        return;
    }

    const user = {
        id: Date.now(),
        type: "company",
        name: data.name,
        email: data.email,
        password: data.password,
        cnpj: data.cnpj,
        sector: data.sector,
        size: data.size
    };

    users.push(user);
    DB.set("vt_users", users);
    saveUser(user);
    localStorage.setItem("vagastech_role", "company");

    window.location.href = "dashboard.html";
}

/* =====================================================
   LOGIN
   Aceita contas cadastradas e contas demonstrativas.
   ===================================================== */

function login(email, password, type) {
    email = String(email || "").trim().toLowerCase();
    password = String(password || "");

    const normalizedType = type === "candidato"
        ? "candidate"
        : type === "empresa"
            ? "company"
            : type;

    /* Verifica primeiro as contas demonstrativas. */

    const demo = demoAccounts[email];

    if (
        demo &&
        demo.password === password &&
        demo.type === normalizedType
    ) {
        const user = {
            id: email === "candidato@vagastech.com" ? 1001 : 1002,
            ...demo,
            email: email,
            password: undefined
        };

        saveUser(user);

        localStorage.setItem("vagastech_role", normalizedType);
        localStorage.setItem("vagastech_demo_email", email);

        notify("Login realizado com sucesso!");

        window.location.href = "dashboard.html";
        return;
    }

    /* Caso não seja uma conta demonstrativa,
       procura o usuário cadastrado no sistema. */

    const users = DB.get("vt_users", []);

    const user = users.find(item =>
        item.email.toLowerCase() === email &&
        item.password === password &&
        item.type === normalizedType
    );

    if (!user) {
        notify("E-mail, senha ou perfil incorretos.");
        return;
    }

    saveUser(user);

    localStorage.setItem("vagastech_role", normalizedType);
    localStorage.removeItem("vagastech_demo_email");

    notify("Login realizado com sucesso!");

    window.location.href = "dashboard.html";
}

/* =====================================================
   ATUALIZAÇÃO DO USUÁRIO
   ===================================================== */

function updateCurrentUser(updates) {
    const user = currentUser();

    if (!user) return;

    const updated = { ...user, ...updates };
    saveUser(updated);

    /* Contas demonstrativas são mantidas na sessão.
       Usuários cadastrados também são atualizados no banco. */

    const users = DB.get("vt_users", []);
    const index = users.findIndex(item => item.id === user.id);

    if (index !== -1) {
        users[index] = updated;
        DB.set("vt_users", users);
    }
}

/* =========================
   VAGAS
   ========================= */

const defaultJobs = [
    {
        id: 1,
        title: "Estágio em Desenvolvimento Frontend",
        company: "Tech Solutions",
        area: "Desenvolvimento",
        level: "Estágio",
        model: "Híbrido",
        location: "Rio de Janeiro",
        technologies: ["HTML", "CSS", "JavaScript"],
        experience: "Não exige experiência formal",
        description: "Oportunidade para estudantes interessados em desenvolvimento web.",
        requirements: "Conhecimentos básicos de HTML, CSS e JavaScript.",
        date: "2026-11-01"
    },
    {
        id: 2,
        title: "Desenvolvedor Backend Júnior",
        company: "CodeLab",
        area: "Backend",
        level: "Júnior",
        model: "Remoto",
        location: "Brasil",
        technologies: ["Python", "SQL", "Django"],
        experience: "Projetos acadêmicos ou pessoais aceitos",
        description: "Buscamos pessoas interessadas em desenvolvimento backend.",
        requirements: "Conhecimento de lógica, Python e banco de dados.",
        date: "2026-11-02"
    },
    {
        id: 3,
        title: "Trainee em Banco de Dados",
        company: "DataTech",
        area: "Banco de Dados",
        level: "Trainee",
        model: "Presencial",
        location: "Rio de Janeiro",
        technologies: ["SQL", "Modelagem"],
        experience: "Não exige experiência formal",
        description: "Programa de desenvolvimento profissional em dados.",
        requirements: "Conhecimentos básicos de SQL.",
        date: "2026-11-03"
    }
];

function getJobs() {
    return DB.get("vt_jobs", defaultJobs);
}

function saveJob(job) {
    const jobs = getJobs();
    const index = jobs.findIndex(item => item.id === job.id);

    if (index >= 0) {
        jobs[index] = job;
    } else {
        jobs.push(job);
    }

    DB.set("vt_jobs", jobs);
}

function applyForJob(jobId) {
    const user = currentUser();

    if (!user || user.type !== "candidate") {
        notify("Entre como candidato para se candidatar.");
        return;
    }

    const jobs = getJobs();
    const job = jobs.find(item => item.id === Number(jobId));

    if (!job) {
        notify("Vaga não encontrada.");
        return;
    }

    const applications = DB.get("vt_applications", []);

    const exists = applications.some(item =>
        item.jobId === job.id && item.candidateId === user.id
    );

    if (exists) {
        notify("Você já se candidatou a esta vaga.");
        return;
    }

    applications.push({
        id: Date.now(),
        jobId: job.id,
        candidateId: user.id,
        candidateName: user.name,
        candidateEmail: user.email,
        status: "Em análise",
        date: new Date().toLocaleDateString("pt-BR"),
        evidence: {
            skills: user.skills || [],
            projects: user.projects || [],
            activities: user.completedActivities || []
        }
    });

    DB.set("vt_applications", applications);
    notify("Candidatura enviada com sucesso!");
    renderJobs();
}

/* =========================
   PERFIL E PORTFÓLIO
   ========================= */

function addSkill(skill) {
    const user = currentUser();
    if (!user || !skill.trim()) return;

    const skills = [...new Set([...(user.skills || []), skill.trim()])];
    updateCurrentUser({ skills });

    renderProfile();
}

function removeSkill(skill) {
    const user = currentUser();
    if (!user) return;

    updateCurrentUser({
        skills: (user.skills || []).filter(item => item !== skill)
    });

    renderProfile();
}

function addProject(project) {
    const user = currentUser();
    if (!user) return;

    const projects = user.projects || [];

    projects.push({
        id: Date.now(),
        title: project.title,
        type: project.type,
        description: project.description,
        challenge: project.challenge,
        technologies: project.technologies,
        url: project.url
    });

    updateCurrentUser({ projects });
    notify("Projeto adicionado ao portfólio!");
    renderProfile();
}

function removeProject(id) {
    const user = currentUser();
    if (!user) return;

    updateCurrentUser({
        projects: (user.projects || []).filter(item => item.id !== Number(id))
    });

    renderProfile();
}

function renderProfile() {
    const user = currentUser();
    if (!user || user.type !== "candidate") return;

    const name = document.querySelector("#profile-name");
    if (name) name.textContent = user.name;

    const summary = document.querySelector("#profile-summary");
    if (summary) summary.value = user.summary || "";

    const education = document.querySelector("#profile-education");
    if (education) education.value = user.education || "";

    const skills = document.querySelector("#skills-list");
    if (skills) {
        skills.innerHTML = (user.skills || []).map(skill => `
            <span class="skill">
                ${escapeHTML(skill)}
                <button type="button"
                    onclick="removeSkill('${escapeHTML(skill)}')"
                    aria-label="Remover ${escapeHTML(skill)}">×</button>
            </span>
        `).join("");
    }

    const projects = document.querySelector("#projects-list");
    if (projects) {
        projects.innerHTML = (user.projects || []).map(project => `
            <article class="card">
                <h3>${escapeHTML(project.title)}</h3>
                <p>${escapeHTML(project.description)}</p>
                <p><strong>Desafio:</strong> ${escapeHTML(project.challenge)}</p>
                <p><strong>Tecnologias:</strong> ${escapeHTML(project.technologies)}</p>
                <a href="${safeURL(project.url)}" target="_blank" rel="noopener">Ver projeto</a>
                <button class="btn btn-danger btn-small"
                    onclick="removeProject(${project.id})">Excluir</button>
            </article>
        `).join("");
    }
}

/* =========================
   CENTRAL ACADEMY
   ========================= */

const activities = [
    {
        id: "html-css",
        title: "Construindo sua primeira página",
        category: "HTML e CSS",
        description: "Crie uma página pessoal com título, apresentação e cartões.",
        difficulty: "Iniciante",
        points: 20
    },
    {
        id: "javascript",
        title: "Lista de tarefas com JavaScript",
        category: "JavaScript",
        description: "Crie uma lista que permita adicionar e remover tarefas.",
        difficulty: "Iniciante",
        points: 30
    },
    {
        id: "logic",
        title: "Desafio de lógica de programação",
        category: "Lógica",
        description: "Pratique condições, variáveis e estruturas de repetição.",
        difficulty: "Iniciante",
        points: 20
    },
    {
        id: "interview",
        title: "Simulação de entrevista",
        category: "Carreira",
        description: "Responda a perguntas comuns de processos seletivos.",
        difficulty: "Intermediário",
        points: 25
    },
    {
        id: "portfolio",
        title: "Apresente seu projeto",
        category: "Portfólio",
        description: "Documente problema, solução, tecnologias e resultado.",
        difficulty: "Intermediário",
        points: 30
    }
];

function completeActivity(id) {
    const user = currentUser();
    if (!user || user.type !== "candidate") {
        notify("A Central Academy é exclusiva para candidatos.");
        return;
    }

    const completed = user.completedActivities || [];

    if (completed.includes(id)) {
        notify("Você já concluiu esta atividade.");
        return;
    }

    updateCurrentUser({
        completedActivities: [...completed, id]
    });

    notify("Atividade concluída! Seu progresso foi atualizado.");
    renderAcademy();
}

function renderAcademy() {
    const container = document.querySelector("#activities-list");
    if (!container) return;

    const user = currentUser();
    if (!user || user.type !== "candidate") return;
    const completed = user?.completedActivities || [];

    container.innerHTML = activities.map(activity => {
        const done = completed.includes(activity.id);

        return `
            <article class="card activity-card">
                <span class="badge">${activity.category}</span>
                <h3>${activity.title}</h3>
                <p>${activity.description}</p>
                <p><strong>Dificuldade:</strong> ${activity.difficulty}</p>
                <p><strong>Pontuação:</strong> ${activity.points} pontos</p>
                <button class="btn ${done ? "btn-outline" : "btn-accent"}"
                    onclick="completeActivity('${activity.id}')"
                    ${done ? "disabled" : ""}>
                    ${done ? "Concluída" : "Concluir atividade"}
                </button>
            </article>
        `;
    }).join("");

    const progress = document.querySelector("#academy-progress");
    if (progress) {
        const percent = Math.round(
            completed.filter(id => activities.some(a => a.id === id)).length /
            activities.length * 100
        );

        progress.style.width = `${percent}%`;
    }

    const count = document.querySelector("#completed-count");
    if (count) count.textContent = completed.length;
}

function gradeQuiz(form) {
    const user = currentUser();
    if (!user || user.type !== "candidate") return;

    const answers = {
        q1: "b",
        q2: "a",
        q3: "c"
    };

    let score = 0;
    const data = new FormData(form);

    Object.entries(answers).forEach(([question, answer]) => {
        if (data.get(question) === answer) score++;
    });

    const percent = Math.round(score / 3 * 100);
    const result = document.querySelector("#quiz-result");

    if (result) {
        result.style.display = "block";
        result.innerHTML = `
            <h3>Resultado: ${percent}%</h3>
            <p>Você acertou ${score} de 3 questões.</p>
            <p>${percent >= 70
                ? "Bom trabalho! Continue praticando."
                : "Revise os conteúdos e tente novamente."}</p>
        `;
    }

    if (user) {
        const assessments = user.assessments || [];

        assessments.push({
            date: new Date().toLocaleDateString("pt-BR"),
            score: percent
        });

        updateCurrentUser({ assessments });
    }
}

/* =========================
   BUSCA E FILTROS
   ========================= */

function renderJobs() {
    const container = document.querySelector("#jobs-list");
    if (!container) return;

    const user = currentUser();
    if (!user || user.type !== "candidate") return;

    const search = document.querySelector("#job-search")?.value.toLowerCase() || "";
    const level = document.querySelector("#job-level")?.value || "";
    const model = document.querySelector("#job-model")?.value || "";

    const jobs = getJobs().filter(job => {
        const text = [
            job.title,
            job.company,
            job.area,
            ...(job.technologies || [])
        ].join(" ").toLowerCase();

        return text.includes(search) &&
            (!level || job.level === level) &&
            (!model || job.model === model);
    });

    if (!jobs.length) {
        container.innerHTML = `<div class="empty-state">Nenhuma vaga encontrada.</div>`;
        return;
    }

    container.innerHTML = jobs.map(job => `
        <article class="card job-card">
            <div class="job-card-header">
                <div>
                    <h3>${escapeHTML(job.title)}</h3>
                    <p>${escapeHTML(job.company)}</p>
                </div>
                <span class="badge badge-green">${escapeHTML(job.level)}</span>
            </div>

            <div class="job-meta">
                <span>${escapeHTML(job.model)}</span>
                <span>${escapeHTML(job.location)}</span>
                <span>${escapeHTML(job.area)}</span>
            </div>

            <p>${escapeHTML(job.description)}</p>
            <p><strong>Experiência:</strong> ${escapeHTML(job.experience)}</p>

            <div class="skill-list">
                ${(job.technologies || []).map(item =>
                    `<span class="skill">${escapeHTML(item)}</span>`
                ).join("")}
            </div>

            <button class="btn btn-primary"
                onclick="applyForJob(${job.id})">
                Candidatar-se
            </button>
        </article>
    `).join("");
}

/* =========================
   CANDIDATURAS
   ========================= */

function renderApplications() {
    const container = document.querySelector("#applications-list");
    if (!container) return;

    const user = currentUser();
    if (!user) return;

    const allApplications = DB.get("vt_applications", []);
    const applications = user.type === "company"
        ? allApplications
        : allApplications.filter(item => item.candidateId === user.id);

    const jobs = getJobs();

    if (user.type === "company") {
        const candidates = DB.get("vt_users", []);
        container.innerHTML = applications.length
            ? applications.map(application => {
                const job = jobs.find(item => item.id === application.jobId);
                const candidate = candidates.find(item => item.id === application.candidateId);
                return `
                    <article class="card list-item">
                        <h3>${escapeHTML(job?.title || "Vaga indisponível")}</h3>
                        <p><strong>Candidato:</strong> ${escapeHTML(application.candidateName || candidate?.name || "Candidato")}</p>
                        <p><strong>E-mail:</strong> ${escapeHTML(application.candidateEmail || candidate?.email || "Não informado")}</p>
                        <p>Recebida em: ${escapeHTML(application.date || "Data não informada")}</p>
                        <span class="badge">${escapeHTML(application.status || "Em análise")}</span>
                    </article>
                `;
            }).join("")
            : `<div class="empty-state">Sua empresa ainda não recebeu candidaturas.</div>`;
        return;
    }

    container.innerHTML = applications.length
        ? applications.map(application => {
            const job = jobs.find(item => item.id === application.jobId);
            return `
                <article class="card list-item">
                    <h3>${escapeHTML(job?.title || "Vaga indisponível")}</h3>
                    <p>${escapeHTML(job?.company || "")}</p>
                    <p>Enviada em: ${escapeHTML(application.date)}</p>
                    <span class="badge">${escapeHTML(application.status)}</span>
                </article>
            `;
        }).join("")
        : `<div class="empty-state">Você ainda não possui candidaturas.</div>`;
}

/* =========================
   EMPRESA E BANCO DE TALENTOS
   ========================= */

function renderTalentBank() {
    const container = document.querySelector("#talent-list");
    if (!container) return;

    const user = currentUser();
    if (!user || user.type !== "company") return;

    // Inclui contas demonstrativas e usuários cadastrados no vt_users
    const demoCandidateList = Object.entries(demoAccounts)
        .filter(([_, acc]) => acc.type === "candidate")
        .map(([email, acc], index) => ({ id: 1000 + index, email, ...acc }));

    const registeredUsers = DB.get("vt_users", []);
    
    // Une usuários cadastrados e contas demo (evitando duplicatas por e-mail)
    const allUsersMap = new Map();
    [...demoCandidateList, ...registeredUsers].forEach(u => {
        if (u.type === "candidate") {
            allUsersMap.set(u.email, u);
        }
    });

    const candidates = Array.from(allUsersMap.values());
    const applications = DB.get("vt_applications", []);
    const jobs = getJobs();

    const jobFilter = document.querySelector("#talent-job-filter")?.value || "";
    const search = document.querySelector("#talent-search")?.value.toLowerCase() || "";

    const filtered = candidates.filter(candidate => {
        // Se houver filtro por vaga, verifica se o candidato se candidatou àquela vaga
        if (jobFilter) {
            const hasApplied = applications.some(app => 
                app.candidateId === candidate.id && String(app.jobId) === jobFilter
            );
            if (!hasApplied) return false;
        }

        const candidateSkills = candidate.skills || [];
        const text = [
            candidate.name,
            candidate.area,
            candidate.level,
            candidate.education,
            candidate.summary,
            ...candidateSkills,
            ...(candidate.projects || []).map(project => (project.title || "") + " " + (project.technologies || ""))
        ].join(" ").toLowerCase();

        return text.includes(search);
    });

    container.innerHTML = filtered.map(candidate => {
        const candidateApps = applications.filter(app => app.candidateId === candidate.id);
        const appliedJobsText = candidateApps.length > 0 
            ? candidateApps.map(app => {
                const job = jobs.find(j => j.id === app.jobId);
                return job ? job.title : "Vaga";
            }).join(", ") 
            : "Nenhuma candidatura específica";

        return `
            <article class="card">
                <h3>${escapeHTML(candidate.name)}</h3>
                <p><strong>Área / Nível:</strong> ${escapeHTML(candidate.area || "Não informada")} (${escapeHTML(candidate.level || "Iniciante")})</p>
                <p><strong>Formação:</strong> ${escapeHTML(candidate.education || "Não informada")}</p>
                <p><strong>Resumo:</strong> ${escapeHTML(candidate.summary || "Sem resumo cadastrado.")}</p>
                <p><strong>Candidaturas:</strong> ${escapeHTML(appliedJobsText)}</p>

                <h4>Habilidades</h4>
                <div class="skill-list">
                    ${(candidate.skills || []).length > 0 
                        ? candidate.skills.map(skill => `<span class="skill">${escapeHTML(skill)}</span>`).join("")
                        : '<span style="font-size: 13px; color: var(--muted);">Nenhuma habilidade informada.</span>'
                    }
                </div>

                <h4 style="margin-top: 12px;">Projetos</h4>
                ${(candidate.projects || []).length > 0
                    ? candidate.projects.map(project => `
                        <p style="font-size: 13px; margin-top: 4px;"><strong>${escapeHTML(project.title)}</strong> — ${escapeHTML(project.technologies)}</p>
                    `).join("")
                    : '<p style="font-size: 13px; color: var(--muted);">Nenhum projeto cadastrado.</p>'
                }

                <p style="margin-top: 12px; font-size: 13px;"><strong>Atividades concluídas na Academy:</strong> ${(candidate.completedActivities || []).length}</p>
            </article>
        `;
    }).join("") || `<div class="empty-state">Nenhum candidato encontrado.</div>`;
}


/* =========================
   PUBLICAÇÃO E EDIÇÃO DE VAGAS
   ========================= */

function publishJob(data) {
    const user = currentUser();

    if (!user || user.type !== "company") {
        notify("Entre como empresa para publicar vagas.");
        return;
    }

    const job = {
        id: Date.now(),
        company: user.name,
        title: data.title,
        area: data.area,
        level: data.level,
        model: data.model,
        location: data.location,
        technologies: data.technologies.split(",").map(item => item.trim()).filter(Boolean),
        experience: data.experience,
        description: data.description,
        requirements: data.requirements,
        date: new Date().toISOString().slice(0, 10)
    };

    saveJob(job);
    notify("Vaga publicada com sucesso!");
    window.location.href = "dashboard.html";
}

function updateApplicationStatus(id, status) {
    const applications = DB.get("vt_applications", []);
    const index = applications.findIndex(item => item.id === Number(id));

    if (index === -1) return;

    applications[index].status = status;
    DB.set("vt_applications", applications);

    notify("Status atualizado.");
    renderTalentBank();
}

/* =========================
   SEGURANÇA DE EXIBIÇÃO
   ========================= */

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function safeURL(value = "") {
    try {
        const url = new URL(value);
        if (url.protocol === "https:" || url.protocol === "http:") {
            return url.href;
        }
    } catch {
        return "#";
    }

    return "#";
}

/* =========================
   INICIALIZAÇÃO
   ========================= */

document.addEventListener("DOMContentLoaded", () => {
    if (!enforcePageAccess()) return;

    const loggedInUser = currentUser();
    applyRoleNavigation(loggedInUser);

    renderProfile();
    renderAcademy();
    renderJobs();
    renderApplications();
    renderTalentBank();

    const jobSearch = document.querySelector("#job-search");
    const jobLevel = document.querySelector("#job-level");
    const jobModel = document.querySelector("#job-model");

    [jobSearch, jobLevel, jobModel].forEach(element => {
        element?.addEventListener("input", renderJobs);
        element?.addEventListener("change", renderJobs);
    });

    document.querySelector("#profile-form")?.addEventListener("submit", event => {
        event.preventDefault();

        const form = new FormData(event.target);

        updateCurrentUser({
            summary: form.get("summary"),
            education: form.get("education")
        });

        notify("Perfil atualizado!");
    });

    document.querySelector("#skill-form")?.addEventListener("submit", event => {
        event.preventDefault();
        const form = new FormData(event.target);

        addSkill(form.get("skill"));
        event.target.reset();
    });

    document.querySelector("#project-form")?.addEventListener("submit", event => {
        event.preventDefault();
        const form = new FormData(event.target);

        addProject({
            title: form.get("title"),
            type: form.get("type"),
            description: form.get("description"),
            challenge: form.get("challenge"),
            technologies: form.get("technologies"),
            url: form.get("url")
        });

        event.target.reset();
    });

    document.querySelector("#quiz-form")?.addEventListener("submit", event => {
        event.preventDefault();
        gradeQuiz(event.target);
    });

    document.querySelector("#candidate-register")?.addEventListener("submit", event => {
        event.preventDefault();
        const form = new FormData(event.target);

        registerCandidate({
            name: form.get("name"),
            email: form.get("email"),
            password: form.get("password"),
            area: form.get("area"),
            level: form.get("level")
        });
    });

    document.querySelector("#company-register")?.addEventListener("submit", event => {
        event.preventDefault();
        const form = new FormData(event.target);

        registerCompany({
            name: form.get("name"),
            email: form.get("email"),
            password: form.get("password"),
            cnpj: form.get("cnpj"),
            sector: form.get("sector"),
            size: form.get("size")
        });
    });

    document.querySelector("#login-form")?.addEventListener("submit", event => {
        event.preventDefault();
        const form = new FormData(event.target);

        login(
            form.get("email"),
            form.get("password"),
            form.get("type")
        );
    });

    document.querySelector("#publish-job-form")?.addEventListener("submit", event => {
        event.preventDefault();
        const form = new FormData(event.target);

        publishJob({
            title: form.get("title"),
            area: form.get("area"),
            level: form.get("level"),
            model: form.get("model"),
            location: form.get("location"),
            technologies: form.get("technologies"),
            experience: form.get("experience"),
            description: form.get("description"),
            requirements: form.get("requirements")
        });
    });

    document.querySelector("#talent-search")?.addEventListener("input", renderTalentBank);
    document.querySelector("#talent-job-filter")?.addEventListener("change", renderTalentBank);
});
