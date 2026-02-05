# Teleprospection App (MVP scaffold)

Ce repo contient un starter pour une application mobile Flutter (prospecteurs) et un dashboard web React (administrateur), ainsi que des règles Firestore pour Firebase.

Structure proposée:
- flutter_app/  -> application mobile Flutter
- admin/        -> dashboard web React (simple)
- firebase/     -> règles et configs Firebase

Prérequis:
- Compte Firebase et projet configuré
- Flutter SDK installé
- Node.js & npm pour le dashboard admin

Installation rapide (mobile):
1. Créer un projet Firebase et ajouter les fichiers de config (GoogleService-Info.plist / google-services.json)
2. Dans flutter_app/, exécuter `flutter pub get`
3. Lancer l'app: `flutter run` (sur émulateur ou appareil)

Installation rapide (admin):
1. Dans admin/, exécuter `npm install`
2. Démarrer: `npm start`

Notes:
- Ce scaffold est un point de départ. Il contient des placeholders et des TODO pour connecter Firebase et ajuster les règles de sécurité.