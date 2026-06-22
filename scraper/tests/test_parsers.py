from sepaq.icons import amenities_from_bullets
from sepaq.seed import parse_seed


def test_seed_extracts_links():
    html = """
    <html><body>
      <a class="resultats-item is-blue" href="/en/reservation/camping/foo">
        <span class="h4 text">Foo Park</span>
      </a>
      <a class="resultats-item is-blue" href="/en/reservation/camping/bar">
        <span class="h4 text">Bar Park</span>
      </a>
    </body></html>
    """
    links = parse_seed(html)
    assert {(l.id, l.name) for l in links} == {("foo", "Foo Park"), ("bar", "Bar Park")}


def test_bullets_normalise():
    am, water = amenities_from_bullets([
        "Drinking water",
        "Fire pit location restricts setup",
        "Vault toilet",
        "Dogs are allowed on the site",
    ])
    assert am.drinking_water is True
    assert am.fire_pit is True
    assert am.pets is True
    assert am.toilets.value == "vault"
    assert water is None


def test_bullets_detect_waterfront():
    _, water = amenities_from_bullets([
        "Fire pit",
        "View of a lake or river",
    ])
    assert water is True
