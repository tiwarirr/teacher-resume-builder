"""Renders resume data into a PDF via Jinja2 -> Typst source -> typst.compile().

Jinja2 is configured with non-default delimiters (<< >>, <% %>) because Typst's
own syntax uses {{ }} for dictionaries/code blocks - the Jinja2 defaults would
collide with valid Typst markup in the templates.
"""

from pathlib import Path
from typing import Any

import typst
from jinja2 import Environment, FileSystemLoader

from app.schemas.resume_content import ResumeContent

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "typst"
FONTS_DIR = Path(__file__).resolve().parent.parent / "templates" / "fonts"

# Characters that are Typst markup syntax (bold, emph, raw, label, ref, code,
# math, escape itself) and must be escaped in any user-supplied text - e.g. an
# email address's "@" would otherwise be parsed as a Typst citation reference.
_TYPST_SPECIAL_CHARS = ["\\", "*", "_", "`", "<", ">", "@", "#", "$", "~", "^"]


def _typst_escape(value: Any) -> str:
    if value is None:
        return ""
    text = str(value)
    text = text.replace("\\", "\\\\")
    for char in _TYPST_SPECIAL_CHARS[1:]:
        text = text.replace(char, "\\" + char)
    return text


_env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    variable_start_string="<<",
    variable_end_string=">>",
    block_start_string="<%",
    block_end_string="%>",
    comment_start_string="<#",
    comment_end_string="#>",
    trim_blocks=True,
    lstrip_blocks=True,
    finalize=_typst_escape,  # auto-escapes every << var >> substitution
)

VALID_TEMPLATES = {"classic", "modern", "compact", "academic"}

# Section headings are static Typst markup, not user data, so they need their
# own translation rather than following the (untranslated) field content.
SECTION_LABELS = {
    "en": {
        "education": "Education",
        "qualifications": "Teaching Qualifications",
        "experience": "Teaching Experience",
        "admin_roles": "Administrative & Co-curricular",
        "edtech_skills": "EdTech Skills",
        "trainings": "Trainings & Workshops",
        "references": "References",
        "classes_label": "Classes",
    },
    "hi": {
        "education": "शिक्षा",
        "qualifications": "शिक्षण योग्यताएँ",
        "experience": "शिक्षण अनुभव",
        "admin_roles": "प्रशासनिक एवं सह-पाठ्यचर्या गतिविधियाँ",
        "edtech_skills": "एडटेक कौशल",
        "trainings": "प्रशिक्षण एवं कार्यशालाएँ",
        "references": "संदर्भ",
        "classes_label": "कक्षाएँ",
    },
}


def render_resume_pdf(template_name: str, context: dict[str, Any]) -> bytes:
    if template_name not in VALID_TEMPLATES:
        raise ValueError(f"Unknown template '{template_name}'. Valid: {VALID_TEMPLATES}")

    template = _env.get_template(f"{template_name}.typ.j2")
    typst_source = template.render(**context)
    # font_paths points Typst at our bundled Noto Sans / Noto Sans Devanagari
    # files, so rendering doesn't depend on fonts happening to be installed on
    # whatever machine runs this (dev laptop today, a deployment container
    # later) - see templates/fonts/OFL.txt for their licence.
    return typst.compile(typst_source.encode("utf-8"), format="pdf", font_paths=[str(FONTS_DIR)])


def build_render_context(content: ResumeContent, language: str = "en") -> dict[str, Any]:
    """Flattens ResumeContent (which has typed objects like ImpactBullet, whose
    text needs to prefer the AI-rewritten version) into the plain dicts/strings
    the Typst templates expect.
    """
    return {
        "labels": SECTION_LABELS.get(language, SECTION_LABELS["en"]),
        "profile": content.profile.model_dump(),
        "summary": content.summary,
        "education": [e.model_dump() for e in content.education],
        "qualifications": [q.model_dump() for q in content.qualifications],
        "experience": [
            {
                **exp.model_dump(exclude={"bullets"}),
                "bullets": [b.display_text for b in exp.bullets],
            }
            for exp in content.experience
        ],
        "admin_roles": [r.model_dump() for r in content.admin_roles],
        "edtech_skills": [s.name for s in content.edtech_skills],
        "trainings": [t.model_dump() for t in content.trainings],
        "references": [r.model_dump() for r in content.references],
    }


def render_resume_content(template_name: str, content: ResumeContent, language: str = "en") -> bytes:
    return render_resume_pdf(template_name, build_render_context(content, language))
