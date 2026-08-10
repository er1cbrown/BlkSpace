/**
 * SBF Rollback core — Phase N1 (Route C data plane, local training).
 *
 * GGPO-class: predict remote inputs → sim now → rollback+replay if wrong.
 * Deterministic integers only. No Nostr, no Turso, no RNS.
 */

export const SBF_ROLLBACK_BUILD_ID = "sbf-rb-n1-ydb1-0.1.0";
export const SBF_ROLLBACK_FPS = 60;
export const SBF_ROLLBACK_MAX_PRED = 8;
export const STAGE_W = 320;
export const STAGE_H = 180;
export const GROUND_Y = 140;

export const IN_LEFT = 1 << 0;
export const IN_RIGHT = 1 << 1;
export const IN_UP = 1 << 2;
export const IN_ATTACK = 1 << 3;

export type FighterState = {
  x: number;
  y: number;
  vx: number;
  jv: number;
  facing: 1 | -1;
  hp: number;
  attackCd: number;
  hitstun: number;
  atkActive: number;
};

export type GameState = {
  frame: number;
  p0: FighterState;
  p1: FighterState;
  seed: number;
  hitFlash: number;
};

export type FrameInputs = [number, number];

export type InputLogEntry = {
  frame: number;
  inputs: FrameInputs;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function spawnFighter(side: 0 | 1): FighterState {
  return {
    x: side === 0 ? 80 : 240,
    y: GROUND_Y,
    vx: 0,
    jv: 0,
    facing: side === 0 ? 1 : -1,
    hp: 100,
    attackCd: 0,
    hitstun: 0,
    atkActive: 0,
  };
}

export function initialState(seed = 1): GameState {
  return {
    frame: 0,
    p0: spawnFighter(0),
    p1: spawnFighter(1),
    seed: seed | 0,
    hitFlash: 0,
  };
}

export function cloneState(s: GameState): GameState {
  return {
    frame: s.frame,
    seed: s.seed,
    hitFlash: s.hitFlash,
    p0: { ...s.p0 },
    p1: { ...s.p1 },
  };
}

export function stateChecksum(s: GameState): number {
  let h = s.frame | 0;
  const pack = (f: FighterState) => {
    h = (Math.imul(h, 31) + (f.x | 0)) | 0;
    h = (Math.imul(h, 31) + (f.y | 0)) | 0;
    h = (Math.imul(h, 31) + (f.jv | 0)) | 0;
    h = (Math.imul(h, 31) + (f.hp | 0)) | 0;
    h = (Math.imul(h, 31) + (f.facing | 0)) | 0;
    h = (Math.imul(h, 31) + (f.hitstun | 0)) | 0;
    h = (Math.imul(h, 31) + (f.atkActive | 0)) | 0;
  };
  pack(s.p0);
  pack(s.p1);
  h = (Math.imul(h, 31) + (s.seed | 0)) | 0;
  return h >>> 0;
}

function stepFighter(f: FighterState, input: number, other: FighterState): void {
  if (f.hitstun > 0) {
    f.hitstun -= 1;
    f.vx = (f.vx * 3) >> 2;
  } else {
    let move = 0;
    if (input & IN_LEFT) move -= 1;
    if (input & IN_RIGHT) move += 1;
    if (move !== 0) f.facing = move > 0 ? 1 : -1;
    f.vx = move * 3;
    if ((input & IN_UP) && f.y >= GROUND_Y && f.jv === 0) {
      f.jv = -8;
    }
    if ((input & IN_ATTACK) && f.attackCd === 0 && f.atkActive === 0) {
      f.atkActive = 6;
      f.attackCd = 18;
    }
  }

  if (f.jv !== 0 || f.y < GROUND_Y) {
    f.y += f.jv;
    f.jv += 1;
    if (f.y >= GROUND_Y) {
      f.y = GROUND_Y;
      f.jv = 0;
    }
  }

  f.x = clamp(f.x + f.vx, 16, STAGE_W - 16);

  if (f.attackCd > 0) f.attackCd -= 1;
  if (f.atkActive > 0) {
    f.atkActive -= 1;
    if (f.atkActive >= 3 && f.atkActive <= 5 && other.hitstun === 0) {
      const hx = f.x + f.facing * 18;
      const dx = Math.abs(other.x - hx);
      const dy = Math.abs(other.y - f.y);
      if (dx < 22 && dy < 28) {
        other.hp = clamp(other.hp - 6, 0, 100);
        other.hitstun = 10;
        other.vx = f.facing * 5;
        other.x = clamp(other.x + f.facing * 8, 16, STAGE_W - 16);
      }
    }
  }
}

export function advance(state: GameState, inputs: FrameInputs): GameState {
  const s = cloneState(state);
  s.frame += 1;
  if (s.hitFlash > 0) s.hitFlash -= 1;

  if (s.p0.hitstun === 0 && Math.abs(s.p0.vx) < 1) {
    s.p0.facing = s.p1.x >= s.p0.x ? 1 : -1;
  }
  if (s.p1.hitstun === 0 && Math.abs(s.p1.vx) < 1) {
    s.p1.facing = s.p0.x >= s.p1.x ? 1 : -1;
  }

  stepFighter(s.p0, inputs[0] | 0, s.p1);
  stepFighter(s.p1, inputs[1] | 0, s.p0);

  if (s.p0.hitstun === 10 || s.p1.hitstun === 10) s.hitFlash = 4;
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) | 0;
  return s;
}

export function winnerOf(s: GameState): 0 | 1 | null {
  if (s.p0.hp <= 0 && s.p1.hp <= 0) return null;
  if (s.p0.hp <= 0) return 1;
  if (s.p1.hp <= 0) return 0;
  return null;
}

/** Replay from frame 0 using log (N1 acceptance). */
export function replayFromLog(
  log: InputLogEntry[],
  seed = 1,
): { state: GameState; checksum: number } {
  let s = initialState(seed);
  const byFrame = new Map<number, FrameInputs>();
  for (const e of log) byFrame.set(e.frame, e.inputs);
  const maxF = log.reduce((m, e) => Math.max(m, e.frame), 0);
  for (let f = 1; f <= maxF; f++) {
    s = advance(s, byFrame.get(f) || [0, 0]);
  }
  return { state: s, checksum: stateChecksum(s) };
}

export type RollbackStats = {
  frame: number;
  rollbacks: number;
  lastRollbackDepth: number;
  predictedFrames: number;
  confirmedRemoteFrame: number;
};

type StoredFrame = {
  local: number;
  remotePred: number;
  remoteConfirmed: number | null;
};

/**
 * Local training: local inputs instant; remote truth delayed by latencyFrames.
 * Predict hold last confirmed remote; on mismatch, rollback + resim.
 */
export class RollbackSession {
  localSeat: 0 | 1;
  latencyFrames: number;
  seed: number;
  state: GameState;
  private frames = new Map<number, StoredFrame>();
  private snapshots = new Map<number, GameState>();
  /** True remote for sim-frame F becomes known at wall sim-frame F+latency */
  private remoteTruth = new Map<number, number>();
  private lastRemoteConfirmed = 0;
  inputLog: InputLogEntry[] = [];
  stats: RollbackStats = {
    frame: 0,
    rollbacks: 0,
    lastRollbackDepth: 0,
    predictedFrames: 0,
    confirmedRemoteFrame: 0,
  };

  constructor(opts?: {
    localSeat?: 0 | 1;
    latencyFrames?: number;
    seed?: number;
  }) {
    this.localSeat = opts?.localSeat ?? 0;
    this.latencyFrames = clamp(
      opts?.latencyFrames ?? 4,
      0,
      SBF_ROLLBACK_MAX_PRED,
    );
    this.seed = opts?.seed ?? 1;
    this.state = initialState(this.seed);
    this.snapshots.set(0, cloneState(this.state));
  }

  remoteSeat(): 0 | 1 {
    return this.localSeat === 0 ? 1 : 0;
  }

  private pack(local: number, remote: number): FrameInputs {
    return this.localSeat === 0
      ? [local | 0, remote | 0]
      : [remote | 0, local | 0];
  }

  /**
   * One sim step. `remoteTrueNow` is what the remote player pressed *this* frame
   * (will be confirmed after latencyFrames).
   */
  tick(localInput: number, remoteTrueNow: number): GameState {
    const produce = this.state.frame + 1;

    // Schedule remote truth for this production frame
    this.remoteTruth.set(produce, remoteTrueNow | 0);

    // Confirm remotes whose delay has elapsed: truth for frame T is known at produce >= T+L
    // When produce === T+L, we learn remote for T
    if (this.latencyFrames === 0) {
      this.confirmRemote(produce, remoteTrueNow | 0);
    } else {
      const t = produce - this.latencyFrames;
      if (t >= 1) {
        const truth = this.remoteTruth.get(t);
        if (truth !== undefined) this.confirmRemote(t, truth);
      }
    }

    // Predict remote for `produce`
    let remotePred = this.lastRemoteConfirmed;
    const already = this.frames.get(produce);
    if (already?.remoteConfirmed !== null && already?.remoteConfirmed !== undefined) {
      remotePred = already.remoteConfirmed;
    } else if (this.latencyFrames === 0) {
      remotePred = remoteTrueNow | 0;
    } else {
      this.stats.predictedFrames += 1;
    }

    const local = localInput | 0;
    this.frames.set(produce, {
      local,
      remotePred,
      remoteConfirmed:
        this.latencyFrames === 0
          ? remoteTrueNow | 0
          : this.frames.get(produce)?.remoteConfirmed ?? null,
    });

    const stored = this.frames.get(produce)!;
    const remoteUse =
      stored.remoteConfirmed !== null ? stored.remoteConfirmed : stored.remotePred;
    const inputs = this.pack(stored.local, remoteUse);

    this.state = advance(this.state, inputs);
    this.snapshots.set(this.state.frame, cloneState(this.state));
    this.inputLog.push({
      frame: this.state.frame,
      inputs: [...inputs] as FrameInputs,
    });
    this.stats.frame = this.state.frame;
    this.prune();
    return this.state;
  }

  private confirmRemote(frame: number, truth: number): void {
    const st = this.frames.get(frame);
    this.lastRemoteConfirmed = truth;
    this.stats.confirmedRemoteFrame = frame;

    if (!st) {
      // Future frame not simmed yet — stash for when we get there
      this.frames.set(frame, {
        local: 0,
        remotePred: truth,
        remoteConfirmed: truth,
      });
      return;
    }

    st.remoteConfirmed = truth;
    if (st.remotePred === truth) return;

    // Predicted wrong → rollback from frame-1 and resim through tip
    this.rollbackFrom(frame, truth);
  }

  private rollbackFrom(frame: number, correctedRemote: number): void {
    const base = this.snapshots.get(frame - 1);
    if (!base) return;

    const tip = this.state.frame;
    this.stats.rollbacks += 1;
    this.stats.lastRollbackDepth = tip - (frame - 1);

    const st = this.frames.get(frame);
    if (st) {
      st.remotePred = correctedRemote;
      st.remoteConfirmed = correctedRemote;
    }

    let s = cloneState(base);
    for (let f = frame; f <= tip; f++) {
      const row = this.frames.get(f);
      if (!row) continue;
      // For frames after correction, keep local; remote uses confirmed or hold last
      if (f > frame && row.remoteConfirmed === null) {
        row.remotePred = this.lastRemoteConfirmed;
      }
      if (f === frame) {
        row.remotePred = correctedRemote;
        row.remoteConfirmed = correctedRemote;
      }
      const remoteUse =
        row.remoteConfirmed !== null ? row.remoteConfirmed : row.remotePred;
      const inputs = this.pack(row.local, remoteUse);
      s = advance(s, inputs);
      this.snapshots.set(f, cloneState(s));
      const li = this.inputLog.findIndex((e) => e.frame === f);
      if (li >= 0) {
        this.inputLog[li] = { frame: f, inputs: [...inputs] as FrameInputs };
      }
    }
    this.state = s;
  }

  private prune(): void {
    const keep = Math.max(0, this.state.frame - 180);
    for (const k of [...this.snapshots.keys()]) {
      if (k < keep) this.snapshots.delete(k);
    }
    for (const k of [...this.frames.keys()]) {
      if (k < keep) this.frames.delete(k);
    }
    for (const k of [...this.remoteTruth.keys()]) {
      if (k < keep) this.remoteTruth.delete(k);
    }
    if (this.inputLog.length > 900) this.inputLog = this.inputLog.slice(-900);
  }

  verifyReplay(): { ok: boolean; live: number; replay: number } {
    const live = stateChecksum(this.state);
    const { checksum } = replayFromLog(this.inputLog, this.seed);
    return { ok: live === checksum, live, replay: checksum };
  }

  reset(seed?: number): void {
    this.seed = seed ?? this.seed;
    this.state = initialState(this.seed);
    this.frames.clear();
    this.snapshots.clear();
    this.remoteTruth.clear();
    this.lastRemoteConfirmed = 0;
    this.inputLog = [];
    this.snapshots.set(0, cloneState(this.state));
    this.stats = {
      frame: 0,
      rollbacks: 0,
      lastRollbackDepth: 0,
      predictedFrames: 0,
      confirmedRemoteFrame: 0,
    };
  }
}

export function inputsFromKeys(keys: Set<string>, scheme: "p1" | "p2"): number {
  let n = 0;
  if (scheme === "p1") {
    if (keys.has("a") || keys.has("arrowleft")) n |= IN_LEFT;
    if (keys.has("d") || keys.has("arrowright")) n |= IN_RIGHT;
    if (keys.has("w") || keys.has("arrowup")) n |= IN_UP;
    if (keys.has(" ") || keys.has("j") || keys.has("z")) n |= IN_ATTACK;
  } else {
    if (keys.has("arrowleft")) n |= IN_LEFT;
    if (keys.has("arrowright")) n |= IN_RIGHT;
    if (keys.has("arrowup")) n |= IN_UP;
    if (keys.has("enter") || keys.has("/")) n |= IN_ATTACK;
  }
  return n;
}

export function dummyInput(state: GameState, seat: 0 | 1): number {
  const me = seat === 0 ? state.p0 : state.p1;
  const you = seat === 0 ? state.p1 : state.p0;
  let n = 0;
  if (you.x < me.x - 20) n |= IN_LEFT;
  else if (you.x > me.x + 20) n |= IN_RIGHT;
  if (Math.abs(you.x - me.x) < 40 && state.frame % 23 === 0) n |= IN_ATTACK;
  if (state.frame % 90 === 0) n |= IN_UP;
  return n;
}
