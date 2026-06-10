#!/usr/bin/env python3
"""Trackr Landing Page Improvement Report - Body PDF (ReportLab)"""

import sys, os

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ── Font Registration ──
pdfmetrics.registerFont(TTFont('LiberationSerif', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSerif-Bold', '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-Bold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
registerFontFamily('LiberationSerif', normal='LiberationSerif', bold='LiberationSerif-Bold')
registerFontFamily('Carlito', normal='Carlito', bold='Carlito-Bold')

# ── Palette (from cascade) ──
PAGE_BG       = colors.HexColor('#f4f4f3')
SECTION_BG    = colors.HexColor('#ebebe9')
CARD_BG       = colors.HexColor('#f0efed')
TABLE_STRIPE  = colors.HexColor('#edecea')
HEADER_FILL   = colors.HexColor('#67604b')
COVER_BLOCK   = colors.HexColor('#655b3d')
BORDER        = colors.HexColor('#cac3ae')
ICON          = colors.HexColor('#a79150')
ACCENT        = colors.HexColor('#4623b0')
ACCENT_2      = colors.HexColor('#3ab276')
TEXT_PRIMARY   = colors.HexColor('#262522')
TEXT_MUTED     = colors.HexColor('#7d7b74')
SEM_SUCCESS   = colors.HexColor('#3e8a57')
SEM_WARNING   = colors.HexColor('#a4884e')
SEM_ERROR     = colors.HexColor('#894e49')
SEM_INFO      = colors.HexColor('#476e95')

# ── Output ──
OUTPUT_PDF = '/home/z/my-project/download/trackr_body.pdf'

# ── Styles ──
styles = getSampleStyleSheet()

sH1 = ParagraphStyle(
    name='H1Custom', fontName='LiberationSerif', fontSize=20, leading=28,
    textColor=ACCENT, spaceBefore=18, spaceAfter=10, alignment=TA_LEFT
)
sH2 = ParagraphStyle(
    name='H2Custom', fontName='LiberationSerif', fontSize=15, leading=22,
    textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=8, alignment=TA_LEFT
)
sH3 = ParagraphStyle(
    name='H3Custom', fontName='LiberationSerif', fontSize=12, leading=18,
    textColor=HEADER_FILL, spaceBefore=10, spaceAfter=6, alignment=TA_LEFT
)
sBody = ParagraphStyle(
    name='BodyCustom', fontName='LiberationSerif', fontSize=10.5, leading=18,
    textColor=TEXT_PRIMARY, spaceBefore=0, spaceAfter=6, alignment=TA_JUSTIFY
)
sBodyLeft = ParagraphStyle(
    name='BodyLeft', fontName='LiberationSerif', fontSize=10.5, leading=18,
    textColor=TEXT_PRIMARY, spaceBefore=0, spaceAfter=6, alignment=TA_LEFT
)
sBullet = ParagraphStyle(
    name='BulletCustom', fontName='LiberationSerif', fontSize=10.5, leading=18,
    textColor=TEXT_PRIMARY, spaceBefore=2, spaceAfter=4, leftIndent=24,
    bulletIndent=10, alignment=TA_LEFT, bulletFontSize=10.5
)
sMuted = ParagraphStyle(
    name='MutedCustom', fontName='LiberationSerif', fontSize=9.5, leading=15,
    textColor=TEXT_MUTED, spaceBefore=0, spaceAfter=4, alignment=TA_LEFT
)
sTableHeader = ParagraphStyle(
    name='TableHeader', fontName='LiberationSerif', fontSize=10, leading=14,
    textColor=colors.white, alignment=TA_CENTER
)
sTableCell = ParagraphStyle(
    name='TableCell', fontName='LiberationSerif', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT
)
sTableCellCenter = ParagraphStyle(
    name='TableCellCenter', fontName='LiberationSerif', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER
)
sCaption = ParagraphStyle(
    name='CaptionCustom', fontName='LiberationSerif', fontSize=9, leading=14,
    textColor=TEXT_MUTED, spaceBefore=3, spaceAfter=6, alignment=TA_CENTER
)
sCalloutTitle = ParagraphStyle(
    name='CalloutTitle', fontName='LiberationSerif', fontSize=11, leading=16,
    textColor=SEM_ERROR, spaceBefore=0, spaceAfter=4, alignment=TA_LEFT
)
sCalloutBody = ParagraphStyle(
    name='CalloutBody', fontName='LiberationSerif', fontSize=10, leading=16,
    textColor=TEXT_PRIMARY, spaceBefore=0, spaceAfter=0, alignment=TA_LEFT
)
sImprovementTitle = ParagraphStyle(
    name='ImprovementTitle', fontName='LiberationSerif', fontSize=11, leading=16,
    textColor=SEM_SUCCESS, spaceBefore=0, spaceAfter=4, alignment=TA_LEFT
)

# ── Page template ──
PAGE_W, PAGE_H = A4
LEFT_M = 1.0 * inch
RIGHT_M = 1.0 * inch
TOP_M = 0.8 * inch
BOTTOM_M = 0.8 * inch

def footer_func(canvas, doc):
    canvas.saveState()
    canvas.setFont('LiberationSerif', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawCentredString(PAGE_W / 2, 0.5 * inch, f"Trackr Landing Page Improvement Report  |  Page {doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate(
    OUTPUT_PDF, pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOTTOM_M
)

available_width = PAGE_W - LEFT_M - RIGHT_M

story = []

# ════════════════════════════════════════════════════════════════════
# SECTION 1: Executive Summary
# ════════════════════════════════════════════════════════════════════
story.append(Paragraph('<b>1. Executive Summary</b>', sH1))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'The Trackr landing page presents a voice-first, AI-powered financial tracking application. '
    'While the core concept is compelling and the visual design is modern and attractive, a detailed '
    'UX audit reveals several critical inconsistencies between the marketing claims displayed on the '
    'page and the actual product capabilities. These inconsistencies, flagged with red annotations in '
    'the original design review, undermine user trust and create a credibility gap that can significantly '
    'hurt conversion rates and user retention. When users discover that a product does not deliver on '
    'its promises, they not only abandon the service but often share their negative experiences, causing '
    'reputational damage that extends far beyond the immediate landing page.',
    sBody
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'This report identifies five key issues, provides an in-depth analysis of each problem, and proposes '
    'specific, actionable improvements that align the landing page messaging with actual product capabilities. '
    'The goal is not merely to fix errors but to transform the landing page into an authentic, trust-building '
    'experience that converts visitors into loyal users through honesty and clarity. The redesigned approach '
    'emphasizes truthful claims, transparent feature descriptions, and a visual design that reinforces '
    'reliability rather than overselling capabilities that do not yet exist.',
    sBody
))

# ════════════════════════════════════════════════════════════════════
# SECTION 2: Issues Identified
# ════════════════════════════════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('<b>2. Issues Identified</b>', sH1))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'The annotated screenshot reveals five distinct problems ranging from factual inaccuracies to '
    'misleading user expectations. Each issue is analyzed below with its root cause, impact on users, '
    'and severity level. Understanding the root cause is essential because surface-level fixes (simply '
    'changing a number) do not address the underlying design philosophy that allowed these inconsistencies '
    'to appear in the first place.',
    sBody
))

# Issues table
issue_data = [
    [
        Paragraph('<b>#</b>', sTableHeader),
        Paragraph('<b>Issue</b>', sTableHeader),
        Paragraph('<b>Current Claim</b>', sTableHeader),
        Paragraph('<b>Reality</b>', sTableHeader),
        Paragraph('<b>Severity</b>', sTableHeader),
    ],
    [
        Paragraph('1', sTableCellCenter),
        Paragraph('False "International" badge', sTableCell),
        Paragraph('"International" displayed as a core feature', sTableCell),
        Paragraph('Only 2 languages supported (English, Hindi)', sTableCell),
        Paragraph('High', sTableCellCenter),
    ],
    [
        Paragraph('2', sTableCellCenter),
        Paragraph('Inflated currency claim', sTableCell),
        Paragraph('"22 Currencies"', sTableCell),
        Paragraph('Primary currency is INR only', sTableCell),
        Paragraph('High', sTableCellCenter),
    ],
    [
        Paragraph('3', sTableCellCenter),
        Paragraph('Misleading CTA button', sTableCell),
        Paragraph('"No Password Needed"', sTableCell),
        Paragraph('Implies no sign-up, but some auth is required', sTableCell),
        Paragraph('Medium', sTableCellCenter),
    ],
    [
        Paragraph('4', sTableCellCenter),
        Paragraph('Contradictory stats', sTableCell),
        Paragraph('"22 Currencies" and "2 Languages" shown together', sTableCell),
        Paragraph('The two numbers conflict with each other', sTableCell),
        Paragraph('High', sTableCellCenter),
    ],
    [
        Paragraph('5', sTableCellCenter),
        Paragraph('Unsupportable description', sTableCell),
        Paragraph('"Works in 22 currencies, anywhere in the world"', sTableCell),
        Paragraph('Cannot support 22 currencies with only 2 languages', sTableCell),
        Paragraph('High', sTableCellCenter),
    ],
]

col_ratios = [0.05, 0.20, 0.25, 0.28, 0.12]
col_widths = [r * available_width for r in col_ratios]

issue_table = Table(issue_data, colWidths=col_widths, hAlign='CENTER')
issue_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_STRIPE),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_STRIPE),
    ('BACKGROUND', (0, 5), (-1, 5), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))

story.append(Spacer(1, 12))
story.append(issue_table)
story.append(Spacer(1, 4))
story.append(Paragraph('Table 1: Summary of identified issues on the Trackr landing page', sCaption))

# ════════════════════════════════════════════════════════════════════
# SECTION 3: Detailed Issue Analysis
# ════════════════════════════════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('<b>3. Detailed Issue Analysis</b>', sH1))
story.append(Spacer(1, 6))

# Issue 1
story.append(Paragraph('<b>3.1 False "International" Badge</b>', sH2))
story.append(Paragraph(
    'The landing page prominently displays a green badge reading "AI-Powered | Voice-First | International," '
    'positioning international capability as a core pillar of the product. However, with only two supported '
    'languages (English and Hindi) and a primary focus on the Indian market with INR as the main currency, '
    'the product is fundamentally regional, not international. The word "International" on a badge next to '
    'the hero headline creates an immediate expectation of global reach, multi-region support, and cross-border '
    'functionality that the product simply cannot deliver at this stage.',
    sBody
))
story.append(Paragraph(
    'The impact of this mismatch is severe. When international users discover the product supports only two '
    'languages, they feel deceived. According to user trust research, the first 8 seconds on a landing page '
    'determine whether a visitor stays or leaves. If a claim is disproven within that window, trust is shattered '
    'irreversibly. Furthermore, regional users (the actual target market) may also question what else is exaggerated, '
    'creating a cascading credibility problem that affects the entire product perception.',
    sBody
))

# Issue 2
story.append(Paragraph('<b>3.2 Inflated Currency Claim</b>', sH2))
story.append(Paragraph(
    'The stats section boldly claims "22 Currencies," yet the product primarily operates with INR (Indian Rupee). '
    'Supporting 22 currencies would require not just currency conversion but also region-specific formatting, '
    'tax handling, banking integrations, and compliance frameworks for each currency region. With only two '
    'languages supported, it is implausible that the product can meaningfully serve users across 22 different '
    'currency zones. The claim creates a logical inconsistency that sophisticated users will immediately detect.',
    sBody
))
story.append(Paragraph(
    'This type of inflation is common in early-stage startups trying to appear larger than they are. However, '
    'in the financial technology space, users are particularly sensitive to accuracy. A budgeting app that '
    'overstates its capabilities is perceived as unreliable for managing money, which is precisely the opposite '
    'of what a financial tracking tool needs to convey. Users need to feel that the app is meticulous and '
    'precise, qualities that are undermined by inflated claims.',
    sBody
))

# Issue 3
story.append(Paragraph('<b>3.3 Misleading CTA Button</b>', sH2))
story.append(Paragraph(
    'The primary call-to-action button reads "Start Free - No Password Needed." The word "Password" is crossed '
    'out in the annotated review, suggesting that the claim of "no password" is either partially false or '
    'misleading. In practice, most modern applications use some form of authentication, even if it is passwordless '
    '(such as magic links, OTP verification, or social login). If Trackr requires any form of sign-up or '
    'verification, claiming "No Password Needed" without qualification is disingenuous.',
    sBody
))
story.append(Paragraph(
    'A more honest approach would be to say "No Password Needed" only if the app truly requires zero authentication, '
    'or to use alternative phrasing like "Start Free - No Password Required" combined with a brief explanation of the '
    'actual onboarding flow (e.g., "Sign in with just your phone number" or "Get started with a single tap"). The key '
    'principle is that the CTA should set accurate expectations for the very first interaction a user has with the product. '
    'If the first experience contradicts the promise, the user will question every subsequent claim.',
    sBody
))

# Issue 4
story.append(Paragraph('<b>3.4 Contradictory Statistics</b>', sH2))
story.append(Paragraph(
    'The stats section displays "22 Currencies" and "2 Languages" side by side, creating an internal contradiction '
    'that undermines the entire page. A product supporting 22 currencies would logically need to support the languages '
    'spoken in those currency regions. The stark contrast between 22 (currencies) and 2 (languages) makes it '
    'immediately obvious that the currency number is inflated. Users can perform this mental math instantly, and the '
    'result is a loss of trust not just in that specific claim but in the entire set of statistics presented.',
    sBody
))
story.append(Paragraph(
    'The "16+ Categories" and "5 Classifications" figures may be accurate, but once a user has caught one inflated '
    'number, they will doubt all numbers. This is the "contamination effect" in credibility: one proven falsehood '
    'causes the entire information set to be viewed with suspicion. The solution is not just correcting the '
    'currency number but restructuring how statistics are presented to create a coherent, internally consistent '
    'narrative that builds trust rather than eroding it.',
    sBody
))

# Issue 5
story.append(Paragraph('<b>3.5 Unsupportable Description</b>', sH2))
story.append(Paragraph(
    'The hero description states: "Just say \'Spent 500 on groceries\' or \'Guzar 50000 bazaar kharcha\' - '
    'Trackr\'s AI understands, categorizes, and logs it instantly. Works in 22 currencies, anywhere in the world." '
    'The final clause "Works in 22 currencies, anywhere in the world" directly contradicts the "2 Languages" stat '
    'shown below it. This is the most damaging inconsistency because it appears in the primary reading area, the '
    'hero section, where users spend the most time and form their first impressions.',
    sBody
))
story.append(Paragraph(
    'The description would be far more effective if it focused on what the product actually does well: voice-based '
    'expense tracking in English and Hindi with automatic categorization. This is a genuinely impressive feature set '
    'for the Indian market, which is large and underserved. By trying to appear global, the copy undersells the '
    'product\'s actual strength in its home market. A focused, truthful description would resonate more deeply with '
    'the target audience and avoid the trust penalty of overselling.',
    sBody
))

# ════════════════════════════════════════════════════════════════════
# SECTION 4: Proposed Improvements
# ════════════════════════════════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('<b>4. Proposed Improvements</b>', sH1))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'Each improvement is designed to address the root cause of the issue, not just the surface symptom. '
    'The overarching philosophy is "honest by design" - building trust through accurate, verifiable claims '
    'that make the product feel reliable rather than overpromising and underdelivering. This approach may '
    'result in slightly less flashy marketing, but it produces significantly higher conversion quality: users '
    'who sign up based on truthful expectations are far more likely to become long-term, satisfied customers.',
    sBody
))

# Improvement table
improve_data = [
    [
        Paragraph('<b>Issue</b>', sTableHeader),
        Paragraph('<b>Current</b>', sTableHeader),
        Paragraph('<b>Improved</b>', sTableHeader),
        Paragraph('<b>Rationale</b>', sTableHeader),
    ],
    [
        Paragraph('"International" badge', sTableCell),
        Paragraph('International', sTableCell),
        Paragraph('Multi-Language', sTableCell),
        Paragraph('Accurately reflects 2-language support without claiming global reach', sTableCell),
    ],
    [
        Paragraph('Currency claim', sTableCell),
        Paragraph('22 Currencies', sTableCell),
        Paragraph('INR (Primary Currency)', sTableCell),
        Paragraph('States the real capability; more credible for Indian market users', sTableCell),
    ],
    [
        Paragraph('CTA button', sTableCell),
        Paragraph('No Password Needed', sTableCell),
        Paragraph('No Sign-Up Needed', sTableCell),
        Paragraph('Clearer promise that avoids the password authentication confusion', sTableCell),
    ],
    [
        Paragraph('Stats section', sTableCell),
        Paragraph('22 Currencies, 2 Languages (contradictory)', sTableCell),
        Paragraph('2 Languages, INR Currency, 16+ Categories, 5 Classifications', sTableCell),
        Paragraph('Internally consistent stats that reinforce each other', sTableCell),
    ],
    [
        Paragraph('Hero description', sTableCell),
        Paragraph('"Works in 22 currencies, anywhere in the world"', sTableCell),
        Paragraph('"Speak naturally in English or Hindi - Trackr understands, categorizes, and logs it instantly"', sTableCell),
        Paragraph('Focuses on real capability; removes unsupported claim', sTableCell),
    ],
]

col_ratios2 = [0.15, 0.20, 0.28, 0.30]
col_widths2 = [r * available_width for r in col_ratios2]

improve_table = Table(improve_data, colWidths=col_widths2, hAlign='CENTER')
improve_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_STRIPE),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_STRIPE),
    ('BACKGROUND', (0, 5), (-1, 5), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))

story.append(Spacer(1, 12))
story.append(improve_table)
story.append(Spacer(1, 4))
story.append(Paragraph('Table 2: Summary of proposed improvements', sCaption))

# Detailed improvements
story.append(Spacer(1, 12))
story.append(Paragraph('<b>4.1 Replace "International" with "Multi-Language"</b>', sH2))
story.append(Paragraph(
    'The badge at the top of the page is the first element users see after the logo. Replacing "International" '
    'with "Multi-Language" accurately describes the product\'s capability to understand both English and Hindi voice '
    'inputs. This is still a meaningful differentiator: most expense tracking apps do not support voice input at all, '
    'let alone in multiple languages. By framing it honestly, the badge becomes a genuine feature highlight rather '
    'than a credibility risk. The badge should read: "AI-Powered | Voice-First | Multi-Language," which maintains '
    'the same visual rhythm and appeal while being entirely truthful.',
    sBody
))
story.append(Paragraph(
    'Additionally, the badge design should be enhanced with subtle icons next to each label (a microphone for '
    'Voice-First, a brain icon for AI-Powered, and a globe icon for Multi-Language). Icons reinforce meaning '
    'quickly and help users scan the page more efficiently. This visual reinforcement makes the badge more '
    'informative without requiring additional text, keeping the hero section clean and focused.',
    sBody
))

story.append(Paragraph('<b>4.2 Correct Currency Claims</b>', sH2))
story.append(Paragraph(
    'Replace "22 Currencies" with "INR" in the stats section, accompanied by a sub-label "Primary Currency" '
    'and a secondary note "Multi-format input." This change accomplishes several objectives simultaneously. '
    'First, it removes the inflated claim that damages credibility. Second, it positions the product clearly '
    'for the Indian market, which is actually the target audience. Third, the "Multi-format input" sub-label '
    'communicates that users can input amounts in various ways (voice, text, quick taps), which is a real and '
    'valuable feature that does not require currency support to deliver.',
    sBody
))
story.append(Paragraph(
    'If the product plans to add more currencies in the future, a "Coming Soon" approach can be used: '
    'display a fifth stat card with "More Currencies" and a roadmap indicator. This signals ambition without '
    'claiming capability that does not yet exist. Users appreciate transparency about the product roadmap, and '
    'this approach can actually generate excitement and anticipation rather than disappointment.',
    sBody
))

story.append(Paragraph('<b>4.3 Clarify the CTA Button</b>', sH2))
story.append(Paragraph(
    'Change the primary CTA from "Start Free - No Password Needed" to "Start Free - No Sign-Up Needed" if '
    'the product truly requires zero authentication, or to "Start Free - Instant Access" if some form of '
    'lightweight authentication is involved. The key principle is that the CTA must precisely match the actual '
    'onboarding experience. If users click "No Password Needed" and are asked to create a password, they will '
    'feel deceived. If they click "No Sign-Up Needed" and can immediately start tracking expenses, trust is '
    'reinforced from the very first interaction.',
    sBody
))
story.append(Paragraph(
    'The secondary CTA should also be updated from "See All Features" to "See How It Works," which is more '
    'actionable and less passive. "See All Features" implies a static feature list, while "See How It Works" '
    'promises a demonstration, which is far more engaging and likely to convert curious visitors into active users. '
    'A brief demo video or interactive walkthrough linked from this button would provide the proof that the '
    'honest claims on the page need to be fully convincing.',
    sBody
))

story.append(Paragraph('<b>4.4 Restructure the Stats Section</b>', sH2))
story.append(Paragraph(
    'Redesign the stats grid to present an internally consistent set of metrics: "2 Languages (English and Hindi)," '
    '"INR Primary Currency," "16+ Categories," and "5 Classifications." Each stat card should include a sub-label '
    'providing additional context (e.g., "Auto-classified" under Categories, "Smart tagging" under Classifications). '
    'This creates a coherent narrative where each statistic reinforces the others rather than contradicting them.',
    sBody
))
story.append(Paragraph(
    'The visual design of the stats section should also be improved. Instead of simple text boxes, use card-style '
    'elements with a subtle gradient top border, a large number in an accent color, and a smaller label beneath. '
    'This design pattern is modern, scannable, and gives each stat appropriate visual weight. The cards should be '
    'arranged in a responsive 4-column grid that adapts to different screen sizes, maintaining readability and '
    'visual balance across devices.',
    sBody
))

story.append(Paragraph('<b>4.5 Rewrite the Hero Description</b>', sH2))
story.append(Paragraph(
    'Replace the current description with: "Speak naturally in English or Hindi. Trackr\'s AI understands your '
    'spending, categorizes it instantly, and keeps your finances organized without lifting a finger." This version '
    'removes the unsupported "22 currencies" claim entirely and focuses on the product\'s actual strengths: natural '
    'language voice input, intelligent categorization, and effortless financial tracking. The phrase "without lifting '
    'a finger" reinforces the voice-first promise in a memorable way.',
    sBody
))
story.append(Paragraph(
    'The example section below the description should also be refined. Instead of showing voice commands in both '
    'English and Hindi with the "Works in 22 currencies" claim, show them with clear arrows indicating the '
    'AI\'s categorization output. For example: "Spent 500 on groceries" becomes "Food and Groceries" with an '
    'arrow, and the Hindi equivalent maps to "Shopping." This demonstrates the product\'s intelligence visually '
    'and makes the value proposition tangible without relying on inflated claims.',
    sBody
))

# ════════════════════════════════════════════════════════════════════
# SECTION 5: Redesigned Landing Page
# ════════════════════════════════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('<b>5. Redesigned Landing Page</b>', sH1))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'The following pages present the improved Trackr landing page design. The redesign implements all five '
    'improvements described in Section 4 while maintaining the modern, dark-themed aesthetic of the original. '
    'Key design changes include: corrected badges with accurate feature labels, honest statistics that create an '
    'internally consistent narrative, clarified CTAs that set proper expectations, and a new "Honest by Design" '
    'trust callout that proactively addresses the transparency philosophy. The hero description has been rewritten '
    'to focus on real capabilities, and the example section now shows AI categorization output visually rather '
    'than making unsupported claims about global currency support.',
    sBody
))
story.append(Paragraph(
    'The dark theme has been retained because it conveys a premium, technology-forward aesthetic that resonates '
    'well with the target audience of tech-savvy Indian users. The green accent color (#10b981) has been preserved '
    'as it communicates growth, money, and positivity, which are ideal associations for a financial tracking app. '
    'The overall layout has been tightened to reduce visual clutter and improve information hierarchy, ensuring that '
    'the most important messages are seen first and that every element on the page serves a clear purpose.',
    sBody
))

# ════════════════════════════════════════════════════════════════════
# SECTION 6: Design Principles
# ════════════════════════════════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('<b>6. Design Principles for Future Iterations</b>', sH1))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'To prevent similar issues from appearing in future landing page iterations, the following design principles '
    'should be adopted as part of the product team\'s standard operating procedures. These principles are not just '
    'guidelines but form a framework for building trust through design, which is especially critical for financial '
    'technology products where credibility directly impacts user acquisition and retention.',
    sBody
))

story.append(Paragraph('<b>6.1 Truth First, Marketing Second</b>', sH2))
story.append(Paragraph(
    'Every claim on the landing page must be verifiable within the product itself. Before any statistic, badge, or '
    'feature description is published, it should be cross-referenced with the actual product capabilities. If the '
    'product team wants to claim "22 Currencies," they must first build support for 22 currencies, then update the '
    'landing page. The landing page is a reflection of the product, not a wish list for future features. This '
    'principle ensures that marketing materials always lag slightly behind reality rather than racing ahead of it, '
    'creating a sustainable trust cycle where the product consistently exceeds expectations.',
    sBody
))

story.append(Paragraph('<b>6.2 Internal Consistency Check</b>', sH2))
story.append(Paragraph(
    'Before any landing page update goes live, perform an internal consistency audit: do all the numbers, claims, '
    'and feature descriptions logically support each other? If you claim "22 Currencies" and "2 Languages," does '
    'that combination make sense? A simple checklist asking "Does claim A contradict claim B?" can catch the most '
    'damaging inconsistencies before they reach users. This check should be a mandatory step in the review process, '
    'signed off by both product and marketing teams to ensure cross-functional alignment and accountability.',
    sBody
))

story.append(Paragraph('<b>6.3 Specificity Over Generality</b>', sH2))
story.append(Paragraph(
    '"2 Languages (English and Hindi)" is more compelling than "Multi-Language" because it is specific and verifiable. '
    '"INR Primary Currency" is more trustworthy than "22 Currencies" because it demonstrates honesty and precision. '
    'Specific claims create confidence; vague or inflated claims create doubt. This principle extends to all aspects '
    'of the landing page, from feature descriptions to user testimonials. Whenever possible, replace general '
    'superlatives with specific, measurable facts that users can verify through their own experience with the product.',
    sBody
))

story.append(Paragraph('<b>6.4 Progressive Disclosure for Roadmap Items</b>', sH2))
story.append(Paragraph(
    'Features that are planned but not yet built should be clearly labeled as "Coming Soon" with expected timelines, '
    'or omitted entirely until they are ready. The "Coming Soon" approach signals ambition without claiming current '
    'capability, and users who see a product actively developing are more likely to stay engaged than users who feel '
    'misled. This is particularly effective when paired with a public roadmap that shows progress updates, creating '
    'a narrative of continuous improvement that builds loyalty and anticipation for future releases.',
    sBody
))

story.append(Paragraph('<b>6.5 Trust as a Feature</b>', sH2))
story.append(Paragraph(
    'The redesigned landing page includes an "Honest by Design" callout section. This is not just a design element '
    'but a strategic positioning choice. By proactively acknowledging that the product is focused on specific markets '
    'and that its stats reflect actual capabilities, Trackr differentiates itself from competitors who inflate their '
    'claims. In the fintech space, where trust is the primary currency, this approach can become a genuine competitive '
    'advantage. Users who see that a financial app is honest about its limitations are more likely to trust it with '
    'their financial data, which is the ultimate conversion goal for any expense tracking application.',
    sBody
))

# ════════════════════════════════════════════════════════════════════
# SECTION 7: Implementation Roadmap
# ════════════════════════════════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('<b>7. Implementation Roadmap</b>', sH1))
story.append(Spacer(1, 6))

roadmap_data = [
    [
        Paragraph('<b>Phase</b>', sTableHeader),
        Paragraph('<b>Action</b>', sTableHeader),
        Paragraph('<b>Timeline</b>', sTableHeader),
        Paragraph('<b>Impact</b>', sTableHeader),
    ],
    [
        Paragraph('Immediate', sTableCell),
        Paragraph('Replace "International" badge with "Multi-Language"; change "22 Currencies" to "INR"', sTableCell),
        Paragraph('1 day', sTableCellCenter),
        Paragraph('Eliminates top 3 credibility issues', sTableCell),
    ],
    [
        Paragraph('Short-term', sTableCell),
        Paragraph('Rewrite hero description; clarify CTA; restructure stats section', sTableCell),
        Paragraph('1 week', sTableCellCenter),
        Paragraph('Full alignment of messaging with capabilities', sTableCell),
    ],
    [
        Paragraph('Medium-term', sTableCell),
        Paragraph('Add "Honest by Design" callout; implement demo walkthrough; add "Coming Soon" section', sTableCell),
        Paragraph('2-3 weeks', sTableCellCenter),
        Paragraph('Proactive trust-building and user engagement', sTableCell),
    ],
    [
        Paragraph('Long-term', sTableCell),
        Paragraph('Add new languages and currencies; update landing page to reflect expanded capabilities', sTableCell),
        Paragraph('2-6 months', sTableCellCenter),
        Paragraph('Gradual expansion with honest marketing', sTableCell),
    ],
]

col_ratios3 = [0.13, 0.38, 0.12, 0.30]
col_widths3 = [r * available_width for r in col_ratios3]

roadmap_table = Table(roadmap_data, colWidths=col_widths3, hAlign='CENTER')
roadmap_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_STRIPE),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_STRIPE),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))

story.append(roadmap_table)
story.append(Spacer(1, 4))
story.append(Paragraph('Table 3: Implementation roadmap for Trackr landing page improvements', sCaption))

story.append(Spacer(1, 12))
story.append(Paragraph(
    'The immediate phase addresses the most critical issues that are currently damaging user trust. These changes '
    'can be deployed within a single day and will have the highest impact-to-effort ratio. The short-term phase '
    'completes the messaging overhaul by rewriting the hero description and clarifying the CTA buttons. The '
    'medium-term phase adds proactive trust-building elements that position Trackr as an honest, transparent brand. '
    'Finally, the long-term phase ensures that as the product genuinely expands to more languages and currencies, '
    'the landing page is updated to reflect those real capabilities, maintaining the "truth first" principle '
    'throughout the product\'s growth trajectory.',
    sBody
))

# Build
doc.build(story, onFirstPage=footer_func, onLaterPages=footer_func)
print(f"Body PDF generated: {OUTPUT_PDF}")
