from sepaq.icons import amenities_from_labels
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


def test_icons_normalise():
    am = amenities_from_labels([
        "Drinking water",
        "Fire pit",
        "Vault toilet",
        "Pets allowed",
    ])
    assert am.drinking_water is True
    assert am.fire_pit is True
    assert am.pets is True
    assert am.toilets.value == "vault"
