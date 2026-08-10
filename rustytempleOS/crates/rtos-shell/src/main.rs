//! rustytempleOS — hosted shell (Phase 1)
//!
//! Runs on the host OS. This is not TempleOS and not a freestanding kernel.
//! Inspired by the *idea* of a tiny interactive system language + shell.

use std::io::{self, BufRead, Write};

const BANNER: &str = r#"
  rustytempleOS  ·  rtos-shell  ·  phase 1 (hosted)
  Inspired by TempleOS / HolyC simplicity — clean-room Rust, not a port of proprietary binaries.
  Type  help  ·  quit
"#;

fn main() {
    print!("{BANNER}");
    let _ = io::stdout().flush();

    let stdin = io::stdin();
    let mut lines = stdin.lock().lines();

    loop {
        print!("rtos> ");
        let _ = io::stdout().flush();

        let Some(Ok(line)) = lines.next() else {
            println!();
            break;
        };
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        match line {
            "help" | "?" => print_help(),
            "quit" | "exit" | "q" => {
                println!("godspeed.");
                break;
            }
            "version" => {
                println!("rtos-shell {}", env!("CARGO_PKG_VERSION"));
                println!("track: hosted playground (kernel track not started)");
            }
            "about" => print_about(),
            "clear" => {
                // ANSI clear — fine on macOS/Linux terminals
                print!("\x1B[2J\x1B[H");
                let _ = io::stdout().flush();
            }
            "echo" => println!(),
            cmd if cmd.starts_with("echo ") => {
                println!("{}", cmd.trim_start_matches("echo ").trim());
            }
            other => {
                println!("unknown: {other:?}  (try help)");
            }
        }
    }
}

fn print_help() {
    println!(
        r#"commands:
  help, ?       this list
  about         project intent
  version       shell version + track
  echo [text]   print text
  clear         clear terminal
  quit, exit, q leave
"#
    );
}

fn print_about() {
    println!(
        r#"rustytempleOS (er1cbrown)
  Educational OS / systems lab in Rust.
  Inspiration: TempleOS architecture ideas (tiny interactive system, own tools).
  Not affiliated with TempleOS. Not a HolyC binary rehost.
  Tracks: H=hosted shell (here) · K=kernel lab · L=language subset (later).
  BlkSpace is a separate project (campus social). Active focus: this tree.
"#
    );
}

#[cfg(test)]
mod tests {
    #[test]
    fn banner_mentions_hosted() {
        assert!(super::BANNER.contains("hosted"));
    }
}
