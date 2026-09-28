package main

import (
	"bytes"
	"testing"
)

func TestEmbeddedSkill(t *testing.T) {
	if !bytes.HasPrefix(skill, []byte("---\nname: golden-rules\n")) {
		t.Fatal("SKILL.md must start with frontmatter name: golden-rules")
	}
	if !bytes.Contains(skill, []byte("18. **Graph builds")) {
		t.Fatal("SKILL.md is missing rules")
	}
}
