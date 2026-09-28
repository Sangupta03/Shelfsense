import pytest

from app.match import Matcher, get_matcher


@pytest.fixture(scope="module")
def matcher() -> Matcher:
    return get_matcher()


def test_exact_standard_name(matcher):
    found = matcher.match("niacinamide")
    assert (found.inci, found.confidence, found.status) == ("NIACINAMIDE", 100, "matched")


def test_case_and_spaces_do_not_matter(matcher):
    assert matcher.match("  Sodium   Hyaluronate ").inci == "SODIUM HYALURONATE"


def test_alias(matcher):
    found = matcher.match("vitamin b3")
    assert found.inci == "NIACINAMIDE"
    assert found.status == "matched"
    assert found.confidence == 97


def test_bracketed_translation(matcher):
    # "Aqua (Water)" -> tries "aqua (water)", then "aqua"
    assert matcher.match("aqua (water)").inci == "AQUA"


def test_slash_separated_names(matcher):
    assert matcher.match("aqua/water/eau").inci == "AQUA"


def test_real_inci_with_a_slash_is_still_exact(matcher):
    found = matcher.match("caprylic/capric triglyceride")
    assert (found.inci, found.confidence) == ("CAPRYLIC/CAPRIC TRIGLYCERIDE", 100)


def test_percent_in_the_name_is_ignored(matcher):
    assert matcher.match("niacinamide 10%").inci == "NIACINAMIDE"


def test_typo_is_caught_by_fuzzy_matching(matcher):
    found = matcher.match("niacinam1de")
    assert found.inci == "NIACINAMIDE"
    assert found.status in ("matched", "check")
    assert 80 <= found.confidence < 100


def test_small_typo_in_a_long_name(matcher):
    found = matcher.match("butyl methoxydibenzoylmethan")
    assert found.inci == "BUTYL METHOXYDIBENZOYLMETHANE"
    assert found.status == "matched"


def test_complete_nonsense_is_unknown(matcher):
    found = matcher.match("qwertyuiop zxcv")
    assert found.status == "unknown"
    assert found.inci is None


def test_tiny_strings_are_not_guessed(matcher):
    assert matcher.match("xy").status == "unknown"


def test_thresholds_on_a_custom_list():
    m = Matcher([{"inci": "RETINOL", "aliases": ["vitamin a"]}])
    assert m.match("retinol").status == "matched"
    assert m.match("retinal").status in ("check", "unknown")  # close, but not the same thing


def test_shared_word_only_gives_a_check_not_a_match(matcher):
    # WRatio's partial scoring sees "gum" in both, so it's a weak guess at best.
    # That's why anything under 92 goes to the review screen instead of being trusted.
    found = matcher.match("tamarindus indica seed gum")
    assert found.status != "matched"


def test_real_label_names_match_exactly(matcher):
    # names from real product photos that used to get a wrong fuzzy suggestion
    assert matcher.match("propylene glycol").inci == "PROPYLENE GLYCOL"  # not pentylene glycol
    assert matcher.match("betaine").inci == "BETAINE"  # not cocamidopropyl betaine
    assert matcher.match("a-bisabolol").inci == "BISABOLOL"
