from mitmproxy import http, dns
import ipaddress
import logging

API_HOST = "localhost"

# 198.51.100.0/24 is reserved for documentation/examples,
# so this address should never collide with a real public host.
# We use it as a synthetic destination inside mitmproxy's WireGuard flow.
API_DNS_REDIRECT_HOST = ipaddress.IPv4Address("198.51.100.140")

DNS_TTL = 600
API_PORT = 8000
API_SCHEME = "http"
MAGIC_DOMAIN_SUFFIX = ".mitm.it"

prefixes = ["/openapi", "/infodesk", "", "/patch"]

# hostname: prefix_index
hosts = {
    # openapi
    "openapi-zinny3.game.kakao.com": 0,
    "gc-openapi-zinny3.kakaogames.com": 0,

    # infodesk
    "gc-infodesk-zinny3.kakaogames.com": 1,

    # na server
    "na.wdfp.kakaogames.com": 2,

    # patch
    "patch.wdfp.kakaogames.com": 3,
}


def dns_request(flow: dns.DNSFlow):
    if not flow.request.query or not flow.request.questions:
        return

    # logging.info(f"[INFO] DNS request for {flow.request.questions}")

    for question in flow.request.questions:
        # DNS type 1 = A record (IPv4)
        prefix_type = hosts.get(question.name) if question.type == 1 else None

        if prefix_type is not None:
            # logging.info(f"[INFO] Matched DNS request for {question.name}")

            domain_redirect = f"{question.name}{MAGIC_DOMAIN_SUFFIX}"

            cname_rec = dns.ResourceRecord.CNAME(
                question.name,
                domain_redirect,
                ttl=DNS_TTL,
            )

            a_rec = dns.ResourceRecord.A(
                domain_redirect,
                API_DNS_REDIRECT_HOST,
                ttl=DNS_TTL,
            )

            # Important:
            # flow.response may still be None during dns_request.
            # Build a complete DNS response ourselves instead of trying
            # to mutate flow.response.answers.
            flow.response = flow.request.succeed(
                [
                    cname_rec,
                    a_rec,
                ]
            )

            # One DNS request from the client should normally contain one
            # relevant A question. Once we have answered it ourselves,
            # stop here.
            return


def request(flow: http.HTTPFlow):
    # logging.info(f"[INFO] {flow.request.url}")

    prefix_type = hosts.get(flow.request.pretty_host)

    if prefix_type is not None:
        flow.request.host = API_HOST
        flow.request.port = API_PORT
        flow.request.scheme = API_SCHEME

        prefix = prefixes[prefix_type]

        if prefix != "":
            flow.request.path = f"{prefix}{flow.request.path}"