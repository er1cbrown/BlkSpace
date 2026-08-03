#!/usr/bin/env python3
"""Generate hbcu-catalog.ts from curated HBCU list (public + private)."""
import json
import re
from pathlib import Path

RAW = """
Alabama A&M University|Normal|AL|1875|public
Alabama State University|Montgomery|AL|1867|public
Albany State University|Albany|GA|1903|public
Alcorn State University|Lorman|MS|1871|public
Allen University|Columbia|SC|1870|private
American Baptist College|Nashville|TN|1924|private
University of Arkansas at Pine Bluff|Pine Bluff|AR|1873|public
Arkansas Baptist College|Little Rock|AR|1884|private
Barber-Scotia College|Concord|NC|1867|private
Benedict College|Columbia|SC|1870|private
Bennett College|Greensboro|NC|1873|private
Bethune-Cookman University|Daytona Beach|FL|1904|private
Bishop State Community College|Mobile|AL|1927|public
Bluefield State University|Bluefield|WV|1895|public
Bowie State University|Bowie|MD|1865|public
Central State University|Wilberforce|OH|1887|public
Cheyney University of Pennsylvania|Cheyney|PA|1837|public
Claflin University|Orangeburg|SC|1869|private
Clark Atlanta University|Atlanta|GA|1865|private
Clinton College|Rock Hill|SC|1894|private
Coahoma Community College|Clarksdale|MS|1924|public
Coppin State University|Baltimore|MD|1900|public
Delaware State University|Dover|DE|1891|public
Denmark Technical College|Denmark|SC|1947|public
Dillard University|New Orleans|LA|1869|private
University of the District of Columbia|Washington|DC|1851|public
Edward Waters University|Jacksonville|FL|1866|private
Elizabeth City State University|Elizabeth City|NC|1891|public
Fayetteville State University|Fayetteville|NC|1867|public
Fisk University|Nashville|TN|1866|private
Florida A&M University|Tallahassee|FL|1887|public
Florida Memorial University|Miami Gardens|FL|1879|private
Fort Valley State University|Fort Valley|GA|1895|public
Gadsden State Community College|Gadsden|AL|1925|public
Grambling State University|Grambling|LA|1901|public
Hampton University|Hampton|VA|1868|private
Harris-Stowe State University|St. Louis|MO|1857|public
Hinds Community College at Utica|Utica|MS|1903|public
Howard University|Washington|DC|1867|private
Huston-Tillotson University|Austin|TX|1875|private
Interdenominational Theological Center|Atlanta|GA|1958|private
J. F. Drake State Community and Technical College|Huntsville|AL|1961|public
Jackson State University|Jackson|MS|1877|public
Jarvis Christian University|Hawkins|TX|1912|private
Johnson C. Smith University|Charlotte|NC|1867|private
Kentucky State University|Frankfort|KY|1886|public
Knoxville College|Knoxville|TN|1875|private
Lane College|Jackson|TN|1882|private
Langston University|Langston|OK|1897|public
Lawson State Community College|Birmingham|AL|1949|public
LeMoyne-Owen College|Memphis|TN|1862|private
Lincoln University of Missouri|Jefferson City|MO|1866|public
Lincoln University of Pennsylvania|Lincoln University|PA|1854|public
Livingstone College|Salisbury|NC|1879|private
University of Maryland Eastern Shore|Princess Anne|MD|1886|public
Meharry Medical College|Nashville|TN|1876|private
Miles College|Fairfield|AL|1898|private
Mississippi Valley State University|Itta Bena|MS|1950|public
Morehouse College|Atlanta|GA|1867|private
Morehouse School of Medicine|Atlanta|GA|1975|private
Morgan State University|Baltimore|MD|1867|public
Morris Brown College|Atlanta|GA|1881|private
Morris College|Sumter|SC|1908|private
Norfolk State University|Norfolk|VA|1935|public
North Carolina A&T State University|Greensboro|NC|1891|public
North Carolina Central University|Durham|NC|1910|public
Oakwood University|Huntsville|AL|1896|private
Paine College|Augusta|GA|1882|private
Paul Quinn College|Dallas|TX|1872|private
Payne Theological Seminary|Wilberforce|OH|1856|private
Philander Smith University|Little Rock|AR|1877|private
Prairie View A&M University|Prairie View|TX|1876|public
Rust College|Holly Springs|MS|1866|private
Savannah State University|Savannah|GA|1890|public
Selma University|Selma|AL|1878|private
Shaw University|Raleigh|NC|1865|private
Shelton State Community College|Tuscaloosa|AL|1952|public
Simmons College of Kentucky|Louisville|KY|1869|private
South Carolina State University|Orangeburg|SC|1896|public
Southern University at New Orleans|New Orleans|LA|1956|public
Southern University at Shreveport|Shreveport|LA|1967|public
Southern University and A&M College|Baton Rouge|LA|1880|public
Southwestern Christian College|Terrell|TX|1948|private
Spelman College|Atlanta|GA|1881|private
St. Augustine's University|Raleigh|NC|1867|private
Stillman College|Tuscaloosa|AL|1876|private
Talladega College|Talladega|AL|1867|private
Tennessee State University|Nashville|TN|1912|public
Texas College|Tyler|TX|1894|private
Texas Southern University|Houston|TX|1927|public
Tougaloo College|Tougaloo|MS|1869|private
Trenholm State Community College|Montgomery|AL|1947|public
Tuskegee University|Tuskegee|AL|1881|private
University of the Virgin Islands|St. Thomas|VI|1962|public
Virginia State University|Petersburg|VA|1882|public
Virginia Union University|Richmond|VA|1865|private
Virginia University of Lynchburg|Lynchburg|VA|1886|private
Voorhees University|Denmark|SC|1897|private
West Virginia State University|Institute|WV|1891|public
Wilberforce University|Wilberforce|OH|1856|private
Wiley University|Marshall|TX|1873|private
Winston-Salem State University|Winston-Salem|NC|1892|public
Xavier University of Louisiana|New Orleans|LA|1915|private
""".strip().splitlines()

ALIASES = {
    "Tennessee State University": "tsu",
    "Howard University": "howard",
    "Spelman College": "spelman",
    "Florida A&M University": "famu",
    "Morehouse College": "morehouse",
    "Meharry Medical College": "meharry",
    "North Carolina A&T State University": "ncat",
    "Jackson State University": "jsu",
    "Hampton University": "hampton",
    "Tuskegee University": "tuskegee",
    "Grambling State University": "grambling",
    "Prairie View A&M University": "pvamu",
    "Texas Southern University": "txsu",
    "Xavier University of Louisiana": "xavier",
    "Fisk University": "fisk",
    "Clark Atlanta University": "cau",
    "Morgan State University": "morgan",
    "Norfolk State University": "nsu",
    "Southern University and A&M College": "southern",
    "Bowie State University": "bowie",
    "Delaware State University": "dsu",
    "Virginia State University": "vsu",
    "Alabama A&M University": "aamu",
    "Alabama State University": "asu",
    "Bethune-Cookman University": "bcu",
}

SHORT = {
    "Florida A&M University": "FAMU",
    "Tennessee State University": "TSU",
    "North Carolina A&T State University": "NC A&T",
    "University of Arkansas at Pine Bluff": "UAPB",
    "University of Maryland Eastern Shore": "UMES",
    "University of the District of Columbia": "UDC",
    "University of the Virgin Islands": "UVI",
    "Southern University and A&M College": "Southern U",
    "Southern University at New Orleans": "SUNO",
    "Southern University at Shreveport": "SUSLA",
    "Prairie View A&M University": "PVAMU",
    "Texas Southern University": "TSU Houston",
    "Jackson State University": "JSU",
    "Alabama A&M University": "AAMU",
    "Alabama State University": "ASU",
    "Morehouse School of Medicine": "MSM",
    "Interdenominational Theological Center": "ITC",
    "J. F. Drake State Community and Technical College": "Drake State",
    "Hinds Community College at Utica": "Hinds Utica",
    "Xavier University of Louisiana": "Xavier LA",
    "Cheyney University of Pennsylvania": "Cheyney",
    "Harris-Stowe State University": "Harris-Stowe",
    "Virginia University of Lynchburg": "VU Lynchburg",
    "Lincoln University of Missouri": "Lincoln MO",
    "Lincoln University of Pennsylvania": "Lincoln PA",
    "Simmons College of Kentucky": "Simmons KY",
    "Barber-Scotia College": "Barber-Scotia",
    "Bethune-Cookman University": "Bethune-Cookman",
    "Huston-Tillotson University": "Huston-Tillotson",
    "LeMoyne-Owen College": "LeMoyne-Owen",
    "St. Augustine's University": "St. Aug's",
}


def slug(name: str) -> str:
    if name in ALIASES:
        return ALIASES[name]
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    s = s.replace("university-of-the-", "u-")
    s = s.replace("university-of-", "u-")
    s = s.replace("-university", "")
    s = s.replace("-college", "")
    s = s.replace("-state", "-st")
    s = s.replace("community-and-technical", "ctc")
    s = s.replace("community", "cc")
    s = s.replace("technical", "tech")
    if len(s) > 28:
        parts = [p for p in s.split("-") if p not in ("of", "the", "and", "at")]
        s = "-".join(parts[:4])
    return s[:32]


def short_name(name: str) -> str:
    if name in SHORT:
        return SHORT[name]
    sn = re.sub(r"\s+(University|College|Seminary)$", "", name)
    if sn.startswith("University of "):
        sn = sn.replace("University of ", "")
    return sn if len(sn) < 28 else sn[:25] + "…"


def main() -> None:
    seen: set[str] = set()
    entries: list[tuple] = []
    for line in RAW:
        name, city, st, year, typ = line.split("|")
        sid = slug(name)
        base = sid
        i = 2
        while sid in seen:
            sid = f"{base}-{i}"
            i += 1
        seen.add(sid)
        entries.append((sid, name, short_name(name), city, st, int(year), typ))

    out: list[str] = []
    out.append(
        "/** Full HBCU yard catalog — public & private (DOE/NCES-aligned current list)."
    )
    out.append(
        " * Source: Wikipedia List of HBCUs + NCES historically Black designation."
    )
    out.append(
        " * Lincoln PA added (1854, oldest degree-granting HBCU alongside Cheyney)."
    )
    out.append(" * Auto-generated by scripts/gen-hbcu-catalog.py — re-run to refresh.")
    out.append(" */")
    out.append("")
    out.append('export type HbcuControl = "public" | "private";')
    out.append("")
    out.append("export interface HbcuInstitution {")
    out.append("  id: string;")
    out.append("  school: string;")
    out.append("  shortName: string;")
    out.append("  city: string;")
    out.append("  state: string;")
    out.append("  founded: number;")
    out.append("  control: HbcuControl;")
    out.append("  /** Short yard label shown in UI */")
    out.append("  yardLabel: string;")
    out.append("}")
    out.append("")
    out.append("/** Featured yards with richer skins (gradients in yard-themes). */")
    out.append("export const FEATURED_YARD_IDS = [")
    for fid in [
        "tsu",
        "howard",
        "spelman",
        "famu",
        "morehouse",
        "meharry",
        "ncat",
        "hampton",
        "tuskegee",
        "jsu",
        "grambling",
        "pvamu",
    ]:
        out.append(f'  "{fid}",')
    out.append("] as const;")
    out.append("")
    out.append("export type FeaturedYardId = (typeof FEATURED_YARD_IDS)[number];")
    out.append("")
    out.append("export const HBCU_CATALOG: HbcuInstitution[] = [")
    for sid, name, sn, city, st, year, typ in entries:
        yard = f"{sn} Yard"
        out.append(
            "  {"
            f' id: "{sid}",'
            f" school: {json.dumps(name)},"
            f" shortName: {json.dumps(sn)},"
            f" city: {json.dumps(city)},"
            f' state: "{st}",'
            f" founded: {year},"
            f' control: "{typ}",'
            f" yardLabel: {json.dumps(yard)}"
            " },"
        )
    out.append("];")
    out.append("")
    out.append(
        "export const HBCU_BY_ID: Record<string, HbcuInstitution> = Object.fromEntries("
    )
    out.append("  HBCU_CATALOG.map((h) => [h.id, h]),")
    out.append(");")
    out.append("")
    out.append("export const HBCU_STATES = Array.from(")
    out.append("  new Set(HBCU_CATALOG.map((h) => h.state)),")
    out.append(").sort();")
    out.append("")
    out.append("export function getHbcu(id: string): HbcuInstitution | null {")
    out.append("  return HBCU_BY_ID[id] ?? null;")
    out.append("}")
    out.append("")
    out.append(
        'export function searchHbcus(query: string, opts?: { state?: string; control?: HbcuControl | "all" }): HbcuInstitution[] {'
    )
    out.append("  const q = query.trim().toLowerCase();")
    out.append('  const state = opts?.state && opts.state !== "all" ? opts.state : null;')
    out.append(
        '  const control = opts?.control && opts.control !== "all" ? opts.control : null;'
    )
    out.append("  return HBCU_CATALOG.filter((h) => {")
    out.append("    if (state && h.state !== state) return false;")
    out.append("    if (control && h.control !== control) return false;")
    out.append("    if (!q) return true;")
    out.append("    return (")
    out.append("      h.school.toLowerCase().includes(q) ||")
    out.append("      h.shortName.toLowerCase().includes(q) ||")
    out.append("      h.city.toLowerCase().includes(q) ||")
    out.append("      h.state.toLowerCase().includes(q) ||")
    out.append("      h.id.includes(q) ||")
    out.append("      h.yardLabel.toLowerCase().includes(q)")
    out.append("    );")
    out.append("  });")
    out.append("}")
    out.append("")
    out.append("export function hbcuLocation(h: HbcuInstitution): string {")
    out.append("  return `${h.city}, ${h.state}`;")
    out.append("}")
    out.append("")
    out.append("export function catalogStats(): { total: number; public: number; private: number } {")
    out.append("  const publicN = HBCU_CATALOG.filter((h) => h.control === \"public\").length;")
    out.append("  return { total: HBCU_CATALOG.length, public: publicN, private: HBCU_CATALOG.length - publicN };")
    out.append("}")
    out.append("")

    dest = Path(__file__).resolve().parent.parent / "src" / "lib" / "hbcu-catalog.ts"
    dest.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"wrote {dest} ({len(entries)} institutions)")
    print(f"  public={sum(1 for e in entries if e[6]=='public')} private={sum(1 for e in entries if e[6]=='private')}")


if __name__ == "__main__":
    main()
    # Also refresh Rust SQLite seed used by Tauri get_communities
    rust_gen = Path(__file__).resolve().parent / "gen-hbcu-rust-seed.py"
    if rust_gen.exists():
        import runpy

        runpy.run_path(str(rust_gen), run_name="__main__")
