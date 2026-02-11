from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import resend
import pandas as pd
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'leadcentral')]

# Resend configuration
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
ADMIN_EMAIL = "dreyernestor@gmail.com"

# JWT configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'leadcentral-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="LeadCentral API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    nom: str
    prenom: str
    email: EmailStr
    telephone: str
    password: Optional[str] = None
    role: str = "prospecteur"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    nom: str
    prenom: str
    email: str
    telephone: str
    role: str
    status: str
    created_at: str

class ProspectCreate(BaseModel):
    nom: str
    secteur: str
    telephone: str
    email: Optional[str] = None

class ProspectUpdate(BaseModel):
    nom: Optional[str] = None
    secteur: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None

class CallResult(BaseModel):
    prospect_id: str
    result: str  # refus, a_rappeler, pas_de_reponse, rdv_pris
    rappel_date: Optional[str] = None
    rappel_note: Optional[str] = None
    rdv_date: Optional[str] = None
    rdv_heure: Optional[str] = None
    rdv_telephone: Optional[str] = None
    rdv_email: Optional[str] = None
    rdv_note: Optional[str] = None

class ProspectAssignment(BaseModel):
    prospect_ids: List[str]
    prospecteur_ids: List[str]

class EmailRequest(BaseModel):
    recipient_email: EmailStr
    subject: str
    html_content: str

# ============== HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def generate_password() -> str:
    import random
    import string
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(10))

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

async def send_email_async(to: str, subject: str, html: str):
    params = {
        "from": SENDER_EMAIL,
        "to": [to],
        "subject": subject,
        "html": html
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to}: {result}")
        return result
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return None

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register")
async def register_prospecteur(user: UserCreate):
    existing = await db.users.find_one({"email": user.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    user_id = str(uuid.uuid4())
    validation_token = str(uuid.uuid4())
    
    user_doc = {
        "id": user_id,
        "nom": user.nom,
        "prenom": user.prenom,
        "email": user.email,
        "telephone": user.telephone,
        "role": "prospecteur",
        "status": "pending",
        "validation_token": validation_token,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Send email to admin
    app_url = os.environ.get('APP_URL', 'https://leadcentral-1.preview.emergentagent.com')
    validation_link = f"{app_url}/validate/{validation_token}"
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #4F46E5;">Nouvelle demande d'accès prospecteur</h2>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Nom :</strong> {user.nom}</p>
            <p><strong>Prénom :</strong> {user.prenom}</p>
            <p><strong>Email :</strong> {user.email}</p>
            <p><strong>Téléphone :</strong> {user.telephone}</p>
        </div>
        <a href="{validation_link}" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
            VALIDER L'ACCÈS
        </a>
    </body>
    </html>
    """
    
    await send_email_async(ADMIN_EMAIL, "Nouvelle demande d'accès prospecteur - LeadCentral", html_content)
    
    return {"message": "Votre demande a été envoyée. Vous recevrez vos identifiants par email une fois validé."}

@api_router.get("/auth/validate/{token}")
async def validate_prospecteur(token: str):
    user = await db.users.find_one({"validation_token": token}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Lien de validation invalide")
    
    if user["status"] == "active":
        return {"message": "Ce compte est déjà activé", "already_active": True}
    
    password = generate_password()
    hashed = hash_password(password)
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"status": "active", "password": hashed, "validation_token": None}}
    )
    
    # Send credentials to prospecteur
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #22C55E;">Bienvenue sur LeadCentral !</h2>
        <p>Votre compte prospecteur a été validé. Voici vos identifiants de connexion :</p>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email :</strong> {user['email']}</p>
            <p><strong>Mot de passe :</strong> {password}</p>
        </div>
        <p style="color: #666;">Nous vous recommandons de changer votre mot de passe après votre première connexion.</p>
        <a href="https://leadcentral-1.preview.emergentagent.com" style="display: inline-block; background: #22C55E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
            Se connecter
        </a>
    </body>
    </html>
    """
    
    await send_email_async(user['email'], "Vos identifiants LeadCentral", html_content)
    
    return {"message": f"Le compte de {user['prenom']} {user['nom']} a été activé. Les identifiants ont été envoyés par email."}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    if user.get("status") != "active":
        raise HTTPException(status_code=401, detail="Votre compte n'est pas encore activé")
    
    if not user.get("password") or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    token = create_token(user["id"], user["role"])
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "nom": user["nom"],
            "prenom": user["prenom"],
            "email": user["email"],
            "role": user["role"]
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "nom": user["nom"],
        "prenom": user["prenom"],
        "email": user["email"],
        "telephone": user.get("telephone", ""),
        "role": user["role"],
        "status": user["status"]
    }

# ============== PROSPECTEUR ROUTES ==============

@api_router.get("/prospects")
async def get_prospects(liste: str = "principale", user: dict = Depends(get_current_user)):
    query = {"prospecteur_id": user["id"]}
    
    if liste == "principale":
        query["status"] = "active"
    elif liste == "a_rappeler":
        query["status"] = "a_rappeler"
    elif liste == "pas_de_reponse":
        query["status"] = "pas_de_reponse"
    elif liste == "rdv_pris":
        query["status"] = "rdv_pris"
    
    prospects = await db.prospects.find(query, {"_id": 0}).to_list(1000)
    return prospects

@api_router.post("/prospects/call-result")
async def record_call_result(result: CallResult, user: dict = Depends(get_current_user)):
    prospect = await db.prospects.find_one({"id": result.prospect_id, "prospecteur_id": user["id"]}, {"_id": 0})
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect non trouvé")
    
    # Record call history
    call_record = {
        "id": str(uuid.uuid4()),
        "prospect_id": result.prospect_id,
        "prospecteur_id": user["id"],
        "result": result.result,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.calls.insert_one(call_record)
    
    # Update prospect status based on result
    update_data = {"last_call": datetime.now(timezone.utc).isoformat()}
    
    if result.result == "refus":
        update_data["status"] = "refus"
        update_data["refus_date"] = datetime.now(timezone.utc).isoformat()
    
    elif result.result == "a_rappeler":
        update_data["status"] = "a_rappeler"
        update_data["rappel_date"] = result.rappel_date
        update_data["rappel_note"] = result.rappel_note
    
    elif result.result == "pas_de_reponse":
        update_data["status"] = "pas_de_reponse"
        attempts = prospect.get("no_response_attempts", 0) + 1
        update_data["no_response_attempts"] = attempts
    
    elif result.result == "rdv_pris":
        update_data["status"] = "rdv_pris"
        update_data["rdv_date"] = result.rdv_date
        update_data["rdv_heure"] = result.rdv_heure
        update_data["rdv_telephone"] = result.rdv_telephone or prospect.get("telephone")
        update_data["rdv_email"] = result.rdv_email or prospect.get("email")
        update_data["rdv_note"] = result.rdv_note
        
        # Notify organizer
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #22C55E;">Nouveau rendez-vous pris !</h2>
            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Prospecteur :</strong> {user['prenom']} {user['nom']}</p>
                <p><strong>Client :</strong> {prospect['nom']}</p>
                <p><strong>Secteur :</strong> {prospect['secteur']}</p>
                <p><strong>Date :</strong> {result.rdv_date}</p>
                <p><strong>Heure :</strong> {result.rdv_heure}</p>
                <p><strong>Téléphone :</strong> {result.rdv_telephone or prospect.get('telephone', 'N/A')}</p>
            </div>
        </body>
        </html>
        """
        await send_email_async(ADMIN_EMAIL, f"Nouveau RDV - {prospect['nom']}", html_content)
    
    await db.prospects.update_one({"id": result.prospect_id}, {"$set": update_data})
    
    return {"message": "Résultat enregistré", "status": update_data.get("status")}

@api_router.get("/prospects/stats")
async def get_prospecteur_stats(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    
    # Get call counts
    total_calls = await db.calls.count_documents({"prospecteur_id": user_id})
    
    # Get prospect counts by status
    rdv_pris = await db.prospects.count_documents({"prospecteur_id": user_id, "status": "rdv_pris"})
    refus = await db.prospects.count_documents({"prospecteur_id": user_id, "status": "refus"})
    a_rappeler = await db.prospects.count_documents({"prospecteur_id": user_id, "status": "a_rappeler"})
    pas_de_reponse = await db.prospects.count_documents({"prospecteur_id": user_id, "status": "pas_de_reponse"})
    
    # Calculate conversion rate
    conversion_rate = (rdv_pris / total_calls * 100) if total_calls > 0 else 0
    
    # Get weekly stats
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    weekly_calls = await db.calls.find(
        {"prospecteur_id": user_id, "timestamp": {"$gte": week_ago}},
        {"_id": 0}
    ).to_list(1000)
    
    # Group by day
    daily_stats = {}
    for call in weekly_calls:
        day = call["timestamp"][:10]
        if day not in daily_stats:
            daily_stats[day] = {"calls": 0, "rdv": 0, "refus": 0, "rappel": 0, "no_response": 0}
        daily_stats[day]["calls"] += 1
        if call["result"] == "rdv_pris":
            daily_stats[day]["rdv"] += 1
        elif call["result"] == "refus":
            daily_stats[day]["refus"] += 1
        elif call["result"] == "a_rappeler":
            daily_stats[day]["rappel"] += 1
        elif call["result"] == "pas_de_reponse":
            daily_stats[day]["no_response"] += 1
    
    return {
        "total_calls": total_calls,
        "rdv_pris": rdv_pris,
        "refus": refus,
        "a_rappeler": a_rappeler,
        "pas_de_reponse": pas_de_reponse,
        "conversion_rate": round(conversion_rate, 1),
        "daily_stats": daily_stats
    }

# ============== ADMIN/ORGANIZER ROUTES ==============

@api_router.get("/admin/prospecteurs")
async def get_all_prospecteurs(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    prospecteurs = await db.users.find({"role": "prospecteur"}, {"_id": 0, "password": 0, "validation_token": 0}).to_list(1000)
    
    # Add stats for each prospecteur
    for p in prospecteurs:
        p["total_calls"] = await db.calls.count_documents({"prospecteur_id": p["id"]})
        p["rdv_pris"] = await db.prospects.count_documents({"prospecteur_id": p["id"], "status": "rdv_pris"})
        p["prospects_count"] = await db.prospects.count_documents({"prospecteur_id": p["id"]})
    
    return prospecteurs

@api_router.put("/admin/prospecteurs/{prospecteur_id}/status")
async def update_prospecteur_status(prospecteur_id: str, status: str, user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    if status not in ["active", "inactive", "pending"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    result = await db.users.update_one({"id": prospecteur_id}, {"$set": {"status": status}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Prospecteur non trouvé")
    
    return {"message": "Statut mis à jour"}

@api_router.post("/admin/prospects/import")
async def import_prospects(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    content = await file.read()
    
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Format de fichier non supporté. Utilisez CSV ou Excel.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la lecture du fichier: {str(e)}")
    
    # Map columns
    required_cols = ['nom', 'secteur', 'telephone']
    df.columns = df.columns.str.lower().str.strip()
    
    for col in required_cols:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Colonne requise manquante: {col}")
    
    prospects = []
    for _, row in df.iterrows():
        prospect = {
            "id": str(uuid.uuid4()),
            "nom": str(row['nom']),
            "secteur": str(row['secteur']),
            "telephone": str(row['telephone']),
            "email": str(row.get('email', '')) if pd.notna(row.get('email')) else None,
            "status": "unassigned",
            "prospecteur_id": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        prospects.append(prospect)
    
    if prospects:
        await db.prospects.insert_many(prospects)
    
    return {"message": f"{len(prospects)} prospects importés avec succès", "count": len(prospects)}

@api_router.get("/admin/prospects/unassigned")
async def get_unassigned_prospects(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    prospects = await db.prospects.find({"status": "unassigned"}, {"_id": 0}).to_list(1000)
    return prospects

@api_router.post("/admin/prospects/assign")
async def assign_prospects(assignment: ProspectAssignment, user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    if not assignment.prospecteur_ids:
        raise HTTPException(status_code=400, detail="Aucun prospecteur sélectionné")
    
    # Distribute prospects among prospecteurs
    num_prospecteurs = len(assignment.prospecteur_ids)
    for i, prospect_id in enumerate(assignment.prospect_ids):
        prospecteur_id = assignment.prospecteur_ids[i % num_prospecteurs]
        await db.prospects.update_one(
            {"id": prospect_id},
            {"$set": {"prospecteur_id": prospecteur_id, "status": "active"}}
        )
    
    return {"message": f"{len(assignment.prospect_ids)} prospects attribués"}

@api_router.get("/admin/prospects/all")
async def get_all_prospects(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    query = {}
    if status:
        query["status"] = status
    
    prospects = await db.prospects.find(query, {"_id": 0}).to_list(1000)
    
    # Add prospecteur info
    for p in prospects:
        if p.get("prospecteur_id"):
            prospecteur = await db.users.find_one({"id": p["prospecteur_id"]}, {"_id": 0, "password": 0})
            p["prospecteur"] = prospecteur
    
    return prospects

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    total_prospecteurs = await db.users.count_documents({"role": "prospecteur", "status": "active"})
    total_calls = await db.calls.count_documents({})
    total_rdv = await db.prospects.count_documents({"status": "rdv_pris"})
    total_prospects = await db.prospects.count_documents({})
    
    conversion_rate = (total_rdv / total_calls * 100) if total_calls > 0 else 0
    
    # Get top performers
    pipeline = [
        {"$match": {"status": "rdv_pris"}},
        {"$group": {"_id": "$prospecteur_id", "rdv_count": {"$sum": 1}}},
        {"$sort": {"rdv_count": -1}},
        {"$limit": 5}
    ]
    top_performers_raw = await db.prospects.aggregate(pipeline).to_list(5)
    
    top_performers = []
    for tp in top_performers_raw:
        if tp["_id"]:
            prospecteur = await db.users.find_one({"id": tp["_id"]}, {"_id": 0, "password": 0})
            if prospecteur:
                top_performers.append({
                    "id": prospecteur["id"],
                    "nom": prospecteur["nom"],
                    "prenom": prospecteur["prenom"],
                    "rdv_count": tp["rdv_count"]
                })
    
    # Get all RDV for calendar
    rdv_list = await db.prospects.find({"status": "rdv_pris"}, {"_id": 0}).to_list(1000)
    
    return {
        "total_prospecteurs": total_prospecteurs,
        "total_calls": total_calls,
        "total_rdv": total_rdv,
        "total_prospects": total_prospects,
        "conversion_rate": round(conversion_rate, 1),
        "top_performers": top_performers,
        "rdv_list": rdv_list
    }

@api_router.put("/admin/prospects/{prospect_id}")
async def update_prospect(prospect_id: str, update: ProspectUpdate, user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    result = await db.prospects.update_one({"id": prospect_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Prospect non trouvé")
    
    return {"message": "Prospect mis à jour"}

@api_router.delete("/admin/prospects/{prospect_id}")
async def delete_prospect(prospect_id: str, user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    result = await db.prospects.delete_one({"id": prospect_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prospect non trouvé")
    
    return {"message": "Prospect supprimé"}

@api_router.put("/admin/prospects/{prospect_id}/reassign")
async def reassign_prospect(prospect_id: str, new_prospecteur_id: str, user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    result = await db.prospects.update_one(
        {"id": prospect_id},
        {"$set": {"prospecteur_id": new_prospecteur_id, "status": "active"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Prospect non trouvé")
    
    return {"message": "Prospect réattribué"}

# ============== ROOT ==============

@api_router.get("/")
async def root():
    return {"message": "LeadCentral API", "version": "1.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Create default admin user on startup
@app.on_event("startup")
async def create_admin():
    admin = await db.users.find_one({"role": "admin"}, {"_id": 0})
    if not admin:
        admin_doc = {
            "id": str(uuid.uuid4()),
            "nom": "Admin",
            "prenom": "LeadCentral",
            "email": "admin@leadcentral.com",
            "telephone": "",
            "password": hash_password("admin123"),
            "role": "admin",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
        logger.info("Admin user created: admin@leadcentral.com / admin123")

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
