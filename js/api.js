
/* VagasTech - integração com API Node.js + MySQL */
(() => {
  const API = "/api";

  const token = () => localStorage.getItem("vt_token");
  const user = () => JSON.parse(localStorage.getItem("vt_user") || "null");

  async function request(url, options = {}) {
    const response = await fetch(API + url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Não foi possível concluir a operação.");
    }

    return data;
  }

  const saveSession = data => {
    localStorage.setItem("vt_token", data.token);
    localStorage.setItem("vt_user", JSON.stringify(data.user));
    localStorage.setItem("vagastech_role", data.user.type);
  };

  const message = text => alert(text);

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c])
  );

  const whatsappNumber = value => {
    const digits = String(value || "").replace(/\D/g, "").replace(/^0+/, "");
    return digits.startsWith("55") ? digits : `55${digits}`;
  };

  let jobsCache = [];
  let applicationsCache = [];
  let profileCache = { skills: [], projects: [] };

  async function loadProfile() {
    const data = await request("/me");

    profileCache = data;

    const current = {
      ...data.user,
      skills: data.skills,
      projects: data.projects
    };

    localStorage.setItem("vt_user", JSON.stringify(current));

    return current;
  }

  async function loadJobs() {
    jobsCache = await request("/jobs");
    renderJobsFromApi();
  }

  function renderJobsFromApi() {
    const container = document.querySelector("#jobs-list");

    if (!container) return;

    const search = (
      document.querySelector("#job-search")?.value || ""
    ).toLowerCase();

    const level = document.querySelector("#job-level")?.value || "";
    const model = document.querySelector("#job-model")?.value || "";

    const filtered = jobsCache.filter(j =>
      (!level || j.level === level) &&
      (!model || j.model === model) &&
      [j.title, j.company, j.area, ...(j.technologies || [])]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );

    container.innerHTML = filtered.map(job => `
      <article class="card job-card">
        <h3>${esc(job.title)}</h3>
        <p><strong>${esc(job.company)}</strong></p>
        <p>${esc(job.area)} · ${esc(job.level)} · ${esc(job.model)}</p>
        <p>${esc(job.location)}</p>
        <p>${esc(job.description)}</p>
        <p><strong>Requisitos:</strong> ${esc(job.requirements)}</p>
        <p><strong>Tecnologias:</strong> ${esc((job.technologies || []).join(", "))}</p>
        <button class="btn btn-primary" type="button"
          data-apply-job="${job.id}">
          Candidatar-se
        </button>
      </article>
    `).join("") || `
      <div class="empty-state">Nenhuma vaga encontrada.</div>
    `;

    container.querySelectorAll("[data-apply-job]").forEach(button =>
      button.addEventListener("click", () =>
        window.applyForJob(button.dataset.applyJob)
      )
    );
  }

  window.applyForJob = async id => {
    try {
      const result = await request("/applications", {
        method: "POST",
        body: JSON.stringify({ jobId: Number(id) })
      });

      message(result.message);
      await loadApplications();

    } catch (e) {
      message(e.message);
    }
  };

  async function loadApplications() {
    applicationsCache = await request("/applications");

    const container = document.querySelector("#applications-list");

    if (!container) return;

    const company = user()?.type === "company";

    container.innerHTML = applicationsCache.length
      ? applicationsCache.map(a => `
        <article class="card list-item">
          <h3>${esc(a.title)}</h3>

          ${company ? `
            <p><strong>Candidato:</strong> ${esc(a.candidateName)}</p>
            <p><strong>E-mail:</strong> ${esc(a.candidateEmail)}</p>

            <p>
              Recebida em:
              ${new Date(a.created_at).toLocaleDateString("pt-BR")}
            </p>

            <span class="badge">${esc(a.status)}</span>

            <div class="contact-actions">
              ${a.candidatePhone
                ? `
                  <a class="contact-whatsapp"
                     href="https://wa.me/${whatsappNumber(a.candidatePhone)}"
                     target="_blank"
                     rel="noopener noreferrer">
                    <svg aria-hidden="true" viewBox="0 0 24 24"
                      width="15" height="15" fill="none"
                      stroke="currentColor" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8
                        8.5 8.5 0 0 1-7.6 4.7
                        8.4 8.4 0 0 1-3.8-.9L3 21
                        l1.9-5.7a8.4 8.4 0 0 1-.9-3.8
                        A8.5 8.5 0 0 1 8.7 3.9
                        a8.4 8.4 0 0 1 3.8-.9h.5
                        a8.5 8.5 0 0 1 8 8z"/>
                    </svg>
                    WhatsApp
                  </a>
                `
                : `
                  <span class="contact-whatsapp is-disabled"
                    title="O candidato ainda não informou um telefone">
                    WhatsApp não informado
                  </span>
                `
              }

              <a class="contact-email"
                 href="mailto:${encodeURIComponent(a.candidateEmail || "")}">
                <svg aria-hidden="true" viewBox="0 0 24 24"
                  width="15" height="15" fill="none"
                  stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2"/>
                  <path d="m3 7 9 6 9-6"/>
                </svg>
                Enviar e-mail
              </a>
            </div>
          ` : `
            <p>
              Enviada em:
              ${new Date(a.created_at).toLocaleDateString("pt-BR")}
            </p>
          `}

          ${company ? "" : `
            <span class="badge">${esc(a.status)}</span>
          `}
        </article>
      `).join("")
      : `
        <div class="empty-state">
          ${company
            ? "Sua empresa ainda não recebeu candidaturas."
            : "Você ainda não possui candidaturas."
          }
        </div>
      `;
  }

  async function loadTalent() {
    const container = document.querySelector("#talent-list");

    if (!container) return;

    const candidates = await request("/candidates");

    const search = (
      document.querySelector("#talent-search")?.value || ""
    ).toLowerCase();

    const filter = document.querySelector("#talent-job-filter")?.value || "";

    const filtered = candidates.filter(c => {
      const text = [
        c.name,
        c.area,
        c.level,
        c.education,
        c.summary,
        ...(c.skills || []),
        ...(c.projects || []).map(p => p.title)
      ].join(" ").toLowerCase();

      return text.includes(search) &&
        (
          !filter ||
          (c.applications || []).includes(
            jobsCache.find(j => String(j.id) === filter)?.title
          )
        );
    });

    container.innerHTML = filtered.map(c => `
      <article class="card">
        <h3>${esc(c.name)}</h3>

        <p>
          <strong>Área / Nível:</strong>
          ${esc(c.area || "Não informada")}
          (${esc(c.level || "Iniciante")})
        </p>

        <p>
          <strong>Formação:</strong>
          ${esc(c.education || "Não informada")}
        </p>

        <p>
          <strong>Resumo:</strong>
          ${esc(c.summary || "Sem resumo cadastrado.")}
        </p>

        <p>
          <strong>Candidaturas:</strong>
          ${esc(
            (c.applications || []).join(", ") ||
            "Nenhuma candidatura específica"
          )}
        </p>

        <h4>Habilidades</h4>

        <div class="skill-list">
          ${(c.skills || []).map(s =>
            `<span class="skill">${esc(s)}</span>`
          ).join("") || "Nenhuma habilidade informada."}
        </div>

        <h4>Projetos</h4>

        ${(c.projects || []).map(p => `
          <p>
            <strong>${esc(p.title)}</strong> —
            ${esc(p.technologies)}
          </p>
        `).join("") || "<p>Nenhum projeto cadastrado.</p>"}
      </article>
    `).join("") || `
      <div class="empty-state">Nenhum candidato encontrado.</div>
    `;

    const select = document.querySelector("#talent-job-filter");

    if (select && select.options.length <= 1) {
      jobsCache.forEach(j => {
        const option = document.createElement("option");
        option.value = j.id;
        option.textContent = j.title;
        select.appendChild(option);
      });
    }
  }

  async function saveProfile() {
    const skills = profileCache.skills || [];
    const projects = profileCache.projects || [];

    const summary =
      document.querySelector("#profile-summary")?.value ??
      user()?.summary ?? "";

    const education =
      document.querySelector("#profile-education")?.value ??
      user()?.education ?? "";

    const phone =
      document.querySelector("#profile-phone")?.value ??
      user()?.phone ?? "";

    await request("/me", {
      method: "PUT",
      body: JSON.stringify({
        summary,
        education,
        phone,
        skills,
        projects
      })
    });

    message("Currículo salvo no banco de dados MySQL.");

    await loadProfile();
  }

  document.addEventListener("DOMContentLoaded", async () => {

    // Cadastro de candidato
    document.querySelector("#candidate-register")
      ?.addEventListener("submit", async e => {

        e.preventDefault();
        e.stopImmediatePropagation();

        const f = new FormData(e.currentTarget);

        try {
          const data = await request("/auth/register", {
            method: "POST",
            body: JSON.stringify({
              name: f.get("name"),
              email: f.get("email"),
              password: f.get("password"),
              phone: f.get("phone"),
              type: "candidate",
              area: f.get("area"),
              level: f.get("level")
            })
          });

          saveSession(data);
          location.href = "dashboard.html";

        } catch (err) {
          message(err.message);
        }

      }, true);

    // Cadastro de empresa
    document.querySelector("#company-register")
      ?.addEventListener("submit", async e => {

        e.preventDefault();
        e.stopImmediatePropagation();

        const f = new FormData(e.currentTarget);

        try {
          const data = await request("/auth/register", {
            method: "POST",
            body: JSON.stringify({
              name: f.get("name"),
              email: f.get("email"),
              password: f.get("password"),
              type: "company",
              cnpj: f.get("cnpj"),
              sector: f.get("sector"),
              size: f.get("size")
            })
          });

          saveSession(data);
          location.href = "dashboard.html";

        } catch (err) {
          message(err.message);
        }

      }, true);

    // Login
    document.querySelector("#login-form")
      ?.addEventListener("submit", async e => {

        e.preventDefault();
        e.stopImmediatePropagation();

        const f = new FormData(e.currentTarget);

        try {
          const data = await request("/auth/login", {
            method: "POST",
            body: JSON.stringify({
              email: f.get("email"),
              password: f.get("password"),
              type: f.get("type")
            })
          });

          saveSession(data);
          location.href = "dashboard.html";

        } catch (err) {
          message(err.message);
        }

      }, true);

    // Páginas protegidas exigem autenticação.
    if (!token()) return;

    try {
      const current = await loadProfile();

      if (document.querySelector("#profile-name")) {
        document.querySelector("#profile-name").textContent = current.name;

        document.querySelector("#profile-summary").value =
          current.summary || "";

        document.querySelector("#profile-education").value =
          current.education || "";

        if (document.querySelector("#profile-phone")) {
          document.querySelector("#profile-phone").value =
            current.phone || "";
        }

        document.querySelector("#skills-list").innerHTML =
          (current.skills || []).map(s =>
            `<span class="skill">${esc(s)}</span>`
          ).join("");

        document.querySelector("#projects-list").innerHTML =
          (current.projects || []).map(p => `
            <article class="card">
              <h3>${esc(p.title)}</h3>
              <p>${esc(p.description)}</p>
              <p><strong>Desafio:</strong> ${esc(p.challenge)}</p>
              <p><strong>Tecnologias:</strong> ${esc(p.technologies)}</p>
              ${p.url
                ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">Ver projeto</a>`
                : ""
              }
            </article>
          `).join("");
      }

      await loadJobs();
      await loadApplications();
      await loadTalent();

      if (
        current.type === "company" &&
        document.querySelector("#research-candidates")
      ) {
        const candidates = await request("/candidates");

        document.querySelector("#research-candidates").textContent =
          candidates.length;

        document.querySelector("#research-applications").textContent =
          applicationsCache.length;

        document.querySelector("#research-jobs").textContent =
          jobsCache.length;

        document.querySelector("#research-projects").textContent =
          candidates.reduce(
            (n, c) => n + (c.projects || []).length,
            0
          );
      }

      if (current.type === "candidate") {
        const appCount =
          document.querySelector("#dashboard-applications");

        const projectCount =
          document.querySelector("#dashboard-projects");

        const activityCount =
          document.querySelector("#dashboard-activities");

        if (appCount) {
          appCount.textContent = applicationsCache.length;
        }

        if (projectCount) {
          projectCount.textContent =
            (profileCache.projects || []).length;
        }

        if (activityCount) {
          activityCount.textContent =
            current.completedActivities?.length || 0;
        }
      }

      const title =
        document.querySelector("#applications-page-title");

      if (title && current.type === "company") {
        title.textContent = "Candidaturas recebidas";

        const description = document.querySelector(
          "#applications-page-description"
        );

        if (description) {
          description.textContent =
            "Acompanhe os candidatos inscritos nas oportunidades da sua empresa.";
        }
      }

      const dashboardTitle =
        document.querySelector("#dashboard-title");

      if (dashboardTitle) {
        dashboardTitle.textContent =
          current.type === "company"
            ? `Bem-vinda à VagasTech, ${current.name}`
            : `Olá, ${current.name}!`;
      }

    } catch (e) {
      console.error(e);
      message(e.message);

      if (e.message.includes("Sessão")) {
        localStorage.removeItem("vt_token");
        localStorage.removeItem("vt_user");
        location.href = "login.html";
      }
    }

    // Publicação de vagas
    document.querySelector("#publish-job-form")
      ?.addEventListener("submit", async e => {

        e.preventDefault();
        e.stopImmediatePropagation();

        const f = new FormData(e.currentTarget);

        try {
          await request("/jobs", {
            method: "POST",
            body: JSON.stringify({
              title: f.get("title"),
              area: f.get("area"),
              level: f.get("level"),
              model: f.get("model"),
              location: f.get("location"),
              technologies: String(f.get("technologies"))
                .split(",")
                .map(x => x.trim())
                .filter(Boolean),
              experience: f.get("experience"),
              description: f.get("description"),
              requirements: f.get("requirements")
            })
          });

          message("Vaga publicada e salva no MySQL.");
          location.href = "dashboard.html";

        } catch (err) {
          message(err.message);
        }

      }, true);

    // Salvar perfil
    document.querySelector("#profile-form")
      ?.addEventListener("submit", async e => {

        e.preventDefault();
        e.stopImmediatePropagation();

        try {
          await saveProfile();
        } catch (err) {
          message(err.message);
        }

      }, true);

    // Adicionar habilidade - CORRIGIDO
    document.querySelector("#skill-form")
      ?.addEventListener("submit", async e => {

        e.preventDefault();
        e.stopImmediatePropagation();

        const form = e.currentTarget;
        const f = new FormData(form);

        const skill = String(f.get("skill") || "").trim();

        if (!skill) {
          message("Informe uma habilidade.");
          return;
        }

        profileCache.skills.push(skill);

        try {
          await saveProfile();

          // Usa a referência guardada antes do await.
          form.reset();

        } catch (err) {
          message(err.message);
        }

      }, true);

    // Adicionar projeto - CORRIGIDO
    document.querySelector("#project-form")
      ?.addEventListener("submit", async e => {

        e.preventDefault();
        e.stopImmediatePropagation();

        const form = e.currentTarget;
        const f = new FormData(form);

        const title = String(f.get("title") || "").trim();

        if (!title) {
          message("Informe o nome do projeto.");
          return;
        }

        profileCache.projects.push({
          title,
          type: f.get("type"),
          description: f.get("description"),
          challenge: f.get("challenge"),
          technologies: f.get("technologies"),
          url: f.get("url")
        });

        try {
          await saveProfile();

          // Usa a referência guardada antes do await.
          form.reset();

        } catch (err) {
          message(err.message);
        }

      }, true);

    // Pesquisa de talentos
    document.querySelector("#talent-search")
      ?.addEventListener("input", loadTalent);

    document.querySelector("#talent-job-filter")
      ?.addEventListener("change", loadTalent);

    // Atualizar indicadores da empresa
    document.querySelector("#refresh-company-research")
      ?.addEventListener("click", async () => {

        try {
          const candidates = await request("/candidates");
          const apps = await request("/applications");

          document.querySelector("#research-candidates").textContent =
            candidates.length;

          document.querySelector("#research-applications").textContent =
            apps.length;

          document.querySelector("#research-jobs").textContent =
            jobsCache.length;

          document.querySelector("#research-projects").textContent =
            candidates.reduce(
              (n, c) => n + (c.projects || []).length,
              0
            );

          message("Indicadores atualizados com dados do MySQL.");

        } catch (e) {
          message(e.message);
        }
      });

  });

  // Sair
  window.logout = async () => {
    try {
      if (token()) {
        await request("/auth/logout", { method: "POST" });
      }
    } catch (_) {}

    localStorage.removeItem("vt_token");
    localStorage.removeItem("vt_user");
    localStorage.removeItem("vagastech_role");

    location.href = "index.html";
  };

})();
