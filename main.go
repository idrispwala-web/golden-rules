// golden-rules installs the /golden-rules skill for Claude Code plus the
// plugins, CLIs, skills and MCP server the rules depend on.
// It only runs local commands (claude plugin/mcp, npm, pip); no model calls.
package main

import (
	_ "embed"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

//go:embed skills/golden-rules/SKILL.md
var skill []byte

var version = "dev"

type plugin struct{ id, marketplace string }

var plugins = []plugin{
	{"superpowers@superpowers-marketplace", "obra/superpowers-marketplace"},
	{"caveman@caveman", "JuliusBrussee/caveman"},
	{"ponytail@ponytail", "DietrichGebert/ponytail"},
	{"andrej-karpathy-skills@karpathy-skills", "forrestchang/andrej-karpathy-skills"},
}

const agentBrowserSkill = "https://raw.githubusercontent.com/vercel-labs/agent-browser/main/skills/agent-browser/SKILL.md"

var (
	dryRun bool
	failed []string
)

func main() {
	flag.BoolVar(&dryRun, "dry-run", false, "print what would run, change nothing")
	showVersion := flag.Bool("version", false, "print version")
	flag.Parse()
	if *showVersion {
		fmt.Println(version)
		return
	}

	home, err := os.UserHomeDir()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	skills := filepath.Join(home, ".claude", "skills")

	step("golden-rules skill", func() error {
		return writeFile(filepath.Join(skills, "golden-rules", "SKILL.md"), skill)
	})

	if need("claude", "Claude Code (https://claude.com/claude-code)") {
		installed := installedPlugins()
		added := map[string]bool{}
		for _, p := range plugins {
			if installed[p.id] {
				fmt.Println("ok   ", p.id)
				continue
			}
			step(p.id, func() error {
				if !added[p.marketplace] {
					added[p.marketplace] = true
					if err := run("claude", "plugin", "marketplace", "add", p.marketplace); err != nil {
						return err
					}
				}
				return run("claude", "plugin", "install", p.id)
			})
		}
		if exec.Command("claude", "mcp", "get", "context7").Run() == nil {
			fmt.Println("ok    context7 MCP")
		} else {
			step("context7 MCP", func() error {
				return run("claude", "mcp", "add", "--scope", "user", "--transport", "http", "context7", "https://mcp.context7.com/mcp")
			})
		}
	}

	if need("npm", "Node.js (https://nodejs.org)") {
		npmTool("graft", "@nanonets/graft")
		if npmTool("agent-browser", "agent-browser") {
			step("agent-browser browser", func() error { return run("agent-browser", "install") })
		}
	}
	if _, err := os.Stat(filepath.Join(skills, "agent-browser", "SKILL.md")); err == nil {
		fmt.Println("ok    agent-browser skill")
	} else {
		step("agent-browser skill", func() error {
			return download(agentBrowserSkill, filepath.Join(skills, "agent-browser", "SKILL.md"))
		})
	}

	graphify()

	if len(failed) > 0 {
		fmt.Printf("\nfailed: %v\nfix the lines above and re-run golden-rules (safe to repeat)\n", failed)
		os.Exit(1)
	}
	fmt.Println("\ndone. restart Claude Code, then type /golden-rules")
}

// graphify ships as a Python package; its own `graphify install` copies the skill.
func graphify() {
	if _, err := exec.LookPath("graphify"); err != nil {
		step("graphify CLI", func() error {
			switch {
			case has("uv"):
				return run("uv", "tool", "install", "graphifyy")
			case has("pipx"):
				return run("pipx", "install", "graphifyy")
			case has("python3"):
				return run("python3", "-m", "pip", "install", "--user", "graphifyy")
			case has("python"):
				return run("python", "-m", "pip", "install", "--user", "graphifyy")
			}
			return fmt.Errorf("needs uv, pipx or Python 3 (https://docs.astral.sh/uv)")
		})
	}
	platform := "claude"
	if runtime.GOOS == "windows" {
		platform = "windows"
	}
	step("graphify skill", func() error { return run("graphify", "install", "--platform", platform) })
}

// npmTool installs a global npm package when its binary is missing.
// Returns true when it installed something.
func npmTool(bin, pkg string) bool {
	if has(bin) {
		fmt.Println("ok   ", bin)
		return false
	}
	ok := step(bin, func() error { return run("npm", "install", "-g", pkg) })
	return ok && !dryRun
}

func installedPlugins() map[string]bool {
	set := map[string]bool{}
	out, err := exec.Command("claude", "plugin", "list", "--json").Output()
	if err != nil {
		return set
	}
	var list []struct{ ID string }
	if json.Unmarshal(out, &list) == nil {
		for _, p := range list {
			set[p.ID] = true
		}
	}
	return set
}

func step(name string, fn func() error) bool {
	fmt.Println("==>  ", name)
	if err := fn(); err != nil {
		fmt.Fprintf(os.Stderr, "FAIL  %s: %v\n", name, err)
		failed = append(failed, name)
		return false
	}
	return true
}

func need(bin, hint string) bool {
	if has(bin) {
		return true
	}
	fmt.Fprintf(os.Stderr, "FAIL  %s not found, install %s and re-run\n", bin, hint)
	failed = append(failed, bin)
	return false
}

func has(bin string) bool {
	_, err := exec.LookPath(bin)
	return err == nil
}

func run(name string, args ...string) error {
	fmt.Println("      $", name, args)
	if dryRun {
		return nil
	}
	cmd := exec.Command(name, args...)
	cmd.Stdout, cmd.Stderr, cmd.Stdin = os.Stdout, os.Stderr, os.Stdin
	return cmd.Run()
}

func writeFile(path string, data []byte) error {
	fmt.Println("      write", path)
	if dryRun {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

func download(url, path string) error {
	fmt.Println("      get", url)
	if dryRun {
		return nil
	}
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("%s: %s", url, resp.Status)
	}
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	return writeFile(path, data)
}
