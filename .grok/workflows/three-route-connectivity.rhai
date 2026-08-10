let meta = #{
    name: "three-route-connectivity",
    description: "Audit BlkSpace 3-route secure connectivity (A social, B RNS, C play) — no product AI",
    phases: [
        #{ title: "Map", detail: "Read route model and docs" },
        #{ title: "Verify", detail: "Confirm separation and UI wiring" },
        #{ title: "Report", detail: "Write audit summary" },
    ],
    when_to_use: "After changing mesh, Reticulum, rollback, or Turso docs; verify 3 lanes stay separate",
};

let map_schema = #{
    "type": "object",
    "required": ["routes", "turso_role", "product_ai"],
    "properties": #{
        "routes": #{
            "type": "array",
            "maxItems": 3,
            "items": #{
                "type": "object",
                "required": ["id", "title", "transport", "status_note"],
                "properties": #{
                    "id": #{ "type": "string" },
                    "title": #{ "type": "string" },
                    "transport": #{ "type": "string" },
                    "status_note": #{ "type": "string" },
                },
            },
        },
        "turso_role": #{ "type": "string" },
        "product_ai": #{ "type": "string" },
        "equation": #{ "type": "string" },
    },
};

let verify_schema = #{
    "type": "object",
    "required": ["lanes_separate", "ui_wired", "issues"],
    "properties": #{
        "lanes_separate": #{ "type": "boolean" },
        "ui_wired": #{ "type": "boolean" },
        "issues": #{
            "type": "array",
            "maxItems": 12,
            "items": #{ "type": "string" },
        },
        "evidence": #{ "type": "string" },
    },
};

phase("Map");
let map_prompt = "";
map_prompt += "Read these files with read_file (do not invent):\n";
map_prompt += "1) Code-Companion/artifacts/blkspace/src/lib/secure-connectivity-routes.ts\n";
map_prompt += "2) docs/features/secure-connectivity-three-routes.md\n";
map_prompt += "3) docs/implementation/RETICULUM_INTEGRATION.md (first 50 lines ok)\n";
map_prompt += "4) docs/features/sbf-rollback-netplay.md (first 40 lines ok)\n";
map_prompt += "Return JSON: routes[3] with id A/B/C, title, transport, status_note; ";
map_prompt += "turso_role (one sentence); product_ai must be 'none'; equation string from code.\n";
map_prompt += "If a file is missing, say so in status_note — do not fabricate code.";

let map_r = agent(map_prompt, #{
    label: "map-routes",
    capability_mode: "read-only",
    output_schema: map_schema,
});

if map_r == () || !map_r.success {
    complete(#{
        summary: "Map phase failed — could not read route model",
        ok: false,
    });
}

phase("Verify");
let v_prompt = "";
v_prompt += "Verify 3-route wiring. Use grep/read_file only.\n";
v_prompt += "Check:\n";
v_prompt += "- SecureConnectivityRoutesPanel is imported in mesh-test.tsx\n";
v_prompt += "- Tabs include value routes (3 Routes)\n";
v_prompt += "- Route A uses Nostr/intranet; B reticulum; C rollback vision — not one shared function for all\n";
v_prompt += "- Turso is described as local cache NOT mesh peer\n";
v_prompt += "- No SpaceXAI / XAI_API_KEY product code was added for this feature\n";
v_prompt += "Set lanes_separate=true only if evidence shows A/B/C are separate.\n";
v_prompt += "Set ui_wired=true only if mesh-test has routes tab + panel import.\n";
v_prompt += "issues: list concrete gaps (empty array only after reading).\n";
v_prompt += "evidence: quote file paths you opened.";

let v_r = agent(v_prompt, #{
    label: "verify-separation",
    capability_mode: "read-only",
    output_schema: verify_schema,
});

phase("Report");
let lanes_ok = false;
let ui_ok = false;
let issues = [];
if v_r != () && v_r.success && v_r.output != () {
    if v_r.output.lanes_separate == true { lanes_ok = true; }
    if v_r.output.ui_wired == true { ui_ok = true; }
    if v_r.output.issues != () {
        for i in v_r.output.issues { issues.push(i); }
    }
}

let report = "";
report += "# Three-route connectivity audit\n\n";
report += "Equation: Route A ∥ Route B ∥ Route C → secure WeixNet connectivity\n\n";
if map_r.output != () {
    report += "## Map\n";
    report += "Turso: " + map_r.output.turso_role + "\n";
    report += "Product AI: " + map_r.output.product_ai + "\n\n";
}
report += "## Verify\n";
report += "lanes_separate=" + lanes_ok.to_string() + " ui_wired=" + ui_ok.to_string() + "\n";
if issues.len() > 0 {
    report += "Issues:\n";
    for i in issues { report += "- " + i + "\n"; }
} else {
    report += "No issues listed by verifier.\n";
}
report += "\n## UI path\nMesh Test → 3 Routes (`/mesh-test`)\n";

let path = write_scratch_file("three-route-audit.md", report);
log("Wrote " + path);

complete(#{
    summary: if lanes_ok && ui_ok {
        "3 routes mapped and UI wired"
    } else {
        "Audit finished — check issues"
    },
    ok: lanes_ok && ui_ok,
    path: path,
    lanes_separate: lanes_ok,
    ui_wired: ui_ok,
    issue_count: issues.len(),
});
