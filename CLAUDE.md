# CLAUDE.md

## Project Overview

**The Whisker Shogunate** is an idle/life-sim game set in Neko-kuni, a feudal Japan-inspired world built by and for cats. Players control isekai'd cats who arrive via the Great Torii Gate and build new lives in a society powered by Whisker-Punk technology.

- **Genre**: Idle/life-sim with deep world-building
- **Setting**: Feudal Japan + Ghibli-inspired steampunk
- **Theme**: Second chances, finding purpose, transformation
- **Tone**: Cozy but meaningful, hopeful but earned

**Core question for all features**: "How does this help the player's cat find peace, purpose, and identity?"

## Lore Server (Source of Truth)

All world-building content lives in the lore database (188 entries). **Always use MCP tools to access lore.**

**Prerequisites**: Ollama running with `nomic-embed-text` model.

### Tools

| Tool | Purpose |
|------|---------|
| `search_lore(query, category?, limit?)` | Semantic search |
| `get_entry(id)` | Fetch single entry |
| `list_entries(category?)` | Browse entries |
| `list_categories()` | List categories |
| `create_entry(...)` | Add new lore |
| `update_entry(...)` | Edit lore |
| `export_markdown(category?)` | Export for sharing |

**Categories**: architecture, characters, cuisine, culture, factions, flora, general, history, locations, politics, professions, society, technology, world

### Workflow

1. **Search first** before creating entries
2. **Brainstorming → DB**: All developed lore must be added to database

**Technical**: `lore-server/` dir, LanceDB, config in `.claude/mcp.json`

## Critical World Rules

These rules are non-negotiable for consistency:

- **No mammal meat** (strong cultural taboo)
- **No toxic foods** (grapes, onions, chocolate don't exist)
- **Fish is primary protein, rice is staple grain**
- **Whisker-Punk aesthetic**: All technology visible, ornate, cat-scaled. No hidden machinery.
- **Warm color palette**: Natural woods, brass/copper/bronze, soft lighting
- **Magical realism**: Some things have no explanation (the Veil, transformation, Great Torii origins). Don't explain them.

## Tone Guidelines

**Ghibli inspiration**: Howl's Moving Castle (mechanisms), Totoro (community), Kiki (growth), Spirited Away (workplace/found family)

- Cozy but not saccharine
- Hopeful but realistic (earned happiness)
- No clear villains—only complex characters
- Quiet moments matter
- Work is dignity, food is culture

## Content to Avoid

- Violence (conflicts via mediation/social pressure)
- Explicit villainy
- Punishment mechanics (welcome players back)
- Grim/dark content
- Breaking food taboos
- Simplistic solutions

## Design Principles

- **Player agency**: Multiple valid paths, no "best" choice
- **No punishment for breaks**: Idle = progress continues
- **Transformation struggle**: Progress = personal growth, not just grinding
