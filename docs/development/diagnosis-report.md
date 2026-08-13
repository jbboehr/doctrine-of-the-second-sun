# Doctrine Image-Generation Diagnosis

No mechanical prompt compiler exists. The image model receives only the final `prompt` string and referenced images.
Doctrine priors, cultural resolution, and the distinction between material culture and atmosphere exist only in the
agent's reasoning unless the agent explicitly writes them into that string.

The initial diagnosis made no behavioral changes and generated no images. A later controlled test generated the four
images described under [Experiment results](#experiment-results). It still made no behavioral changes.

## Prompt-construction path

1. Repository instructions designate [`DOCTRINE-IMAGE-GUIDE.md`](../../DOCTRINE-IMAGE-GUIDE.md) as the visual authority
   and specify banner dimensions and paths. They do not compile prompts.
2. The image guide asks the agent to resolve culture, atmosphere, literalness, rendering mode, motifs, and constraints.
   At the time of diagnosis, its skeleton ordered source, subject, and local culture before atmosphere and rendering
   mode.
3. Codex's generic image skill then encourages `scene/backdrop -> subject -> details -> constraints`, with
   `Style/medium` and `Lighting/mood` appearing after the scene and subject in its shared schema.
4. The built-in image tool receives only:
   - the final descriptive `prompt`;
   - referenced images, when supplied.
5. There is no repository script, skill, template expander, or Codex adapter that deterministically records and compiles
   Doctrine decisions. The existing Codex adapters concern logion writing and review, not images.
6. Ten image calls found in available local Codex session history use manually authored prompt strings. They do not
   demonstrate a consistent compiler or structured decision record.

This is the largest process weakness: the guide can be correct while the model receives an incomplete or differently
weighted compression of it.

## Dry-run compiled prompts

These are exact prompts a careful Codex agent would plausibly produce by combining the Doctrine skeleton with the generic
image skill. They are representative compilations, not output from a deterministic facility.

### 1. Clearly Occidental: OSD 19:19

```text
Use case: stylized-concept
Asset type: one-logion visionary illustration

Primary request: Create a sacred historical image interpreting inherited authority becoming legitimate only after judgment of its conquest.

Source logion (verbatim): "Wash the bronze standard in the basin of black sand before bearing it through the inner court, and suffer no anthem to be played. For if the grains cling unto the eagle, the old conquest remaineth unjudged; but if they fall, raise the standard at dawn, and speak the names of the conquered dead."

Scene/backdrop: A late Roman or early Byzantine imperial court of marble, porphyry, bronze, and severe colonnades. At its center stands a broad black-sand basin before a closed processional gate. The setting is culturally Occidental and institutionally coherent.

Subject: Faceless custodians lift a wet bronze eagle standard from the basin while silent witnesses wait beneath the colonnade. Black grains either cling to or fall from the eagle under judicial light. The standard, basin, and waiting gate form the primary hierarchy; do not inventory every clause.

Style/medium: Painterly visionary illustration fused with an illuminated liturgical plate and monumental historical painting; tactile, solemn, recovered, and symbolically exact.

Composition/framing: Axial ceremonial composition with the basin and eagle as the first read, the silent witnesses second, and the gate and imperial court third. Use processional depth, large architectural framing, and substantial negative space.

Lighting/mood: Synthetic midnight gives way to an impossible Second Sun dawn. A low electric magenta-violet horizon and thin cyan orbital meridians project non-natural light through the court. The ivory-gold dawn road, chromatic reflections in wet bronze, long contrary shadows, luminous atmospheric depth, and distant geometric solar halo must govern the whole rendering as an integrated retrowave/synthwave order, not as token neon accents.

Color palette: Midnight navy, black sand, porphyry crimson, antique bronze, ivory-gold, electric cyan, restrained magenta and violet.

Materials/textures: Worn marble, wet bronze, black mineral sand, porphyry, sealed fabric, luminous glass, atmospheric dust.

Text: No readable text, inscription, title, citation, or invented script.

Constraints: Preserve a coherent late Roman or early Byzantine local material culture. The Second Sun illumination must alter depth, color, shadow, scale, and material response throughout the image. Authority must appear conditional and judicial rather than triumphalist.

Avoid: museum reconstruction, conventional period painting, costume-drama staging, Japanese local architecture, torii, kimono, anime, neon samurai, generic fantasy, arbitrary neon, vaporwave grid, cyberpunk screens, modern nationalist symbols, logos, watermark, and readable pseudo-script.
```

Resolved decisions:

- Local setting: late Roman or early Byzantine Occidental
- Fallback sampling: no
- Atmosphere: synthetic midnight becoming an electric judicial dawn
- Rendering mode: painterly visionary illustration, illuminated liturgical plate, and monumental historical painting
- Literalness: mostly direct ritual scene with symbolic hierarchy
- Project name: omitted
- Japanese or East-Asian tokens:
  - `Japanese local architecture`
  - `torii`
  - `kimono`
  - `anime`
  - `neon samurai`
- Explicit retrofuturist instructions:
  - `Synthetic midnight`
  - `impossible Second Sun dawn`
  - `electric magenta-violet horizon`
  - `cyan orbital meridians`
  - `non-natural light`
  - `ivory-gold dawn road`
  - `chromatic reflections`
  - `contrary shadows`
  - `luminous atmospheric depth`
  - `geometric solar halo`
  - `integrated retrowave/synthwave order`

This prompt demonstrates both suspected failures: Japanese vocabulary leaks through the negative list, while the
period-art rendering ontology is established before retrowave appears.

### 2. Clearly Japanese: the mountain-shrine example

The repository does not contain a logion that literally names Japan. This positive example is the clearest source-driven
Japanese case under the guide's own shrine, emperor, bell, and mountain-setting rules.

```text
Use case: stylized-concept
Asset type: one-logion visionary illustration

Primary request: Create a ceremonial image of inherited sovereignty preserved as ritual distinction rather than personality or political power.

Source logion (verbatim): "The last emperor was not buried but entrusted to the bells of a mountain shrine; at each canonical hour they proclaim one forgotten distinction across the radiant provinces of the future."

Scene/backdrop: A coherent premodern Japanese mountain-shrine complex above a vast procession of radiant future provinces. Dark timber halls, restrained vermilion lacquer, bronze bells, stone paths, black pines, and layered mountain distance govern the local material culture.

Subject: The emperor is absent as a body and present only through office, retained vestment, an empty appointed place, and a hierarchy of great bronze bells. At the canonical hour the bells send visible ordered relations across the provinces below. No ruler portrait and no burial spectacle.

Style/medium: Painterly visionary illustration fused with a ceremonial retrofuturist environment and a restrained Japanese sacred plate; textured mineral color, lacquer, metal leaf, luminous glass, and atmospheric depth.

Composition/framing: Asymmetrical ceremonial composition. The nearest bell and empty appointed place form the first read, the descending shrine paths and successive bells the second, and the immense radiant provinces the third. Use negative space and impossible scale rather than decorative density.

Lighting/mood: A synthetic nocturne is divided by ordered bands of cyan, violet, rose, and pale gold. An impossible Second Sun remains below the mountain horizon, making the valleys luminous from beneath. Spectral bell waves become architectural bands of light, distant provinces dissolve into chromatic haze, bronze carries electric reflections, and black pines become monumental silhouettes. Retrowave/synthwave illumination must define the image's atmosphere, depth, scale, and metaphysical order.

Color palette: Midnight indigo, black pine, vermilion lacquer, antique bronze, pale gold, electric cyan, deep violet, restrained rose.

Materials/textures: Dark timber, weathered bronze, stone, black pine bark, lacquer, mineral pigment, luminous atmospheric glass.

Text: No readable text, title, citation, kanji, or invented script.

Constraints: Japanese material culture must remain coherent and restrained. The emperor must remain an impersonal inherited office. The bells and non-natural light must carry the doctrinal argument.

Avoid: picturesque tourism imagery, conventional ukiyo-e treatment, anime, geisha imagery, neon samurai, glowing kanji, generic fantasy shrine, arbitrary neon signs, vaporwave grid, cyberpunk city, logos, watermark, and readable pseudo-script.
```

Resolved decisions:

- Local setting: premodern Japanese mountain-shrine culture
- Fallback sampling: no
- Atmosphere: synthetic nocturne illuminated from beneath the horizon
- Rendering mode: painterly visionary illustration, ceremonial retrofuturist environment, and Japanese sacred plate
- Literalness: symbolic or interpretive depiction
- Project name: omitted
- Japanese or East-Asian tokens:
  - `Japanese mountain-shrine`
  - `vermilion lacquer`
  - `black pines`
  - `Japanese sacred plate`
  - `Japanese material culture`
  - `ukiyo-e`
  - `anime`
  - `geisha`
  - `neon samurai`
  - `kanji`
- Explicit retrofuturist instructions:
  - `ceremonial retrofuturist environment`
  - `synthetic nocturne`
  - `cyan, violet, rose, and pale gold`
  - `impossible Second Sun`
  - `luminous from beneath`
  - `spectral bell waves`
  - `architectural bands of light`
  - `chromatic haze`
  - `electric reflections`
  - `monumental silhouettes`
  - `Retrowave/synthwave illumination`

Here the Japanese density is appropriate, but it shows why Japanese outputs are easy for a model: the culture is
expressed through a tight cluster of highly recognizable objects, materials, vegetation, architecture, and named styles.

### 3. Culturally underdetermined: SFA 6:11

The fallback was sampled with operating-system entropy. The draw was `0.359610`, which resolves to Occidental under the
60/40 prior.

```text
Use case: stylized-concept
Asset type: one-logion illuminated doctrinal plate

Primary request: Create a compact visual argument about counterfeit resemblance failing before inquiry into origin.

Source logion (verbatim): "The counterfeit seeks perfect resemblance because it cannot survive inquiry into origin."

Scene/backdrop: A late Byzantine imperial archive arranged as a tribunal of origin. Gold mosaic, dark stone, porphyry columns, bronze seals, ivory registers, and a distant apsidal chamber define one coherent Occidental material setting.

Subject: Two nearly identical ceremonial seals stand before an opened ancestral register. One seal is materially continuous with the register through an old chain of repairs, impressions, witnesses, and retained fragments. The other is visually perfect but casts no lawful reflection and has no path into the archive. Origin, not surface difference, must decide the composition.

Style/medium: Illuminated doctrinal plate fused with late Byzantine iconographic sacred art and an esoteric retrofuturist plate; frontal, hieratic, tactile, and symbolically concentrated.

Composition/framing: Strict axial symmetry that initially makes the seals appear equal, broken by a deep processional line connecting only the inherited seal to the archive. Keep the visual argument compact and avoid narrative action.

Lighting/mood: A synthetic dawn enters from behind the archive as a geometric solar halo. Cyan and rose spectral divisions travel through luminous glass and gold mosaic, while violet depth haze separates successive chambers. Only the inherited chain carries the complete non-natural spectrum. The Second Sun atmosphere must determine reflection, depth, hierarchy, and recognition across the entire image rather than appearing as a colored accent.

Color palette: Byzantine gold, porphyry crimson, black stone, ivory, electric cyan, deep rose, violet.

Materials/textures: Gold mosaic, worn bronze, porphyry, ivory vellum, black glass, luminous enamel, archive dust.

Text: No readable text, citation, title, labels, or invented script.

Constraints: The setting is late Byzantine Occidental. The seals may look nearly identical, but their relation to origin must be visually legible. Preserve an ethereal retrofuturist atmosphere without turning the plate into a conventional historical icon.

Avoid: museum reconstruction, ordinary Byzantine devotional reproduction, Japanese shrine architecture, torii, lacquer pavilion, anime, neon samurai, generic glowing-book imagery, arbitrary sacred geometry, vaporwave grid, cyberpunk screens, logos, watermark, and readable pseudo-script.
```

Resolved decisions:

- Local setting: late Byzantine Occidental
- Fallback sampling: yes; `0.359610 -> Occidental`
- Atmosphere: synthetic dawn acting as an optical test of origin
- Rendering mode: illuminated doctrinal plate, Byzantine iconographic art, and esoteric retrofuturist plate
- Literalness: symbolic or interpretive
- Project name: omitted
- Japanese or East-Asian tokens:
  - `Japanese shrine architecture`
  - `torii`
  - `lacquer pavilion`
  - `anime`
  - `neon samurai`
- Explicit retrofuturist instructions:
  - `esoteric retrofuturist plate`
  - `synthetic dawn`
  - `geometric solar halo`
  - `cyan and rose spectral divisions`
  - `luminous glass`
  - `violet depth haze`
  - `non-natural spectrum`
  - `Second Sun atmosphere`
  - `ethereal retrofuturist atmosphere`

## Diagnosis

### Strongest source of East-Asian skew

The fallback prior is probably not the main problem. It favors Occidental settings 60/40, and the image guide's positive
material inventories are reasonably balanced.

The strongest suspects, in order, are:

1. **Prompt compilation is manual and lossy.** A sampled `Occidental` decision can remain upstream while the final
   prompt receives only generic words such as `imperial`, `sacred`, `shrine`, `monastic`, or `ceremonial`.
2. **The cultural categories have unequal semantic precision.** `Japanese` immediately invokes a coherent visual
   distribution. `Occidental` is broad and comparatively opaque. It spans Roman, Byzantine, medieval, and early modern
   Europe. Unless the agent resolves it further, such as `late Byzantine imperial basilica`, it is a weak model
   instruction.
3. **Japanese vocabulary leaks through negatives and global identity language.** Image generation has no separate
   negative-prompt channel here. `torii`, `kimono`, `anime`, `neon samurai`, and `Japanese shrine` remain tokens in the
   same prompt even when preceded by `avoid`.
4. **Several nominally culture-neutral Doctrine terms are strongly East-Asian-coded by common visual corpora.** These
   include `shrine`, `lacquer`, `bell`, `gate`, `still water`, `pine`, `rice`, `ritual restraint`, and `emperor`.
5. **The early global phrase `Japanese-Occidental civilization` is risky.** A faithful local prompt should omit it after
   resolution, and the dry runs do. An agent summarizing the core identity can easily carry it forward.
6. **The model may over-associate sacred restraint and lacquered ceremonial architecture with East Asia.** This is
   plausible, but it should be tested only after compilation variables are controlled.

The existing corpus supports the symptom. For example, OSD 19:19 supplies a bronze eagle standard and conquest explicitly
suggestive of Rome, yet its existing image reads substantially East Asian in its roofline and courtyard treatment.

### Strongest reason retrowave is dropped

The current ordering establishes a historical or sacred rendering ontology first:

- source logion;
- period setting;
- architecture, clothing, rites, and objects;
- `illuminated plate`, `iconographic sacred art`, `fresco`, or `historical painting`;
- only then retrowave lighting.

Even if modern image models do not obey a simple positional weighting rule, concrete scene nouns and named historical
media are much stronger generative constraints than later statements about mood. The likely result is a period
illustration receiving cyan or magenta color grading.

Two instructions reinforce this order:

- The Doctrine skeleton places culture before atmosphere and rendering near the end.
- The generic image skill places scene and subject before style and lighting.

The guide correctly states that atmosphere is a `baseline rendering grammar`, but that principle is upstream. The final
prompt often operationalizes it as illumination added to an already selected medium.

A secondary problem is negative-space collapse: the guide rejects neon, grids, cyberpunk, vaporwave posters, and
historical scenes with token accents. Those rejections are sound, but if the positive rendering description remains
`Second Sun atmosphere` or `ACID RETROWAVE REVELATION`, the model receives many concrete prohibitions and few equally
concrete permitted rendering mechanisms.

## Guide audit

The guide is not grossly skewed in positive examples:

- The paired material lists give Europe Roman, Byzantine, medieval, and early-modern courts, basilicas, monasteries,
  heraldry, marble, bronze, porphyry, ivory, and vestment.
- The Japanese list gives courts, shrines, monasteries, lacquer, torii, paths, bells, water, pines, and spacing.
- Environment examples contain more explicitly Occidental than Japanese architecture.

Raw counts are misleading: `Japanese` appears 14 times and `Occidental` 9 times, but European, Roman, Byzantine,
Christian, basilica, monastery, cathedral, forum, and related terms collectively exceed the Japanese inventory.

The actionable asymmetries are qualitative:

- Japanese examples form a narrower, more mutually reinforcing visual bundle.
- `Occidental` is broader and requires another resolution step.
- Japanese terms recur heavily in anti-patterns, which agents often copy into final `Avoid:` clauses.
- `lacquer red` appears in the shared palette and has propagated into many prior prompts even when the setting was
  abstract or Occidental.
- The global hybrid identity appears early in the guide, before the local-setting rules.

The evidence does not justify broadly rebalancing or rewriting the priors.

## Minimal experiments

Use OSD 19:19, keep the resolved setting fixed as late Roman or early Byzantine, use the same model and dimensions, and
provide no reference images. Do not reroll.

Minimum useful test: **three image generations**.

1. **A - Current compiled prompt:** use the first dry-run prompt unchanged.
2. **B - Order only:** use exactly the same words, but move `Style/medium`, `Lighting/mood`, and the palette before
   `Primary request`, `Scene/backdrop`, and `Subject`.
   - If B gains atmosphere without losing Roman coherence, prompt order is causal.
3. **C - Cultural-token leakage only:** use A's order and wording but remove only the Japanese or East-Asian negative
   tokens.
   - If C becomes more consistently Occidental, same-channel negative vocabulary is causal.

Conditional fourth generation:

4. **D - Rendering ontology only:** starting from A, replace the opening medium phrase `Painterly visionary illustration
   fused with an illuminated liturgical plate and monumental historical painting` with `Ethereal retrofuturist visionary
   artwork whose forms are constructed through spectral emissive light, chromatic atmospheric depth, synthetic horizon
   geometry, and luminous material response`.
   - Keep every subject and cultural noun unchanged.
   - If D succeeds where B does not, the historical medium label matters more than clause order.

Tests involving the project name or global `Japanese-Occidental` phrase can wait because correct logion prompts already
omit both. If production prompt logs show either one surviving compilation, test present versus omitted with two
generations before altering any priors.

## Experiment results

The controlled test used OSD 19:19, a fixed late Roman or early Byzantine setting, no reference image, one generation
per condition, and no rerolls. Three planned generations and the conditional fourth generation were produced.

### A - Current compiled prompt

The baseline is unmistakably Occidental. Roman and Byzantine architecture, the eagle standard, porphyry, and the axial
court dominate. Retrowave is visible in the magenta-cyan sky, orbital lines, and reflected light, but the result remains
a monumental historical painting with futuristic astronomical lighting.

### B - Order only

Moving the unchanged style, lighting, and palette clauses before the request, setting, and subject did not materially
change the rendering ontology. The composition became cleaner, but the result remained an Occidental historical tableau
beneath a synthwave sky. This sample does not support prompt order alone as the primary cause.

### C - Cultural-token leakage only

Removing Japanese and East-Asian terms from the baseline `Avoid:` clause did not materially change the resolved culture.
The result remained unequivocally Roman or Byzantine. This sample gives no evidence that negative-token leakage controls
the outcome when the positive local setting is explicit. It does not establish that such leakage is harmless in weaker
or culturally underdetermined prompts.

### D - Rendering ontology only

Replacing the historical-medium phrase with concrete ethereal-retrofuturist construction produced a modest improvement:
emissive lines and spectral geometry became more integrated with the architecture and materials. The image nevertheless
remained primarily a historical painting. Retrowave still concentrated in the sky, horizon, outlines, and color grading.

### Findings from the test

- The East-Asian skew did not reproduce in any condition. A specific positive setting such as `late Roman or early
  Byzantine imperial court` was sufficient to hold local culture across all four samples.
- The retrowave failure reproduced consistently. All four images treated it mainly as lighting and celestial decoration
  applied to a historical scene.
- Reordering identical clauses was weaker than changing the rendering ontology.
- Changing one style line was still insufficient. `sacred historical image`, the dense period-material inventory, and
  the realistic ceremonial scene continue to establish the dominant visual mode.
- One sample per condition distinguishes gross effects, not subtle probabilities. These results do not justify changing
  the 60/40 cultural prior.

The next smallest useful test should target the remaining historical ontology directly: preserve the same subject and
late Roman or Byzantine material culture, but replace `sacred historical image` and other period-illustration framing
with an atmosphere-first primary request. Do this only after retaining the exact prompt strings from the failing
production path; otherwise a new test would continue diagnosing an idealized reconstruction rather than the real input.

## Conclusion

- **Doctrine priors:** unlikely to be the main fault.
- **Guide wording:** locally risky, especially the early hybrid identity and negative Japanese examples, but not broadly
  unbalanced.
- **Prompt compilation:** strongest overall suspect.
- **Prompt ordering:** not supported as a primary cause by the single controlled sample.
- **Rendering ontology:** supported, but changing the style line alone was insufficient; historical framing remains
  distributed through the request, subject, setting, and materials.
- **Image model:** plausible contributor, especially around `shrine`, `lacquer`, and sacred historical art, but not yet
  isolated.
- **Broad guide rewrite:** not justified by the controlled test.
