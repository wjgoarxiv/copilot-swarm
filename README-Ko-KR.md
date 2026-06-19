<p align="center"><img src="./cover.png" width="100%" /></p>

<h1 align="center">copilot-swarm</h1>
<p align="center">
  <em>GitHub Copilot CLI 네이티브 — 병렬 작업 위임과 증거 기반 계획 &rarr; 실행 &rarr; 리뷰 워크플로우.</em>
</p>
<p align="center">
  <a href="#빠른-시작">빠른 시작</a> ·
  <a href="#기능">기능</a> ·
  <a href="#사용법">사용법</a> ·
  <a href="#동작-원리">동작 원리</a> ·
  <a href="./README.md">English</a>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue" />
  <img src="https://img.shields.io/badge/node-%3E%3D20-green" />
  <img src="https://img.shields.io/badge/GitHub%20Copilot%20CLI-plugin-7C3AED" />
  <img src="https://img.shields.io/badge/runtime%20deps-0-success" />
</p>

---

> [!NOTE]
> CSW는 `copilot`을 **swarm**(독립 작업을 병렬 실행)으로 만들고, "완료"를 단언이 아니라
> **증거 기반 oracle**로 판정하는 계획 → 실행 → 리뷰 루프로 감쌉니다. Copilot CLI의 네이티브
> 확장 표면(플러그인 매니페스트·스킬·커스텀 에이전트·훅·MCP)만으로 구현되며 **런타임 의존성 0개**입니다.

## 기능

- **Swarm dispatch (MCP)** — Copilot CLI엔 모델이 호출 가능한 subagent-spawn이 없어서, CSW가
  의존성 0의 MCP 서버로 병렬 `copilot -p` 워커를 오케스트레이션합니다: `dispatch`, `code_search`,
  `research`. 동시성 제한·워커별 타임아웃·실패 격리·재귀 가드 포함.
- **워커 로스터** — 6개 전문 에이전트: `explorer`, `researcher`, `planner`, `gap-analyst`,
  `plan-reviewer`, `verifier`.
- **증거 기반 goal runtime** — 기계 판독 성공 기준(`C0NN | channel: | test: | scenario:`),
  모든 기준이 *증거와 함께* pass + 미해결 blocker 0일 때만 통과하는 완료 oracle, gate 약화를 거부하는
  steering 가드, `.csw/` 아래 append-only ledger.
- **워크플로우 스킬** — `swarm`, `csw-plan`(explore-우선 + 승인 게이트), `csw-work`(규율 실행),
  `csw-review`(멀티레인 all-or-nothing).
- **훅** — 세션 독트린 주입, steering 감사, AI-slop 주석 점검, 완료까지 속행시키는 continuation 게이트.
- **HUD** — 활성 goal의 기준 진행/blocker를 보여주는 상태줄.
- **설치 UX** — 배너·테마·status/install/doctor를 갖춘 `csw` CLI.

## 빠른 시작

> [!TIP]
> [GitHub Copilot CLI](https://docs.github.com/copilot/how-tos/copilot-cli)와 Node.js >= 20이 필요합니다.

```sh
npm install -g copilot-swarm    # (publish 이후) — 또는 아래 "소스에서 설치"
csw install --permission-profile safe  # 최소 권한 MCP 도구로 플러그인 등록
csw status                      # 확인
copilot                         # 세션 시작 — CSW 활성화됨
```

publish 이후 원샷 설치:

```sh
npx --yes copilot-swarm@0.1.1 install --permission-profile safe
npx --yes copilot-swarm@0.1.1 install --dry-run --permission-profile balanced
```

권한 프로필은 기존 사용자 OpenCode/Copilot 권한 설정을 덮어쓰지 않고 CSW가
생성하는 MCP 설정과 worker 플래그에만 적용됩니다. `safe`는 read-mostly,
`balanced`는 권장 동작, `none`은 권한 프로필 설정 없이 파일만 설치,
`full`은 `--allow-all-tools` 기반의 넓은 worker 권한을 명시적으로 허용할 때만
사용하세요. 자세한 내용은 [`docs/permission-profiles.md`](docs/permission-profiles.md)를 참고하세요.

### 소스에서 설치 (npm publish 이전)

```sh
git clone https://github.com/wjgoarxiv/copilot-swarm.git && cd copilot-swarm
npm pack                                    # copilot-swarm-0.1.1.tgz 생성
npm install -g ./copilot-swarm-0.1.1.tgz    # clean copy (`npm i -g .` 는 dev 트리를 심링크하므로 비권장)
csw install --dry-run --permission-profile safe
csw install --permission-profile safe
```

## 사용법

`copilot` 세션 안에서:

- **루프 실행** — **`csw`** 라고 입력(단독, 또는 `csw <작업>`)하면 풀 증거 기반 루프(`csw-loop`)가
  시작됩니다: goal 바인딩 → 필요 시 계획 → test-first 실행 → 실제 수동 QA → 리뷰 → 완료 oracle 통과까지.
  (명시적 형태: `/copilot-swarm:csw-loop`)
- **병렬화** — 그냥 부탁: *"auth / 세션저장 / 레이트리밋 위치를 병렬로 조사해줘"*. CSW가 read-only
  워커를 띄우고, 당신은 결과를 회의적으로 통합합니다.
- **계획** — `/copilot-swarm:csw-plan`: explore 우선 조사 → 진짜 미지수만 인터뷰 → **승인 게이트**에서
  멈춤 → decision-complete 계획 1건 작성.
- **실행** — `/copilot-swarm:csw-work`: 각 작업을 test-first + 실제 수동 QA로 진행, goal runtime의
  oracle이 통과해야만 완료.
- **리뷰** — `/copilot-swarm:csw-review`: compliance / quality / real-QA / scope 레인을 병렬 실행,
  all-or-nothing 게이트.
- **워커 지정** — `@copilot-swarm:explorer` 처럼 특정 에이전트에 위임.

HUD 상태줄 켜기:

```sh
csw hud      # ~/.copilot/settings.json 에 추가할 스니펫 출력
```

## 동작 원리

| 기능 | Copilot CLI 표면 |
|---|---|
| 병렬 위임 | CSW dispatch MCP (병렬 `copilot -p` 워커) |
| 워커 로스터 | `agents/*.agent.md` (`copilot-swarm:*` 네임스페이스) |
| 항상-적용 독트린 | `sessionStart` 훅의 `additionalContext` 주입 |
| goal 상태 / oracle | 자체 관리 `.csw/` (JSON 상태 + JSONL ledger) |
| continuation | `agentStop` / `subagentStop` 훅 (force-continue) |
| steering / 주석 | `userPromptSubmitted` / `postToolUse` 훅 |
| HUD | Copilot `statusLine` |

port / keep-native / skip 결정은 [`docs/supporting-components.md`](docs/supporting-components.md)
참고 (예: LSP는 네이티브 유지).
설치 시 권한 프로필과 MCP/tool 영향은 [`docs/permission-profiles.md`](docs/permission-profiles.md)를 참고하세요.

## 개발

```sh
npm test            # 단위 + e2e 테스트
npm run scan        # 금지어 cleanliness 스캔 (전 표면)
npm run release:check
npm run pack:dry-run
python3 generate_cover.py   # 커버 이미지 재생성
```

## 라이선스

MIT — [LICENSE](LICENSE). 텔레메트리·콜홈 없음.
