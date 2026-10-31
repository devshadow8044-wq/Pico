"use strict";
(() => {
  const page = document.body.dataset.page || "home";
  const prefixes = { SN: "+221", ML: "+223", CI: "+225", BJ: "+229" };
  const cfg = window.RANGERS_SUPABASE_CONFIG || {};
  const sdk = window.RangersSupabaseSDK;
  const configured = Boolean(cfg.url && cfg.publishableKey && !/VOTRE|EXEMPLE|CHANGE/i.test(cfg.url + cfg.publishableKey));
  const client = configured && sdk?.createClient
    ? sdk.createClient(cfg.url.replace(/\/$/, ""), cfg.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
    : null;
  window.RANGERS_AUTH_CLIENT = client;
  const $ = (selector, root = document) => root.querySelector(selector);
  const show = (element, message, kind = "warning") => {
    if (!element) return;
    element.className = `notice ${kind}`;
    element.textContent = message;
    element.hidden = false;
  };
  const formMessage = (message, kind = "error") => {
    const element = $("[data-auth-message]");
    if (!message) { if (element) { element.hidden = true; element.textContent = ""; } return; }
    show(element, message, kind);
  };
  const configMessage = "Connexion non configurée : ajoute l’URL de ton projet Supabase et sa clé publishable dans js/supabase-config.js.";
  const friendlyError = (error) => {
    const text = String(error?.message || "").toLowerCase();
    if (/invalid login credentials|invalid grant|invalid credentials/.test(text)) return "Numéro de téléphone ou mot de passe incorrect.";
    if (/phone not confirmed|not confirmed/.test(text)) return "Ton numéro n’est pas encore vérifié. Termine la vérification par SMS.";
    if (/token.*(invalid|expired)|otp.*(invalid|expired)/.test(text)) return "Le code SMS est incorrect ou expiré. Demande un nouveau code dans Supabase.";
    if (/already registered|user already|phone.*exist/.test(text)) return "Ce numéro est peut-être déjà lié à un compte. Essaie de te connecter.";
    if (/phone.*disabled|phone.*not.*enabled|signup is disabled/.test(text)) return "Active la connexion par téléphone dans les réglages Auth de Supabase.";
    if (/sms|provider|messagebird|twilio|vonage/.test(text)) return "L’envoi du code SMS échoue. Configure un fournisseur SMS dans Supabase.";
    if (/rate limit|too many requests|429/.test(text)) return "Trop de tentatives. Attends un peu avant de réessayer.";
    if (/password.*(weak|short)|at least/.test(text)) return "Choisis un mot de passe d’au moins 12 caractères.";
    if (/fetch|network|failed to|load failed/.test(text)) return "Impossible de joindre Supabase. Vérifie l’URL, la clé publishable et la connexion internet.";
    return "La demande n’a pas abouti. Vérifie les informations et les réglages Auth de Supabase.";
  };
  function normalizePhone(value, country) {
    let digits = String(value || "").trim().replace(/[^0-9]/g, "");
    if (!digits) return "";
    if (String(value).trim().startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : "";
    if (digits.startsWith("00")) digits = digits.slice(2);
    const prefix = prefixes[country];
    if (!prefix) return "";
    const countryDigits = prefix.slice(1);
    if (!digits.startsWith(countryDigits)) digits = countryDigits + digits.replace(/^0+/, "");
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : "";
  }
  const byName = (group, name) => group.querySelector(`[name="${name}"]`);
  const getPhone = (group) => normalizePhone(byName(group, "phone")?.value, byName(group, "country")?.value);
  const validGroup = (group) => {
    const invalid = Array.from(group.querySelectorAll("input,select,textarea")).find((control) => !control.checkValidity());
    if (invalid) { invalid.reportValidity(); return false; }
    return true;
  };
  const bindAction = (group, handler) => {
    const button = group.querySelector("[data-auth-submit]");
    if (!button) return;
    button.addEventListener("click", handler);
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && event.target.matches("input,select")) { event.preventDefault(); button.click(); }
    });
  };
  const setBusy = (button, busy, label) => {
    if (!button) return;
    if (busy) { button.dataset.oldLabel = button.textContent; button.disabled = true; button.textContent = label; }
    else { button.disabled = false; button.textContent = button.dataset.oldLabel || label; delete button.dataset.oldLabel; }
  };
  const toHome = () => { window.location.assign("/index.html"); };

  if (["login", "register"].includes(page) && !client) {
    document.querySelectorAll("[data-auth-config]").forEach((el) => show(el, configMessage, "warning"));
  }
  if (["login", "register"].includes(page)) {
    const country = $("[data-country]");
    const hint = $("[data-phone-hint]");
    const updateHint = () => { if (hint && country) hint.textContent = `Indicatif ${prefixes[country.value] || ""} · le numéro local est accepté.`; };
    country?.addEventListener("change", updateHint);
    updateHint();
    if (client) client.auth.getSession().then(({ data }) => {
      if (data?.session) show($("[data-auth-message]"), "Tu es déjà connecté à ce compte.", "success");
    }).catch(() => {});

    const loginForm = $('[data-auth-form="login"]');
    if (loginForm) bindAction(loginForm, async (event) => {
      event.preventDefault();
      formMessage("");
      if (!client) return formMessage(configMessage, "warning");
      if (!validGroup(loginForm)) return;
      const phone = getPhone(loginForm);
      const password = byName(loginForm, "password").value;
      if (!phone) return formMessage("Vérifie le numéro et le pays sélectionné.");
      if (password.length < 12) return formMessage("Le mot de passe doit comporter au moins 12 caractères.");
      const button = loginForm.querySelector("[data-auth-submit]");
      setBusy(button, true, "Connexion…");
      try {
        const { error } = await client.auth.signInWithPassword({ phone, password });
        if (error) throw error;
        window.sessionStorage.removeItem("rangers_pending_phone");
        toHome();
      } catch (error) { formMessage(friendlyError(error)); }
      finally { setBusy(button, false, "Se connecter"); }
    });

    const registerForm = $('[data-auth-form="register"]');
    const verifyForm = $('[data-auth-form="verify-signup"]');
    if (registerForm) bindAction(registerForm, async (event) => {
      event.preventDefault();
      formMessage("");
      if (!client) return formMessage(configMessage, "warning");
      if (!validGroup(registerForm)) return;
      const phone = getPhone(registerForm);
      const password = byName(registerForm, "password").value;
      const confirmPassword = byName(registerForm, "confirmPassword").value;
      const countryCode = byName(registerForm, "country").value;
      const inviteCode = String(byName(registerForm, "inviteCode").value || "").trim();
      if (!phone) return formMessage("Vérifie le numéro et le pays sélectionné.");
      if (password.length < 12) return formMessage("Choisis un mot de passe d’au moins 12 caractères.");
      if (password !== confirmPassword) return formMessage("Les deux mots de passe ne correspondent pas.");
      if (!byName(registerForm, "acknowledged").checked) return formMessage("Accepte les conditions pour continuer.");
      const button = registerForm.querySelector("[data-auth-submit]");
      setBusy(button, true, "Création…");
      try {
        const { data, error } = await client.auth.signUp({
          phone,
          password,
          options: { data: { country: countryCode, invite_code: inviteCode || null } }
        });
        if (error) throw error;
        if (data?.session) {
          formMessage("Compte créé et connecté.", "success");
          setTimeout(toHome, 700);
        } else {
          window.sessionStorage.setItem("rangers_pending_phone", phone);
          registerForm.hidden = true;
          if (verifyForm) verifyForm.hidden = false;
          show($("[data-auth-message]"), `Code SMS envoyé à ${phone}. Saisis les 6 chiffres reçus.`, "success");
          $("#signupOtp")?.focus();
        }
      } catch (error) { formMessage(friendlyError(error)); }
      finally { setBusy(button, false, "Créer mon compte"); }
    });

    if (verifyForm) bindAction(verifyForm, async (event) => {
      event.preventDefault();
      formMessage("");
      if (!client) return formMessage(configMessage, "warning");
      if (!validGroup(verifyForm)) return;
      const phone = window.sessionStorage.getItem("rangers_pending_phone");
      const token = String(byName(verifyForm, "token").value || "").trim();
      if (!phone) return formMessage("Aucune inscription en attente. Recommence l’inscription.");
      if (!/^\d{6}$/.test(token)) return formMessage("Le code doit contenir exactement 6 chiffres.");
      const button = verifyForm.querySelector("[data-auth-submit]");
      setBusy(button, true, "Vérification…");
      try {
        const { error } = await client.auth.verifyOtp({ phone, token, type: "sms" });
        if (error) throw error;
        window.sessionStorage.removeItem("rangers_pending_phone");
        formMessage("Numéro vérifié. Ton compte est connecté.", "success");
        setTimeout(toHome, 700);
      } catch (error) { formMessage(friendlyError(error)); }
      finally { setBusy(button, false, "Vérifier le numéro"); }
    });
  }

  const main = $("main") || document.body;
  const topbar = main.querySelector(".topbar");
  const isAuthPage = ["login", "register"].includes(page);
  if (!isAuthPage && !$(".static-site-notice")) {
    const notice = document.createElement("div");
    notice.className = "notice warning static-site-notice";
    notice.setAttribute("role", "status");
    notice.textContent = "La connexion utilise Supabase. Les soldes, produits personnels, dépôts, retraits et paiements ne sont pas activés sur cette version.";
    if (topbar) topbar.insertAdjacentElement("afterend", notice);
    else main.prepend(notice);
  }

  const disableForm = (form) => {
    form.querySelectorAll("input, select, textarea, button").forEach((control) => { control.disabled = true; });
    form.setAttribute("aria-disabled", "true");
  };
  document.querySelectorAll("form").forEach((form) => {
    if (form.matches('[data-auth-form="login"],[data-auth-form="register"],[data-auth-form="verify-signup"]')) return;
    disableForm(form);
  });

  const products = $("[data-products]");
  if (products) products.innerHTML = '<div class="empty"><strong>Aucune offre disponible</strong>Le catalogue n’est pas encore relié à des données de produits.</div>';
  const team = $("[data-team]");
  if (team) team.innerHTML = '<div class="empty"><strong>Données d’équipe indisponibles</strong>Cette version ne contient pas de service de gestion de l’équipe.</div>';
  const history = $("[data-history]");
  if (history) history.innerHTML = '<div class="empty"><strong>Historique indisponible</strong>Cette version ne stocke pas les opérations.</div>';
  const admin = $("[data-admin-content]");
  if (admin) admin.innerHTML = '<div class="empty"><strong>Administration indisponible</strong>Cette version ne comporte pas de serveur d’administration.</div>';

  function addSessionCard(session) {
    document.querySelector("[data-session-card]")?.remove();
    document.querySelectorAll("[data-logout]").forEach((el) => { el.hidden = !session; el.disabled = !session; });
    document.querySelectorAll("[data-signed-out]").forEach((el) => { el.hidden = Boolean(session); });
    document.querySelectorAll("[data-signed-in]").forEach((el) => { el.hidden = true; });
    if (!session || isAuthPage) return;
    const user = session.user || {};
    const card = document.createElement("section");
    card.className = "card session-card";
    card.dataset.sessionCard = "";
    const heading = document.createElement("strong");
    heading.textContent = `Connecté : ${user.phone || "compte Supabase"}`;
    const detail = document.createElement("p");
    detail.className = "subtle";
    detail.textContent = "Authentification active. Les opérations financières ne sont pas disponibles sur cette version.";
    const existingLogout = $("[data-logout]");
    const logout = existingLogout || document.createElement("button");
    if (!existingLogout) {
      logout.type = "button";
      logout.className = "button light";
      logout.dataset.authLogout = "";
      logout.textContent = "Se déconnecter";
    }
    card.append(heading, detail);
    if (!existingLogout) card.append(logout);
    if (topbar) topbar.insertAdjacentElement("afterend", card);
    else main.prepend(card);
  }

  if (client) {
    client.auth.getSession().then(({ data }) => addSessionCard(data?.session || null)).catch(() => {});
    client.auth.onAuthStateChange((_event, session) => addSessionCard(session));
  }
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-auth-logout],[data-logout]");
    if (!button || !client) return;
    button.disabled = true;
    try {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
      window.location.assign("/index.html");
    } catch { button.disabled = false; button.textContent = "Déconnexion indisponible"; }
  });
})();
