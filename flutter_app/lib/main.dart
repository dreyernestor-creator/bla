import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:url_launcher/url_launcher.dart';

// TODO: Add your Firebase options (GoogleService-Info.plist / google-services.json)

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Teleprospection',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: AuthGate(),
    );
  }
}

class AuthGate extends StatelessWidget {
  final FirebaseAuth _auth = FirebaseAuth.instance;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: _auth.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (!snapshot.hasData) {
          return SignInPage();
        }
        return ProspectListPage(uid: snapshot.data!.uid);
      },
    );
  }
}

class SignInPage extends StatelessWidget {
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Se connecter')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(controller: emailController, decoration: InputDecoration(labelText: 'Email')),
            TextField(controller: passController, decoration: InputDecoration(labelText: 'Mot de passe'), obscureText: true),
            SizedBox(height: 16),
            ElevatedButton(
              onPressed: () async {
                try {
                  await FirebaseAuth.instance.signInWithEmailAndPassword(
                    email: emailController.text.trim(),
                    password: passController.text.trim(),
                  );
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: ' + e.toString())));
                }
              },
              child: Text('Connexion'),
            ),
          ],
        ),
      ),
    );
  }
}

class ProspectListPage extends StatelessWidget {
  final String uid;
  ProspectListPage({required this.uid});

  @override
  Widget build(BuildContext context) {
    // Collection structure assumed: assignments collection with documents assigned to prospecteurs
    final assignments = FirebaseFirestore.instance
        .collection('assignments')
        .where('prospecteurId', isEqualTo: uid)
        .orderBy('assignedAt');

    return Scaffold(
      appBar: AppBar(title: Text('Mes prospects')),
      body: StreamBuilder<QuerySnapshot>(
        stream: assignments.snapshots(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return Center(child: CircularProgressIndicator());
          final docs = snapshot.data!.docs;
          if (docs.isEmpty) return Center(child: Text('Aucun prospect attribué pour le moment'));
          return ListView.builder(
            itemCount: docs.length,
            itemBuilder: (context, index) {
              final data = docs[index].data() as Map<String, dynamic>;
              final prospect = data['prospect'] ?? {};
              final name = prospect['name'] ?? 'Nom inconnu';
              final phone = prospect['phone'] ?? '';
              final status = data['status'] ?? 'Non appelé';

              return ListTile(
                title: Text(name),
                subtitle: Text(status),
                trailing: IconButton(
                  icon: Icon(Icons.phone),
                  onPressed: () async {
                    final tel = Uri.parse('tel:$phone');
                    if (await canLaunchUrl(tel)) {
                      await launchUrl(tel);
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Impossible d\'ouvrir le dialer')));
                    }
                  },
                ),
                onTap: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => ProspectDetailPage(assignmentDoc: docs[index])));
                },
              );
            },
          );
        },
      ),
    );
  }
}

class ProspectDetailPage extends StatefulWidget {
  final QueryDocumentSnapshot assignmentDoc;
  ProspectDetailPage({required this.assignmentDoc});

  @override
  _ProspectDetailPageState createState() => _ProspectDetailPageState();
}

class _ProspectDetailPageState extends State<ProspectDetailPage> {
  String _selected = '';
  final TextEditingController _commentController = TextEditingController();
  DateTime? _rdv;

  @override
  Widget build(BuildContext context) {
    final data = widget.assignmentDoc.data() as Map<String, dynamic>;
    final prospect = data['prospect'] ?? {};
    final phone = prospect['phone'] ?? '';

    return Scaffold(
      appBar: AppBar(title: Text(prospect['name'] ?? 'Détail prospect')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Téléphone: $phone'),
            SizedBox(height: 8),
            Text('Email: ${prospect['email'] ?? ''}'),
            SizedBox(height: 16),
            ElevatedButton(
              onPressed: () async {
                final tel = Uri.parse('tel:$phone');
                if (await canLaunchUrl(tel)) await launchUrl(tel);
              },
              child: Text('Appeler'),
            ),
            SizedBox(height: 16),
            Text('Résultat de l\'appel'),
            Wrap(spacing: 8, children: [
              ChoiceChip(label: Text('Rendez-vous pris'), selected: _selected=='rdv', onSelected: (v){ setState(()=> _selected = v? 'rdv':'' ); }),
              ChoiceChip(label: Text('Refus'), selected: _selected=='refus', onSelected: (v){ setState(()=> _selected = v? 'refus':'' ); }),
              ChoiceChip(label: Text('Ne répond pas'), selected: _selected=='nr', onSelected: (v){ setState(()=> _selected = v? 'nr':'' ); }),
              ChoiceChip(label: Text('À rappeler'), selected: _selected=='rappel', onSelected: (v){ setState(()=> _selected = v? 'rappel':'' ); }),
            ]),
            if (_selected == 'rdv') ...[
              SizedBox(height: 8),
              ElevatedButton(onPressed: () async {
                final picked = await showDatePicker(context: context, initialDate: DateTime.now(), firstDate: DateTime.now(), lastDate: DateTime.now().add(Duration(days: 365)));
                if (picked!=null) setState(()=> _rdv = picked);
              }, child: Text(_rdv==null? 'Choisir date' : _rdv.toString())),
            ],
            SizedBox(height: 8),
            TextField(controller: _commentController, decoration: InputDecoration(labelText: 'Commentaire (optionnel)')),
            SizedBox(height: 16),
            ElevatedButton(onPressed: _saveResult, child: Text('Enregistrer résultat')),
          ],
        ),
      ),
    );
  }

  Future<void> _saveResult() async {
    final assignmentRef = widget.assignmentDoc.reference;
    String result = '';
    if (_selected == 'rdv') result = 'RDV';
    else if (_selected == 'refus') result = 'REFUS';
    else if (_selected == 'nr') result = 'NE_REPOND_PAS';
    else if (_selected == 'rappel') result = 'A_RAPPELER';
    else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Choisis un résultat')));
      return;
    }

    await FirebaseFirestore.instance.runTransaction((tx) async {
      tx.update(assignmentRef, {
        'status': result,
        'lastResultAt': FieldValue.serverTimestamp(),
      });
      tx.collection('callLogs').add({
        'assignmentId': assignmentRef.id,
        'result': result,
        'comment': _commentController.text,
        'rdv': _rdv==null? null : _rdv!.toIso8601String(),
        'createdAt': FieldValue.serverTimestamp(),
      });
    });

    Navigator.pop(context);
  }
}