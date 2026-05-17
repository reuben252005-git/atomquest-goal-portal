#!/usr/bin/env python3
"""Generate AtomQuest architecture diagram PDF for hackathon submission."""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Spacer, Paragraph, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Group
from reportlab.graphics import renderPDF
from reportlab.lib.colors import HexColor, white, black

W, H = A4

# Color palette
C_PURPLE  = HexColor('#7F77DD')
C_TEAL    = HexColor('#1D9E75')
C_BLUE    = HexColor('#378ADD')
C_AMBER   = HexColor('#BA7517')
C_CORAL   = HexColor('#D85A30')
C_GREEN   = HexColor('#639922')
C_GRAY    = HexColor('#888780')
C_BG      = HexColor('#F8F8F8')
C_BORDER  = HexColor('#CCCCCC')
C_TEXT    = HexColor('#1A1A1A')
C_MUTED   = HexColor('#666666')

def make_box(d, x, y, w, h, color, label, sublabel=None, text_color=white):
    """Draw a colored box with label on a ReportLab Drawing."""
    r = Rect(x, y, w, h, fillColor=color, strokeColor=color, strokeWidth=0.5,
             rx=6, ry=6)
    d.add(r)
    ty = y + h/2 + (5 if sublabel else 0)
    t = String(x + w/2, ty, label, textAnchor='middle',
               fontSize=8, fontName='Helvetica-Bold', fillColor=text_color)
    d.add(t)
    if sublabel:
        s = String(x + w/2, y + h/2 - 7, sublabel, textAnchor='middle',
                   fontSize=6.5, fontName='Helvetica', fillColor=text_color)
        d.add(s)

def make_line(d, x1, y1, x2, y2, color=C_GRAY):
    l = Line(x1, y1, x2, y2, strokeColor=color, strokeWidth=0.7)
    d.add(l)

def make_label(d, x, y, text, color=C_MUTED, size=7):
    t = String(x, y, text, textAnchor='start', fontSize=size, fontName='Helvetica', fillColor=color)
    d.add(t)

def build_arch_diagram():
    dw, dh = 480, 560
    d = Drawing(dw, dh)

    # Background
    bg = Rect(0, 0, dw, dh, fillColor=C_BG, strokeColor=C_BORDER, strokeWidth=0.5)
    d.add(bg)

    # Title
    title = String(dw/2, dh - 18, 'AtomQuest 1.0 — System Architecture',
                   textAnchor='middle', fontSize=11, fontName='Helvetica-Bold', fillColor=C_TEXT)
    d.add(title)

    # ── LAYER LABELS ──────────────────────────────────────────────────
    layers = [
        (dh - 35,  'USERS'),
        (dh - 115, 'FRONTEND  (Next.js + React)'),
        (dh - 195, 'API GATEWAY + AUTH (JWT)'),
        (dh - 280, 'BACKEND SERVICES  (Node.js + Express)'),
        (dh - 365, 'DATA LAYER'),
        (dh - 445, 'BONUS INTEGRATIONS'),
        (dh - 510, 'HOSTING  (cost-optimised)'),
    ]
    for ly, lbl in layers:
        make_label(d, 12, ly, lbl, C_MUTED, 6.5)
        ln = Line(12, ly - 4, dw - 12, ly - 4, strokeColor=C_BORDER, strokeWidth=0.3)
        d.add(ln)

    # ── ROW 1: USERS ──────────────────────────────────────────────────
    y1 = dh - 75
    make_box(d, 14,  y1, 110, 32, C_PURPLE, 'Employee',      'Create goals')
    make_box(d, 140, y1, 110, 32, C_PURPLE, 'Manager (L1)',  'Approve & check-in')
    make_box(d, 266, y1, 110, 32, C_PURPLE, 'Admin / HR',    'Configure & audit')

    # arrows users → frontend
    for cx in [69, 195, 321]:
        make_line(d, cx, y1, cx, y1 - 10, C_GRAY)
    make_line(d, 69, y1 - 10, 321, y1 - 10, C_GRAY)
    make_line(d, 195, y1 - 10, 195, y1 - 18, C_GRAY)

    # ── ROW 2: FRONTEND ───────────────────────────────────────────────
    y2 = dh - 155
    make_box(d, 14,  y2, 100, 32, C_TEAL, 'Goal Sheet UI',   'Create / edit goals')
    make_box(d, 126, y2, 100, 32, C_TEAL, 'Approval UI',     'Inline edit & approve')
    make_box(d, 238, y2, 100, 32, C_TEAL, 'Check-in UI',     'Quarterly updates')
    make_box(d, 350, y2, 116, 32, C_TEAL, 'Admin Dashboard', 'Audit & analytics')

    # arrow FE → API
    make_line(d, 195, y2, 195, y2 - 10, C_GRAY)
    make_line(d, 195, y2 - 10, 230, y2 - 10, C_GRAY)
    make_line(d, 230, y2 - 10, 230, y2 - 18, C_GRAY)

    # ── ROW 3: API GATEWAY ────────────────────────────────────────────
    y3 = dh - 240
    make_box(d, 14,  y3, 140, 32, C_GRAY, 'JWT / Session Auth', 'Role-based access')
    make_box(d, 172, y3, 160, 32, C_GRAY, 'REST API',           'Express routes')
    make_box(d, 350, y3, 116, 32, C_GRAY, 'Input Validation',   'express-validator')

    # arrow API → backend
    make_line(d, 230, y3, 230, y3 - 18, C_GRAY)

    # ── ROW 4: BACKEND SERVICES ───────────────────────────────────────
    y4 = dh - 325
    make_box(d, 14,  y4, 108, 32, C_BLUE, 'Goal Service',     'CRUD + validation')
    make_box(d, 132, y4, 108, 32, C_BLUE, 'Workflow Service', 'Approval FSM')
    make_box(d, 250, y4, 108, 32, C_BLUE, 'Check-in Service', 'Quarterly scoring')
    make_box(d, 368, y4, 98,  32, C_BLUE, 'Audit Service',    'Change logs')

    # arrows backend → data
    for cx in [68, 186, 304, 417]:
        make_line(d, cx, y4, cx, y4 - 10, C_GRAY)
    make_line(d, 68, y4 - 10, 417, y4 - 10, C_GRAY)
    make_line(d, 230, y4 - 10, 230, y4 - 18, C_GRAY)

    # ── ROW 5: DATA ───────────────────────────────────────────────────
    y5 = dh - 410
    make_box(d, 14,  y5, 140, 32, C_AMBER, 'PostgreSQL',        'Goals, users, cycles')
    make_box(d, 168, y5, 120, 32, C_AMBER, 'Redis Cache',       'Sessions, scoring')
    make_box(d, 302, y5, 164, 32, C_AMBER, 'Blob Storage (S3)', 'CSV exports')

    # ── ROW 6: BONUS ──────────────────────────────────────────────────
    y6 = dh - 478
    make_box(d, 14,  y6, 140, 24, C_CORAL, 'Azure AD / Entra',   'SSO + org hierarchy')
    make_box(d, 168, y6, 140, 24, C_CORAL, 'Email / Teams Bot',  'Notifications')
    make_box(d, 322, y6, 144, 24, C_CORAL, 'Escalation Engine',  'Rule-based alerts')

    # ── ROW 7: HOSTING ────────────────────────────────────────────────
    y7 = dh - 540
    make_box(d, 14,  y7, 140, 24, C_GREEN, 'Vercel / Netlify',   'Frontend free tier')
    make_box(d, 168, y7, 140, 24, C_GREEN, 'Railway / Render',   'Backend + DB free')
    make_box(d, 322, y7, 144, 24, C_GREEN, 'Supabase / Neon',    'Managed Postgres free')

    return d


def build_pdf(output_path: str):
    doc = SimpleDocTemplate(output_path, pagesize=A4,
                            leftMargin=20*mm, rightMargin=20*mm,
                            topMargin=15*mm, bottomMargin=15*mm)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('T', parent=styles['Title'],
                                  fontSize=18, spaceAfter=4, textColor=HexColor('#1A1A1A'))
    h2_style    = ParagraphStyle('H2', parent=styles['Heading2'],
                                  fontSize=12, spaceAfter=4, spaceBefore=10,
                                  textColor=HexColor('#185FA5'))
    body_style  = ParagraphStyle('B', parent=styles['Normal'],
                                  fontSize=9, leading=13, textColor=HexColor('#333333'))
    small_style = ParagraphStyle('S', parent=styles['Normal'],
                                  fontSize=8, leading=11, textColor=HexColor('#555555'))

    story = []

    # ── COVER ──────────────────────────────────────────────────────────────
    story.append(Paragraph('AtomQuest Hackathon 1.0', title_style))
    story.append(Paragraph('In-House Goal Setting &amp; Tracking Portal — Solution Architecture', h2_style))
    story.append(Spacer(1, 4*mm))

    # ── ARCHITECTURE DIAGRAM ───────────────────────────────────────────────
    d = build_arch_diagram()
    story.append(d)
    story.append(Spacer(1, 6*mm))

    # ── TECH STACK TABLE ──────────────────────────────────────────────────
    story.append(Paragraph('Technology Stack', h2_style))

    stack_data = [
        ['Layer', 'Technology', 'Reason'],
        ['Frontend',    'Next.js 14 + TypeScript + Tailwind CSS', 'SSR, fast deploy on Vercel (free)'],
        ['Backend',     'Node.js + Express + Prisma ORM',         'Typed queries, easy migration'],
        ['Database',    'PostgreSQL (Supabase)',                   'Free managed tier, full SQL support'],
        ['Cache',       'Redis (Upstash)',                         'Free tier, session & score caching'],
        ['Auth',        'JWT (+ optional Azure AD)',               'Stateless, supports SSO bonus'],
        ['Hosting FE',  'Vercel',                                  'Free, zero-config Next.js deploy'],
        ['Hosting BE',  'Railway / Render',                        'Free tier for backend + DB'],
        ['Export',      'JSON → CSV streaming',                    'No library overhead for reports'],
    ]

    ts = TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), HexColor('#185FA5')),
        ('TEXTCOLOR',    (0,0), (-1,0), white),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,0), 8),
        ('FONTNAME',     (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE',     (0,1), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#F0F4FF')]),
        ('GRID',         (0,0), (-1,-1), 0.3, HexColor('#CCCCCC')),
        ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
        ('LEFTPADDING',  (0,0), (-1,-1), 6),
    ])
    t = Table(stack_data, colWidths=[35*mm, 75*mm, 60*mm], style=ts)
    story.append(t)
    story.append(Spacer(1, 6*mm))

    # ── SCORING FORMULAS ──────────────────────────────────────────────────
    story.append(Paragraph('Progress Scoring Formulas', h2_style))
    scoring_data = [
        ['UoM Type', 'Description', 'Formula'],
        ['Min (Numeric / %)', 'Higher is better — e.g. Sales Revenue', 'Achievement / Target x 100'],
        ['Max (Numeric / %)', 'Lower is better — e.g. TAT, Cost',       'Target / Achievement x 100'],
        ['Timeline',          'Date-based completion',                   'On time = 100%, Late = 0%'],
        ['Zero-based',        'Zero = Success — e.g. Safety incidents', 'If 0 then 100%, else 0%'],
    ]
    st = TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), HexColor('#0F6E56')),
        ('TEXTCOLOR',    (0,0), (-1,0), white),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,0), 8),
        ('FONTNAME',     (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE',     (0,1), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#E8F5F1')]),
        ('GRID',         (0,0), (-1,-1), 0.3, HexColor('#CCCCCC')),
        ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
        ('LEFTPADDING',  (0,0), (-1,-1), 6),
    ])
    t2 = Table(scoring_data, colWidths=[40*mm, 70*mm, 60*mm], style=st)
    story.append(t2)
    story.append(Spacer(1, 6*mm))

    # ── USER ROLES ────────────────────────────────────────────────────────
    story.append(Paragraph('User Roles &amp; Capabilities', h2_style))
    roles_data = [
        ['Role', 'Responsibilities', 'System Capabilities'],
        ['Employee',
         'Draft goals; enter quarterly achievement; update progress status',
         'Create & edit goals pre-submission; view locked goals; input actuals'],
        ['Manager (L1)',
         'Review & approve goals; conduct quarterly check-ins; log feedback',
         'Team dashboard; inline editing during approval; comment / feedback logs'],
        ['Admin / HR',
         'Configure cycles; manage org hierarchy; oversee completion rates',
         'Cycle management; exception handling; audit logs; goal unlock capability'],
    ]
    rt = TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), HexColor('#7F77DD')),
        ('TEXTCOLOR',    (0,0), (-1,0), white),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,0), 8),
        ('FONTNAME',     (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE',     (0,1), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#F2F0FF')]),
        ('GRID',         (0,0), (-1,-1), 0.3, HexColor('#CCCCCC')),
        ('VALIGN',       (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING',   (0,0), (-1,-1), 5),
        ('BOTTOMPADDING',(0,0), (-1,-1), 5),
        ('LEFTPADDING',  (0,0), (-1,-1), 6),
    ])
    t3 = Table(roles_data, colWidths=[30*mm, 75*mm, 65*mm], style=rt)
    story.append(t3)
    story.append(Spacer(1, 6*mm))

    # ── DEMO CREDENTIALS ──────────────────────────────────────────────────
    story.append(Paragraph('Demo Login Credentials', h2_style))
    creds_data = [
        ['Role', 'Email', 'Password'],
        ['Employee',  'employee@demo.com', 'Demo@123'],
        ['Manager',   'manager@demo.com',  'Demo@123'],
        ['Admin / HR','admin@demo.com',    'Demo@123'],
    ]
    ct = TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), HexColor('#333333')),
        ('TEXTCOLOR',    (0,0), (-1,0), white),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,0), 8),
        ('FONTNAME',     (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE',     (0,1), (-1,-1), 9),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#F5F5F5')]),
        ('GRID',         (0,0), (-1,-1), 0.3, HexColor('#CCCCCC')),
        ('TOPPADDING',   (0,0), (-1,-1), 5),
        ('BOTTOMPADDING',(0,0), (-1,-1), 5),
        ('LEFTPADDING',  (0,0), (-1,-1), 8),
    ])
    t4 = Table(creds_data, colWidths=[40*mm, 70*mm, 60*mm], style=ct)
    story.append(t4)

    story.append(Spacer(1, 6*mm))
    story.append(Paragraph(
        '<i>Submission includes: Live demo URL · GitHub repository · This architecture diagram · Demo credentials above</i>',
        small_style
    ))

    doc.build(story)
    print(f'PDF generated: {output_path}')


if __name__ == '__main__':
    build_pdf('/mnt/user-data/outputs/AtomQuest_Architecture_Diagram.pdf')
