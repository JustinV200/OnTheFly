"""Unit tests for discovery query construction, aggregator filtering, and deduplication."""

from app.services.discovery import DiscoveredProvider, build_discovery_queries
from app.services.discovery.filters import build_dedupe_key, dedupe_providers, drop_aggregators, registrable_domain
from app.services.listings.types import PublicListingProjection


def _projection(**overrides: object) -> PublicListingProjection:
    values: dict[str, object] = {
        "id": "listing-1",
        "expense_id": "expense-1",
        "category": "cleaning",
        "scope_summary": "San Francisco, CA · 8000 sq ft · 3x weekly",
        "required_tasks": ["vacuum", "trash", "restrooms", "windows"],
        "visit_frequency": "3x weekly",
        "supplies_included": True,
        "equipment_included": True,
        "taxes_included": True,
        "price_minor": 240000,
        "price_currency": "USD",
        "billing_cadence": "monthly",
        "service_area_approximate": "San Francisco Bay Area",
        "bidding_mode": "sealed",
        "challenge_deadline": None,
        "incumbent_vendor_name": "Sparkle Clean",
        "show_exact_address": False,
        "visibility": "public",
        "published_at": None,
    }
    values.update(overrides)
    return PublicListingProjection(**values)


def _provider(name: str, website: str | None = None, phone: str | None = None, **extra: object) -> DiscoveredProvider:
    return DiscoveredProvider(
        business_name=name,
        website_url=website,
        phone=phone,
        source_urls=[f"{website or 'https://source.example'}/page-{name.replace(' ', '-')}"],
        provenance="demo_data",
        **extra,
    )


def test_queries_never_include_the_incumbent_even_when_the_listing_shows_it() -> None:
    queries = build_discovery_queries(_projection(incumbent_vendor_name="Sparkle Clean"))

    assert len(queries) >= 3
    assert all("sparkle" not in query.text.casefold() for query in queries)


def test_queries_use_category_area_tasks_and_frequency_in_distinct_shapes() -> None:
    queries = [query.text for query in build_discovery_queries(_projection())]

    assert len(set(queries)) == len(queries)
    assert all("San Francisco Bay Area" in query for query in queries)
    assert any("vacuum trash restrooms" in query for query in queries)
    # Only the first three tasks steer the search.
    assert all("windows" not in query for query in queries)
    assert any("3x weekly" in query for query in queries)
    assert not any("commercial commercial" in query for query in queries)


def test_aggregator_domains_and_listicle_titles_are_dropped() -> None:
    providers = [
        _provider("Bay Clean", "https://bayclean.example"),
        _provider("Top 10 Commercial Cleaners in SF", "https://www.yelp.com"),
        _provider("Cleaners", "https://m.thumbtack.com"),
        _provider("Best Office Cleaning near San Francisco", "https://listicle.example"),
    ]

    result = drop_aggregators(providers)

    assert [provider.business_name for provider in result.kept] == ["Bay Clean"]
    assert result.dropped_count == 3


def test_duplicates_merge_by_domain_phone_and_name_and_keep_every_source_url() -> None:
    providers = [
        _provider("Bay Clean Professional Services", "https://bayclean.example", "(415) 555-0142"),
        _provider("Bay Clean Pro", "https://www.bayclean.example/services", None, contact_email="bids@bayclean.example"),
        _provider("Harbor Light", None, "+1 510-555-0187"),
        _provider("Harbor Light Facility Care", "https://harborlightcare.example", "510.555.0187"),
        _provider("Presidio Office Cleaning LLC", None),
        _provider("Presidio Office Cleaning", None),
    ]

    result = dedupe_providers(providers)

    assert [provider.business_name for provider in result.kept] == [
        "Bay Clean Professional Services",
        "Harbor Light",
        "Presidio Office Cleaning LLC",
    ]
    assert result.merged_count == 3
    bay_clean = result.kept[0]
    assert len(bay_clean.source_urls) == 2
    # The address fills the gap together with nothing invented: it came from the duplicate's record.
    assert bay_clean.contact_email == "bids@bayclean.example"


def test_same_name_with_different_websites_stays_two_providers() -> None:
    result = dedupe_providers(
        [_provider("ABC Cleaning", "https://abc-oakland.example"), _provider("ABC Cleaning", "https://abc-fresno.example")]
    )

    assert len(result.kept) == 2
    assert result.merged_count == 0


def test_dedupe_key_prefers_registrable_domain_then_normalized_name() -> None:
    assert registrable_domain("https://www.bayclean.example/contact") == "bayclean.example"
    assert registrable_domain("https://shop.example.co.uk") == "example.co.uk"
    assert build_dedupe_key("Bay Clean LLC", "bayclean.example") == "bayclean.example"
    assert build_dedupe_key("Bay Clean, LLC", None) == "bay clean"
