# Terraform language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that Terraform semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `terraform`
- Command: `terraform-ls serve`
- File extensions: `.tf .tfvars`
- Language id: `terraform`

## Availability and optional installation

- **macOS:** `brew install hashicorp/tap/terraform-ls`
- **Linux:** download a release from https://github.com/hashicorp/terraform-ls/releases and place `terraform-ls` on PATH (or `apt`/`dnf` via the HashiCorp repo)
- **Windows:** `choco install terraform-ls` (or download a release zip)

`terraform-ls` requires the `terraform` binary itself to be installed and on PATH.

Confirm both resolve:

```bash
command -v terraform-ls
command -v terraform
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "terraform": {
      "command": "terraform-ls",
      "args": [
        "serve"
      ],
      "fileExtensions": {
        ".tf .tfvars": "terraform"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for Terraform.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `terraform-ls` AND `terraform` both on PATH; reopen shell after install.
- **No provider completion:** run `terraform init` so the `.terraform/` schema cache exists.
- **`.tfvars` not analyzed:** open the containing module so the server has root context.

## Semantic proof
