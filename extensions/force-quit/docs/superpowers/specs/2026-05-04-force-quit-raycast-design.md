# Force Quit — Raycast Extension Design

- Author: 2dubu (owen.lee@daangn.com)
- Date: 2026-05-04
- Status: Draft → for plan

## 1. Goal

macOS의 "응용 프로그램 강제 종료(⌥⌘⎋)" 창과 동일한 사용자 경험을 Raycast 안에서 제공한다. 사용자는 Raycast에서 명령어 한 번으로 실행 중인 앱(또는 임의의 프로세스) 목록을 보고, 선택해서 즉시 강종할 수 있어야 한다.

배포 목표: Raycast Store(`raycast/extensions` 모노레포)에 PR로 제출하여 머지.

## 2. Non-goals

명시적으로 MVP에서 제외하는 것:

- 자동 폴링 / 실시간 갱신 (수동 새로고침만 제공)
- Finder/SystemUIServer 등 보호 앱 특별 처리
- 강종 실패 시 재시도 UI / 단계적 종료(SIGTERM → SIGKILL)
- 멀티 선택 / 그룹 종료
- 종료 히스토리, 통계, 즐겨찾기
- 사용자 설정(preferences)

## 3. Extension metadata

| 항목 | 값 |
|---|---|
| Display name | Force Quit |
| Package name | `force-quit` |
| Author | `2dubu` |
| GitHub repo (fork target) | `2dubu/extensions` |
| License | MIT |
| Categories | `System`, `Productivity` |
| Preferences | 없음 |
| Network/file access | 없음 |
| Icon | 1024×1024 PNG, light/dark 모두 (`assets/extension-icon.png`) |
| Store screenshots | 5장 × 2000×1250 PNG, **사용자가 직접 제공** → `metadata/force-quit-{1..5}.png` |

## 4. Commands

### 4.1 `Force Quit Application` (id: `index`)

- Title: "Force Quit"
- Subtitle: "Quit running applications"
- Mode: `view` (List)
- 표시 대상: GUI 앱 (Cmd+Tab과 macOS 강제 종료 창의 합집합과 유사한 범위)
- 데이터 소스:
  - AppleScript via `System Events`로 `every application process whose background only is false`
  - 각 항목의 `name`, `unix id`(PID), `POSIX path of (file of p)`(bundle path) 추출
- 메모리: PID 묶음으로 `ps -o pid=,rss= -p <pid1>,<pid2>,...` 한 번 호출 → RSS(KB) → MB로 환산
- 정렬: 메모리 내림차순
- 아이템 표시:
  - `icon: { fileIcon: bundlePath }` (네이티브 앱 아이콘)
  - `title: name`
  - `accessories: [{ text: "1,243 MB" }]` (천 단위 콤마)

### 4.2 `Force Quit Process` (id: `process`)

- Title: "Force Quit Process"
- Subtitle: "Quit any running process"
- Mode: `view` (List)
- 표시 대상: 모든 사용자/시스템 프로세스 (커널 스레드 제외)
- 데이터 소스: `ps -axo pid=,rss=,comm=` 한 번 호출
- 필터: `rss > 0` 인 항목만
- 정렬: RSS 내림차순
- 아이템 표시:
  - `icon: Icon.Terminal` (모든 항목 동일 — GUI 매칭 업그레이드는 MVP 범위 밖)
  - `title: comm`
  - `subtitle: "PID <pid>"`
  - `accessories: [{ text: "<rss> MB" }]`

## 5. Interaction

### 5.1 Action panel (두 명령 공통)

- Primary (Enter): "Force Quit"
  - `Alert.confirm("Force quit <name>?", "This will immediately terminate the application.")`
  - confirm → `process.kill(pid, "SIGKILL")`
  - 성공: `showHUD("✓ <name> force quit")` → `revalidate()`
  - 실패: `showHUD("✗ Failed to quit <name>")` (간단)
  - cancel: no-op
- Secondary (`Cmd+R`): "Refresh List" — 수동 revalidate
- Secondary (`Cmd+.`): "Copy Process Info" — `<name> (PID <pid>)` 형식 문자열을 클립보드에 복사 (디버깅용)

### 5.2 빈 상태

`<List.EmptyView title="No applications running" />` (사실상 발생 안 하지만 안전장치)

### 5.3 검색

Raycast `List`의 기본 `searchBarPlaceholder`로 title/subtitle 자동 필터링.

## 6. Architecture

### 6.1 파일 구조

```
force-quit/
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
├── .eslintrc.json
├── assets/
│   └── extension-icon.png
├── metadata/                        # 사용자 제공
│   ├── force-quit-1.png
│   ├── force-quit-2.png
│   ├── force-quit-3.png
│   ├── force-quit-4.png
│   └── force-quit-5.png
└── src/
    ├── index.tsx                    # Force Quit Application
    ├── process.tsx                  # Force Quit Process
    ├── lib/
    │   ├── apps.ts                  # fetchRunningApps()
    │   ├── processes.ts             # fetchAllProcesses()
    │   ├── kill.ts                  # killByPid(pid, name)
    │   └── format.ts                # formatMemoryMB(rssKB), etc.
    └── types.ts                     # RunningApp, RunningProcess
```

### 6.2 모듈 경계

- `lib/apps.ts`, `lib/processes.ts`: Raycast/React 의존성 없는 순수 데이터 fetch 모듈. shell + AppleScript만 사용.
- `lib/kill.ts`: SIGKILL + Raycast `Alert`/`showHUD` 사이드 이펙트 묶음.
- `lib/format.ts`: 단순 포맷팅 유틸.
- `index.tsx`, `process.tsx`: 얇은 List 컴포넌트, 비즈니스 로직 없음.

이 분리 덕분에 `lib/*`는 단위 테스트가 가능하지만, MVP에서는 자동 테스트를 작성하지 않는다(섹션 8 참고).

### 6.3 데이터 흐름 (Force Quit Application)

```
[익스텐션 진입]
  ↓
useCachedPromise(fetchRunningApps)
  ↓
fetchRunningApps():
  1. osascript로 GUI 앱 목록 → [{name, pid, bundlePath}]
  2. PID 묶어서 ps 호출 → Map<pid, rssKB>
  3. merge → [{name, pid, bundlePath, memoryMB}]
  4. memoryMB DESC 정렬
  ↓
List 렌더 (캐시 즉시 표시 + isLoading 인디케이터)
```

`useCachedPromise`로 직전 결과를 즉시 표시 후 백그라운드 갱신.

### 6.4 강종 흐름

```
[Enter]
  ↓
Alert.confirm(...)
  ↓ confirm
process.kill(pid, "SIGKILL")
  ↓
try/catch:
  성공 → showHUD("✓ ...") → revalidate()
  실패 → showHUD("✗ ...")
```

`EPERM`(권한 부족 — root 프로세스 등), `ESRCH`(이미 죽은 프로세스)는 catch에서 동일하게 HUD 표시.

## 7. Key implementation notes

### 7.1 AppleScript 호출

```applescript
tell application "System Events"
  set appList to every application process whose background only is false
  set output to ""
  repeat with p in appList
    set output to output & (name of p) & "|" & (unix id of p) & "|" & (POSIX path of (file of p)) & linefeed
  end repeat
  return output
end tell
```

- `child_process.execFile("osascript", ["-e", script])`
- 결과를 줄 단위로 split, `|` 기준 파싱
- 빈 줄 무시

### 7.2 ps 묶음 호출

```bash
ps -o pid=,rss= -p 123,456,789
```

- `=` suffix로 헤더 제거
- 결과를 줄 단위로 파싱해 `Map<number, number>` 구성
- KB → MB 환산: `Math.round(rssKB / 1024)`

### 7.3 SIGKILL

```ts
process.kill(pid, "SIGKILL");
```

- Node 표준 API. 실패 시 throws → catch에서 HUD.
- 추가 패키지/네이티브 바이너리 없음.

### 7.4 캐시 키

- `useCachedPromise`의 cache key는 명령별로 분리 (`"running-apps"`, `"all-processes"`)

## 8. Validation

### 8.1 자동 테스트

작성하지 않는다. 이유:
- 코드의 핵심 로직이 외부 셸/AppleScript 출력 파싱이라 mock 비용 대비 효용 낮음
- Raycast 익스텐션 생태계 관행상 수동 검증 위주

### 8.2 수동 검증 체크리스트

기능:
- [ ] Force Quit Application — Chrome/Slack 등 일반 앱 정상 종료
- [ ] 메모리 정렬이 Activity Monitor와 대체로 일치
- [ ] 모든 항목에 네이티브 아이콘 표시
- [ ] Enter → confirm → SIGKILL → HUD 흐름 정상
- [ ] Cancel 시 종료되지 않음
- [ ] `Cmd+R` 새로고침 동작
- [ ] Force Quit Process — 백그라운드 데몬도 표시
- [ ] 이미 죽은 PID 종료 시도 — 익스텐션 죽지 않고 HUD 표시
- [ ] root 프로세스 종료 시도 — `EPERM` HUD 표시

코드 품질:
- [ ] `npm run lint` 통과
- [ ] `npm run build` 성공
- [ ] TypeScript strict, `any` 없음
- [ ] `lib/*` 모듈은 React/Raycast 의존성 없음

Store 자산:
- [ ] `assets/extension-icon.png` 1024×1024
- [ ] `metadata/*.png` 5장 (사용자 제공)
- [ ] README — 기능 + 두 명령 설명 + GIF 1개
- [ ] CHANGELOG — `## [Initial Version] - {PR_MERGE_DATE}`

## 9. Submission process

```bash
npm run publish
```

Raycast CLI가:
1. `raycast/extensions` 레포를 `2dubu` 계정으로 fork
2. 브랜치 생성, `extensions/force-quit/`에 복사
3. 커밋, push, PR 자동 생성

커밋 메시지: `Add force-quit extension` (Raycast 표준 형식).

**제약**: 모든 커밋에 `Co-Authored-By: Claude` trailer를 추가하지 않는다 (사용자 영구 정책).

리뷰 대응:
- Raycast 팀 리뷰 — 통상 며칠~1주 소요
- 피드백은 같은 PR에 추가 커밋
- 머지 시 1~2시간 내 Store 노출

## 10. Risks

| 위험 | 가능성 | 대응 |
|---|---|---|
| AppleScript Automation 권한 거부 | 낮음 | Raycast가 권한 보유, 추가 프롬프트 없음 |
| `process.kill` EPERM | 중 | catch → HUD, 익스텐션 정상 유지 |
| 100+ 프로세스 렌더링 성능 | 낮음 | Raycast List는 가상 스크롤 |
| Raycast 리뷰 reject | 중 | 흔한 사유는 스크린샷/README 품질 → 보강 후 재푸시 |

## 11. Open questions

- 없음 (브레인스토밍에서 모두 해소). 추가 결정사항이 생기면 plan 단계에서 보강.
