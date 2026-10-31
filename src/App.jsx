import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import {
  Activity, ArrowDownToLine, ArrowUpFromLine, BadgeCheck, CircleHelp,
  Clock3, CreditCard, Home, LogOut, Menu, Shield, UserRound, Wallet, X
} from "lucide-react";
import { supabase, isConfigured } from "./lib/supabase";
import { api } from "./lib/api";

const COUNTRIES = [
  { name: "Sénégal", flag: "🇸🇳", code: "+221" },
  { name: "Bénin", flag: "🇧🇯", code: "+229" },
  { name: "Côte d’Ivoire", flag: "🇨🇮", code: "+225" },
  { name: "Mali", flag: "🇲🇱", code: "+223" }
];

function Notice({ children, kind = "info" }) {
  return <div className={`notice ${kind}`} role="status">{children}</div>;
}

function AuthPage({ mode }) {
  const navigate = useNavigate();
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const signup = mode === "signup";

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    if (!isConfigured) return setMessage("Configurez d'abord Supabase avec le guide README.");
    if (phone.replace(/\D/g, "").length < 7) return setMessage("Entrez un numéro de téléphone valide.");
    if (password.length < 8) return setMessage("Le mot de passe doit contenir au moins 8 caractères.");
    if (signup && !name.trim()) return setMessage("Entrez votre nom.");
    setBusy(true);
    const fullPhone = `${country.code}${phone.replace(/\D/g, "")}`;
    try {
      const result = signup
        ? await supabase.auth.signUp({
            phone: fullPhone,
            password,
            options: { data: { full_name: name.trim(), country: country.name } }
          })
        : await supabase.auth.signInWithPassword({ phone: fullPhone, password });
      if (result.error) throw result.error;
      if (signup && !result.data.session) {
        setMessage("Compte créé. Vérifiez le SMS de confirmation si la confirmation téléphonique est activée.");
      } else {
        navigate("/app");
      }
    } catch (err) {
      setMessage(err.message || "Impossible de continuer.");
    } finally { setBusy(false); }
  }

  return (
    <main className="auth-shell">
      <div className="auth-glow glow-one" /><div className="auth-glow glow-two" />
      <Link className="brand auth-brand" to="/"><span className="brand-mark">P</span><span>PICO<span className="gradient-text">INVEST</span></span></Link>
      <section className="auth-card">
        <div className="eyebrow">ESPACE SÉCURISÉ</div>
        <h1>{signup ? "Créer un compte" : "Bon retour"}</h1>
        <p className="muted">{signup ? "Rejoignez votre espace PICOINVEST." : "Connectez-vous à votre espace membre."}</p>
        {message && <Notice kind={message.startsWith("Compte créé") ? "success" : "error"}>{message}</Notice>}
        <form onSubmit={submit} className="form-stack">
          {signup && <label>Nom complet<input value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" autoComplete="name" /></label>}
          <label>Pays
            <select value={country.code} onChange={e => setCountry(COUNTRIES.find(c => c.code === e.target.value))}>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.code})</option>)}
            </select>
          </label>
          <label>Numéro de téléphone
            <div className="phone-input"><span>{country.flag} {country.code}</span><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="77 000 00 00" inputMode="tel" autoComplete="tel-national" /></div>
          </label>
          <label>Mot de passe<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8 caractères minimum" autoComplete={signup ? "new-password" : "current-password"} /></label>
          <button className="button primary full" disabled={busy}>{busy ? "Veuillez patienter…" : signup ? "Créer mon compte" : "Se connecter"}</button>
        </form>
        <p className="auth-switch">{signup ? "Vous avez déjà un compte ?" : "Pas encore de compte ?"} <Link to={signup ? "/connexion" : "/inscription"}>{signup ? "Se connecter" : "S’inscrire"}</Link></p>
      </section>
      <p className="fine-print">PICOINVEST · Accès réservé aux membres</p>
    </main>
  );
}

function AppLayout({ session, profile, children, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    ["/app", "Accueil", Home], ["/app/recharge", "Recharge", ArrowDownToLine],
    ["/app/retrait", "Retrait", ArrowUpFromLine], ["/app/historique", "Historique", Clock3],
    ...(profile?.role === "admin" ? [["/app/admin", "Administration", Shield]] : [])
  ];
  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
      <Link className="brand" to="/app"><span className="brand-mark">P</span><span>PICO<span className="gradient-text">INVEST</span></span></Link>
      <div className="side-label">MENU PRINCIPAL</div>
      <nav>{links.map(([to, label, Icon]) => <Link key={to} to={to} onClick={() => setMenuOpen(false)}><Icon size={18}/>{label}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="profile-mini"><div className="avatar"><UserRound size={18}/></div><div><b>{profile?.full_name || "Membre"}</b><small>{profile?.phone || session.user.phone}</small></div></div><button className="quiet-button" onClick={onSignOut}><LogOut size={17}/> Déconnexion</button></div>
    </aside>
    {menuOpen && <button className="scrim" aria-label="Fermer le menu" onClick={() => setMenuOpen(false)} />}
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)}><Menu/></button><div><span className="muted small">ESPACE MEMBRE</span><b>Tableau de bord</b></div><div className="topbar-right"><span className="online-dot"/> Connecté <div className="avatar"><UserRound size={17}/></div></div></header>
      <div className="page-content">{children}</div>
      <footer className="footer">© {new Date().getFullYear()} PICOINVEST <span>·</span> Espace membre</footer>
    </main>
  </div>;
}

function Dashboard({ profile }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { api("transactions").then(r => setTransactions(r.transactions || [])).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  const balance = Number(profile?.balance || 0);
  return <>
    <div className="welcome-row"><div><div className="eyebrow">VOTRE ESPACE</div><h1>Bonjour, {profile?.full_name?.split(" ")[0] || "membre"} 👋</h1><p className="muted">Retrouvez ici le résumé de votre compte.</p></div><span className="status-chip"><span className="online-dot"/> Compte actif</span></div>
    <section className="balance-card"><div><span className="balance-label">SOLDE DU COMPTE</span><h2>{balance.toLocaleString("fr-FR")} <small>FCFA</small></h2><p>Solde enregistré sur votre compte</p></div><div className="balance-icon"><Wallet size={27}/></div></section>
    <div className="section-heading"><div><h2>Actions rapides</h2><p className="muted">Gérez vos opérations</p></div></div>
    <div className="quick-grid">
      <Link to="/app/recharge" className="quick-card"><span className="quick-icon cyan"><ArrowDownToLine/></span><b>Faire une recharge</b><small>Soumettre une demande</small></Link>
      <Link to="/app/retrait" className="quick-card"><span className="quick-icon pink"><ArrowUpFromLine/></span><b>Demander un retrait</b><small>Soumettre une demande</small></Link>
      <Link to="/app/historique" className="quick-card"><span className="quick-icon violet"><Activity/></span><b>Mes opérations</b><small>Consulter l’historique</small></Link>
    </div>
    <div className="section-heading"><div><h2>Activité récente</h2><p className="muted">Vos dernières demandes</p></div><Link to="/app/historique" className="text-link">Tout voir</Link></div>
    {error && <Notice kind="error">{error}</Notice>}
    <TransactionTable transactions={transactions.slice(0, 5)} loading={loading}/>
    <Notice>Les demandes de recharge et de retrait sont soumises à vérification. Aucun paiement n’est exécuté automatiquement par cette version.</Notice>
  </>;
}

function TransactionTable({ transactions, loading }) {
  if (loading) return <div className="empty-state">Chargement des opérations…</div>;
  if (!transactions.length) return <div className="empty-state"><CreditCard size={25}/><b>Aucune opération</b><span>Vos demandes apparaîtront ici.</span></div>;
  return <div className="table-wrap"><table><thead><tr><th>Type</th><th>Montant</th><th>Date</th><th>Statut</th></tr></thead><tbody>{transactions.map(t => <tr key={t.id}><td>{t.type === "deposit" ? "Recharge" : "Retrait"}</td><td>{Number(t.amount).toLocaleString("fr-FR")} FCFA</td><td>{new Date(t.created_at).toLocaleDateString("fr-FR")}</td><td><span className={`tag ${t.status}`}>{statusLabel(t.status)}</span></td></tr>)}</tbody></table></div>;
}
const statusLabel = s => ({pending:"En attente", approved:"Approuvée", rejected:"Refusée"}[s] || s);

function RequestPage({ type }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Wave");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const deposit = type === "deposit";
  async function submit(e) {
    e.preventDefault(); setMessage("");
    const n = Number(amount);
    if (!Number.isFinite(n) || n < (deposit ? 2000 : 1000)) return setMessage(`Montant minimum : ${(deposit ? 2000 : 1000).toLocaleString("fr-FR")} FCFA.`);
    setBusy(true);
    try {
      await api("transactions", { method: "POST", body: JSON.stringify({ type, amount: n, method, reference }) });
      setMessage("Demande enregistrée. Elle sera examinée par l’administration.");
      setAmount(""); setReference("");
    } catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }
  return <><div className="eyebrow">OPÉRATIONS</div><h1>{deposit ? "Faire une recharge" : "Demander un retrait"}</h1><p className="muted">Remplissez les informations pour soumettre votre demande.</p>
    {message && <Notice kind={message.startsWith("Demande enregistrée") ? "success" : "error"}>{message}</Notice>}
    <section className="panel form-panel"><form className="form-stack" onSubmit={submit}>
      <label>Montant (FCFA)<input type="number" min={deposit ? 2000 : 1000} step="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder={deposit ? "Minimum 2 000" : "Minimum 1 000"} required /></label>
      <label>{deposit ? "Moyen de paiement prévu" : "Moyen de réception"}<select value={method} onChange={e => setMethod(e.target.value)}><option>Wave</option><option>Orange Money</option><option>Free Money</option><option>MTN MoMo</option></select></label>
      <label>Référence / numéro de transaction (facultatif)<input value={reference} onChange={e => setReference(e.target.value)} placeholder="Référence de l’opération" /></label>
      {!deposit && <Notice>Les frais de retrait applicables doivent être confirmés avant validation. Cette interface n’effectue aucun transfert d’argent.</Notice>}
      <button className="button primary" disabled={busy}>{busy ? "Envoi…" : "Envoyer la demande"}</button>
    </form></section>
  </>;
}

function HistoryPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api("transactions")
      .then(r => setTransactions(r.transactions || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return <><div className="eyebrow">SUIVI</div><h1>Historique</h1><p className="muted">Toutes vos demandes de recharge et de retrait.</p>{error && <Notice kind="error">{error}</Notice>}<TransactionTable transactions={transactions} loading={loading}/></>;
}

function AdminPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  async function load() { try { const r = await api("admin/transactions"); setRows(r.transactions || []); setError(""); } catch(e) { setError(e.message); } }
  useEffect(() => { load(); }, []);
  async function decide(id, status) {
    setBusyId(id); setError("");
    try { await api("admin/transactions", { method: "PATCH", body: JSON.stringify({ id, status }) }); await load(); }
    catch(e) { setError(e.message); } finally { setBusyId(""); }
  }
  return <><div className="eyebrow">ZONE PRIVÉE</div><h1>Administration</h1><p className="muted">Examinez les demandes en attente. Les actions sont journalisées côté base de données.</p>{error && <Notice kind="error">{error}</Notice>}
    <div className="admin-warning"><Shield size={18}/> Accès réservé aux comptes dont le rôle administrateur a été attribué dans Supabase.</div>
    <div className="table-wrap"><table><thead><tr><th>Membre</th><th>Type</th><th>Montant</th><th>Date</th><th>Statut</th><th>Action</th></tr></thead><tbody>{rows.map(t => <tr key={t.id}><td>{t.profiles?.full_name || t.user_id.slice(0,8)}</td><td>{t.type === "deposit" ? "Recharge" : "Retrait"}</td><td>{Number(t.amount).toLocaleString("fr-FR")} F</td><td>{new Date(t.created_at).toLocaleDateString("fr-FR")}</td><td><span className={`tag ${t.status}`}>{statusLabel(t.status)}</span></td><td>{t.status === "pending" ? <div className="action-row"><button className="mini approve" disabled={busyId===t.id} onClick={() => decide(t.id,"approved")}>Valider</button><button className="mini reject" disabled={busyId===t.id} onClick={() => decide(t.id,"rejected")}>Refuser</button></div> : "—"}</td></tr>)}</tbody></table>{!rows.length && <div className="empty-state">Aucune demande pour le moment.</div>}</div>
  </>;
}

function ProtectedApp() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({data}) => setSession(data.session)).finally(() => setLoading(false));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session || !supabase) { setProfile(null); return; }
    supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({data}) => setProfile(data));
  }, [session]);
  async function signOut() { await supabase.auth.signOut(); navigate("/connexion"); }
  if (!isConfigured) return <main className="setup-screen"><div className="brand"><span className="brand-mark">P</span>PICOINVEST</div><h1>Configuration requise</h1><p>Ajoutez les clés Supabase dans les variables d’environnement. Consultez le fichier README.md inclus dans le ZIP.</p></main>;
  if (loading) return <div className="loading-screen">Chargement de votre espace…</div>;
  if (!session) return <Navigate to="/connexion" replace/>;
  return <AppLayout session={session} profile={profile} onSignOut={signOut}>
    <Routes>
      <Route index element={<Dashboard profile={profile}/>}/>
      <Route path="recharge" element={<RequestPage type="deposit"/>}/>
      <Route path="retrait" element={<RequestPage type="withdrawal"/>}/>
      <Route path="historique" element={<HistoryPage/>}/>
      <Route path="admin" element={profile?.role === "admin" ? <AdminPage/> : <Navigate to="/app" replace/>}/>
      <Route path="*" element={<Navigate to="/app" replace/>}/>
    </Routes>
  </AppLayout>;
}

export default function App() {
  return <Routes>
    <Route path="/" element={<Navigate to="/connexion" replace/>}/>
    <Route path="/connexion" element={<AuthPage mode="login"/>}/>
    <Route path="/inscription" element={<AuthPage mode="signup"/>}/>
    <Route path="/app/*" element={<ProtectedApp/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>;
}
