from app.split import normalize, split_ingredients


def test_simple_comma_list():
    assert split_ingredients("Aqua, Glycerin, Niacinamide") == ["aqua", "glycerin", "niacinamide"]


def test_empty_string_gives_nothing():
    assert split_ingredients("") == []
    assert split_ingredients("   ,  , ") == []


def test_commas_inside_brackets_are_not_split():
    text = "Aqua (Water, Eau), Parfum (Fragrance)"
    assert split_ingredients(text) == ["aqua (water, eau)", "parfum (fragrance)"]


def test_comma_inside_a_number_is_kept():
    # 1,2-hexanediol is ONE ingredient
    assert split_ingredients("Aqua, 1,2-Hexanediol, Glycerin") == ["aqua", "1,2-hexanediol", "glycerin"]


def test_bullets_semicolons_and_newlines_become_separators():
    text = "Aqua • Glycerin; Niacinamide\nPanthenol"
    assert split_ingredients(text) == ["aqua", "glycerin", "niacinamide", "panthenol"]


def test_ingredients_header_and_marketing_copy_are_dropped():
    text = "Gentle daily serum. Ingredients: Aqua, Glycerin."
    assert split_ingredients(text) == ["aqua", "glycerin"]


def test_may_contain_and_plus_minus_are_dropped():
    text = "Aqua, Mica, +/- May Contain: CI 77491"
    assert split_ingredients(text) == ["aqua", "mica", "ci 77491"]


def test_footnote_stars_and_curly_quotes_are_cleaned():
    assert normalize("Aloe*, Shea’s Butter") == "aloe, shea's butter"


def test_stray_closing_bracket_does_not_break_splitting():
    assert split_ingredients("Aqua), Glycerin, Retinol") == ["aqua)", "glycerin", "retinol"]


def test_a_whole_real_label():
    label = (
        "INGREDIENTS: Aqua/Water/Eau, Niacinamide, Pentylene Glycol, Zinc PCA, "
        "Dimethyl Isosorbide, Tamarindus Indica Seed Gum, Xanthan Gum, Isoceteth-20, "
        "Ethoxydiglycol, Phenoxyethanol, Chlorphenesin."
    )
    items = split_ingredients(label)
    assert len(items) == 11
    assert items[0] == "aqua/water/eau"
    assert items[-1] == "chlorphenesin"
