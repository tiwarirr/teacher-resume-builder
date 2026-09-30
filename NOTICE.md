# Third-party attribution

This project's PDF rendering approach (structured resume data -> template -> [Typst](https://typst.app) compiler) was inspired by [rendercv/rendercv](https://github.com/rendercv/rendercv), copyright Sina Atalay and individual contributors, licensed under the MIT License (full text: [THIRD_PARTY_LICENSES/rendercv-LICENSE.txt](THIRD_PARTY_LICENSES/rendercv-LICENSE.txt)).

No `rendercv` source code is vendored into this repository. This project depends directly on the `typst` Python package (the same underlying PDF-compilation engine `rendercv` uses) and ships its own Jinja2 templates and Pydantic data model, written for teacher-specific resume content and not derived from `rendercv`'s schema or templates.

This NOTICE is kept as a courtesy for attribution even though no `rendercv` code is reused verbatim; if that changes in future (e.g. by adapting one of its Typst template snippets), the relevant file(s) will carry an inline comment pointing back here.

## Fonts

`backend/app/templates/fonts/` bundles the Noto Sans, Noto Sans Devanagari and Noto Serif typefaces (© The Noto Project Authors), used so PDF rendering doesn't depend on fonts happening to be installed on whatever machine runs it - and so Hindi (Devanagari) content renders correctly, which the base Typst fonts don't support. Licensed under the SIL Open Font License 1.1: [THIRD_PARTY_LICENSES/... see backend/app/templates/fonts/OFL.txt](backend/app/templates/fonts/OFL.txt).
