// BlkSpace persona smoke: Focus (med) · Faculty · Messages ethics · Hub.
// Usage:
//   /workflow persona-smoke
//   /workflow persona-smoke {"persona":"all"}
//   /workflow persona-smoke {"persona":"faculty","fix":false}
// Args (optional):
//   persona  — "all" | "med" | "faculty" | "messages" | "hub"  (default all)
//   fix      — if true, agents may edit code to repair broken paths (default false)

let meta = #{
    name: "persona-smoke",
    description: "Smoke BlkSpace amalgamation personas: Meharry Focus, Faculty Desk, secure DMs, Content Hub",
    when_to_use: "After feature work on Focus/Faculty/Messages/Hub — verify paths still line up with ethical identity and ProjectConnect.",
    phases: [
        #{ title: "Map", detail: "confirm routes, welcome paths, key files exist" },
        #{ title: "Persona-panels", detail: "parallel smoke per persona" },
        #{ title: "Ethics-gate", detail: "No-PHI and claim-level honesty checks" },
        #{ title: "Report", detail: "write scratch summary" },
    ],
};

let map_schema = #{
    "type": "object",
    "required": ["ok", "summary", "routes", "missing"],
    "properties": #{
        "ok": #{ "type": "boolean" },
        "summary": #{ "type": "string" },
        "routes": #{ "type": "array", "items": #{ "type": "string" }, "maxItems": 20 },
        "missing": #{ "type": "array", "items": #{ "type": "string" }, "maxItems": 20 },
    },
};

let persona_schema = #{
    "type": "object",
    "required": ["ok", "persona", "summary", "checks"],
    "properties": #{
        "ok": #{ "type": "boolean" },
        "persona": #{ "type": "string" },
        "summary": #{ "type": "string" },
        "checks": #{
            "type": "array",
            "maxItems": 12,
            "items": #{
                "type": "object",
                "required": ["name", "pass", "note"],
                "properties": #{
                    "name": #{ "type": "string" },
                    "pass": #{ "type": "boolean" },
                    "note": #{ "type": "string" },
                },
            },
        },
        "blockers": #{ "type": "array", "items": #{ "type": "string" }, "maxItems": 10 },
    },
};

let ethics_schema = #{
    "type": "object",
    "required": ["ok", "summary", "phi_guarded", "claim_levels_honest", "sso_not_faked"],
    "properties": #{
        "ok": #{ "type": "boolean" },
        "summary": #{ "type": "string" },
        "phi_guarded": #{ "type": "boolean" },
        "claim_levels_honest": #{ "type": "boolean" },
        "sso_not_faked": #{ "type": "boolean" },
        "gaps": #{ "type": "array", "items": #{ "type": "string" }, "maxItems": 12 },
    },
};

// --- args ---
let persona = "all";
let do_fix = false;
if args != () {
    if args.persona != () && type_of(args.persona) == "string" && args.persona != "" {
        persona = args.persona;
    }
    if args.fix == true { do_fix = true; }
}

let root = "BlkSpace";
let cap = "read-only";
if do_fix { cap = "all"; }

log("persona-smoke start persona=" + persona + " fix=" + do_fix.to_string());

// =============================================================================
phase("Map");
// =============================================================================
let map_prompt = "";
map_prompt += "You are mapping BlkSpace amalgamation surfaces under workspace path ";
map_prompt += root;
map_prompt += ". Use list_dir, grep, read_file only (unless fix mode). ";
map_prompt += "Confirm these page files exist under Code-Companion/artifacts/blkspace/src/pages/: ";
map_prompt += "focus.tsx, faculty.tsx, hub.tsx, messages.tsx, welcome.tsx, connect.tsx. ";
map_prompt += "Confirm App.tsx routes /focus /faculty /hub /messages. ";
map_prompt += "Confirm libs: focus-mode.ts, faculty-desk.ts, secure-dm.ts, identity-ethics.ts, content-hub.ts. ";
map_prompt += "Confirm Rust secure_dm.rs is registered in lib.rs. ";
map_prompt += "Return routes found and missing paths. ok=true only if core four pages + welcome exist.";

let mapped = agent(map_prompt, #{
    label: "map-routes",
    capability_mode: "read-only",
    output_schema: map_schema,
});
if mapped == () || !mapped.success || mapped.output == () {
    complete(#{ summary: "Map agent failed", ok: false, phase: "Map" });
}
log("map: " + mapped.output.summary);
if mapped.output.ok != true {
    complete(#{
        summary: "Core persona routes missing — " + mapped.output.summary,
        ok: false,
        map: mapped.output,
    });
}

// =============================================================================
phase("Persona-panels");
// =============================================================================
let jobs = [];

if persona == "all" || persona == "med" {
    let p = "";
    p += "Smoke the Meharry med Focus path in ";
    p += root;
    p += "/Code-Companion/artifacts/blkspace. ";
    p += "Read pages/focus.tsx, lib/focus-mode.ts, welcome.tsx med path, yard-themes meharry. ";
    p += "Checks: (1) applyMedSchoolOnboarding sets yard meharry; (2) welcome navigates to /focus; ";
    p += "(3) low-bandwidth ProjectConnect express exists; (4) study refresh uses Hub med/study; ";
    p += "(5) time budget log functions exist. ";
    if do_fix {
        p += "If broken, fix minimal code. ";
    } else {
        p += "Do not edit files. ";
    }
    p += "persona field must be 'med'. List checks with pass true/false.";
    jobs.push(#{
        prompt: p,
        label: "persona-med",
        capability_mode: cap,
        output_schema: persona_schema,
    });
}

if persona == "all" || persona == "faculty" {
    let p = "";
    p += "Smoke Faculty Desk in ";
    p += root;
    p += "/Code-Companion/artifacts/blkspace. ";
    p += "Read pages/faculty.tsx, lib/faculty-desk.ts, lib/project-connect.ts ownership, ";
    p += "src-tauri connect create_opportunity lead gate, authorize_create_yard_event org-lead path. ";
    p += "Checks: (1) posts only under createdBy===user orgs; (2) quick post creates own lab; ";
    p += "(3) Host event UI calls createYardEvent; (4) broadcast-after-post option; ";
    p += "(5) Lead inbox + Accept Message links to /messages?to=; ";
    p += "(6) faculty not posting under demo seed orgs. ";
    if do_fix { p += "If ownership bug returns, fix it. "; }
    else { p += "Read-only. "; }
    p += "persona='faculty'.";
    jobs.push(#{
        prompt: p,
        label: "persona-faculty",
        capability_mode: cap,
        output_schema: persona_schema,
    });
}

if persona == "all" || persona == "messages" {
    let p = "";
    p += "Smoke secure handle DMs + ethics in ";
    p += root;
    p += "/Code-Companion/artifacts/blkspace. ";
    p += "Read pages/messages.tsx, lib/secure-dm.ts, lib/identity-ethics.ts, src-tauri/src/secure_dm.rs. ";
    p += "Checks: (1) No-PHI policy + IEEE principles present; (2) claim levels self_attested/domain_declared not SSO; ";
    p += "(3) looksLikePhiRisk blocks clinical-looking text; (4) blockHandle exists; ";
    p += "(5) Tauri commands send_secure_dm registered in lib.rs; (6) experimental messaging warning used. ";
    p += "persona='messages'.";
    jobs.push(#{
        prompt: p,
        label: "persona-messages",
        capability_mode: "read-only",
        output_schema: persona_schema,
    });
}

if persona == "all" || persona == "hub" {
    let p = "";
    p += "Smoke Content Hub in ";
    p += root;
    p += "/Code-Companion/artifacts/blkspace. ";
    p += "Read pages/hub.tsx, lib/content-hub.ts, amalgamation-meta live/play tags. ";
    p += "Checks: (1) topics include med chess live; (2) publishHubItem works offline localStorage; ";
    p += "(3) App route /hub; (4) earn-angle copy present. persona='hub'.";
    jobs.push(#{
        prompt: p,
        label: "persona-hub",
        capability_mode: "read-only",
        output_schema: persona_schema,
    });
}

if jobs.len() == 0 {
    complete(#{
        summary: "Unknown persona arg — use all|med|faculty|messages|hub",
        ok: false,
        persona: persona,
    });
}

let panel = parallel(jobs);

let persona_ok = true;
let persona_summaries = [];
let i = 0;
while i < panel.len() {
    let r = panel[i];
    if r == () || !r.success || r.output == () {
        persona_ok = false;
        persona_summaries.push("panel slot failed");
    } else {
        if r.output.ok != true { persona_ok = false; }
        persona_summaries.push(r.output.persona + ": " + r.output.summary);
        log(r.output.persona + " ok=" + r.output.ok.to_string());
    }
    i += 1;
}

// =============================================================================
phase("Ethics-gate");
// =============================================================================
let eth_prompt = "";
eth_prompt += "Ethics honesty gate for BlkSpace med/faculty surfaces under ";
eth_prompt += root;
eth_prompt += ". Read identity-ethics.ts, secure-dm.ts, secure_dm.rs, faculty-desk.ts, ExperimentalMessagingWarning. ";
eth_prompt += "Set phi_guarded=true only if No-PHI ack + heuristic block exist. ";
eth_prompt += "Set claim_levels_honest=true only if self_attested/domain_declared are labeled and SSO is not claimed as complete. ";
eth_prompt += "Set sso_not_faked=true only if UI/docs say domain declared is not campus IdP. ";
eth_prompt += "ok=true only if all three booleans true. List gaps if any.";

let eth = agent(eth_prompt, #{
    label: "ethics-gate",
    capability_mode: "read-only",
    output_schema: ethics_schema,
});
let ethics_ok = false;
let ethics_summary = "ethics agent failed";
if eth != () && eth.success && eth.output != () {
    ethics_ok = eth.output.ok == true
        && eth.output.phi_guarded == true
        && eth.output.claim_levels_honest == true
        && eth.output.sso_not_faked == true;
    ethics_summary = eth.output.summary;
    log("ethics: " + ethics_summary);
}

// =============================================================================
phase("Report");
// =============================================================================
let all_ok = persona_ok && ethics_ok && mapped.output.ok == true;

let report = "";
report += "# BlkSpace persona-smoke\n\n";
report += "- persona filter: ";
report += persona;
report += "\n- map: ";
report += mapped.output.summary;
report += "\n- ethics: ";
report += ethics_summary;
report += "\n- overall: ";
if all_ok { report += "PASS"; } else { report += "FAIL"; }
report += "\n\n## Persona panels\n";
let j = 0;
while j < persona_summaries.len() {
    report += "- ";
    report += persona_summaries[j];
    report += "\n";
    j += 1;
}
report += "\n## Routes\n";
if mapped.output.routes != () {
    let k = 0;
    let rts = mapped.output.routes;
    while k < rts.len() {
        report += "- ";
        report += rts[k];
        report += "\n";
        k += 1;
    }
}

let path = write_scratch_file("persona-smoke-report.md", report);

complete(#{
    summary: if all_ok {
        "Persona smoke PASS — Focus/Faculty/Messages/Hub + ethics gate"
    } else {
        "Persona smoke FAIL — see report"
    },
    ok: all_ok,
    path: path,
    persona: persona,
    map: mapped.output,
    ethics: if eth != () && eth.success { eth.output } else { () },
    panel_notes: persona_summaries,
});
