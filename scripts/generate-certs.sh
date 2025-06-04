#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Define paths for the certificates
CERT_DIR="/etc/certs"
KEY_FILE="${CERT_DIR}/nginx.key"
CRT_FILE="${CERT_DIR}/nginx.crt"
DAYS_VALID="365"
DOMAIN="localhost"

mkdir -p ${CERT_DIR}

if [ -f "${KEY_FILE}" ] && [ -f "${CRT_FILE}" ]; then
  echo "Certificates already exist. Skipping generation."
else
  echo "Generating self-signed certificates..."
  openssl req -x509 -nodes -newkey rsa:2048 -days ${DAYS_VALID} \
    -keyout "${KEY_FILE}" \
    -out "${CRT_FILE}" \
    -subj "/CN=${DOMAIN}" \
    -addext "subjectAltName = DNS:${DOMAIN},IP:127.0.0.1"


  echo "Certificates generated successfully."
fi

exit 0 