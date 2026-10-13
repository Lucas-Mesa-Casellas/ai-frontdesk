"""A spoken street number at the start of an address, written as digits:
"douze rue des Lilas" -> "12 rue des Lilas", "vingt-trois bis avenue Foch" -> "23 bis avenue Foch".
Deliberately narrow: only a LEADING French/Spanish/English number word from 1 to 199 (optionally
followed by bis/ter) and only when the next word is a street type (English puts the type after the
name, "twelve Hawthorn Lane", so there it may come up to three words later). Anything else is left exactly as
the caller said it. A lone "un/une/uno/una" is skipped: there it is an article, not a number."""
import re

_N: dict[str, int] = {}
for _list in ("un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize",
              "uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince",
              "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen"):
    _N.update({w: i + 1 for i, w in enumerate(_list.split())})
for _list, _first in (("dieciséis diecisiete dieciocho diecinueve", 16),
                      ("veintiuno veintidós veintitrés veinticuatro veinticinco veintiséis veintisiete veintiocho veintinueve", 21),
                      ("vingt trente quarante cinquante soixante septante huitante nonante", 20),
                      ("veinte treinta cuarenta cincuenta sesenta setenta ochenta noventa", 20),
                      ("twenty thirty forty fifty sixty seventy eighty ninety", 20)):
    _step = 10 if _first == 20 else 1
    _N.update({w: _first + _step * i for i, w in enumerate(_list.split())})
_N.update({"une": 1, "una": 1, "dieciseis": 16, "veintiún": 21, "veintidos": 22, "veintitres": 23, "veintiseis": 26,
           "quatrevingt": 80, "cent": 100, "cien": 100, "ciento": 100, "hundred": 100})
_JOIN = {"et", "y", "and", "a"}  # "vingt et un", "treinta y dos", "one hundred and five", "a hundred"
_EN = set("one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen "
          "seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred and".split())
_STREET = set("rue avenue av boulevard bd chemin place allée allee impasse route quai cours passage "
              "calle avenida plaza paseo carretera street road lane".split())


def digits_for_leading_number(address: str | None) -> str | None:
    if not address:
        return address
    words = address.split()
    total, used = 0, 0
    for word in words:
        parts = re.sub(r"quatre-vingts?", "quatrevingt", word.lower()).split("-")
        if not all(p in _N or (p in _JOIN and total) for p in parts):
            break
        for p in (p for p in parts if p in _N):
            total = (total or 1) * 100 if _N[p] == 100 else total + _N[p]
        used += 1
    if not 1 <= total <= 199 or (used == 1 and words[0].lower() in ("un", "une", "uno", "una")):
        return address
    rest = words[used:]
    bis = [rest.pop(0)] if rest and rest[0].lower() in ("bis", "ter") else []
    english = all(p in _EN for w in words[:used] for p in w.lower().split("-"))
    if not any(w.lower().rstrip(".,") in _STREET for w in rest[: 4 if english else 1]):
        return address
    return " ".join([str(total)] + bis + rest)
