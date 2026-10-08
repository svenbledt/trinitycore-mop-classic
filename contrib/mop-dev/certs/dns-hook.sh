#!/bin/sh
# certbot manual DNS-01 hook: publish the TXT value, then wait until the operator creates "go".
echo "$CERTBOT_VALIDATION" > /work/txt-value
echo "Add TXT _acme-challenge.$CERTBOT_DOMAIN = $CERTBOT_VALIDATION"
rm -f /work/go
while [ ! -f /work/go ]; do sleep 2; done
