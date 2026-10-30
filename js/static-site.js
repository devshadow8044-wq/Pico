"use strict";
(() => {
  const noticeText = "Version statique : consultation uniquement. Aucun compte, mot de passe, dépôt, retrait ou changement n’est enregistré.";
  const main = document.querySelector("main") || document.body;
  let notice = document.querySelector(".static-site-notice");
  if (!notice) {
    notice = document.createElement("section");
    notice.className = "notice warning static-site-notice";
    notice.setAttribute("role", "status");
    notice.textContent = noticeText;
    const anchor = main.querySelector(".topbar") || main.querySelector(".brand") || main.firstElementChild;
    if (anchor?.parentNode === main) anchor.insertAdjacentElement("afterend", notice);
    else main.prepend(notice);
  }

  document.querySelectorAll("[data-auth-unavailable]").forEach((element) => {
    element.textContent = "Les comptes ne sont pas activés sur cette version statique.";
    element.hidden = false;
  });

  document.querySelectorAll("[data-signed-out]").forEach((element) => { element.hidden = false; });
  document.querySelectorAll("[data-signed-in]").forEach((element) => { element.hidden = true; });

  document.querySelectorAll("form").forEach((form) => {
    form.setAttribute("aria-disabled", "true");
    form.addEventListener("submit", (event) => { event.preventDefault(); event.stopImmediatePropagation(); }, true);
    form.querySelectorAll("input, select, textarea, button").forEach((control) => { control.disabled = true; });
    if (!form.querySelector(".static-form-note")) {
      const message = document.createElement("p");
      message.className = "form-note static-form-note";
      message.textContent = "Formulaire désactivé : cette version n’enregistre aucune donnée.";
      form.append(message);
    }
  });

  const products = document.querySelector("[data-products]");
  if (products) products.innerHTML = '<div class="empty"><strong>Aucune offre disponible</strong>Le catalogue n’est pas relié à un service de données.</div>';

  const team = document.querySelector("[data-team]");
  if (team) {
    team.hidden = false;
    team.innerHTML = '<section class="team-card lv1"><h2>Niveau 1</h2><p>Données d’équipe indisponibles hors connexion au compte.</p></section><section class="team-card lv2"><h2>Niveau 2</h2><p>Données d’équipe indisponibles hors connexion au compte.</p></section><section class="team-card lv3"><h2>Niveau 3</h2><p>Données d’équipe indisponibles hors connexion au compte.</p></section><div class="empty">Aucune donnée personnelle n’est enregistrée sur cette version.</div>';
  }

  const history = document.querySelector("[data-history]");
  if (history) history.innerHTML = '<div class="empty"><strong>Historique indisponible</strong>Cette version statique n’enregistre pas d’opérations.</div>';

  const admin = document.querySelector("[data-admin-content]");
  if (admin) admin.innerHTML = '<div class="empty"><strong>Administration désactivée</strong>Le site statique ne stocke pas de comptes, de produits ni de demandes.</div>';

  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-review], [data-admin-status], [data-edit-product], [data-reset-product], [data-logout]");
    if (action) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
})();
