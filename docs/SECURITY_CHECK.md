## Security Checklist - Fastify Server

Un résumé clair et actionnable des protections à mettre en place sur un serveur Fastify en production.

---

### 1. SQL Injection

* **Description** : Injections malveillantes dans les requêtes SQL.
* **Solution** : Utiliser Prisma ou requêtes paramétrées (never interpolate raw user input).

### 2. Cross-Site Scripting (XSS)

* **Description** : Exécution de scripts injectés dans les pages HTML.
* **Solution** : Échapper les données affichées, utiliser helmet (Content-Security-Policy).

### 3. Cross-Site Request Forgery (CSRF)

* **Description** : Un site malveillant force une requête au nom de l'utilisateur connecté.
* **Solution** : Utiliser des tokens CSRF ou CORS strict sans credentials.

### 4. CORS Mal Configuré

* **Description** : Accès non autorisé à l'API depuis n'importe quelle origine.
* **Solution** : Restreindre `origin` à des domaines précis, éviter `*` si credentials.

### 5. Clickjacking

* **Description** : Iframe malveillant piégeant l'utilisateur.
* **Solution** : `frameguard: { action: 'deny' }` via helmet.

### 6. HTTP Header Leakage

* **Description** : Fuite d'informations sur la stack backend.
* **Solution** : Supprimer `X-Powered-By`, activer helmet pour headers sécurisés.

### 7. Referrer Leak

* **Description** : Données de navigation envoyées à des sites tiers.
* **Solution** : `referrerPolicy: 'no-referrer'` via helmet.

### 8. Bruteforce / DDoS

* **Description** : Tentatives massives de login ou crash serveur.
* **Solution** : Installer `@fastify/rate-limit`, limiter les IPs, protéger les routes sensibles.

### 9. Payload JSON Trop Volumineux

* **Description** : Attaque par surcharge de la mémoire ou parsing.
* **Solution** : Définir un `bodyLimit` (ex: 1MB max) dans Fastify.

### 10. MIME Sniffing

* **Description** : Interprétation incorrecte des fichiers par le navigateur.
* **Solution** : Activer `noSniff` via helmet.

### 11. Directory Traversal / File Upload

* **Description** : Lecture ou écriture de fichiers sensibles.
* **Solution** : Valider chemins/extension/taille, éviter l'upload dans des dossiers publics.

### 12. Open Redirect

* **Description** : Redirection utilisateur vers un site malveillant.
* **Solution** : Valider les URLs de redirection avec une liste blanche.

### 13. HTTPS Only

* **Description** : Connexions non chiffrées interceptables.
* **Solution** : Rediriger HTTP vers HTTPS + `strictTransportSecurity` avec preload.

### 14. Permissions Abusives (Web API)

* **Description** : Abus des permissions navigateur (caméra, micro, etc.).
* **Solution** : Utiliser le header `Permissions-Policy`.

### 15. Prototype Pollution

* **Description** : Altération du prototype des objets natifs JS.
* **Solution** : Valider les objets reçus, désactiver les chaînes dangereuses dans le body.

### 16. Directory Listing

* **Description** : Accès libre à la structure de fichiers du projet.
* **Solution** : Ne jamais exposer un dossier sans `index.html` ou `.htaccess` correct.

---

**💡 Conseil final** : Toujours auditer ton app avec des outils comme [Mozilla Observatory](https://observatory.mozilla.org/) ou [SecurityHeaders.com](https://securityheaders.com/) pour vérifier les headers et les configurations.
