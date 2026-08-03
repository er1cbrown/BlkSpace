// BlkSpace student Yard ship path: green Release CI → MSI on tag → Device B smoke.
// Usage:
//   /workflow yard-release
//   /workflow yard-release {"tag":"v0.1.0-yard","skip_ship":false,"skip_smoke":false}
// Args (all optional):
//   tag         — release tag (default v0.1.0-yard)
//   skip_ship   — if true, only preflight + verify existing assets (no push/tag)
//   skip_smoke  — if true, stop after MSI is confirmed on the release
//   install_msi — if true (default), Device B installs MSI; if false, smoke notes only

let meta = #{
    name: "yard-release",
    description: "Ship BlkSpace Yard: fix Release CI, land MSI on tag, Device B guest→account→post smoke",
    when_to_use: "Cutting or repairing a student Yard release (v0.1.0-yard style MSI on GitHub Releases).",
    phases: [
        #{ title: "Preflight", detail: "repo, tag, release.yml, recent run status" },
        #{ title: "Build-gate", detail: "cargo check no-default-features; fix compile blockers" },
        #{ title: "Ship", detail: "push main + retag v* to trigger Release" },
        #{ title: "Verify-MSI", detail: "confirm BlkSpace-Yard-Windows-x64.msi on the release" },
        #{ title: "Device-B-smoke", detail: "install MSI + guest → account → post" },
    ],
};

let status_schema = #{
    "type": "object",
    "required": ["ok", "summary", "blockers"],
    "properties": #{
        "ok": #{ "type": "boolean" },
        "summary": #{ "type": "string" },
        "blockers": #{ "type": "array", "items": #{ "type": "string" }, "maxItems": 12 },
        "tag": #{ "type": "string" },
        "head_sha": #{ "type": "string" },
        "msi_url": #{ "type": "string" },
    },
};

let fix_schema = #{
    "type": "object",
    "required": ["ok", "summary", "changed_files"],
    "properties": #{
        "ok": #{ "type": "boolean" },
        "summary": #{ "type": "string" },
        "changed_files": #{ "type": "array", "items": #{ "type": "string" }, "maxItems": 20 },
        "cargo_check_passed": #{ "type": "boolean" },
    },
};

let ship_schema = #{
    "type": "object",
    "required": ["ok", "summary", "tag", "commit"],
    "properties": #{
        "ok": #{ "type": "boolean" },
        "summary": #{ "type": "string" },
        "tag": #{ "type": "string" },
        "commit": #{ "type": "string" },
        "release_run_url": #{ "type": "string" },
    },
};

let verify_schema = #{
    "type": "object",
    "required": ["ok", "summary", "msi_present"],
    "properties": #{
        "ok": #{ "type": "boolean" },
        "summary": #{ "type": "string" },
        "msi_present": #{ "type": "boolean" },
        "msi_url": #{ "type": "string" },
        "other_assets": #{ "type": "array", "items": #{ "type": "string" }, "maxItems": 20 },
    },
};

let smoke_schema = #{
    "type": "object",
    "required": ["ok", "summary", "guest", "account", "post"],
    "properties": #{
        "ok": #{ "type": "boolean" },
        "summary": #{ "type": "string" },
        "guest": #{ "type": "boolean" },
        "account": #{ "type": "boolean" },
        "post": #{ "type": "boolean" },
        "handle": #{ "type": "string" },
        "install_path": #{ "type": "string" },
        "notes": #{ "type": "array", "items": #{ "type": "string" }, "maxItems": 12 },
    },
};

// --- args ---
let tag = "v0.1.0-yard";
let skip_ship = false;
let skip_smoke = false;
let install_msi = true;
if args != () {
    if args.tag != () && type_of(args.tag) == "string" && args.tag != "" {
        tag = args.tag;
    }
    if args.skip_ship == true { skip_ship = true; }
    if args.skip_smoke == true { skip_smoke = true; }
    if args.install_msi == false { install_msi = false; }
}

let repo_root = "BlkSpace";
log("yard-release start tag=" + tag + " skip_ship=" + skip_ship.to_string() + " skip_smoke=" + skip_smoke.to_string());

// =============================================================================
phase("Preflight");
// =============================================================================
let preflight_prompt = "";
preflight_prompt += "You are preflighting BlkSpace student Yard release. Repo root is under the workspace: ";
preflight_prompt += repo_root;
preflight_prompt += ". Tag target: ";
preflight_prompt += tag;
preflight_prompt += ". ";
preflight_prompt += "Use tools (run_terminal_command, read_file, gh/API if available). Do not invent green CI. ";
preflight_prompt += "Check: (1) git status/branch and HEAD sha in ";
preflight_prompt += repo_root;
preflight_prompt += "; (2) .github/workflows/release.yml exists and Yard Windows matrix builds MSI; ";
preflight_prompt += "(3) recent Release runs for this tag / latest main; (4) whether GitHub release already has ";
preflight_prompt += "BlkSpace-Yard-Windows-x64.msi. ";
preflight_prompt += "Known failure classes from prior work: (a) Rust params! ambiguity from `use crate::sqlite::{params,...}` ";
preflight_prompt += "— do not import params, use crate-root macro; (b) Transaction missing last_insert_rowid; ";
preflight_prompt += "(c) nested Tokio Runtime::new on Tauri workers — deferred relay must use OS thread + ";
preflight_prompt += "connect_startup_relays_blocking that reuses Handle. ";
preflight_prompt += "Return ok=true only if repo is reachable and you have a concrete next step. List blockers.";

let pre = agent(preflight_prompt, #{
    label: "preflight",
    capability_mode: "execute",
    output_schema: status_schema,
});
if pre == () || !pre.success || pre.output == () {
    complete(#{
        summary: "Preflight agent failed — cannot ship.",
        tag: tag,
        phase: "Preflight",
        ok: false,
    });
}
log("preflight: " + pre.output.summary);
if pre.output.ok != true {
    // still attempt build-gate; preflight may only report soft blockers
    log("preflight reported blockers — continuing to Build-gate");
}

// =============================================================================
phase("Build-gate");
// =============================================================================
let fix_prompt = "";
fix_prompt += "Make BlkSpace Yard Tauri compile for Release CI (Windows MSI). Workspace: ";
fix_prompt += repo_root;
fix_prompt += ". ";
fix_prompt += "Run: cd ";
fix_prompt += repo_root;
fix_prompt += "/Code-Companion/artifacts/blkspace/src-tauri ; cargo check --no-default-features. ";
fix_prompt += "If errors: fix ONLY compile blockers needed for Yard release (params import, last_insert_rowid, ";
fix_prompt += "nested tokio runtime in relay_manager/lib setup, missing AlertTriangle imports if they break builds). ";
fix_prompt += "Do not gold-plate. After fixes, re-run cargo check --no-default-features. ";
fix_prompt += "Set cargo_check_passed=true only if check finishes with Finished (warnings OK). ";
fix_prompt += "List changed_files relative to repo root. Commit is NOT required here — Ship phase handles git.";

let fix = agent(fix_prompt, #{
    label: "build-gate",
    capability_mode: "all",
    output_schema: fix_schema,
});
if fix == () || !fix.success || fix.output == () {
    complete(#{
        summary: "Build-gate agent failed.",
        tag: tag,
        phase: "Build-gate",
        ok: false,
        preflight: pre.output,
    });
}
log("build-gate: " + fix.output.summary);
if fix.output.ok != true || fix.output.cargo_check_passed != true {
    complete(#{
        summary: "cargo check did not pass — will not ship tag. " + fix.output.summary,
        tag: tag,
        phase: "Build-gate",
        ok: false,
        preflight: pre.output,
        build: fix.output,
    });
}

// =============================================================================
phase("Ship");
// =============================================================================
let ship_out = #{
    ok: true,
    summary: "skipped ship (skip_ship=true)",
    tag: tag,
    commit: "",
    release_run_url: "",
};
if !skip_ship {
    let ship_prompt = "";
    ship_prompt += "Ship BlkSpace Yard release tag ";
    ship_prompt += tag;
    ship_prompt += " from repo ";
    ship_prompt += repo_root;
    ship_prompt += ". ";
    ship_prompt += "1) If there are uncommitted build-gate fixes, commit with a clear fix message (no secrets). ";
    ship_prompt += "2) git push origin main (note branch protection may warn; push still often works). ";
    ship_prompt += "3) Force-retarget annotated tag: delete local tag if present, tag -a ";
    ship_prompt += tag;
    ship_prompt += " -m \"BlkSpace ";
    ship_prompt += tag;
    ship_prompt += " — student Yard build (Tier 0)\", git push --force origin ";
    ship_prompt += tag;
    ship_prompt += ". ";
    ship_prompt += "4) Confirm Release workflow queued (gh run list --workflow=release.yml or API). ";
    ship_prompt += "Return commit SHA, tag name, release_run_url if known. ok=true only if tag is on remote.";

    let ship = agent(ship_prompt, #{
        label: "ship-tag",
        capability_mode: "all",
        output_schema: ship_schema,
    });
    if ship == () || !ship.success || ship.output == () {
        complete(#{
            summary: "Ship agent failed.",
            tag: tag,
            phase: "Ship",
            ok: false,
            build: fix.output,
        });
    }
    ship_out = ship.output;
    log("ship: " + ship_out.summary);
    if ship_out.ok != true {
        complete(#{
            summary: "Tag push failed. " + ship_out.summary,
            tag: tag,
            phase: "Ship",
            ok: false,
            build: fix.output,
            ship: ship_out,
        });
    }
} else {
    log("skip_ship=true — not pushing or retagging");
}

// =============================================================================
phase("Verify-MSI");
// =============================================================================
let verify_prompt = "";
verify_prompt += "Verify GitHub release ";
verify_prompt += tag;
verify_prompt += " on er1cbrown/BlkSpace has asset BlkSpace-Yard-Windows-x64.msi. ";
verify_prompt += "Use gh release view ";
verify_prompt += tag;
verify_prompt += " --repo er1cbrown/BlkSpace or the public API. ";
verify_prompt += "If Release jobs are still running, poll up to ~25 minutes for Yard windows-latest success ";
verify_prompt += "(do not invent assets). ";
verify_prompt += "msi_present=true and ok=true only if the MSI asset is listed. Set msi_url to the download URL. ";
verify_prompt += "List other_assets names briefly.";

let verify = agent(verify_prompt, #{
    label: "verify-msi",
    capability_mode: "execute",
    output_schema: verify_schema,
});
if verify == () || !verify.success || verify.output == () {
    complete(#{
        summary: "Verify-MSI agent failed.",
        tag: tag,
        phase: "Verify-MSI",
        ok: false,
        ship: ship_out,
    });
}
log("verify: " + verify.output.summary);
if verify.output.ok != true || verify.output.msi_present != true {
    complete(#{
        summary: "MSI not on release yet. " + verify.output.summary,
        tag: tag,
        phase: "Verify-MSI",
        ok: false,
        ship: ship_out,
        verify: verify.output,
    });
}

if skip_smoke {
    let report_skip = "";
    report_skip += "# yard-release result\n\n";
    report_skip += "- tag: ";
    report_skip += tag;
    report_skip += "\n- MSI: present\n- smoke: skipped\n- summary: ";
    report_skip += verify.output.summary;
    report_skip += "\n";
    let p_skip = write_scratch_file("yard-release-report.md", report_skip);
    complete(#{
        summary: "MSI confirmed; smoke skipped.",
        ok: true,
        tag: tag,
        msi_url: verify.output.msi_url,
        path: p_skip,
        ship: ship_out,
        verify: verify.output,
    });
}

// =============================================================================
phase("Device-B-smoke");
// =============================================================================
let smoke_prompt = "";
smoke_prompt += "Device B smoke for BlkSpace Yard on THIS Windows machine. Tag: ";
smoke_prompt += tag;
smoke_prompt += ". ";
if install_msi {
    smoke_prompt += "1) Download BlkSpace-Yard-Windows-x64.msi from the GitHub release (gh release download). ";
    smoke_prompt += "2) msiexec per-user install: ALLUSERS=2 MSIINSTALLPERUSER=1 /qn. ";
    smoke_prompt += "Install dir typically %LOCALAPPDATA%\\Programs\\BlkSpace\\app.exe. ";
} else {
    smoke_prompt += "Assume MSI already installed at %LOCALAPPDATA%\\Programs\\BlkSpace\\app.exe if present. ";
}
smoke_prompt += "3) Launch app; it must stay running (no nested Tokio panic). ";
smoke_prompt += "Optional: WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9223 for Playwright CDP. ";
smoke_prompt += "4) Guest: welcome → Just browse the yard as a guest → feed loads. ";
smoke_prompt += "5) Account: Create free account / welcome Continue → handle + Join the Yard. ";
smoke_prompt += "6) Post: /create → textarea → button **Post to yard** (not the Post mode tab). ";
smoke_prompt += "Or invoke create_post with mediaHashes as JSON string '[]'. ";
smoke_prompt += "Confirm post on My Yard / feed and WB earn if possible. ";
smoke_prompt += "Set guest/account/post booleans from observed evidence. ok=true only if all three true. ";
smoke_prompt += "Record handle and install_path.";

let smoke = agent(smoke_prompt, #{
    label: "device-b-smoke",
    capability_mode: "all",
    output_schema: smoke_schema,
});
if smoke == () || !smoke.success || smoke.output == () {
    complete(#{
        summary: "Device-B-smoke agent failed after MSI verified.",
        tag: tag,
        phase: "Device-B-smoke",
        ok: false,
        msi_url: verify.output.msi_url,
        verify: verify.output,
    });
}
log("smoke: " + smoke.output.summary);

let report = "";
report += "# BlkSpace yard-release\n\n";
report += "| Step | Status |\n|---|---|\n";
report += "| Tag | ";
report += tag;
report += " |\n| cargo check | pass |\n| Ship | ";
report += ship_out.summary;
report += " |\n| MSI | ";
if verify.output.msi_present == true { report += "present"; } else { report += "missing"; }
report += " |\n| Guest | ";
if smoke.output.guest == true { report += "ok"; } else { report += "fail"; }
report += " |\n| Account | ";
if smoke.output.account == true { report += "ok"; } else { report += "fail"; }
report += " |\n| Post | ";
if smoke.output.post == true { report += "ok"; } else { report += "fail"; }
report += " |\n\n";
report += "## Summary\n";
report += smoke.output.summary;
report += "\n\n";
if verify.output.msi_url != () && verify.output.msi_url != "" {
    report += "MSI: ";
    report += verify.output.msi_url;
    report += "\n";
}
if smoke.output.handle != () && smoke.output.handle != "" {
    report += "Handle: ";
    report += smoke.output.handle;
    report += "\n";
}
let report_path = write_scratch_file("yard-release-report.md", report);

let all_ok = smoke.output.ok == true
    && smoke.output.guest == true
    && smoke.output.account == true
    && smoke.output.post == true;

complete(#{
    summary: if all_ok {
        "Yard release complete: MSI on tag + Device B guest→account→post passed."
    } else {
        "Finished with gaps: " + smoke.output.summary
    },
    ok: all_ok,
    tag: tag,
    path: report_path,
    msi_url: verify.output.msi_url,
    ship: ship_out,
    verify: verify.output,
    smoke: smoke.output,
});
