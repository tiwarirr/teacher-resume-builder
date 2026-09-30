"""One hardcoded sample resume, used to smoke-test the render pipeline (M0)."""

from app.services.render_service import SECTION_LABELS

SAMPLE_RESUME_CONTEXT = {
    "labels": SECTION_LABELS["en"],
    "summary": "",
    "trainings": [],
    "references": [],
    "profile": {
        "full_name": "Anjali Sharma",
        "email": "anjali.sharma@example.com",
        "phone": "+91 98765 43210",
        "address": "Lucknow, Uttar Pradesh",
    },
    "education": [
        {
            "degree": "M.Sc. Mathematics",
            "institution": "University of Lucknow",
            "board_or_university": "University of Lucknow",
            "year": 2016,
            "score": "78%",
        },
    ],
    "qualifications": [
        {"type": "B.Ed", "issuing_body": "NCTE-recognised college", "year": 2017, "score_or_paper": None},
        {"type": "CTET", "issuing_body": "CBSE", "year": 2018, "score_or_paper": "Paper II"},
    ],
    "experience": [
        {
            "school": "Delhi Public Sr. Sec. School",
            "post": "TGT",
            "board": "CBSE",
            "subjects": ["Mathematics"],
            "classes_taught": ["VI", "VII", "VIII"],
            "dates": "Apr 2018 - Present",
            "bullets": [
                "Taught Mathematics to Classes VI-VIII following the CBSE curriculum.",
                "Coordinated the annual inter-house Mathematics Olympiad.",
            ],
        },
    ],
    "admin_roles": [
        {"title": "Class Teacher, Grade VII-B", "duration": "2021-Present", "description": "Managed attendance, parent communication and student welfare."},
    ],
    "edtech_skills": ["Google Classroom", "Microsoft Teams", "Kahoot!"],
}
