# AnswerBank

Canonical platform capability storage system for grounding LLM responses with verified facts.

## Structure

answerbank/
├── schemas/                # JSON Schema definitions
├── context-packs/          # Generated context packs (versioned)
│   ├── all-platforms/
│   └── {platform_id}/
├── templates/              # Context pack templates
├── validation/             # Validation rules
├── generator/              # Context pack generator (Cloudflare Worker)
├── scripts/                # Utility scripts
├── evidence/               # Evidence file manifest
├── docs/                   # Documentation
└── .github/workflows/      # CI/CD workflows

## Quick Start

1. Set up Google Sheets (see docs/setup-sheets.md)
2. Configure R2 bucket (see docs/setup-r2.md)
3. Deploy generator worker (see generator/README.md)
4. Start adding platforms and capabilities

## Key Concepts

- **Platforms**: Products/services being documented
- **CapabilityQuestions**: Standard questions about platform capabilities
- **Answers**: Verified responses linking platforms to questions
- **Evidence**: Screenshots, docs, recordings supporting answers
- **Context Packs**: Generated bundles for LLM consumption

## Status Workflow

DRAFT → REVIEW → VERIFIED → [EXPIRED]
            ↓
         DISPUTED

## License

[Your License]
