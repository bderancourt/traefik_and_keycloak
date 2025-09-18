#!/bin/sh

# Get the IP address of the keycloak container
KEYCLOAK_IP=$(getent hosts keycloak | awk '{ print $1 }')

if [ -n "$KEYCLOAK_IP" ]; then
    # Add keycloak.localhost entry to /etc/hosts
    echo "$KEYCLOAK_IP keycloak.localhost" >> /etc/hosts
    echo "Added keycloak.localhost -> $KEYCLOAK_IP to /etc/hosts"
else
    echo "Warning: Could not resolve keycloak container IP"
fi

# Start the application
exec npm start