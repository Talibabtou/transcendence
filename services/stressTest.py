import requests
import random
import string
import os

BASE_URL = "http://localhost:8080/api/v1"  # Remplacez par l'URL de votre serveur
NUM_USERS = 10  # Nombre d'utilisateurs à créer
NUM_FRIENDSHIPS = 5  # Nombre d'amitiés à créer par utilisateur
UPLOAD_DIR = "./uploads"  # Répertoire des images à télécharger

# Fonction pour générer un nom d'utilisateur aléatoire
def generate_username(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

# Fonction pour créer un utilisateur
def create_user(username):
    response = requests.post(f"{BASE_URL}/auth/register", json={
        "username": username,
        "password": "password123",  # Mot de passe par défaut
        "email": f"{username}@example.com"
    })
    return response.json()

# Fonction pour créer une amitié
def create_friendship(user_id, friend_id):
    response = requests.post(f"{BASE_URL}/friends/", json={"id": friend_id}, headers={
        "Authorization": f"Bearer {user_id}"  # Remplacez par le token d'authentification
    })
    return response.json()

# Fonction pour télécharger une image
def upload_image(user_id, file_path):
    with open(file_path, 'rb') as f:
        response = requests.post(f"{BASE_URL}/profil/uploads", files={"file": f}, headers={
            "Authorization": f"Bearer "  # Remplacez par le token d'authentification
        })
    return response.json()

# Créer des utilisateurs
user_ids = []
for _ in range(NUM_USERS):
    username = generate_username()
    user_response = create_user(username)
    user_ids.append(user_response['id'])  # Supposons que l'ID de l'utilisateur est retourné

# Créer des amitiés
for user_id in user_ids:
    friends_to_add = random.sample(user_ids, min(NUM_FRIENDSHIPS, len(user_ids)))
    for friend_id in friends_to_add:
        if user_id != friend_id:  # Ne pas ajouter soi-même comme ami
            create_friendship(user_id, friend_id)

# Télécharger des images
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

for user_id in user_ids:
    # Créez une image fictive pour le téléchargement
    image_path = os.path.join(UPLOAD_DIR, f"{user_id}.png")
    with open(image_path, 'wb') as img_file:
        img_file.write(os.urandom(1024 * 1024))  # 1 Mo d'image aléatoire
    upload_image(user_id, image_path)

print("Stress test completed.")