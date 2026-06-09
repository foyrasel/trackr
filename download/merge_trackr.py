#!/usr/bin/env python3
"""Merge cover, body, and mockup PDFs into final Trackr report"""

from pypdf import PdfReader, PdfWriter, Transformation

A4_W, A4_H = 595.28, 841.89  # A4 in points

def normalize_page_to_a4(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 2 or abs(h - A4_H) > 2:
        sx, sy = A4_W / w, A4_H / h
        # Use the smaller scale to fit
        s = min(sx, sy)
        page.add_transformation(Transformation().scale(sx=s, sy=s))
        page.mediabox.lower_left = (0, 0)
        page.mediabox.upper_right = (A4_W, A4_H)
    return page

writer = PdfWriter()

# Cover page
cover = PdfReader('/home/z/my-project/download/trackr_cover.pdf')
writer.add_page(normalize_page_to_a4(cover.pages[0]))

# Body pages
body = PdfReader('/home/z/my-project/download/trackr_body.pdf')
for page in body.pages:
    writer.add_page(normalize_page_to_a4(page))

# Mockup pages
mockup = PdfReader('/home/z/my-project/download/trackr_mockup.pdf')
for page in mockup.pages:
    writer.add_page(normalize_page_to_a4(page))

writer.add_metadata({
    '/Title': 'Trackr Landing Page Improvement Report',
    '/Author': 'Z.ai',
    '/Creator': 'Z.ai',
    '/Subject': 'UX Audit and Redesign of Trackr Financial Tracking App Landing Page'
})

output_path = '/home/z/my-project/download/Trackr_Landing_Page_Improvement_Report.pdf'
with open(output_path, 'wb') as f:
    writer.write(f)

print(f"Final PDF: {output_path}")
print(f"Total pages: {len(writer.pages)}")
