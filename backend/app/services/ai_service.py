"""AI features via OpenRouter (an OpenAI-API-compatible router that can call
Claude, GPT, and other models with one key - handy for testing model choice).
"""

import json
import re

from openai import APIStatusError, OpenAI

from app.config import settings
from app.schemas.ai import BulletRewriteResponse, CoverLetterResponse, TailorResponse
from app.schemas.resume_content import ResumeContent

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if not settings.openrouter_api_key:
        raise RuntimeError(
            "OPENROUTER_API_KEY is not set. Get a key at https://openrouter.ai/keys and add it to backend/.env"
        )
    if _client is None:
        _client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=settings.openrouter_api_key)
    return _client


def _create_completion(**kwargs):
    try:
        return _get_client().chat.completions.create(**kwargs)
    except APIStatusError as e:
        if e.status_code == 402:
            raise RuntimeError(
                "The AI provider account is out of credits. Add credits at https://openrouter.ai/settings/credits."
            ) from e
        raise RuntimeError(f"The AI service returned an error ({e.status_code}). Please try again shortly.") from e


# Rough per-token USD cost for the configured bullet-rewrite model (Haiku 4.5
# on OpenRouter at time of writing) - used only for the AIUsageLog estimate,
# not for billing, so it doesn't need to track pricing changes exactly.
BULLET_REWRITE_COST_PER_TOKEN_IN = 0.000001
BULLET_REWRITE_COST_PER_TOKEN_OUT = 0.000005

_NUMBER_RE = re.compile(r"\d+(?:\.\d+)?%?")
_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(\{.*\})\s*```", re.DOTALL)
_JSON_OBJECT_RE = re.compile(r"\{.*\}", re.DOTALL)


def _parse_json_response(raw_content: str, fallback_text: str) -> dict:
    """Models sometimes ignore response_format and wrap JSON in a markdown
    code fence, or add stray text around it - try a few extraction strategies
    before giving up.
    """
    candidates = [raw_content]
    if fence_match := _JSON_FENCE_RE.search(raw_content):
        candidates.insert(0, fence_match.group(1))
    elif obj_match := _JSON_OBJECT_RE.search(raw_content):
        candidates.insert(0, obj_match.group(0))

    for candidate in candidates:
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue

    return {
        "rewritten": fallback_text,
        "missing_info": ["The AI's response could not be parsed - please try again."],
    }


def _unverified_numbers(raw_text: str, rewritten_text: str) -> list[str]:
    """Numbers appearing in the AI's rewrite but not in what the teacher wrote -
    a red flag that the model may have fabricated a metric despite instructions.
    """
    raw_numbers = set(_NUMBER_RE.findall(raw_text))
    rewritten_numbers = _NUMBER_RE.findall(rewritten_text)
    return [n for n in rewritten_numbers if n not in raw_numbers]


BULLET_REWRITE_SYSTEM_PROMPT = """You rewrite Indian schoolteacher duty statements into concise, \
achievement-style resume bullets, in the tone used by strong CBSE/ICSE/IB/Cambridge/state-board \
teacher resumes (competency-based, NEP 2020-aware language where it fits naturally).

Hard rule: you must NEVER invent numbers, outcomes, or scope that the teacher did not provide. \
Do not assume a pass percentage, student count, score improvement, or any other metric that is \
not present in the teacher's own text.

If the bullet would be stronger with a specific metric (student count, % improvement, exam \
result, duration, number of students mentored, etc.) that is missing from the input, write the \
best honest, non-fabricated version of the bullet, and separately list the specific follow-up \
question(s) you would ask the teacher to get that metric.

Respond with ONLY a JSON object of this exact shape, no other text:
{"rewritten": "<the rewritten bullet, one sentence, starting with a strong past-tense action verb>", \
"missing_info": ["<question 1>", "<question 2>"]}

missing_info should be an empty list if the bullet is already complete and doesn't need a metric."""


def rewrite_bullet(raw_duty_text: str, subject: str, board: str, classes_taught: list[str]) -> tuple[BulletRewriteResponse, int, int]:
    context_bits = []
    if subject:
        context_bits.append(f"Subject: {subject}")
    if board:
        context_bits.append(f"Board: {board}")
    if classes_taught:
        context_bits.append(f"Classes: {', '.join(classes_taught)}")
    context_str = ("\n" + "\n".join(context_bits)) if context_bits else ""

    user_message = f'Duty: "{raw_duty_text}"{context_str}'

    completion = _create_completion(
        model=settings.openrouter_model_bullet_rewrite,
        messages=[
            {"role": "system", "content": BULLET_REWRITE_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
        max_tokens=400,
        temperature=0.4,
    )

    raw_content = completion.choices[0].message.content or "{}"
    parsed = _parse_json_response(raw_content, fallback_text=raw_duty_text)

    rewritten = str(parsed.get("rewritten", raw_duty_text))
    missing_info = [str(m) for m in parsed.get("missing_info", [])]

    unverified = _unverified_numbers(raw_duty_text, rewritten)
    if unverified:
        missing_info = [
            f"The AI included a number ({', '.join(unverified)}) that wasn't in what you wrote - "
            "please confirm it's accurate or remove it before using this bullet."
        ] + missing_info

    result = BulletRewriteResponse(
        rewritten=rewritten,
        missing_info=missing_info,
        has_unverified_numbers=bool(unverified),
    )

    usage = completion.usage
    tokens_in = usage.prompt_tokens if usage else 0
    tokens_out = usage.completion_tokens if usage else 0
    return result, tokens_in, tokens_out


# Sonnet 5 on OpenRouter at time of writing - see the bullet-rewrite comment above.
TAILOR_COST_PER_TOKEN_IN = 0.000002
TAILOR_COST_PER_TOKEN_OUT = 0.00001

TAILOR_SYSTEM_PROMPT = """You compare a teacher's resume to a school job advertisement (for a post such as \
PGT/TGT/PRT, at a CBSE/ICSE/IB/Cambridge/state-board school).

Score the match from 0 to 100 based ONLY on overlap between what the job ad asks for and what is \
actually present in the resume - subjects, board experience, qualifications (B.Ed/CTET/TET/NET), \
post level, classes taught, administrative experience, EdTech skills. Do not reward vague \
enthusiasm; score strictly on concrete overlap.

List gaps as specific, concrete missing items (e.g. "Job asks for IB PYP experience; resume shows \
none" or "Job requires CTET; not listed in qualifications") - not vague advice like "improve your resume".

Suggest which of the resume's EXISTING sections or experience entries to reorder or emphasise so the \
most relevant content appears first. Never suggest adding content, achievements, or qualifications \
that are not already present in the resume - if something is missing, that belongs in gaps, not in \
a suggestion to add it.

Respond with ONLY a JSON object of this exact shape, no other text:
{"match_score": <int 0-100>, "gaps": ["<gap 1>", ...], "reorder_suggestions": ["<suggestion 1>", ...]}"""


def tailor_resume(content: ResumeContent, job_description_text: str) -> tuple[TailorResponse, int, int]:
    resume_summary = content.model_dump(exclude={"references"}, exclude_none=True)
    user_message = (
        f"RESUME (JSON):\n{json.dumps(resume_summary, default=str)}\n\n"
        f"JOB ADVERTISEMENT:\n{job_description_text}"
    )

    completion = _create_completion(
        model=settings.openrouter_model_tailoring,
        messages=[
            {"role": "system", "content": TAILOR_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
        max_tokens=900,
        temperature=0.3,
    )

    raw_content = completion.choices[0].message.content or "{}"
    parsed = _parse_json_response(raw_content, fallback_text="")

    match_score = parsed.get("match_score", 0)
    try:
        match_score = max(0, min(100, int(match_score)))
    except (TypeError, ValueError):
        match_score = 0

    result = TailorResponse(
        match_score=match_score,
        gaps=[str(g) for g in parsed.get("gaps", [])],
        reorder_suggestions=[str(s) for s in parsed.get("reorder_suggestions", [])],
    )

    usage = completion.usage
    tokens_in = usage.prompt_tokens if usage else 0
    tokens_out = usage.completion_tokens if usage else 0
    return result, tokens_in, tokens_out


COVER_LETTER_SYSTEM_PROMPT = """You write cover letters for Indian schoolteachers applying to teaching \
posts (PGT/TGT/PRT, CBSE/ICSE/IB/Cambridge/state boards).

Hard rule: write only in first person, using ONLY facts present in the supplied resume JSON and (if \
given) the job description. Never state a school name, year, subject, board, qualification, or \
achievement that is not present in the resume JSON. If the resume lacks detail on something the job \
asks for, do not invent it - simply don't mention it, or speak generally about the teacher's approach \
without a fabricated specific.

Tone: {tone}. Length: 3-4 short paragraphs, ready to send as-is.

Respond with ONLY the letter body text, no subject line, no JSON, no markdown formatting, no \
placeholder brackets like [Your Name]."""

TEACHING_PHILOSOPHY_SYSTEM_PROMPT = """You write teaching philosophy statements for Indian schoolteachers, \
grounded strictly in the subjects, classes, boards, and administrative/co-curricular roles present in \
their resume JSON.

Hard rule: write only in first person, using ONLY facts present in the supplied resume JSON. Never \
invent a specific student outcome, pedagogical result, or achievement not present in the resume. \
General statements of teaching approach/values are fine even without a specific resume fact behind \
them, as long as no invented FACT (name, number, result) is stated as if true.

Tone: {tone}. Length: 3-4 short paragraphs, ready to use as-is.

Respond with ONLY the statement text, no heading, no JSON, no markdown formatting."""


def generate_cover_letter(
    content: ResumeContent, kind: str, job_description_text: str, tone: str
) -> tuple[CoverLetterResponse, int, int]:
    resume_summary = content.model_dump(exclude={"references"}, exclude_none=True)
    system_template = COVER_LETTER_SYSTEM_PROMPT if kind == "cover_letter" else TEACHING_PHILOSOPHY_SYSTEM_PROMPT
    system_prompt = system_template.format(tone=tone)

    user_message = f"RESUME (JSON):\n{json.dumps(resume_summary, default=str)}"
    if job_description_text.strip():
        user_message += f"\n\nJOB ADVERTISEMENT:\n{job_description_text}"

    completion = _create_completion(
        model=settings.openrouter_model_tailoring,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        max_tokens=700,
        temperature=0.6,
    )

    text = (completion.choices[0].message.content or "").strip()
    result = CoverLetterResponse(content=text)

    usage = completion.usage
    tokens_in = usage.prompt_tokens if usage else 0
    tokens_out = usage.completion_tokens if usage else 0
    return result, tokens_in, tokens_out
