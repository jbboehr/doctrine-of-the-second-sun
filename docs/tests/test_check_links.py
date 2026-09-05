"""Exercise installed documentation links through the checker's command line."""

import pathlib
import subprocess
import sys
import tempfile
import unittest


CHECKER = pathlib.Path(__file__).resolve().parents[1] / "check-links.py"


class DocumentationLinkTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = pathlib.Path(self.temporary.name)
        self.write("integrations/web/heliogenesis/README.md", """\
[Experiments](../../../experiments/README.md)

`[inline example](missing-inline.md)`

```html
<img src="missing-example.webp">
<iframe src="missing-example.html"></iframe>
```

```markdown
[example](missing-example.md)
```

[Remote](https://example.com/missing) [Section](#installation)
""")
        self.write("experiments/README.md", """\
| Study | Purpose |
| --- | --- |
| [Archived study][study] | Design provenance |

[study]: archive/study.html#overview "Archived study"

![Scene](../assets/scene%20one.webp "Scene")
<a href="archive/study.html">Study as HTML</a>
""")
        self.write("experiments/archive/study.html", '<img src="../../assets/scene%20one.webp">')
        self.write("assets/scene one.webp", "fixture")

    def write(self, relative, content):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def check(self, *options):
        return subprocess.run(
            [sys.executable, str(CHECKER), *options, str(self.root)],
            capture_output=True,
            text=True,
        )

    def test_complete_package_ignores_code_examples_and_external_links(self):
        result = self.check("--markdown")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_missing_provenance_study_or_image_fails(self):
        for relative, diagnostic in (
            ("experiments/README.md", "integrations/web/heliogenesis/README.md: ../../../experiments/README.md"),
            ("experiments/archive/study.html", "experiments/README.md: archive/study.html#overview"),
            ("assets/scene one.webp", "experiments/README.md: ../assets/scene%20one.webp"),
        ):
            with self.subTest(missing=relative):
                path = self.root / relative
                content = path.read_bytes()
                path.unlink()
                try:
                    result = self.check("--markdown")
                    self.assertEqual(result.returncode, 1, result.stderr)
                    self.assertIn(diagnostic, result.stderr)
                finally:
                    path.write_bytes(content)

    def test_default_mode_checks_html_without_reading_markdown(self):
        self.write("unrendered.md", "[Example](missing.md)")
        result = self.check()
        self.assertEqual(result.returncode, 0, result.stderr)
        (self.root / "assets/scene one.webp").unlink()
        result = self.check()
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn("experiments/archive/study.html: ../../assets/scene%20one.webp", result.stderr)

    def test_default_mode_does_not_require_cmark(self):
        self.write("rendered.html", '<a href="missing.html">Missing</a>')
        empty_path = self.root / "empty-path"
        empty_path.mkdir()

        result = subprocess.run(
            [sys.executable, str(CHECKER), str(self.root)],
            capture_output=True,
            env={"PATH": str(empty_path)},
            text=True,
        )

        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn("rendered.html: missing.html", result.stderr)

    def test_markdown_mode_checks_raw_html_targets(self):
        for markup, diagnostic in (
            ('<img src="missing-raw-image.webp">', "raw.md: missing-raw-image.webp"),
            ('<iframe src="missing-toc.html"></iframe>', "raw.md: missing-toc.html"),
        ):
            with self.subTest(markup=markup):
                self.write("raw.md", markup)

                result = self.check("--markdown")

                self.assertEqual(result.returncode, 1, result.stderr)
                self.assertIn(diagnostic, result.stderr)

    def test_iframe_target_must_exist(self):
        self.write("nested/page.html", """\
<iframe src="../toc.html"></iframe>
<iframe src="https://example.com/embed"></iframe>
<iframe src="//example.com/embed"></iframe>
<iframe srcdoc="&lt;p&gt;Inline content&lt;/p&gt;"></iframe>
""")
        self.write("toc.html", "<p>Table of contents</p>")

        result = self.check()
        self.assertEqual(result.returncode, 0, result.stderr)

        (self.root / "toc.html").unlink()
        result = self.check()

        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn("nested/page.html: ../toc.html", result.stderr)


if __name__ == "__main__":
    unittest.main()
