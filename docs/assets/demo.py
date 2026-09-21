# Generates docs/assets/demo.svg: a looping terminal recording as pure SVG+CSS.
W, H = 680, 336; LH = 19; X0 = 22; Y0 = 46; FS = 13; CW = 7.85  # char width at 13px JetBrains Mono
BG = "#10151C"; FRAME = "#222B36"; INK = "#E6EDF3"; DIM = "#8B98A5"; TEAL = "#2EC4B6"; AMBER = "#F5A524"
LOOP = 26.0
# (kind, text, start_s) kind: cmd (typed), out (fades), agent (fades, teal prefix), user (typed, dim prompt)
script = [
  ("cmd",   "wb", 0.6),
  ("out",   "pulling ~/workbench, launching claude", 1.6),
  ("agent", "Read INDEX.md. 3 active, 1 idle. inbox/ has 1 note.", 3.0),
  ("agent", "spades-scoring.md looks like it belongs to spades-game. Fold it in?", 4.2),
  ("user",  "yes", 6.0),
  ("agent", "Appended to entries/spades-game/log.md and deleted the note.", 7.2),
  ("agent", "wb-stale: recipe-box has been idle 112 days. Promote, park, or keep?", 8.6),
  ("user",  "park it, no time this year", 10.6),
  ("agent", "wb-set recipe-box cold \"No time this year\"", 12.6),
  ("user",  "/exit", 14.6),
  ("post",  "wb-post  log spades-game: Folded scoring note into open questions.", 16.4),
  ("post",  "wb-post  INDEX.md updated", 17.6),
  ("post",  "wb-post  committed wb(root): session 2026-09-20", 18.6),
  ("done",  "3 active, 2 cold. Nothing left to do by hand.", 20.4),
]
def pct(t): return f"{t/LOOP*100:.4f}%"
css = ["text{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;white-space:pre}",
       "@keyframes bl{0%,49.9%{opacity:1}50%,100%{opacity:0}}"]
body = []
y = Y0
for i, (kind, text, t) in enumerate(script):
    cls = f"c{i}"
    if kind in ("cmd", "user"):
        prefix = "$ " if kind == "cmd" else "› "
        pcolor = TEAL if kind == "cmd" else DIM
        n = len(text); dur = max(0.35, n * 0.06); w = n * CW
        # reveal via a clip rect that widens in character steps
        css.append(f"@keyframes k{i}{{0%{{width:0}}{pct(t)}{{width:0;animation-timing-function:steps({n},end)}}{pct(t+dur)}{{width:{w:.2f}px}}100%{{width:{w:.2f}px}}}}")
        css.append(f".{cls}{{animation:k{i} {LOOP}s linear infinite}}")
        css.append(f"@keyframes p{i}{{0%{{opacity:0}}{pct(max(0,t-0.4))}{{opacity:0}}{pct(max(0,t-0.39))}{{opacity:1}}100%{{opacity:1}}}}")
        css.append(f".p{i}{{animation:p{i} {LOOP}s linear infinite}}")
        px = X0 + 2 * CW
        body.append(f'<g class="p{i}"><text x="{X0}" y="{y}" font-size="{FS}" fill="{pcolor}">{prefix}</text>'
                    f'<clipPath id="cp{i}"><rect class="{cls}" x="{px}" y="{y-14}" height="{LH}" width="0"/></clipPath>'
                    f'<text x="{px}" y="{y}" font-size="{FS}" fill="{INK}" clip-path="url(#cp{i})">{text}</text></g>')
    else:
        color = {"out": DIM, "agent": INK, "post": INK, "done": TEAL}[kind]
        css.append(f"@keyframes k{i}{{0%{{opacity:0;transform:translateY(4px)}}{pct(t)}{{opacity:0;transform:translateY(4px);animation-timing-function:cubic-bezier(.23,1,.32,1)}}{pct(t+0.3)}{{opacity:1;transform:translateY(0)}}100%{{opacity:1;transform:translateY(0)}}}}")
        css.append(f".{cls}{{animation:k{i} {LOOP}s linear infinite}}")
        if kind == "agent":
            body.append(f'<g class="{cls}"><text x="{X0}" y="{y}" font-size="{FS}" fill="{AMBER}">●</text><text x="{X0+2*CW}" y="{y}" font-size="{FS}" fill="{color}">{text}</text></g>')
        elif kind == "post":
            body.append(f'<g class="{cls}"><text x="{X0}" y="{y}" font-size="{FS}" fill="{DIM}">{text[:8]}</text><text x="{X0+9*CW}" y="{y}" font-size="{FS}" fill="{color}">{text[9:]}</text></g>')
        else:
            body.append(f'<g class="{cls}"><text x="{X0}" y="{y}" font-size="{FS}" fill="{color}">{text}</text></g>')
    y += LH
# fade everything out at the end of the loop
css.append(f"@keyframes fade{{0%{{opacity:1}}{pct(LOOP-1.2)}{{opacity:1}}{pct(LOOP-0.3)}{{opacity:0}}100%{{opacity:0}}}}")
css.append(f".all{{animation:fade {LOOP}s linear infinite}}")
title = "jig: run wb, triage with the agent, exit, and the workbench commits itself"
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-labelledby="t d">'
       f'<title id="t">{title}</title><desc id="d">A terminal. wb launches the agent at the workbench root. The agent reads the index, folds an inbox note into an entry, parks a stale entry with wb-set, and exits. wb-post writes a log line, regenerates the index, and commits.</desc>'
       f'<style>{"".join(css)}</style>'
       f'<rect x="0.5" y="0.5" width="{W-1}" height="{H-1}" rx="10" fill="{BG}" stroke="{FRAME}"/>'
       f'<circle cx="20" cy="18" r="5" fill="#FF5F57"/><circle cx="38" cy="18" r="5" fill="#FEBC2E"/><circle cx="56" cy="18" r="5" fill="#28C840"/>'
       f'<text x="{W/2}" y="22" font-size="11" fill="{DIM}" text-anchor="middle">~/workbench</text>'
       f'<g class="all">{"".join(body)}</g></svg>\n')
import os; open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "demo.svg"), "w").write(svg)
print(len(svg), "bytes")
