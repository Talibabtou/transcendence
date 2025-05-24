#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Define paths for the certificates
CERT_DIR="/etc/certs"
KEY_FILE="${CERT_DIR}/nginx.key"
CRT_FILE="${CERT_DIR}/nginx.crt"
DAYS_VALID="365"
DOMAIN="localhost" # Or your desired common name

# Create the certificate directory if it doesn't exist
mkdir -p ${CERT_DIR}

# Check if the certificate and key already exist
if [ -f "${KEY_FILE}" ] && [ -f "${CRT_FILE}" ]; then
  echo "Certificates already exist. Skipping generation."
  # Optional: Add logic here to check certificate expiry and regenerate if needed
else
  echo "Generating self-signed certificates..."
  openssl req -x509 -nodes -newkey rsa:2048 -days ${DAYS_VALID} \
    -keyout "${KEY_FILE}" \
    -out "${CRT_FILE}" \
    -subj "/CN=${DOMAIN}"

  # Set appropriate permissions (optional, depending on your setup)
  # chmod 600 "${KEY_FILE}"
  # chmod 644 "${CRT_FILE}"

  echo "Certificates generated successfully."
fi

exit 0 