#!/bin/bash
# =============================================================================
# Self-Signed SSL Certificate Generator
# =============================================================================
# 
# This script generates a self-signed SSL certificate for LOCAL DEVELOPMENT ONLY.
# 
# Generated files:
#   - server.key: Private key (keep this secret!)
#   - server.crt: Public certificate
#
# Usage:
#   chmod +x generate-certs.sh
#   ./generate-certs.sh
#
# WARNING: Self-signed certificates are NOT for production use.
#          Browsers will show security warnings - this is expected.
# =============================================================================

# Exit on error
set -e

echo "🔐 Generating self-signed SSL certificate for local development..."
echo ""

# Generate private key and certificate in one command
# -x509: Output a self-signed certificate instead of a certificate request
# -nodes: Don't encrypt the private key (no passphrase needed)
# -days 365: Certificate valid for 1 year
# -newkey rsa:2048: Generate a new 2048-bit RSA key
# -keyout: Output file for the private key
# -out: Output file for the certificate
# -subj: Certificate subject (CN = Common Name)
# -addext: Add Subject Alternative Name for localhost

openssl req -x509 \
    -nodes \
    -days 365 \
    -newkey rsa:2048 \
    -keyout server.key \
    -out server.crt \
    -subj "/C=US/ST=Local/L=Local/O=AcademicProject/OU=Development/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo ""
echo "✅ Certificate generated successfully!"
echo ""
echo "Files created:"
echo "  📄 server.key - Private key (DO NOT SHARE)"
echo "  📄 server.crt - Public certificate"
echo ""
echo "Certificate details:"
openssl x509 -in server.crt -noout -subject -dates
echo ""
echo "⚠️  This is a self-signed certificate for LOCAL DEVELOPMENT ONLY."
echo "    Browsers will show security warnings - this is expected."
