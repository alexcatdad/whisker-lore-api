# Procedural Generation Quick Reference

## Forbidden Content (Never Include)

### Foods
- onion, garlic, grape, raisin, chocolate, tomato, xylitol

### Plants
- lily of the valley, easter lily, tiger lily, oleander, foxglove, nightshade

### Words
- toxic, poisonous, deadly, lethal, evil, villain, corruption

### Cultural
- beef, pork, lamb, mammal meat, murder, killing

---

## The Five Provinces

| Key | Japanese | English | Theme |
|-----|----------|---------|-------|
| `higashi-hama` | Higashi-hama | East Shore | Coastal, newcomers |
| `kawa-no-kuni` | Kawa-no-kuni | River Country | Agricultural |
| `yama-takumi` | Yama-takumi | Mountain Forge | Industrial |
| `mori-shizuka` | Mori-shizuka | Silent Forest | Spiritual, medical |
| `minato-kassei` | Minato-kassei | Thriving Port | Trade, commerce |

---

## The Seven Guilds

| Key | Name | Domain |
|-----|------|--------|
| `engineer` | Engineer's Guild | Technology |
| `merchant` | Merchant's Guild | Trade |
| `healer` | Healer's Guild | Medicine |
| `farmer` | Farmer's Collective | Agriculture |
| `artisan` | Artisan's Union | Crafts |
| `scholar` | Scholar's Circle | Knowledge |
| `performance` | Performance Guild | Entertainment |

---

## Rarity Distribution

```
Common:    60%  "A common sight in..."
Uncommon:  25%  "An occasionally encountered..."
Rare:      12%  "A rare find in..."
Legendary:  3%  "A legendary species..."
```

---

## Japanese Naming

### Pattern
```
{Prefix}-{Root}-{Suffix} ({English Translation})
```

### Common Suffixes
| Suffix | Meaning | Use For |
|--------|---------|---------|
| -Sou | Herb | Small plants |
| -Kusa | Grass | Grasses |
| -Hana/-Bana | Flower | Flowering |
| -Take | Bamboo | Bamboo-like |
| -Kinoko | Mushroom | Fungi |
| -No_ki | Tree | Trees |
| -Shida | Fern | Ferns |
| -Ran | Orchid | Orchids |
| -Mo | Seaweed | Aquatic |
| -Koke | Moss | Mosses |
| -Tsuta | Vine | Vines |

### Common Prefixes
| Prefix | Meaning |
|--------|---------|
| Hikari- | Light |
| Yama- | Mountain |
| Kawa- | River |
| Mori- | Forest |
| Tsuki- | Moon |
| Hoshi- | Star |
| Yuki- | Snow |
| Haru- | Spring |
| Ao- | Blue |
| Aka- | Red |
| Shiro- | White |

---

## Scripts

```bash
# Generate flora
bun run generate-flora

# Validate content
bun run validate
bun run validate:flora

# Fix duplicates (dry run first!)
bun src/maintenance/deduplicate.ts --dry-run
bun src/maintenance/deduplicate.ts
```

---

## Checklist Before Generation

- [ ] Ollama running with `nomic-embed-text`
- [ ] Database backed up
- [ ] Target count defined
- [ ] Checkpoint system working
- [ ] Name registry initialized

## Checklist After Generation

- [ ] Run validation script
- [ ] Check for duplicates
- [ ] Sample 20 random entries
- [ ] Verify province distribution
- [ ] Verify rarity distribution
- [ ] Test website loads entries

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Grammar: "is requires" | Use complete phrases |
| Type mismatch: "Orchid is grain" | Match suffix to subcategory |
| Duplicates | Use centralized name registry |
| Memory crash | Process in smaller batches |
| Explains glow mechanism | Never explain HOW magic works |
