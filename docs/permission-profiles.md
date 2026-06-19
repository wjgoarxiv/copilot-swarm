# CSW permission profiles

`csw install` can generate a profile-specific MCP configuration in the clean
package copy passed to `copilot plugin install`. It does **not** overwrite existing
user OpenCode/Copilot permission settings.

Profiles use only Copilot CLI controls already exercised by CSW:

| Profile | MCP tools exposed | Worker permission flags |
|---|---|---|
| `safe` | `code_search`, `research` | `--deny-tool write` |
| `balanced` | `dispatch`, `code_search`, `research` | no broad grant; Copilot may ask interactively |
| `full` | `dispatch`, `code_search`, `research` | `--allow-all-tools` for default dispatch workers |
| `none` | packaged default | no generated CSW permission profile |

`code_search` and `research` remain read-only/research modes and continue to add
`--deny-tool write` even if `full` is selected.

`custom` is reserved for a future schema-backed implementation. It is not accepted
by the installer.

Examples:

```sh
npx --yes copilot-swarm@0.1.1 install --permission-profile safe
npx --yes copilot-swarm@0.1.1 install --dry-run --permission-profile balanced
CSW_PERMISSION_PROFILE=safe csw install
```

Use `full` only when you trust worker prompts and repository state:

```sh
npx --yes copilot-swarm@0.1.1 install --permission-profile full
```
