{{- $p := .Site.Data.portfolio.profile -}}
{{- $d := .Site.Data.portfolio -}}
# {{ $p.name }}
**Backend Developer** · {{ $p.location }}
{{ $p.email }} · {{ $p.github }} · {{ $p.linkedin }}

---

## Summary

{{ $p.bio }}

---

## Skills

{{ delimit $p.skills " · " }}

---

## Experience
{{ range $d.experience }}
### {{ .role }} — {{ .company }}
*{{ .period }}*
{{ range .details }}
- {{ . }}
{{- end }}
{{ end }}
---

## Projects
{{ range $d.projects }}
### {{ .name }} [{{ .tech }}]
{{ .description }}{{ with .github }}
GitHub: {{ . }}{{ end }}
{{ end }}
