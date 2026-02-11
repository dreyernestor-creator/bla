import React, { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Users, Phone, Calendar, BarChart3, LogOut, Menu, X, ChevronRight, Clock, UserCheck, UserX, PhoneOff, CheckCircle, Upload, Settings, Home, RefreshCw, FileText, TrendingUp } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
    } catch (e) {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// API Helper
const apiCall = async (method, endpoint, data = null, token = null) => {
  const config = {
    method,
    url: `${API}${endpoint}`,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  };
  if (data) {
    if (data instanceof FormData) {
      config.data = data;
    } else {
      config.data = data;
      config.headers["Content-Type"] = "application/json";
    }
  }
  const res = await axios(config);
  return res.data;
};

// ==================== COMPONENTS ====================

// Home Page
const HomePage = () => {
  const navigate = useNavigate();
  
  return (
    <div className="home-container" data-testid="home-page">
      <div className="home-content">
        <div className="home-logo">
          <Users size={64} />
        </div>
        <h1 className="home-title">LeadCentral</h1>
        <p className="home-subtitle">Centralisation de votre prospection</p>
        
        <div className="home-buttons">
          <button 
            className="home-btn prospecteur"
            onClick={() => navigate("/prospecteur")}
            data-testid="espace-prospecteur-btn"
          >
            <Users size={20} />
            Espace Prospecteur
          </button>
          
          <button 
            className="home-btn organisateur"
            onClick={() => navigate("/admin/login")}
            data-testid="espace-organisateur-btn"
          >
            <Settings size={20} />
            Espace Organisateur
          </button>
          
          <div className="home-divider">
            <span>Bientôt disponible</span>
          </div>
          
          <button className="home-btn client disabled" disabled data-testid="espace-client-btn">
            <FileText size={20} />
            Espace Client
          </button>
        </div>
      </div>
    </div>
  );
};

// Prospecteur Auth Page
const ProspecteurAuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ nom: "", prenom: "", email: "", telephone: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isLogin) {
        const user = await login(formData.email, formData.password);
        navigate(user.role === "admin" ? "/admin" : "/dashboard");
      } else {
        await axios.post(`${API}/auth/register`, {
          nom: formData.nom,
          prenom: formData.prenom,
          email: formData.email,
          telephone: formData.telephone
        });
        setMessage("Votre demande a été envoyée. Vous recevrez vos identifiants par email une fois validé.");
        setFormData({ nom: "", prenom: "", email: "", telephone: "", password: "" });
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" data-testid="prospecteur-auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Users size={40} className="auth-icon" />
          <h2>Espace Prospecteur</h2>
        </div>

        <div className="auth-tabs">
          <button 
            className={`auth-tab ${isLogin ? "active" : ""}`}
            onClick={() => setIsLogin(true)}
            data-testid="login-tab"
          >
            Connexion
          </button>
          <button 
            className={`auth-tab ${!isLogin ? "active" : ""}`}
            onClick={() => setIsLogin(false)}
            data-testid="register-tab"
          >
            Inscription
          </button>
        </div>

        {message && <div className="success-message" data-testid="success-message">{message}</div>}
        {error && <div className="error-message" data-testid="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <div className="form-group">
                <label>Nom</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                  data-testid="nom-input"
                />
              </div>
              <div className="form-group">
                <label>Prénom</label>
                <input
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  required
                  data-testid="prenom-input"
                />
              </div>
            </>
          )}
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              data-testid="email-input"
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Téléphone</label>
              <input
                type="tel"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                required
                data-testid="telephone-input"
              />
            </div>
          )}

          {isLogin && (
            <div className="form-group">
              <label>Mot de passe</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                data-testid="password-input"
              />
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading} data-testid="submit-btn">
            {loading ? "Chargement..." : (isLogin ? "Se connecter" : "Envoyer une demande")}
          </button>
        </form>

        <button className="back-btn" onClick={() => navigate("/")} data-testid="back-home-btn">
          <Home size={16} /> Retour à l'accueil
        </button>
      </div>
    </div>
  );
};

// Admin Login Page
const AdminLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        setError("Accès réservé aux organisateurs");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container admin-auth" data-testid="admin-login-page">
      <div className="auth-card">
        <div className="auth-header">
          <Settings size={40} className="auth-icon admin" />
          <h2>Espace Organisateur</h2>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="admin-email-input"
            />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="admin-password-input"
            />
          </div>
          <button type="submit" className="submit-btn admin" disabled={loading} data-testid="admin-submit-btn">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <button className="back-btn" onClick={() => navigate("/")} data-testid="admin-back-btn">
          <Home size={16} /> Retour à l'accueil
        </button>
      </div>
    </div>
  );
};

// Validation Page
const ValidationPage = () => {
  const { token } = useParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await axios.get(`${API}/auth/validate/${token}`);
      setStatus("success");
      setMessage(res.data.message);
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.detail || "Lien de validation invalide");
    }
  };

  return (
    <div className="validation-container" data-testid="validation-page">
      <div className="validation-card">
        {status === "loading" && <div className="loading">Validation en cours...</div>}
        {status === "success" && (
          <div className="success">
            <CheckCircle size={64} className="success-icon" />
            <h2>Compte validé !</h2>
            <p>{message}</p>
          </div>
        )}
        {status === "error" && (
          <div className="error">
            <X size={64} className="error-icon" />
            <h2>Erreur</h2>
            <p>{message}</p>
          </div>
        )}
        <button className="back-btn" onClick={() => navigate("/")}>
          <Home size={16} /> Retour à l'accueil
        </button>
      </div>
    </div>
  );
};

// Prospecteur Dashboard
const ProspecteurDashboard = () => {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("principale");
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [stats, setStats] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const tabs = [
    { id: "principale", label: "Liste principale", icon: Phone, count: 0 },
    { id: "a_rappeler", label: "À rappeler", icon: RefreshCw, count: 0 },
    { id: "pas_de_reponse", label: "Pas de réponse", icon: PhoneOff, count: 0 },
    { id: "rdv_pris", label: "Rendez-vous pris", icon: Calendar, count: 0 }
  ];

  useEffect(() => {
    fetchProspects();
    fetchStats();
  }, [activeTab]);

  const fetchProspects = async () => {
    setLoading(true);
    try {
      const data = await apiCall("GET", `/prospects?liste=${activeTab}`, null, token);
      setProspects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiCall("GET", "/prospects/stats", null, token);
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCall = (prospect) => {
    setSelectedProspect(prospect);
    // Trigger phone call on mobile
    window.location.href = `tel:${prospect.telephone}`;
    setShowCallModal(true);
  };

  const handleCallResult = async (result, extraData = {}) => {
    try {
      await apiCall("POST", "/prospects/call-result", {
        prospect_id: selectedProspect.id,
        result,
        ...extraData
      }, token);
      setShowCallModal(false);
      setSelectedProspect(null);
      fetchProspects();
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="dashboard-container" data-testid="prospecteur-dashboard">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h2>LeadCentral</h2>
          <button className="close-sidebar" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
              data-testid={`nav-${tab.id}`}
            >
              <tab.icon size={20} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => setShowProfile(true)} data-testid="profile-btn">
            <BarChart3 size={20} />
            <span>Mon profil</span>
          </button>
          <button className="nav-item logout" onClick={handleLogout} data-testid="logout-btn">
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <header className="dashboard-header">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h1>{tabs.find(t => t.id === activeTab)?.label}</h1>
          <div className="user-info">
            <span>{user?.prenom} {user?.nom}</span>
          </div>
        </header>

        <div className="prospects-list">
          {loading ? (
            <div className="loading-state">Chargement...</div>
          ) : prospects.length === 0 ? (
            <div className="empty-state">
              <Phone size={48} />
              <p>Aucun prospect dans cette liste</p>
            </div>
          ) : (
            prospects.map((prospect) => (
              <div key={prospect.id} className="prospect-card" data-testid={`prospect-${prospect.id}`}>
                <div className="prospect-info">
                  <div className="prospect-name">
                    <Users size={20} />
                    {prospect.nom}
                  </div>
                  <div className="prospect-details">
                    <span className="prospect-secteur">{prospect.secteur}</span>
                    <span className="prospect-phone">
                      <Phone size={14} /> {prospect.telephone}
                    </span>
                  </div>
                  {prospect.rappel_date && (
                    <div className="prospect-rappel">
                      <Clock size={14} /> Rappel: {prospect.rappel_date}
                    </div>
                  )}
                  {prospect.rdv_date && (
                    <div className="prospect-rdv">
                      <Calendar size={14} /> RDV: {prospect.rdv_date} à {prospect.rdv_heure}
                    </div>
                  )}
                </div>
                <button 
                  className="call-btn"
                  onClick={() => handleCall(prospect)}
                  data-testid={`call-${prospect.id}`}
                >
                  <Phone size={20} />
                  Appeler
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Call Result Modal */}
      {showCallModal && selectedProspect && (
        <CallResultModal
          prospect={selectedProspect}
          onResult={handleCallResult}
          onClose={() => setShowCallModal(false)}
        />
      )}

      {/* Profile Modal */}
      {showProfile && stats && (
        <ProfileModal
          user={user}
          stats={stats}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
};

// Call Result Modal
const CallResultModal = ({ prospect, onResult, onClose }) => {
  const [step, setStep] = useState("result");
  const [rappelDate, setRappelDate] = useState("");
  const [rappelNote, setRappelNote] = useState("");
  const [rdvData, setRdvData] = useState({
    date: "",
    heure: "",
    telephone: "",
    email: "",
    note: ""
  });

  const handleRefus = () => onResult("refus");
  const handlePasDeReponse = () => onResult("pas_de_reponse");
  
  const handleRappeler = () => {
    if (!rappelDate) return;
    onResult("a_rappeler", { rappel_date: rappelDate, rappel_note: rappelNote });
  };

  const handleRdv = () => {
    if (!rdvData.date || !rdvData.heure) return;
    onResult("rdv_pris", {
      rdv_date: rdvData.date,
      rdv_heure: rdvData.heure,
      rdv_telephone: rdvData.telephone,
      rdv_email: rdvData.email,
      rdv_note: rdvData.note
    });
  };

  return (
    <div className="modal-overlay" data-testid="call-result-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Fin d'appel - {prospect.nom}</h3>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>

        {step === "result" && (
          <div className="result-buttons">
            <button className="result-btn refus" onClick={handleRefus} data-testid="result-refus">
              <UserX size={24} />
              <span>REFUS</span>
            </button>
            <button className="result-btn rappeler" onClick={() => setStep("rappeler")} data-testid="result-rappeler">
              <RefreshCw size={24} />
              <span>À RAPPELER</span>
            </button>
            <button className="result-btn no-response" onClick={handlePasDeReponse} data-testid="result-no-response">
              <PhoneOff size={24} />
              <span>PAS DE RÉPONSE</span>
            </button>
            <button className="result-btn rdv" onClick={() => setStep("rdv")} data-testid="result-rdv">
              <CheckCircle size={24} />
              <span>RENDEZ-VOUS PRIS</span>
            </button>
          </div>
        )}

        {step === "rappeler" && (
          <div className="form-step">
            <h4>Planifier un rappel</h4>
            <div className="form-group">
              <label>Date de rappel</label>
              <input
                type="date"
                value={rappelDate}
                onChange={(e) => setRappelDate(e.target.value)}
                required
                data-testid="rappel-date-input"
              />
            </div>
            <div className="form-group">
              <label>Note (optionnel)</label>
              <textarea
                value={rappelNote}
                onChange={(e) => setRappelNote(e.target.value)}
                placeholder="Ajouter une note..."
                data-testid="rappel-note-input"
              />
            </div>
            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setStep("result")}>Retour</button>
              <button className="confirm-btn" onClick={handleRappeler} data-testid="confirm-rappel">Confirmer</button>
            </div>
          </div>
        )}

        {step === "rdv" && (
          <div className="form-step">
            <h4>Détails du rendez-vous</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={rdvData.date}
                  onChange={(e) => setRdvData({ ...rdvData, date: e.target.value })}
                  required
                  data-testid="rdv-date-input"
                />
              </div>
              <div className="form-group">
                <label>Heure *</label>
                <input
                  type="time"
                  value={rdvData.heure}
                  onChange={(e) => setRdvData({ ...rdvData, heure: e.target.value })}
                  required
                  data-testid="rdv-heure-input"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Téléphone personnel</label>
              <input
                type="tel"
                value={rdvData.telephone}
                onChange={(e) => setRdvData({ ...rdvData, telephone: e.target.value })}
                placeholder={prospect.telephone}
                data-testid="rdv-tel-input"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={rdvData.email}
                onChange={(e) => setRdvData({ ...rdvData, email: e.target.value })}
                placeholder="email@exemple.com"
                data-testid="rdv-email-input"
              />
            </div>
            <div className="form-group">
              <label>Note (optionnel)</label>
              <textarea
                value={rdvData.note}
                onChange={(e) => setRdvData({ ...rdvData, note: e.target.value })}
                placeholder="Ajouter une note..."
                data-testid="rdv-note-input"
              />
            </div>
            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setStep("result")}>Retour</button>
              <button className="confirm-btn success" onClick={handleRdv} data-testid="confirm-rdv">Confirmer RDV</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Profile Modal
const ProfileModal = ({ user, stats, onClose }) => {
  const dailyData = Object.entries(stats.daily_stats || {}).map(([date, data]) => ({
    date,
    ...data
  })).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="modal-overlay" data-testid="profile-modal">
      <div className="modal-content profile-modal">
        <div className="modal-header">
          <h3>Mon Profil</h3>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="profile-info">
          <div className="profile-avatar">
            <Users size={48} />
          </div>
          <h4>{user.prenom} {user.nom}</h4>
          <p>{user.email}</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <TrendingUp size={24} />
            <div className="stat-value">{stats.conversion_rate}%</div>
            <div className="stat-label">Taux de conversion</div>
          </div>
          <div className="stat-card">
            <Phone size={24} />
            <div className="stat-value">{stats.total_calls}</div>
            <div className="stat-label">Appels passés</div>
          </div>
          <div className="stat-card success">
            <CheckCircle size={24} />
            <div className="stat-value">{stats.rdv_pris}</div>
            <div className="stat-label">RDV pris</div>
          </div>
          <div className="stat-card warning">
            <RefreshCw size={24} />
            <div className="stat-value">{stats.a_rappeler}</div>
            <div className="stat-label">À rappeler</div>
          </div>
          <div className="stat-card danger">
            <UserX size={24} />
            <div className="stat-value">{stats.refus}</div>
            <div className="stat-label">Refus</div>
          </div>
          <div className="stat-card muted">
            <PhoneOff size={24} />
            <div className="stat-value">{stats.pas_de_reponse}</div>
            <div className="stat-label">Pas de réponse</div>
          </div>
        </div>

        {dailyData.length > 0 && (
          <div className="weekly-chart">
            <h4>Activité des 7 derniers jours</h4>
            <div className="chart-bars">
              {dailyData.slice(-7).map((day) => (
                <div key={day.date} className="chart-bar">
                  <div className="bar-stack">
                    <div className="bar rdv" style={{ height: `${day.rdv * 20}px` }} title={`RDV: ${day.rdv}`}></div>
                    <div className="bar rappel" style={{ height: `${day.rappel * 10}px` }} title={`Rappel: ${day.rappel}`}></div>
                    <div className="bar refus" style={{ height: `${day.refus * 10}px` }} title={`Refus: ${day.refus}`}></div>
                  </div>
                  <span className="bar-label">{day.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Admin Dashboard
const AdminDashboard = () => {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [prospecteurs, setProspecteurs] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "dashboard") {
        const data = await apiCall("GET", "/admin/stats", null, token);
        setStats(data);
      } else if (activeTab === "prospecteurs") {
        const data = await apiCall("GET", "/admin/prospecteurs", null, token);
        setProspecteurs(data);
      } else if (activeTab === "prospects") {
        const data = await apiCall("GET", "/admin/prospects/all", null, token);
        setProspects(data);
      } else if (activeTab === "import") {
        const data = await apiCall("GET", "/admin/prospects/unassigned", null, token);
        setUnassigned(data);
        const p = await apiCall("GET", "/admin/prospecteurs", null, token);
        setProspecteurs(p.filter(pr => pr.status === "active"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleStatusChange = async (prospecteurId, newStatus) => {
    try {
      await apiCall("PUT", `/admin/prospecteurs/${prospecteurId}/status?status=${newStatus}`, null, token);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="dashboard-container admin" data-testid="admin-dashboard">
      {/* Sidebar */}
      <div className={`sidebar admin ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h2>LeadCentral</h2>
          <span className="admin-badge">Admin</span>
          <button className="close-sidebar" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => { setActiveTab("dashboard"); setSidebarOpen(false); }}
            data-testid="admin-nav-dashboard"
          >
            <BarChart3 size={20} />
            <span>Tableau de bord</span>
          </button>
          <button
            className={`nav-item ${activeTab === "prospecteurs" ? "active" : ""}`}
            onClick={() => { setActiveTab("prospecteurs"); setSidebarOpen(false); }}
            data-testid="admin-nav-prospecteurs"
          >
            <Users size={20} />
            <span>Prospecteurs</span>
          </button>
          <button
            className={`nav-item ${activeTab === "prospects" ? "active" : ""}`}
            onClick={() => { setActiveTab("prospects"); setSidebarOpen(false); }}
            data-testid="admin-nav-prospects"
          >
            <Phone size={20} />
            <span>Tous les prospects</span>
          </button>
          <button
            className={`nav-item ${activeTab === "import" ? "active" : ""}`}
            onClick={() => { setActiveTab("import"); setSidebarOpen(false); }}
            data-testid="admin-nav-import"
          >
            <Upload size={20} />
            <span>Importer / Attribuer</span>
          </button>
          <button
            className={`nav-item ${activeTab === "calendar" ? "active" : ""}`}
            onClick={() => { setActiveTab("calendar"); setSidebarOpen(false); }}
            data-testid="admin-nav-calendar"
          >
            <Calendar size={20} />
            <span>Calendrier RDV</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout" onClick={handleLogout} data-testid="admin-logout-btn">
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <header className="dashboard-header admin">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h1>
            {activeTab === "dashboard" && "Tableau de bord"}
            {activeTab === "prospecteurs" && "Gestion des prospecteurs"}
            {activeTab === "prospects" && "Tous les prospects"}
            {activeTab === "import" && "Importer / Attribuer"}
            {activeTab === "calendar" && "Calendrier des RDV"}
          </h1>
          <div className="user-info">
            <span>Admin</span>
          </div>
        </header>

        {loading ? (
          <div className="loading-state">Chargement...</div>
        ) : (
          <>
            {activeTab === "dashboard" && stats && (
              <AdminDashboardView stats={stats} />
            )}
            {activeTab === "prospecteurs" && (
              <ProspecteursView 
                prospecteurs={prospecteurs} 
                onStatusChange={handleStatusChange}
              />
            )}
            {activeTab === "prospects" && (
              <ProspectsView prospects={prospects} token={token} onRefresh={fetchData} />
            )}
            {activeTab === "import" && (
              <ImportView 
                unassigned={unassigned}
                prospecteurs={prospecteurs}
                token={token}
                onRefresh={fetchData}
              />
            )}
            {activeTab === "calendar" && stats && (
              <CalendarView rdvList={stats.rdv_list || []} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Admin Dashboard View
const AdminDashboardView = ({ stats }) => (
  <div className="admin-dashboard-view" data-testid="admin-stats-view">
    <div className="stats-grid large">
      <div className="stat-card">
        <Users size={32} />
        <div className="stat-value">{stats.total_prospecteurs}</div>
        <div className="stat-label">Prospecteurs actifs</div>
      </div>
      <div className="stat-card">
        <Phone size={32} />
        <div className="stat-value">{stats.total_calls}</div>
        <div className="stat-label">Total appels</div>
      </div>
      <div className="stat-card success">
        <Calendar size={32} />
        <div className="stat-value">{stats.total_rdv}</div>
        <div className="stat-label">RDV pris</div>
      </div>
      <div className="stat-card">
        <TrendingUp size={32} />
        <div className="stat-value">{stats.conversion_rate}%</div>
        <div className="stat-label">Taux de conversion</div>
      </div>
    </div>

    {stats.top_performers && stats.top_performers.length > 0 && (
      <div className="top-performers">
        <h3>🏆 Top Prospecteurs</h3>
        <div className="performers-list">
          {stats.top_performers.map((p, idx) => (
            <div key={p.id} className="performer-card">
              <span className="rank">#{idx + 1}</span>
              <span className="name">{p.prenom} {p.nom}</span>
              <span className="rdv-count">{p.rdv_count} RDV</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// Prospecteurs View
const ProspecteursView = ({ prospecteurs, onStatusChange }) => (
  <div className="prospecteurs-view" data-testid="prospecteurs-view">
    {prospecteurs.length === 0 ? (
      <div className="empty-state">
        <Users size={48} />
        <p>Aucun prospecteur inscrit</p>
      </div>
    ) : (
      <div className="prospecteurs-list">
        {prospecteurs.map((p) => (
          <div key={p.id} className="prospecteur-card" data-testid={`prospecteur-${p.id}`}>
            <div className="prospecteur-info">
              <div className="prospecteur-name">{p.prenom} {p.nom}</div>
              <div className="prospecteur-email">{p.email}</div>
              <div className="prospecteur-stats">
                <span><Phone size={14} /> {p.total_calls || 0} appels</span>
                <span><Calendar size={14} /> {p.rdv_pris || 0} RDV</span>
                <span><Users size={14} /> {p.prospects_count || 0} prospects</span>
              </div>
            </div>
            <div className="prospecteur-actions">
              <span className={`status-badge ${p.status}`}>
                {p.status === "active" && "✅ Actif"}
                {p.status === "pending" && "⏳ En attente"}
                {p.status === "inactive" && "❌ Inactif"}
              </span>
              <select
                value={p.status}
                onChange={(e) => onStatusChange(p.id, e.target.value)}
                data-testid={`status-select-${p.id}`}
              >
                <option value="active">Activer</option>
                <option value="inactive">Désactiver</option>
                <option value="pending">En attente</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// Prospects View
const ProspectsView = ({ prospects, token, onRefresh }) => {
  const [filter, setFilter] = useState("all");

  const filteredProspects = filter === "all" 
    ? prospects 
    : prospects.filter(p => p.status === filter);

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer ce prospect ?")) {
      try {
        await apiCall("DELETE", `/admin/prospects/${id}`, null, token);
        onRefresh();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="prospects-view" data-testid="prospects-view">
      <div className="filter-bar">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} data-testid="status-filter">
          <option value="all">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="rdv_pris">RDV pris</option>
          <option value="a_rappeler">À rappeler</option>
          <option value="pas_de_reponse">Pas de réponse</option>
          <option value="refus">Refus</option>
        </select>
        <span className="count">{filteredProspects.length} prospects</span>
      </div>

      <div className="prospects-table">
        {filteredProspects.map((p) => (
          <div key={p.id} className="prospect-row" data-testid={`prospect-row-${p.id}`}>
            <div className="prospect-main">
              <span className="prospect-name">{p.nom}</span>
              <span className="prospect-secteur">{p.secteur}</span>
              <span className="prospect-phone">{p.telephone}</span>
            </div>
            <div className="prospect-meta">
              <span className={`status-badge ${p.status}`}>{p.status}</span>
              {p.prospecteur && (
                <span className="prospecteur-name">
                  <UserCheck size={14} /> {p.prospecteur.prenom}
                </span>
              )}
            </div>
            <button className="delete-btn" onClick={() => handleDelete(p.id)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Import View
const ImportView = ({ unassigned, prospecteurs, token, onRefresh }) => {
  const [selectedProspects, setSelectedProspects] = useState([]);
  const [selectedProspecteurs, setSelectedProspecteurs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiCall("POST", "/admin/prospects/import", formData, token);
      setMessage(`✅ ${res.count} prospects importés avec succès`);
      onRefresh();
    } catch (err) {
      setMessage(`❌ Erreur: ${err.response?.data?.detail || "Erreur lors de l'import"}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAssign = async () => {
    if (selectedProspects.length === 0 || selectedProspecteurs.length === 0) {
      setMessage("❌ Sélectionnez des prospects et des prospecteurs");
      return;
    }

    try {
      await apiCall("POST", "/admin/prospects/assign", {
        prospect_ids: selectedProspects,
        prospecteur_ids: selectedProspecteurs
      }, token);
      setMessage(`✅ ${selectedProspects.length} prospects attribués`);
      setSelectedProspects([]);
      setSelectedProspecteurs([]);
      onRefresh();
    } catch (err) {
      setMessage(`❌ Erreur: ${err.response?.data?.detail || "Erreur"}`);
    }
  };

  const toggleProspect = (id) => {
    setSelectedProspects(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleProspecteur = (id) => {
    setSelectedProspecteurs(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const selectAllProspects = () => {
    if (selectedProspects.length === unassigned.length) {
      setSelectedProspects([]);
    } else {
      setSelectedProspects(unassigned.map(p => p.id));
    }
  };

  return (
    <div className="import-view" data-testid="import-view">
      {/* Import Section */}
      <div className="import-section">
        <h3>📥 Importer des prospects</h3>
        <p>Formats acceptés: Excel (.xlsx, .xls) ou CSV</p>
        <p className="hint">Colonnes requises: nom, secteur, telephone (+ email optionnel)</p>
        <label className="upload-btn">
          <Upload size={20} />
          {uploading ? "Import en cours..." : "Choisir un fichier"}
          <input 
            type="file" 
            accept=".xlsx,.xls,.csv" 
            onChange={handleFileUpload}
            disabled={uploading}
            data-testid="file-input"
          />
        </label>
      </div>

      {message && <div className="message-banner">{message}</div>}

      {/* Assign Section */}
      <div className="assign-section">
        <h3>📋 Prospects non attribués ({unassigned.length})</h3>
        
        {unassigned.length > 0 && (
          <>
            <div className="select-all">
              <label>
                <input
                  type="checkbox"
                  checked={selectedProspects.length === unassigned.length}
                  onChange={selectAllProspects}
                />
                Tout sélectionner
              </label>
            </div>

            <div className="unassigned-list">
              {unassigned.map((p) => (
                <div key={p.id} className={`unassigned-item ${selectedProspects.includes(p.id) ? "selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selectedProspects.includes(p.id)}
                    onChange={() => toggleProspect(p.id)}
                  />
                  <span className="name">{p.nom}</span>
                  <span className="secteur">{p.secteur}</span>
                  <span className="phone">{p.telephone}</span>
                </div>
              ))}
            </div>

            <h4>Attribuer à :</h4>
            <div className="prospecteurs-select">
              {prospecteurs.map((p) => (
                <label key={p.id} className={selectedProspecteurs.includes(p.id) ? "selected" : ""}>
                  <input
                    type="checkbox"
                    checked={selectedProspecteurs.includes(p.id)}
                    onChange={() => toggleProspecteur(p.id)}
                  />
                  {p.prenom} {p.nom}
                </label>
              ))}
            </div>

            <button 
              className="assign-btn" 
              onClick={handleAssign}
              disabled={selectedProspects.length === 0 || selectedProspecteurs.length === 0}
              data-testid="assign-btn"
            >
              Attribuer {selectedProspects.length} prospect(s)
            </button>
          </>
        )}

        {unassigned.length === 0 && (
          <div className="empty-state">
            <CheckCircle size={48} />
            <p>Tous les prospects sont attribués</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Calendar View
const CalendarView = ({ rdvList }) => {
  const sortedRdv = [...rdvList].sort((a, b) => {
    const dateA = `${a.rdv_date} ${a.rdv_heure}`;
    const dateB = `${b.rdv_date} ${b.rdv_heure}`;
    return dateA.localeCompare(dateB);
  });

  return (
    <div className="calendar-view" data-testid="calendar-view">
      <div className="rdv-list">
        {sortedRdv.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} />
            <p>Aucun rendez-vous programmé</p>
          </div>
        ) : (
          sortedRdv.map((rdv) => (
            <div key={rdv.id} className="rdv-card" data-testid={`rdv-${rdv.id}`}>
              <div className="rdv-date">
                <Calendar size={20} />
                <span>{rdv.rdv_date}</span>
                <span className="rdv-time">{rdv.rdv_heure}</span>
              </div>
              <div className="rdv-info">
                <div className="rdv-client">{rdv.nom}</div>
                <div className="rdv-secteur">{rdv.secteur}</div>
                <div className="rdv-contact">
                  <Phone size={14} /> {rdv.rdv_telephone || rdv.telephone}
                </div>
              </div>
              {rdv.rdv_note && (
                <div className="rdv-note">{rdv.rdv_note}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Protected Route
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// App Component
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/prospecteur" element={<ProspecteurAuthPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/validate/:token" element={<ValidationPage />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <ProspecteurDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
