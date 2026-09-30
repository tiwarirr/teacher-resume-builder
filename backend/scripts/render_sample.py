"""Run directly to render the hardcoded sample resume to backend/output/sample.pdf,
without needing the API server running. Usage: python scripts/render_sample.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.sample_data import SAMPLE_RESUME_CONTEXT  # noqa: E402
from app.services.render_service import render_resume_pdf  # noqa: E402

if __name__ == "__main__":
    pdf_bytes = render_resume_pdf("classic", SAMPLE_RESUME_CONTEXT)
    output_path = Path(__file__).resolve().parent.parent / "output" / "sample_classic_en.pdf"
    output_path.parent.mkdir(exist_ok=True)
    output_path.write_bytes(pdf_bytes)
    print(f"Wrote {len(pdf_bytes)} bytes to {output_path}")
