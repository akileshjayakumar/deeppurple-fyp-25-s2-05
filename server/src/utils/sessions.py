import markdown2
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, Spacer, Image
from reportlab.lib.units import inch
import matplotlib.pyplot as plt
import matplotlib
import numpy as np
import io
import base64
matplotlib.use('Agg')
import re
import logging

logger = logging.getLogger(__name__)


def markdown_to_reportlab_paragraphs(markdown_text, styles):
    """Convert markdown text to ReportLab paragraphs with proper formatting."""
    elements = []

    # Split text by markdown headers and sections
    sections = re.split(r'\*\*(.*?)\*\*', markdown_text)
    current_paragraph = ""

    for i, section in enumerate(sections):
        if i % 2 == 0:  # Regular text
            current_paragraph += section.strip()
        else:  # Bold text (headers)
            # Add previous paragraph if exists
            if current_paragraph.strip():
                elements.append(Paragraph(current_paragraph.strip(), styles["Normal"]))
                current_paragraph = ""

            # Add header
            if section.strip():
                elements.append(Paragraph(f"<b>{section}</b>", styles["Heading3"]))
                elements.append(Spacer(1, 6))

    # Add final paragraph if exists
    if current_paragraph.strip():
        elements.append(Paragraph(current_paragraph.strip(), styles["Normal"]))

    return elements

def generate_chart_from_data(chart_data, chart_type):
    try:
        # Create chart bytes
        if chart_type == "emotion_distribution": # spider chart
            chart_data_parsed = dict(chart_data)
            labels = list(chart_data_parsed.keys())
            values = list(chart_data_parsed.values())
            num_vars = len(labels)

            # Compute angle for each axis
            angles = np.linspace(0,2 * np.pi, num_vars, endpoint=False).tolist()
            values += values[:1]
            angles += angles[:1]
            fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True))
            ax.plot(angles, values, color='#d8caf9', linewidth=2, label='Strength of Emotion')
            ax.fill(angles, values, color='#d8caf9', alpha=0.7)
            ax.set_xticks(angles[:-1])
            ax.set_xticklabels(labels)
            ax.legend(loc='upper center', bbox_to_anchor=(0.5, 1.1))
        elif chart_type == "key_topics": #bar chart
            labels = [item["topic"] for item in chart_data]
            values = [item["relevance_score"] for item in chart_data]
            fig, ax = plt.subplots(figsize=(6, 4))
            ax.bar(labels, values, color='#d8caf9')
            ax.set_ylabel('Relevance Score')
            ax.set_title('Key Topics')
            plt.xticks(rotation=20, ha='right')
        else:
            return None
        # Save to bytes buffer
        buffer = io.BytesIO()
        fig.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
        buffer.seek(0)
        image_bytes = buffer.getvalue()
        plt.close(fig)
        return image_bytes
    except Exception as e:
        logger.info(f"Error: {e}")
        return


def create_reportlab_image(image_bytes, width=4*inch, height=4*inch):
    """Create a ReportLab Image object from image bytes."""
    image_buffer = io.BytesIO(image_bytes)
    return Image(image_buffer, width=width, height=height)
