# LeadCentral - PRD (Product Requirements Document)

## Projet
**Nom**: LeadCentral  
**Description**: Application de centralisation de prospection commerciale  
**URL**: https://leadcentral-1.preview.emergentagent.com/  
**Date de création**: 11 février 2026

---

## Architecture Technique

### Stack
- **Frontend**: React.js avec Tailwind CSS
- **Backend**: FastAPI (Python)
- **Base de données**: MongoDB
- **Authentification**: JWT
- **Emails**: Resend (configuration requise)

### Structure
```
/app/
├── backend/
│   ├── server.py          # API FastAPI complète
│   └── .env               # Configuration (MongoDB, JWT, Resend)
├── frontend/
│   └── src/
│       ├── App.js         # Application React complète
│       └── App.css        # Styles
```

---

## Fonctionnalités Implémentées ✅

### 1. Page d'Accueil
- ✅ Logo et titre LeadCentral
- ✅ Bouton "Espace Prospecteur" (bleu)
- ✅ Bouton "Espace Organisateur" (violet)
- ✅ Bouton "Espace Client" (désactivé - "Bientôt disponible")

### 2. Espace Prospecteur
- ✅ Formulaire d'inscription (Nom, Prénom, Email, Téléphone)
- ✅ Envoi demande d'accès par email à l'admin
- ✅ Connexion avec email/mot de passe
- ✅ Dashboard avec liste des prospects par statut
- ✅ Qualification des appels (Refus, À rappeler, Pas de réponse, RDV pris)
- ✅ Profil avec statistiques et graphiques
- ✅ Navigation par onglets (Liste principale, À rappeler, Pas de réponse, RDV pris)

### 3. Espace Organisateur (Admin)
- ✅ Connexion admin (admin@leadcentral.com / admin123)
- ✅ Tableau de bord avec statistiques globales
- ✅ Gestion des prospecteurs (Activer/Désactiver)
- ✅ Import de prospects (CSV, Excel)
- ✅ Attribution des prospects aux prospecteurs
- ✅ Vue de tous les prospects avec filtres
- ✅ Calendrier des rendez-vous
- ✅ Top performers (classement)

### 4. API Backend
- ✅ Authentification JWT
- ✅ CRUD Prospects
- ✅ Gestion des appels et résultats
- ✅ Statistiques prospecteurs et admin
- ✅ Import fichiers CSV/Excel
- ✅ Attribution automatique/manuelle

---

## Configuration Requise

### Variables d'environnement (backend/.env)
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="leadcentral"
JWT_SECRET="votre-secret-jwt"
RESEND_API_KEY="re_xxxxx"  # Obtenir sur resend.com
SENDER_EMAIL="onboarding@resend.dev"
APP_URL="https://votre-url.com"
```

### Compte Admin par défaut
- Email: admin@leadcentral.com
- Mot de passe: admin123

---

## Backlog / Fonctionnalités Futures

### P0 - Critique
- [ ] Configurer Resend API pour les emails réels

### P1 - Important
- [ ] Notifications push (rappels RDV)
- [ ] Rapport hebdomadaire automatique
- [ ] Export Excel des données

### P2 - Souhaitable
- [ ] Espace Client
- [ ] Synchronisation Google Calendar
- [ ] Mode hors-ligne mobile
- [ ] Alertes prospecteur inactif > 3 jours

---

## User Personas

1. **Prospecteur**: Fait des appels, qualifie les prospects, prend des RDV
2. **Organisateur/Admin**: Gère les prospecteurs, importe les listes, suit les performances
3. **Client** (futur): Consulte les RDV, historique

---

## Tests Réalisés
- ✅ Backend: 90.9% (10/11 tests passés)
- ✅ Frontend: 100% (tous les tests UI passés)
- Date: 11 février 2026
